const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
    registerValidation,
    loginValidation,
    forgotPasswordValidation,
    resetPasswordValidation,
    validate
} = require('../middleware/validator');

router.post('/register', upload.single('profile_image'), registerValidation, validate, authController.register);
router.post('/login', loginValidation, validate, authController.login);

router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.get('/verify', authenticate, authController.verifyToken);
router.post('/change-password', authenticate, authController.changePassword);

// Email Verification
router.get('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);

module.exports = router;
