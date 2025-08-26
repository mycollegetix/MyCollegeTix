// src/utils/dateUtils.ts
// Utility functions for formatting event dates and times

/**
 * Formats an event date with proper game time handling
 * @param dateString - ISO date string from event_date field
 * @param gameTime - Game time string from game_time field (e.g., "7:00 PM", "TBA")
 * @param options - Formatting options for date display
 * @returns Formatted date and time string
 */
export function formatEventDateTime(
  dateString: string,
  gameTime?: string | null,
  options: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    separator?: string;
    showTime?: boolean;
  } = {}
): string {
  const { dateStyle = 'short', separator = ' • ', showTime = true } = options;
  
  const date = new Date(dateString);
  
  // Format date part
  let dateOptions: Intl.DateTimeFormatOptions;
  switch (dateStyle) {
    case 'full':
      dateOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };
      break;
    case 'long':
      dateOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };
      break;
    case 'medium':
      dateOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      break;
    case 'short':
    default:
      dateOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      break;
  }
  
  const dateStr = date.toLocaleDateString('en-US', dateOptions);
  
  if (!showTime) {
    return dateStr;
  }
  
  // Handle time part - use game_time field if available, otherwise extract from event_date
  let timeStr: string;
  if (gameTime && gameTime !== 'TBA') {
    timeStr = gameTime;
  } else if (gameTime === 'TBA') {
    timeStr = 'TBA';
  } else {
    // Fallback to extracting time from ISO date
    timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  return `${dateStr}${separator}${timeStr}`;
}

/**
 * Formats an event date and returns separate date and time strings
 * @param dateString - ISO date string from event_date field
 * @param gameTime - Game time string from game_time field (e.g., "7:00 PM", "TBA")
 * @param dateStyle - Style for date formatting
 * @returns Object with separate dateStr and timeStr
 */
export function formatEventDateSeparate(
  dateString: string,
  gameTime?: string | null,
  dateStyle: 'full' | 'long' | 'medium' | 'short' = 'long'
): { dateStr: string; timeStr: string } {
  const date = new Date(dateString);
  
  // Format date part
  let dateOptions: Intl.DateTimeFormatOptions;
  switch (dateStyle) {
    case 'full':
    case 'long':
      dateOptions = {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      };
      break;
    case 'medium':
      dateOptions = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      break;
    case 'short':
    default:
      dateOptions = {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      };
      break;
  }
  
  const dateStr = date.toLocaleDateString('en-US', dateOptions);
  
  // Handle time part - use game_time field if available, otherwise extract from event_date
  let timeStr: string;
  if (gameTime && gameTime !== 'TBA') {
    timeStr = gameTime;
  } else if (gameTime === 'TBA') {
    timeStr = 'TBA';
  } else {
    // Fallback to extracting time from ISO date
    timeStr = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
  
  return { dateStr, timeStr };
}