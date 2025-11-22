const nodemailer = require('nodemailer');
const pdfService = require('./pdfService');
require('dotenv').config();

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    }

    /**
     * Send email verification email
     */
    async sendVerificationEmail(userEmail, userName, verificationToken) {
        const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: `"PowerShare" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: '✅ Verify Your Email - PowerShare',
            html: this.getVerificationEmailTemplate(userName, verificationUrl)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Verification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending verification email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordResetEmail(userEmail, userName, resetToken) {
        const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: `"PowerShare" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: '🔒 Reset Your Password - PowerShare',
            html: this.getPasswordResetEmailTemplate(userName, resetUrl)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending password reset email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send welcome email after verification
     */
    async sendWelcomeEmail(userEmail, userName) {
        const mailOptions = {
            from: `"PowerShare" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: '🎉 Welcome to PowerShare!',
            html: this.getWelcomeEmailTemplate(userName)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending welcome email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send bill notification email
     */
    async sendBillNotification(userEmail, userName, billData) {
        const billUrl = `${process.env.APP_URL || 'http://localhost:3000'}/billing`;

        const mailOptions = {
            from: `"PowerShare" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: `💵 New Bill Available - $${billData.amount}`,
            html: this.getBillNotificationTemplate(userName, billData, billUrl)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Bill notification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending bill notification email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * HTML template for email verification
     */
    getVerificationEmailTemplate(userName, verificationUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Verify your email address</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 24px 0; font-size: 16px;">
                                Hi ${userName},
                            </p>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Thanks for signing up for PowerShare. To complete your registration and access your account, please verify your email address.
                            </p>

                            <!-- Verification Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${verificationUrl}" style="display: inline-block; background-color: #5850ec; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; line-height: 24px;">
                                            Verify email address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                                <tr>
                                    <td>
                                        <p style="color: #697386; font-size: 14px; line-height: 20px; margin: 0 0 8px 0;">
                                            Or copy and paste this URL into your browser:
                                        </p>
                                        <p style="margin: 0;">
                                            <a href="${verificationUrl}" style="color: #5850ec; word-break: break-all; font-size: 14px; text-decoration: none;">${verificationUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #8792a2; font-size: 14px; line-height: 20px; margin: 0;">
                                This verification link will expire in 24 hours. If you didn't create a PowerShare account, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Security Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                If you have questions, please contact our support team.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * HTML template for password reset
     */
    getPasswordResetEmailTemplate(userName, resetUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Reset your password</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 24px 0; font-size: 16px;">
                                Hi ${userName},
                            </p>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                We received a request to reset the password for your PowerShare account. Click the button below to choose a new password.
                            </p>

                            <!-- Reset Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${resetUrl}" style="display: inline-block; background-color: #5850ec; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; line-height: 24px;">
                                            Reset password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff4e6; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ff9933;">
                                <tr>
                                    <td>
                                        <p style="color: #8b5a00; font-size: 14px; line-height: 20px; margin: 0;">
                                            This link will expire in 15 minutes for security reasons.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #8792a2; font-size: 14px; line-height: 20px; margin: 0;">
                                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Security Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                For security, never share this email or link with anyone.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * HTML template for welcome email
     */
    getWelcomeEmailTemplate(userName) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to PowerShare</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Welcome to PowerShare!</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 24px 0; font-size: 16px;">
                                Hi ${userName},
                            </p>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Your email has been verified successfully. You're now part of Lebanon's most reliable power sharing community.
                            </p>

                            <h3 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">Get started with PowerShare</h3>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td style="padding: 16px; background-color: #f6f9fc; border-radius: 8px; margin-bottom: 12px;">
                                        <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0 0 4px 0;">Browse Generators</p>
                                        <p style="color: #697386; font-size: 14px; line-height: 20px; margin: 0;">Find and subscribe to available generators in your area</p>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                                <tr>
                                    <td style="padding: 16px; background-color: #f6f9fc; border-radius: 8px;">
                                        <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0 0 4px 0;">Track & Pay Bills</p>
                                        <p style="color: #697386; font-size: 14px; line-height: 20px; margin: 0;">Manage your electricity bills and payments easily</p>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td style="padding: 16px; background-color: #f6f9fc; border-radius: 8px;">
                                        <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0 0 4px 0;">Earn Rewards</p>
                                        <p style="color: #697386; font-size: 14px; line-height: 20px; margin: 0;">Get loyalty points with every payment you make</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Dashboard Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 8px 0 0 0;">
                                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background-color: #5850ec; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; line-height: 24px;">
                                            Go to dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Help Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                Need help? Contact our support team anytime.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * HTML template for bill notification
     */
    getBillNotificationTemplate(userName, billData, billUrl) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Bill Available</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">New bill available</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 24px 0; font-size: 16px;">
                                Hi ${userName},
                            </p>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Your electricity bill for <strong>${billData.generator_name}</strong> is now ready. Please review the details below.
                            </p>

                            <!-- Bill Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 32px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Plan</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0;">${billData.plan_name}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount Due</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -1px;">$${billData.amount}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0;">${billData.due_date}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- Pay Bill Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 32px 0;">
                                        <a href="${billUrl}" style="display: inline-block; background-color: #5850ec; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 500; font-size: 16px; line-height: 24px;">
                                            View and pay bill
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td>
                                        <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
                                            <strong>Tip:</strong> Pay before the due date to earn loyalty points and avoid late fees.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Help Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                Questions about your bill? Contact your generator owner.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Send generic notification email
     */
    async sendNotificationEmail(userEmail, userName, title, message, actionUrl = null) {
        const mailOptions = {
            from: `"PowerShare" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: `🔔 ${title} - PowerShare`,
            html: this.getNotificationEmailTemplate(userName, title, message, actionUrl)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Notification email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending notification email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get generic notification email template
     */
    getNotificationEmailTemplate(userName, title, message, actionUrl) {
        const actionButton = actionUrl
            ? `<a href="${actionUrl}" style="display:inline-block;padding:12px 30px;margin:20px 0;background-color:#007bff;color:#ffffff;text-decoration:none;border-radius:5px;font-weight:bold;">View Details</a>`
            : '';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
    <table role="presentation" style="width:100%;border-collapse:collapse;">
        <tr>
            <td align="center" style="padding:40px 0;">
                <table role="presentation" style="width:600px;border-collapse:collapse;background-color:#ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding:40px 40px 20px;text-align:center;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                            <h1 style="margin:0;color:#ffffff;font-size:28px;">⚡ PowerShare</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding:40px;">
                            <h2 style="margin:0 0 20px;color:#333333;font-size:24px;">${title}</h2>
                            <p style="margin:0 0 10px;color:#666666;font-size:16px;line-height:24px;">
                                Hi <strong>${userName}</strong>,
                            </p>
                            <p style="margin:20px 0;color:#666666;font-size:16px;line-height:24px;">
                                ${message}
                            </p>
                            ${actionButton}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding:30px 40px;background-color:#f8f9fa;border-top:1px solid #e9ecef;">
                            <p style="margin:0 0 10px;color:#666666;font-size:14px;text-align:center;">
                                Thank you for using PowerShare
                            </p>
                            <p style="margin:0;color:#999999;font-size:12px;text-align:center;">
                                This is an automated message, please do not reply to this email.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Send payment receipt email with PDF attachment
     */
    async sendPaymentReceiptEmail(userEmail, userName, payment, bill) {
        try {
            // Generate PDF receipt
            const pdfBuffer = await pdfService.generatePaymentReceipt(payment, bill, {
                full_name: userName,
                email: userEmail
            });

            const mailOptions = {
                from: `"PowerShare" <${process.env.SMTP_USER}>`,
                to: userEmail,
                subject: `✅ Payment Receipt - $${parseFloat(payment.amount).toFixed(2)}`,
                html: this.getPaymentReceiptEmailTemplate(userName, payment, bill),
                attachments: [
                    {
                        filename: `payment_receipt_${payment.payment_id}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Payment receipt email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending payment receipt email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send wallet top-up receipt email with PDF attachment
     */
    async sendWalletTopUpReceiptEmail(userEmail, userName, transaction) {
        try {
            // Generate PDF receipt
            const pdfBuffer = await pdfService.generateWalletTopUpReceipt(transaction, {
                full_name: userName,
                email: userEmail
            });

            const mailOptions = {
                from: `"PowerShare" <${process.env.SMTP_USER}>`,
                to: userEmail,
                subject: `💰 Wallet Top-Up Confirmation - ${transaction.amount} ${transaction.currency}`,
                html: this.getWalletTopUpEmailTemplate(userName, transaction),
                attachments: [
                    {
                        filename: `wallet_topup_${transaction.transaction_id}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Wallet top-up receipt email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending wallet top-up receipt email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send bill payment receipt email with PDF attachment
     */
    async sendBillPaymentReceiptEmail(userEmail, userName, transaction, bill) {
        try {
            // Generate PDF receipt
            const pdfBuffer = await pdfService.generateBillPaymentReceipt(transaction, bill, {
                full_name: userName,
                email: userEmail
            });

            const mailOptions = {
                from: `"PowerShare" <${process.env.SMTP_USER}>`,
                to: userEmail,
                subject: `✅ Bill Payment Confirmation - ${transaction.amount} ${transaction.currency}`,
                html: this.getBillPaymentEmailTemplate(userName, transaction, bill),
                attachments: [
                    {
                        filename: `bill_payment_${transaction.transaction_id}.pdf`,
                        content: pdfBuffer,
                        contentType: 'application/pdf'
                    }
                ]
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Bill payment receipt email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending bill payment receipt email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Email template for payment receipt
     */
    getPaymentReceiptEmailTemplate(userName, payment, bill) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                    <td align="right">
                                        <span style="background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">Paid</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Payment successful</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Hi ${userName}, thank you for your payment. Your transaction has been processed successfully.
                            </p>

                            <!-- Payment Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount Paid</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -1px;">$${parseFloat(payment.amount).toFixed(2)}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Payment Method</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0; text-transform: capitalize;">${payment.payment_method}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Receipt Number</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0; font-family: monospace;">REC-${payment.payment_id}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 16px; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td>
                                        <p style="color: #1e40af; font-size: 14px; line-height: 20px; margin: 0;">
                                            A detailed PDF receipt has been attached to this email for your records.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Help Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                Questions about this payment? Contact our support team.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Email template for wallet top-up
     */
    getWalletTopUpEmailTemplate(userName, transaction) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                    <td align="right">
                                        <span style="background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">Completed</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Wallet top-up successful</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Hi ${userName}, your wallet has been topped up successfully and is ready to use.
                            </p>

                            <!-- Transaction Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount Added</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -1px;">${transaction.amount} ${transaction.currency}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">New Balance</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 18px; font-weight: 600; margin: 0;">${transaction.balance_after} ${transaction.currency}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Transaction ID</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0; font-family: monospace;">${transaction.transaction_id}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 16px; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td>
                                        <p style="color: #1e40af; font-size: 14px; line-height: 20px; margin: 0;">
                                            A detailed PDF receipt has been attached to this email for your records.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Help Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                Questions about this transaction? Contact our support team.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Email template for bill payment
     */
    getBillPaymentEmailTemplate(userName, transaction, bill) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                    <td align="right">
                                        <span style="background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">Paid</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Bill paid successfully</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Hi ${userName}, your bill has been paid successfully using your wallet balance.
                            </p>

                            <!-- Payment Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e3e8ee; border-radius: 8px; margin-bottom: 24px;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Bill ID</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 15px; font-weight: 500; margin: 0; font-family: monospace;">#${bill.bill_id}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Amount Paid</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 28px; font-weight: 600; margin: 0; letter-spacing: -1px;">${transaction.amount} ${transaction.currency}</p>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td colspan="2" style="padding: 16px 0;">
                                                    <div style="border-top: 1px solid #e3e8ee;"></div>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 8px 0;">
                                                    <p style="color: #8792a2; font-size: 13px; margin: 0; text-transform: uppercase; letter-spacing: 0.5px;">Wallet Balance</p>
                                                </td>
                                                <td align="right" style="padding: 8px 0;">
                                                    <p style="color: #1a1f36; font-size: 18px; font-weight: 600; margin: 0;">${transaction.balance_after} ${transaction.currency}</p>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-radius: 8px; padding: 16px; border-left: 4px solid #3b82f6;">
                                <tr>
                                    <td>
                                        <p style="color: #1e40af; font-size: 14px; line-height: 20px; margin: 0;">
                                            A detailed PDF receipt has been attached to this email for your records.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Help Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                Questions about this payment? Contact our support team.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }

    /**
     * Send 2FA OTP code email
     */
    async sendTwoFactorCode(userEmail, userName, code) {
        const mailOptions = {
            from: `"PowerShare" <${process.env.SMTP_USER}>`,
            to: userEmail,
            subject: `🔐 Your PowerShare Verification Code: ${code}`,
            html: this.getTwoFactorEmailTemplate(userName, code)
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ 2FA code email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Error sending 2FA code email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Email template for 2FA code
     */
    getTwoFactorEmailTemplate(userName, code) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f6f9fc;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e3e8ee;">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 48px 48px 32px 48px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <h1 style="color: #5850ec; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.5px;">PowerShare</h1>
                                    </td>
                                    <td align="right">
                                        <span style="background-color: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500;">Security</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 48px 48px 48px;">
                            <h2 style="color: #1a1f36; margin: 0 0 16px 0; font-size: 24px; font-weight: 600; line-height: 32px;">Your verification code</h2>
                            <p style="color: #697386; line-height: 24px; margin: 0 0 32px 0; font-size: 16px;">
                                Hi ${userName}, use the code below to complete your sign-in to PowerShare.
                            </p>

                            <!-- Verification Code Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td align="center" style="padding: 40px 24px; background-color: #f6f9fc; border-radius: 8px; border: 1px solid #e3e8ee;">
                                        <p style="color: #8792a2; font-size: 13px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 500;">Verification Code</p>
                                        <p style="font-size: 48px; font-weight: 700; letter-spacing: 12px; color: #1a1f36; font-family: 'Courier New', monospace; margin: 0; line-height: 1.2;">
                                            ${code}
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                                <tr>
                                    <td>
                                        <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0 0 8px 0; font-weight: 500;">
                                            This code expires in 10 minutes
                                        </p>
                                        <p style="color: #92400e; font-size: 14px; line-height: 20px; margin: 0;">
                                            If you didn't attempt to sign in, you can safely ignore this email.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; border-radius: 8px; padding: 16px;">
                                <tr>
                                    <td>
                                        <p style="color: #697386; font-size: 14px; line-height: 20px; margin: 0;">
                                            <strong style="color: #1a1f36;">Security reminder:</strong> Never share this code with anyone. PowerShare will never ask for your verification code.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; border-top: 1px solid #e3e8ee;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0 0 8px 0; text-align: center;">
                                PowerShare - Reliable Power for Lebanon
                            </p>
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Security Notice -->
                <table width="600" cellpadding="0" cellspacing="0" style="margin-top: 24px;">
                    <tr>
                        <td style="padding: 0 48px;">
                            <p style="color: #8792a2; font-size: 13px; line-height: 20px; margin: 0; text-align: center;">
                                This is an automated security message.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `;
    }
}

module.exports = new EmailService();
