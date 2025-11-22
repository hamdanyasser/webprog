# Advanced Notification Dashboard

## Overview

The Advanced Notification Dashboard provides comprehensive notification management with filtering, search, bulk actions, statistics, and multiple view modes.

---

## Features

### 1. **Statistics Overview**
Real-time statistics displayed in colorful cards:
- **Total Notifications** - All notifications received
- **Unread Count** - Number of unread notifications
- **Read Count** - Number of read notifications
- **Avg Response Time** - Average time to read notifications (in minutes)

### 2. **Advanced Filtering**
Multi-criteria filtering system:
- **Search** - Search by title or message content
- **Type Filter** - Filter by notification type (bills, payments, outages, etc.)
- **Status Filter** - Filter by read/unread/all
- **Date Range** - Filter by date from and date to
- **Apply Button** - Execute filters

### 3. **Multiple View Modes**

#### List View (Default)
- Paginated list of notifications
- Checkbox selection for bulk actions
- Individual action buttons per notification
- Displays all notification details

#### Timeline View
- Groups notifications by date
- Shows "Today", "Yesterday", or formatted dates
- Displays notification count per day
- Shows unread count per day

#### Grouped View
- Groups notifications by type
- Shows notification count per type
- Displays top 5 notifications per group
- Expandable view

### 4. **Bulk Actions**

#### Selection Management
- **Select All** - Select all visible notifications
- **Deselect All** - Clear all selections
- **Individual Selection** - Checkboxes per notification

#### Bulk Operations
- **Mark as Read** - Mark selected notifications as read
- **Delete Selected** - Delete selected notifications
- **Quick Delete Options:**
  - Delete All Read - Remove all read notifications
  - Delete Old - Remove notifications older than 30 days

### 5. **Pagination**
- Configurable page size (default: 20 per page)
- Page navigation (Previous/Next)
- Page number buttons
- Total count display
- Current page indicator

### 6. **Export to CSV**
Download notification data as CSV file with:
- Notification ID
- Title
- Message
- Type
- Status (Read/Unread)
- Created Date
- Read Date

Respects current filters when exporting.

### 7. **Individual Actions**
Per-notification actions:
- **View Details** - Navigate to action URL (if available)
- **Mark as Read** - Mark individual notification as read
- **Delete** - Delete individual notification

---

## API Endpoints

### Advanced Query
```http
GET /api/notifications/advanced?page=1&limit=20&type=bill&status=unread&search=payment&dateFrom=2025-01-01&dateTo=2025-01-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "totalPages": 8
    }
  }
}
```

### Statistics
```http
GET /api/notifications/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "overall": {
      "total": 156,
      "unread": 42,
      "read": 114
    },
    "byType": [
      { "type": "bill", "count": 45, "unread": 12 },
      { "type": "payment", "count": 38, "unread": 8 }
    ],
    "recentActivity": [
      { "date": "2025-01-22", "count": 15 }
    ],
    "avgResponseTime": 127
  }
}
```

### Grouped Notifications
```http
GET /api/notifications/grouped?groupBy=date
GET /api/notifications/grouped?groupBy=type
GET /api/notifications/grouped?groupBy=week
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "group_key": "2025-01-22",
      "count": 15,
      "unread_count": 5,
      "notifications": [...]
    }
  ]
}
```

### Bulk Mark as Read
```http
PUT /api/notifications/bulk/mark-read
Content-Type: application/json

{
  "notificationIds": [1, 2, 3, 4, 5]
}
```

Or mark by type:
```json
{
  "markType": "type",
  "type": "bill"
}
```

Or mark all:
```json
{
  "markType": "all"
}
```

### Bulk Delete
```http
DELETE /api/notifications/bulk/delete
Content-Type: application/json

{
  "notificationIds": [1, 2, 3, 4, 5]
}
```

Or delete by type:
```json
{
  "deleteType": "type",
  "type": "bill"
}
```

Or delete all read:
```json
{
  "deleteType": "read"
}
```

Or delete old (30+ days):
```json
{
  "deleteType": "old"
}
```

### Export to CSV
```http
GET /api/notifications/export?type=bill&status=unread&dateFrom=2025-01-01
```

Downloads CSV file with filtered notifications.

---

## Access

### URL
```
/notifications/dashboard
```

### Navigation
From anywhere in the app:
1. Click the notification bell icon
2. Click "View All Notifications" at the bottom of the dropdown
3. Or navigate directly to `/notifications/dashboard`

---

## UI Components

### Statistics Cards
- **Gradient backgrounds** for visual appeal
- **Large numbers** for quick scanning
- **Auto-updating** when actions are performed

### Filter Section
- **Gray background** to differentiate from main content
- **Responsive layout** - stacks on mobile
- **Single Apply button** for all filters

### Notification Cards
- **Color-coded borders** by read/unread status
- **Blue border** for unread (light blue background)
- **Gray border** for read (slightly faded)
- **Type badges** with color coding
- **Hover effects** for interactivity

### View Toggle Buttons
- **Active state** highlighting
- **Icons** for each view mode
- **Responsive** button group

### Pagination Controls
- **Centered** at bottom of list
- **Disabled states** for unavailable actions
- **Page info** display

---

## Usage Examples

### Filter Unread Bills
1. Set **Type** to "Bills"
2. Set **Status** to "Unread"
3. Click **Apply**

### Delete Old Notifications
1. Click **Quick Delete** dropdown
2. Select "Delete Old (30+ days)"
3. Confirm deletion

### Mark Multiple as Read
1. Use checkboxes to select notifications
2. Click **Mark Read** button
3. Notifications updated instantly

### Export Filtered Data
1. Apply desired filters
2. Click **Export CSV** button
3. CSV file downloads with filtered data

### Switch to Timeline View
1. Click **Timeline** button in view toggle
2. Notifications grouped by date
3. See daily activity at a glance

---

## Performance

### Optimizations
- **Pagination** prevents loading too many notifications
- **Lazy Loading** for images (if added later)
- **Debounced Search** (can be added)
- **Efficient SQL Queries** with proper indexes

### Expected Performance
| Action | Response Time |
|--------|---------------|
| Load Page | <500ms |
| Filter/Search | <300ms |
| Bulk Actions | <1s |
| Export CSV | <2s (100 items) |

---

## Responsive Design

### Desktop (> 768px)
- 4-column statistics grid
- Filters in single row
- Full-width notification cards

### Tablet (768px - 992px)
- 2-column statistics grid
- Filters stack to 2 rows
- Full-width cards

### Mobile (< 768px)
- 1-column statistics grid
- Filters stack vertically
- Condensed notification cards
- Simplified pagination

---

## Color Coding

### Notification Types
- **Bills** - Blue (`primary`)
- **Payments** - Green (`success`)
- **Outages** - Yellow (`warning`)
- **Loyalty** - Cyan (`info`)
- **Subscriptions** - Gray (`secondary`)
- **Reminders** - Red (`danger`)
- **System** - Dark (`dark`)
- **Alerts** - Red (`danger`)
- **Welcome** - Green (`success`)

### Type Icons
- 💵 Bills
- ✅ Payments
- ⚡ Outages
- ⭐ Loyalty
- 📦 Subscriptions
- ⏰ Reminders
- ℹ️ System
- 🔔 Alerts
- 👋 Welcome

---

## Future Enhancements

### Planned Features
1. **Advanced Search** - Full-text search with highlighting
2. **Saved Filters** - Save frequently used filter combinations
3. **Custom Views** - Create and save custom views
4. **Notification Templates** - Customize notification display
5. **Keyboard Shortcuts** - Quick navigation and actions
6. **Drag & Drop** - Organize notifications
7. **Tags** - Custom tagging system
8. **Archive** - Archive old notifications
9. **Print View** - Printer-friendly view
10. **Email Reports** - Schedule email reports

---

## Troubleshooting

### Filters not working
1. Check that Apply button was clicked
2. Verify date format (YYYY-MM-DD)
3. Clear browser cache
4. Check console for errors

### Statistics not updating
1. Refresh the page
2. Check network tab for API errors
3. Verify user authentication

### Export not downloading
1. Check browser download settings
2. Allow pop-ups if blocked
3. Check file permissions
4. Try different browser

### Pagination issues
1. Verify total count is correct
2. Check that page parameter is valid
3. Reload the page
4. Clear filters and retry

---

## Security

### Access Control
- **Authentication Required** - Must be logged in
- **User Isolation** - Users only see their own notifications
- **No XSS** - All content properly escaped
- **CSRF Protection** - Via cookie-based JWT

### Data Privacy
- Notifications are user-specific
- No cross-user data leakage
- Audit trail (created_at, read_at)
- Bulk actions require confirmation

---

## Best Practices

### For Users
1. **Use Filters** - Find notifications quickly
2. **Regular Cleanup** - Delete old read notifications
3. **Export Important** - Download important notifications
4. **Set Preferences** - Configure notification types
5. **Check Daily** - Stay on top of notifications

### For Admins
1. **Monitor Statistics** - Check notification volumes
2. **Review Types** - Ensure proper categorization
3. **Test Bulk Actions** - Verify no data loss
4. **Check Performance** - Monitor query times
5. **Regular Backups** - Before bulk deletions

---

## License

This advanced notification dashboard is part of the PowerShare platform.
All rights reserved.
