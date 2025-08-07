// services/accountService.ts
import { supabase } from "../lib/supabase";

export class AccountService {
  /**
   * Completely delete user account and all associated data
   * This is irreversible!
   */
  static async deleteUserAccount(): Promise<{ success: boolean; error?: any; summary?: any }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      console.log("🗑️ Starting complete account deletion for user:", user.id);

      // Step 1: Delete all user data from database using our function
      const { data: deletionSummary, error: dbError } = await supabase.rpc(
        'delete_user_completely', 
        { user_id_to_delete: user.id }
      );

      if (dbError) {
        console.error("❌ Database deletion failed:", dbError);
        throw dbError;
      }

      if (!deletionSummary?.success) {
        console.error("❌ Database deletion unsuccessful:", deletionSummary);
        throw new Error(deletionSummary?.error || "Database deletion failed");
      }

      console.log("✅ Database cleanup completed:", deletionSummary);

      // Step 2: Delete the auth user account
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (authDeleteError) {
        console.error("❌ Auth deletion failed:", authDeleteError);
        // Database is already cleaned up, but auth deletion failed
        // This might be expected if using non-admin client
        console.log("⚠️ Auth deletion failed but database was cleaned up");
      }

      // Step 3: Sign out the user
      await supabase.auth.signOut();

      return {
        success: true,
        summary: deletionSummary
      };

    } catch (error) {
      console.error("💥 Account deletion failed:", error);
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * Get summary of what data would be deleted (for confirmation UI)
   */
  static async getAccountDataSummary(): Promise<{ data: any; error: any }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Get counts of user data
      const [
        { count: messagesCount },
        { count: notificationsCount },
        { count: ticketsCount },
        { count: ordersCount },
        { count: watchlistCount },
        { count: conversationsCount }
      ] = await Promise.all([
        supabase.from('messages').select('*', { count: 'exact', head: true }).eq('sender_id', user.id),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('seller_id', user.id),
        supabase.from('orders').select('*', { count: 'exact', head: true }).or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
        supabase.from('watchlists').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('conversations').select('*', { count: 'exact', head: true }).or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      ]);

      return {
        data: {
          messages: messagesCount || 0,
          notifications: notificationsCount || 0,
          tickets: ticketsCount || 0,
          orders: ordersCount || 0,
          watchlist: watchlistCount || 0,
          conversations: conversationsCount || 0
        },
        error: null
      };

    } catch (error) {
      console.error("Error getting account data summary:", error);
      return {
        data: null,
        error: error
      };
    }
  }

  /**
   * Export user data (GDPR compliance)
   */
  static async exportUserData(): Promise<{ data: any; error: any }> {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error("User not authenticated");
      }

      // Get all user data
      const [
        { data: profile },
        { data: messages },
        { data: notifications },
        { data: tickets },
        { data: orders },
        { data: watchlist }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('messages').select('*').eq('sender_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id),
        supabase.from('tickets').select('*').eq('seller_id', user.id),
        supabase.from('orders').select('*').or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
        supabase.from('watchlists').select('*').eq('user_id', user.id)
      ]);

      const exportData = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        profile: profile,
        messages: messages || [],
        notifications: notifications || [],
        tickets: tickets || [],
        orders: orders || [],
        watchlist: watchlist || []
      };

      return {
        data: exportData,
        error: null
      };

    } catch (error) {
      console.error("Error exporting user data:", error);
      return {
        data: null,
        error: error
      };
    }
  }
}