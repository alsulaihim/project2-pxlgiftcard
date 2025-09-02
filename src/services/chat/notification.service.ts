/**
 * Push Notification Service - FCM integration for real-time message notifications
 */

"use client";

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    conversationId?: string;
    messageId?: string;
    senderId?: string;
    type?: 'message' | 'reaction' | 'mention';
  };
}

class NotificationService {
  private static instance: NotificationService;
  private messaging: Messaging | null = null;
  private permission: NotificationPermission = 'default';
  private fcmToken: string | null = null;
  private vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

  private constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize FCM and request notification permission
   */
  async initialize(userId: string): Promise<boolean> {
    try {
      // Check if notifications are supported
      if (typeof window === 'undefined' || !('Notification' in window)) {
        console.warn('Notifications not supported in this environment');
        return false;
      }

      // Check if service worker is supported
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported');
        return false;
      }

      // Request permission if not already granted
      if (this.permission === 'default') {
        this.permission = await Notification.requestPermission();
      }

      if (this.permission !== 'granted') {
        console.warn('Notification permission denied');
        return false;
      }

      // Initialize Firebase Messaging
      const { app, auth } = await import('@/lib/firebase-config');
      
      // Wait for auth to be ready
      if (!auth.currentUser) {
        console.warn('Waiting for authentication before initializing FCM...');
        return false;
      }

      this.messaging = getMessaging(app);

      // Register service worker
      const registration = await this.registerServiceWorker();
      if (!registration) {
        console.warn('Service worker registration failed - notifications disabled');
        return false;
      }

      // Get FCM token with error handling
      try {
        // Only try to get token if we have a valid VAPID key
        if (!this.vapidKey) {
          console.warn('No VAPID key configured - notifications disabled');
          return false;
        }
        
        this.fcmToken = await getToken(this.messaging, {
          vapidKey: this.vapidKey,
          serviceWorkerRegistration: registration
        });
      } catch (tokenError: any) {
        if (tokenError.code === 'messaging/token-subscribe-failed' || 
            tokenError.message?.includes('applicationServerKey')) {
          console.warn('FCM token failed - notifications disabled. This is normal without proper VAPID key.');
          return false;
        }
        throw tokenError;
      }

      if (!this.fcmToken) {
        console.error('Failed to get FCM token');
        return false;
      }

      console.log('FCM Token obtained:', this.fcmToken.substring(0, 20) + '...');

      // Save token to user's document in Firestore
      await this.saveFCMToken(userId, this.fcmToken);

      // Listen for foreground messages
      this.setupForegroundListener();

      return true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
      return false;
    }
  }

  /**
   * Register the service worker for background notifications
   */
  private async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    try {
      // Check if service worker already registered
      let registration = await navigator.serviceWorker.getRegistration('/');
      
      if (!registration) {
        // Register new service worker
        registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
          scope: '/'
        });
        
        // Wait for service worker to be ready
        await navigator.serviceWorker.ready;
      }

      return registration;
    } catch (error) {
      console.error('Service worker registration failed:', error);
      return null;
    }
  }

  /**
   * Save FCM token to user's Firestore document
   */
  private async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(db, 'platformUsers', userId);
      await updateDoc(userRef, {
        fcmTokens: {
          [this.getDeviceId()]: {
            token,
            updatedAt: new Date(),
            platform: this.getPlatform()
          }
        }
      });
    } catch (error) {
      // If document doesn't exist, create it
      const userRef = doc(db, 'platformUsers', userId);
      await setDoc(userRef, {
        fcmTokens: {
          [this.getDeviceId()]: {
            token,
            updatedAt: new Date(),
            platform: this.getPlatform()
          }
        }
      }, { merge: true });
    }
  }

  /**
   * Setup listener for foreground messages
   */
  private setupForegroundListener(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);

      // Show notification if app is in foreground
      if (payload.notification) {
        this.showNotification({
          title: payload.notification.title || 'New Message',
          body: payload.notification.body || '',
          icon: payload.notification.icon,
          image: payload.notification.image,
          data: payload.data as any
        });
      }
    });
  }

  /**
   * Show a local notification
   */
  async showNotification(payload: NotificationPayload): Promise<void> {
    if (this.permission !== 'granted') return;

    // Check if page is visible
    if (document.visibilityState === 'visible') {
      // Optionally show in-app notification instead
      this.showInAppNotification(payload);
      return;
    }

    // Show browser notification
    const notification = new Notification(payload.title, {
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: payload.badge || '/badge-72x72.png',
      image: payload.image,
      tag: payload.data?.messageId || 'default',
      renotify: true,
      requireInteraction: false,
      silent: false,
      data: payload.data
    });

    // Handle notification click
    notification.onclick = () => {
      window.focus();
      
      // Navigate to conversation if data is provided
      if (payload.data?.conversationId) {
        window.location.href = `/messages?conversation=${payload.data.conversationId}`;
      }
      
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }

  /**
   * Show in-app notification (toast)
   */
  private showInAppNotification(payload: NotificationPayload): void {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm z-50 animate-slide-in';
    
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        ${payload.icon ? `<img src="${payload.icon}" class="w-10 h-10 rounded-full" />` : ''}
        <div class="flex-1">
          <p class="font-semibold text-gray-900 dark:text-white">${payload.title}</p>
          <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">${payload.body}</p>
        </div>
        <button class="text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    `;

    // Add click handler
    toast.onclick = () => {
      if (payload.data?.conversationId) {
        window.location.href = `/messages?conversation=${payload.data.conversationId}`;
      }
      toast.remove();
    };

    document.body.appendChild(toast);

    // Auto-remove after 4 seconds
    setTimeout(() => toast.remove(), 4000);
  }

  /**
   * Get unique device ID
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  /**
   * Get platform information
   */
  private getPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'ios';
    if (userAgent.includes('mac')) return 'macos';
    if (userAgent.includes('windows')) return 'windows';
    if (userAgent.includes('linux')) return 'linux';
    return 'web';
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.permission === 'granted' && this.fcmToken !== null;
  }

  /**
   * Get current FCM token
   */
  getToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    this.permission = await Notification.requestPermission();
    return this.permission === 'granted';
  }

  /**
   * Cleanup and unregister
   */
  async cleanup(): Promise<void> {
    this.fcmToken = null;
    this.messaging = null;
  }
}

export const notificationService = NotificationService.getInstance();