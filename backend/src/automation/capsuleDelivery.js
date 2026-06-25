const cron = require('node-cron');
const db = require('../config/database');
const { now } = require('../utils/helpers');
const AuditLogModel = require('../models/auditLogModel');

const auditLogModel = new AuditLogModel(db);

const deliverDueCapsules = () => {
  const dueCapsules = db.prepare(`
    SELECT * FROM TimeCapsules
    WHERE isDelivered = 0 AND datetime(targetReleaseDate) <= datetime(?)
  `).all(now());

  dueCapsules.forEach((capsule) => {
    db.prepare(`
      UPDATE TimeCapsules
      SET isDelivered = 1, timestamp = ?
      WHERE capsuleID = ?
    `).run(now(), capsule.capsuleID);

    auditLogModel.create({
      userID: capsule.userID,
      action: 'TIME_CAPSULE_DELIVERED',
      details: {
        capsuleID: capsule.capsuleID,
        deliveryMethod: capsule.deliveryMethod,
        recipientContact: capsule.recipientContact,
        provider: capsule.deliveryMethod === 'SMS' ? 'MockSMS' : 'MockEmail'
      }
    });
  });

  return dueCapsules.map((capsule) => ({
    capsuleID: capsule.capsuleID,
    deliveryMethod: capsule.deliveryMethod,
    recipientContact: capsule.recipientContact
  }));
};

const startCapsuleDeliveryScheduler = () => cron.schedule('0 8 * * *', () => {
  deliverDueCapsules();
});

module.exports = {
  deliverDueCapsules,
  startCapsuleDeliveryScheduler
};