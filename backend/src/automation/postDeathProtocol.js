const db = require('../config/database');
const { now } = require('../utils/helpers');
const AuditLogModel = require('../models/auditLogModel');
const TimeCapsuleModel = require('../models/timeCapsuleModel');
const { executeCharityPayments } = require('./charityRouter');

const auditLogModel = new AuditLogModel(db);
const timeCapsuleModel = new TimeCapsuleModel(db);

const releaseKeyShards = (userID) => {
  const shards = db.prepare(`
    SELECT ks.*, ia.userID
    FROM KeyShards ks
    INNER JOIN InheritanceAccess ia ON ia.recipientID = ks.recipientID
    WHERE ia.userID = ?
  `).all(userID);

  auditLogModel.create({
    userID,
    action: 'KEY_SHARDS_RELEASED',
    details: { shardCount: shards.length }
  });

  return shards.map((shard) => ({
    shardID: shard.shardID,
    recipientID: shard.recipientID,
    releasedAt: now()
  }));
};

const triggerCharityFlows = (userID) => executeCharityPayments(userID);

const queueTimeCapsules = (userID) => {
  const capsules = timeCapsuleModel.findAll().filter((capsule) => capsule.userID === userID && Number(capsule.isDelivered) === 0);

  capsules.forEach((capsule) => {
    db.prepare(`
      UPDATE TimeCapsules
      SET targetReleaseDate = ?, timestamp = ?
      WHERE capsuleID = ?
    `).run(now(), now(), capsule.capsuleID);
  });

  auditLogModel.create({
    userID,
    action: 'TIME_CAPSULES_QUEUED',
    details: { capsuleCount: capsules.length }
  });

  return capsules.map((capsule) => ({
    capsuleID: capsule.capsuleID,
    queuedForReleaseAt: now()
  }));
};

const generateObituaryDraft = (userID) => {
  const user = db.prepare('SELECT name, email, phone FROM Users WHERE userID = ?').get(userID);
  const draft = {
    title: `In Loving Memory of ${user.name}`,
    body: `${user.name} will be remembered with dignity, compassion, and enduring faith. Family and trusted contacts may coordinate memorial arrangements through RAHEL.`,
    contact: user.email || user.phone
  };

  auditLogModel.create({
    userID,
    action: 'OBITUARY_DRAFT_GENERATED',
    details: draft
  });

  return draft;
};

const executePostDeathProtocol = (userID) => {
  const releasedShards = releaseKeyShards(userID);
  const charityPayments = triggerCharityFlows(userID);
  const queuedCapsules = queueTimeCapsules(userID);
  const obituaryDraft = generateObituaryDraft(userID);

  const result = {
    userID,
    releasedShards,
    charityPayments,
    queuedCapsules,
    obituaryDraft,
    executedAt: now()
  };

  auditLogModel.create({
    userID,
    action: 'POST_DEATH_PROTOCOL_EXECUTED',
    details: result
  });

  return result;
};

module.exports = {
  executePostDeathProtocol,
  releaseKeyShards,
  triggerCharityFlows,
  queueTimeCapsules,
  generateObituaryDraft
};