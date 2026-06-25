const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { authenticateToken, generateToken } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────
// POST /api/auth/register
// ──────────────────────────────────────────
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'الاسم والبريد وكلمة المرور مطلوبة', code: 'MISSING_FIELDS' });
    }

    const existing = req.db.prepare('SELECT userID FROM Users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً', code: 'EMAIL_EXISTS' });
    }

    const userID = uuidv4();
    const passwordHash = bcrypt.hashSync(password, config.BCRYPT_ROUNDS);

    req.db.prepare(`
      INSERT INTO Users (userID, name, email, passwordHash, phone, lastHeartbeat)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(userID, name, email, passwordHash, phone || null);

    const token = generateToken({ userID, name, email });

    res.status(201).json({
      message: 'تم إنشاء الحساب بنجاح',
      token,
      user: { userID, name, email, status: 'Active' },
    });
  } catch (err) {
    console.error('[AUTH] Register error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء الحساب', code: 'REGISTER_FAILED' });
  }
});

// ──────────────────────────────────────────
// POST /api/auth/login
// ──────────────────────────────────────────
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان', code: 'MISSING_FIELDS' });
    }

    const user = req.db.prepare('SELECT * FROM Users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة', code: 'INVALID_CREDENTIALS' });
    }

    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة', code: 'INVALID_CREDENTIALS' });
    }

    // Update heartbeat on login
    req.db.prepare('UPDATE Users SET lastHeartbeat = datetime(\'now\'), missedPings = 0 WHERE userID = ?')
      .run(user.userID);

    const token = generateToken(user);

    res.json({
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        userID: user.userID,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status,
        lastHeartbeat: user.lastHeartbeat,
      },
    });
  } catch (err) {
    console.error('[AUTH] Login error:', err);
    res.status(500).json({ error: 'خطأ في تسجيل الدخول', code: 'LOGIN_FAILED' });
  }
});

// ──────────────────────────────────────────
// POST /api/auth/biometric - Mock Biometric Auth
// ──────────────────────────────────────────
router.post('/biometric', (req, res) => {
  try {
    const { biometricToken, userID } = req.body;

    if (!biometricToken || !userID) {
      return res.status(400).json({ error: 'بيانات المصادقة البيومترية مطلوبة', code: 'MISSING_BIOMETRIC' });
    }

    const user = req.db.prepare('SELECT * FROM Users WHERE userID = ?').get(userID);
    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود', code: 'USER_NOT_FOUND' });
    }

    // Mock biometric verification (in production: verify with device attestation)
    const isValid = biometricToken.startsWith('bio_') && biometricToken.length > 10;
    if (!isValid) {
      return res.status(401).json({ error: 'فشل التحقق البيومتري', code: 'BIOMETRIC_FAILED' });
    }

    // Store biometric hash if first time
    if (!user.biometricHash) {
      const biometricHash = bcrypt.hashSync(biometricToken, 8);
      req.db.prepare('UPDATE Users SET biometricHash = ? WHERE userID = ?')
        .run(biometricHash, userID);
    }

    req.db.prepare('UPDATE Users SET lastHeartbeat = datetime(\'now\'), missedPings = 0 WHERE userID = ?')
      .run(userID);

    const token = generateToken(user);
    res.json({
      message: 'تم التحقق البيومتري بنجاح',
      token,
      user: { userID: user.userID, name: user.name, email: user.email, status: user.status },
    });
  } catch (err) {
    console.error('[AUTH] Biometric error:', err);
    res.status(500).json({ error: 'خطأ في المصادقة البيومترية', code: 'BIOMETRIC_ERROR' });
  }
});

// ──────────────────────────────────────────
// GET /api/auth/uaepass/initiate - UAE PASS OAuth2 Flow
// ──────────────────────────────────────────
router.get('/uaepass/initiate', (req, res) => {
  const state = uuidv4();
  const authUrl = `${config.UAE_PASS.AUTH_URL}?` +
    `response_type=code&` +
    `client_id=${config.UAE_PASS.CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(config.UAE_PASS.REDIRECT_URI)}&` +
    `scope=${encodeURIComponent(config.UAE_PASS.SCOPE)}&` +
    `state=${state}&` +
    `acr_values=urn:safelayer:tws:policies:authentication:level:low`;

  res.json({
    authUrl,
    state,
    message: 'يرجى التوجه إلى رابط UAE PASS للمصادقة',
    mock: true,
    mockNote: 'In production, redirect user to authUrl for UAE PASS authentication',
  });
});

// ──────────────────────────────────────────
// GET /api/auth/uaepass/callback - UAE PASS OAuth2 Callback
// ──────────────────────────────────────────
router.get('/uaepass/callback', (req, res) => {
  try {
    const { code, state } = req.query;

    // Mock UAE PASS token exchange
    const mockUaePassProfile = {
      idn: 'AE-' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      fullnameAR: 'مستخدم راحل',
      fullnameEN: 'Rahel User',
      email: `uaepass_${Date.now()}@rahel.ae`,
      mobile: '+971501234567',
    };

    // Check if user exists by UAE PASS ID
    let user = req.db.prepare('SELECT * FROM Users WHERE uaePassID = ?').get(mockUaePassProfile.idn);

    if (!user) {
      const userID = uuidv4();
      const tempPassword = bcrypt.hashSync(uuidv4(), config.BCRYPT_ROUNDS);

      req.db.prepare(`
        INSERT INTO Users (userID, name, email, passwordHash, uaePassID, phone, lastHeartbeat)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        userID,
        mockUaePassProfile.fullnameAR,
        mockUaePassProfile.email,
        tempPassword,
        mockUaePassProfile.idn,
        mockUaePassProfile.mobile
      );

      user = req.db.prepare('SELECT * FROM Users WHERE userID = ?').get(userID);
    }

    const token = generateToken(user);
    res.json({
      message: 'تم تسجيل الدخول عبر UAE PASS بنجاح',
      token,
      user: {
        userID: user.userID,
        name: user.name,
        email: user.email,
        status: user.status,
        uaePassVerified: true,
      },
    });
  } catch (err) {
    console.error('[AUTH] UAE PASS callback error:', err);
    res.status(500).json({ error: 'خطأ في مصادقة UAE PASS', code: 'UAEPASS_ERROR' });
  }
});

// ──────────────────────────────────────────
// GET /api/auth/me - Get current user profile
// ──────────────────────────────────────────
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = req.db.prepare(
      'SELECT userID, name, email, phone, status, lastHeartbeat, missedPings, uaePassID, createdAt FROM Users WHERE userID = ?'
    ).get(req.user.userID);

    if (!user) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }

    // Get summary stats
    const vaultCount = req.db.prepare('SELECT COUNT(*) as c FROM SecureVault WHERE userID = ?').get(req.user.userID).c;
    const heirCount = req.db.prepare('SELECT COUNT(*) as c FROM InheritanceAccess WHERE userID = ?').get(req.user.userID).c;
    const charityCount = req.db.prepare('SELECT COUNT(*) as c FROM CharityFlows WHERE userID = ? AND isActive = 1').get(req.user.userID).c;
    const capsuleCount = req.db.prepare('SELECT COUNT(*) as c FROM TimeCapsules WHERE userID = ? AND delivered = 0').get(req.user.userID).c;

    res.json({
      ...user,
      stats: { vaultFiles: vaultCount, heirs: heirCount, charityFlows: charityCount, pendingCapsules: capsuleCount },
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل بيانات المستخدم' });
  }
});

// ──────────────────────────────────────────
// POST /api/auth/heartbeat - Acknowledge heartbeat ping
// ──────────────────────────────────────────
router.post('/heartbeat', authenticateToken, (req, res) => {
  try {
    req.db.prepare(`
      UPDATE Users SET lastHeartbeat = datetime('now'), missedPings = 0, heartbeatStreak = heartbeatStreak + 1
      WHERE userID = ?
    `).run(req.user.userID);

    const user = req.db.prepare('SELECT lastHeartbeat, heartbeatStreak FROM Users WHERE userID = ?')
      .get(req.user.userID);

    res.json({
      message: 'تم تأكيد النبض بنجاح',
      lastHeartbeat: user.lastHeartbeat,
      streak: user.heartbeatStreak,
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تسجيل النبض' });
  }
});

module.exports = router;
