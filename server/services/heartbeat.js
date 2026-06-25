const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { executeTrigger } = require('./triggerEngine');

// ═══════════════════════════════════════════════════════════════
// Dead Man's Switch Engine - Heartbeat Monitor
// Checks user inactivity and triggers protocols if unresponsive
// ═══════════════════════════════════════════════════════════════

function runHeartbeatCheck(db) {
  const now = new Date();
  console.log(`[HEARTBEAT] Running check at ${now.toISOString()}`);

  // Get all active users
  const activeUsers = db.prepare(
    "SELECT * FROM Users WHERE status = 'Active'"
  ).all();

  let checked = 0;
  let pinged = 0;
  let triggered = 0;

  for (const user of activeUsers) {
    checked++;
    const lastHeartbeat = new Date(user.lastHeartbeat);
    const daysSinceHeartbeat = Math.floor((now - lastHeartbeat) / (1000 * 60 * 60 * 24));

    // Check if heartbeat is overdue
    if (daysSinceHeartbeat >= config.HEARTBEAT_INTERVAL_DAYS) {
      const newMissedPings = user.missedPings + 1;

      // Log the missed ping
      db.prepare(`
        INSERT INTO HeartbeatLog (logID, userID, pingSentAt, responded, method)
        VALUES (?, ?, datetime('now'), 0, 'app')
      `).run(uuidv4(), user.userID);

      // Update missed ping count
      db.prepare('UPDATE Users SET missedPings = ? WHERE userID = ?')
        .run(newMissedPings, user.userID);

      pinged++;
      console.log(`[HEARTBEAT] User ${user.userID} (${user.name}): ${newMissedPings} missed pings (${daysSinceHeartbeat} days inactive)`);

      // Check if timeout threshold exceeded
      if (daysSinceHeartbeat >= config.HEARTBEAT_TIMEOUT_DAYS || newMissedPings >= config.HEARTBEAT_MAX_MISSED) {
        console.log(`[HEARTBEAT] ⚠ TRIGGER THRESHOLD REACHED for ${user.userID}`);
        console.log(`[HEARTBEAT] Days inactive: ${daysSinceHeartbeat}, Missed pings: ${newMissedPings}`);

        // Flip status to Triggered
        db.prepare(`
          UPDATE Users SET status = 'Triggered', triggerDate = datetime('now') WHERE userID = ?
        `).run(user.userID);

        // Log trigger event
        db.prepare(`
          INSERT INTO TriggerAuditLog (logID, userID, triggerSource, eventType, eventData)
          VALUES (?, ?, 'dead_mans_switch', 'inactivity_trigger', ?)
        `).run(
          uuidv4(),
          user.userID,
          JSON.stringify({
            daysSinceHeartbeat,
            missedPings: newMissedPings,
            lastHeartbeat: user.lastHeartbeat,
            thresholdDays: config.HEARTBEAT_TIMEOUT_DAYS,
            thresholdPings: config.HEARTBEAT_MAX_MISSED,
            triggeredAt: now.toISOString(),
          })
        );

        // Execute full trigger sequence
        try {
          executeTrigger(db, user.userID, 'dead_mans_switch');
          triggered++;
        } catch (err) {
          console.error(`[HEARTBEAT] Trigger execution failed for ${user.userID}:`, err.message);
        }
      }
    }
  }

  const summary = {
    timestamp: now.toISOString(),
    usersChecked: checked,
    pingsSent: pinged,
    accountsTriggered: triggered,
  };

  console.log('[HEARTBEAT] Check complete:', summary);
  return summary;
}

function checkUserHeartbeat(db, userID) {
  const user = db.prepare('SELECT * FROM Users WHERE userID = ?').get(userID);
  if (!user) return null;

  const now = new Date();
  const lastHeartbeat = new Date(user.lastHeartbeat);
  const daysSinceHeartbeat = Math.floor((now - lastHeartbeat) / (1000 * 60 * 60 * 24));
  const nextPingDue = new Date(lastHeartbeat.getTime() + config.HEARTBEAT_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  const isOverdue = daysSinceHeartbeat >= config.HEARTBEAT_INTERVAL_DAYS;
  const daysUntilTrigger = Math.max(0, config.HEARTBEAT_TIMEOUT_DAYS - daysSinceHeartbeat);

  return {
    userID: user.userID,
    status: user.status,
    lastHeartbeat: user.lastHeartbeat,
    daysSinceHeartbeat,
    missedPings: user.missedPings,
    heartbeatStreak: user.heartbeatStreak,
    isOverdue,
    nextPingDue: nextPingDue.toISOString(),
    daysUntilTrigger,
    triggerThreshold: {
      days: config.HEARTBEAT_TIMEOUT_DAYS,
      maxMissedPings: config.HEARTBEAT_MAX_MISSED,
    },
  };
}

function acknowledgeHeartbeat(db, userID) {
  const user = db.prepare('SELECT * FROM Users WHERE userID = ?').get(userID);
  if (!user || user.status !== 'Active') return false;

  db.prepare(`
    UPDATE Users SET lastHeartbeat = datetime('now'), missedPings = 0, heartbeatStreak = heartbeatStreak + 1
    WHERE userID = ?
  `).run(userID);

  // Update the latest unanswered ping log
  db.prepare(`
    UPDATE HeartbeatLog SET responded = 1, respondedAt = datetime('now')
    WHERE userID = ? AND responded = 0
    ORDER BY pingSentAt DESC LIMIT 1
  `).run(userID);

  return true;
}

module.exports = { runHeartbeatCheck, checkUserHeartbeat, acknowledgeHeartbeat };
