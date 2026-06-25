const crypto = require('crypto');

const PRIME = 257;

const mod = (value) => ((value % PRIME) + PRIME) % PRIME;

const modInverse = (value) => {
  let t = 0;
  let newT = 1;
  let r = PRIME;
  let newR = mod(value);

  while (newR !== 0) {
    const quotient = Math.floor(r / newR);
    [t, newT] = [newT, t - quotient * newT];
    [r, newR] = [newR, r - quotient * newR];
  }

  if (r > 1) {
    throw new Error('Value is not invertible');
  }

  return mod(t);
};

const evaluatePolynomial = (coefficients, x) => coefficients.reduce((sum, coefficient, index) => {
  return mod(sum + coefficient * (x ** index));
}, 0);

const splitKey = (masterKey, totalShards, threshold) => {
  if (!Buffer.isBuffer(masterKey) || masterKey.length !== 32) {
    throw new Error('Master key must be a 32-byte buffer');
  }
  if (threshold > totalShards || threshold < 1) {
    throw new Error('Invalid shard threshold');
  }

  const shards = Array.from({ length: totalShards }, (_, index) => ({
    index: index + 1,
    values: []
  }));

  for (const byte of masterKey.values()) {
    const coefficients = [byte, ...Array.from(crypto.randomBytes(threshold - 1)).map((value) => value % PRIME)];
    shards.forEach((shard) => {
      shard.values.push(evaluatePolynomial(coefficients, shard.index));
    });
  }

  return shards.map((shard) => ({
    shardIndex: shard.index,
    totalShards,
    threshold,
    shardData: Buffer.from(JSON.stringify(shard.values), 'utf8').toString('base64')
  }));
};

const reconstructKey = (shards) => {
  if (!Array.isArray(shards) || shards.length < 1) {
    throw new Error('At least one shard is required');
  }

  const parsedShards = shards.map((shard) => ({
    x: shard.shardIndex,
    values: JSON.parse(Buffer.from(shard.shardData, 'base64').toString('utf8'))
  }));

  const byteLength = parsedShards[0].values.length;
  const secret = [];

  for (let byteIndex = 0; byteIndex < byteLength; byteIndex += 1) {
    let value = 0;

    parsedShards.forEach((currentShard, currentIndex) => {
      let numerator = 1;
      let denominator = 1;

      parsedShards.forEach((otherShard, otherIndex) => {
        if (currentIndex !== otherIndex) {
          numerator = mod(numerator * -otherShard.x);
          denominator = mod(denominator * (currentShard.x - otherShard.x));
        }
      });

      const lagrange = mod(numerator * modInverse(denominator));
      value = mod(value + currentShard.values[byteIndex] * lagrange);
    });

    secret.push(value === 256 ? 0 : value);
  }

  return Buffer.from(secret);
};

module.exports = {
  splitKey,
  reconstructKey
};