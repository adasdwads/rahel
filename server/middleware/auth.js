const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'غير مصرح - يرجى تسجيل الدخول',
      code: 'AUTH_REQUIRED',
    });
  }

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    req.user = decoded;

    const user = req.db.prepare('SELECT userID, status FROM Users WHERE userID = ?').get(decoded.userID);
    if (!user) {
      return res.status(401).json({
        error: 'المستخدم غير موجود',
        code: 'USER_NOT_FOUND',
      });
    }
    if (user.status === 'Suspended') {
      return res.status(403).json({
        error: 'الحساب معلق',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    req.user.status = user.status;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'انتهت صلاحية الجلسة',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(403).json({
      error: 'رمز الدخول غير صالح',
      code: 'TOKEN_INVALID',
    });
  }
}

function generateToken(user) {
  return jwt.sign(
    {
      userID: user.userID,
      name: user.name,
      email: user.email,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRY }
  );
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      req.user = jwt.verify(token, config.JWT_SECRET);
    } catch {
      // Continue without auth
    }
  }
  next();
}

module.exports = { authenticateToken, generateToken, optionalAuth };
