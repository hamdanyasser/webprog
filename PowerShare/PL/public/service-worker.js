/**
 * PowerShare Service Worker
 * Handles push notifications and offline functionality
 */

const CACHE_VERSION = 'powershare-v1';
const CACHE_NAME = `powershare-cache-${CACHE_VERSION}`;

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// Push notification event
self.addEventListener('push', (event) => {
    console.log('Push notification received:', event);

    if (!event.data) {
        console.log('Push event but no data');
        return;
    }

    try {
        const data = event.data.json();

        const options = {
            body: data.body || data.message,
            icon: data.icon || '/images/notification-icon.png',
            badge: data.badge || '/images/badge-icon.png',
            tag: data.tag || 'powershare-notification',
            data: {
                url: data.url || '/',
                timestamp: data.timestamp || Date.now()
            },
            vibrate: [200, 100, 200],
            requireInteraction: false,
            actions: [
                {
                    action: 'view',
                    title: 'View',
                    icon: '/images/view-icon.png'
                },
                {
                    action: 'close',
                    title: 'Close',
                    icon: '/images/close-icon.png'
                }
            ]
        };

        event.waitUntil(
            self.registration.showNotification(data.title || 'PowerShare', options)
        );
    } catch (error) {
        console.error('Error processing push notification:', error);
    }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event);

    event.notification.close();

    if (event.action === 'close') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if there's already a window open
                for (let client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }

                // Open new window if no existing window found
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
    console.log('Notification closed:', event);
});

// Message event (for communication with main thread)
self.addEventListener('message', (event) => {
    console.log('Service Worker received message:', event.data);

    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Background sync (optional - for offline capabilities)
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);

    if (event.tag === 'sync-notifications') {
        event.waitUntil(syncNotifications());
    }
});

async function syncNotifications() {
    try {
        // Sync logic here if needed
        console.log('Syncing notifications...');
    } catch (error) {
        console.error('Error syncing notifications:', error);
    }
}
