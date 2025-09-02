// Firebase Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyBQI4msnsCuct6dTq0Zck9J9ZWGYKqHXrU",
  authDomain: "pxl-perfect-1.firebaseapp.com",
  databaseURL: "https://pxl-perfect-1-default-rtdb.firebaseio.com/",
  projectId: "pxl-perfect-1",
  storageBucket: "pxl-perfect-1.firebasestorage.app",
  messagingSenderId: "427330178468",
  appId: "1:427330178468:web:e028c067345f827f49c531"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[Service Worker] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge-72x72.png',
    image: payload.notification?.image,
    tag: payload.data?.messageId || 'message',
    renotify: true,
    requireInteraction: false,
    data: payload.data,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icons/view.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icons/dismiss.png'
      }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();

  // Handle action buttons
  if (event.action === 'dismiss') {
    return;
  }

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes('/messages') && 'focus' in client) {
          // Focus existing window
          client.focus();
          
          // Send message to the client with conversation ID
          if (event.notification.data?.conversationId) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              conversationId: event.notification.data.conversationId,
              messageId: event.notification.data.messageId
            });
          }
          
          return;
        }
      }

      // Open new window if app is not open
      const url = event.notification.data?.conversationId 
        ? `/messages?conversation=${event.notification.data.conversationId}`
        : '/messages';
      
      return clients.openWindow(url);
    })
  );
});

// Handle service worker installation
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  self.skipWaiting();
});

// Handle service worker activation
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activated');
  event.waitUntil(clients.claim());
});