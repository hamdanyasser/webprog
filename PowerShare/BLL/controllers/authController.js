const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userDAL = require('../../DAL/userDAL');
const emailService = require('../services/emailService');
const twoFactorService = require('../services/twoFactorService');

class AuthController {
    async register(req, res) {
        try {

            const { full_name, email, password, phone, address, role } = req.body;

            const errors = [];

            if (!full_name || full_name.trim().length < 3) {
                errors.push('Full name must be at least 3 characters');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                errors.push('Invalid email address');
            }

            const phoneRegex = /^(\+961|961)?[0-9]{8,10}$/;
            if (!phone || !phoneRegex.test(phone.replace(/\s+/g, ''))) {
                errors.push('Invalid phone number');
            }

            if (!address || address.trim().length < 5) {
                errors.push('Address must be at least 5 characters');
            }

            if (!password || password.length < 8) {
                errors.push('Password must be at least 8 characters');
            }
            if (!/[A-Z]/.test(password)) {
                errors.push('Password must contain at least one uppercase letter');
            }
            if (!/[a-z]/.test(password)) {
                errors.push('Password must contain at least one lowercase letter');
            }
            if (!/[0-9]/.test(password)) {
                errors.push('Password must contain at least one number');
            }
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
                errors.push('Password must contain at least one special character');
            }

            const validRoles = ['household', 'owner', 'admin'];
            if (!role || !validRoles.includes(role)) {
                errors.push('Invalid role');
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: errors.join('. ')
                });
            }

            try {
                const existingUser = await userDAL.findByEmail(email);

                if (existingUser) {
                    console.log('Email already exists:', email); 
                    return res.status(400).json({
                        success: false,
                        message: 'This email is already registered. Please use a different email or try logging in.'
                    });
                }
            } catch (error) {
                console.error('Error checking existing user:', error);
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const profile_image = req.file ? `/uploads/profile-images/${req.file.filename}` : null;

            const userId = await userDAL.createUser({
                full_name,
                email,
                password: hashedPassword,
                phone,
                address,
                role,
                profile_image
            });

            console.log('User registered successfully:', userId);

            // Generate email verification token (valid for 24 hours)
            const verificationToken = jwt.sign(
                { userId, email, purpose: 'email_verification' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Save verification token to database
            await userDAL.setEmailVerificationToken(userId, verificationToken);

            // Send verification email
            const emailResult = await emailService.sendVerificationEmail(email, full_name, verificationToken);

            if (emailResult.success) {
                console.log('✅ Verification email sent to:', email);
            } else {
                console.error('❌ Failed to send verification email:', emailResult.error);
            }

            res.status(201).json({
                success: true,
                message: 'Registration successful! Please check your email to verify your account.',
                data: {
                    userId,
                    emailSent: emailResult.success
                }
            });

        } catch (error) {
            console.error('Registration error:', error);

            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({
                    success: false,
                    message: 'This email is already registered. Please use a different email or try logging in.'
                });
            }

            res.status(500).json({
                success: false,
                message: 'Registration failed. Please try again.'
            });
        }
    }


    async login(req, res) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Email and password are required'
                });
            }

            const user = await userDAL.findByEmail(email);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Check if email is verified
            if (!user.email_verified) {
                return res.status(403).json({
                    success: false,
                    message: 'Please verify your email before logging in. Check your inbox for the verification link.',
                    emailVerified: false,
                    email: email
                });
            }

            // Check if 2FA is enabled for this user
            const twoFactorEnabled = await twoFactorService.isTwoFactorEnabled(user.user_id);

            if (twoFactorEnabled) {
                // Check if this is a trusted device
                const deviceToken = req.cookies.trusted_device;
                const isTrustedDevice = await twoFactorService.verifyTrustedDevice(user.user_id, deviceToken);

                if (!isTrustedDevice) {
                    // Generate and send 2FA code
                    const code = await twoFactorService.createTwoFactorCode(user.user_id);
                    await emailService.sendTwoFactorCode(user.email, user.full_name, code);

                    // Store user_id in session for 2FA verification
                    req.session = req.session || {};
                    req.session.pendingTwoFactorUserId = user.user_id;

                    return res.status(200).json({
                        success: false,
                        requiresTwoFactor: true,
                        message: 'Two-factor authentication required. Check your email for the verification code.',
                        userId: user.user_id
                    });
                }
            }

            // Normal login flow (no 2FA or trusted device)
            const token = jwt.sign(
                { userId: user.user_id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '2h' }  // Session expires after 2 hours
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 2 * 60 * 60 * 1000,  // 2 hours in milliseconds
            });

            delete user.password_hash;

            res.json({
                success: true,
                message: 'Login successful',
                data: { user }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: 'Login failed'
            });
        }
    }


    async logout(req, res) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });

            res.json({
                success: true,
                message: 'Logged out successfully'
            });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                message: 'Logout failed'
            });
        }
    }

    async getCurrentUser(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authenticated'
                });
            }

            const user = await userDAL.findById(req.user.user_id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            delete user.password_hash;

            res.json({
                success: true,
                data: { user }
            });

        } catch (error) {
            console.error('Get current user error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get user data'
            });
        }
    }

    async verifyToken(req, res) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'No token provided'
                });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

            res.json({
                success: true,
                data: { decoded }
            });

        } catch (error) {
            console.error('Token verification error:', error);
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }
    }

    async changePassword(req, res) {
        try {
            const userId = req.user.user_id;
            const { current_password, new_password } = req.body;

            if (!current_password || !new_password) {
                return res.status(400).json({
                    success: false,
                    message: 'Current password and new password are required'
                });
            }

            const user = await userDAL.findById(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const userWithPassword = await userDAL.findByEmail(user.email);
            
            const isValidPassword = await bcrypt.compare(current_password, userWithPassword.password_hash);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Current password is incorrect'
                });
            }

            const errors = [];
            
            if (new_password.length < 8) {
                errors.push('Password must be at least 8 characters');
            }
            if (!/[A-Z]/.test(new_password)) {
                errors.push('Password must contain at least one uppercase letter');
            }
            if (!/[a-z]/.test(new_password)) {
                errors.push('Password must contain at least one lowercase letter');
            }
            if (!/[0-9]/.test(new_password)) {
                errors.push('Password must contain at least one number');
            }
            if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(new_password)) {
                errors.push('Password must contain at least one special character');
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: errors.join('. ')
                });
            }

            await userDAL.updatePassword(userId, new_password);

            res.json({
                success: true,
                message: 'Password changed successfully'
            });

        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to change password'
            });
        }
    }

    async verifyEmail(req, res) {
        try {
            const { token } = req.query;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification token is required'
                });
            }

            // Verify JWT token
            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification link. Please request a new one.'
                });
            }

            // Check if token purpose is email verification
            if (decoded.purpose !== 'email_verification') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid verification token'
                });
            }

            // Find user by verification token
            const user = await userDAL.findByVerificationToken(token);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid verification link or user not found'
                });
            }

            // Check if already verified
            if (user.email_verified) {
                return res.status(200).json({
                    success: true,
                    message: 'Email already verified. You can login now.',
                    alreadyVerified: true
                });
            }

            // Verify the email
            await userDAL.verifyEmail(user.user_id);

            // Send welcome email
            await emailService.sendWelcomeEmail(user.email, user.full_name);

            console.log('✅ Email verified for user:', user.email);

            res.json({
                success: true,
                message: 'Email verified successfully! You can now login to your account.',
                user: {
                    email: user.email,
                    full_name: user.full_name
                }
            });

        } catch (error) {
            console.error('Email verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Email verification failed. Please try again.'
            });
        }
    }

    async resendVerificationEmail(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is required'
                });
            }

            // Find user by email
            const user = await userDAL.findByEmail(email);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'No account found with this email'
                });
            }

            // Check if already verified
            if (user.email_verified) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already verified. You can login now.'
                });
            }

            // Generate new verification token
            const verificationToken = jwt.sign(
                { userId: user.user_id, email: user.email, purpose: 'email_verification' },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '24h' }
            );

            // Update verification token in database
            await userDAL.setEmailVerificationToken(user.user_id, verificationToken);

            // Send verification email
            const emailResult = await emailService.sendVerificationEmail(
                user.email,
                user.full_name,
                verificationToken
            );

            if (!emailResult.success) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send verification email. Please try again later.'
                });
            }

            console.log('✅ Verification email resent to:', user.email);

            res.json({
                success: true,
                message: 'Verification email sent! Please check your inbox.'
            });

        } catch (error) {
            console.error('Resend verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to resend verification email'
            });
        }
    }

    /**
     * Verify 2FA code after login
     */
    async verifyTwoFactor(req, res) {
        try {
            const { userId, code, rememberDevice } = req.body;

            if (!userId || !code) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and verification code are required'
                });
            }

            // Verify the code
            const isValid = await twoFactorService.verifyTwoFactorCode(userId, code);

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired verification code'
                });
            }

            // Get user details
            const user = await userDAL.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.user_id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '2h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 2 * 60 * 60 * 1000
            });

            // If user wants to remember device, create trusted device token
            if (rememberDevice) {
                const deviceName = req.headers['user-agent'] || 'Unknown Device';
                const ipAddress = req.ip || req.connection.remoteAddress;
                const userAgent = req.headers['user-agent'];

                const deviceToken = await twoFactorService.createTrustedDevice(
                    userId,
                    deviceName,
                    ipAddress,
                    userAgent
                );

                // Set trusted device cookie (30 days)
                res.cookie('trusted_device', deviceToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: 30 * 24 * 60 * 60 * 1000
                });
            }

            delete user.password_hash;

            res.json({
                success: true,
                message: 'Two-factor authentication successful',
                data: { user }
            });

        } catch (error) {
            console.error('2FA verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Verification failed'
            });
        }
    }

    /**
     * Verify backup code
     */
    async verifyBackupCode(req, res) {
        try {
            const { userId, backupCode } = req.body;

            if (!userId || !backupCode) {
                return res.status(400).json({
                    success: false,
                    message: 'User ID and backup code are required'
                });
            }

            // Verify the backup code
            const isValid = await twoFactorService.verifyBackupCode(userId, backupCode);

            if (!isValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid backup code'
                });
            }

            // Get user details
            const user = await userDAL.findById(userId);

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.user_id, email: user.email, role: user.role },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '2h' }
            );

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 2 * 60 * 60 * 1000
            });

            delete user.password_hash;

            res.json({
                success: true,
                message: 'Backup code verified successfully',
                data: { user }
            });

        } catch (error) {
            console.error('Backup code verification error:', error);
            res.status(500).json({
                success: false,
                message: 'Verification failed'
            });
        }
    }

    /**
     * Enable 2FA for user
     */
    async enableTwoFactor(req, res) {
        try {
            const userId = req.user.user_id;

            // Enable 2FA and get backup codes
            const backupCodes = await twoFactorService.enableTwoFactor(userId);

            res.json({
                success: true,
                message: 'Two-factor authentication enabled successfully',
                data: {
                    backupCodes,
                    warning: 'Save these backup codes in a safe place. They can only be used once and will not be shown again.'
                }
            });

        } catch (error) {
            console.error('Enable 2FA error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to enable two-factor authentication'
            });
        }
    }

    /**
     * Disable 2FA for user
     */
    async disableTwoFactor(req, res) {
        try {
            const userId = req.user.user_id;
            const { password } = req.body;

            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: 'Password is required to disable 2FA'
                });
            }

            // Verify password
            const user = await userDAL.findByEmail(req.user.email);
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid password'
                });
            }

            // Disable 2FA
            await twoFactorService.disableTwoFactor(userId);

            res.json({
                success: true,
                message: 'Two-factor authentication disabled successfully'
            });

        } catch (error) {
            console.error('Disable 2FA error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to disable two-factor authentication'
            });
        }
    }

    /**
     * Get 2FA status
     */
    async getTwoFactorStatus(req, res) {
        try {
            const userId = req.user.user_id;

            const isEnabled = await twoFactorService.isTwoFactorEnabled(userId);
            const backupCodesCount = await twoFactorService.getRemainingBackupCodesCount(userId);
            const trustedDevices = await twoFactorService.getTrustedDevices(userId);

            res.json({
                success: true,
                data: {
                    enabled: isEnabled,
                    backupCodesRemaining: backupCodesCount,
                    trustedDevices: trustedDevices.length
                }
            });

        } catch (error) {
            console.error('Get 2FA status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to get two-factor authentication status'
            });
        }
    }
}

module.exports = new AuthController();