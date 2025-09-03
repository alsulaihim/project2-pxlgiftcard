/**
 * Browser Notification Service
 * Handles browser push notifications for new messages
 */

export class NotificationService {
  private static instance: NotificationService;
  private hasPermission: boolean = false;

  private constructor() {
    // Only check permission in browser environment
    if (typeof window !== 'undefined') {
      this.checkPermission();
    }
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if browser supports notifications and if permission is granted
   */
  private checkPermission(): void {
    // Guard against SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return;
    }

    this.hasPermission = Notification.permission === 'granted';
  }

  /**
   * Request permission from the user to show notifications
   */
  async requestPermission(): Promise<boolean> {
    // Guard against SSR
    if (typeof window === 'undefined') {
      return false;
    }
    
    if (!('Notification' in window)) {
      console.warn('This browser does not support desktop notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.hasPermission = true;
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      return this.hasPermission;
    }

    return false;
  }

  /**
   * Show a notification for a new message
   */
  async showMessageNotification(
    title: string,
    options: {
      body: string;
      icon?: string;
      badge?: string;
      tag?: string;
      data?: any;
      requireInteraction?: boolean;
      silent?: boolean;
    }
  ): Promise<void> {
    // Guard against SSR
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Don't show if page is visible and focused
    if (document.visibilityState === 'visible') {
      return;
    }

    // Check permission
    if (!this.hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        badge: options.badge || '/favicon.ico',
        tag: options.tag || 'message',
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
        timestamp: Date.now(),
      });

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Navigate to messages page if data contains conversationId
        if (options.data?.conversationId) {
          window.location.href = `/messages?conversation=${options.data.conversationId}`;
        } else {
          window.location.href = '/messages';
        }
        
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Show a notification for a new message with sender info
   */
  async showNewMessageNotification(
    senderName: string,
    messageText: string,
    senderAvatar?: string,
    conversationId?: string
  ): Promise<void> {
    await this.showMessageNotification(
      `New message from ${senderName}`,
      {
        body: messageText,
        icon: senderAvatar || '/default-avatar.png',
        tag: `message-${conversationId || 'default'}`,
        data: { conversationId },
        requireInteraction: false,
        silent: false,
      }
    );
  }

  /**
   * Play a notification sound
   */
  playNotificationSound(): void {
    // Guard against SSR
    if (typeof window === 'undefined') {
      return;
    }
    
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.warn('Could not play notification sound:', e));
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();