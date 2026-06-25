const BaseModel = require('./baseModel');
const { createId, now } = require('../utils/helpers');

class InheritanceAccessModel extends BaseModel {
  constructor(db) {
    super(db, 'InheritanceAccess', 'recipientID');
  }

  findAll() {
    return this.db.prepare('SELECT * FROM InheritanceAccess ORDER BY timestamp DESC').all();
  }

  create(payload) {
    const record = {
      recipientID: payload.recipientID || createId(),
      userID: payload.userID,
      recipientName: payload.recipientName,
      phone: payload.phone,
      email: payload.email,
      accessTier: payload.accessTier,
      relationshipType: payload.relationshipType,
      isVerified: payload.isVerified ? 1 : 0,
      timestamp: payload.timestamp || now()
    };

    this.db.prepare(`
      INSERT INTO InheritanceAccess (recipientID, userID, recipientName, phone, email, accessTier, relationshipType, isVerified, timestamp)
      VALUES (@recipientID, @userID, @recipientName, @phone, @email, @accessTier, @relationshipType, @isVerified, @timestamp)
    `).run(record);

    return this.findById(record.recipientID);
  }

  update(id, payload) {
    const existing = this.findById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...payload,
      recipientID: id,
      isVerified: payload.isVerified === undefined ? existing.isVerified : (payload.isVerified ? 1 : 0)
    };

    this.db.prepare(`
      UPDATE InheritanceAccess
      SET userID = @userID,
          recipientName = @recipientName,
          phone = @phone,
          email = @email,
          accessTier = @accessTier,
          relationshipType = @relationshipType,
          isVerified = @isVerified,
          timestamp = @timestamp
      WHERE recipientID = @recipientID
    `).run(updated);

    return this.findById(id);
  }
}

module.exports = InheritanceAccessModel;