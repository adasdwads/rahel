const express = require('express');
const db = require('../config/database');
const authMiddleware = require('../middleware/authMiddleware');
const { createId, now } = require('../utils/helpers');

const router = express.Router();

const ensureTables = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS SocialLegacyConfigs (
      configID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      platform TEXT NOT NULL,
      obituaryText TEXT,
      donationLink TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS SelfDestructItems (
      itemID TEXT PRIMARY KEY,
      userID TEXT NOT NULL,
      targetType TEXT NOT NULL,
      description TEXT NOT NULL,
      priority INTEGER NOT NULL DEFAULT 1,
      confirmed INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )
  `).run();
};

ensureTables();

const listConfigs = (userID) =>
  db.prepare('SELECT * FROM SocialLegacyConfigs WHERE userID = ? ORDER BY updatedAt DESC').all(userID);

const listDestructItems = (userID) =>
  db.prepare('SELECT * FROM SelfDestructItems WHERE userID = ? ORDER BY priority ASC, updatedAt DESC').all(userID);

router.get('/configs', authMiddleware, (req, res) => {
  return res.status(200).json({
    socialConfigs: listConfigs(req.user.userID),
    selfDestructItems: listDestructItems(req.user.userID)
  });
});

router.post('/platform', authMiddleware, (req, res) => {
  const platform = req.body.platform?.toString().trim().toLowerCase();
  if (!platform) {
    return res.status(400).json({ message: 'Platform is required' });
  }

  const existing = db.prepare('SELECT * FROM SocialLegacyConfigs WHERE userID = ? AND platform = ?').get(req.user.userID, platform);
  const record = {
    configID: existing?.configID || createId(),
    userID: req.user.userID,
    platform,
    obituaryText: req.body.obituaryText || '',
    donationLink: req.body.donationLink || null,
    createdAt: existing?.createdAt || now(),
    updatedAt: now()
  };

  if (existing) {
    db.prepare(`
      UPDATE SocialLegacyConfigs
      SET obituaryText = @obituaryText,
          donationLink = @donationLink,
          updatedAt = @updatedAt
      WHERE configID = @configID
    `).run(record);
  } else {
    db.prepare(`
      INSERT INTO SocialLegacyConfigs (configID, userID, platform, obituaryText, donationLink, createdAt, updatedAt)
      VALUES (@configID, @userID, @platform, @obituaryText, @donationLink, @createdAt, @updatedAt)
    `).run(record);
  }

  return res.status(200).json(record);
});

router.delete('/platform/:configID', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM SocialLegacyConfigs WHERE configID = ? AND userID = ?').run(req.params.configID, req.user.userID);
  return res.status(200).json({ deleted: true });
});

router.post('/self-destruct/add', authMiddleware, (req, res) => {
  const description = req.body.description?.toString().trim();
  const targetType = req.body.targetType?.toString().trim();
  if (!description || !targetType) {
    return res.status(400).json({ message: 'description and targetType are required' });
  }

  const record = {
    itemID: createId(),
    userID: req.user.userID,
    targetType,
    description,
    priority: Number(req.body.priority || 1),
    confirmed: 0,
    createdAt: now(),
    updatedAt: now()
  };

  db.prepare(`
    INSERT INTO SelfDestructItems (itemID, userID, targetType, description, priority, confirmed, createdAt, updatedAt)
    VALUES (@itemID, @userID, @targetType, @description, @priority, @confirmed, @createdAt, @updatedAt)
  `).run(record);

  return res.status(201).json(record);
});

router.put('/self-destruct/:itemID/confirm', authMiddleware, (req, res) => {
  db.prepare(`
    UPDATE SelfDestructItems
    SET confirmed = 1,
        updatedAt = ?
    WHERE itemID = ? AND userID = ?
  `).run(now(), req.params.itemID, req.user.userID);

  return res.status(200).json({ confirmed: true });
});

router.delete('/self-destruct/:itemID', authMiddleware, (req, res) => {
  db.prepare('DELETE FROM SelfDestructItems WHERE itemID = ? AND userID = ?').run(req.params.itemID, req.user.userID);
  return res.status(200).json({ deleted: true });
});

module.exports = router;