const nodemailer = require('nodemailer');
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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366F1, #8B5CF6); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⚡ PowerShare</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Reliable Power for Lebanon</p>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hi ${userName}! 👋</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Thank you for registering with PowerShare! We're excited to have you join our community.
                            </p>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 30px 0;">
                                To get started, please verify your email address by clicking the button below:
                            </p>

                            <!-- Verification Button -->
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                            ✅ Verify Email Address
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #eeeeee;">
                                <strong>Or copy and paste this link:</strong><br>
                                <a href="${verificationUrl}" style="color: #6366F1; word-break: break-all;">${verificationUrl}</a>
                            </p>

                            <p style="color: #999999; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                This link will expire in 24 hours for security reasons.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                                If you didn't create a PowerShare account, you can safely ignore this email.
                            </p>
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #EF4444, #DC2626); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🔒 Password Reset</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hi ${userName},</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a request to reset your PowerShare password.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #EF4444, #DC2626); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="color: #999999; font-size: 14px; margin: 20px 0 0 0;">
                                This link will expire in 15 minutes. If you didn't request this, please ignore this email.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} PowerShare. All rights reserved.
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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #10B981, #059669); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🎉 Welcome to PowerShare!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hi ${userName}! 🎊</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Your email has been verified successfully! You're now a part of the PowerShare community.
                            </p>
                            <h3 style="color: #333333; margin: 30px 0 15px 0;">What's Next?</h3>
                            <ul style="color: #666666; line-height: 1.8; padding-left: 20px;">
                                <li>Browse available generators in your area</li>
                                <li>Subscribe to a generator and manage your electricity</li>
                                <li>Track your bills and payments</li>
                                <li>Earn loyalty points with every payment</li>
                                <li>Get real-time outage notifications</li>
                            </ul>
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 30px 0 20px 0;">
                                        <a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #10B981, #059669); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                            Go to Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; font-size: 12px; margin: 0;">
                                © ${new Date().getFullYear()} PowerShare. Making electricity sharing easy in Lebanon.
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
