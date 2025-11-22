# 📧 Email Verification System

## Overview

The Email Verification System ensures that only users with valid email addresses can access PowerShare. This prevents fake accounts, spam, and improves security.

---

## ✨ Features

### 1. **Registration Flow with Email Verification**
- ✅ User registers → Verification email sent automatically
- ✅ Beautiful HTML email templates
- ✅ 24-hour verification link expiration
- ✅ JWT-based secure tokens

### 2. **Login Protection**
- ✅ Blocks unverified users from logging in
- ✅ Clear error message with instructions
- ✅ Link to resend verification email

### 3. **Verification Pages**
- ✅ Animated verification success page
- ✅ Error handling for expired/invalid links
- ✅ "Already verified" detection
- ✅ Resend verification page

### 4. **Email Templates**
- ✅ Verification email with branded design
- ✅ Welcome email after successful verification
- ✅ Mobile-responsive HTML emails
- ✅ Professional PowerShare branding

---

## 🗄️ Database Changes

### New Fields in `users` Table

```sql
ALTER TABLE users
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN email_verification_token VARCHAR(255) DEFAULT NULL,
ADD COLUMN email_verification_sent_at DATETIME DEFAULT NULL;
```

### Migration

Run the migration to add these fields:

```bash
cd /home/user/webprog/PowerShare
node runMigration.js
```

Or manually execute `/migrations/002_email_verification.sql`

---

## 🔌 API Endpoints

### 1. Register (Modified)
**POST** `/api/auth/register`

**Changes:**
- Now sends verification email automatically
- Returns `emailSent` status

**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Please check your email to verify your account.",
  "data": {
    "userId": 123,
    "emailSent": true
  }
}
```

---

### 2. Login (Modified)
**POST** `/api/auth/login`

**Changes:**
- Checks if email is verified before allowing login
- Returns 403 error if not verified

**Error Response (Unverified):**
```json
{
  "success": false,
  "message": "Please verify your email before logging in. Check your inbox for the verification link.",
  "emailVerified": false,
  "email": "user@example.com"
}
```

---

### 3. Verify Email (NEW)
**GET** `/api/auth/verify-email?token=<jwt_token>`

**Purpose:** Verify user's email address using token from email

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully! You can now login to your account.",
  "user": {
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

**Response (Already Verified):**
```json
{
  "success": true,
  "message": "Email already verified. You can login now.",
  "alreadyVerified": true
}
```

**Response (Invalid/Expired):**
```json
{
  "success": false,
  "message": "Invalid or expired verification link. Please request a new one."
}
```

---

### 4. Resend Verification (NEW)
**POST** `/api/auth/resend-verification`

**Purpose:** Resend verification email to user

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification email sent! Please check your inbox."
}
```

**Response (Already Verified):**
```json
{
  "success": false,
  "message": "Email is already verified. You can login now."
}
```

---

## 🎨 User Interface

### New Pages

#### 1. `/verify-email` - Email Verification Page
**Features:**
- Automatic verification on page load
- Loading state with spinner
- Success state with checkmark animation
- Error state with retry option
- "Already verified" state

**Flow:**
1. User clicks link in email
2. Redirected to `/verify-email?token=xyz`
3. Page automatically calls `/api/auth/verify-email`
4. Shows success or error message

#### 2. `/resend-verification` - Resend Verification Page
**Features:**
- Simple email input form
- Sends new verification email
- Success confirmation
- Back to login link

---

## 📧 Email Templates

### 1. Verification Email
**Subject:** ✅ Verify Your Email - PowerShare

**Content:**
- Welcome message
- Big "Verify Email Address" button
- Alternative link (copy-paste)
- 24-hour expiration notice
- PowerShare branding

### 2. Welcome Email
**Subject:** 🎉 Welcome to PowerShare!

**Sent:** After successful email verification

**Content:**
- Congratulations message
- "What's Next?" guide
- Features overview
- "Go to Dashboard" button

---

## 🔄 Complete User Journey

### Happy Path

```
1. User visits /register
   ↓
2. Fills registration form
   ↓
3. Clicks "Register"
   ↓
4. Account created
   ✉️ Verification email sent
   ↓
5. User opens email inbox
   ↓
6. Clicks "Verify Email Address" button
   ↓
7. Redirected to /verify-email?token=xyz
   ↓
8. Email verified automatically
   ✅ Success message shown
   ✉️ Welcome email sent
   ↓
9. Clicks "Login to Your Account"
   ↓
10. Logs in successfully
    ✅ Access granted
```

### Error Path (Expired Link)

```
1. User clicks verification link (expired)
   ↓
2. Redirected to /verify-email?token=xyz
   ↓
3. Token validation fails
   ❌ Error message shown
   ↓
4. Clicks "Request New Link"
   ↓
5. Redirected to /resend-verification
   ↓
6. Enters email address
   ↓
7. New verification email sent
   ✉️ Fresh 24-hour link
   ↓
8. Returns to step 6 of happy path
```

### Login Blocked Path

```
1. User tries to login (unverified)
   ↓
2. Enters email & password
   ↓
3. Credentials valid
   ❌ But email not verified
   ↓
4. Login blocked with message:
   "Please verify your email before logging in"
   ↓
5. User checks email or clicks resend link
```

---

## ⚙️ Configuration

### Environment Variables

Add to `.env`:

```env
# Application URL (for email links)
APP_URL=http://localhost:3000

# SMTP Configuration (already exists)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# JWT Secret (already exists)
JWT_SECRET=your_super_secret_jwt_key
```

### Email Service Setup

The system uses Nodemailer with Gmail SMTP. To enable:

1. **Use Gmail App Password** (not regular password)
   - Go to Google Account Settings
   - Security → 2-Step Verification
   - App Passwords → Generate new
   - Use that password in `SMTP_PASS`

2. **Or use another SMTP provider**
   - Update `SMTP_HOST`, `SMTP_PORT`
   - Update credentials

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Register new user
- [ ] Check email inbox for verification email
- [ ] Click verification link
- [ ] Verify success page loads
- [ ] Check welcome email received
- [ ] Try to login before verifying (should be blocked)
- [ ] Login after verification (should work)
- [ ] Try verification link twice (should say "already verified")
- [ ] Wait 25 hours and try expired link (should fail)
- [ ] Resend verification email
- [ ] Verify with new link

### Test Email Verification

```bash
# 1. Register a test user
POST /api/auth/register
{
  "full_name": "Test User",
  "email": "test@example.com",
  "password": "Test1234!",
  "phone": "+96170123456",
  "address": "Beirut, Lebanon",
  "role": "household"
}

# 2. Check console for verification token
# Token is logged: "✅ Verification email sent to: test@example.com"

# 3. Manually verify (for testing without email)
GET /api/auth/verify-email?token=<token_from_console>

# 4. Try to login
POST /api/auth/login
{
  "email": "test@example.com",
  "password": "Test1234!"
}
```

---

## 🐛 Troubleshooting

### Problem: Verification emails not sending

**Solutions:**
1. Check SMTP credentials in `.env`
2. Verify Gmail app password is correct
3. Check server logs for email errors
4. Try different SMTP provider (SendGrid, Mailgun)

### Problem: Token expired immediately

**Solution:**
- JWT tokens are valid for 24 hours
- Check server time is correct
- Ensure `JWT_SECRET` is set

### Problem: Verification link doesn't work

**Solutions:**
1. Check `APP_URL` in `.env` is correct
2. Verify token in URL is complete (not truncated)
3. Check browser console for errors

### Problem: Users can't find email

**Solutions:**
1. Check spam/junk folder
2. Add PowerShare sender to safe senders
3. Use "Resend Verification" feature

---

## 🔒 Security Features

1. **JWT Tokens**
   - Cryptographically signed
   - Time-limited (24 hours)
   - Single-use (cleared after verification)

2. **Purpose Validation**
   - Token includes `purpose: 'email_verification'`
   - Prevents token reuse for other purposes

3. **Database Checks**
   - Verifies user exists
   - Checks token matches database
   - Prevents duplicate verifications

4. **Existing Users**
   - Migration marks existing users as verified
   - No disruption to current users

---

## 📊 Database Queries

### Check Verification Status

```sql
SELECT email, email_verified, email_verification_sent_at
FROM users
WHERE email = 'user@example.com';
```

### List Unverified Users

```sql
SELECT full_name, email, created_at
FROM users
WHERE email_verified = FALSE
ORDER BY created_at DESC;
```

### Manually Verify User (Emergency)

```sql
UPDATE users
SET email_verified = TRUE,
    email_verification_token = NULL,
    email_verification_sent_at = NULL
WHERE email = 'user@example.com';
```

---

## 🎯 Best Practices

1. **Don't skip verification**
   - Always require email verification for new users
   - Maintain data quality

2. **Clear communication**
   - Tell users to check spam folder
   - Provide resend option prominently

3. **Monitor verification rates**
   - Track how many users verify
   - Improve emails if rate is low

4. **Grandfather existing users**
   - Mark old accounts as verified
   - Only enforce for new signups

5. **Test emails regularly**
   - Ensure SMTP works
   - Check template rendering

---

## 🔮 Future Enhancements

Potential improvements:

- [ ] SMS verification as alternative
- [ ] Magic link login (passwordless)
- [ ] Email change verification
- [ ] Verification reminders after 24h
- [ ] Admin panel to manually verify users
- [ ] Verification statistics dashboard

---

## 📝 Code Files

### New Files Created

```
BLL/
  services/
    emailService.js          - Email sending service with templates

migrations/
  002_email_verification.sql - Database migration

PL/
  views/
    verify-email.ejs         - Verification page
    resend-verification.ejs  - Resend page
```

### Modified Files

```
DAL/
  userDAL.js                 - Added verification methods

BLL/
  controllers/
    authController.js        - Added verification logic
  routes/
    auth.js                  - Added verification routes
    views.js                 - Added verification views
```

---

## 🆘 Support

If you encounter issues:

1. Check server logs for errors
2. Verify SMTP configuration
3. Test with a real email address
4. Check firewall/network settings
5. Contact system administrator

---

**Email Verification System v1.0**
Built for PowerShare - Secure, Professional, Reliable 🚀
