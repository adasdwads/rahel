const express = require('express');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ──────────────────────────────────────────
// GET /api/charity/flows - List user's charity flows
// ──────────────────────────────────────────
router.get('/flows', authenticateToken, (req, res) => {
  try {
    const flows = req.db.prepare(`
      SELECT * FROM CharityFlows WHERE userID = ? ORDER BY createdAt DESC
    `).all(req.user.userID);

    const walletBalance = flows.reduce((sum, f) => sum + (f.walletBalance || 0), 0);
    const totalDisbursed = flows.reduce((sum, f) => sum + (f.totalDisbursed || 0), 0);

    res.json({
      flows,
      summary: {
        totalFlows: flows.length,
        activeFlows: flows.filter(f => f.isActive).length,
        walletBalance,
        totalDisbursed,
        currency: 'AED',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل بيانات الصدقات' });
  }
});

// ──────────────────────────────────────────
// POST /api/charity/flows - Create a new charity flow
// ──────────────────────────────────────────
router.post('/flows', authenticateToken, (req, res) => {
  try {
    const { charityCode, recurringAmount, frequency = 'monthly', walletFundAmount = 0 } = req.body;

    if (!charityCode || !recurringAmount) {
      return res.status(400).json({ error: 'رمز الجهة الخيرية والمبلغ مطلوبان' });
    }

    // Resolve charity from config
    const charityEntry = Object.values(config.CHARITY_ENDPOINTS).find(c => c.code === charityCode);
    if (!charityEntry) {
      return res.status(400).json({ error: 'رمز الجهة الخيرية غير صالح' });
    }

    const flowID = uuidv4();
    const bankWalletToken = `wlt_${uuidv4().replace(/-/g, '').substring(0, 20)}`;

    req.db.prepare(`
      INSERT INTO CharityFlows (flowID, userID, charityName, charityCode, charityAPIEndpoint, recurringAmount, frequency, bankWalletToken, walletBalance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      flowID,
      req.user.userID,
      charityEntry.name,
      charityCode,
      charityEntry.endpoint,
      recurringAmount,
      frequency,
      bankWalletToken,
      walletFundAmount
    );

    // Record initial wallet deposit if funded
    if (walletFundAmount > 0) {
      req.db.prepare(`
        INSERT INTO WalletTransactions (txID, userID, flowID, amount, txType, status, paymentMethod, reference)
        VALUES (?, ?, ?, ?, 'deposit', 'completed', 'initial_fund', ?)
      `).run(uuidv4(), req.user.userID, flowID, walletFundAmount, `Initial wallet funding for ${charityEntry.name}`);
    }

    res.status(201).json({
      message: 'تم إنشاء تدفق الصدقة بنجاح',
      flow: {
        flowID,
        charityName: charityEntry.name,
        charityCode,
        recurringAmount,
        frequency,
        walletBalance: walletFundAmount,
        bankWalletToken,
        isActive: true,
      },
    });
  } catch (err) {
    console.error('[CHARITY] Create flow error:', err);
    res.status(500).json({ error: 'خطأ في إنشاء تدفق الصدقة' });
  }
});

// ──────────────────────────────────────────
// PUT /api/charity/flows/:flowID - Update a charity flow
// ──────────────────────────────────────────
router.put('/flows/:flowID', authenticateToken, (req, res) => {
  try {
    const flow = req.db.prepare(
      'SELECT * FROM CharityFlows WHERE flowID = ? AND userID = ?'
    ).get(req.params.flowID, req.user.userID);

    if (!flow) {
      return res.status(404).json({ error: 'تدفق الصدقة غير موجود' });
    }

    const { recurringAmount, frequency, isActive } = req.body;

    req.db.prepare(`
      UPDATE CharityFlows
      SET recurringAmount = COALESCE(?, recurringAmount),
          frequency = COALESCE(?, frequency),
          isActive = COALESCE(?, isActive)
      WHERE flowID = ?
    `).run(recurringAmount, frequency, isActive !== undefined ? (isActive ? 1 : 0) : null, req.params.flowID);

    res.json({ message: 'تم تحديث تدفق الصدقة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحديث تدفق الصدقة' });
  }
});

// ──────────────────────────────────────────
// DELETE /api/charity/flows/:flowID
// ──────────────────────────────────────────
router.delete('/flows/:flowID', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare(
      'DELETE FROM CharityFlows WHERE flowID = ? AND userID = ?'
    ).run(req.params.flowID, req.user.userID);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'تدفق الصدقة غير موجود' });
    }
    res.json({ message: 'تم حذف تدفق الصدقة بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف تدفق الصدقة' });
  }
});

// ──────────────────────────────────────────
// POST /api/charity/wallet/fund - Fund the charity wallet
// ──────────────────────────────────────────
router.post('/wallet/fund', authenticateToken, (req, res) => {
  try {
    const { flowID, amount, paymentMethod = 'card' } = req.body;

    if (!flowID || !amount || amount <= 0) {
      return res.status(400).json({ error: 'معرف التدفق والمبلغ مطلوبان' });
    }

    const flow = req.db.prepare(
      'SELECT * FROM CharityFlows WHERE flowID = ? AND userID = ?'
    ).get(flowID, req.user.userID);

    if (!flow) {
      return res.status(404).json({ error: 'تدفق الصدقة غير موجود' });
    }

    // Mock payment processing
    const txID = uuidv4();
    const mockPaymentRef = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    req.db.prepare(`
      UPDATE CharityFlows SET walletBalance = walletBalance + ? WHERE flowID = ?
    `).run(amount, flowID);

    req.db.prepare(`
      INSERT INTO WalletTransactions (txID, userID, flowID, amount, txType, status, paymentMethod, reference)
      VALUES (?, ?, ?, ?, 'deposit', 'completed', ?, ?)
    `).run(txID, req.user.userID, flowID, amount, paymentMethod, mockPaymentRef);

    const updatedFlow = req.db.prepare('SELECT walletBalance FROM CharityFlows WHERE flowID = ?').get(flowID);

    res.json({
      message: 'تم تمويل المحفظة بنجاح',
      transaction: {
        txID,
        amount,
        paymentMethod,
        reference: mockPaymentRef,
        newBalance: updatedFlow.walletBalance,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تمويل المحفظة' });
  }
});

// ──────────────────────────────────────────
// GET /api/charity/wallet/transactions - List wallet transactions
// ──────────────────────────────────────────
router.get('/wallet/transactions', authenticateToken, (req, res) => {
  try {
    const transactions = req.db.prepare(`
      SELECT wt.*, cf.charityName FROM WalletTransactions wt
      LEFT JOIN CharityFlows cf ON wt.flowID = cf.flowID
      WHERE wt.userID = ?
      ORDER BY wt.createdAt DESC
      LIMIT 50
    `).all(req.user.userID);

    res.json({ transactions, count: transactions.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل المعاملات' });
  }
});

// ──────────────────────────────────────────
// GET /api/charity/endpoints - Available charity endpoints
// ──────────────────────────────────────────
router.get('/endpoints', (req, res) => {
  const endpoints = Object.entries(config.CHARITY_ENDPOINTS).map(([key, val]) => ({
    key,
    ...val,
  }));
  res.json({ endpoints });
});

module.exports = router;
