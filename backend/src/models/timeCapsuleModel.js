const BaseModel = require('./baseModel');
const { createId, now, decodeBase64ToBuffer, encodeBufferFields } = require('../utils/helpers');

class TimeCapsuleModel extends BaseModel {
  constructor(db) {
    super(db, 'TimeCapsules', 'capsuleID');
  }

  findAll() {
    return this.db
      .prepare('SELECT * FROM TimeCapsules ORDER BY timestamp DESC')
      .all()
      .map((item) => encodeBufferFields(item, ['contentBLOB']));
  }

  findById(id) {
    return encodeBufferFields(super.findById(id), ['contentBLOB']);
  }

  create(payload) {
    const record = {
      capsuleID: payload.capsuleID || createId(),
      userID: payload.userID,
      title: payload.title,
      contentBLOB: decodeBase64ToBuffer(payload.contentBLOB),
      contentType: payload.contentType,
      targetReleaseDate: payload.targetReleaseDate,
      recipientContact: payload.recipientContact,
      recipientName: payload.recipientName,
      deliveryMethod: payload.deliveryMethod,
      isDelivered: payload.isDelivered ? 1 : 0,
      timestamp: payload.timestamp || now()
    };

    this.db.prepare(`
      INSERT INTO TimeCapsules (capsuleID, userID, title, contentBLOB, contentType, targetReleaseDate, recipientContact, recipientName, deliveryMethod, isDelivered, timestamp)
      VALUES (@capsuleID, @userID, @title, @contentBLOB, @contentType, @targetReleaseDate, @recipientContact, @recipientName, @deliveryMethod, @isDelivered, @timestamp)
    `).run(record);

    return this.findById(record.capsuleID);
  }

  update(id, payload) {
    const existing = super.findById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...payload,
      capsuleID: id,
      contentBLOB: payload.contentBLOB ? decodeBase64ToBuffer(payload.contentBLOB) : existing.contentBLOB,
      isDelivered: payload.isDelivered === undefined ? existing.isDelivered : (payload.isDelivered ? 1 : 0)
    };

    this.db.prepare(`
      UPDATE TimeCapsules
      SET userID = @userID,
          title = @title,
          contentBLOB = @contentBLOB,
          contentType = @contentType,
          targetReleaseDate = @targetReleaseDate,
          recipientContact = @recipientContact,
          recipientName = @recipientName,
          deliveryMethod = @deliveryMethod,
          isDelivered = @isDelivered,
          timestamp = @timestamp
      WHERE capsuleID = @capsuleID
    `).run(updated);

    return this.findById(id);
  }
}

module.exports = TimeCapsuleModel;