const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const { authenticateToken } = require('../middleware/auth');
const { encryptAndShard, reconstructAndDecrypt, generateShardHash } = require('../crypto/keySharding');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
      'video/mp4', 'audio/mpeg', 'audio/mp4',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/json', 'application/zip',
    ];
    if (allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('نوع الملف غير مدعوم'), false);
    }
  },
});

// ──────────────────────────────────────────
// POST /api/vault/upload - Upload & encrypt a file
// ──────────────────────────────────────────
router.post('/upload', authenticateToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'لم يتم تحديد ملف', code: 'NO_FILE' });
    }

    const { accessTier = 'Personal', description = '' } = req.body;
    const fileID = uuidv4();

    // Encrypt file data and generate key shards
    const {
      encryptedData, iv, authTag, keyHash, shards,
    } = encryptAndShard(req.file.buffer);

    // Save encrypted file to disk
    const encryptedFilePath = path.join(config.UPLOAD_PATH, `${fileID}.enc`);
    fs.writeFileSync(encryptedFilePath, encryptedData);

    // Store vault record
    req.db.prepare(`
      INSERT INTO SecureVault (fileID, userID, fileName, fileType, encryptedDataPath, fileSizeBytes, iv, authTag, keyShardLocations, accessTier, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fileID,
      req.user.userID,
      req.file.originalname,
      req.file.mimetype,
      encryptedFilePath,
      req.file.size,
      iv,
      authTag,
      JSON.stringify(shards.map((s, i) => ({ index: i + 1, hash: generateShardHash(s.data) }))),
      accessTier,
      description
    );

    // Store key shards
    const insertShard = req.db.prepare(`
      INSERT INTO KeyShards (shardID, fileID, userID, shardIndex, shardData, shardHash)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const shardRecords = shards.map((shard, index) => {
      const shardID = uuidv4();
      insertShard.run(
        shardID,
        fileID,
        req.user.userID,
        index + 1,
        JSON.stringify(shard),
        generateShardHash(shard.data)
      );
      return { shardID, index: index + 1, hash: generateShardHash(shard.data) };
    });

    res.status(201).json({
      message: 'تم تشفير وحفظ الملف بنجاح',
      file: {
        fileID,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        originalSize: req.file.size,
        accessTier,
        encryptionDetails: {
          algorithm: 'AES-256-GCM',
          keyShards: shardRecords.length,
          threshold: config.KEY_SHARD_THRESHOLD,
          ivLength: iv.length / 2,
          keyHash,
        },
        shards: shardRecords,
      },
    });
  } catch (err) {
    console.error('[VAULT] Upload error:', err);
    res.status(500).json({ error: 'خطأ في تشفير وحفظ الملف', code: 'UPLOAD_FAILED' });
  }
});

// ──────────────────────────────────────────
// GET /api/vault/files - List user's vault files
// ──────────────────────────────────────────
router.get('/files', authenticateToken, (req, res) => {
  try {
    const files = req.db.prepare(`
      SELECT fileID, fileName, fileType, fileSizeBytes, accessTier, description, keyShardLocations, uploadedAt
      FROM SecureVault WHERE userID = ?
      ORDER BY uploadedAt DESC
    `).all(req.user.userID);

    const enrichedFiles = files.map(f => ({
      ...f,
      keyShardLocations: JSON.parse(f.keyShardLocations),
      formattedSize: formatBytes(f.fileSizeBytes),
    }));

    res.json({ files: enrichedFiles, count: files.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل الملفات' });
  }
});

// ──────────────────────────────────────────
// GET /api/vault/files/:fileID - Get file details
// ──────────────────────────────────────────
router.get('/files/:fileID', authenticateToken, (req, res) => {
  try {
    const file = req.db.prepare(
      'SELECT * FROM SecureVault WHERE fileID = ? AND userID = ?'
    ).get(req.params.fileID, req.user.userID);

    if (!file) {
      return res.status(404).json({ error: 'الملف غير موجود' });
    }

    const shards = req.db.prepare(
      'SELECT shardID, shardIndex, shardHash, distributed, distributedAt, recipientID FROM KeyShards WHERE fileID = ?'
    ).all(req.params.fileID);

    res.json({
      file: { ...file, keyShardLocations: JSON.parse(file.keyShardLocations) },
      shards,
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل بيانات الملف' });
  }
});

// ──────────────────────────────────────────
// POST /api/vault/files/:fileID/decrypt - Decrypt and download file
// ──────────────────────────────────────────
router.post('/files/:fileID/decrypt', authenticateToken, (req, res) => {
  try {
    const file = req.db.prepare(
      'SELECT * FROM SecureVault WHERE fileID = ? AND userID = ?'
    ).get(req.params.fileID, req.user.userID);

    if (!file) {
      return res.status(404).json({ error: 'الملف غير موجود' });
    }

    // Get all shards for reconstruction
    const shardRecords = req.db.prepare(
      'SELECT shardData FROM KeyShards WHERE fileID = ? ORDER BY shardIndex'
    ).all(req.params.fileID);

    if (shardRecords.length < config.KEY_SHARD_THRESHOLD) {
      return res.status(403).json({
        error: 'عدد المفاتيح غير كافٍ لفك التشفير',
        required: config.KEY_SHARD_THRESHOLD,
        available: shardRecords.length,
      });
    }

    const shards = shardRecords.slice(0, config.KEY_SHARD_THRESHOLD).map(s => JSON.parse(s.shardData));
    const encryptedData = fs.readFileSync(file.encryptedDataPath);
    const decryptedData = reconstructAndDecrypt(encryptedData, shards, file.iv, file.authTag);

    res.set({
      'Content-Type': file.fileType,
      'Content-Disposition': `attachment; filename="${file.fileName}"`,
      'Content-Length': decryptedData.length,
    });
    res.send(decryptedData);
  } catch (err) {
    console.error('[VAULT] Decrypt error:', err);
    res.status(500).json({ error: 'خطأ في فك تشفير الملف' });
  }
});

// ──────────────────────────────────────────
// DELETE /api/vault/files/:fileID - Delete a vault file
// ──────────────────────────────────────────
router.delete('/files/:fileID', authenticateToken, (req, res) => {
  try {
    const file = req.db.prepare(
      'SELECT * FROM SecureVault WHERE fileID = ? AND userID = ?'
    ).get(req.params.fileID, req.user.userID);

    if (!file) {
      return res.status(404).json({ error: 'الملف غير موجود' });
    }

    // Delete encrypted file from disk
    if (file.encryptedDataPath && fs.existsSync(file.encryptedDataPath)) {
      fs.unlinkSync(file.encryptedDataPath);
    }

    // Delete shards and vault record
    req.db.prepare('DELETE FROM KeyShards WHERE fileID = ?').run(req.params.fileID);
    req.db.prepare('DELETE FROM SecureVault WHERE fileID = ?').run(req.params.fileID);

    res.json({ message: 'تم حذف الملف بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الملف' });
  }
});

// ──────────────────────────────────────────
// POST /api/vault/heirs - Add an authorized heir
// ──────────────────────────────────────────
router.post('/heirs', authenticateToken, (req, res) => {
  try {
    const { recipientName, phone, email, relationship, accessTier = 'Personal' } = req.body;

    if (!recipientName || !phone) {
      return res.status(400).json({ error: 'اسم الوريث ورقم الهاتف مطلوبان' });
    }

    const recipientID = uuidv4();
    req.db.prepare(`
      INSERT INTO InheritanceAccess (recipientID, userID, recipientName, phone, email, relationship, accessTier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(recipientID, req.user.userID, recipientName, phone, email || null, relationship || null, accessTier);

    res.status(201).json({
      message: 'تمت إضافة الوريث بنجاح',
      heir: { recipientID, recipientName, phone, email, relationship, accessTier },
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في إضافة الوريث' });
  }
});

// ──────────────────────────────────────────
// GET /api/vault/heirs - List user's heirs
// ──────────────────────────────────────────
router.get('/heirs', authenticateToken, (req, res) => {
  try {
    const heirs = req.db.prepare(
      'SELECT * FROM InheritanceAccess WHERE userID = ? ORDER BY createdAt DESC'
    ).all(req.user.userID);
    res.json({ heirs, count: heirs.length });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تحميل بيانات الورثة' });
  }
});

// ──────────────────────────────────────────
// DELETE /api/vault/heirs/:recipientID
// ──────────────────────────────────────────
router.delete('/heirs/:recipientID', authenticateToken, (req, res) => {
  try {
    const result = req.db.prepare(
      'DELETE FROM InheritanceAccess WHERE recipientID = ? AND userID = ?'
    ).run(req.params.recipientID, req.user.userID);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'الوريث غير موجود' });
    }
    res.json({ message: 'تم حذف الوريث بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في حذف الوريث' });
  }
});

// ──────────────────────────────────────────
// POST /api/vault/shards/:shardID/assign - Assign shard to heir
// ──────────────────────────────────────────
router.post('/shards/:shardID/assign', authenticateToken, (req, res) => {
  try {
    const { recipientID } = req.body;

    const shard = req.db.prepare(
      'SELECT * FROM KeyShards WHERE shardID = ? AND userID = ?'
    ).get(req.params.shardID, req.user.userID);

    if (!shard) {
      return res.status(404).json({ error: 'الجزء المشفر غير موجود' });
    }

    const heir = req.db.prepare(
      'SELECT * FROM InheritanceAccess WHERE recipientID = ? AND userID = ?'
    ).get(recipientID, req.user.userID);

    if (!heir) {
      return res.status(404).json({ error: 'الوريث غير موجود' });
    }

    req.db.prepare(`
      UPDATE KeyShards SET recipientID = ?, distributed = 1, distributedAt = datetime('now')
      WHERE shardID = ?
    `).run(recipientID, req.params.shardID);

    res.json({
      message: 'تم تعيين الجزء المشفر للوريث بنجاح',
      shardID: req.params.shardID,
      recipientID,
      recipientName: heir.recipientName,
    });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في تعيين الجزء المشفر' });
  }
});

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = router;
