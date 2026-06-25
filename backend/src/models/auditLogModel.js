const BaseModel = require('./baseModel');
const { createId, now } = require('../utils/helpers');

class AuditLogModel extends BaseModel {
  constructor(db) {
    super(db, 'AuditLogs', 'logID');
  }

  findAll() {
    return this.db.prepare('SELECT * FROM AuditLogs ORDER BY timestamp DESC').all();
  }

  create(payload) {
    const record = {
      logID: payload.logID || createId(),
      userID: payload.userID || null,
      action: payload.action,
      details: typeof payload.details === 'string' ? payload.details : JSON.stringify(payload.details || {}),
      ipAddress: payload.ipAddress || null,
      timestamp: payload.timestamp || now()
    };

    this.db.prepare(`
      INSERT INTO AuditLogs (logID, userID, action, details, ipAddress, timestamp)
      VALUES (@logID, @userID, @action, @details, @ipAddress, @timestamp)
    `).run(record);

    return this.findById(record.logID);
  }
}

module.exports = AuditLogModel;