const { validationResult, body } = require('express-validator');

const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed',
      errors: result.array()
    });
  }

  return next();
};

const registerValidation = [
  body('name').trim().isLength({ min: 2 }),
  body('email').isEmail().normalizeEmail(),
  body('phone').trim().isLength({ min: 8 }),
  body('password').isLength({ min: 8 }),
  handleValidation
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  handleValidation
];

const biometricValidation = [
  body('email').isEmail().normalizeEmail(),
  body('biometricToken').trim().isLength({ min: 16 }),
  handleValidation
];

const refreshValidation = [
  body('refreshToken').trim().isLength({ min: 20 }),
  handleValidation
];

module.exports = {
  registerValidation,
  loginValidation,
  biometricValidation,
  refreshValidation
};