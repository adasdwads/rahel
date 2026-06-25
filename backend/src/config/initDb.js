const db = require('./database');
const schemaStatements = require('./schema');
const seed = require('./seed');
const bcrypt = require('bcrypt');

const initializeDatabase = () => {
  schemaStatements.forEach((statement) => {
    db.prepare(statement).run();
  });

  const userColumns = db.prepare("PRAGMA table_info(Users)").all().map((column) => column.name);
  const userTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'Users'").get();
  const requiresUsersMigration = !userTableSql
    || userTableSql.sql.includes('uaePassID TEXT UNIQUE NOT NULL')
    || userTableSql.sql.includes('biometricHash TEXT NOT NULL');

  if (requiresUsersMigration) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS Users_v2 (
        userID TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        uaePassID TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE,
        phone TEXT NOT NULL,
        passwordHash TEXT NOT NULL,
        biometricHash TEXT,
        refreshTokenHash TEXT,
        status TEXT NOT NULL CHECK (status IN ('Active', 'Triggered', 'Suspended')),
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      INSERT INTO Users_v2 (userID, name, uaePassID, email, phone, passwordHash, biometricHash, refreshTokenHash, status, createdAt, updatedAt)
      SELECT
        userID,
        name,
        uaePassID,
        email,
        phone,
        COALESCE(passwordHash, 'legacy-password-hash'),
        biometricHash,
        refreshTokenHash,
        status,
        createdAt,
        updatedAt
      FROM Users;
      DROP TABLE Users;
      ALTER TABLE Users_v2 RENAME TO Users;
    `);
  }

  if (!userColumns.includes('passwordHash')) {
    db.prepare('ALTER TABLE Users ADD COLUMN passwordHash TEXT').run();
  }
  if (!userColumns.includes('refreshTokenHash')) {
    db.prepare('ALTER TABLE Users ADD COLUMN refreshTokenHash TEXT').run();
  }
  if (!userColumns.includes('biometricHash')) {
    db.prepare('ALTER TABLE Users ADD COLUMN biometricHash TEXT').run();
  }

  const usersMissingPassword = db.prepare('SELECT userID FROM Users WHERE passwordHash IS NULL OR passwordHash = ?').all('legacy-password-hash');
  const fallbackPasswordHash = bcrypt.hashSync('Rahel@12345', 10);
  usersMissingPassword.forEach((user) => {
    db.prepare('UPDATE Users SET passwordHash = ? WHERE userID = ?').run(fallbackPasswordHash, user.userID);
  });

  const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get().count;
  const inheritanceCount = db.prepare('SELECT COUNT(*) as count FROM InheritanceAccess').get().count;
  const vaultCount = db.prepare('SELECT COUNT(*) as count FROM SecureVault').get().count;
  const charityCount = db.prepare('SELECT COUNT(*) as count FROM CharityFlows').get().count;
  const capsuleCount = db.prepare('SELECT COUNT(*) as count FROM TimeCapsules').get().count;
  const walletCount = db.prepare('SELECT COUNT(*) as count FROM Wallets').get().count;
  const heartbeatConfigCount = db.prepare('SELECT COUNT(*) as count FROM HeartbeatConfigs').get().count;
  const socialAccountsTable = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'SocialAccounts'").get();

  if (userCount === 0 || inheritanceCount === 0 || vaultCount === 0 || charityCount === 0 || capsuleCount === 0 || walletCount === 0 || heartbeatConfigCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO Users (userID, name, uaePassID, email, phone, passwordHash, biometricHash, refreshTokenHash, status, createdAt, updatedAt)
      VALUES (@userID, @name, @uaePassID, @email, @phone, @passwordHash, @biometricHash, @refreshTokenHash, @status, @createdAt, @updatedAt)
    `);
    const insertVault = db.prepare(`
      INSERT INTO SecureVault (fileID, userID, encryptedDataBLOB, fileName, fileType, fileSize, keyShardLocation, encryptionMethod, timestamp)
      VALUES (@fileID, @userID, @encryptedDataBLOB, @fileName, @fileType, @fileSize, @keyShardLocation, @encryptionMethod, @timestamp)
    `);
    const insertInheritance = db.prepare(`
      INSERT INTO InheritanceAccess (recipientID, userID, recipientName, phone, email, accessTier, relationshipType, isVerified, timestamp)
      VALUES (@recipientID, @userID, @recipientName, @phone, @email, @accessTier, @relationshipType, @isVerified, @timestamp)
    `);
    const insertCharity = db.prepare(`
      INSERT INTO CharityFlows (flowID, userID, charityName, recurringAmount, currency, bankWalletToken, charityAPI_Endpoint, projectType, isActive, timestamp)
      VALUES (@flowID, @userID, @charityName, @recurringAmount, @currency, @bankWalletToken, @charityAPI_Endpoint, @projectType, @isActive, @timestamp)
    `);
    const insertCapsule = db.prepare(`
      INSERT INTO TimeCapsules (capsuleID, userID, title, contentBLOB, contentType, targetReleaseDate, recipientContact, recipientName, deliveryMethod, isDelivered, timestamp)
      VALUES (@capsuleID, @userID, @title, @contentBLOB, @contentType, @targetReleaseDate, @recipientContact, @recipientName, @deliveryMethod, @isDelivered, @timestamp)
    `);
    const insertShard = db.prepare(`
      INSERT INTO KeyShards (shardID, fileID, recipientID, shardData, shardIndex, totalShards, threshold, createdAt)
      VALUES (@shardID, @fileID, @recipientID, @shardData, @shardIndex, @totalShards, @threshold, @createdAt)
    `);
    const insertWallet = db.prepare(`
      INSERT INTO Wallets (walletID, userID, balance, currency, fundingSource, isLocked, createdAt, updatedAt)
      VALUES (@walletID, @userID, @balance, @currency, @fundingSource, @isLocked, @createdAt, @updatedAt)
    `);
    const insertHeartbeatConfig = db.prepare(`
      INSERT INTO HeartbeatConfigs (configID, userID, intervalDays, lastHeartbeatAt, lastPingSentAt, lastPingResponseAt, escalationStatus, notificationChannel, contactTarget, createdAt, updatedAt)
      VALUES (@configID, @userID, @intervalDays, @lastHeartbeatAt, @lastPingSentAt, @lastPingResponseAt, @escalationStatus, @notificationChannel, @contactTarget, @createdAt, @updatedAt)
    `);

    const transaction = db.transaction(() => {
      if (userCount === 0) {
        seed.users.forEach((item) => insertUser.run(item));
      }
      if (vaultCount === 0) {
        seed.secureVault.forEach((item) => insertVault.run(item));
      }
      if (inheritanceCount === 0) {
        seed.inheritanceAccess.forEach((item) => insertInheritance.run(item));
      }
      if (charityCount === 0) {
        seed.charityFlows.forEach((item) => insertCharity.run(item));
      }
      if (capsuleCount === 0) {
        seed.timeCapsules.forEach((item) => insertCapsule.run(item));
      }
      if (seed.keyShards) {
        seed.keyShards.forEach((item) => insertShard.run(item));
      }
      if (walletCount === 0 && seed.wallets) {
        seed.wallets.forEach((item) => insertWallet.run(item));
      }
      if (heartbeatConfigCount === 0 && seed.heartbeatConfigs) {
        seed.heartbeatConfigs.forEach((item) => insertHeartbeatConfig.run(item));
      }
    });

    transaction();
  }

  if (!socialAccountsTable) {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS SocialAccounts (
        socialAccountID TEXT PRIMARY KEY,
        userID TEXT NOT NULL,
        platformName TEXT NOT NULL,
        username TEXT NOT NULL,
        oauthState TEXT NOT NULL,
        authUrl TEXT NOT NULL,
        connectedAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        UNIQUE (userID, platformName),
        FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
      )
    `).run();
  }
};

module.exports = initializeDatabase;