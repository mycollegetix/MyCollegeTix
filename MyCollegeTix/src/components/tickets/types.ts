// src/components/tickets/types.ts
// Shared types for ticket components

export interface OrderItem {
  id: string;
  title: string;
  description: string;
  price: number;
  event_date: string;
  location: string;
  sport?: string;
  section?: string;
  row_number?: string;
  seat_number?: string;
  status: string;
  created_at: string;
  order_id?: string;
  home_college_id?: string;
  away_college_id?: string;
  type: "purchase" | "listing";
  ticket_type?: "general_admission" | "student";
  event?: {
    id: string;
    is_season_pass: boolean;
  };
  sale?: {
    buyer_name: string;
    sale_date: string;
    sale_price: number;
  };
  // Additional fields for purchases
  seller_name?: string;
  seller_id?: string;
  payment_method?: string;
  // Rating information
  needsSellerRating?: boolean;
  ratingCount?: number;
  // Escrow/Stripe order fields
  escrow_status?: string;
  escrow_order_id?: string;
  transfer_deadline?: string;
  // Dispute fields
  dispute_id?: string;
  dispute_status?: string;
  // Buyer info (for sellers)
  buyer_name?: string;
  buyer_id?: string;
  // Pending transfer requiring seller action
  pending_transfer?: boolean;
  // Awaiting buyer confirmation (seller has transferred)
  awaiting_confirmation?: boolean;
  sold_at?: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
}

// Time remaining helper result
export interface TimeRemaining {
  text: string;
  urgent: boolean;
  expired: boolean;
}

// Calculate time remaining until deadline
export function getTimeRemaining(deadline: string): TimeRemaining {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffMs = deadlineDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return { text: "OVERDUE", urgent: true, expired: true };
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (diffHours < 1) {
    return {
      text: `${diffMinutes}m remaining`,
      urgent: true,
      expired: false,
    };
  } else if (diffHours < 4) {
    return {
      text: `${diffHours}h ${diffMinutes}m remaining`,
      urgent: true,
      expired: false,
    };
  } else if (diffHours < 24) {
    return { text: `${diffHours}h remaining`, urgent: false, expired: false };
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return {
      text: `${diffDays}d ${diffHours % 24}h remaining`,
      urgent: false,
      expired: false,
    };
  }
}

// Format date helper
export function formatSaleDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

// Format event date helper
export function formatEventDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Format event time helper
export function formatEventTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
