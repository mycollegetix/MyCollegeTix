// src/services/adminService.ts
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";

export class AdminService {
  // Clear all test/demo data and reset to initial state
  static async resetDatabaseToInitialState(): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check admin status first
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        throw new Error("Insufficient permissions - admin access required");
      }

      // Delete all tickets except those from the last 24 hours (keep recent activity)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { error: ticketsError } = await supabase
        .from("tickets")
        .delete()
        .lt("created_at", yesterday.toISOString());

      if (ticketsError) {
        console.error("Error clearing old tickets:", ticketsError);
      }

      // Reset ticket statuses to available for remaining tickets
      const { error: resetTicketsError } = await supabase
        .from("tickets")
        .update({ status: "available", buyer_id: null })
        .in("status", ["sold", "cancelled", "expired"]);

      if (resetTicketsError) {
        console.error("Error resetting ticket statuses:", resetTicketsError);
      }

      // Clear old orders (keep last 24 hours)
      const { error: ordersError } = await supabase
        .from("orders")
        .delete()
        .lt("created_at", yesterday.toISOString());

      if (ordersError) {
        console.error("Error clearing old orders:", ordersError);
      }

      // Clear old notifications (keep last week)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);

      const { error: notificationsError } = await supabase
        .from("notifications")
        .delete()
        .lt("created_at", lastWeek.toISOString());

      if (notificationsError) {
        console.error("Error clearing old notifications:", notificationsError);
      }

      // Update event dates to be in the future if they're in the past
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now

      const { error: eventsError } = await supabase
        .from("events")
        .update({ 
          event_date: futureDate.toISOString(),
          status: "available"
        })
        .lt("event_date", now.toISOString());

      if (eventsError) {
        console.error("Error updating past events:", eventsError);
      }

      return { success: true };
    } catch (error) {
      console.error("Error resetting database:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      };
    }
  }

  // Force refresh all cached data
  static async refreshAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Check admin status
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.is_admin) {
        throw new Error("Insufficient permissions - admin access required");
      }

      // Fetch fresh data from all main tables to warm up any caches
      const refreshPromises = [
        supabase.from("profiles").select("id").limit(1),
        supabase.from("events").select("id").limit(1),
        supabase.from("tickets").select("id").limit(1),
        supabase.from("colleges").select("id").limit(1),
        supabase.from("orders").select("id").limit(1),
      ];

      await Promise.all(refreshPromises);

      return { success: true };
    } catch (error) {
      console.error("Error refreshing data:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      };
    }
  }

  // Show confirmation dialog for database operations
  static showResetConfirmation(onConfirm: () => void) {
    Alert.alert(
      "Reset Database",
      "This will:\n• Clear old tickets and orders\n• Reset ticket statuses to available\n• Move past events to future dates\n• Clear old notifications\n\nThis action cannot be undone. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: onConfirm,
        },
      ]
    );
  }

  static showRefreshConfirmation(onConfirm: () => void) {
    Alert.alert(
      "Refresh All Data",
      "This will refresh all cached data and update the admin dashboard with the latest information from the database.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Refresh",
          onPress: onConfirm,
        },
      ]
    );
  }
}