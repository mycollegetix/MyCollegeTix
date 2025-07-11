// src/services/eventService.ts
import { supabase } from "../lib/supabase";
import { Event } from "../types/database.types";

export class EventService {
  // Get all available events for dropdown
  static async getAvailableEvents({
    sport,
    limit = 100,
  }: {
    sport?: string;
    limit?: number;
  } = {}): Promise<{ data: Event[]; error: any }> {
    try {
      let query = supabase
        .from("events")
        .select("*")
        .eq("status", "available")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      // Filter by sport if specified
      if (sport && sport !== "All Sports") {
        query = query.ilike("sport", `%${sport}%`);
      }

      query = query.limit(limit);

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error fetching events:", error);
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

  // Get events by sport
  static async getEventsBySport(
    sport: string
  ): Promise<{ data: Event[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("status", "available")
        .ilike("sport", `%${sport}%`)
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true });

      if (error) throw error;

      return { data: data || [], error: null };
    } catch (error) {
      console.error("Error fetching events by sport:", error);
      return { data: [], error };
    }
  }
}
