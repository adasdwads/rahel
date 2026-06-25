const schemaStatements = [
  `
    CREATE TABLE IF NOT EXISTS Users (
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
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS SecureVault (
      fileID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      encryptedDataBLOB BLOB NOT NULL,
      fileName TEXT NOT NULL,
      fileType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      keyShardLocation TEXT NOT NULL,
      encryptionMethod TEXT NOT NULL DEFAULT 'AES-256-GCM',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS InheritanceAccess (
      recipientID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      recipientName TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      accessTier TEXT NOT NULL CHECK (accessTier IN ('Financial', 'Personal', 'Full')),
      relationshipType TEXT NOT NULL,
      isVerified INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS CharityFlows (
      flowID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      charityName TEXT NOT NULL,
      recurringAmount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'AED',
      bankWalletToken TEXT NOT NULL,
      charityAPI_Endpoint TEXT NOT NULL,
      projectType TEXT NOT NULL CHECK (projectType IN ('WaterWell', 'Mosque', 'OrphanCare', 'Education', 'General')),
      isActive INTEGER NOT NULL DEFAULT 1,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS TimeCapsules (
      capsuleID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      title TEXT NOT NULL,
      contentBLOB BLOB NOT NULL,
      contentType TEXT NOT NULL CHECK (contentType IN ('Text', 'Voice', 'Video', 'Mixed')),
      targetReleaseDate TEXT NOT NULL,
      recipientContact TEXT NOT NULL,
      recipientName TEXT NOT NULL,
      deliveryMethod TEXT NOT NULL CHECK (deliveryMethod IN ('SMS', 'Email', 'WhatsApp', 'InApp')),
      isDelivered INTEGER NOT NULL DEFAULT 0,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS KeyShards (
      shardID TEXT PRIMARY KEY,
      fileID TEXT NOT NULL,
      recipientID TEXT NOT NULL,
      shardData BLOB NOT NULL,
      shardIndex INTEGER NOT NULL,
      totalShards INTEGER NOT NULL,
      threshold INTEGER NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (fileID) REFERENCES SecureVault(fileID) ON DELETE CASCADE,
      FOREIGN KEY (recipientID) REFERENCES InheritanceAccess(recipientID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS Wallets (
      walletID TEXT PRIMARY KEY,
      userID TEXT NOT NULL UNIQUE,
      balance REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'AED',
      fundingSource TEXT NOT NULL,
      isLocked INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS AuditLogs (
      logID TEXT PRIMARY KEY,
      userID TEXT,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      ipAddress TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE SET NULL
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS DeathCertificates (
      deathCertificateID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      certificateNumber TEXT NOT NULL UNIQUE,
      issuedAt TEXT NOT NULL,
      verifiedAt TEXT,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Verified', 'Rejected')),
      source TEXT NOT NULL DEFAULT 'CivilRegistry',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS HeartbeatConfigs (
      configID TEXT PRIMARY KEY,
      userID TEXT NOT NULL UNIQUE,
      intervalDays INTEGER NOT NULL DEFAULT 30,
      lastHeartbeatAt TEXT,
      lastPingSentAt TEXT,
      lastPingResponseAt TEXT,
      escalationStatus TEXT NOT NULL DEFAULT 'Healthy' CHECK (escalationStatus IN ('Healthy', 'Pending', 'Escalated')),
      notificationChannel TEXT NOT NULL DEFAULT 'Email',
      contactTarget TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (userID) REFERENCES Users(userID) ON DELETE CASCADE
    )
  `,
  `
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
  `
];

module.exports = schemaStatements;