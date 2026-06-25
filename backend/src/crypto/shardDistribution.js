const { createId, now } = require('../utils/helpers');

const assignShardsToHeirs = (db, fileID, shards, heirRecipientIDs) => {
  if (!Array.isArray(shards) || !Array.isArray(heirRecipientIDs) || shards.length !== heirRecipientIDs.length) {
    throw new Error('Shard and heir counts must match');
  }

  const insertShard = db.prepare(`
    INSERT INTO KeyShards (shardID, fileID, recipientID, shardData, shardIndex, totalShards, threshold, createdAt)
    VALUES (@shardID, @fileID, @recipientID, @shardData, @shardIndex, @totalShards, @threshold, @createdAt)
  `);

  const transaction = db.transaction(() => {
    shards.forEach((shard, index) => {
      insertShard.run({
        shardID: createId(),
        fileID,
        recipientID: heirRecipientIDs[index],
        shardData: Buffer.from(shard.shardData, 'base64'),
        shardIndex: shard.shardIndex,
        totalShards: shard.totalShards,
        threshold: shard.threshold,
        createdAt: now()
      });
    });
  });

  transaction();

  return {
    fileID,
    assignedRecipients: heirRecipientIDs,
    shardCount: shards.length
  };
};

module.exports = {
  assignShardsToHeirs
};