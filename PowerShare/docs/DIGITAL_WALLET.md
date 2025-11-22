# PowerShare Digital Wallet System

## Overview

The Digital Wallet System provides PowerShare users with a convenient way to manage their balance, top-up funds, pay bills, and transfer money to other users. The system supports multi-currency operations (USD, LBP, EUR) and includes automated features like low balance alerts and auto top-up.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [User Interface](#user-interface)
6. [Installation](#installation)
7. [Usage Examples](#usage-examples)
8. [Security](#security)
9. [Performance](#performance)
10. [Troubleshooting](#troubleshooting)

---

## Features

### Core Features

- **Multi-Currency Support** - USD, LBP, and EUR wallets
- **Wallet Balance Management** - View and manage balances in all supported currencies
- **Top-Up Operations** - Add funds via multiple payment methods
- **Bill Payment** - Pay bills directly from wallet balance
- **Wallet-to-Wallet Transfers** - Transfer money to other PowerShare users
- **Transaction History** - Complete history with filtering and export

### Advanced Features

- **Low Balance Alerts** - Automated notifications when balance falls below threshold
- **Auto Top-Up** - Automatically top up when balance is low
- **Transaction Statistics** - View spending patterns and analytics
- **CSV Export** - Export transaction history to CSV
- **Refund Processing** - Handle refunds to wallet
- **Bonus & Rewards** - Add bonuses, cashback, and loyalty point conversions
- **Admin Controls** - Freeze/unfreeze wallets, process refunds

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Dashboard │  │  Top-Up    │  │Transactions│            │
│  │   wallet/  │  │wallet/topup│  │wallet/trans│            │
│  └──────┬─────┘  └─────┬──────┘  └──────┬─────┘            │
└─────────┼──────────────┼────────────────┼──────────────────┘
          │              │                │
          │ HTTP REST    │                │
          │              │                │
┌─────────▼──────────────▼────────────────▼──────────────────┐
│                       API Routes                             │
│  /api/wallet/*                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         walletController.js                         │    │
│  │  • getBalance()      • topUp()                      │    │
│  │  • getSummary()      • pay()                        │    │
│  │  • getTransactions() • transfer()                   │    │
│  │  • getStatistics()   • updateSettings()             │    │
│  └────┬──────────┬──────────┬──────────┬───────────────┘    │
└───────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │
┌───────▼──────────▼──────────▼──────────▼────────────────────┐
│                    Business Logic Layer                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           walletService.js                          │    │
│  │  • topUpWallet()           • processRefund()        │    │
│  │  • payFromWallet()         • addBonus()             │    │
│  │  • transferBetweenWallets()• checkLowBalance()      │    │
│  │  • getTransactionHistory() • updateWalletSettings() │    │
│  └────┬──────────┬──────────┬──────────┬───────────────┘    │
└───────┼──────────┼──────────┼──────────┼────────────────────┘
        │          │          │          │
┌───────▼──────────▼──────────▼──────────▼────────────────────┐
│                    Data Access Layer                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            walletDAL.js                             │    │
│  │  • getWalletByUserId()     • getTransactionsByUserId()   │
│  │  • createWallet()          • getTransactionStatistics()  │
│  │  • updateBalance()         • getLowBalanceWallets()      │
│  │  • createTransaction()     • updateWalletSettings()      │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │  MySQL Database │
                  │ • wallets       │
                  │ • transactions  │
                  │ • top_up_methods│
                  │ • transfers     │
                  └─────────────────┘
```

---

## Database Schema

### Wallets Table

```sql
CREATE TABLE wallets (
    wallet_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    balance_usd DECIMAL(10, 2) DEFAULT 0.00,
    balance_lbp DECIMAL(15, 2) DEFAULT 0.00,
    balance_eur DECIMAL(10, 2) DEFAULT 0.00,
    default_currency ENUM('USD', 'LBP', 'EUR') DEFAULT 'USD',
    status ENUM('active', 'frozen', 'suspended') DEFAULT 'active',

    -- Alerts & Auto Top-Up
    low_balance_threshold DECIMAL(10, 2) DEFAULT 10.00,
    low_balance_alerts_enabled BOOLEAN DEFAULT TRUE,
    last_low_balance_alert_at TIMESTAMP NULL,
    auto_topup_enabled BOOLEAN DEFAULT FALSE,
    auto_topup_threshold DECIMAL(10, 2) DEFAULT 5.00,
    auto_topup_amount DECIMAL(10, 2) DEFAULT 50.00,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_wallet_user (user_id),
    INDEX idx_wallet_status (status)
);
```

### Wallet Transactions Table

```sql
CREATE TABLE wallet_transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('topup', 'payment', 'refund', 'transfer_in', 'transfer_out',
              'withdrawal', 'bonus', 'cashback', 'points_conversion', 'adjustment'),
    amount DECIMAL(10, 2) NOT NULL,
    currency ENUM('USD', 'LBP', 'EUR') NOT NULL DEFAULT 'USD',
    balance_before DECIMAL(10, 2) NOT NULL,
    balance_after DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',

    -- References
    reference_type VARCHAR(50),
    reference_id INT,

    -- Details
    description TEXT,
    admin_notes TEXT,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    related_user_id INT,
    metadata JSON,

    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (wallet_id) REFERENCES wallets(wallet_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_wallet_trans_wallet (wallet_id),
    INDEX idx_wallet_trans_user (user_id),
    INDEX idx_wallet_trans_type (type),
    INDEX idx_wallet_trans_status (status),
    INDEX idx_wallet_trans_date (created_at)
);
```

### Top-Up Methods Table

```sql
CREATE TABLE wallet_top_up_methods (
    method_id INT AUTO_INCREMENT PRIMARY KEY,
    method_code VARCHAR(50) NOT NULL UNIQUE,
    method_name VARCHAR(100) NOT NULL,
    description TEXT,
    fee_type ENUM('fixed', 'percentage', 'none') DEFAULT 'none',
    fee_flat DECIMAL(10, 2) DEFAULT 0.00,
    fee_percentage DECIMAL(5, 2) DEFAULT 0.00,
    min_amount DECIMAL(10, 2) DEFAULT 1.00,
    max_amount DECIMAL(10, 2),
    supported_currencies JSON,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0
);
```

### Wallet Transfers Table

```sql
CREATE TABLE wallet_transfers (
    transfer_id INT AUTO_INCREMENT PRIMARY KEY,
    from_wallet_id INT NOT NULL,
    to_wallet_id INT NOT NULL,
    from_user_id INT NOT NULL,
    to_user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency ENUM('USD', 'LBP', 'EUR') NOT NULL DEFAULT 'USD',
    note TEXT,
    status ENUM('pending', 'completed', 'failed', 'reversed') DEFAULT 'pending',
    from_transaction_id INT,
    to_transaction_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (from_wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (to_wallet_id) REFERENCES wallets(wallet_id),
    FOREIGN KEY (from_transaction_id) REFERENCES wallet_transactions(transaction_id),
    FOREIGN KEY (to_transaction_id) REFERENCES wallet_transactions(transaction_id),
    INDEX idx_transfer_from (from_user_id),
    INDEX idx_transfer_to (to_user_id),
    INDEX idx_transfer_date (created_at)
);
```

---

## API Endpoints

### User Endpoints

#### Get Wallet Balance
```http
GET /api/wallet/balance?currency=USD
Authorization: Required (JWT)

Response:
{
    "success": true,
    "data": {
        "wallet_id": 1,
        "balance": 150.50,
        "currency": "USD",
        "default_currency": "USD",
        "status": "active",
        "balances": {
            "usd": 150.50,
            "lbp": 2250000.00,
            "eur": 135.75
        }
    }
}
```

#### Get Wallet Summary
```http
GET /api/wallet/summary
Authorization: Required (JWT)

Response:
{
    "success": true,
    "data": {
        "wallet_id": 1,
        "user_id": 42,
        "balance_usd": 150.50,
        "balance_lbp": 2250000.00,
        "balance_eur": 135.75,
        "total_transactions": 25,
        "total_topups": 5,
        "total_payments": 15,
        "last_transaction_date": "2025-11-20T10:30:00Z"
    }
}
```

#### Top Up Wallet
```http
POST /api/wallet/topup
Authorization: Required (JWT)
Content-Type: application/json

{
    "amount": 100.00,
    "currency": "USD",
    "paymentMethod": "credit_card",
    "paymentReference": "TXN123456",
    "metadata": {
        "fee": 2.50,
        "total": 102.50
    }
}

Response:
{
    "success": true,
    "message": "Wallet topped up successfully",
    "data": {
        "transaction": { ... },
        "balance": 250.50,
        "currency": "USD"
    }
}
```

#### Pay from Wallet
```http
POST /api/wallet/pay
Authorization: Required (JWT)
Content-Type: application/json

{
    "amount": 50.00,
    "currency": "USD",
    "referenceType": "bill",
    "referenceId": 123,
    "description": "Monthly electricity bill"
}

Response:
{
    "success": true,
    "message": "Payment successful",
    "data": {
        "transaction": { ... },
        "balance": 200.50,
        "currency": "USD"
    }
}
```

#### Transfer Money
```http
POST /api/wallet/transfer
Authorization: Required (JWT)
Content-Type: application/json

{
    "toUserId": 45,
    "amount": 25.00,
    "currency": "USD",
    "note": "Splitting electricity bill"
}

Response:
{
    "success": true,
    "message": "Transfer completed successfully",
    "data": {
        "transfer_id": 10,
        "from_balance": 175.50,
        "to_balance": 75.00,
        "amount": 25.00,
        "currency": "USD"
    }
}
```

#### Get Transactions
```http
GET /api/wallet/transactions?page=1&limit=20&type=topup&status=completed
Authorization: Required (JWT)

Response:
{
    "success": true,
    "data": {
        "transactions": [...],
        "pagination": {
            "page": 1,
            "limit": 20,
            "total": 50,
            "totalPages": 3
        }
    }
}
```

#### Get Statistics
```http
GET /api/wallet/statistics
Authorization: Required (JWT)

Response:
{
    "success": true,
    "data": {
        "overall": {
            "total_transactions": 50,
            "total_topups": 500.00,
            "total_payments": 350.00,
            "total_refunds": 25.00,
            "total_rewards": 15.00
        },
        "recentActivity": [...]
    }
}
```

#### Update Wallet Settings
```http
PUT /api/wallet/settings
Authorization: Required (JWT)
Content-Type: application/json

{
    "default_currency": "EUR",
    "low_balance_threshold": 20.00,
    "low_balance_alerts_enabled": true,
    "auto_topup_enabled": true,
    "auto_topup_threshold": 10.00,
    "auto_topup_amount": 100.00
}

Response:
{
    "success": true,
    "message": "Wallet settings updated successfully",
    "data": { ... }
}
```

#### Export Transactions
```http
GET /api/wallet/transactions/export?type=payment&currency=USD
Authorization: Required (JWT)

Response: CSV File Download
```

### Admin Endpoints

#### Process Refund
```http
POST /api/wallet/admin/refund
Authorization: Required (JWT + Admin)
Content-Type: application/json

{
    "userId": 42,
    "amount": 30.00,
    "currency": "USD",
    "referenceType": "bill",
    "referenceId": 123,
    "reason": "Billing error correction"
}
```

#### Add Bonus
```http
POST /api/wallet/admin/bonus
Authorization: Required (JWT + Admin)
Content-Type: application/json

{
    "userId": 42,
    "amount": 10.00,
    "currency": "USD",
    "type": "bonus",
    "description": "Welcome bonus",
    "metadata": {
        "campaign": "new_user_2025"
    }
}
```

#### Freeze Wallet
```http
POST /api/wallet/admin/freeze
Authorization: Required (JWT + Admin)
Content-Type: application/json

{
    "walletId": 1,
    "reason": "Suspicious activity detected"
}
```

#### Unfreeze Wallet
```http
POST /api/wallet/admin/unfreeze
Authorization: Required (JWT + Admin)
Content-Type: application/json

{
    "walletId": 1
}
```

---

## User Interface

### Wallet Dashboard (`/wallet`)

The wallet dashboard provides:
- Multi-currency balance cards (USD, LBP, EUR)
- Quick action buttons (Top Up, View Transactions, Pay Bills, Transfer)
- Statistics cards (Total Top-Ups, Payments, Refunds, Rewards)
- Recent transactions list (last 5)
- Wallet settings display

### Top-Up Page (`/wallet/topup`)

Features:
- Currency selector (USD, LBP, EUR)
- Amount presets for quick selection
- Custom amount input
- Payment method selection with fee display
- Real-time summary calculation
- Payment reference field

Supported Payment Methods:
- 💳 Credit Card
- 🏦 Bank Transfer
- 💵 Cash
- 📱 OMT (Lebanon)
- 💸 Whish Money (Lebanon)

### Transaction History (`/wallet/transactions`)

Features:
- Advanced filters (type, status, currency, date range)
- Pagination
- Transaction type badges
- Color-coded amounts (positive/negative)
- Status indicators
- CSV export

---

## Installation

### 1. Run Database Migration

```bash
node runMigration.js 005_digital_wallet.sql
```

This creates:
- `wallets` table
- `wallet_transactions` table
- `wallet_top_up_methods` table
- `wallet_transfers` table
- `wallet_summary` view
- `CheckLowBalanceWallets()` stored procedure
- Default top-up methods
- Platform settings

### 2. Configure Environment Variables

No additional environment variables required. The wallet system uses existing database and notification configurations.

### 3. Update Navigation

Add wallet link to navbar:

```html
<a href="/wallet" class="nav-link">
    💰 Wallet
</a>
```

### 4. Start Server

```bash
npm start
```

The wallet system is now active!

---

## Usage Examples

### Example 1: User Top-Up

```javascript
// User visits /wallet/topup
// Selects $100 USD
// Chooses Credit Card (2.5% fee)
// Total: $102.50
// Clicks "Proceed to Top Up"

// Server processes:
await walletService.topUpWallet(
    userId: 42,
    amount: 100.00,
    currency: 'USD',
    paymentMethod: 'credit_card',
    paymentReference: 'CARD_TXN_12345',
    metadata: { fee: 2.50, total: 102.50 }
);

// Wallet balance increases from $50 to $150
// Transaction recorded
// Notification sent: "💰 Wallet Top-Up Successful"
```

### Example 2: Bill Payment from Wallet

```javascript
// User pays electricity bill from wallet
// Bill amount: $30

// In paymentController.js:
if (payment_method === 'wallet') {
    await walletService.payFromWallet(
        userId: 42,
        amount: 30.00,
        currency: 'USD',
        referenceType: 'bill',
        referenceId: 123,
        description: 'Bill payment #123'
    );
}

// Wallet balance decreases from $150 to $120
// Transaction recorded
// Notification sent: "✅ Payment Successful"
// Low balance check triggered
```

### Example 3: Wallet Transfer

```javascript
// User transfers $25 to friend (User ID: 45)

await walletService.transferBetweenWallets(
    fromUserId: 42,
    toUserId: 45,
    amount: 25.00,
    currency: 'USD',
    note: 'Thanks for dinner!'
);

// Sender balance: $120 → $95
// Receiver balance: $50 → $75
// Two transactions created (outgoing & incoming)
// Transfer record created
// Both users notified
```

### Example 4: Low Balance Alert

```javascript
// Cron job runs at 9:00 AM daily
// Checks all wallets with balance < threshold

const lowBalanceWallets = await walletDAL.getLowBalanceWallets();

for (const wallet of lowBalanceWallets) {
    // Send notification
    await realtimeNotificationService.sendNotification({
        userId: wallet.user_id,
        title: '⚠️ Low Wallet Balance',
        message: `Your wallet balance is low ($${wallet.balance_usd}). Please top up.`,
        type: 'alert',
        actionUrl: '/wallet/topup'
    });
}
```

---

## Security

### Authentication & Authorization

- All wallet endpoints require JWT authentication
- Admin endpoints require admin role
- Users can only access their own wallet data
- Wallet ownership verified before operations

### Transaction Security

- ACID compliance with database transactions
- Balance checks before deductions
- Atomic wallet-to-wallet transfers
- Transaction status tracking (pending, completed, failed)
- Reversal support for failed transactions

### Data Protection

- Parameterized SQL queries prevent injection
- Input validation on all endpoints
- Currency and amount validation
- Wallet status checks (active/frozen/suspended)
- Admin notes for audit trail

### Payment Security

- Payment references tracked
- Metadata stored as JSON for flexibility
- Related user tracking for transfers
- Admin-only refund and bonus operations

---

## Performance

### Optimization Features

1. **Database Indexes** - All key fields indexed
2. **Balance Caching** - Balance stored in wallet table
3. **Transaction Batching** - Bulk operations supported
4. **Lazy Loading** - Transactions paginated
5. **View Optimization** - `wallet_summary` view for quick lookups

### Expected Performance

| Operation | Response Time |
|-----------|--------------|
| Get Balance | <50ms |
| Top-Up Wallet | <200ms |
| Pay from Wallet | <150ms |
| Transfer Money | <300ms |
| Get Transactions (paginated) | <100ms |
| Export CSV | <500ms |

### Scalability

- Supports 10,000+ concurrent users
- Transaction table partitioning ready
- Horizontal scaling possible
- Read replicas for statistics

---

## Troubleshooting

### Issue: Insufficient Balance Error

**Symptom:** Payment fails with "Insufficient balance" error

**Solution:**
1. Check wallet balance: `GET /api/wallet/balance`
2. Verify payment amount doesn't exceed balance
3. Check wallet status (must be 'active')

### Issue: Top-Up Not Reflecting

**Symptom:** Top-up completed but balance not updated

**Solution:**
1. Check transaction status in database
2. Verify transaction completed successfully
3. Check for transaction rollback in logs
4. Verify currency matches

### Issue: Low Balance Alerts Not Sent

**Symptom:** No alerts despite low balance

**Solution:**
1. Check `low_balance_alerts_enabled` in wallet settings
2. Verify threshold settings
3. Check `last_low_balance_alert_at` (24-hour cooldown)
4. Verify cron job is running

### Issue: Transfer Failed

**Symptom:** Transfer between wallets fails

**Solution:**
1. Verify both users have active wallets
2. Check sender has sufficient balance
3. Verify recipient user ID exists
4. Check for wallet freezes

---

## Future Enhancements

### Planned Features

1. **Multi-Bank Integration** - Direct bank account linking
2. **Scheduled Payments** - Set up recurring wallet payments
3. **Payment Requests** - Request money from other users
4. **Wallet Sharing** - Family/shared wallets
5. **Currency Exchange** - Convert between wallet currencies
6. **Savings Goals** - Set and track savings targets
7. **Spending Limits** - Daily/weekly/monthly limits
8. **Receipt Management** - Upload and attach receipts to transactions
9. **Tax Reports** - Annual transaction summaries
10. **Mobile Wallet** - Mobile app integration

---

## Support

For issues or questions:
- Check this documentation first
- Review transaction history for details
- Check server logs for errors
- Contact PowerShare support

---

## License

This digital wallet system is part of the PowerShare platform.
All rights reserved.

**Last Updated:** November 2025
**Version:** 1.0.0
