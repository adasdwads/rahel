const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');
const config = require('./config');
const { initDatabase } = require('./db/database');

const app = express();

// ═══════════════════════════════════════════════════════════════
// RAHEL Server - Digital Legacy & Automated Inheritance Engine
// ═══════════════════════════════════════════════════════════════

// Ensure data directories
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(dataDir, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Initialize database
const db = initDatabase(config.DB_PATH);

// Middleware
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Inject DB into every request
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Request logging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Load Routes
const authRoutes = require('./routes/auth');
const vaultRoutes = require('./routes/vault');
const charityRoutes = require('./routes/charity');
const timeCapsuleRoutes = require('./routes/timeCapsule');
const socialLegacyRoutes = require('./routes/socialLegacy');
const webhookRoutes = require('./routes/webhook');

app.use('/api/auth', authRoutes);
app.use('/api/vault', vaultRoutes);
app.use('/api/charity', charityRoutes);
app.use('/api/time-capsule', timeCapsuleRoutes);
app.use('/api/social-legacy', socialLegacyRoutes);
app.use('/api/webhook', webhookRoutes);

// Health endpoint
app.get('/api/health', (req, res) => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM Users').get().count;
  res.json({
    status: 'operational',
    service: 'RAHEL API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: { registeredUsers: userCount },
  });
});

// Dashboard stats endpoint
app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      users: db.prepare('SELECT COUNT(*) as c FROM Users').get().c,
      vaultFiles: db.prepare('SELECT COUNT(*) as c FROM SecureVault').get().c,
      charityFlows: db.prepare('SELECT COUNT(*) as c FROM CharityFlows WHERE isActive = 1').get().c,
      timeCapsules: db.prepare('SELECT COUNT(*) as c FROM TimeCapsules WHERE delivered = 0').get().c,
      socialConfigs: db.prepare('SELECT COUNT(*) as c FROM SocialLegacy WHERE isConfigured = 1').get().c,
    };
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Dead Man's Switch - Heartbeat monitor (runs daily at midnight)
const { runHeartbeatCheck } = require('./services/heartbeat');

cron.schedule('0 0 * * *', () => {
  console.log('[CRON] Running daily heartbeat check...');
  try {
    runHeartbeatCheck(db);
  } catch (err) {
    console.error('[CRON] Heartbeat check failed:', err.message);
  }
});

// Time Capsule delivery check (runs every hour)
cron.schedule('0 * * * *', () => {
  try {
    const now = new Date().toISOString();
    const dueCapsules = db.prepare(
      'SELECT * FROM TimeCapsules WHERE delivered = 0 AND targetReleaseDate <= ?'
    ).all(now);

    dueCapsules.forEach(capsule => {
      console.log(`[CAPSULE] Delivering capsule ${capsule.capsuleID} to ${capsule.recipientContact}`);
      db.prepare('UPDATE TimeCapsules SET delivered = 1, deliveredAt = ? WHERE capsuleID = ?')
        .run(now, capsule.capsuleID);
    });

    if (dueCapsules.length > 0) {
      console.log(`[CAPSULE] Delivered ${dueCapsules.length} time capsule(s)`);
    }
  } catch (err) {
    console.error('[CAPSULE] Delivery check failed:', err.message);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({
    error: 'خطأ داخلي في الخادم',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'المسار غير موجود', code: 'NOT_FOUND' });
});

// Start server
app.listen(config.PORT, () => {
  console.log('═══════════════════════════════════════════════════');
  console.log('  راحل | RAHEL - Digital Legacy Engine');
  console.log(`  Server:    http://localhost:${config.PORT}`);
  console.log('  Database:  Initialized');
  console.log('  Heartbeat: Monitor active');
  console.log('  Capsules:  Delivery scheduler active');
  console.log('═══════════════════════════════════════════════════');
});

module.exports = app;
