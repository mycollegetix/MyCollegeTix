// src/utils/eventGroupingUtils.ts - Event-based ticket grouping utilities
import { TicketWithSeller } from "../types/database.types";

export interface EventGroup {
  id: string;
  eventName: string;
  eventDate: string;
  location: string;
  sport: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  collegeMatchup: string | null;
  isSeasonPass: boolean;
  ticketCount: number;
  tickets: TicketWithSeller[];
  // For display purposes
  displayDate: string;
  displayTime: string;
  sportIcon: string;
}

export interface EventGroupingResult {
  groups: EventGroup[];
  totalTickets: number;
  totalEvents: number;
}

/**
 * Groups tickets by events, creating a folder-like structure
 * Handles both tickets with event_id and those without (legacy tickets)
 */
export function groupTicketsByEvents(tickets: TicketWithSeller[]): EventGroupingResult {
  const eventMap = new Map<string, EventGroup>();
  
  tickets.forEach((ticket) => {
    // Create a unique key for grouping
    // Priority: event_id > event_date + location combination
    const groupKey = ticket.event_id || 
      `${ticket.event_date}-${ticket.location}-${ticket.sport || 'general'}`;
    
    if (!eventMap.has(groupKey)) {
      // Create new event group
      const eventDate = new Date(ticket.event_date);
      const group: EventGroup = {
        id: groupKey,
        eventName: getEventName(ticket),
        eventDate: ticket.event_date,
        location: ticket.location,
        sport: ticket.sport,
        homeTeam: ticket.event?.home_team || ticket.home_college?.short_name || null,
        awayTeam: ticket.event?.away_team || ticket.away_college?.short_name || null,
        collegeMatchup: getCollegeMatchup(ticket),
        isSeasonPass: ticket.event?.is_season_pass || ticket.is_season_ticket || false,
        ticketCount: 0,
        tickets: [],
        displayDate: formatDisplayDate(eventDate),
        displayTime: formatDisplayTime(eventDate),
        sportIcon: getSportIcon(ticket.sport),
      };
      eventMap.set(groupKey, group);
    }
    
    // Add ticket to the group
    const group = eventMap.get(groupKey)!;
    group.tickets.push(ticket);
    group.ticketCount = group.tickets.length;
  });
  
  // Convert map to array and sort by date
  const groups = Array.from(eventMap.values()).sort((a, b) => {
    // Season passes first within sport filter, then by date
    if (a.isSeasonPass && !b.isSeasonPass) return -1;
    if (!a.isSeasonPass && b.isSeasonPass) return 1;
    
    return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
  });
  
  return {
    groups,
    totalTickets: tickets.length,
    totalEvents: groups.length,
  };
}

/**
 * Generates a display name for the event
 */
function getEventName(ticket: TicketWithSeller): string {
  // If we have event data, use the event title
  if (ticket.event?.title) {
    return ticket.event.title;
  }
  
  // If we have college matchup, use that
  const matchup = getCollegeMatchup(ticket);
  if (matchup) {
    return matchup;
  }
  
  // Fall back to ticket title or sport + location
  if (ticket.title && ticket.title !== 'Ticket') {
    return ticket.title;
  }
  
  return `${ticket.sport || 'Event'} at ${ticket.location}`;
}

/**
 * Gets college matchup string for display
 */
function getCollegeMatchup(ticket: TicketWithSeller): string | null {
  if (ticket.home_college && ticket.away_college) {
    return `${ticket.home_college.short_name} vs ${ticket.away_college.short_name}`;
  }
  
  if (ticket.home_college) {
    return `${ticket.home_college.short_name} Home Game`;
  }
  
  if (ticket.away_college) {
    return `@ ${ticket.away_college.short_name}`;
  }
  
  // Check event data as fallback
  if (ticket.event?.home_team && ticket.event?.away_team) {
    return `${ticket.event.home_team} vs ${ticket.event.away_team}`;
  }
  
  return null;
}

/**
 * Formats date for display (e.g., "Dec 15, 2024")
 */
function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Formats time for display (e.g., "7:00 PM")
 */
function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Gets appropriate sport icon for display
 */
function getSportIcon(sport: string | null): string {
  if (!sport) return "calendar-outline";
  
  switch (sport.toLowerCase()) {
    case "football":
      return "american-football-outline";
    case "basketball":
      return "basketball-outline";
    case "hockey":
      return "hockey-puck";
    case "soccer":
      return "football-outline";
    case "volleyball":
      return "tennisball-outline";
    case "baseball":
      return "baseball-outline";
    case "tennis":
      return "tennisball-outline";
    case "track and field":
      return "run-fast";
    case "cross country":
      return "run";
    case "golf":
      return "golf-outline";
    default:
      return "ticket-outline";
  }
}

/**
 * Filters event groups based on search query
 * Returns groups with matching events and expands them automatically
 */
export function filterEventGroups(
  groups: EventGroup[], 
  searchQuery: string
): { filteredGroups: EventGroup[]; expandedGroupIds: Set<string> } {
  if (!searchQuery.trim()) {
    return { filteredGroups: groups, expandedGroupIds: new Set() };
  }
  
  const query = searchQuery.toLowerCase().trim();
  const expandedGroupIds = new Set<string>();
  
  const filteredGroups = groups.map(group => {
    // Check if event name, location, sport, or teams match
    const eventMatches = (
      group.eventName.toLowerCase().includes(query) ||
      group.location.toLowerCase().includes(query) ||
      (group.sport && group.sport.toLowerCase().includes(query)) ||
      (group.homeTeam && group.homeTeam.toLowerCase().includes(query)) ||
      (group.awayTeam && group.awayTeam.toLowerCase().includes(query))
    );
    
    // Filter tickets within the group based on search
    const matchingTickets = group.tickets.filter(ticket =>
      ticket.title.toLowerCase().includes(query) ||
      ticket.description.toLowerCase().includes(query) ||
      ticket.location.toLowerCase().includes(query) ||
      (ticket.sport && ticket.sport.toLowerCase().includes(query)) ||
      (ticket.section && ticket.section.toLowerCase().includes(query))
    );
    
    // Include group if event matches or has matching tickets
    if (eventMatches || matchingTickets.length > 0) {
      expandedGroupIds.add(group.id);
      
      return {
        ...group,
        tickets: matchingTickets.length > 0 ? matchingTickets : group.tickets,
        ticketCount: matchingTickets.length > 0 ? matchingTickets.length : group.ticketCount,
      };
    }
    
    return null;
  }).filter(Boolean) as EventGroup[];
  
  return { filteredGroups, expandedGroupIds };
}

/**
 * Sorts event groups based on the specified criteria
 */
export function sortEventGroups(
  groups: EventGroup[], 
  sortBy: "price_asc" | "price_desc" | "event_date" | "created_at"
): EventGroup[] {
  return [...groups].sort((a, b) => {
    // Season passes always come first when filtering by sport
    if (a.isSeasonPass && !b.isSeasonPass) return -1;
    if (!a.isSeasonPass && b.isSeasonPass) return 1;
    
    switch (sortBy) {
      case "price_asc":
        const minPriceA = Math.min(...a.tickets.map(t => t.price));
        const minPriceB = Math.min(...b.tickets.map(t => t.price));
        return minPriceA - minPriceB;
      
      case "price_desc":
        const maxPriceA = Math.max(...a.tickets.map(t => t.price));
        const maxPriceB = Math.max(...b.tickets.map(t => t.price));
        return maxPriceB - maxPriceA;
      
      case "created_at":
        const newestA = Math.max(...a.tickets.map(t => new Date(t.created_at).getTime()));
        const newestB = Math.max(...b.tickets.map(t => new Date(t.created_at).getTime()));
        return newestB - newestA;
      
      case "event_date":
      default:
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    }
  });
}