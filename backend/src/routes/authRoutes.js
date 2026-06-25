const express = require('express');
const authController = require('../controllers/authController');
const { authRateLimiter } = require('../middleware/rateLimiter');
const {
  registerValidation,
  loginValidation,
  biometricValidation,
  refreshValidation
} = require('../middleware/validator');

const router = express.Router();

router.post('/register', authRateLimiter, registerValidation, authController.register);
router.post('/login', authRateLimiter, loginValidation, authController.login);
router.post('/biometric-verify', authRateLimiter, biometricValidation, authController.verifyBiometric);
router.post('/uae-pass/authorize', authRateLimiter, authController.authorizeUaePass);
router.post('/uae-pass/callback', authRateLimiter, authController.handleUaePassCallback);
router.post('/refresh-token', authRateLimiter, refreshValidation, authController.refreshToken);

module.exports = router;