const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');
const config = require('../config');

const router = express.Router();

// ──────────────────────────────────────────
// GET /api/social-legacy/configs - Get social legacy configs
// ──────────────────────────────────────────
router.get('/configs', authenticateToken, (req, res) => {
  try {
    const configs = req.db.prepare(
      'SELECT * FROM SocialLegacy WHERE userID = ? ORDER BY createdAt DESC'
    ).all(req.user.userID);

    const destructItems = req.db.prepare(
      'SELECT * FROM SelfDestructProtocol WHERE userID = ? ORDER BY priority ASC'
    ).all(req.user.userID);

    res.json({ socialConfigs: configs, selfDestructItems: destructItems });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل إعدادات الإرث الرقمي' });
  }
});

// ──────────────────────────────────────────
// POST /api/social-legacy/platform - Configure a social platform
// ──────────────────────────────────────────
router.post('/platform', authenticateToken, (req, res) => {
  try {
    const { platform, action = 'post_obituary', obituaryText, donationLink } = req.body;

    if (!platform) {
      return res.status(400).json({ error: 'المنصة مطلوبة' });
    }

    const validPlatforms = Object.keys(config.SOCIAL_PLATFORMS);
    if (!validPlatforms.includes(platform.toUpperCase())) {
      return res.status(400).json({ error: 'المنصة غير مدعومة' });
    }

    // Check if already configured
    const existing = req.db.prepare(
      'SELECT configID FROM SocialLegacy WHERE userID = ? AND platform = ?'
    ).get(req.user.userID, platform);

    if (existing) {
      req.db.prepare(`
        UPDATE SocialLegacy SET
          action = ?, obituaryText = ?, donationLink = ?, isConfigured = 1
        WHERE configID = ?
      `).run(action, obituaryText || null, donationLink || null, existing.configID);

      return res.json({ message: 'تم تحديث إعدادات المنصة بنجاح', configID: existing.configID });
    }

    const configID = uuidv4();
    req.db.prepare(`
      INSERT INTO SocialLegacy (configID, userID, platform, action, obituaryText, donationLink, isConfigured)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(configID, req.user.userID, platform, action, obituaryText || null, donationLink || null);

    res.status(201).json({
      message: 'تم تكوين المنصة بنجاح',
      config: { configID, platform, action, obituaryText, donationLink, isConfigured: true },
    });
  } catch (err) {
    console.error('[SOCIAL] Platform config error:', err);
    res.status(500).json({ error: 'خطأ في تكوين المنصة' });
  }
});

// ──────────────────────────────────────────
// DELETE /api/social-legacy/platform/:configID
// ──────────────────────────────────────────
router.delete('/platform/:configID', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare(
      'DELETE FROM SocialLegacy WHERE configID = ? AND userID = ?'
    ).run(req.params.configID, req.user.userID);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'الإعداد غير موجود' });
    }
    res.json({ message: 'تم حذف إعداد المنصة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف إعداد المنصة' });
  }
});

// ──────────────────────────────────────────
// POST /api/social-legacy/donation-link - Generate donation link
// ──────────────────────────────────────────
router.post('/donation-link', authenticateToken, (req, res) => {
  try {
    const user = req.db.prepare('SELECT name FROM Users WHERE userID = ?').get(req.user.userID);
    const donationSlug = `rahel-sadaqah-${req.user.userID.substring(0, 8)}`;
    const donationLink = `https://donate.rahel.ae/${donationSlug}`;
    const donationSnippet = `\n🤲 للتبرع باسم المرحوم ${user.name}:\n${donationLink}\n\nجزاكم الله خيراً — فريق راحل`;

    res.json({
      donationLink,
      donationSnippet,
      embedCode: `<a href="${donationLink}" target="_blank" rel="noopener">تبرع باسم ${user.name}</a>`,
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إنشاء رابط التبرع' });
  }
});

// ──────────────────────────────────────────
// POST /api/social-legacy/self-destruct/add - Add self-destruct item
// ──────────────────────────────────────────
router.post('/self-destruct/add', authenticateToken, (req, res) => {
  try {
    const { targetType, targetPath, description, priority = 1 } = req.body;

    if (!targetType || !description) {
      return res.status(400).json({ error: 'نوع الهدف والوصف مطلوبان' });
    }

    const itemID = uuidv4();
    req.db.prepare(`
      INSERT INTO SelfDestructProtocol (itemID, userID, targetType, targetPath, description, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(itemID, req.user.userID, targetType, targetPath || null, description, priority);

    res.status(201).json({
      message: 'تمت إضافة عنصر بروتوكول التدمير الذاتي',
      item: { itemID, targetType, targetPath, description, priority, confirmed: false },
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة عنصر التدمير الذاتي' });
  }
});

// ──────────────────────────────────────────
// PUT /api/social-legacy/self-destruct/:itemID/confirm
// ──────────────────────────────────────────
router.put('/self-destruct/:itemID/confirm', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare(`
      UPDATE SelfDestructProtocol SET confirmed = 1 WHERE itemID = ? AND userID = ?
    `).run(req.params.itemID, req.user.userID);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'العنصر غير موجود' });
    }
    res.json({ message: 'تم تأكيد عنصر التدمير الذاتي' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تأكيد العنصر' });
  }
});

// ──────────────────────────────────────────
// DELETE /api/social-legacy/self-destruct/:itemID
// ──────────────────────────────────────────
router.delete('/self-destruct/:itemID', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare(
      'DELETE FROM SelfDestructProtocol WHERE itemID = ? AND userID = ?'
    ).run(req.params.itemID, req.user.userID);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'العنصر غير موجود' });
    }
    res.json({ message: 'تم حذف عنصر التدمير الذاتي بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف العنصر' });
  }
});

module.exports = router;
