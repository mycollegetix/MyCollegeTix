// services/notificationService.ts
import { supabase } from "../lib/supabase";
import { Database } from "../types/database.types";

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

}
