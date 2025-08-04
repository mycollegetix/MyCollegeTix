// providers/NotificationProvider.tsx
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Platform } from "react-native";
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { router } from 'expo-router';
import { NotificationService } from "../services/notificationService";
import { WatchlistService } from "../services/watchlistService";
import { useAuth } from "./AuthProvider";
import { Database } from "../types/database.types";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  expoPushToken: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  loading: false,
  expoPushToken: null,
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  deleteNotification: async () => {},
  refreshNotifications: async () => {},
});

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const loadNotifications = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [notificationsResult, countResult] = await Promise.all([
        NotificationService.getUserNotifications(20, 0),
        NotificationService.getUnreadCount(),
      ]);

      if (!notificationsResult.error) {
        setNotifications(notificationsResult.data);
      }

      if (!countResult.error) {
        setUnreadCount(countResult.count);
      }
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const { error } = await NotificationService.markAsRead(id);
      if (!error) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === id ? { ...notif, read: true } : notif
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await NotificationService.markAllAsRead();
      if (!error) {
        setNotifications((prev) =>
          prev.map((notif) => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await NotificationService.deleteNotification(id);
      if (!error) {
        const notification = notifications.find((n) => n.id === id);
        setNotifications((prev) => prev.filter((notif) => notif.id !== id));
        if (notification && !notification.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  const refreshNotifications = async () => {
    await loadNotifications();
  };

  // Register for push notifications
  const registerForPushNotificationsAsync = async () => {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    try {
      const projectId = 'f8124d43-c505-4ac7-bf8f-b4daf92282fd'; // From app.json
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });
      
      console.log('Expo Push Token:', token.data);
      return token.data;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  };

  // Handle notification received while app is in foreground
  const handleNotificationReceived = (notification: Notifications.Notification) => {
    console.log('Notification received in foreground:', notification);
    // Optionally show in-app notification or update badge
  };

  // Handle notification response (when user taps notification)
  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    console.log('Notification response:', response);
    
    const data = response.notification.request.content.data;
    
    // Handle deep linking based on notification data
    if (data?.screen) {
      router.push(data.screen as any);
    } else if (data?.ticket_id) {
      router.push(`/ticket-details/${data.ticket_id}`);
    } else if (data?.order_id) {
      router.push('/orders');
    } else {
      // Default to notifications screen
      router.push('/notifications');
    }
  };

  // Load notifications and setup push notifications when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Register for push notifications
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          setExpoPushToken(token);
          // Save token to user profile
          NotificationService.savePushToken(token);
        }
      });
    } else {
      setNotifications([]);
      setUnreadCount(0);
      setExpoPushToken(null);
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to general notifications
    const unsubscribeNotifications = NotificationService.subscribeToNotifications(
      user.id,
      (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev]);
        if (!newNotification.read) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    );

    // Subscribe to watchlist updates
    const unsubscribeWatchlist = WatchlistService.subscribeToWatchlistUpdates(
      user.id,
      async (update) => {
        console.log(`🔔 Watchlist update received:`, update);

        // Create notification based on update type
        let notificationTitle = '';
        let notificationBody = '';
        let notificationData: any = { ticket_id: update.ticketId };

        switch (update.type) {
          case 'price_change':
            const priceDirection = update.newValue > update.oldValue ? 'increased' : 'decreased';
            const priceDiff = Math.abs(update.newValue - update.oldValue);
            notificationTitle = `Price ${priceDirection}!`;
            notificationBody = `${update.ticketTitle} price ${priceDirection} by $${priceDiff} (now $${update.newValue})`;
            break;
          
          case 'ticket_sold':
            notificationTitle = 'Ticket Sold';
            notificationBody = `${update.ticketTitle} from your watchlist has been sold`;
            break;
          
          case 'status_change':
            notificationTitle = 'Ticket Status Changed';
            notificationBody = `${update.ticketTitle} status changed to ${update.newValue}`;
            break;
          
          case 'ticket_deleted':
            notificationTitle = 'Ticket Removed';
            notificationBody = `${update.ticketTitle} has been removed by the seller`;
            break;
        }

        // Send local push notification if app is in background
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notificationTitle,
              body: notificationBody,
              data: notificationData,
              badge: unreadCount + 1,
            },
            trigger: null, // Show immediately
          });
        } catch (error) {
          console.error('Error sending local notification:', error);
        }

        // Create in-app notification record
        try {
          await NotificationService.createNotification({
            userId: user.id,
            title: notificationTitle,
            body: notificationBody,
            type: 'watchlist_update',
            data: {
              ...notificationData,
              updateType: update.type,
              oldValue: update.oldValue,
              newValue: update.newValue,
            },
          });
          
          // Refresh notifications to show the new one
          loadNotifications();
        } catch (error) {
          console.error('Error creating watchlist notification:', error);
        }
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeWatchlist();
    };
  }, [user, unreadCount]);

  // Setup push notification listeners
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(handleNotificationReceived);

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    expoPushToken,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};
