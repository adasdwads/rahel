const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    -- ═══════════════════════════════════════════════════════════════
    -- RAHEL Database Schema - Military-Grade Digital Legacy Platform
    -- ═══════════════════════════════════════════════════════════════

    -- Core Users Table
    CREATE TABLE IF NOT EXISTS Users (
      userID          TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      email           TEXT UNIQUE NOT NULL,
      passwordHash    TEXT NOT NULL,
      uaePassID       TEXT UNIQUE,
      phone           TEXT,
      biometricHash   TEXT,
      status          TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Triggered', 'Suspended', 'Verified')),
      lastHeartbeat   TEXT DEFAULT (datetime('now')),
      heartbeatStreak INTEGER DEFAULT 0,
      missedPings     INTEGER DEFAULT 0,
      triggerDate     TEXT,
      createdAt       TEXT DEFAULT (datetime('now')),
      updatedAt       TEXT DEFAULT (datetime('now'))
    );

    -- Secure Digital Vault
    CREATE TABLE IF NOT EXISTS SecureVault (
      fileID            TEXT PRIMARY KEY,
      userID            TEXT NOT NULL,
      fileName          TEXT NOT NULL,
      fileType          TEXT NOT NULL,
      encryptedDataBLOB BLOB,
      encryptedDataPath TEXT,
      fileSizeBytes     INTEGER DEFAULT 0,
      iv                TEXT NOT NULL,
      authTag           TEXT NOT NULL,
      keyShardLocations TEXT NOT NULL,
      accessTier        TEXT NOT NULL DEFAULT 'Personal' CHECK(accessTier IN ('Financial', 'Personal', 'Legal', 'Medical', 'Restricted')),
      description       TEXT,
      uploadedAt        TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Key Shards for Cryptographic Key Distribution
    CREATE TABLE IF NOT EXISTS KeyShards (
      shardID       TEXT PRIMARY KEY,
      fileID        TEXT NOT NULL,
      userID        TEXT NOT NULL,
      recipientID   TEXT,
      shardIndex    INTEGER NOT NULL,
      shardData     TEXT NOT NULL,
      shardHash     TEXT NOT NULL,
      distributed   INTEGER DEFAULT 0,
      distributedAt TEXT,
      FOREIGN KEY (fileID) REFERENCES SecureVault(fileID) ON DELETE CASCADE,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Inheritance Access Control
    CREATE TABLE IF NOT EXISTS InheritanceAccess (
      recipientID   TEXT PRIMARY KEY,
      userID        TEXT NOT NULL,
      recipientName TEXT NOT NULL,
      phone         TEXT NOT NULL,
      email         TEXT,
      relationship  TEXT,
      accessTier    TEXT NOT NULL DEFAULT 'Personal' CHECK(accessTier IN ('Financial', 'Personal', 'Legal', 'Medical', 'All')),
      verified      INTEGER DEFAULT 0,
      notified      INTEGER DEFAULT 0,
      notifiedAt    TEXT,
      createdAt     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Automated Charity Flows
    CREATE TABLE IF NOT EXISTS CharityFlows (
      flowID              TEXT PRIMARY KEY,
      userID              TEXT NOT NULL,
      charityName         TEXT NOT NULL,
      charityCode         TEXT NOT NULL,
      charityAPIEndpoint  TEXT NOT NULL,
      recurringAmount     REAL NOT NULL DEFAULT 0,
      currency            TEXT NOT NULL DEFAULT 'AED',
      bankWalletToken     TEXT,
      walletBalance       REAL DEFAULT 0,
      frequency           TEXT DEFAULT 'monthly' CHECK(frequency IN ('once', 'weekly', 'monthly', 'yearly')),
      isActive            INTEGER DEFAULT 1,
      lastExecuted        TEXT,
      totalDisbursed      REAL DEFAULT 0,
      executionCount      INTEGER DEFAULT 0,
      createdAt           TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Time Capsules
    CREATE TABLE IF NOT EXISTS TimeCapsules (
      capsuleID         TEXT PRIMARY KEY,
      userID            TEXT NOT NULL,
      title             TEXT NOT NULL,
      contentType       TEXT NOT NULL DEFAULT 'text' CHECK(contentType IN ('text', 'voice', 'video', 'mixed')),
      contentBLOB       BLOB,
      contentPath       TEXT,
      textContent       TEXT,
      targetReleaseDate TEXT NOT NULL,
      recipientContact  TEXT NOT NULL,
      recipientName     TEXT,
      occasion          TEXT,
      delivered         INTEGER DEFAULT 0,
      deliveredAt       TEXT,
      createdAt         TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Social Legacy Configuration
    CREATE TABLE IF NOT EXISTS SocialLegacy (
      configID          TEXT PRIMARY KEY,
      userID            TEXT NOT NULL,
      platform          TEXT NOT NULL,
      action            TEXT NOT NULL DEFAULT 'post_obituary' CHECK(action IN ('post_obituary', 'deactivate', 'memorialize', 'delete')),
      obituaryText      TEXT,
      donationLink      TEXT,
      accessToken       TEXT,
      tokenExpiry       TEXT,
      isConfigured      INTEGER DEFAULT 0,
      executed          INTEGER DEFAULT 0,
      executedAt        TEXT,
      createdAt         TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Self-Destruct Protocol Checklist
    CREATE TABLE IF NOT EXISTS SelfDestructProtocol (
      itemID        TEXT PRIMARY KEY,
      userID        TEXT NOT NULL,
      targetType    TEXT NOT NULL CHECK(targetType IN ('file', 'account', 'data', 'browser_history', 'app_data', 'custom')),
      targetPath    TEXT,
      description   TEXT NOT NULL,
      priority      INTEGER DEFAULT 1,
      confirmed     INTEGER DEFAULT 0,
      executed      INTEGER DEFAULT 0,
      executedAt    TEXT,
      createdAt     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Heartbeat Log for Dead Man's Switch
    CREATE TABLE IF NOT EXISTS HeartbeatLog (
      logID       TEXT PRIMARY KEY,
      userID      TEXT NOT NULL,
      pingSentAt  TEXT NOT NULL,
      respondedAt TEXT,
      responded   INTEGER DEFAULT 0,
      method      TEXT DEFAULT 'app' CHECK(method IN ('app', 'sms', 'email', 'push')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Trigger Event Audit Log
    CREATE TABLE IF NOT EXISTS TriggerAuditLog (
      logID         TEXT PRIMARY KEY,
      userID        TEXT NOT NULL,
      triggerSource TEXT NOT NULL CHECK(triggerSource IN ('government_webhook', 'dead_mans_switch', 'manual_verification')),
      eventType     TEXT NOT NULL,
      eventData     TEXT,
      executedAt    TEXT DEFAULT (datetime('now')),
      success       INTEGER DEFAULT 1,
      errorMessage  TEXT,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    );

    -- Wallet Transactions
    CREATE TABLE IF NOT EXISTS WalletTransactions (
      txID          TEXT PRIMARY KEY,
      userID        TEXT NOT NULL,
      flowID        TEXT,
      amount        REAL NOT NULL,
      currency      TEXT NOT NULL DEFAULT 'AED',
      txType        TEXT NOT NULL CHECK(txType IN ('deposit', 'withdrawal', 'charity_disbursement', 'refund')),
      status        TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'reversed')),
      paymentMethod TEXT,
      reference     TEXT,
      createdAt     TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE,
      FOREIGN KEY (flowID) REFERENCES CharityFlows(flowID) ON DELETE SET NULL
    );

    -- Indexes for Performance
    CREATE INDEX IF NOT EXISTS idx_users_status ON Users(status);
    CREATE INDEX IF NOT EXISTS idx_users_heartbeat ON Users(lastHeartbeat);
    CREATE INDEX IF NOT EXISTS idx_vault_user ON SecureVault(userID);
    CREATE INDEX IF NOT EXISTS idx_shards_file ON KeyShards(fileID);
    CREATE INDEX IF NOT EXISTS idx_shards_recipient ON KeyShards(recipientID);
    CREATE INDEX IF NOT EXISTS idx_inheritance_user ON InheritanceAccess(userID);
    CREATE INDEX IF NOT EXISTS idx_charity_user ON CharityFlows(userID);
    CREATE INDEX IF NOT EXISTS idx_capsules_user ON TimeCapsules(userID);
    CREATE INDEX IF NOT EXISTS idx_capsules_release ON TimeCapsules(targetReleaseDate);
    CREATE INDEX IF NOT EXISTS idx_social_user ON SocialLegacy(userID);
    CREATE INDEX IF NOT EXISTS idx_destruct_user ON SelfDestructProtocol(userID);
    CREATE INDEX IF NOT EXISTS idx_heartbeat_user ON HeartbeatLog(userID);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON TriggerAuditLog(userID);
    CREATE INDEX IF NOT EXISTS idx_wallet_user ON WalletTransactions(userID);

    -- Triggers for automatic timestamp updates
    CREATE TRIGGER IF NOT EXISTS update_user_timestamp
      AFTER UPDATE ON Users
      BEGIN
        UPDATE Users SET updatedAt = datetime('now') WHERE userID = NEW.userID;
      END;
  `);

  console.log('[DB] RAHEL database initialized with full schema');
  return db;
}

module.exports = { initDatabase };
