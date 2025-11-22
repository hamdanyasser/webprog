const { body, validationResult } = require('express-validator');

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

module.exports = {
    registerValidation,
    loginValidation,
    resetPasswordValidation,
    validatePasswordPolicy,
    validate
};