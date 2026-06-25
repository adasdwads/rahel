const { randomUUID } = require('crypto');

const createId = () => randomUUID();

const now = () => new Date().toISOString();

const decodeBase64ToBuffer = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (Buffer.isBuffer(value)) {
    return value;
  }

  return Buffer.from(value, 'base64');
};

const encodeBufferFields = (record, fields = []) => {
  if (!record) {
    return null;
  }

  const formatted = { ...record };

  fields.forEach((field) => {
    if (formatted[field]) {
      formatted[field] = Buffer.from(formatted[field]).toString('base64');
    }
  });

  return formatted;
};

module.exports = {
  createId,
  now,
  decodeBase64ToBuffer,
  encodeBufferFields
};