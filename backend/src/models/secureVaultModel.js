const BaseModel = require('./baseModel');
const { createId, now, decodeBase64ToBuffer, encodeBufferFields } = require('../utils/helpers');
const { encrypt } = require('../crypto/encryptionEngine');
const { splitKey } = require('../crypto/keySharding');
const { assignShardsToHeirs } = require('../crypto/shardDistribution');
const crypto = require('crypto');

class SecureVaultModel extends BaseModel {
  constructor(db) {
    super(db, 'SecureVault', 'fileID');
  }

  findAll() {
    return this.db
      .prepare('SELECT * FROM SecureVault ORDER BY timestamp DESC')
      .all()
      .map((item) => encodeBufferFields(item, ['encryptedDataBLOB']));
  }

  findById(id) {
    return encodeBufferFields(super.findById(id), ['encryptedDataBLOB']);
  }

  create(payload) {
    const heirRecipientIDs = Array.isArray(payload.heirRecipientIDs) ? payload.heirRecipientIDs : [];
    const threshold = Number(payload.threshold) > 0 ? Number(payload.threshold) : Math.min(2, heirRecipientIDs.length || 1);
    const plainBuffer = decodeBase64ToBuffer(payload.encryptedDataBLOB);
    const masterKey = crypto.randomBytes(32);
    const encryptedPayload = encrypt(plainBuffer, masterKey);

    const record = {
      fileID: payload.fileID || createId(),
      userID: payload.userID,
      encryptedDataBLOB: Buffer.from(JSON.stringify(encryptedPayload), 'utf8'),
      fileName: payload.fileName,
      fileType: payload.fileType,
      fileSize: payload.fileSize,
      keyShardLocation: 'KeyShards',
      encryptionMethod: payload.encryptionMethod || 'AES-256-GCM',
      timestamp: payload.timestamp || now()
    };

    this.db.prepare(`
      INSERT INTO SecureVault (fileID, userID, encryptedDataBLOB, fileName, fileType, fileSize, keyShardLocation, encryptionMethod, timestamp)
      VALUES (@fileID, @userID, @encryptedDataBLOB, @fileName, @fileType, @fileSize, @keyShardLocation, @encryptionMethod, @timestamp)
    `).run(record);

    if (heirRecipientIDs.length > 0) {
      const shards = splitKey(masterKey, heirRecipientIDs.length, Math.min(threshold, heirRecipientIDs.length));
      assignShardsToHeirs(this.db, record.fileID, shards, heirRecipientIDs);
    }

    return this.findById(record.fileID);
  }

  update(id, payload) {
    const existing = super.findById(id);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...payload,
      fileID: id,
      encryptedDataBLOB: payload.encryptedDataBLOB ? decodeBase64ToBuffer(payload.encryptedDataBLOB) : existing.encryptedDataBLOB
    };

    this.db.prepare(`
      UPDATE SecureVault
      SET userID = @userID,
          encryptedDataBLOB = @encryptedDataBLOB,
          fileName = @fileName,
          fileType = @fileType,
          fileSize = @fileSize,
          keyShardLocation = @keyShardLocation,
          encryptionMethod = @encryptionMethod,
          timestamp = @timestamp
      WHERE fileID = @fileID
    `).run(updated);

    return this.findById(id);
  }
}

module.exports = SecureVaultModel;