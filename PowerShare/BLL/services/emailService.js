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
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #6366F1, #8B5CF6); padding: 40px 20px; text-align: center;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">💵 New Bill Available</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333333; margin: 0 0 20px 0;">Hi ${userName},</h2>
                            <p style="color: #666666; line-height: 1.6; margin: 0 0 20px 0;">
                                Your new bill for <strong>${billData.generator_name}</strong> is now available.
                            </p>

                            <!-- Bill Details Card -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa; border-radius: 8px; margin: 30px 0;">
                                <tr>
                                    <td style="padding: 25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding: 10px 0;">
                                                    <strong style="color: #666;">Plan:</strong>
                                                </td>
                                                <td align="right" style="padding: 10px 0;">
                                                    <span style="color: #333;">${billData.plan_name}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                                    <strong style="color: #666;">Amount:</strong>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                                    <span style="color: #10B981; font-size: 24px; font-weight: bold;">$${billData.amount}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                                    <strong style="color: #666;">Due Date:</strong>
                                                </td>
                                                <td align="right" style="padding: 10px 0; border-top: 1px solid #e0e0e0;">
                                                    <span style="color: #EF4444; font-weight: bold;">${billData.due_date}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <a href="${billUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                            💳 View & Pay Bill
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                                <p style="margin: 0; color: #92400E; font-size: 14px;">
                                    <strong>💡 Tip:</strong> Pay before the due date to earn loyalty points and avoid late fees!
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            <p style="color: #999999; font-size: 12px; margin: 0 0 10px 0;">
                                Questions? Contact your generator owner or visit our help center.
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
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background:linear-gradient(135deg, #28a745, #20c997);padding:40px 20px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:28px;">✅ Payment Successful!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="color:#333333;margin:0 0 20px 0;">Hi ${userName},</h2>
                            <p style="color:#666666;line-height:1.6;margin:0 0 20px 0;">
                                Thank you for your payment! Your transaction has been processed successfully.
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;margin:30px 0;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:10px 0;">
                                                    <strong style="color:#666;">Amount Paid:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;">
                                                    <span style="color:#28a745;font-size:24px;font-weight:bold;">$${parseFloat(payment.amount).toFixed(2)}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <strong style="color:#666;">Payment Method:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <span style="color:#333;">${payment.payment_method}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <strong style="color:#666;">Receipt #:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <span style="color:#333;">REC-${payment.payment_id}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color:#d1ecf1;border-left:4px solid #0c5460;padding:15px;margin:20px 0;border-radius:4px;">
                                <p style="margin:0;color:#0c5460;font-size:14px;">
                                    📎 <strong>Receipt Attached:</strong> Your payment receipt is attached to this email as a PDF file.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8f9fa;padding:30px;text-align:center;border-top:1px solid #eeeeee;">
                            <p style="color:#999999;font-size:12px;margin:0;">
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
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background:linear-gradient(135deg, #10b981, #059669);padding:40px 20px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:28px;">💰 Wallet Top-Up Successful!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="color:#333333;margin:0 0 20px 0;">Hi ${userName},</h2>
                            <p style="color:#666666;line-height:1.6;margin:0 0 20px 0;">
                                Your wallet has been topped up successfully!
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;margin:30px 0;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:10px 0;">
                                                    <strong style="color:#666;">Amount Added:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;">
                                                    <span style="color:#10b981;font-size:24px;font-weight:bold;">${transaction.amount} ${transaction.currency}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <strong style="color:#666;">New Balance:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <span style="color:#333;font-weight:bold;">${transaction.balance_after} ${transaction.currency}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <strong style="color:#666;">Transaction ID:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <span style="color:#333;">${transaction.transaction_id}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color:#d1ecf1;border-left:4px solid #0c5460;padding:15px;margin:20px 0;border-radius:4px;">
                                <p style="margin:0;color:#0c5460;font-size:14px;">
                                    📎 <strong>Receipt Attached:</strong> Your top-up receipt is attached to this email as a PDF file.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8f9fa;padding:30px;text-align:center;border-top:1px solid #eeeeee;">
                            <p style="color:#999999;font-size:12px;margin:0;">
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
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;padding:20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background:linear-gradient(135deg, #6366f1, #8b5cf6);padding:40px 20px;text-align:center;">
                            <h1 style="color:#ffffff;margin:0;font-size:28px;">✅ Bill Paid Successfully!</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:40px 30px;">
                            <h2 style="color:#333333;margin:0 0 20px 0;">Hi ${userName},</h2>
                            <p style="color:#666666;line-height:1.6;margin:0 0 20px 0;">
                                Your bill has been paid successfully from your wallet!
                            </p>
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;margin:30px 0;">
                                <tr>
                                    <td style="padding:25px;">
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding:10px 0;">
                                                    <strong style="color:#666;">Bill ID:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;">
                                                    <span style="color:#333;">#${bill.bill_id}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <strong style="color:#666;">Amount Paid:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <span style="color:#6366f1;font-size:24px;font-weight:bold;">${transaction.amount} ${transaction.currency}</span>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <strong style="color:#666;">Remaining Balance:</strong>
                                                </td>
                                                <td align="right" style="padding:10px 0;border-top:1px solid #e0e0e0;">
                                                    <span style="color:#333;font-weight:bold;">${transaction.balance_after} ${transaction.currency}</span>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <div style="background-color:#d1ecf1;border-left:4px solid #0c5460;padding:15px;margin:20px 0;border-radius:4px;">
                                <p style="margin:0;color:#0c5460;font-size:14px;">
                                    📎 <strong>Receipt Attached:</strong> Your bill payment receipt is attached to this email as a PDF file.
                                </p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color:#f8f9fa;padding:30px;text-align:center;border-top:1px solid #eeeeee;">
                            <p style="color:#999999;font-size:12px;margin:0;">
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
}

module.exports = new EmailService();
