const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  databasePath: process.env.DATABASE_PATH || path.join(__dirname, '../../data/rahel.sqlite'),
  jwtSecret: process.env.JWT_SECRET || 'rahel-super-secret-access-token',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'rahel-super-secret-refresh-token',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  civilRegistryWebhookSecret: process.env.CIVIL_REGISTRY_WEBHOOK_SECRET || 'rahel-civil-registry-webhook-secret',
  deadManSwitchDays: Number(process.env.DEAD_MAN_SWITCH_DAYS || 30),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://10.0.2.2:3000,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};