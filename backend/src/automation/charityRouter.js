const db = require('../config/database');
const CharityFlowModel = require('../models/charityFlowModel');
const WalletModel = require('../models/walletModel');
const AuditLogModel = require('../models/auditLogModel');

const charityFlowModel = new CharityFlowModel(db);
const walletModel = new WalletModel(db);
const auditLogModel = new AuditLogModel(db);

const executeCharityPayments = (userID) => {
  const flows = charityFlowModel.findAll().filter((flow) => flow.userID === userID && Number(flow.isActive) === 1);
  const wallet = walletModel.findByUserId(userID);

  if (!wallet || Number(wallet.isLocked) === 1) {
    return [];
  }

  const results = [];

  flows.forEach((flow, index) => {
    const provider = index % 2 === 0 ? 'MockStripe' : 'MockApplePay';
    const paymentResult = {
      flowID: flow.flowID,
      charityName: flow.charityName,
      amount: Number(flow.recurringAmount),
      currency: flow.currency,
      provider,
      status: Number(wallet.balance) >= Number(flow.recurringAmount) ? 'Processed' : 'SkippedInsufficientFunds'
    };

    if (paymentResult.status === 'Processed') {
      walletModel.update(wallet.walletID, {
        ...wallet,
        balance: Number(wallet.balance) - Number(flow.recurringAmount)
      });
    }

    auditLogModel.create({
      userID,
      action: 'CHARITY_PAYMENT_EXECUTED',
      details: paymentResult
    });

    results.push(paymentResult);
  });

  return results;
};

module.exports = {
  executeCharityPayments
};