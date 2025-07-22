// src/services/watchlistService.ts
import { supabase } from "../lib/supabase";
import { Database } from "../types/database.types";

type Watchlist = Database["public"]["Tables"]["watchlists"]["Row"];
type WatchlistInsert = Database["public"]["Tables"]["watchlists"]["Insert"];
type WatchlistUpdate = Database["public"]["Tables"]["watchlists"]["Update"];

export interface WatchlistWithTicket extends Watchlist {
  ticket: {
    id: string;
    title: string;
    description: string;
    price: number;
    status: string;
    event_date: string;
    location: string;
    sport: string | null;
    section: string | null;
    row_number: string | null;
    seat_number: string | null;
    image_url: string | null;
    seller: {
      id: string;
      full_name: string;
      username: string;
    };
  };
}

export class WatchlistService {
  // Add ticket to watchlist
  static async addToWatchlist(
    ticketId: string,
    options?: {
      notes?: string;
      priceAlertThreshold?: number;
      notificationEnabled?: boolean;
    }
  ): Promise<{ data: Watchlist | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("watchlists")
        .insert({
          user_id: user.id,
          ticket_id: ticketId,
          notes: options?.notes || null,
          price_alert_threshold: options?.priceAlertThreshold || null,
          notification_enabled: options?.notificationEnabled ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      return { data: null, error };
    }
  }

  // Remove ticket from watchlist
  static async removeFromWatchlist(ticketId: string): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("user_id", user.id)
        .eq("ticket_id", ticketId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      return { error };
    }
  }

  // Check if ticket is in user's watchlist
  static async isInWatchlist(
    ticketId: string
  ): Promise<{ data: boolean; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return { data: false, error: null };
      }

      const { data, error } = await supabase
        .from("watchlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("ticket_id", ticketId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected
        throw error;
      }

      return { data: !!data, error: null };
    } catch (error) {
      console.error("Error checking watchlist:", error);
      return { data: false, error };
    }
  }

  // Get user's watchlist with ticket details
  static async getUserWatchlist(): Promise<{
    data: WatchlistWithTicket[] | null;
    error: any;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("watchlists")
        .select(
          `
          *,
          ticket:tickets (
            id,
            title,
            description,
            price,
            status,
            event_date,
            location,
            sport,
            section,
            row_number,
            seat_number,
            image_url,
            seller:profiles!tickets_seller_id_fkey (
              id,
              full_name,
              username
            )
          )
        `
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out any watchlist items where the ticket was deleted
      const validWatchlists = (data || []).filter(
        (item: any) => item.ticket && item.ticket.id
      );

      // Transform the data to match our interface
      const transformedData: WatchlistWithTicket[] = validWatchlists.map(
        (item: any) => ({
          ...item,
          ticket: {
            ...item.ticket,
            seller: Array.isArray(item.ticket.seller)
              ? item.ticket.seller[0]
              : item.ticket.seller,
          },
        })
      );

      return { data: transformedData, error: null };
    } catch (error) {
      console.error("Error fetching watchlist:", error);
      return { data: null, error };
    }
  }

  // Update watchlist item
  static async updateWatchlistItem(
    ticketId: string,
    updates: {
      notes?: string | null;
      priceAlertThreshold?: number | null;
      notificationEnabled?: boolean;
    }
  ): Promise<{ data: Watchlist | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      if (updates.priceAlertThreshold !== undefined) {
        updateData.price_alert_threshold = updates.priceAlertThreshold;
      }
      if (updates.notificationEnabled !== undefined) {
        updateData.notification_enabled = updates.notificationEnabled;
      }

      const { data, error } = await supabase
        .from("watchlists")
        .update(updateData)
        .eq("user_id", user.id)
        .eq("ticket_id", ticketId)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error updating watchlist item:", error);
      return { data: null, error };
    }
  }

  // Get watchlist statistics
  static async getWatchlistStats(): Promise<{
    data: {
      totalItems: number;
      availableTickets: number;
      soldTickets: number;
      averagePrice: number;
      priceRange: { min: number; max: number };
    } | null;
    error: any;
  }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("watchlists")
        .select(
          `
          ticket:tickets (
            price,
            status
          )
        `
        )
        .eq("user_id", user.id);

      if (error) throw error;

      const validTickets = (data || []).filter((item: any) => item.ticket);

      const totalItems = validTickets.length;
      const availableTickets = validTickets.filter(
        (item: any) => item.ticket.status === "available"
      ).length;
      const soldTickets = validTickets.filter(
        (item: any) => item.ticket.status === "sold"
      ).length;

      const prices = validTickets.map((item: any) => item.ticket.price);
      const averagePrice =
        prices.length > 0
          ? prices.reduce((sum, price) => sum + price, 0) / prices.length
          : 0;

      const priceRange =
        prices.length > 0
          ? {
              min: Math.min(...prices),
              max: Math.max(...prices),
            }
          : { min: 0, max: 0 };

      return {
        data: {
          totalItems,
          availableTickets,
          soldTickets,
          averagePrice,
          priceRange,
        },
        error: null,
      };
    } catch (error) {
      console.error("Error fetching watchlist stats:", error);
      return { data: null, error };
    }
  }

  // Bulk remove items from watchlist (for sold/unavailable tickets)
  static async cleanupWatchlist(): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // First, get the IDs of tickets that are sold or cancelled
      const { data: ticketsToRemove, error: ticketsError } = await supabase
        .from("tickets")
        .select("id")
        .in("status", ["sold", "cancelled"]);

      if (ticketsError) throw ticketsError;

      if (!ticketsToRemove || ticketsToRemove.length === 0) {
        return { error: null }; // No tickets to clean up
      }

      const ticketIds = ticketsToRemove.map((ticket) => ticket.id);

      // Remove watchlist items for those tickets
      const { error } = await supabase
        .from("watchlists")
        .delete()
        .eq("user_id", user.id)
        .in("ticket_id", ticketIds);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error("Error cleaning up watchlist:", error);
      return { error };
    }
  }
}
