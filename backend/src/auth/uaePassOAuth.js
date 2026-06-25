const { createId, now } = require('../utils/helpers');

const authorizationCodes = new Map();
const accessTokens = new Map();

const buildMockProfile = (overrides = {}) => ({
  sub: createId(),
  uaePassID: `784-1994-${Math.floor(1000000 + Math.random() * 8999999)}-1`,
  fullNameEn: 'Fatima Al Nahyan',
  fullNameAr: 'فاطمة آل نهيان',
  email: 'fatima.alnahyan@uaepass.ae',
  mobile: '+971551234567',
  nationality: 'United Arab Emirates',
  emirate: 'Abu Dhabi',
  dateOfBirth: '1994-05-14',
  gender: 'Female',
  ...overrides
});

const createAuthorizationResponse = ({ redirectUri, state, profileOverrides }) => {
  const code = `uaepass-code-${createId()}`;
  const profile = buildMockProfile(profileOverrides);

  authorizationCodes.set(code, {
    code,
    redirectUri,
    state,
    profile,
    createdAt: now()
  });

  return {
    authorizationCode: code,
    redirectUri,
    state,
    expiresIn: 300,
    scope: 'openid profile emiratesid',
    mockConsent: 'approved'
  };
};

const exchangeAuthorizationCode = ({ code, redirectUri }) => {
  const record = authorizationCodes.get(code);
  if (!record || record.redirectUri !== redirectUri) {
    throw new Error('Invalid UAE PASS authorization code');
  }

  authorizationCodes.delete(code);

  const accessToken = `uaepass-access-${createId()}`;
  const refreshToken = `uaepass-refresh-${createId()}`;

  accessTokens.set(accessToken, {
    accessToken,
    refreshToken,
    profile: record.profile,
    createdAt: now()
  });

  return {
    token_type: 'Bearer',
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    scope: 'openid profile emiratesid'
  };
};

const getUserInfo = (accessToken) => {
  const tokenRecord = accessTokens.get(accessToken);
  if (!tokenRecord) {
    throw new Error('Invalid UAE PASS access token');
  }

  return tokenRecord.profile;
};

module.exports = {
  createAuthorizationResponse,
  exchangeAuthorizationCode,
  getUserInfo
};