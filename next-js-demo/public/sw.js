// Service Worker for Daga Wallpapers PWA
// Handles push notifications and background sync

// Version - increment to force service worker update
const VERSION = '1.0.0';

// Listen for push notifications from server
self.addEventListener('push', function (event) {
  console.log('[Service Worker] Push notification received:', event);

  if (event.data) {
    try {
      const data = event.data.json();

      const options = {
        body: data.body,
        icon: data.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [100, 50, 100],
        tag: data.tag || 'default', // Prevents duplicate notifications
        requireInteraction: false, // Auto-dismiss after timeout
        data: {
          url: data.url || '/',
          orderId: data.orderId,
          timestamp: Date.now(),
        },
        actions: [
          { action: 'open', title: 'Open Order', icon: '/icon-192x192.png' },
          { action: 'close', title: 'Dismiss' }
        ]
      };

      event.waitUntil(
        self.registration.showNotification(data.title || 'New Notification', options)
      );
    } catch (error) {
      console.error('[Service Worker] Error parsing push notification:', error);
    }
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', function (event) {
  console.log('[Service Worker] Notification clicked:', event.action);

  event.notification.close();

  // User clicked dismiss button
  if (event.action === 'close') {
    return;
  }

  // Get URL to open from notification data
  const urlToOpen = event.notification.data?.url || '/';
  const fullUrl = new URL(urlToOpen, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open with this URL
        for (let client of clientList) {
          if (client.url === fullUrl && 'focus' in client) {
            console.log('[Service Worker] Focusing existing window');
            return client.focus();
          }
        }

        // Check if any window is open to the app
        for (let client of clientList) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            console.log('[Service Worker] Navigating existing window to:', fullUrl);
            return client.focus().then(() => client.navigate(fullUrl));
          }
        }

        // Otherwise, open a new window
        if (clients.openWindow) {
          console.log('[Service Worker] Opening new window:', fullUrl);
          return clients.openWindow(fullUrl);
        }
      })
      .catch((error) => {
        console.error('[Service Worker] Error handling notification click:', error);
      })
  );
});

// Handle service worker installation
self.addEventListener('install', function (event) {
  console.log('[Service Worker] Installing version:', VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', function (event) {
  console.log('[Service Worker] Activating version:', VERSION);
  // Claim all clients immediately
  event.waitUntil(clients.claim());
});

// Handle background sync (optional - for offline support)
self.addEventListener('sync', function (event) {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

// Example background sync function (implement based on your needs)
async function syncOrders() {
  console.log('[Service Worker] Syncing orders...');
  // Implement offline data sync logic here
  // This could sync pending orders when connection is restored
}

console.log('[Service Worker] Loaded version:', VERSION);
