const bcrypt = require('bcrypt');
const db = require('../config/database');
const UserModel = require('../models/userModel');
const {
  createAuthorizationResponse,
  exchangeAuthorizationCode,
  getUserInfo
} = require('../auth/uaePassOAuth');
const {
  createAccessToken,
  createRefreshToken,
  hashValue,
  compareValue
} = require('../auth/tokenService');

const userModel = new UserModel(db);

const buildAuthResponse = async (userRecord) => {
  const safeUser = userModel.sanitizeUser(userRecord);
  const accessToken = createAccessToken(userRecord);
  const refreshToken = createRefreshToken(userRecord);
  const refreshTokenHash = await hashValue(refreshToken);
  userModel.updateRefreshToken(userRecord.userID, refreshTokenHash);

  return {
    user: safeUser,
    accessToken,
    refreshToken,
    expiresIn: 900
  };
};

const register = async (req, res, next) => {
  try {
    const existingUser = userModel.findByEmail(req.body.email);
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(req.body.password, 10);
    const biometricHash = req.body.biometricToken ? await bcrypt.hash(req.body.biometricToken, 10) : null;

    const user = userModel.create({
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      passwordHash,
      biometricHash,
      uaePassID: req.body.uaePassID || null,
      status: 'Active'
    });

    const rawUser = userModel.findRawById(user.userID);
    return res.status(201).json(await buildAuthResponse(rawUser));
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const user = userModel.findByEmail(req.body.email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValid = await compareValue(req.body.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.json(await buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

const verifyBiometric = async (req, res, next) => {
  try {
    const user = userModel.findByEmail(req.body.email);
    if (!user || !user.biometricHash) {
      return res.status(401).json({ message: 'Biometric verification failed' });
    }

    const isValid = await compareValue(req.body.biometricToken, user.biometricHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Biometric verification failed' });
    }

    return res.json(await buildAuthResponse(user));
  } catch (error) {
    return next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const { jwtRefreshSecret } = require('../config/env');
    const payload = jwt.verify(req.body.refreshToken, jwtRefreshSecret);
    const user = userModel.findRawById(payload.userID);

    if (!user || !user.refreshTokenHash) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const matches = await compareValue(req.body.refreshToken, user.refreshTokenHash);
    if (!matches) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    return res.json(await buildAuthResponse(user));
  } catch (error) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
};

const authorizeUaePass = async (req, res, next) => {
  try {
    const response = createAuthorizationResponse({
      redirectUri: req.body.redirectUri || 'rahel://uae-pass/callback',
      state: req.body.state || 'rahel-state'
    });

    return res.json(response);
  } catch (error) {
    return next(error);
  }
};

const handleUaePassCallback = async (req, res, next) => {
  try {
    const tokenResponse = exchangeAuthorizationCode({
      code: req.body.code,
      redirectUri: req.body.redirectUri || 'rahel://uae-pass/callback'
    });
    const profile = getUserInfo(tokenResponse.access_token);

    let user = userModel.findByUaePassId(profile.uaePassID);
    if (!user) {
      const passwordHash = await bcrypt.hash(`uaepass-${profile.uaePassID}`, 10);
      const createdUser = userModel.create({
        name: profile.fullNameAr,
        email: profile.email,
        phone: profile.mobile,
        passwordHash,
        biometricHash: null,
        uaePassID: profile.uaePassID,
        status: 'Active'
      });
      user = userModel.findRawById(createdUser.userID);
    }

    const auth = await buildAuthResponse(user);
    return res.json({
      ...auth,
      uaePassProfile: profile,
      uaePassTokens: tokenResponse
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  verifyBiometric,
  refreshToken,
  authorizeUaePass,
  handleUaePassCallback
};