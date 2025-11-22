const rateLimit = require('express-rate-limit');

// Relaxed rate limiting for login attempts (suitable for development/university projects)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 attempts (very generous for testing)
    message: {
        success: false,
        message: 'Too many login attempts from this IP, please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Only count failed requests
});

// Rate limiting for registration
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 registrations per hour per IP (for testing)
    message: {
        success: false,
        message: 'Too many accounts created from this IP, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting for password reset requests
const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: {
        success: false,
        message: 'Too many password reset attempts, please try again after an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Rate limiting for 2FA verification (relaxed for testing)
const twoFactorLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 attempts (for testing purposes)
    message: {
        success: false,
        message: 'Too many verification attempts, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    loginLimiter,
    registerLimiter,
    passwordResetLimiter,
    twoFactorLimiter
};
