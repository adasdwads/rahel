const BaseModel = require('./baseModel');
const { createId, now } = require('../utils/helpers');

class WalletModel extends BaseModel {
  constructor(db) {
    super(db, 'Wallets', 'walletID');
  }

  findAll() {
    return this.db.prepare('SELECT * FROM Wallets ORDER BY updatedAt DESC').all();
  }

  findByUserId(userID) {
    return this.db.prepare('SELECT * FROM Wallets WHERE userID = ?').get(userID);
  }

  create(payload) {
    const record = {
      walletID: payload.walletID || createId(),
      userID: payload.userID,
      balance: payload.balance || 0,
      currency: payload.currency || 'AED',
      fundingSource: payload.fundingSource,
      isLocked: payload.isLocked ? 1 : 0,
      createdAt: payload.createdAt || now(),
      updatedAt: payload.updatedAt || now()
    };

    this.db.prepare(`
      INSERT INTO Wallets (walletID, userID, balance, currency, fundingSource, isLocked, createdAt, updatedAt)
      VALUES (@walletID, @userID, @balance, @currency, @fundingSource, @isLocked, @createdAt, @updatedAt)
    `).run(record);

    return this.findById(record.walletID);
  }

  update(id, payload) {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...payload,
      walletID: id,
      isLocked: payload.isLocked === undefined ? existing.isLocked : (payload.isLocked ? 1 : 0),
      updatedAt: now()
    };

    this.db.prepare(`
      UPDATE Wallets
      SET userID = @userID,
          balance = @balance,
          currency = @currency,
          fundingSource = @fundingSource,
          isLocked = @isLocked,
          updatedAt = @updatedAt
      WHERE walletID = @walletID
    `).run(updated);

    return this.findById(id);
  }

  fundWallet(userID, amount, fundingSource) {
    const existing = this.findByUserId(userID);
    if (!existing) {
      return this.create({
        userID,
        balance: amount,
        fundingSource,
        currency: 'AED',
        isLocked: false
      });
    }

    const updatedBalance = Number(existing.balance) + Number(amount);
    return this.update(existing.walletID, {
      ...existing,
      balance: updatedBalance,
      fundingSource
    });
  }
}

module.exports = WalletModel;