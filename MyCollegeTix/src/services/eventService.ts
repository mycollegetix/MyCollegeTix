// src/services/eventService.ts - Fixed TypeScript errors
import { supabase } from "../lib/supabase";
import { Event, EventWithColleges } from "../types/database.types";

export class EventService {
  // Get all available events for dropdown (backward compatibility)
  static async getAvailableEvents({
    sport,
    limit = 100,
    collegeId,
  }: {
    sport?: string;
    limit?: number;
    collegeId?: string;
  } = {}): Promise<{ data: Event[]; error: any }> {
    try {
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "available")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      // Filter by college if specified (multi-tenant support)
      if (collegeId) {
        query = query.or(
          `home_college_id.eq.${collegeId},away_college_id.eq.${collegeId},college_id.eq${collegeId}`
        );
      }

      // Filter by sport if specified
      if (sport && sport !== "All Sports") {
        query = query.ilike("sport", `%${sport}%`);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      let events = data || [];

      // Apply priority sorting: Season Pass events at top only when filtering by specific sport
      events = events.sort((a, b) => {
        // Only prioritize season passes when filtering by a specific sport (not "All Sports")
        if (sport && sport !== "All Sports") {
          const aIsSeasonPass = a.is_season_pass;
          const bIsSeasonPass = b.is_season_pass;

          // If one is season pass and the other isn't, season pass goes first
          if (aIsSeasonPass && !bIsSeasonPass) return -1;
          if (!aIsSeasonPass && bIsSeasonPass) return 1;
        }

        // For all other cases, sort by date
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });

      return { data: events, error: null };
    } catch (error) {
      console.error("Error fetching events:", error);
      return { data: [], error };
    }
  }

  // Get events with college information
  static async getEventsForCollege({
    collegeId,
    sport,
    limit = 100,
    includeAllColleges = false,
    onlyHomeGames = false,
    onlyAwayGames = false,
  }: {
    collegeId?: string;
    sport?: string;
    limit?: number;
    includeAllColleges?: boolean;
    onlyHomeGames?: boolean;
    onlyAwayGames?: boolean;
  } = {}): Promise<{ data: EventWithColleges[]; error: any }> {
    try {
      let query = supabase
        .from("events")
        .select(
          `
          *,
          home_college:colleges!events_home_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          ),
          away_college:colleges!events_away_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          )
        `
        )
        .eq("status", "available")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      // Multi-tenant filtering logic
      if (collegeId && !includeAllColleges) {
        if (onlyHomeGames) {
          query = query.eq("home_college_id", collegeId);
        } else if (onlyAwayGames) {
          query = query.eq("away_college_id", collegeId);
        } else {
          // Show events where user's college is involved (home or away) OR events with no college affiliation
          query = query.or(
            `home_college_id.eq.${collegeId},away_college_id.eq.${collegeId}`
          );
        }
      }

      // Filter by sport if specified
      if (sport && sport !== "All Sports") {
        query = query.ilike("sport", `%${sport}%`);
      }

      // Limit results
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      let events = data as EventWithColleges[];

      // Apply priority sorting: Season Pass events at top only when filtering by specific sport
      events = events.sort((a, b) => {
        // Only prioritize season passes when filtering by a specific sport (not "All Sports")
        if (sport && sport !== "All Sports") {
          const aIsSeasonPass = a.is_season_pass;
          const bIsSeasonPass = b.is_season_pass;

          // If one is season pass and the other isn't, season pass goes first
          if (aIsSeasonPass && !bIsSeasonPass) return -1;
          if (!aIsSeasonPass && bIsSeasonPass) return 1;
        }

        // For all other cases, sort by date
        return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
      });

      return { data: events, error: null };
    } catch (error) {
      console.error("Error fetching events for college:", error);
      return { data: [], error };
    }
  }

  // Get event by ID
  static async getEventById(
    id: string
  ): Promise<{ data: Event | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error("Error fetching event:", error);
      return { data: null, error };
    }
  }

  // Get event by ID with college information
  static async getEventByIdWithColleges(
    id: string
  ): Promise<{ data: EventWithColleges | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          home_college:colleges!events_home_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          ),
          away_college:colleges!events_away_college_id_fkey (
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

      return { data: data as EventWithColleges, error: null };
    } catch (error) {
      console.error("Error fetching event:", error);
      return { data: null, error };
    }
  }

  // Get events by sport
  static async getEventsBySport(
    sport: string,
    collegeId?: string
  ): Promise<{ data: Event[]; error: any }> {
    try {
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "available")
        .ilike("sport", `%${sport}%`)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      // Filter by college if specified
      if (collegeId) {
        query = query.or(
          `home_college_id.eq.${collegeId},away_college_id.eq.${collegeId}`
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error fetching events by sport:", error);
      return { data: [], error };
    }
  }

  // Get upcoming events for a college
  static async getUpcomingEvents(
    collegeId: string,
    limit: number = 10
  ): Promise<{ data: EventWithColleges[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          home_college:colleges!events_home_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          ),
          away_college:colleges!events_away_college_id_fkey (
            id,
            name,
            short_name,
            primary_color,
            secondary_color
          )
        `
        )
        .eq("status", "available")
        .or(`home_college_id.eq.${collegeId},away_college_id.eq.${collegeId}`)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(limit);

      if (error) throw error;

      return { data: data as EventWithColleges[], error: null };
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      return { data: [], error };
    }
  }
}
