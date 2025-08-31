// src/services/ticketService.ts - Fixed TypeScript errors
import { supabase } from "../lib/supabase";
import {
  TicketWithSeller,
  TicketWithDetails,
  TablesInsert,
  Tables,
} from "../types/database.types";
import { ipTrackingService } from "./ipTrackingService";

type Ticket = Tables<"tickets">;
type TicketInsert = TablesInsert<"tickets">;

export class TicketService {
  /**
   * Get tickets for a college with sport-specific season pass prioritization
   * 
   * Season pass behavior (matches EventService logic):
   * - When filtering by specific sport (not "All Sports"): Tickets for season pass events appear at top
   * - When showing "All Sports": Regular date-based sorting applies
   */
  static async getTicketsForCollege({
    collegeId,
    sport,
    searchQuery,
    sortBy = "created_at",
    limit = 20,
    offset = 0,
    excludeUserId,
    includeAllColleges = false,
    onlySeasonTickets = false,
  }: {
    collegeId?: string;
    sport?: string;
    searchQuery?: string;
    sortBy?: "price_asc" | "price_desc" | "event_date" | "created_at";
    limit?: number;
    offset?: number;
    excludeUserId?: string;
    includeAllColleges?: boolean;
    onlySeasonTickets?: boolean;
  }): Promise<{ data: TicketWithSeller[]; error: any }> {
    try {
      let query = supabase
        .from("tickets")
        .select(
          `
        *,
        seller:profiles!tickets_seller_id_fkey (
          id,
          full_name,
          email,
          college_id
        ),
        event:events!tickets_event_id_fkey (
          id,
          title,
          is_season_pass
        ),
        home_college:colleges!tickets_home_college_id_fkey (
          id,
          name,
          short_name,
          primary_color,
          secondary_color
        ),
        away_college:colleges!tickets_away_college_id_fkey (
          id,
          name,
          short_name,
          primary_color,
          secondary_color
        )
      `
        )
        .eq("status", "available")
        .gte("event_date", new Date().toISOString());

      // FIXED: Multi-tenant filtering - single line, no newlines
      if (collegeId && !includeAllColleges) {
        query = query.or(
          `home_college_id.eq.${collegeId},away_college_id.eq.${collegeId},and(home_college_id.is.null,away_college_id.is.null)`
        );
      }

      // Filter by sport
      if (sport && sport !== "All Sports") {
        query = query.ilike("sport", `%${sport}%`);
      }

      // Filter by student tickets only (formerly season tickets)
      if (onlySeasonTickets) {
        query = query.eq("ticket_type", "student");
      }

      // FIXED: Search filter - single line, no newlines
      if (searchQuery) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%,sport.ilike.%${searchQuery}%`
        );
      }

      // Exclude user's own tickets
      if (excludeUserId) {
        query = query.not("seller_id", "eq", excludeUserId);
      }

      // Apply initial database sorting (will be overridden by client-side season ticket prioritization if needed)
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
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      // Pagination
      query = query.range(offset, offset + limit - 1);

      const { data, error } = await query;

      if (error) throw error;

      let tickets = data as unknown as TicketWithSeller[];

      // Apply season pass prioritization - only when filtering by specific sport (not "All Sports")
      if (sport && sport !== "All Sports") {
        tickets = tickets.sort((a, b) => {
          // Check if event is marked as season pass
          const aIsSeasonPass = a.event?.is_season_pass;
          const bIsSeasonPass = b.event?.is_season_pass;

          // If one is season pass and the other isn't, season pass goes first
          if (aIsSeasonPass && !bIsSeasonPass) return -1;
          if (!aIsSeasonPass && bIsSeasonPass) return 1;

          // For all other cases, maintain the database sort order by applying the same sort logic
          switch (sortBy) {
            case "price_asc":
              return a.price - b.price;
            case "price_desc":
              return b.price - a.price;
            case "event_date":
              return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
            case "created_at":
            default:
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
        });
      }

      return { data: tickets, error: null };
    } catch (error) {
      console.error("Error fetching tickets:", error);
      return { data: [], error };
    }
  }

  // Get ticket by ID with details
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
            avatar_url,
            college_id,
            colleges (
              id,
              name,
              short_name,
              primary_color,
              secondary_color
            )
          ),
          event:events!tickets_event_id_fkey (
            id,
            title,
            event_date,
            location,
            venue,
            sport,
            opponent,
            home_college_id,
            away_college_id,
            is_home_game,
            home_team,
            away_team,
            is_season_pass
          ),
          home_college:colleges!tickets_home_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          ),
          away_college:colleges!tickets_away_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;

      return { data: data as unknown as TicketWithSeller, error: null };
    } catch (error) {
      console.error("Error fetching ticket:", error);
      return { data: null, error };
    }
  }

  // Get ticket with all details
  static async getTicketWithDetails(
    ticketId: string
  ): Promise<{ data: TicketWithDetails | null; error: any }> {
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
            avatar_url,
            college_id,
            colleges (
              id,
              name,
              short_name,
              primary_color,
              secondary_color
            )
          ),
          event:events!tickets_event_id_fkey (
            id,
            title,
            event_date,
            location,
            venue,
            sport,
            opponent,
            home_college_id,
            away_college_id,
            is_home_game,
            home_team,
            away_team,
            is_season_pass
          ),
          home_college:colleges!tickets_home_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          ),
          away_college:colleges!tickets_away_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          )
        `
        )
        .eq("id", ticketId)
        .single();

      if (error) throw error;

      return { data: data as unknown as TicketWithDetails, error: null };
    } catch (error) {
      console.error("Error fetching ticket details:", error);
      return { data: null, error };
    }
  }

  // Create new ticket
  static async createTicket(ticketData: {
    event_id: string;
    section: string;
    row_number: string;
    seat_number: string;
    price: number;
    description?: string;
    ticket_type?: 'general_admission' | 'student';
  }): Promise<{ data: Ticket | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get the event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("*")
        .eq("id", ticketData.event_id)
        .single();

      if (eventError || !event) {
        throw new Error("Event not found");
      }

      // Create the ticket (college IDs will be assigned by the database trigger)
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
          ticket_type: ticketData.ticket_type || 'student',
        })
        .select()
        .single();

      if (error) throw error;

      // Track IP address for ticket creation (important action)
      ipTrackingService.trackOnAction(user.id, 'ticket_created').then((result) => {
        if (result.success) {
          console.log('🌐 Ticket creation IP tracking successful:', result.ip);
        } else {
          console.log('⏰ Ticket creation IP tracking skipped:', result.reason);
        }
      }).catch((error) => {
        console.log('❌ Ticket creation IP tracking error:', error);
      });

      return { data, error: null };
    } catch (error) {
      console.error("Error creating ticket:", error);
      return { data: null, error };
    }
  }

  // Update ticket
  static async updateTicket(
    id: string,
    updates: Partial<TicketInsert>
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

  // Purchase ticket
  static async purchaseTicket(
    ticketId: string
  ): Promise<{ data: { id: string } | null; error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get ticket details for validation
      const { data: ticket, error: fetchError } = await supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey (
            id,
            username,
            full_name
          )
        `
        )
        .eq("id", ticketId)
        .single();

      if (fetchError || !ticket) {
        throw new Error("Ticket not found");
      }

      if (ticket.status !== "available") {
        throw new Error("Ticket is no longer available");
      }

      if (ticket.seller_id === user.id) {
        throw new Error("You cannot purchase your own ticket");
      }

      // Call the database function (which includes college validation)
      const { data: purchaseResult, error: purchaseError } = await supabase.rpc(
        "purchase_ticket",
        {
          p_ticket_id: ticketId,
          p_buyer_id: user.id,
        }
      );

      if (purchaseError) {
        throw purchaseError;
      }

      // Track IP address for ticket purchase (important action)
      ipTrackingService.trackOnAction(user.id, 'ticket_purchased').then((result) => {
        if (result.success) {
          console.log('🌐 Ticket purchase IP tracking successful:', result.ip);
        } else {
          console.log('⏰ Ticket purchase IP tracking skipped:', result.reason);
        }
      }).catch((error) => {
        console.log('❌ Ticket purchase IP tracking error:', error);
      });

      return { data: { id: ticketId }, error: null };
    } catch (error: any) {
      console.error("Error purchasing ticket:", error);
      return {
        data: null,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
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
          ),
          home_college:colleges!tickets_home_college_id_fkey (
            id,
            name,
            short_name
          ),
          away_college:colleges!tickets_away_college_id_fkey (
            id,
            name,
            short_name
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
          ),
          home_college:colleges!tickets_home_college_id_fkey (
            id,
            name,
            short_name
          ),
          away_college:colleges!tickets_away_college_id_fkey (
            id,
            name,
            short_name
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
      const { data, error } = await this.updateTicket(ticketId, {
        status: "cancelled",
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error cancelling ticket:", error);
      return { data: null, error };
    }
  }

  // Check ticket access for multi-tenant
  static async checkTicketAccess(
    ticketId: string,
    userId: string
  ): Promise<{
    canBuy: boolean;
    reason?: string;
    requiresCollegeId?: boolean;
    isSeasonTicket?: boolean;
  }> {
    try {
      // Get user's college
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("college_id")
        .eq("id", userId)
        .single();

      if (!userProfile) {
        return { canBuy: false, reason: "User profile not found" };
      }

      // Get ticket with college details
      const { data: ticket } = await supabase
        .from("tickets")
        .select(
          `
          *,
          home_college:colleges!tickets_home_college_id_fkey (
            id,
            name,
            short_name
          ),
          away_college:colleges!tickets_away_college_id_fkey (
            id,
            name,
            short_name
          )
        `
        )
        .eq("id", ticketId)
        .single();

      if (!ticket) {
        return { canBuy: false, reason: "Ticket not found" };
      }

      // Check if ticket is available
      if (ticket.status !== "available") {
        return { canBuy: false, reason: "Ticket is no longer available" };
      }

      // Check if user is trying to buy their own ticket
      if (ticket.seller_id === userId) {
        return { canBuy: false, reason: "You cannot buy your own ticket" };
      }

      // If no college restrictions, allow purchase
      if (!ticket.home_college_id && !ticket.away_college_id) {
        return {
          canBuy: true,
          isSeasonTicket: ticket.is_season_ticket,
        };
      }

      // Check if user has a college association
      if (!userProfile.college_id) {
        return {
          canBuy: false,
          reason:
            "You must be associated with a college to purchase this ticket",
          requiresCollegeId: true,
        };
      }

      // Check if user's college is involved in the event
      const userCollegeId = userProfile.college_id;
      const canAccess =
        userCollegeId === ticket.home_college_id ||
        userCollegeId === ticket.away_college_id;

      if (!canAccess) {
        const colleges = [ticket.home_college, ticket.away_college]
          .filter(Boolean)
          .map((c) => c?.name)
          .join(" vs ");

        return {
          canBuy: false,
          reason: `This ticket is only available to students from: ${colleges}`,
          requiresCollegeId: true,
        };
      }

      return {
        canBuy: true,
        isSeasonTicket: ticket.is_season_ticket,
      };
    } catch (error) {
      console.error("Error checking ticket access:", error);
      return { canBuy: false, reason: "Error checking ticket access" };
    }
  }
}
