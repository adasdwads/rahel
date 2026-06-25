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
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  civilRegistryWebhookSecret: process.env.CIVIL_REGISTRY_WEBHOOK_SECRET || 'rahel-civil-registry-webhook-secret',
  deadManSwitchDays: Number(process.env.DEAD_MAN_SWITCH_DAYS || 30),
  uaePassEnvironment: (process.env.UAE_PASS_ENVIRONMENT || 'staging').trim().toLowerCase(),
  uaePassClientId: process.env.UAE_PASS_CLIENT_ID || '',
  uaePassClientSecret: process.env.UAE_PASS_CLIENT_SECRET || '',
  uaePassRedirectUri: process.env.UAE_PASS_REDIRECT_URI || 'rahel://uae-pass/callback',
  uaePassScope: process.env.UAE_PASS_SCOPE || 'urn:uae:digitalid:profile:general openid',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://10.0.2.2:3000,http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
};