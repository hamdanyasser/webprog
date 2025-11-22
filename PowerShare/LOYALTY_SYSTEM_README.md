# 🎁 PowerShare Loyalty & Rewards System

## Overview

The PowerShare Loyalty & Rewards System is a comprehensive gamification and incentive platform that rewards users for payments, encourages early payments with discounts, and automatically applies late fees to overdue bills.

---

## ✨ Features

### 1. **Loyalty Points System**
- ✅ Earn points on every payment (configurable points per dollar)
- ✅ Redeem points for bill discounts
- ✅ Track points transaction history
- ✅ Configurable minimum points for redemption
- ✅ Maximum redemption percentage per bill

### 2. **Tier System**
- ✅ Three tiers: Bronze, Silver, Gold
- ✅ Automatic tier progression based on points balance
- ✅ Tier-specific benefits and discounts
- ✅ Visual tier badges and progress tracking

### 3. **Early Payment Discounts**
- ✅ Automatic discount for payments made early
- ✅ Configurable discount percentage and threshold
- ✅ Encourages on-time payments

### 4. **Late Payment Fees**
- ✅ Automatic late fee application after grace period
- ✅ Configurable fee percentage and grace period
- ✅ Automatic notifications to users

### 5. **Admin Controls**
- ✅ Full configuration dashboard
- ✅ Real-time statistics
- ✅ Manual points awarding
- ✅ Settings management

---

## 🗄️ Database Schema

### New Tables Created

#### `loyalty_points_transactions`
```sql
- transaction_id (PK)
- user_id (FK to users)
- points_amount (INT) - positive for earned, negative for redeemed
- transaction_type (enum: earned, redeemed, bonus, expired, adjustment)
- reference_type (enum: payment, bill, subscription, referral, manual)
- reference_id (INT)
- description (TEXT)
- created_at (TIMESTAMP)
```

#### `loyalty_tiers`
```sql
- tier_id (PK)
- tier_name (VARCHAR) - Bronze, Silver, Gold
- min_points (INT)
- max_points (INT)
- benefits_description (TEXT)
- discount_percentage (DECIMAL)
```

#### `platform_settings`
```sql
- setting_id (PK)
- setting_key (VARCHAR UNIQUE)
- setting_value (TEXT)
- setting_type (enum: string, number, boolean, json)
- description (TEXT)
- updated_at (TIMESTAMP)
```

### Modified Tables

#### `users` table additions:
- `loyalty_points_balance` (INT, default 0)

#### `bills` table additions:
- `early_payment_discount` (DECIMAL, default 0)
- `late_payment_fee` (DECIMAL, default 0)
- `points_redeemed` (INT, default 0)
- `points_discount_amount` (DECIMAL, default 0)
- `final_amount` (DECIMAL, computed column)

---

## 🔌 API Endpoints

### User Endpoints

#### GET `/api/loyalty/dashboard`
Get complete loyalty dashboard data
```json
{
  "balance": 1250,
  "currentTier": { ... },
  "nextTier": { ... },
  "summary": { ... },
  "recentTransactions": [ ... ],
  "settings": { ... }
}
```

#### GET `/api/loyalty/points`
Get user's points balance

#### GET `/api/loyalty/transactions?limit=50`
Get points transaction history

#### POST `/api/loyalty/redeem`
Redeem points on a bill
```json
{
  "bill_id": 123,
  "points_to_redeem": 500
}
```

#### GET `/api/loyalty/tiers`
Get all loyalty tiers (public)

#### GET `/api/loyalty/my-tier`
Get user's current tier

### Admin Endpoints

#### GET `/api/loyalty/settings`
Get all platform settings (admin only)

#### PUT `/api/loyalty/settings`
Update a setting (admin only)
```json
{
  "setting_key": "loyalty_points_per_dollar",
  "setting_value": "1.5"
}
```

#### POST `/api/loyalty/award-points`
Manually award points to a user (admin only)
```json
{
  "user_id": 123,
  "points": 500,
  "description": "Bonus for being a great customer"
}
```

#### GET `/api/loyalty/statistics`
Get loyalty program statistics (admin only)

---

## 🎨 User Interface

### User Pages

#### `/loyalty-rewards`
- Points balance display
- Current tier badge
- Progress to next tier
- Earning summary
- Recent transactions
- How it works guide

### Admin Pages

#### `/admin/loyalty-settings`
- Configure all loyalty settings
- Enable/disable features
- Set discount and fee percentages
- View program statistics

---

## ⚙️ Configuration

### Default Settings

```javascript
{
  loyalty_points_per_dollar: 1,           // 1 point per $1 spent
  points_redemption_value: 0.01,          // 100 points = $1
  min_points_to_redeem: 100,              // Minimum 100 points to redeem

  early_payment_discount_enabled: true,
  early_payment_discount_percentage: 2,   // 2% discount
  early_payment_days_threshold: 5,        // Pay 5+ days early

  late_payment_fee_enabled: true,
  late_payment_fee_percentage: 5,         // 5% late fee
  late_payment_grace_period_days: 3,      // 3 days grace period

  max_points_redemption_percentage: 50    // Max 50% of bill with points
}
```

### Loyalty Tiers

| Tier | Min Points | Max Points | Benefits |
|------|-----------|------------|----------|
| Bronze | 0 | 999 | Earn 1 point per $1 spent |
| Silver | 1,000 | 4,999 | Earn 1.2 points per $1 + 5% discount |
| Gold | 5,000 | ∞ | Earn 1.5 points per $1 + 10% discount |

---

## 🔄 Payment Flow

### When a Payment is Made:

1. **Check for Early Payment**
   - If paid ≥5 days before due date → Apply 2% discount

2. **Process Payment**
   - Create payment record
   - Update bill status to 'paid'

3. **Award Points**
   - Calculate: `points = payment_amount × points_per_dollar`
   - Create points transaction
   - Update user's points balance

4. **Send Notification**
   - Confirm payment
   - Show points earned

### When Points are Redeemed:

1. **Validate**
   - Check sufficient balance
   - Check minimum redemption threshold
   - Check maximum redemption percentage

2. **Process Redemption**
   - Deduct points from balance
   - Apply discount to bill
   - Create transaction record

3. **Update Bill**
   - Set `points_redeemed`
   - Set `points_discount_amount`
   - Recalculate `final_amount`

---

## 📅 Scheduled Tasks

### Late Fee Processing

Create a cron job to run daily:

```javascript
const lateFeeService = require('./BLL/services/lateFeeService');

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await lateFeeService.processLateFees();
});
```

This will:
1. Find bills past due date + grace period
2. Calculate and apply late fees
3. Send notifications to users
4. Mark bills as 'overdue'

---

## 🚀 Installation & Setup

### 1. Run the Migration

```bash
cd /home/user/webprog/PowerShare
node runMigration.js
```

This will:
- Create all loyalty tables
- Add columns to existing tables
- Insert default tiers
- Insert default settings

### 2. Verify Installation

Check that these tables exist:
- `loyalty_points_transactions`
- `loyalty_tiers`
- `platform_settings`

### 3. Access the Features

**Users:**
- Navigate to `/loyalty-rewards` to view points

**Admins:**
- Navigate to `/admin/loyalty-settings` to configure

---

## 📊 Usage Examples

### Example 1: User Makes Payment

```
1. User has bill of $75
2. User pays 7 days before due date
3. System applies 2% early discount = $1.50 off
4. Final payment: $73.50
5. Points earned: 73 points (73.50 × 1 = 73)
6. User notified: "Payment successful! You earned 73 points!"
```

### Example 2: User Redeems Points

```
1. User has 1,000 points
2. User has pending bill of $100
3. User redeems 500 points
4. Discount applied: $5 (500 × $0.01)
5. New bill total: $95
6. Remaining points: 500
```

### Example 3: Late Fee Applied

```
1. Bill due: Jan 1
2. Grace period: 3 days
3. On Jan 5 (4 days after due), late fee applied
4. Original bill: $75
5. Late fee (5%): $3.75
6. New total: $78.75
7. User notified about late fee
```

---

## 🔧 Customization

### Changing Points Value

To make points more valuable:

```javascript
// In admin settings
points_redemption_value: 0.02  // 50 points = $1 (instead of 100)
```

### Adding New Tiers

```sql
INSERT INTO loyalty_tiers (tier_name, min_points, max_points, benefits_description, discount_percentage)
VALUES ('Platinum', 10000, NULL, 'Earn 2 points per $1 + 15% discount', 15.00);
```

### Disabling Late Fees

```javascript
// In admin settings
late_payment_fee_enabled: false
```

---

## 🐛 Troubleshooting

### Points Not Being Awarded

1. Check payment was successful (status = 'completed')
2. Verify `loyalty_points_per_dollar` setting
3. Check loyalty_points_transactions table for records

### Early Discount Not Applied

1. Verify `early_payment_discount_enabled = true`
2. Check payment was made ≥ threshold days before due date
3. Verify bill has `early_payment_discount` field

### Late Fees Not Processing

1. Ensure cron job is running
2. Check `late_payment_fee_enabled = true`
3. Verify grace period setting
4. Check server logs for errors

---

## 📈 Analytics & Reporting

### View Total Points Issued

```sql
SELECT SUM(points_amount) as total_issued
FROM loyalty_points_transactions
WHERE points_amount > 0;
```

### View Top Users by Points

```sql
SELECT full_name, loyalty_points_balance
FROM users
WHERE role IN ('household', 'owner')
ORDER BY loyalty_points_balance DESC
LIMIT 10;
```

### View Redemption Rate

```sql
SELECT
  (SELECT SUM(ABS(points_amount)) FROM loyalty_points_transactions WHERE transaction_type = 'redeemed') /
  (SELECT SUM(points_amount) FROM loyalty_points_transactions WHERE points_amount > 0) * 100 as redemption_rate_percent;
```

---

## 🎯 Best Practices

1. **Set Reasonable Point Values**
   - Don't make points too easy to earn
   - Balance between rewarding users and business costs

2. **Communicate Clearly**
   - Explain how points work
   - Show clear value proposition

3. **Monitor Redemptions**
   - Track redemption rates
   - Adjust settings if too high/low

4. **Grace Periods**
   - Don't set grace period too short
   - 3-7 days is reasonable

5. **Early Payment Incentives**
   - Make discount worthwhile (2-5%)
   - Set threshold high enough (5-7 days)

---

## 🆘 Support & Maintenance

### Regular Tasks

- **Weekly**: Review loyalty statistics
- **Monthly**: Analyze redemption patterns
- **Quarterly**: Adjust tier thresholds if needed
- **Annually**: Review and optimize point values

### Monitoring

Watch for:
- Unusual point balances
- High redemption rates
- Late fee application errors
- Database performance on transactions table

---

## 📝 Change Log

### Version 1.0.0 (2025-01-22)
- Initial release
- Basic points system
- Tier system (Bronze, Silver, Gold)
- Early payment discounts
- Late payment fees
- Admin configuration dashboard
- User loyalty dashboard

---

## 🔮 Future Enhancements

Potential features to add:
- [ ] Points expiration after X months
- [ ] Referral bonuses
- [ ] Seasonal multipliers (2x points events)
- [ ] Points transfer between users
- [ ] Gift card redemption options
- [ ] Mobile push notifications for points
- [ ] Gamification badges and achievements

---

## 📞 Contact

For questions or issues with the loyalty system:
- Check the troubleshooting section above
- Review the API documentation
- Contact system administrator

---

**Built with ❤️ for PowerShare - Making electricity sharing rewarding!**
