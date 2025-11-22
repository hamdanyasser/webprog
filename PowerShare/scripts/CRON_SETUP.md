# Automated Billing - Cron Job Setup Guide

This guide explains how to set up automated monthly bill generation for PowerShare.

## Overview

The automated billing system generates bills for all active subscriptions on the 1st of each month and includes:
- **Monthly Bill Generation** - Creates bills automatically
- **Overdue Checking** - Marks late bills as overdue
- **Payment Reminders** - Notifies users before due date

---

## Option 1: Using Node-Cron (Recommended)

This approach runs cron jobs within your Node.js application.

### Steps:

1. **Install node-cron package:**
   ```bash
   npm install node-cron
   ```

2. **Enable cron jobs in your server:**

   Add this line to `server.js` (after the database connection):
   ```javascript
   // Setup automated billing cron jobs
   require('./scripts/setupCronJobs');
   ```

3. **Restart your server:**
   ```bash
   npm start
   ```

4. **Verify it's running:**
   You should see this in the console:
   ```
   ✅ Cron jobs initialized:
      📅 Monthly Billing: 2:00 AM on 1st of each month
      🔍 Overdue Check: 3:00 AM daily
      📧 Payment Reminders: 10:00 AM daily
   ```

### Schedule Details:

| Job | Schedule | Cron Expression | Description |
|-----|----------|-----------------|-------------|
| Monthly Billing | 2:00 AM on 1st | `0 2 1 * *` | Generates bills for all active subscriptions |
| Overdue Check | 3:00 AM daily | `0 3 * * *` | Marks pending bills past due date as overdue |
| Payment Reminders | 10:00 AM daily | `0 10 * * *` | Sends reminders 3 days before due date |

### Customizing Schedule:

Edit `scripts/setupCronJobs.js` and change the cron expressions:

```javascript
// Example: Run billing at 4:00 AM instead of 2:00 AM
const monthlyBillingJob = cron.schedule('0 4 1 * *', async () => {
    // ...
});
```

**Cron Expression Format:**
```
* * * * *
│ │ │ │ │
│ │ │ │ └── Day of week (0-7, 0 and 7 are Sunday)
│ │ │ └──── Month (1-12)
│ │ └────── Day of month (1-31)
│ └──────── Hour (0-23)
└────────── Minute (0-59)
```

---

## Option 2: Using System Cron (Linux/macOS)

This approach uses the operating system's cron daemon.

### Steps:

1. **Make the script executable:**
   ```bash
   chmod +x /path/to/PowerShare/scripts/cronBillingJob.js
   ```

2. **Open crontab:**
   ```bash
   crontab -e
   ```

3. **Add this line:**
   ```bash
   0 2 1 * * /usr/bin/node /path/to/PowerShare/scripts/cronBillingJob.js >> /var/log/powershare-billing.log 2>&1
   ```

   **Important:** Replace `/path/to/PowerShare` with your actual project path.

4. **Save and exit** (Ctrl+X, then Y, then Enter in nano)

5. **Verify it's scheduled:**
   ```bash
   crontab -l
   ```

### Viewing Logs:

```bash
tail -f /var/log/powershare-billing.log
```

---

## Option 3: Using PM2 (Production)

If you're using PM2 to manage your Node.js app:

1. **Install PM2 cron module:**
   ```bash
   pm2 install pm2-cron
   ```

2. **Add to ecosystem.config.js:**
   ```javascript
   module.exports = {
     apps: [{
       name: 'powershare',
       script: './server.js',
       // ... other configs
     }, {
       name: 'powershare-billing-cron',
       script: './scripts/cronBillingJob.js',
       cron_restart: '0 2 1 * *', // 2:00 AM on 1st of month
       autorestart: false
     }]
   };
   ```

3. **Reload PM2:**
   ```bash
   pm2 reload ecosystem.config.js
   pm2 save
   ```

---

## Manual Trigger (Testing)

You can manually trigger bill generation anytime:

### Via Admin Dashboard:
1. Login as admin
2. Go to `/admin/billing-settings`
3. Click "Generate Monthly Bills Now"

### Via Command Line:
```bash
node scripts/cronBillingJob.js
```

### Via API:
```bash
curl -X POST http://localhost:3000/api/bills/automation/generate-monthly \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

---

## Configuration

All settings can be configured in the Admin Dashboard at `/admin/billing-settings`:

- ✅ **Enable/Disable** automated billing
- 📅 **Billing day of month** (1-28)
- ⏳ **Payment due days** (days after billing period)
- 📧 **Email notifications** (on/off)
- 📱 **SMS notifications** (on/off)
- ⏰ **Reminder days** before due date

---

## Troubleshooting

### Cron job not running:

1. **Check if automated billing is enabled:**
   - Go to Admin Dashboard > Billing Settings
   - Ensure "Enable Automated Billing" is set to "Enabled"

2. **Check server logs:**
   ```bash
   # If using PM2
   pm2 logs powershare

   # If using system cron
   tail -f /var/log/powershare-billing.log
   ```

3. **Verify node-cron is installed:**
   ```bash
   npm list node-cron
   ```

4. **Test manually:**
   ```bash
   node scripts/cronBillingJob.js
   ```

### Bills not being generated:

1. Check if there are active subscriptions
2. Check if bills already exist for the current month
3. Review error logs in console or log file
4. Verify database connection is working

### Timezone issues:

The cron jobs use `Asia/Beirut` timezone by default. To change:

Edit `scripts/setupCronJobs.js`:
```javascript
cron.schedule('0 2 1 * *', async () => {
    // ...
}, {
    timezone: "Your/Timezone" // e.g., "America/New_York"
});
```

---

## Database Migration

Before using automated billing, ensure you've run the migration:

```bash
node runMigration.js 003_automated_billing.sql
```

This creates the necessary platform settings for billing automation.

---

## Best Practices

1. **Test first** - Run manual generation before setting up cron
2. **Monitor logs** - Check logs after the first automated run
3. **Backup database** - Before enabling automation
4. **Set correct timezone** - Match your server's timezone
5. **Email limits** - Be aware of email sending limits (Gmail: 500/day)

---

## Support

If you encounter issues:
1. Check the logs (console or log file)
2. Verify all settings in Admin Dashboard
3. Test manual generation first
4. Check database for existing bills

For more information, see the main project documentation.
