/**
 * NotificationContext
 *
 * Global notification state management using React Context.
 *
 * Features:
 * - Push notification registration and handling
 * - In-app notification state management
 * - Unread count tracking
 * - Deep linking from notifications
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import notificationsService, {
  Notification,
  NotificationResponse,
} from '@/services/api/notifications.service';
import { useAuth } from './AuthContext';

/**
 * Get the Expo project ID from available sources
 * Priority: env variable > EAS config > app config
 */
function getProjectId(): string | undefined {
  // Try environment variables first (support both naming conventions)
  if (process.env.EXPO_PUBLIC_EXPO_PROJECT_ID) {
    return process.env.EXPO_PUBLIC_EXPO_PROJECT_ID;
  }
  if (process.env.EXPO_PUBLIC_PROJECT_ID) {
    return process.env.EXPO_PUBLIC_PROJECT_ID;
  }

  // Try EAS project ID from Constants
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (easProjectId) {
    return easProjectId;
  }

  // Try from manifest (for Expo Go)
  const manifestProjectId = Constants.manifest?.extra?.eas?.projectId;
  if (manifestProjectId) {
    return manifestProjectId;
  }

  return undefined;
}

// Configure notification handling behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  // Push notification state
  expoPushToken: string | null;
  isPushEnabled: boolean;

  // In-app notifications
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  hasMore: boolean;

  // Actions
  registerForPushNotifications: () => Promise<string | null>;
  unregisterPushNotifications: () => Promise<void>;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearReadNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, user } = useAuth();

  // Push notification state
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // In-app notification state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  // Refs for notification listeners
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const appState = useRef(AppState.currentState);

  const LIMIT = 20;

  /**
   * Register device for push notifications
   */
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('[Notifications] Push notifications require a physical device');
      return null;
    }

    try {
      // Check existing permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permissions if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[Notifications] Permission not granted');
        setIsPushEnabled(false);
        return null;
      }

      // Get Expo push token (FCM token on Android)
      const projectId = getProjectId();

      if (!projectId) {
        console.warn(
          '[Notifications] No projectId found. Push notifications require an Expo project ID. ' +
          'Run `eas project:init` to configure your project or set EXPO_PUBLIC_PROJECT_ID in .env'
        );
        // Still allow the app to work without push notifications
        setIsPushEnabled(false);
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      const token = tokenData.data;

      console.log('[Notifications] Push token:', token);
      setExpoPushToken(token);
      setIsPushEnabled(true);

      // Register device with backend
      if (isAuthenticated) {
        const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';
        const deviceName = Device.deviceName || `${Device.brand} ${Device.modelName}`;

        await notificationsService.registerDevice({
          fcm_token: token,
          device_type: deviceType,
          device_name: deviceName,
        });
        console.log('[Notifications] Device registered with backend');
      }

      // Configure Android notification channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#D97941',
        });
      }

      return token;
    } catch (error) {
      console.error('[Notifications] Registration error:', error);
      return null;
    }
  }, [isAuthenticated]);

  /**
   * Unregister device from push notifications
   */
  const unregisterPushNotifications = useCallback(async () => {
    if (expoPushToken) {
      try {
        await notificationsService.unregisterDevice(expoPushToken);
        setExpoPushToken(null);
        setIsPushEnabled(false);
        console.log('[Notifications] Device unregistered');
      } catch (error) {
        console.error('[Notifications] Unregister error:', error);
      }
    }
  }, [expoPushToken]);

  /**
   * Fetch notifications from backend
   */
  const fetchNotifications = useCallback(
    async (reset = false) => {
      if (!isAuthenticated) return;
      if (isLoading) return;

      const currentOffset = reset ? 0 : offset;

      try {
        setIsLoading(true);
        const response: NotificationResponse =
          await notificationsService.getNotifications(LIMIT, currentOffset);

        if (reset) {
          setNotifications(response.data);
        } else {
          setNotifications((prev) => [...prev, ...response.data]);
        }

        setHasMore(response.has_more);
        setOffset(currentOffset + LIMIT);
      } catch (error) {
        console.error('[Notifications] Fetch error:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, isLoading, offset]
  );

  /**
   * Fetch unread notification count
   */
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await notificationsService.getUnreadCount();
      setUnreadCount(response.count);

      // Update app badge
      await Notifications.setBadgeCountAsync(response.count);
    } catch (error) {
      console.error('[Notifications] Fetch unread count error:', error);
    }
  }, [isAuthenticated]);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        await notificationsService.markAsRead(notificationId);

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Update badge
        await Notifications.setBadgeCountAsync(Math.max(0, unreadCount - 1));
      } catch (error) {
        console.error('[Notifications] Mark as read error:', error);
      }
    },
    [unreadCount]
  );

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationsService.markAllAsRead();

      // Update local state
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);

      // Clear badge
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('[Notifications] Mark all as read error:', error);
    }
  }, []);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(
    async (notificationId: string) => {
      try {
        const notification = notifications.find((n) => n.id === notificationId);
        await notificationsService.deleteNotification(notificationId);

        // Update local state
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        // Update unread count if notification was unread
        if (notification && !notification.is_read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
          await Notifications.setBadgeCountAsync(Math.max(0, unreadCount - 1));
        }
      } catch (error) {
        console.error('[Notifications] Delete error:', error);
      }
    },
    [notifications, unreadCount]
  );

  /**
   * Clear all read notifications
   */
  const clearReadNotifications = useCallback(async () => {
    try {
      await notificationsService.deleteReadNotifications();

      // Update local state - keep only unread
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (error) {
      console.error('[Notifications] Clear read error:', error);
    }
  }, []);

  /**
   * Refresh notifications
   */
  const refreshNotifications = useCallback(async () => {
    setOffset(0);
    await fetchNotifications(true);
    await fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  /**
   * Handle notification tap - navigate to relevant screen
   */
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      console.log('[Notifications] Tapped notification:', data);

      // Navigate based on notification type
      if (data?.type) {
        switch (data.type) {
          case 'EXCHANGE_REQUEST':
          case 'EXCHANGE_ACCEPTED':
          case 'EXCHANGE_DECLINED':
          case 'EXCHANGE_COMPLETED':
          case 'EXCHANGE_CANCELLED':
          case 'EXCHANGE_REMINDER':
            if (data.exchange_id) {
              router.push(`/exchange/my-exchanges`);
            }
            break;
          case 'MESSAGE_RECEIVED':
            // Navigate to messages when implemented
            break;
          case 'LISTING_APPROVED':
          case 'LISTING_REJECTED':
            if (data.listing_id) {
              router.push(`/listing/${data.listing_id}`);
            }
            break;
          case 'RATING_RECEIVED':
            router.push('/profile/edit');
            break;
          default:
            // Navigate to notifications screen
            router.push('/notifications');
        }
      }
    },
    []
  );

  /**
   * Handle foreground notification
   */
  const handleForegroundNotification = useCallback(
    (notification: Notifications.Notification) => {
      console.log('[Notifications] Received foreground notification:', notification);

      // Refresh unread count
      fetchUnreadCount();

      // Optionally add to local state immediately
      const notificationData = notification.request.content.data as Record<string, any> | undefined;
      const newNotification: Notification = {
        id: notification.request.identifier,
        user_id: user?.id || '',
        type: (notificationData?.type as string) || 'SYSTEM_ANNOUNCEMENT',
        title: notification.request.content.title || '',
        message: notification.request.content.body || '',
        data: notificationData,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    },
    [fetchUnreadCount, user?.id]
  );

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
      fetchNotifications(true);
      fetchUnreadCount();
    } else {
      // Clear state when logged out
      setNotifications([]);
      setUnreadCount(0);
      setOffset(0);
    }
  }, [isAuthenticated]);

  // Set up notification listeners
  useEffect(() => {
    // Listener for foreground notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(
      handleForegroundNotification
    );

    // Listener for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      handleNotificationResponse
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [handleForegroundNotification, handleNotificationResponse]);

  // Refresh notifications when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (
          appState.current.match(/inactive|background/) &&
          nextAppState === 'active' &&
          isAuthenticated
        ) {
          fetchUnreadCount();
        }
        appState.current = nextAppState;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [fetchUnreadCount, isAuthenticated]);

  const value: NotificationContextType = {
    expoPushToken,
    isPushEnabled,
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    registerForPushNotifications,
    unregisterPushNotifications,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearReadNotifications,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * useNotifications Hook
 *
 * Access notification context in components.
 *
 * Usage:
 * ```tsx
 * const { notifications, unreadCount, markAsRead } = useNotifications();
 * ```
 */
export function useNotifications() {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }

  return context;
}
