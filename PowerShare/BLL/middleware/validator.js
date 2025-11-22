const { body, query, validationResult } = require('express-validator');

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'LBP', 'EUR'];

const registerValidation = [
    body('full_name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2-100 characters'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters'),

    body('phone')
        .optional()
        .matches(/^[\d\s\-\+\(\)]+$/)
        .withMessage('Invalid phone number'),

    body('role')
        .optional()
        .isIn(['household', 'owner', 'admin'])
        .withMessage('Invalid role')
];

const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Invalid email address'),

    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const validatePasswordPolicy = (password) => {
    const errors = [];
    
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter (A-Z)');
    }
    
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter (a-z)');
    }
    
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one digit (0-9)');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*()_+-={};\':"\\|,.<>/?)');
    }
    
    return errors;
};

const resetPasswordValidation = [
    body('newPassword')
        .notEmpty()
        .withMessage('New password is required')
        .custom((value) => {
            const errors = validatePasswordPolicy(value);
            if (errors.length > 0) {
                throw new Error(errors.join('. '));
            }
            return true;
        })
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }
    next();
};

// Currency validation middleware
const validateCurrency = (req, res, next) => {
    const currency = req.body.currency || req.query.currency || 'USD';

    if (!SUPPORTED_CURRENCIES.includes(currency.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: `Invalid currency. Supported currencies are: ${SUPPORTED_CURRENCIES.join(', ')}`
        });
    }

    // Normalize currency to uppercase
    if (req.body.currency) {
        req.body.currency = currency.toUpperCase();
    }
    if (req.query.currency) {
        req.query.currency = currency.toUpperCase();
    }

    next();
};

// Payment validation
const paymentValidation = [
    body('amount')
        .isFloat({ min: 0.01 })
        .withMessage('Amount must be a positive number'),
    body('payment_method')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
        .isIn(['cash', 'card', 'wallet', 'bank_transfer'])
        .withMessage('Invalid payment method'),
    body('bill_id')
        .optional()
        .isInt()
        .withMessage('Bill ID must be a number')
];

// Wallet top-up validation
const walletTopUpValidation = [
    body('amount')
        .isFloat({ min: 1 })
        .withMessage('Top-up amount must be at least $1'),
    body('paymentMethod')
        .trim()
        .notEmpty()
        .withMessage('Payment method is required')
];

// Date validation helper
const validateDateRange = (req, res, next) => {
    const { startDate, endDate, dateFrom, dateTo } = req.query;

    const start = startDate || dateFrom;
    const end = endDate || dateTo;

    if (start && !isValidDate(start)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid start date format. Use YYYY-MM-DD'
        });
    }

    if (end && !isValidDate(end)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid end date format. Use YYYY-MM-DD'
        });
    }

    if (start && end && new Date(start) > new Date(end)) {
        return res.status(400).json({
            success: false,
            message: 'Start date must be before end date'
        });
    }

    next();
};

// Date validation helper function
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

module.exports = {
    registerValidation,
    loginValidation,
    resetPasswordValidation,
    validatePasswordPolicy,
    validate,
    validateCurrency,
    paymentValidation,
    walletTopUpValidation,
    validateDateRange,
    SUPPORTED_CURRENCIES
};