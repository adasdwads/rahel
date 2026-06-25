const { v4: uuidv4 } = require('uuid');
const { executeCharityDisbursements } = require('./charityRouter');
const { sendNotifications } = require('./notificationService');

// ═══════════════════════════════════════════════════════════════
// Trigger Engine - Master Orchestrator
// Executes all automated protocols when death is verified
// ═══════════════════════════════════════════════════════════════

function executeTrigger(db, userID, triggerSource) {
  console.log('═══════════════════════════════════════════════════');
  console.log(`[TRIGGER] Executing full protocol for user ${userID}`);
  console.log(`[TRIGGER] Source: ${triggerSource}`);
  console.log('═══════════════════════════════════════════════════');

  const results = {
    userID,
    triggerSource,
    startedAt: new Date().toISOString(),
    steps: [],
  };

  try {
    // ── STEP 1: Verify Account Status ──
    const user = db.prepare('SELECT * FROM Users WHERE userID = ?').get(userID);
    if (!user) throw new Error('User not found');

    results.steps.push({
      step: 1,
      name: 'account_status_verification',
      status: 'completed',
      detail: `Account status: ${user.status}`,
    });

    // ── STEP 2: Notify Heirs ──
    const heirs = db.prepare('SELECT * FROM InheritanceAccess WHERE userID = ?').all(userID);
    const notificationResults = notifyHeirs(db, userID, heirs, user);
    results.steps.push({
      step: 2,
      name: 'heir_notification',
      status: 'completed',
      detail: `Notified ${heirs.length} heir(s)`,
      results: notificationResults,
    });

    // ── STEP 3: Distribute Key Shards ──
    const shardResults = distributeKeyShards(db, userID, heirs);
    results.steps.push({
      step: 3,
      name: 'key_shard_distribution',
      status: 'completed',
      detail: `Distributed ${shardResults.distributed} shard(s)`,
      results: shardResults,
    });

    // ── STEP 4: Execute Charity Disbursements ──
    const charityResults = executeCharityDisbursements(db, userID);
    results.steps.push({
      step: 4,
      name: 'charity_disbursement',
      status: 'completed',
      detail: `Executed ${charityResults.executed} charity flow(s)`,
      results: charityResults,
    });

    // ── STEP 5: Release Due Time Capsules ──
    const capsuleResults = releaseDueTimeCapsules(db, userID);
    results.steps.push({
      step: 5,
      name: 'time_capsule_release',
      status: 'completed',
      detail: `Released ${capsuleResults.released} capsule(s)`,
      results: capsuleResults,
    });

    // ── STEP 6: Execute Social Legacy Protocols ──
    const socialResults = executeSocialLegacy(db, userID);
    results.steps.push({
      step: 6,
      name: 'social_legacy_execution',
      status: 'completed',
      detail: `Executed ${socialResults.executed} social action(s)`,
      results: socialResults,
    });

    // ── STEP 7: Execute Self-Destruct Protocol ──
    const destructResults = executeSelfDestruct(db, userID);
    results.steps.push({
      step: 7,
      name: 'self_destruct_protocol',
      status: 'completed',
      detail: `Processed ${destructResults.processed} item(s)`,
      results: destructResults,
    });

    results.completedAt = new Date().toISOString();
    results.overallStatus = 'completed';

    // Log completion
    db.prepare(`
      INSERT INTO TriggerAuditLog (logID, userID, triggerSource, eventType, eventData)
      VALUES (?, ?, ?, 'full_protocol_completed', ?)
    `).run(uuidv4(), userID, triggerSource, JSON.stringify(results));

  } catch (err) {
    console.error(`[TRIGGER] Protocol execution error:`, err);
    results.overallStatus = 'partial_failure';
    results.error = err.message;

    db.prepare(`
      INSERT INTO TriggerAuditLog (logID, userID, triggerSource, eventType, eventData, success, errorMessage)
      VALUES (?, ?, ?, 'protocol_execution_error', ?, 0, ?)
    `).run(uuidv4(), userID, triggerSource, JSON.stringify(results), err.message);
  }

  console.log(`[TRIGGER] Protocol execution ${results.overallStatus} for user ${userID}`);
  return results;
}

function notifyHeirs(db, userID, heirs, user) {
  const notifications = [];
  for (const heir of heirs) {
    const notification = sendNotifications(db, {
      recipientID: heir.recipientID,
      recipientName: heir.recipientName,
      recipientPhone: heir.phone,
      recipientEmail: heir.email,
      type: 'death_notification',
      userName: user.name,
      accessTier: heir.accessTier,
    });

    db.prepare(`
      UPDATE InheritanceAccess SET notified = 1, notifiedAt = datetime('now')
      WHERE recipientID = ?
    `).run(heir.recipientID);

    notifications.push(notification);
  }
  return { notified: notifications.length, details: notifications };
}

function distributeKeyShards(db, userID, heirs) {
  const shards = db.prepare(
    'SELECT * FROM KeyShards WHERE userID = ? AND distributed = 0'
  ).all(userID);

  let distributed = 0;
  for (const shard of shards) {
    // Assign to heirs in round-robin if not already assigned
    if (!shard.recipientID && heirs.length > 0) {
      const heirIndex = (shard.shardIndex - 1) % heirs.length;
      const targetHeir = heirs[heirIndex];

      db.prepare(`
        UPDATE KeyShards SET recipientID = ?, distributed = 1, distributedAt = datetime('now')
        WHERE shardID = ?
      `).run(targetHeir.recipientID, shard.shardID);

      distributed++;
      console.log(`[TRIGGER] Shard ${shard.shardID} distributed to heir ${targetHeir.recipientName}`);
    }
  }

  return { total: shards.length, distributed };
}

function releaseDueTimeCapsules(db, userID) {
  // On trigger, release all capsules regardless of date
  const capsules = db.prepare(
    'SELECT * FROM TimeCapsules WHERE userID = ? AND delivered = 0'
  ).all(userID);

  let released = 0;
  for (const capsule of capsules) {
    db.prepare(`
      UPDATE TimeCapsules SET delivered = 1, deliveredAt = datetime('now')
      WHERE capsuleID = ?
    `).run(capsule.capsuleID);

    // Mock delivery
    console.log(`[TRIGGER] Time capsule "${capsule.title}" released to ${capsule.recipientContact}`);
    released++;
  }

  return { total: capsules.length, released };
}

function executeSocialLegacy(db, userID) {
  const configs = db.prepare(
    'SELECT * FROM SocialLegacy WHERE userID = ? AND isConfigured = 1 AND executed = 0'
  ).all(userID);

  let executed = 0;
  const results = [];

  for (const cfg of configs) {
    try {
      // Mock social media API execution
      console.log(`[TRIGGER] Executing ${cfg.action} on ${cfg.platform}`);

      if (cfg.action === 'post_obituary' && cfg.obituaryText) {
        console.log(`[TRIGGER] Posting obituary to ${cfg.platform}: "${cfg.obituaryText.substring(0, 50)}..."`);
      }

      db.prepare(`
        UPDATE SocialLegacy SET executed = 1, executedAt = datetime('now')
        WHERE configID = ?
      `).run(cfg.configID);

      executed++;
      results.push({ platform: cfg.platform, action: cfg.action, status: 'executed' });
    } catch (err) {
      results.push({ platform: cfg.platform, action: cfg.action, status: 'failed', error: err.message });
    }
  }

  return { total: configs.length, executed, results };
}

function executeSelfDestruct(db, userID) {
  const items = db.prepare(
    'SELECT * FROM SelfDestructProtocol WHERE userID = ? AND confirmed = 1 AND executed = 0 ORDER BY priority ASC'
  ).all(userID);

  let processed = 0;
  const results = [];

  for (const item of items) {
    try {
      console.log(`[TRIGGER] Self-destruct: ${item.description} (type: ${item.targetType})`);

      // Mock self-destruct execution
      // In production: implement actual file deletion, account deactivation, etc.
      db.prepare(`
        UPDATE SelfDestructProtocol SET executed = 1, executedAt = datetime('now')
        WHERE itemID = ?
      `).run(item.itemID);

      processed++;
      results.push({
        itemID: item.itemID,
        targetType: item.targetType,
        description: item.description,
        status: 'executed',
      });
    } catch (err) {
      results.push({
        itemID: item.itemID,
        description: item.description,
        status: 'failed',
        error: err.message,
      });
    }
  }

  return { total: items.length, processed, results };
}

module.exports = { executeTrigger };
