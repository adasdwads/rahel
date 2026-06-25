const db = require('../config/database');
const { deadManSwitchDays } = require('../config/env');
const { now } = require('../utils/helpers');
const AuditLogModel = require('../models/auditLogModel');

const auditLogModel = new AuditLogModel(db);

const getHeartbeatConfig = (userID) => db.prepare('SELECT * FROM HeartbeatConfigs WHERE userID = ?').get(userID);

const sendSecurePing = (userID) => {
  const config = getHeartbeatConfig(userID);
  if (!config) {
    throw new Error('Heartbeat configuration not found');
  }

  db.prepare(`
    UPDATE HeartbeatConfigs
    SET lastPingSentAt = ?, escalationStatus = 'Pending', updatedAt = ?
    WHERE userID = ?
  `).run(now(), now(), userID);

  const result = {
    userID,
    channel: config.notificationChannel,
    target: config.contactTarget,
    sentAt: now(),
    status: 'PingSent'
  };

  auditLogModel.create({
    userID,
    action: 'HEARTBEAT_PING_SENT',
    details: result
  });

  return result;
};

const verifyPingResponse = (userID) => {
  const config = getHeartbeatConfig(userID);
  if (!config) {
    throw new Error('Heartbeat configuration not found');
  }

  db.prepare(`
    UPDATE HeartbeatConfigs
    SET lastHeartbeatAt = ?, lastPingResponseAt = ?, escalationStatus = 'Healthy', updatedAt = ?
    WHERE userID = ?
  `).run(now(), now(), now(), userID);

  const result = {
    userID,
    respondedAt: now(),
    status: 'Healthy'
  };

  auditLogModel.create({
    userID,
    action: 'HEARTBEAT_RESPONSE_VERIFIED',
    details: result
  });

  return result;
};

const escalateInactivity = (userID) => {
  db.prepare(`
    UPDATE HeartbeatConfigs
    SET escalationStatus = 'Escalated', updatedAt = ?
    WHERE userID = ?
  `).run(now(), userID);

  const result = {
    userID,
    escalatedAt: now(),
    status: 'Escalated'
  };

  auditLogModel.create({
    userID,
    action: 'HEARTBEAT_ESCALATED',
    details: result
  });

  return result;
};

const checkUserHeartbeat = (userID) => {
  const config = getHeartbeatConfig(userID);
  if (!config) {
    throw new Error('Heartbeat configuration not found');
  }

  const lastHeartbeatAt = config.lastHeartbeatAt ? new Date(config.lastHeartbeatAt).getTime() : 0;
  const intervalDays = Number(config.intervalDays || deadManSwitchDays);
  const thresholdMs = intervalDays * 24 * 60 * 60 * 1000;
  const inactiveForMs = Date.now() - lastHeartbeatAt;

  if (inactiveForMs < thresholdMs) {
    return {
      userID,
      status: 'Healthy',
      inactiveDays: Math.floor(inactiveForMs / (24 * 60 * 60 * 1000))
    };
  }

  if (config.escalationStatus === 'Pending') {
    return escalateInactivity(userID);
  }

  return sendSecurePing(userID);
};

module.exports = {
  checkUserHeartbeat,
  sendSecurePing,
  verifyPingResponse,
  escalateInactivity
};