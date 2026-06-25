const express = require('express');
const { randomUUID } = require('crypto');
const db = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const SocialAccountModel = require('../models/socialAccountModel');

const router = express.Router();
const socialAccountModel = new SocialAccountModel(db);

const supportedPlatforms = [
  'x',
  'instagram',
  'facebook',
  'snapchat',
  'tiktok',
  'linkedin',
  'telegram'
];

const platformLabels = {
  x: 'X (Twitter)',
  instagram: 'Instagram',
  facebook: 'Facebook',
  snapchat: 'Snapchat',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  telegram: 'Telegram'
};

const buildOAuthUrl = (platformName, state) => {
  return `https://auth.rahel.app/oauth/${platformName}?client_id=rahel-mobile&redirect_uri=rahel://social/callback&response_type=code&scope=basic_profile+publish_post&state=${state}`;
};

const normalizePlatform = (platformName = '') => platformName.toString().trim().toLowerCase();

router.get('/platforms', authMiddleware, (req, res) => {
  const connected = socialAccountModel.findByUserId(req.user.userID).map((account) => ({
    platformName: account.platformName,
    displayName: platformLabels[account.platformName] || account.platformName,
    username: account.username,
    connected: true,
    authUrl: account.authUrl,
    connectedAt: account.connectedAt
  }));

  return res.status(200).json({
    platforms: supportedPlatforms.map((platformName) => {
      const existing = connected.find((item) => item.platformName === platformName);
      return existing || {
        platformName,
        displayName: platformLabels[platformName],
        username: null,
        connected: false,
        authUrl: null,
        connectedAt: null
      };
    })
  });
});

router.post('/connect', authMiddleware, (req, res) => {
  const platformName = normalizePlatform(req.body.platformName);

  if (!supportedPlatforms.includes(platformName)) {
    return res.status(400).json({ message: 'Unsupported platform' });
  }

  const state = randomUUID();
  const authUrl = buildOAuthUrl(platformName, state);
  const username = `${platformName}_rahel_user`;
  const account = socialAccountModel.upsertConnection({
    userID: req.user.userID,
    platformName,
    username,
    oauthState: state,
    authUrl
  });

  return res.status(200).json({
    platformName: account.platformName,
    displayName: platformLabels[account.platformName],
    username: account.username,
    connected: true,
    authUrl: account.authUrl,
    callbackUrl: `rahel://social/callback?platform=${account.platformName}&state=${account.oauthState}&code=demo-code`
  });
});

router.delete('/disconnect', authMiddleware, (req, res) => {
  const platformName = normalizePlatform(req.body?.platformName);

  if (!supportedPlatforms.includes(platformName)) {
    return res.status(400).json({ message: 'Unsupported platform' });
  }

  const disconnected = socialAccountModel.disconnect(req.user.userID, platformName);

  if (!disconnected) {
    return res.status(404).json({ message: 'Platform connection not found' });
  }

  return res.status(200).json({ platformName, connected: false });
});

router.post('/post', authMiddleware, (req, res) => {
  const platformName = normalizePlatform(req.body.platformName);
  const text = req.body.text?.toString().trim();

  if (!supportedPlatforms.includes(platformName)) {
    return res.status(400).json({ message: 'Unsupported platform' });
  }

  if (!text) {
    return res.status(400).json({ message: 'Post text is required' });
  }

  const account = socialAccountModel.findByUserAndPlatform(req.user.userID, platformName);
  if (!account) {
    return res.status(404).json({ message: 'Platform is not connected' });
  }

  return res.status(200).json({
    platformName,
    username: account.username,
    posted: true,
    text,
    postedAt: new Date().toISOString()
  });
});

module.exports = router;