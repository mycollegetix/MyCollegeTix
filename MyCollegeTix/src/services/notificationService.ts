// services/notificationService.ts
import { supabase } from "../lib/supabase";
import { Database } from "../types/database.types";
import * as Notifications from 'expo-notifications';

type Notification = Database["public"]["Tables"]["notifications"]["Row"];
type NotificationInsert =
  Database["public"]["Tables"]["notifications"]["Insert"];

export class NotificationService {
  // Get user's notifications
  static async getUserNotifications(
    limit = 50,
    offset = 0,
    unreadOnly = false
  ): Promise<{ data: Notification[]; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (unreadOnly) {
        query = query.eq("read", false);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return { data: [], error };
    }
  }

  // Get unread notification count
  static async getUnreadCount(): Promise<{ count: number; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { count: 0, error: null };
      }

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      return { count: count || 0, error: null };
    } catch (error) {
      console.error("Error getting unread count:", error);
      return { count: 0, error };
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return { error };
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return { error };
    }
  }

  // Delete notification
  static async deleteNotification(
    notificationId: string
  ): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error deleting notification:", error);
      return { error };
    }
  }

  // Subscribe to real-time notifications
  static subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          onNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Create a notification (for testing)
  static async createNotification(notification: {
    title: string;
    message: string;
    type?: "purchase" | "sale" | "listing" | "system";
    related_ticket_id?: string;
    related_order_id?: string | null;
  }): Promise<{ data: Notification | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          ...notification,
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error creating notification:", error);
      return { data: null, error };
    }
  }

  // Save push token to user profile
  static async savePushToken(token: string): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Save to user profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          expo_push_token: token,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Also save to a separate push_tokens table for easier querying
      const { error: tokenError } = await supabase
        .from("push_tokens")
        .upsert({
          user_id: user.id,
          token: token,
          platform: 'expo',
          active: true,
          updated_at: new Date().toISOString(),
        });

      if (tokenError) {
        console.warn("Could not save to push_tokens table (table may not exist):", tokenError);
      }

      return { error: null };
    } catch (error) {
      console.error("Error saving push token:", error);
      return { error };
    }
  }

  // Remove push token (for logout)
  static async removePushToken(): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { error: null };
      }

      // Remove from profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          expo_push_token: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Mark as inactive in push_tokens table
      const { error: tokenError } = await supabase
        .from("push_tokens")
        .update({
          active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (tokenError) {
        console.warn("Could not update push_tokens table:", tokenError);
      }

      return { error: null };
    } catch (error) {
      console.error("Error removing push token:", error);
      return { error };
    }
  }

  // Send push notification via Supabase Edge Function
  static async sendPushNotification(
    userIds: string[],
    title: string,
    body: string,
    notificationData?: any
  ): Promise<{ error: any }> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("User not authenticated");
      }

      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke(
        'send-push-notifications',
        {
          body: {
            userIds,
            title,
            body,
            data: notificationData || {},
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (error) throw error;

      console.log('Push notification sent via Edge Function:', data);
      return { error: null };
    } catch (error) {
      console.error("Error sending push notification:", error);
      
      // Fallback to direct Expo Push API call
      try {
        console.log("Attempting direct push notification as fallback...");
        return await this.sendPushNotificationDirect(userIds, title, body, notificationData);
      } catch (fallbackError) {
        console.error("Fallback push notification also failed:", fallbackError);
        return { error: fallbackError };
      }
    }
  }

  // Direct push notification method as fallback
  private static async sendPushNotificationDirect(
    userIds: string[],
    title: string,
    body: string,
    pushData?: any
  ): Promise<{ error: any }> {
    try {
      // Get push tokens for the users
      const { data: profiles, error: fetchError } = await supabase
        .from("profiles")
        .select("expo_push_token")
        .in("id", userIds)
        .not("expo_push_token", "is", null);

      if (fetchError) throw fetchError;

      const tokens = profiles
        .map(p => p.expo_push_token)
        .filter(token => token !== null) as string[];

      if (tokens.length === 0) {
        console.warn("No push tokens found for users:", userIds);
        return { error: null };
      }

      // Prepare notification messages
      const messages = tokens.map(token => ({
        to: token,
        title,
        body,
        data: pushData || {},
        sound: 'default',
        priority: 'high' as const,
      }));

      // Send via Expo Push API
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(`Push notification failed: ${JSON.stringify(result)}`);
      }

      console.log('Direct push notification sent successfully:', result);
      return { error: null };
    } catch (error) {
      console.error("Error sending direct push notification:", error);
      return { error };
    }
  }

  // Create notification and send push notification
  static async createAndSendNotification(
    userId: string,
    notification: {
      title: string;
      message: string;
      type?: "purchase" | "sale" | "listing" | "system" | "message";
      related_ticket_id?: string;
      related_order_id?: string | null;
    },
    pushData?: any,
    existingSession?: any  // Accept existing session to avoid duplicate checks
  ): Promise<{ data: Notification | null; error: any }> {
    try {
      // Use existing session if provided, otherwise get session
      let session = existingSession;
      if (!session) {
        const { data: { session: freshSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Session error:", sessionError);
          throw sessionError;
        }

        if (!freshSession) {
          console.error("No active session found");
          throw new Error("No active session - user must be authenticated");
        }
        session = freshSession;
      }

      // Use create_notification RPC function to bypass RLS
      const { data, error } = await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: notification.title,
        p_message: notification.message,
        p_type: notification.type || 'message',
        p_related_ticket_id: notification.related_ticket_id || null,
        p_related_order_id: notification.related_order_id || null
      });

      if (error) throw error;

      // RPC function returns array, get first item
      const notificationData = data?.[0];
      
      if (!notificationData) {
        throw new Error("Failed to create notification");
      }

      // Then send push notification
      await this.sendPushNotification(
        [userId],
        notification.title,
        notification.message,
        {
          notification_id: notificationData.id,
          ...pushData,
        }
      );

      return { data: notificationData, error: null };
    } catch (error) {
      console.error("Error creating and sending notification:", error);
      return { data: null, error };
    }
  }

  // Schedule local notification (for reminders, etc.)
  static async scheduleLocalNotification(
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: any
  ): Promise<string | null> {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger,
      });
      
      console.log('Scheduled local notification:', id);
      return id;
    } catch (error) {
      console.error("Error scheduling local notification:", error);
      return null;
    }
  }

  // Cancel scheduled local notification
  static async cancelLocalNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Cancelled local notification:', notificationId);
    } catch (error) {
      console.error("Error cancelling local notification:", error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Error getting scheduled notifications:", error);
      return [];
    }
  }

}
