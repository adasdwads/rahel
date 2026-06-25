const { createId, now } = require('../utils/helpers');
const {
  uaePassEnvironment,
  uaePassClientId,
  uaePassClientSecret,
  uaePassRedirectUri,
  uaePassScope
} = require('../config/env');

const authorizationCodes = new Map();
const accessTokens = new Map();

const endpointHosts = {
  staging: 'stg-id.uaepass.ae',
  production: 'id.uaepass.ae'
};

const resolveEnvironment = (requestedEnvironment) => {
  const normalized = (requestedEnvironment || uaePassEnvironment || 'staging').toString().trim().toLowerCase();
  return normalized === 'production' ? 'production' : 'staging';
};

const getBaseUrl = (requestedEnvironment) => {
  const environment = resolveEnvironment(requestedEnvironment);
  return `https://${endpointHosts[environment]}`;
};

const getConfig = (requestedEnvironment, redirectUri) => {
  const environment = resolveEnvironment(requestedEnvironment);
  return {
    environment,
    baseUrl: getBaseUrl(environment),
    clientId: uaePassClientId,
    clientSecret: uaePassClientSecret,
    redirectUri: redirectUri || uaePassRedirectUri,
    scope: uaePassScope
  };
};

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

const createAuthorizationResponse = ({ redirectUri, state, profileOverrides, environment }) => {
  const config = getConfig(environment, redirectUri);
  const code = `uaepass-code-${createId()}`;
  const profile = buildMockProfile(profileOverrides);

  authorizationCodes.set(code, {
    code,
    redirectUri: config.redirectUri,
    state,
    profile,
    environment: config.environment,
    createdAt: now()
  });

  const authorizationUrl = new URL(`${config.baseUrl}/idshub/authorize`);
  authorizationUrl.searchParams.set('response_type', 'code');
  authorizationUrl.searchParams.set('client_id', config.clientId || 'missing-client-id');
  authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
  authorizationUrl.searchParams.set('scope', config.scope);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('acr_values', 'urn:safelayer:tws:policies:authentication:level:low');

  return {
    environment: config.environment,
    authorizationUrl: authorizationUrl.toString(),
    authorizationCode: code,
    redirectUri: config.redirectUri,
    state,
    expiresIn: 300,
    scope: config.scope,
    tokenEndpoint: `${config.baseUrl}/idshub/token`,
    userInfoEndpoint: `${config.baseUrl}/idshub/userinfo`,
    mockConsent: 'approved'
  };
};

const exchangeAuthorizationCode = ({ code, redirectUri, environment }) => {
  const record = authorizationCodes.get(code);
  const config = getConfig(environment || record?.environment, redirectUri);
  if (!record || record.redirectUri !== config.redirectUri) {
    throw new Error('Invalid UAE PASS authorization code');
  }

  authorizationCodes.delete(code);

  const accessToken = `uaepass-access-${createId()}`;
  const refreshToken = `uaepass-refresh-${createId()}`;

  accessTokens.set(accessToken, {
    accessToken,
    refreshToken,
    profile: record.profile,
    environment: record.environment,
    createdAt: now()
  });

  return {
    environment: record.environment,
    token_type: 'Bearer',
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: 3600,
    scope: config.scope,
    client_id: config.clientId,
    redirect_uri: config.redirectUri
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
  getConfig,
  createAuthorizationResponse,
  exchangeAuthorizationCode,
  getUserInfo
};