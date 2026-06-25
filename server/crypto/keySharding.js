const crypto = require('crypto');
const config = require('../config');

// ═══════════════════════════════════════════════════════════════
// AES-256-GCM Encryption with Shamir's Secret Sharing (GF(256))
// Military-Grade Key Sharding Implementation
// ═══════════════════════════════════════════════════════════════

// --- GF(256) Arithmetic using AES irreducible polynomial x^8+x^4+x^3+x+1 ---

const EXP_TABLE = new Uint8Array(256);
const LOG_TABLE = new Uint8Array(256);

(function initGaloisFieldTables() {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP_TABLE[i] = x;
    LOG_TABLE[x] = i;
    x = x ^ (x << 1);
    if (x & 0x100) x ^= 0x11b;
  }
  EXP_TABLE[255] = EXP_TABLE[0];
})();

function gf256Add(a, b) { return a ^ b; }

function gf256Mul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP_TABLE[(LOG_TABLE[a] + LOG_TABLE[b]) % 255];
}

function gf256Div(a, b) {
  if (b === 0) throw new Error('GF(256) division by zero');
  if (a === 0) return 0;
  return EXP_TABLE[((LOG_TABLE[a] - LOG_TABLE[b]) + 255) % 255];
}

// --- Shamir's Secret Sharing over GF(256) ---

function evaluatePolynomial(coefficients, x) {
  let result = 0;
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = gf256Add(gf256Mul(result, x), coefficients[i]);
  }
  return result;
}

function splitSecret(secretByte, totalShards, threshold) {
  const coefficients = new Uint8Array(threshold);
  coefficients[0] = secretByte;
  for (let i = 1; i < threshold; i++) {
    coefficients[i] = crypto.randomBytes(1)[0] || 1;
  }
  const shares = [];
  for (let i = 1; i <= totalShards; i++) {
    shares.push({ x: i, y: evaluatePolynomial(coefficients, i) });
  }
  return shares;
}

function reconstructSecret(shares) {
  let secret = 0;
  const k = shares.length;
  for (let i = 0; i < k; i++) {
    let numerator = 1;
    let denominator = 1;
    for (let j = 0; j < k; j++) {
      if (i === j) continue;
      numerator = gf256Mul(numerator, shares[j].x);
      denominator = gf256Mul(denominator, gf256Add(shares[i].x, shares[j].x));
    }
    const lagrange = gf256Div(numerator, denominator);
    secret = gf256Add(secret, gf256Mul(lagrange, shares[i].y));
  }
  return secret;
}

// --- High-Level Key Sharding API ---

function splitKey(keyBuffer, totalShards, threshold) {
  if (!Buffer.isBuffer(keyBuffer)) {
    keyBuffer = Buffer.from(keyBuffer, 'hex');
  }
  const shards = Array.from({ length: totalShards }, () => []);
  for (let byteIndex = 0; byteIndex < keyBuffer.length; byteIndex++) {
    const byteShares = splitSecret(keyBuffer[byteIndex], totalShards, threshold);
    for (let s = 0; s < totalShards; s++) {
      shards[s].push(byteShares[s]);
    }
  }
  return shards.map((shard, index) => ({
    index: index + 1,
    threshold,
    totalShards,
    keyLength: keyBuffer.length,
    data: Buffer.from(shard.map(s => s.y)).toString('base64'),
    points: shard.map(s => s.x),
  }));
}

function reconstructKey(shards) {
  const keyLength = shards[0].keyLength;
  const keyBytes = [];
  for (let byteIndex = 0; byteIndex < keyLength; byteIndex++) {
    const shares = shards.map(shard => {
      const data = Buffer.from(shard.data, 'base64');
      return { x: shard.index, y: data[byteIndex] };
    });
    keyBytes.push(reconstructSecret(shares));
  }
  return Buffer.from(keyBytes);
}

// --- AES-256-GCM Encryption ---

function encrypt(data, key) {
  if (!key) key = crypto.randomBytes(32);
  if (typeof key === 'string') key = Buffer.from(key, 'hex');

  const iv = crypto.randomBytes(config.IV_LENGTH);
  const cipher = crypto.createCipheriv(config.AES_ALGORITHM, key, iv);

  let encrypted;
  if (Buffer.isBuffer(data)) {
    encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  } else {
    encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  }

  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    key: key.toString('hex'),
  };
}

function decrypt(encryptedData, keyHex, ivHex, authTagHex) {
  const key = Buffer.from(keyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(config.AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);

  return decrypted;
}

// --- Combined Encrypt + Shard Pipeline ---

function encryptAndShard(data, totalShards = config.KEY_SHARD_TOTAL, threshold = config.KEY_SHARD_THRESHOLD) {
  const { encrypted, iv, authTag, key } = encrypt(data);
  const shards = splitKey(key, totalShards, threshold);
  const keyHash = crypto.createHash('sha256').update(key, 'hex').digest('hex');

  return {
    encryptedData: encrypted,
    iv,
    authTag,
    keyHash,
    shards,
  };
}

function reconstructAndDecrypt(encryptedData, shards, ivHex, authTagHex) {
  const key = reconstructKey(shards);
  return decrypt(encryptedData, key.toString('hex'), ivHex, authTagHex);
}

function generateShardHash(shardData) {
  return crypto.createHash('sha256').update(shardData).digest('hex').substring(0, 16);
}

module.exports = {
  encrypt,
  decrypt,
  splitKey,
  reconstructKey,
  encryptAndShard,
  reconstructAndDecrypt,
  generateShardHash,
  splitSecret,
  reconstructSecret,
};
