const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────
// GET /api/time-capsule/list - List user's capsules
// ──────────────────────────────────────────
router.get('/list', authenticateToken, (req, res) => {
  try {
    const capsules = req.db.prepare(`
      SELECT * FROM TimeCapsules WHERE userID = ? ORDER BY targetReleaseDate ASC
    `).all(req.user.userID);

    const pending = capsules.filter(c => !c.delivered);
    const delivered = capsules.filter(c => c.delivered);

    res.json({
      capsules,
      summary: { total: capsules.length, pending: pending.length, delivered: delivered.length },
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل كبسولات الزمن' });
  }
});

// ──────────────────────────────────────────
// POST /api/time-capsule/create - Create a new capsule
// ──────────────────────────────────────────
router.post('/create', authenticateToken, (req, res) => {
  try {
    const {
      title, contentType = 'text', textContent,
      targetReleaseDate, recipientContact, recipientName, occasion,
    } = req.body;

    if (!title || !targetReleaseDate || !recipientContact) {
      return res.status(400).json({ error: 'العنوان وتاريخ الإرسال وبيانات المستلم مطلوبة' });
    }

    const releaseDate = new Date(targetReleaseDate);
    if (releaseDate <= new Date()) {
      return res.status(400).json({ error: 'تاريخ الإرسال يجب أن يكون في المستقبل' });
    }

    const capsuleID = uuidv4();

    req.db.prepare(`
      INSERT INTO TimeCapsules (capsuleID, userID, title, contentType, textContent, targetReleaseDate, recipientContact, recipientName, occasion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      capsuleID,
      req.user.userID,
      title,
      contentType,
      textContent || null,
      releaseDate.toISOString(),
      recipientContact,
      recipientName || null,
      occasion || null
    );

    res.status(201).json({
      message: 'تم إنشاء كبسولة الزمن بنجاح',
      capsule: {
        capsuleID, title, contentType, targetReleaseDate: releaseDate.toISOString(),
        recipientContact, recipientName, occasion, delivered: false,
      },
    });
  } catch (err) {
    console.error('[CAPSULE] Create error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء كبسولة الزمن' });
  }
});

// ──────────────────────────────────────────
// PUT /api/time-capsule/:capsuleID - Update a capsule
// ──────────────────────────────────────────
router.put('/:capsuleID', authenticateToken, (req, res) => {
  try {
    const capsule = req.db.prepare(
      'SELECT * FROM TimeCapsules WHERE capsuleID = ? AND userID = ? AND delivered = 0'
    ).get(req.params.capsuleID, req.user.userID);

    if (!capsule) {
      return res.status(404).json({ error: 'الكبسولة غير موجودة أو تم تسليمها بالفعل' });
    }

    const { title, textContent, targetReleaseDate, recipientContact, recipientName, occasion } = req.body;

    req.db.prepare(`
      UPDATE TimeCapsules SET
        title = COALESCE(?, title),
        textContent = COALESCE(?, textContent),
        targetReleaseDate = COALESCE(?, targetReleaseDate),
        recipientContact = COALESCE(?, recipientContact),
        recipientName = COALESCE(?, recipientName),
        occasion = COALESCE(?, occasion)
      WHERE capsuleID = ?
    `).run(title, textContent, targetReleaseDate, recipientContact, recipientName, occasion, req.params.capsuleID);

    res.json({ message: 'تم تحديث كبسولة الزمن بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث كبسولة الزمن' });
  }
});

// ──────────────────────────────────────────
// DELETE /api/time-capsule/:capsuleID
// ──────────────────────────────────────────
router.delete('/:capsuleID', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare(
      'DELETE FROM TimeCapsules WHERE capsuleID = ? AND userID = ? AND delivered = 0'
    ).run(req.params.capsuleID, req.user.userID);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'الكبسولة غير موجودة أو تم تسليمها' });
    }
    res.json({ message: 'تم حذف كبسولة الزمن بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف كبسولة الزمن' });
  }
});

// ──────────────────────────────────────────
// GET /api/time-capsule/timeline - Get capsule timeline
// ──────────────────────────────────────────
router.get('/timeline', authenticateToken, (req, res) => {
  try {
    const capsules = req.db.prepare(`
      SELECT capsuleID, title, contentType, targetReleaseDate, recipientName, occasion, delivered
      FROM TimeCapsules WHERE userID = ?
      ORDER BY targetReleaseDate ASC
    `).all(req.user.userID);

    const timeline = capsules.map(c => {
      const release = new Date(c.targetReleaseDate);
      const now = new Date();
      const daysUntil = Math.ceil((release - now) / (1000 * 60 * 60 * 24));
      return { ...c, daysUntilRelease: daysUntil, isPast: daysUntil < 0 };
    });

    res.json({ timeline });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل الجدول الزمني' });
  }
});

module.exports = router;
