// src/services/ticketService.ts - Updated to support events
import { supabase } from "../lib/supabase";
import { Database, TicketWithSeller, Event } from "../types/database.types";
import { NotificationService } from "./notificationService";

type Ticket = Database["public"]["Tables"]["tickets"]["Row"];
type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];

export class TicketService {
  // Create new ticket listing with event reference
  static async createTicket(ticketData: {
    event_id: string; // Now using event_id instead of manual entry
    section: string;
    row_number: string;
    seat_number: string;
    price: number;
    description?: string;
  }): Promise<{ data: Ticket | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // First, get the event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", ticketData.event_id)
        .single();

      if (eventError || !event) {
        throw new Error("Event not found");
      }

      // Create the ticket using event data
      const { data, error } = await supabase
        .from("tickets")
        .insert({
          event_id: ticketData.event_id,
          title: event.title,
          description:
            ticketData.description ||
            `Seat Details: Section ${ticketData.section}, Row ${ticketData.row_number}, Seat ${ticketData.seat_number}`,
          price: ticketData.price,
          event_date: event.event_date,
          location: event.location,
          sport: event.sport,
          section: ticketData.section,
          row_number: ticketData.row_number,
          seat_number: ticketData.seat_number,
          seller_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for the seller
      await NotificationService.createNotification({
        title: "Ticket Listed!",
        message: `Your ticket for '${
          event.title
        }' has been successfully listed for $${ticketData.price.toFixed(2)}.`,
        type: "listing",
        related_ticket_id: data.id,
      });

      return { data, error: null };
    } catch (error) {
      console.error("Error creating ticket:", error);
      return { data: null, error };
    }
  }

  // Get all tickets with events (existing method updated)
  static async getTickets({
    sport,
    searchQuery,
    sortBy = "event_date",
    limit = 50,
    offset = 0,
    excludeUserId,
  }: {
    sport?: string;
    searchQuery?: string;
    sortBy?: "price_asc" | "price_desc" | "event_date" | "created_at";
    limit?: number;
    offset?: number;
    excludeUserId?: string;
  } = {}): Promise<{ data: TicketWithSeller[]; error: any }> {
    try {
      let query = supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          event:events!tickets_event_id_fkey (
            id,
            title,
            event_date,
            location,
            venue,
            sport,
            opponent
          )
        `
        )
        .eq("status", "available")
        .gte("event_date", new Date().toISOString());

      // Filter by sport
      if (sport && sport !== "All Sports") {
        query = query.ilike("sport", `%${sport}%`);
      }

      // Search filter
      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`
        );
      }

      // Exclude user's own tickets
      if (excludeUserId) {
        query = query.not("seller_id", "eq", excludeUserId);
      }

      // Sorting
      switch (sortBy) {
        case "price_asc":
          query = query.order("price", { ascending: true });
          break;
        case "price_desc":
          query = query.order("price", { ascending: false });
          break;
        case "event_date":
          query = query.order("event_date", { ascending: true });
          break;
        case "created_at":
          query = query.order("created_at", { ascending: false });
          break;
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      return { data: data as TicketWithSeller[], error: null };
    } catch (error) {
      console.error("Error fetching tickets:", error);
      return { data: [], error };
    }
  }

  // Get ticket by ID with event data
  static async getTicketById(
    id: string
  ): Promise<{ data: TicketWithSeller | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          event:events!tickets_event_id_fkey (
            id,
            title,
            event_date,
            location,
            venue,
            sport,
            opponent
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      return { data: data as TicketWithSeller, error: null };
    } catch (error) {
      console.error("Error fetching ticket:", error);
      return { data: null, error };
    }
  }

  // Rest of the existing methods remain the same...
  static async updateTicket(
    id: string,
    updates: TicketUpdate
  ): Promise<{ data: Ticket | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error updating ticket:", error);
      return { data: null, error };
    }
  }

  static async purchaseTicket(
    ticketId: string
  ): Promise<{ data: { id: string } | null; error: any }> {
    try {
      const { data: ticket, error: fetchError } = await supabase
        .from("tickets")
        .select(
          `*,
          seller:profiles!tickets_seller_id_fkey (
            id,
            username,
            full_name
          )`
        )
        .eq("id", ticketId)
        .single();

      if (fetchError) throw fetchError;
      if (!ticket) throw new Error("Ticket not found");

      const { data, error } = (await supabase.rpc("purchase_ticket", {
        ticket_id: ticketId,
      })) as { data: { id: string } | null; error: any };

      if (error) throw error;

      // Create notification for the buyer
      const { data: buyerUser } = await supabase.auth.getUser();
      if (buyerUser?.user) {
        await NotificationService.createNotification({
          title: "Ticket Purchased!",
          message: `You successfully purchased a ticket for '${
            ticket.title
          }' for ${ticket.price.toFixed(2)}.`,
          type: "purchase",
          related_ticket_id: ticket.id,
          related_order_id: data?.id,
        });
      }

      // Create notification for the seller
      await NotificationService.createNotification({
        title: "Your Ticket Sold!",
        message: `Your ticket for '${
          ticket.title
        }' has been sold for ${ticket.price.toFixed(2)}.`,
        type: "sale",
        related_ticket_id: ticket.id,
        related_order_id: data?.id,
      });

      return { data, error: null };
    } catch (error) {
      console.error("Error purchasing ticket:", error);
      return { data: null, error };
    }
  }

  // Get user's tickets (selling)
  static async getUserTickets(
    userId?: string
  ): Promise<{ data: TicketWithSeller[]; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          event:events!tickets_event_id_fkey (
            id,
            title,
            event_date,
            location,
            venue,
            sport,
            opponent
          )
        `
        )
        .eq("seller_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data: data as TicketWithSeller[], error: null };
    } catch (error) {
      console.error("Error fetching user tickets:", error);
      return { data: [], error };
    }
  }

  // Get user's purchases
  static async getUserPurchases(
    userId?: string
  ): Promise<{ data: TicketWithSeller[]; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;

      if (!targetUserId) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey (
            id,
            username,
            full_name,
            avatar_url
          ),
          event:events!tickets_event_id_fkey (
            id,
            title,
            event_date,
            location,
            venue,
            sport,
            opponent
          )
        `
        )
        .eq("buyer_id", targetUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return { data: data as TicketWithSeller[], error: null };
    } catch (error) {
      console.error("Error fetching user purchases:", error);
      return { data: [], error };
    }
  }

  // Cancel ticket listing
  static async cancelTicket(
    ticketId: string
  ): Promise<{ data: Ticket | null; error: any }> {
    try {
      const { data: ticket, error: fetchError } = await supabase
        .from("tickets")
        .select("id, title, seller_id")
        .eq("id", ticketId)
        .single();

      if (fetchError) throw fetchError;
      if (!ticket) throw new Error("Ticket not found");

      const { data, error } = await this.updateTicket(ticketId, {
        status: "cancelled",
      });

      if (error) throw error;

      // Create notification for the seller
      await NotificationService.createNotification({
        title: "Listing Cancelled",
        message: `Your listing for '${ticket.title}' has been cancelled.`,
        type: "listing",
        related_ticket_id: ticket.id,
      });

      return { data, error: null };
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      return { data: null, error };
    }
  }
}
