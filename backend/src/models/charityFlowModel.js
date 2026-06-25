const BaseModel = require('./baseModel');
const { createId, now } = require('../utils/helpers');

class CharityFlowModel extends BaseModel {
  constructor(db) {
    super(db, 'CharityFlows', 'flowID');
  }

  findAll() {
    return this.db.prepare('SELECT * FROM CharityFlows ORDER BY timestamp DESC').all();
  }

  create(payload) {
    const record = {
      flowID: payload.flowID || createId(),
      userID: payload.userID,
      charityName: payload.charityName,
      recurringAmount: payload.recurringAmount,
      currency: payload.currency || 'AED',
      bankWalletToken: payload.bankWalletToken,
      charityAPI_Endpoint: payload.charityAPI_Endpoint,
      projectType: payload.projectType,
      isActive: payload.isActive === undefined ? 1 : (payload.isActive ? 1 : 0),
      timestamp: payload.timestamp || now()
    };

    this.db.prepare(`
      INSERT INTO CharityFlows (flowID, userID, charityName, recurringAmount, currency, bankWalletToken, charityAPI_Endpoint, projectType, isActive, timestamp)
      VALUES (@flowID, @userID, @charityName, @recurringAmount, @currency, @bankWalletToken, @charityAPI_Endpoint, @projectType, @isActive, @timestamp)
    `).run(record);

    return this.findById(record.flowID);
  }

  update(id, payload) {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...payload,
      flowID: id,
      isActive: payload.isActive === undefined ? existing.isActive : (payload.isActive ? 1 : 0)
    };

    this.db.prepare(`
      UPDATE CharityFlows
      SET userID = @userID,
          charityName = @charityName,
          recurringAmount = @recurringAmount,
          currency = @currency,
          bankWalletToken = @bankWalletToken,
          charityAPI_Endpoint = @charityAPI_Endpoint,
          projectType = @projectType,
          isActive = @isActive,
          timestamp = @timestamp
      WHERE flowID = @flowID
    `).run(updated);

    return this.findById(id);
  }
}

module.exports = CharityFlowModel;