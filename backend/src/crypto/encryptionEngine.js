const crypto = require('crypto');

const normalizeKey = (key) => {
  if (Buffer.isBuffer(key)) {
    return key;
  }

  if (typeof key === 'string') {
    return Buffer.from(key, 'base64');
  }

  throw new Error('Invalid encryption key');
};

const encrypt = (data, key) => {
  const normalizedKey = normalizeKey(key);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', normalizedKey, iv);
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    content: encrypted.toString('base64')
  };
};

const decrypt = (encryptedData, key) => {
  const normalizedKey = normalizeKey(key);
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    normalizedKey,
    Buffer.from(encryptedData.iv, 'base64')
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.content, 'base64')),
    decipher.final()
  ]);

  return decrypted;
};

module.exports = {
  encrypt,
  decrypt
};