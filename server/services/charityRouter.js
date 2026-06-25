const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// ═══════════════════════════════════════════════════════════════
// Automated Charity Routing Engine
// Executes mock payment gateway disbursements upon trigger
// ═══════════════════════════════════════════════════════════════

function executeCharityDisbursements(db, userID) {
  const results = [];
  const flows = db.prepare(
    'SELECT * FROM CharityFlows WHERE userID = ? AND isActive = 1'
  ).all(userID);

  if (flows.length === 0) {
    console.log(`[CHARITY_ROUTER] No active charity flows for user ${userID}`);
    return { executed: 0, results: [] };
  }

  console.log(`[CHARITY_ROUTER] Processing ${flows.length} charity flow(s) for user ${userID}`);

  for (const flow of flows) {
    try {
      const disbursementAmount = Math.min(flow.recurringAmount, flow.walletBalance);

      if (disbursementAmount <= 0) {
        results.push({
          flowID: flow.flowID,
          charityName: flow.charityName,
          status: 'skipped',
          reason: 'Insufficient wallet balance',
          walletBalance: flow.walletBalance,
        });
        continue;
      }

      // Mock API call to charity endpoint
      const mockResponse = simulateCharityPayment(flow, disbursementAmount);

      if (mockResponse.success) {
        // Deduct from wallet
        db.prepare('UPDATE CharityFlows SET walletBalance = walletBalance - ?, totalDisbursed = totalDisbursed + ?, executionCount = executionCount + 1, lastExecuted = datetime(\'now\') WHERE flowID = ?')
          .run(disbursementAmount, disbursementAmount, flow.flowID);

        // Record transaction
        db.prepare(`
          INSERT INTO WalletTransactions (txID, userID, flowID, amount, txType, status, paymentMethod, reference)
          VALUES (?, ?, ?, ?, 'charity_disbursement', 'completed', ?, ?)
        `).run(
          uuidv4(), userID, flow.flowID, disbursementAmount,
          flow.bankWalletToken ? 'wallet' : 'direct',
          mockResponse.transactionRef
        );

        results.push({
          flowID: flow.flowID,
          charityName: flow.charityName,
          charityEndpoint: flow.charityAPIEndpoint,
          status: 'completed',
          amount: disbursementAmount,
          currency: flow.currency,
          transactionRef: mockResponse.transactionRef,
          remainingBalance: flow.walletBalance - disbursementAmount,
        });

        console.log(`[CHARITY_ROUTER] Disbursed ${disbursementAmount} ${flow.currency} to ${flow.charityName}`);
      } else {
        results.push({
          flowID: flow.flowID,
          charityName: flow.charityName,
          status: 'failed',
          error: mockResponse.error,
        });
      }
    } catch (err) {
      console.error(`[CHARITY_ROUTER] Error processing flow ${flow.flowID}:`, err.message);
      results.push({
        flowID: flow.flowID,
        charityName: flow.charityName,
        status: 'error',
        error: err.message,
      });
    }
  }

  // Process recurring disbursements for wallet-funded flows
  const continuousFlows = flows.filter(f => f.walletBalance > f.recurringAmount && f.frequency !== 'once');
  if (continuousFlows.length > 0) {
    scheduleFuturePayments(db, userID, continuousFlows);
  }

  const summary = {
    userID,
    totalFlows: flows.length,
    executed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed' || r.status === 'error').length,
    skipped: results.filter(r => r.status === 'skipped').length,
    totalDisbursed: results.filter(r => r.status === 'completed').reduce((sum, r) => sum + r.amount, 0),
    results,
  };

  console.log(`[CHARITY_ROUTER] Disbursement summary:`, JSON.stringify(summary, null, 2));
  return summary;
}

function simulateCharityPayment(flow, amount) {
  // Mock payment gateway simulation
  // In production: integrate with Stripe/Apple Pay/local payment gateways
  const isSuccess = Math.random() > 0.05; // 95% success rate mock

  if (isSuccess) {
    return {
      success: true,
      transactionRef: `ch_${Date.now()}_${flow.charityCode}_${Math.random().toString(36).substring(2, 8)}`,
      gateway: flow.bankWalletToken ? 'RAHEL_WALLET' : 'STRIPE_MOCK',
      processedAt: new Date().toISOString(),
      charityReceipt: {
        charityName: flow.charityName,
        amount,
        currency: flow.currency,
        receiptNumber: `RCP-${Date.now()}`,
      },
    };
  }

  return {
    success: false,
    error: 'Payment gateway temporarily unavailable',
    retryAfter: 3600,
  };
}

function scheduleFuturePayments(db, userID, flows) {
  for (const flow of flows) {
    console.log(`[CHARITY_ROUTER] Scheduling future ${flow.frequency} payment for flow ${flow.flowID}`);
    // In production: use a proper job queue (Bull, Agenda, etc.)
    // For now, the cron job in index.js handles recurring execution
  }
}

module.exports = { executeCharityDisbursements };
