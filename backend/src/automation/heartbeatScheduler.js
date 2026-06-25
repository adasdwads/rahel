const express = require('express');
const cron = require('node-cron');
const db = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const { createId, now } = require('../utils/helpers');
const { deadManSwitchDays } = require('../config/env');
const { checkUserHeartbeat, verifyPingResponse } = require('./deadManSwitch');
const AuditLogModel = require('../models/auditLogModel');

const router = express.Router();
const auditLogModel = new AuditLogModel(db);

const getOrCreateHeartbeatConfig = (userID) => {
  const existing = db.prepare('SELECT * FROM HeartbeatConfigs WHERE userID = ?').get(userID);
  if (existing) {
    return existing;
  }

  const record = {
    configID: createId(),
    userID,
    intervalDays: deadManSwitchDays,
    lastHeartbeatAt: now(),
    lastPingSentAt: null,
    lastPingResponseAt: now(),
    escalationStatus: 'Healthy',
    notificationChannel: 'Email',
    contactTarget: null,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO HeartbeatConfigs (configID, userID, intervalDays, lastHeartbeatAt, lastPingSentAt, lastPingResponseAt, escalationStatus, notificationChannel, contactTarget, createdAt, updatedAt)
    VALUES (@configID, @userID, @intervalDays, @lastHeartbeatAt, @lastPingSentAt, @lastPingResponseAt, @escalationStatus, @notificationChannel, @contactTarget, @createdAt, @updatedAt)
  `).run(record);

  return record;
};

router.post('/heartbeat/ping', authMiddleware, (req, res) => {
  try {
    getOrCreateHeartbeatConfig(req.user.userID);
    const result = verifyPingResponse(req.user.userID);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.get('/heartbeat/status', authMiddleware, (req, res) => {
  const config = getOrCreateHeartbeatConfig(req.user.userID);
  return res.status(200).json(config);
});

router.put('/heartbeat/config', authMiddleware, (req, res) => {
  const existing = getOrCreateHeartbeatConfig(req.user.userID);
  const updated = {
    ...existing,
    intervalDays: req.body.intervalDays || existing.intervalDays,
    notificationChannel: req.body.notificationChannel || existing.notificationChannel,
    contactTarget: req.body.contactTarget === undefined ? existing.contactTarget : req.body.contactTarget,
    updatedAt: now()
  };

  db.prepare(`
    UPDATE HeartbeatConfigs
    SET intervalDays = @intervalDays,
        notificationChannel = @notificationChannel,
        contactTarget = @contactTarget,
        updatedAt = @updatedAt
    WHERE userID = @userID
  `).run(updated);

  auditLogModel.create({
    userID: req.user.userID,
    action: 'HEARTBEAT_CONFIG_UPDATED',
    details: updated,
    ipAddress: req.ip
  });

  return res.status(200).json(db.prepare('SELECT * FROM HeartbeatConfigs WHERE userID = ?').get(req.user.userID));
});

const runWeeklyHeartbeatChecks = () => cron.schedule('0 9 * * 1', () => {
  const users = db.prepare('SELECT userID FROM Users').all();
  users.forEach(({ userID }) => {
    try {
      checkUserHeartbeat(userID);
    } catch (error) {
      auditLogModel.create({
        userID,
        action: 'HEARTBEAT_CHECK_FAILED',
        details: { message: error.message }
      });
    }
  });
});

module.exports = {
  router,
  runWeeklyHeartbeatChecks
};