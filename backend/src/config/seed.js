const { now } = require('../utils/helpers');

const timestamp = now();

const users = [
  {
    userID: 'user-001',
    name: 'Aisha Al Mansoori',
    uaePassID: 'uaepass-aisha-001',
    email: 'aisha@rahel.app',
    phone: '+971500000001',
    passwordHash: '$2b$10$7sQqzQ0mQmQxvQxQmQxQmOQzv8mQmQxQmQxQmQxQmQxQmQxQmQxQe',
    biometricHash: 'biohash-aisha-001',
    refreshTokenHash: null,
    status: 'Active',
    createdAt: timestamp,
    updatedAt: timestamp
  },
  {
    userID: 'user-002',
    name: 'Omar Al Suwaidi',
    uaePassID: 'uaepass-omar-002',
    email: 'omar@rahel.app',
    phone: '+971500000002',
    passwordHash: '$2b$10$7sQqzQ0mQmQxvQxQmQxQmOQzv8mQmQxQmQxQmQxQmQxQmQxQmQxQe',
    biometricHash: 'biohash-omar-002',
    refreshTokenHash: null,
    status: 'Triggered',
    createdAt: timestamp,
    updatedAt: timestamp
  }
];

const wallets = [
  {
    walletID: 'wallet-001',
    userID: 'user-001',
    balance: 2500,
    currency: 'AED',
    fundingSource: 'MockBankCard',
    isLocked: 0,
    createdAt: timestamp,
    updatedAt: timestamp
  }
];

const heartbeatConfigs = [
  {
    configID: 'heartbeat-001',
    userID: 'user-001',
    intervalDays: 30,
    lastHeartbeatAt: timestamp,
    lastPingSentAt: null,
    lastPingResponseAt: timestamp,
    escalationStatus: 'Healthy',
    notificationChannel: 'Email',
    contactTarget: 'aisha@rahel.app',
    createdAt: timestamp,
    updatedAt: timestamp
  }
];

const secureVault = [
  {
    fileID: 'vault-001',
    userID: 'user-001',
    encryptedDataBLOB: Buffer.from('Sample encrypted vault data for Aisha'),
    fileName: 'will-document.enc',
    fileType: 'application/octet-stream',
    fileSize: 5120,
    keyShardLocation: 'Abu Dhabi Secure Node A',
    encryptionMethod: 'AES-256-GCM',
    timestamp
  }
];

const inheritanceAccess = [
  {
    recipientID: 'inherit-001',
    userID: 'user-001',
    recipientName: 'Fatima Al Mansoori',
    phone: '+971500000010',
    email: 'fatima@family.ae',
    accessTier: 'Full',
    relationshipType: 'Sister',
    isVerified: 1,
    timestamp
  }
];

const charityFlows = [
  {
    flowID: 'charity-001',
    userID: 'user-001',
    charityName: 'Dubai Water Aid',
    recurringAmount: 250.0,
    currency: 'AED',
    bankWalletToken: 'wallet-token-001',
    charityAPI_Endpoint: 'https://api.charity.example/water',
    projectType: 'WaterWell',
    isActive: 1,
    timestamp
  }
];

const timeCapsules = [
  {
    capsuleID: 'capsule-001',
    userID: 'user-002',
    title: 'Message for My Family',
    contentBLOB: Buffer.from('This is a heartfelt legacy message.'),
    contentType: 'Text',
    targetReleaseDate: '2030-01-01',
    recipientContact: '+971500000020',
    recipientName: 'Maryam Al Suwaidi',
    deliveryMethod: 'WhatsApp',
    isDelivered: 0,
    timestamp
  }
];

module.exports = {
  users,
  wallets,
  heartbeatConfigs,
  keyShards: [],
  secureVault,
  inheritanceAccess,
  charityFlows,
  timeCapsules
};