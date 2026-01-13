// src/services/disputeService.ts - Escrow Dispute Management
import { supabase } from "@/src/lib/supabase";
import { Tables } from "@/src/types/database.types";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

type EscrowDispute = Tables<"escrow_disputes">;

export interface DisputeWithDetails extends EscrowDispute {
  order: {
    id: string;
    buyer_id: string;
    seller_id: string;
    amount: number;
    escrow_status: string | null;
    ticket: {
      id: string;
      title: string;
      event_date: string;
    };
  };
  filed_by_user: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
  resolved_by_user?: {
    id: string;
    full_name: string;
    username: string;
  };
}

export interface CreateDisputeParams {
  orderId: string;
  reason: string;
  description?: string;
  evidenceUrls?: string[];
}

export type DisputeResolution = "resolved_refund" | "resolved_payout" | "escalated";

export class DisputeService {
  // ============================================
  // DISPUTE CREATION
  // ============================================

  /**
   * Open a new dispute for an order
   */
  static async openDispute(params: CreateDisputeParams): Promise<ServiceResponse<EscrowDispute>> {
    try {
      console.log("⚠️ Opening dispute for order:", params.orderId);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Get order to verify user is buyer or seller
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("id, buyer_id, seller_id, escrow_status")
        .eq("id", params.orderId)
        .single();

      if (orderError || !order) {
        return { data: null, error: "Order not found", success: false };
      }

      // Determine role
      let filedByRole: "buyer" | "seller";
      if (order.buyer_id === user.id) {
        filedByRole = "buyer";
      } else if (order.seller_id === user.id) {
        filedByRole = "seller";
      } else {
        return { data: null, error: "You are not part of this transaction", success: false };
      }

      // Check if dispute already exists
      const { data: existingDispute } = await supabase
        .from("escrow_disputes")
        .select("id, status")
        .eq("order_id", params.orderId)
        .in("status", ["open", "under_review"])
        .single();

      if (existingDispute) {
        return { data: null, error: "A dispute is already open for this order", success: false };
      }

      // Try to get escrow payment ID (may be null if RLS blocks access)
      const { data: escrowPayment, error: paymentError } = await supabase
        .from("escrow_payments")
        .select("id")
        .eq("order_id", params.orderId)
        .single();

      console.log("🔍 Escrow payment lookup:", {
        orderId: params.orderId,
        found: !!escrowPayment,
        error: paymentError?.message,
      });

      // escrow_payment_id is now nullable - we can proceed without it
      const escrowPaymentId = escrowPayment?.id || null;

      // Create the dispute
      const { data: dispute, error: createError } = await supabase
        .from("escrow_disputes")
        .insert({
          order_id: params.orderId,
          escrow_payment_id: escrowPaymentId, // Can be null
          filed_by: user.id,
          filed_by_role: filedByRole,
          reason: params.reason,
          description: params.description || null,
          evidence_urls: params.evidenceUrls || [],
          status: "open",
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Error creating dispute:", createError);
        return { data: null, error: createError.message, success: false };
      }

      // Update order and ticket transfer status
      await supabase
        .from("orders")
        .update({ escrow_status: "disputed" })
        .eq("id", params.orderId);

      await supabase
        .from("ticket_transfers")
        .update({ status: "disputed" })
        .eq("order_id", params.orderId);

      // Update escrow payment status if we have the ID
      if (escrowPaymentId) {
        await supabase
          .from("escrow_payments")
          .update({ status: "disputed" })
          .eq("id", escrowPaymentId);
      } else {
        // Update by order_id as fallback
        await supabase
          .from("escrow_payments")
          .update({ status: "disputed" })
          .eq("order_id", params.orderId);
      }

      console.log("✅ Dispute opened:", dispute.id);
      return { data: dispute, error: null, success: true };
    } catch (error) {
      console.error("💥 Error in openDispute:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Add evidence to an existing dispute
   */
  static async addEvidence(
    disputeId: string,
    evidenceUrls: string[]
  ): Promise<ServiceResponse<EscrowDispute>> {
    try {
      console.log("📷 Adding evidence to dispute:", disputeId);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Get dispute and verify ownership
      const { data: dispute, error: getError } = await supabase
        .from("escrow_disputes")
        .select("*")
        .eq("id", disputeId)
        .single();

      if (getError || !dispute) {
        return { data: null, error: "Dispute not found", success: false };
      }

      if (dispute.filed_by !== user.id) {
        return { data: null, error: "Only the dispute creator can add evidence", success: false };
      }

      if (dispute.status !== "open" && dispute.status !== "under_review") {
        return { data: null, error: "Cannot add evidence to resolved dispute", success: false };
      }

      // Merge new evidence with existing
      const existingUrls = dispute.evidence_urls || [];
      const updatedUrls = [...existingUrls, ...evidenceUrls];

      const { data: updated, error: updateError } = await supabase
        .from("escrow_disputes")
        .update({ evidence_urls: updatedUrls })
        .eq("id", disputeId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError.message, success: false };
      }

      return { data: updated, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // DISPUTE RETRIEVAL
  // ============================================

  /**
   * Get dispute by ID with full details
   */
  static async getDisputeById(disputeId: string): Promise<ServiceResponse<DisputeWithDetails>> {
    try {
      const { data, error } = await supabase
        .from("escrow_disputes")
        .select(`
          *,
          order:orders (
            id,
            buyer_id,
            seller_id,
            amount,
            escrow_status,
            ticket:tickets (
              id,
              title,
              event_date
            )
          ),
          filed_by_user:profiles!escrow_disputes_filed_by_fkey (
            id,
            full_name,
            email,
            username
          ),
          resolved_by_user:profiles!escrow_disputes_resolved_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("id", disputeId)
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as DisputeWithDetails, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get dispute by order ID
   */
  static async getDisputeByOrderId(orderId: string): Promise<ServiceResponse<DisputeWithDetails | null>> {
    try {
      const { data, error } = await supabase
        .from("escrow_disputes")
        .select(`
          *,
          order:orders (
            id,
            buyer_id,
            seller_id,
            amount,
            escrow_status,
            ticket:tickets (
              id,
              title,
              event_date
            )
          ),
          filed_by_user:profiles!escrow_disputes_filed_by_fkey (
            id,
            full_name,
            email,
            username
          ),
          resolved_by_user:profiles!escrow_disputes_resolved_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No dispute found
          return { data: null, error: null, success: true };
        }
        return { data: null, error: error.message, success: false };
      }

      return { data: data as DisputeWithDetails, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get current user's disputes
   */
  static async getUserDisputes(): Promise<ServiceResponse<DisputeWithDetails[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Get orders where user is buyer or seller
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (!orders || orders.length === 0) {
        return { data: [], error: null, success: true };
      }

      const orderIds = orders.map((o) => o.id);

      const { data, error } = await supabase
        .from("escrow_disputes")
        .select(`
          *,
          order:orders (
            id,
            buyer_id,
            seller_id,
            amount,
            escrow_status,
            ticket:tickets (
              id,
              title,
              event_date
            )
          ),
          filed_by_user:profiles!escrow_disputes_filed_by_fkey (
            id,
            full_name,
            email,
            username
          ),
          resolved_by_user:profiles!escrow_disputes_resolved_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .in("order_id", orderIds)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as DisputeWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // ADMIN DISPUTE MANAGEMENT
  // ============================================

  /**
   * Get all open disputes (admin only)
   */
  static async getOpenDisputes(): Promise<ServiceResponse<DisputeWithDetails[]>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data, error } = await supabase
        .from("escrow_disputes")
        .select(`
          *,
          order:orders (
            id,
            buyer_id,
            seller_id,
            amount,
            escrow_status,
            ticket:tickets (
              id,
              title,
              event_date
            )
          ),
          filed_by_user:profiles!escrow_disputes_filed_by_fkey (
            id,
            full_name,
            email,
            username
          ),
          resolved_by_user:profiles!escrow_disputes_resolved_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .in("status", ["open", "under_review"])
        .order("created_at", { ascending: true });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as DisputeWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get all disputes with filters (admin only)
   */
  static async getAllDisputes(filters?: {
    status?: string;
    limit?: number;
  }): Promise<ServiceResponse<DisputeWithDetails[]>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      let query = supabase
        .from("escrow_disputes")
        .select(`
          *,
          order:orders (
            id,
            buyer_id,
            seller_id,
            amount,
            escrow_status,
            ticket:tickets (
              id,
              title,
              event_date
            )
          ),
          filed_by_user:profiles!escrow_disputes_filed_by_fkey (
            id,
            full_name,
            email,
            username
          ),
          resolved_by_user:profiles!escrow_disputes_resolved_by_fkey (
            id,
            full_name,
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as DisputeWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Mark dispute as under review (admin only)
   */
  static async markUnderReview(disputeId: string): Promise<ServiceResponse<EscrowDispute>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data, error } = await supabase
        .from("escrow_disputes")
        .update({ status: "under_review" })
        .eq("id", disputeId)
        .select()
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
   * Resolve dispute (admin only)
   */
  static async resolveDispute(
    disputeId: string,
    resolution: DisputeResolution,
    resolutionNotes: string
  ): Promise<ServiceResponse<EscrowDispute>> {
    try {
      console.log("⚖️ Resolving dispute:", disputeId, resolution);

      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Get dispute details
      const { data: dispute, error: getError } = await supabase
        .from("escrow_disputes")
        .select("*, escrow_payment:escrow_payments(*)")
        .eq("id", disputeId)
        .single();

      if (getError || !dispute) {
        return { data: null, error: "Dispute not found", success: false };
      }

      // Update dispute
      const { data: updated, error: updateError } = await supabase
        .from("escrow_disputes")
        .update({
          status: resolution,
          resolution: resolutionNotes,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", disputeId)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError.message, success: false };
      }

      // Handle resolution actions
      if (resolution === "resolved_refund") {
        // Trigger refund via Edge Function
        await supabase.functions.invoke("process-refund", {
          body: {
            orderId: dispute.order_id,
            adminId: user.id,
            reason: resolutionNotes,
          },
        });
      } else if (resolution === "resolved_payout") {
        // Trigger payout to seller
        await supabase.functions.invoke("process-payout", {
          body: {
            orderId: dispute.order_id,
            adminId: user.id,
          },
        });
      }
      // If escalated, no automatic action - requires further investigation

      console.log("✅ Dispute resolved:", resolution);
      return { data: updated, error: null, success: true };
    } catch (error) {
      console.error("💥 Error resolving dispute:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // DISPUTE STATISTICS
  // ============================================

  /**
   * Get dispute statistics (admin only)
   */
  static async getDisputeStats(): Promise<ServiceResponse<{
    totalDisputes: number;
    openDisputes: number;
    resolvedRefunds: number;
    resolvedPayouts: number;
    escalated: number;
    averageResolutionTime: number; // in hours
  }>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data: disputes, error } = await supabase
        .from("escrow_disputes")
        .select("status, created_at, resolved_at");

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const stats = {
        totalDisputes: disputes.length,
        openDisputes: disputes.filter((d) => d.status === "open" || d.status === "under_review").length,
        resolvedRefunds: disputes.filter((d) => d.status === "resolved_refund").length,
        resolvedPayouts: disputes.filter((d) => d.status === "resolved_payout").length,
        escalated: disputes.filter((d) => d.status === "escalated").length,
        averageResolutionTime: 0,
      };

      // Calculate average resolution time
      const resolvedDisputes = disputes.filter((d) => d.resolved_at);
      if (resolvedDisputes.length > 0) {
        const totalHours = resolvedDisputes.reduce((sum, d) => {
          const created = new Date(d.created_at).getTime();
          const resolved = new Date(d.resolved_at!).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0);
        stats.averageResolutionTime = Math.round(totalHours / resolvedDisputes.length);
      }

      return { data: stats, error: null, success: true };
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
   * Get dispute status display info
   */
  static getDisputeStatusInfo(status: string): {
    color: string;
    icon: string;
    label: string;
    description: string;
  } {
    switch (status) {
      case "open":
        return {
          color: "#f59e0b",
          icon: "alert-circle",
          label: "Open",
          description: "Dispute filed, awaiting review",
        };
      case "under_review":
        return {
          color: "#3b82f6",
          icon: "search",
          label: "Under Review",
          description: "Admin is reviewing the dispute",
        };
      case "resolved_refund":
        return {
          color: "#10b981",
          icon: "checkmark-circle",
          label: "Resolved - Refund",
          description: "Buyer received a refund",
        };
      case "resolved_payout":
        return {
          color: "#10b981",
          icon: "checkmark-circle",
          label: "Resolved - Payout",
          description: "Seller received payment",
        };
      case "escalated":
        return {
          color: "#ef4444",
          icon: "arrow-up-circle",
          label: "Escalated",
          description: "Requires further investigation",
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

  /**
   * Get common dispute reasons
   */
  static getDisputeReasons(): { value: string; label: string }[] {
    return [
      { value: "ticket_not_received", label: "Ticket not received" },
      { value: "ticket_invalid", label: "Ticket is invalid or doesn't work" },
      { value: "wrong_ticket", label: "Received wrong ticket" },
      { value: "duplicate_ticket", label: "Ticket was already used" },
      { value: "seller_unresponsive", label: "Seller not responding" },
      { value: "buyer_unresponsive", label: "Buyer not responding" },
      { value: "payment_issue", label: "Payment issue" },
      { value: "other", label: "Other" },
    ];
  }

  private static async verifyAdminPermissions(): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      return profile?.is_admin === true;
    } catch {
      return false;
    }
  }
}
