# Real-Time Notification System

## Overview

The Real-Time Notification System provides instant, multi-channel notifications to PowerShare users through WebSocket connections, email, SMS, and browser push notifications.

---

## Features

### 1. Real-Time Delivery (WebSocket)
- Instant notification delivery via Socket.IO
- Live notification center with badge counter
- Auto-updating unread count
- Toast notifications for new alerts

### 2. Multi-Channel Delivery
- **In-App** - Real-time notifications in the web interface
- **Email** - HTML email notifications
- **SMS** - Text message alerts (integration ready)
- **Push** - Browser push notifications (Web Push API)

### 3. User Preferences
- Channel-specific toggles (enable/disable email, SMS, push, in-app)
- Notification type filters (bills, payments, outages, etc.)
- Quiet hours configuration
- Digest notifications (daily/weekly)

### 4. Notification Types
- 💵 **Bills** - New bills and payment due reminders
- ✅ **Payments** - Payment confirmations and receipts
- ⚡ **Outages** - Power outage alerts and updates
- ⭐ **Loyalty** - Points earned and rewards
- 📦 **Subscriptions** - Subscription changes and renewals
- ⏰ **Reminders** - Payment reminders and alerts
- 👋 **Welcome** - Welcome messages
- 🔔 **Alerts** - Important alerts
- ℹ️ **System** - Platform updates and announcements

### 5. Smart Features
- Duplicate prevention
- Quiet hours respect
- Read/unread tracking
- Auto-cleanup of old notifications
- Offline queue support

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Browser                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Socket.IO  │  │   Toast    │  │  Browser   │            │
│  │   Client   │  │ Notification│  │    Push    │            │
│  └──────┬─────┘  └─────┬──────┘  └──────┬─────┘            │
└─────────┼──────────────┼────────────────┼──────────────────┘
          │              │                │
          │ WebSocket    │ UI Updates     │ Push API
          │              │                │
┌─────────▼──────────────▼────────────────▼──────────────────┐
│                    PowerShare Server                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         realtimeNotificationService.js              │    │
│  │  • sendNotification()                               │    │
│  │  • sendBulkNotification()                           │    │
│  │  • notifyGeneratorSubscribers()                     │    │
│  └────┬──────────┬──────────┬──────────┬───────────────┘    │
│       │          │          │          │                    │
│  ┌────▼────┐┌───▼───┐┌────▼────┐┌────▼──────┐             │
│  │ Socket  ││ Email ││  SMS    ││ Web Push  │             │
│  │ Service ││Service││ Service ││  Service  │             │
│  └─────────┘└───────┘└─────────┘└───────────┘             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │          notificationPreferencesDAL.js              │   │
│  │  • getUserPreferences()                             │   │
│  │  • shouldNotify()                                   │   │
│  │  • isInQuietHours()                                 │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────▼────────┐
                  │  MySQL Database │
                  │ • notifications │
                  │ • preferences   │
                  │ • push_subs     │
                  └─────────────────┘
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
cd PowerShare
npm install socket.io web-push
```

### 2. Run Database Migration

```bash
node runMigration.js 004_realtime_notifications.sql
```

This creates:
- Enhanced `notifications` table with action_url, icon, read_at
- `notification_preferences` table for user settings
- `push_subscriptions` table for browser push
- `notification_queue` table for delivery tracking

### 3. Configure Environment Variables

Add to `.env`:

```env
# WebSocket Configuration
CORS_ORIGIN=http://localhost:3000

# Web Push VAPID Keys (generate using: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
VAPID_SUBJECT=mailto:admin@powershare.com

# SMTP (already configured for email notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### 4. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the output keys to your `.env` file.

### 5. Include Notification Center in Views

Add to your navbar partial (`PL/views/partials/navbar.ejs`):

```html
<%- include('partials/notification-center') %>
```

### 6. Start Server

```bash
npm start
```

You should see:
```
✅ Socket.IO initialized successfully
✅ Cron jobs initialized
```

---

## Usage

### Sending Notifications (Server-Side)

#### Simple Notification

```javascript
const realtimeNotificationService = require('./BLL/services/realtimeNotificationService');

await realtimeNotificationService.sendNotification({
    userId: 42,
    title: 'Payment Received',
    message: 'Your payment of $30.00 has been confirmed.',
    type: 'payment',
    actionUrl: '/payment-history',
    icon: '✅'
});
```

#### Bulk Notifications

```javascript
// Notify all subscribers of a generator
await realtimeNotificationService.notifyGeneratorSubscribers(
    generatorId,
    'Power Outage Alert',
    'There will be a scheduled outage today from 2-4 PM.',
    'outage',
    '/outage-schedule'
);
```

#### System-Wide Broadcast

```javascript
// Broadcast to all users
await realtimeNotificationService.broadcastSystemNotification(
    'Platform Maintenance',
    'PowerShare will undergo maintenance tonight at 11 PM.',
    null // or specify role: 'admin', 'owner', 'user'
);
```

#### Using Socket Service Directly

```javascript
const socketService = require('./BLL/services/socketService');

// Send to specific user
await socketService.sendToUser(userId, {
    notification_id: 123,
    title: 'New Message',
    message: 'You have a new message',
    type: 'system',
    action_url: '/messages'
});

// Broadcast to role
await socketService.broadcastToRole('admin', notification);

// Broadcast to all
await socketService.broadcastToAll(notification);

// Check if user is online
const isOnline = socketService.isUserOnline(userId);
```

---

## Client-Side Integration

### Notification Center

The notification center is automatically initialized on authenticated pages.

#### Manual Methods

```javascript
// Mark notification as read
notificationCenter.markNotificationAsReadViaSocket(notificationId);

// Mark all as read
notificationCenter.markAllAsReadViaSocket();

// Delete notification
notificationCenter.deleteNotification(notificationId);

// Request browser notification permission
await notificationCenter.requestNotificationPermission();
```

### Custom Event Listening

```javascript
// Listen for new notifications
document.addEventListener('notification:new', (event) => {
    console.log('New notification:', event.detail);
});
```

---

## API Endpoints

### Notification Preferences

```http
GET    /api/notification-preferences/preferences
PUT    /api/notification-preferences/preferences
POST   /api/notification-preferences/push/subscribe
POST   /api/notification-preferences/push/unsubscribe
GET    /api/notification-preferences/push/subscriptions
POST   /api/notification-preferences/test
```

### Notifications (Existing)

```http
GET    /api/notifications              # Get user's notifications
GET    /api/notifications/unread       # Get unread notifications
POST   /api/notifications/:id/read     # Mark as read
POST   /api/notifications/read-all     # Mark all as read
DELETE /api/notifications/:id          # Delete notification
```

---

## User Preferences

Users can manage their notification settings at:
```
/notification-preferences
```

### Available Settings

**Channels:**
- ✅ In-App Notifications
- 📧 Email Notifications
- 📱 Push Notifications
- 💬 SMS Notifications

**Types:**
- Bills, Payments, Outages, Loyalty, Subscriptions, Reminders, System

**Quiet Hours:**
- Enable/Disable
- Start Time (default: 22:00)
- End Time (default: 08:00)

**Digest:**
- Daily/Weekly digest emails

---

## Database Schema

### Enhanced Notifications Table

```sql
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type ENUM(...) DEFAULT 'system',
    action_url VARCHAR(500),        -- NEW
    icon VARCHAR(100),              -- NEW
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,         -- NEW
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Notification Preferences

```sql
CREATE TABLE notification_preferences (
    preference_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,

    -- Channels
    enable_email BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT FALSE,
    enable_push BOOLEAN DEFAULT TRUE,
    enable_in_app BOOLEAN DEFAULT TRUE,

    -- Types
    notify_bills BOOLEAN DEFAULT TRUE,
    notify_payments BOOLEAN DEFAULT TRUE,
    notify_outages BOOLEAN DEFAULT TRUE,
    notify_loyalty BOOLEAN DEFAULT TRUE,
    notify_subscriptions BOOLEAN DEFAULT TRUE,
    notify_reminders BOOLEAN DEFAULT TRUE,
    notify_system BOOLEAN DEFAULT TRUE,

    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',

    -- Digest
    digest_enabled BOOLEAN DEFAULT FALSE,
    digest_frequency ENUM('daily', 'weekly') DEFAULT 'daily'
);
```

### Push Subscriptions

```sql
CREATE TABLE push_subscriptions (
    subscription_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## WebSocket Events

### Client → Server

```javascript
// Mark notification as read
socket.emit('notification:markAsRead', { notificationId: 123 });

// Mark all as read
socket.emit('notification:markAllAsRead');

// Delete notification
socket.emit('notification:delete', { notificationId: 123 });
```

### Server → Client

```javascript
// Connection confirmed
socket.on('connected', (data) => {
    console.log(data.socketId, data.userId);
});

// New notification
socket.on('notification:new', (notification) => {
    // Handle new notification
});

// Unread count updated
socket.on('notification:unreadCount', (data) => {
    console.log(data.count);
});

// Notification marked
socket.on('notification:marked', (data) => {
    console.log(data.success);
});

// All marked
socket.on('notification:allMarked', (data) => {
    console.log(data.success);
});

// Notification deleted
socket.on('notification:deleted', (data) => {
    console.log(data.notificationId);
});

// Error
socket.on('notification:error', (data) => {
    console.error(data.message);
});
```

---

## Browser Push Notifications

### Setup

1. Generate VAPID keys (done in installation)
2. Register service worker:

```html
<script>
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.error('SW error:', err));
}
</script>
```

3. Request permission and subscribe:

```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: 'YOUR_PUBLIC_VAPID_KEY'
    });

    // Send subscription to server
    await fetch('/api/notification-preferences/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription }),
        credentials: 'include'
    });
}
```

---

## Performance

### Optimization Features

1. **Connection Pooling** - Efficient WebSocket connections
2. **Preference Caching** - User preferences cached per request
3. **Batch Operations** - Bulk notifications processed efficiently
4. **Lazy Loading** - Notifications loaded on demand
5. **Auto-Cleanup** - Old notifications automatically removed

### Expected Performance

| Metric | Value |
|--------|-------|
| WebSocket Latency | <50ms |
| Notification Delivery | <100ms |
| Concurrent Connections | 10,000+ |
| Memory per Connection | ~2KB |

---

## Troubleshooting

### WebSocket not connecting

1. Check that Socket.IO is initialized in server.js
2. Verify CORS settings in `.env`
3. Check JWT token in cookies
4. Look for errors in browser console

### Notifications not appearing

1. Check user preferences (all channels might be disabled)
2. Verify quiet hours settings
3. Check browser console for errors
4. Test with `/api/notification-preferences/test`

### Push notifications not working

1. Verify VAPID keys are set in `.env`
2. Check browser permission status
3. Ensure service worker is registered
4. HTTPS is required (except localhost)

### Email notifications not sending

1. Verify SMTP settings in `.env`
2. Check user has verified email
3. Check email preferences are enabled
4. Review server logs for errors

---

## Security

### Authentication

- WebSocket connections require valid JWT token
- All API endpoints use `authenticate` middleware
- Ownership verified before notification actions

### Authorization

- Users can only mark/delete their own notifications
- Admin-only endpoints protected with `authorize('admin')`
- Push subscriptions linked to authenticated user

### Data Privacy

- Notification content encrypted in transit (HTTPS/WSS)
- Push subscription keys stored securely
- User preferences private and isolated

---

## Testing

### Manual Testing

1. **Login to PowerShare**
2. **Navigate to** `/notification-preferences`
3. **Configure preferences**
4. **Click "Send Test Notification"**
5. **Verify notification appears in:**
   - Notification center (bell icon)
   - Toast notification (top-right)
   - Browser push (if enabled)
   - Email (if enabled)

### Automated Testing

```javascript
const realtimeNotificationService = require('./BLL/services/realtimeNotificationService');

async function test() {
    // Test single notification
    await realtimeNotificationService.sendNotification({
        userId: 1,
        title: 'Test',
        message: 'Test message',
        type: 'system'
    });

    // Test bulk notification
    await realtimeNotificationService.sendBulkNotification(
        [1, 2, 3],
        {
            title: 'Bulk Test',
            message: 'Bulk test message',
            type: 'system'
        }
    );
}

test();
```

---

## Maintenance

### Cleanup Old Notifications

Run stored procedure (automatically runs daily via cron):

```sql
CALL CleanOldNotifications();
```

### View Statistics

```sql
-- User notification counts
SELECT * FROM user_notification_counts;

-- Active push subscriptions
SELECT COUNT(*) FROM push_subscriptions WHERE is_active = TRUE;

-- Notification distribution by type
SELECT type, COUNT(*) as count
FROM notifications
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY type;
```

---

## Future Enhancements

### Planned Features

1. **SMS Integration** - Twilio/Vonage integration
2. **Notification Templates** - Customizable notification templates
3. **Scheduled Notifications** - Schedule notifications for future delivery
4. **Notification Groups** - Group related notifications
5. **Rich Media** - Support for images and videos in notifications
6. **Action Buttons** - Interactive notification actions
7. **Multi-Language** - Notifications in multiple languages
8. **Analytics** - Notification delivery and engagement metrics

---

## License

This real-time notification system is part of the PowerShare platform.
All rights reserved.
