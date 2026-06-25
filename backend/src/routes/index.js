const express = require('express');
const db = require('../config/database');
const UserModel = require('../models/userModel');
const SecureVaultModel = require('../models/secureVaultModel');
const InheritanceAccessModel = require('../models/inheritanceAccessModel');
const CharityFlowModel = require('../models/charityFlowModel');
const TimeCapsuleModel = require('../models/timeCapsuleModel');
const WalletModel = require('../models/walletModel');
const AuditLogModel = require('../models/auditLogModel');
const createCrudController = require('../controllers/createCrudController');
const createCrudRouter = require('./createCrudRouter');
const authRoutes = require('./authRoutes');
const authMiddleware = require('../middleware/authMiddleware');
const { apiRateLimiter } = require('../middleware/rateLimiter');
const { router: governmentWebhookRouter } = require('../automation/governmentWebhook');
const { router: heartbeatRouter } = require('../automation/heartbeatScheduler');

const router = express.Router();

const userModel = new UserModel(db);
const secureVaultModel = new SecureVaultModel(db);
const inheritanceAccessModel = new InheritanceAccessModel(db);
const charityFlowModel = new CharityFlowModel(db);
const timeCapsuleModel = new TimeCapsuleModel(db);
const walletModel = new WalletModel(db);
const auditLogModel = new AuditLogModel(db);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rahel-backend',
    timestamp: new Date().toISOString()
  });
});

router.use('/auth', authRoutes);
router.use(governmentWebhookRouter);
router.use(apiRateLimiter);
router.use(heartbeatRouter);
router.get('/users', authMiddleware, (req, res) => {
  return res.status(200).json([userModel.findById(req.user.userID)].filter(Boolean));
});
router.get('/users/:id', authMiddleware, (req, res) => {
  if (req.params.id !== req.user.userID) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const user = userModel.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: 'Record not found' });
  }

  return res.status(200).json(user);
});
router.put('/users/:id', authMiddleware, (req, res) => {
  if (req.params.id !== req.user.userID) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const existing = userModel.findRawById(req.params.id);
  if (!existing) {
    return res.status(404).json({ message: 'Record not found' });
  }

  const updated = userModel.update(req.params.id, {
    ...existing,
    ...req.body,
    passwordHash: existing.passwordHash,
    biometricHash: existing.biometricHash,
    refreshTokenHash: existing.refreshTokenHash
  });

  return res.status(200).json(updated);
});
router.use('/secure-vault', createCrudRouter(createCrudController(secureVaultModel, { ownerKey: 'userID' }), [authMiddleware]));
router.use('/inheritance-access', createCrudRouter(createCrudController(inheritanceAccessModel, { ownerKey: 'userID' }), [authMiddleware]));
router.use('/charity-flows', createCrudRouter(createCrudController(charityFlowModel, { ownerKey: 'userID' }), [authMiddleware]));
router.use('/time-capsules', createCrudRouter(createCrudController(timeCapsuleModel, { ownerKey: 'userID' }), [authMiddleware]));
router.post('/wallet/fund', authMiddleware, (req, res) => {
  const amount = Number(req.body.amount);
  const fundingSource = req.body.fundingSource;

  if (!Number.isFinite(amount) || amount <= 0 || !fundingSource) {
    return res.status(400).json({ message: 'Valid amount and fundingSource are required' });
  }

  const wallet = walletModel.fundWallet(req.user.userID, amount, fundingSource);
  return res.status(200).json(wallet);
});
router.get('/wallet/balance', authMiddleware, (req, res) => {
  const wallet = walletModel.findByUserId(req.user.userID);
  return res.status(200).json(wallet || { balance: 0, currency: 'AED' });
});
router.get('/audit-logs', authMiddleware, (req, res) => {
  const logs = auditLogModel.findAll().filter((log) => !log.userID || log.userID === req.user.userID);
  return res.status(200).json(logs);
});

module.exports = router;