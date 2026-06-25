const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { jwtSecret, jwtRefreshSecret, jwtExpiresIn, jwtRefreshExpiresIn } = require('../config/env');

const createAccessToken = (user) => jwt.sign({
  userID: user.userID,
  email: user.email,
  name: user.name,
  status: user.status
}, jwtSecret, { expiresIn: jwtExpiresIn });

const createRefreshToken = (user) => jwt.sign({
  userID: user.userID,
  email: user.email,
  type: 'refresh'
}, jwtRefreshSecret, { expiresIn: jwtRefreshExpiresIn });

const hashValue = async (value) => bcrypt.hash(value, 10);

const compareValue = async (value, hash) => bcrypt.compare(value, hash);

module.exports = {
  createAccessToken,
  createRefreshToken,
  hashValue,
  compareValue
};