const express = require('express');
const router = express.Router();
const pool = require('../../DAL/dbConnection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validatePasswordPolicy } = require('../middleware/validator');

router.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { title: 'Forgot Password', message: null });
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      return res.render('forgot-password', { title: 'Forgot Password', message: 'If an account exists, a reset link was sent.' });
    }

    const user = rows[0];
    const token = jwt.sign({ user_id: user.user_id, email }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const resetLink = `http://localhost:${process.env.PORT || 3000}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"PowerShare" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Link',
      html: `
        <p>Click the button below to reset your password:</p>
        <a href="${resetLink}" style="
          display: inline-block;
          padding: 10px 20px;
          background-color: #3495B9;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        ">Reset Password</a>
        <p style="margin-top:10px;">This link expires in 15 minutes.</p>
      `
    });

    res.render('forgot-password', { title: 'Forgot Password', message: 'If an account exists, a reset link was sent. Check your email.' });
  } catch (err) {
    console.error(err);
    res.render('forgot-password', { title: 'Forgot Password', message: 'Server error: ' + err.message });
  }
});

router.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) return res.send('Invalid reset link');

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.render('reset-password', { title: 'Reset Password', token, message: null });
  } catch (err) {
    res.send('Reset link expired or invalid');
  }
});

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.render('reset-password', { 
      title: 'Reset Password', 
      token: token || '', 
      message: 'All fields required' 
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    const validationErrors = validatePasswordPolicy(newPassword);
    if (validationErrors.length > 0) {
      return res.render('reset-password', { 
        title: 'Reset Password', 
        token, 
        message: validationErrors.join('. ') 
      });
    }
    
    const [rows] = await pool.query(
      'SELECT password_hash FROM users WHERE user_id = ?', 
      [payload.user_id]
    );
    
    if (!rows.length) {
      return res.render('reset-password', { 
        title: 'Reset Password', 
        token: '', 
        message: 'User not found' 
      });
    }
    
    const currentPasswordHash = rows[0].password_hash;
    
    const isSamePassword = await bcrypt.compare(newPassword, currentPasswordHash);
    if (isSamePassword) {
      return res.render('reset-password', { 
        title: 'Reset Password', 
        token, 
        message: 'New password must be different from the current password' 
      });
    }
    
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, payload.user_id]);

    res.render('reset-password', { 
      title: 'Reset Password', 
      token: '', 
      message: 'Password successfully reset! You can now login with your new password.' 
    });
  } catch (err) {
    console.error(err);
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      res.render('reset-password', { 
        title: 'Reset Password', 
        token: '', 
        message: 'Reset link expired or invalid' 
      });
    } else {
      res.render('reset-password', { 
        title: 'Reset Password', 
        token: token || '', 
        message: 'An error occurred. Please try again.' 
      });
    }
  }
});

module.exports = router;
