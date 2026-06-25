const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { optionalAuth } = require('../middleware/auth');
const { executeTrigger } = require('../services/triggerEngine');

const router = express.Router();

// ──────────────────────────────────────────
// POST /api/webhook/civil-registry - Government Death Certificate Webhook
// processCivilRegistryNotification(deathCertificateID)
// ──────────────────────────────────────────
router.post('/civil-registry', optionalAuth, (req, res) => {
  try {
    const {
      deathCertificateID,
      deceasedNationalID,
      deceasedName,
      dateOfDeath,
      issuingAuthority = 'UAE Civil Registry',
      verificationHash,
    } = req.body;

    if (!deathCertificateID || !deceasedNationalID) {
      return res.status(400).json({
        error: 'معرف شهادة الوفاة والرقم الوطني مطلوبان',
        code: 'MISSING_FIELDS',
      });
    }

    console.log(`[WEBHOOK] Civil Registry notification received: Certificate ${deathCertificateID}`);
    console.log(`[WEBHOOK] Deceased National ID: ${deceasedNationalID}`);

    // Find user by UAE PASS ID (national ID)
    const user = req.db.prepare(
      'SELECT * FROM Users WHERE uaePassID = ? AND status = ?'
    ).get(deceasedNationalID, 'Active');

    if (!user) {
      console.log(`[WEBHOOK] No active RAHEL user found for National ID: ${deceasedNationalID}`);
      return res.status(404).json({
        error: 'لم يتم العثور على مستخدم نشط بهذا الرقم الوطني',
        code: 'USER_NOT_FOUND',
      });
    }

    // ══════════════════════════════════════
    // FLIP ACCOUNT STATUS TO "Triggered"
    // ══════════════════════════════════════
    req.db.prepare(`
      UPDATE Users SET status = 'Triggered', triggerDate = datetime('now') WHERE userID = ?
    `).run(user.userID);

    // Log the trigger event
    req.db.prepare(`
      INSERT INTO TriggerAuditLog (logID, userID, triggerSource, eventType, eventData)
      VALUES (?, ?, 'government_webhook', 'death_certificate_received', ?)
    `).run(
      uuidv4(),
      user.userID,
      JSON.stringify({
        deathCertificateID,
        deceasedNationalID,
        deceasedName,
        dateOfDeath,
        issuingAuthority,
        verificationHash,
        receivedAt: new Date().toISOString(),
      })
    );

    // Execute the full trigger sequence
    const triggerResult = executeTrigger(req.db, user.userID, 'government_webhook');

    console.log(`[WEBHOOK] Account ${user.userID} status flipped to TRIGGERED`);
    console.log(`[WEBHOOK] Trigger sequence executed:`, triggerResult);

    res.json({
      message: 'تم استلام إشعار السجل المدني ومعالجته بنجاح',
      status: 'TRIGGERED',
      userID: user.userID,
      deathCertificateID,
      triggerResult,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[WEBHOOK] Civil registry error:', err);

    // Log failure
    try {
      req.db.prepare(`
        INSERT INTO TriggerAuditLog (logID, userID, triggerSource, eventType, eventData, success, errorMessage)
        VALUES (?, ?, 'government_webhook', 'webhook_processing_failed', ?, 0, ?)
      `).run(uuidv4(), 'SYSTEM', JSON.stringify(req.body), err.message);
    } catch {}

    res.status(500).json({ error: 'خطأ في معالجة إشعار السجل المدني', code: 'WEBHOOK_ERROR' });
  }
});

// ──────────────────────────────────────────
// POST /api/webhook/verify-death - Manual verification endpoint
// ──────────────────────────────────────────
router.post('/verify-death', optionalAuth, (req, res) => {
  try {
    const { userID, verifierName, verifierRelation, verificationDocument } = req.body;

    if (!userID || !verifierName) {
      return res.status(400).json({ error: 'معرف المستخدم واسم المحقق مطلوبان' });
    }

    const user = req.db.prepare('SELECT * FROM Users WHERE userID = ?').get(userID);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    if (user.status === 'Triggered') {
      return res.json({ message: 'الحساب مُفعّل بالفعل', status: user.status });
    }

    // Change status to Verified (pending final trigger)
    req.db.prepare(`
      UPDATE Users SET status = 'Verified', triggerDate = datetime('now') WHERE userID = ?
    `).run(userID);

    req.db.prepare(`
      INSERT INTO TriggerAuditLog (logID, userID, triggerSource, eventType, eventData)
      VALUES (?, ?, 'manual_verification', 'death_verified_manually', ?)
    `).run(
      uuidv4(),
      userID,
      JSON.stringify({ verifierName, verifierRelation, verificationDocument, verifiedAt: new Date().toISOString() })
    );

    res.json({
      message: 'تم التحقق يدوياً - الحساب في حالة التحقق',
      status: 'Verified',
      note: 'سيتم تفعيل البروتوكولات بعد التأكيد النهائي',
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في عملية التحقق' });
  }
});

// ──────────────────────────────────────────
// GET /api/webhook/audit/:userID - Get trigger audit log
// ──────────────────────────────────────────
router.get('/audit/:userID', optionalAuth, (req, res) => {
  try {
    const logs = req.db.prepare(`
      SELECT * FROM TriggerAuditLog WHERE userID = ? ORDER BY executedAt DESC
    `).all(req.params.userID);

    res.json({ auditLog: logs, count: logs.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل سجل المراجعة' });
  }
});

module.exports = router;
