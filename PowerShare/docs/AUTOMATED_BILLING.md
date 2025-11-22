# Automated Bill Generation System

## Overview

The Automated Bill Generation system automatically creates monthly bills for all active subscriptions, sends notifications to users, and manages the entire billing lifecycle.

---

## Features

### 1. Automated Monthly Billing
- Generates bills on the 1st of each month (configurable)
- Creates bills for all active subscriptions
- Prevents duplicate bills for the same period
- Calculates billing period and due dates automatically

### 2. Manual Bill Generation
- Admin can trigger bill generation anytime
- Owner can generate bills for specific generators
- Instant feedback with detailed statistics

### 3. Email Notifications
- Professional HTML email templates
- Sent automatically when bills are generated
- Includes bill details, amount, and due date
- Direct link to view and pay bills

### 4. In-App Notifications
- Real-time notifications in user dashboard
- Bill creation alerts
- Payment reminders

### 5. Billing Statistics
- Total bills generated
- Pending/Paid/Overdue breakdown
- Total revenue tracking
- Monthly performance metrics

### 6. Configurable Settings
- Enable/disable automation
- Set billing day of month
- Configure payment due period
- Toggle email/SMS notifications
- Set reminder schedules

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Cron Job Scheduler                      │
│               (node-cron or system cron)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              billingService.js (BLL Layer)                  │
│  • generateMonthlyBills()                                   │
│  • generateBillsForGenerator()                              │
│  • getBillingSettings()                                     │
│  • getBillingStatistics()                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
    ┌────────┐  ┌────────┐  ┌────────────┐
    │billDAL │  │emailSvc│  │notification│
    │        │  │        │  │    DAL     │
    └────────┘  └────────┘  └────────────┘
         │
         ▼
    ┌────────────────────────────┐
    │     MySQL Database         │
    │  • bills                   │
    │  • subscriptions           │
    │  • platform_settings       │
    └────────────────────────────┘
```

### File Structure

```
PowerShare/
├── BLL/
│   ├── controllers/
│   │   └── billingAutomationController.js    # API endpoints
│   ├── services/
│   │   ├── billingService.js                 # Core logic
│   │   └── emailService.js                   # Email templates
│   └── routes/
│       └── bills.js                          # API routes
├── PL/
│   └── views/
│       └── admin-billing-settings.ejs        # Admin UI
├── scripts/
│   ├── cronBillingJob.js                     # Standalone cron script
│   ├── setupCronJobs.js                      # Node-cron setup
│   └── CRON_SETUP.md                         # Setup guide
├── migrations/
│   └── 003_automated_billing.sql             # Database migration
└── docs/
    └── AUTOMATED_BILLING.md                  # This file
```

---

## API Endpoints

### 1. Generate Monthly Bills (Admin Only)
```http
POST /api/bills/automation/generate-monthly
Authorization: Cookie (JWT)
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 42 bills",
  "data": {
    "generated": 42,
    "skipped": 5,
    "errors": [],
    "duration": "2.34"
  }
}
```

### 2. Generate Bills for Specific Generator (Owner/Admin)
```http
POST /api/bills/automation/generator/:generatorId/generate
Authorization: Cookie (JWT)
```

**Response:**
```json
{
  "success": true,
  "message": "Generated 12 bills for generator 7",
  "data": {
    "generated": 12,
    "skipped": 2,
    "errors": []
  }
}
```

### 3. Get Billing Statistics (Owner/Admin)
```http
GET /api/bills/automation/statistics
Authorization: Cookie (JWT)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_bills": 156,
    "total_amount": 4680.00,
    "pending_bills": 89,
    "paid_bills": 64,
    "overdue_bills": 3
  }
}
```

### 4. Get Billing Settings (Admin Only)
```http
GET /api/bills/automation/settings
Authorization: Cookie (JWT)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "automatedBillingEnabled": true,
    "billingDayOfMonth": 1,
    "paymentDueDays": 7,
    "sendEmailNotifications": true,
    "sendSmsNotifications": false
  }
}
```

---

## Database Schema

### Bills Table
```sql
CREATE TABLE bills (
    bill_id INT PRIMARY KEY AUTO_INCREMENT,
    subscription_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    due_date DATE NOT NULL,
    status ENUM('pending', 'paid', 'overdue') DEFAULT 'pending',
    paid_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(subscription_id)
);
```

### Platform Settings
```sql
CREATE TABLE platform_settings (
    setting_id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(255) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Billing-Related Settings:**
- `automated_billing_enabled` (boolean) - Enable/disable automation
- `billing_day_of_month` (number) - Day to generate bills (1-28)
- `payment_due_days` (number) - Days until payment is due
- `send_bill_email_notifications` (boolean) - Send email notifications
- `send_bill_sms_notifications` (boolean) - Send SMS notifications
- `billing_reminder_days_before` (number) - Days before due date for reminders
- `overdue_check_enabled` (boolean) - Auto-check for overdue bills

---

## How It Works

### Monthly Bill Generation Flow

```
1. Cron job triggers on 1st of month (2:00 AM)
   │
   ▼
2. Check if automated billing is enabled
   │
   ├─► If disabled: Exit
   │
   ▼
3. Get all active subscriptions with user details
   │
   ▼
4. Calculate billing period (current month)
   │
   ▼
5. For each subscription:
   │
   ├─► Check if bill already exists for this period
   │   ├─► If exists: Skip
   │   └─► If not: Continue
   │
   ├─► Create bill in database
   │
   ├─► Send email notification (if enabled)
   │
   └─► Create in-app notification
   │
   ▼
6. Return summary (generated, skipped, errors)
```

### Billing Period Calculation

```javascript
// Current month
const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

// Due date = End of month + payment_due_days
const dueDate = new Date(billingPeriodEnd);
dueDate.setDate(dueDate.getDate() + paymentDueDays);
```

**Example:**
- Bill generated on: January 1, 2025
- Billing period: January 1 - January 31, 2025
- Payment due days: 7
- Due date: February 7, 2025

---

## Email Template

### Bill Notification Email

**Subject:** `💵 New Bill Available - $30.00`

**Content:**
```
Hi John Doe,

Your PowerShare bill for [Generator Name] is now ready.

┌─────────────────────────────────┐
│ Plan: Premium Plan              │
│ Amount: $30.00                  │
│ Billing Period: Jan 1 - Jan 31 │
│ Due Date: Feb 7, 2025          │
└─────────────────────────────────┘

[View & Pay Bill Button]

Thank you for using PowerShare!
```

---

## Cron Job Setup

### Option 1: Node-Cron (Recommended)

1. Install package:
   ```bash
   npm install node-cron
   ```

2. Enable in `server.js`:
   ```javascript
   require('./scripts/setupCronJobs');
   ```

3. Restart server

### Option 2: System Cron

1. Make script executable:
   ```bash
   chmod +x scripts/cronBillingJob.js
   ```

2. Add to crontab:
   ```bash
   crontab -e
   ```

3. Add line:
   ```
   0 2 1 * * /usr/bin/node /path/to/PowerShare/scripts/cronBillingJob.js
   ```

See `scripts/CRON_SETUP.md` for detailed instructions.

---

## Configuration

### Admin Dashboard

Navigate to: `/admin/billing-settings`

**Available Settings:**
- ✅ Enable/Disable automated billing
- 📅 Billing day of month (1-28)
- ⏳ Payment due days (1-30)
- 📧 Email notifications (on/off)
- 📱 SMS notifications (on/off)
- ⏰ Payment reminder days (1-14)
- 🔍 Overdue check (on/off)

### Manual Generation

Admins can manually trigger bill generation:
- Click "Generate Monthly Bills Now" button
- View real-time progress and results
- See detailed statistics

---

## Error Handling

### Duplicate Prevention
The system checks for existing bills before creating new ones:
```javascript
const existingBill = await this.checkExistingBill(
    subscriptionId,
    billingPeriodStart,
    billingPeriodEnd
);

if (existingBill) {
    console.log('Skipping - Bill already exists');
    continue;
}
```

### Error Tracking
All errors are logged and returned in the response:
```javascript
results.errors.push({
    subscription_id: subscription.subscription_id,
    error: error.message
});
```

### Transaction Safety
Each bill creation is wrapped in error handling to prevent one failure from stopping the entire process.

---

## Testing

### Manual Testing

1. **Enable automated billing:**
   - Go to `/admin/billing-settings`
   - Set "Enable Automated Billing" to "Enabled"

2. **Create test subscriptions:**
   - Create at least 2-3 active subscriptions
   - Ensure users have verified email addresses

3. **Run manual generation:**
   - Click "Generate Monthly Bills Now"
   - Verify bills are created
   - Check email inbox for notifications

4. **Run standalone script:**
   ```bash
   node scripts/cronBillingJob.js
   ```

5. **Verify results:**
   - Check bills table in database
   - Verify no duplicate bills
   - Check notification emails

### Automated Testing

```javascript
// Test billing service
const billingService = require('./BLL/services/billingService');

async function test() {
    const result = await billingService.generateMonthlyBills();
    console.log(result);
}

test();
```

---

## Performance

### Optimization Techniques

1. **Batch Processing**
   - Processes subscriptions sequentially
   - Prevents database connection overflow

2. **Duplicate Check**
   - Single query per subscription
   - Uses indexed columns (subscription_id, dates)

3. **Error Isolation**
   - Try-catch per subscription
   - One failure doesn't stop others

4. **Connection Pooling**
   - MySQL connection pool (mysql2)
   - Efficient query execution

### Expected Performance

| Subscriptions | Processing Time |
|--------------|-----------------|
| 100          | ~3-5 seconds    |
| 1,000        | ~30-50 seconds  |
| 10,000       | ~5-8 minutes    |

---

## Security

### Access Control

- **Admin Only:**
  - Generate monthly bills
  - View/edit billing settings
  - View all statistics

- **Owner/Admin:**
  - Generate bills for owned generators
  - View statistics for owned generators

- **User:**
  - View own bills
  - Receive notifications

### Authentication

All endpoints require JWT authentication:
```javascript
router.post('/automation/generate-monthly',
    authenticate,           // Verify JWT
    authorize('admin'),     // Check role
    controller.generateMonthlyBills
);
```

### Data Validation

- Email addresses verified before sending
- Subscription status checked (active only)
- Duplicate prevention
- Amount validation

---

## Monitoring & Logs

### Console Logs

```
=============================================================
🤖 AUTOMATED BILLING JOB STARTED
=============================================================
⏰ Execution Time: 2025-01-01T02:00:00.000Z
=============================================================
✅ Automated billing is ENABLED
📅 Billing Day of Month: 1
⏳ Payment Due Days: 7
📧 Email Notifications: ON
=============================================================
📋 Found 156 active subscriptions
📅 Billing period: 2025-01-01 to 2025-01-31
⏰ Due date: 2025-02-07
...
✅ Created bill #789 for subscription 42 - $30.00
...
📊 Summary: 156 generated, 0 skipped, 0 errors
✨ Bill generation complete in 4.23s
=============================================================
```

### Database Logs

All operations are logged in the bills table with timestamps:
- `created_at` - When bill was generated
- `paid_at` - When bill was paid
- `status` - Current status (pending/paid/overdue)

---

## Troubleshooting

### Issue: Bills not generating

**Possible Causes:**
1. Automated billing is disabled
2. No active subscriptions
3. Bills already exist for current period
4. Cron job not running

**Solutions:**
1. Check `/admin/billing-settings` - ensure enabled
2. Verify subscriptions table has active entries
3. Check bills table for existing entries
4. Verify cron job is scheduled correctly

### Issue: Emails not sending

**Possible Causes:**
1. Email notifications disabled
2. SMTP not configured
3. User email not verified
4. Email sending limit reached

**Solutions:**
1. Enable in billing settings
2. Check `.env` for SMTP credentials
3. Verify user email_verified = TRUE
4. Check email service limits (Gmail: 500/day)

### Issue: Duplicate bills

**Possible Causes:**
1. Cron job running multiple times
2. Manual trigger during automation

**Solutions:**
1. Check crontab for duplicate entries
2. System prevents duplicates automatically
3. Check bills table for period conflicts

---

## Future Enhancements

### Planned Features

1. **SMS Notifications**
   - Integration with SMS gateway
   - Configurable message templates

2. **Payment Plans**
   - Installment billing
   - Partial payment support

3. **Discount Codes**
   - Promotional discounts
   - Loyalty discounts

4. **Invoice PDF Generation**
   - Downloadable PDF invoices
   - Email PDF attachments

5. **Multi-Currency Support**
   - USD, LBP, EUR support
   - Real-time exchange rates

6. **Advanced Analytics**
   - Revenue forecasting
   - Payment trends
   - Churn analysis

---

## Support

For issues or questions:
1. Check this documentation
2. Review `scripts/CRON_SETUP.md`
3. Check server logs
4. Test manual generation first
5. Contact system administrator

---

## License

This automated billing system is part of the PowerShare platform.
All rights reserved.
