const crypto = require('crypto');
const express = require('express');
const db = require('../config/database');
const { civilRegistryWebhookSecret } = require('../config/env');
const AuditLogModel = require('../models/auditLogModel');
const { executePostDeathProtocol } = require('./postDeathProtocol');

const router = express.Router();
const auditLogModel = new AuditLogModel(db);

const verifyHmacSignature = (rawBody, signature) => {
  if (!signature) {
    return false;
  }

  const expected = crypto
    .createHmac('sha256', civilRegistryWebhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch (error) {
    return false;
  }
};

const processCivilRegistryNotification = (deathCertificateID) => {
  const certificate = db.prepare('SELECT * FROM DeathCertificates WHERE deathCertificateID = ?').get(deathCertificateID);

  if (!certificate) {
    throw new Error('Death certificate not found');
  }

  if (certificate.status !== 'Verified') {
    throw new Error('Death certificate is not verified');
  }

  db.prepare(`
    UPDATE Users
    SET status = 'Triggered', updatedAt = ?
    WHERE userID = ?
  `).run(new Date().toISOString(), certificate.userID);

  const protocolResult = executePostDeathProtocol(certificate.userID);

  auditLogModel.create({
    userID: certificate.userID,
    action: 'CIVIL_REGISTRY_NOTIFICATION_PROCESSED',
    details: {
      deathCertificateID,
      protocolResult
    }
  });

  return {
    deathCertificateID,
    userID: certificate.userID,
    status: 'Triggered',
    protocolResult
  };
};

router.post(
  '/webhooks/civil-registry',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const signature = req.headers['x-rahel-signature'];
    const rawBody = req.body;

    if (!verifyHmacSignature(rawBody, signature)) {
      auditLogModel.create({
        action: 'CIVIL_REGISTRY_WEBHOOK_REJECTED',
        details: { reason: 'Invalid signature' },
        ipAddress: req.ip
      });
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    let payload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch (error) {
      return res.status(400).json({ message: 'Invalid JSON payload' });
    }

    try {
      const result = processCivilRegistryNotification(payload.deathCertificateID);
      return res.status(200).json(result);
    } catch (error) {
      auditLogModel.create({
        userID: payload.userID || null,
        action: 'CIVIL_REGISTRY_WEBHOOK_FAILED',
        details: { message: error.message },
        ipAddress: req.ip
      });
      return res.status(400).json({ message: error.message });
    }
  }
);

module.exports = {
  router,
  processCivilRegistryNotification,
  verifyHmacSignature
};