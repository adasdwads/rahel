const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3001,
  JWT_SECRET: process.env.JWT_SECRET || 'rahel-hmac-sha512-jwt-secret-2024-prod-xK9mP2vL',
  JWT_EXPIRY: '24h',
  BCRYPT_ROUNDS: 12,

  HEARTBEAT_INTERVAL_DAYS: 7,
  HEARTBEAT_TIMEOUT_DAYS: 30,
  HEARTBEAT_MAX_MISSED: 4,

  AES_ALGORITHM: 'aes-256-gcm',
  KEY_SHARD_THRESHOLD: 2,
  KEY_SHARD_TOTAL: 3,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,

  DB_PATH: path.join(__dirname, 'data', 'rahel.db'),
  UPLOAD_PATH: path.join(__dirname, 'data', 'uploads'),
  MAX_FILE_SIZE: 50 * 1024 * 1024,

  CHARITY_ENDPOINTS: {
    WATER_WELLS: { name: 'آبار المياه', endpoint: 'https://api.charity-mock.rahel/v1/water-wells', code: 'WW' },
    MOSQUES: { name: 'بناء المساجد', endpoint: 'https://api.charity-mock.rahel/v1/mosques', code: 'MS' },
    ORPHAN_CARE: { name: 'كفالة الأيتام', endpoint: 'https://api.charity-mock.rahel/v1/orphan-care', code: 'OC' },
    EDUCATION: { name: 'التعليم', endpoint: 'https://api.charity-mock.rahel/v1/education', code: 'ED' },
    GENERAL: { name: 'صدقة عامة', endpoint: 'https://api.charity-mock.rahel/v1/general', code: 'GN' }
  },

  UAE_PASS: {
    CLIENT_ID: process.env.UAE_PASS_CLIENT_ID || 'rahel-uaepass-client-id',
    CLIENT_SECRET: process.env.UAE_PASS_CLIENT_SECRET || 'rahel-uaepass-client-secret',
    AUTH_URL: 'https://stg-id.uaepass.ae/idp/oidc/authorize',
    TOKEN_URL: 'https://stg-id.uaepass.ae/idp/oidc/token',
    USERINFO_URL: 'https://stg-id.uaepass.ae/idp/oidc/userinfo',
    REDIRECT_URI: 'http://localhost:3001/api/auth/uaepass/callback',
    SCOPE: 'openid profile email'
  },

  SOCIAL_PLATFORMS: {
    TWITTER: { name: 'X (Twitter)', apiBase: 'https://api.twitter.com/2', mockEnabled: true },
    FACEBOOK: { name: 'Facebook', apiBase: 'https://graph.facebook.com/v18.0', mockEnabled: true },
    INSTAGRAM: { name: 'Instagram', apiBase: 'https://graph.instagram.com/v18.0', mockEnabled: true }
  },

  PAYMENT_GATEWAYS: {
    STRIPE: { apiBase: 'https://api.stripe.com/v1', mockEnabled: true },
    APPLE_PAY: { merchantId: 'merchant.com.rahel.app', mockEnabled: true }
  }
};
