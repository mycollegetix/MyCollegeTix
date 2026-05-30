// src/services/escrowService.ts - Escrow Payment Management Service
import { supabase } from "@/src/lib/supabase";
import { Tables, TablesInsert, TablesUpdate } from "@/src/types/database.types";

// Types
export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

type EscrowPayment = Tables<"escrow_payments">;
type TicketTransfer = Tables<"ticket_transfers">;
type Order = Tables<"orders">;

// Extended types with relations
export interface EscrowPaymentWithDetails extends EscrowPayment {
  order: {
    id: string;
    buyer_id: string;
    seller_id: string;
    ticket_id: string;
    amount: number;
    escrow_status: string | null;
  };
}

export interface TicketTransferWithDetails extends TicketTransfer {
  order: Order;
  ticket: {
    id: string;
    title: string;
    event_date: string;
  };
  seller: {
    id: string;
    full_name: string;
    username: string;
  };
  buyer: {
    id: string;
    full_name: string;
    username: string;
  };
}

// Transfer window calculation
export function calculateTransferDeadline(eventDate: Date, purchaseDate: Date = new Date()): Date {
  const hoursUntilEvent = (eventDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60);

  let windowHours: number;

  if (hoursUntilEvent <= 4) {
    // Event in less than 4 hours: 1 hour window
    windowHours = 1;
  } else if (hoursUntilEvent <= 12) {
    // Event in 4-12 hours: 2 hour window
    windowHours = 2;
  } else if (hoursUntilEvent <= 24) {
    // Event in 12-24 hours: 4 hour window
    windowHours = 4;
  } else {
    // Event more than 24 hours away: 24 hour window
    windowHours = 24;
  }

  return new Date(purchaseDate.getTime() + windowHours * 60 * 60 * 1000);
}

export function canPurchaseTicket(eventDate: Date): { allowed: boolean; reason?: string } {
  const hoursUntilEvent = (eventDate.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntilEvent <= 1) {
    return {
      allowed: false,
      reason: "Purchases disabled within 1 hour of event start",
    };
  }

  if (hoursUntilEvent <= 0) {
    return {
      allowed: false,
      reason: "Event has already started",
    };
  }

  return { allowed: true };
}

export class EscrowService {
  // ============================================
  // ESCROW PAYMENT OPERATIONS
  // ============================================

  /**
   * Create a new escrow payment record
   * Called after Stripe PaymentIntent is created
   */
  static async createEscrowPayment(params: {
    orderId: string;
    stripePaymentIntentId: string;
    amountCents: number;
    buyerEmail?: string;
  }): Promise<ServiceResponse<EscrowPayment>> {
    try {
      console.log("💳 Creating escrow payment record...", params);

      const { data, error } = await supabase
        .from("escrow_payments")
        .insert({
          order_id: params.orderId,
          stripe_payment_intent_id: params.stripePaymentIntentId,
          amount_cents: params.amountCents,
          buyer_email: params.buyerEmail,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating escrow payment:", error);
        return { data: null, error: error.message, success: false };
      }

      console.log("✅ Escrow payment created:", data.id);
      return { data, error: null, success: true };
    } catch (error) {
      console.error("💥 Unexpected error in createEscrowPayment:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get escrow payment by order ID
   */
  static async getEscrowPaymentByOrderId(
    orderId: string
  ): Promise<ServiceResponse<EscrowPaymentWithDetails>> {
    try {
      const { data, error } = await supabase
        .from("escrow_payments")
        .select(`
          *,
          order:orders (
            id,
            buyer_id,
            seller_id,
            ticket_id,
            amount,
            escrow_status
          )
        `)
        .eq("order_id", orderId)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as EscrowPaymentWithDetails, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get escrow payment by Stripe PaymentIntent ID
   */
  static async getEscrowPaymentByStripeId(
    stripePaymentIntentId: string
  ): Promise<ServiceResponse<EscrowPayment>> {
    try {
      const { data, error } = await supabase
        .from("escrow_payments")
        .select("*")
        .eq("stripe_payment_intent_id", stripePaymentIntentId)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Update escrow payment status
   */
  static async updateEscrowPaymentStatus(
    escrowPaymentId: string,
    status: EscrowPayment["status"],
    additionalData?: Partial<TablesUpdate<"escrow_payments">>
  ): Promise<ServiceResponse<EscrowPayment>> {
    try {
      console.log("🔄 Updating escrow payment status:", escrowPaymentId, status);

      const { data, error } = await supabase
        .from("escrow_payments")
        .update({
          status,
          ...additionalData,
        })
        .eq("id", escrowPaymentId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating escrow payment:", error);
        return { data: null, error: error.message, success: false };
      }

      console.log("✅ Escrow payment status updated");
      return { data, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // TICKET TRANSFER OPERATIONS
  // ============================================

  /**
   * Create ticket transfer record when purchase is made
   */
  static async createTicketTransfer(params: {
    orderId: string;
    ticketId: string;
    sellerId: string;
    buyerId: string;
    eventDate: Date;
  }): Promise<ServiceResponse<TicketTransfer>> {
    try {
      console.log("📋 Creating ticket transfer record...", params);

      const transferDeadline = calculateTransferDeadline(params.eventDate);

      const { data, error } = await supabase
        .from("ticket_transfers")
        .insert({
          order_id: params.orderId,
          ticket_id: params.ticketId,
          seller_id: params.sellerId,
          buyer_id: params.buyerId,
          transfer_deadline: transferDeadline.toISOString(),
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating ticket transfer:", error);
        return { data: null, error: error.message, success: false };
      }

      console.log("✅ Ticket transfer created with deadline:", transferDeadline);
      return { data, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get ticket transfer by order ID
   */
  static async getTicketTransferByOrderId(
    orderId: string
  ): Promise<ServiceResponse<TicketTransferWithDetails>> {
    try {
      const { data, error } = await supabase
        .from("ticket_transfers")
        .select(`
          *,
          order:orders (*),
          ticket:tickets (
            id,
            title,
            event_date
          ),
          seller:profiles!ticket_transfers_seller_id_fkey (
            id,
            full_name,
            username
          ),
          buyer:profiles!ticket_transfers_buyer_id_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("order_id", orderId)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as TicketTransferWithDetails, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get user's active transfers (as buyer or seller)
   */
  static async getUserActiveTransfers(): Promise<ServiceResponse<TicketTransferWithDetails[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      const { data, error } = await supabase
        .from("ticket_transfers")
        .select(`
          *,
          order:orders (*),
          ticket:tickets (
            id,
            title,
            event_date
          ),
          seller:profiles!ticket_transfers_seller_id_fkey (
            id,
            full_name,
            username
          ),
          buyer:profiles!ticket_transfers_buyer_id_fkey (
            id,
            full_name,
            username
          )
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .in("status", ["pending", "transfer_initiated"])
        .order("transfer_deadline", { ascending: true });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as TicketTransferWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // ORDER ESCROW STATUS MANAGEMENT
  // ============================================

  /**
   * Update order's escrow status
   */
  static async updateOrderEscrowStatus(
    orderId: string,
    escrowStatus: string,
    additionalData?: Partial<TablesUpdate<"orders">>
  ): Promise<ServiceResponse<Order>> {
    try {
      console.log("🔄 Updating order escrow status:", orderId, escrowStatus);

      const { data, error } = await supabase
        .from("orders")
        .update({
          escrow_status: escrowStatus,
          ...additionalData,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating order escrow status:", error);
        return { data: null, error: error.message, success: false };
      }

      console.log("✅ Order escrow status updated");
      return { data, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // AUTO-CONFIRMATION
  // ============================================

  /**
   * Get transfers eligible for auto-confirmation
   * (past deadline, no disputes, not yet confirmed)
   */
  static async getTransfersForAutoConfirm(): Promise<ServiceResponse<TicketTransfer[]>> {
    try {
      const { data, error } = await supabase
        .from("ticket_transfers")
        .select("*")
        .in("status", ["pending", "transfer_initiated"])
        .lt("transfer_deadline", new Date().toISOString());

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      // Filter out transfers that have disputes
      const transfersWithoutDisputes: TicketTransfer[] = [];

      for (const transfer of data || []) {
        const { data: disputes } = await supabase
          .from("escrow_disputes")
          .select("id")
          .eq("order_id", transfer.order_id)
          .in("status", ["open", "under_review"])
          .limit(1);

        if (!disputes || disputes.length === 0) {
          transfersWithoutDisputes.push(transfer);
        }
      }

      return { data: transfersWithoutDisputes, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get remaining time until transfer deadline
   */
  static getTimeUntilDeadline(deadline: Date | string): {
    hours: number;
    minutes: number;
    isExpired: boolean;
    formatted: string;
  } {
    const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;
    const now = new Date();
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { hours: 0, minutes: 0, isExpired: true, formatted: "Expired" };
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let formatted: string;
    if (hours > 0) {
      formatted = `${hours}h ${minutes}m remaining`;
    } else {
      formatted = `${minutes}m remaining`;
    }

    return { hours, minutes, isExpired: false, formatted };
  }

  /**
   * Get escrow status display info
   */
  static getEscrowStatusInfo(status: string): {
    color: string;
    icon: string;
    label: string;
    description: string;
  } {
    switch (status) {
      case "payment_pending":
        return {
          color: "#f59e0b",
          icon: "card",
          label: "Payment Pending",
          description: "Waiting for payment to complete",
        };
      case "payment_held":
        return {
          color: "#3b82f6",
          icon: "lock-closed",
          label: "Payment Held",
          description: "Funds secured, waiting for ticket transfer",
        };
      case "transfer_pending":
        return {
          color: "#8b5cf6",
          icon: "swap-horizontal",
          label: "Transfer Pending",
          description: "Seller needs to transfer the ticket",
        };
      case "transfer_confirmed":
        return {
          color: "#10b981",
          icon: "checkmark-circle",
          label: "Transfer Confirmed",
          description: "Buyer confirmed receipt of ticket",
        };
      case "payout_pending":
        return {
          color: "#06b6d4",
          icon: "cash",
          label: "Payout Pending",
          description: "Processing payment to seller",
        };
      case "completed":
        return {
          color: "#10b981",
          icon: "checkmark-done-circle",
          label: "Completed",
          description: "Transaction complete, seller paid",
        };
      case "disputed":
        return {
          color: "#ef4444",
          icon: "warning",
          label: "Disputed",
          description: "Transaction under review",
        };
      case "refunded":
        return {
          color: "#6b7280",
          icon: "return-up-back",
          label: "Refunded",
          description: "Payment refunded to buyer",
        };
      default:
        return {
          color: "#6b7280",
          icon: "help-circle",
          label: "Unknown",
          description: "Status unknown",
        };
    }
  }
}
