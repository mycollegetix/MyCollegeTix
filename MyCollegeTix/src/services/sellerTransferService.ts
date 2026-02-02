// src/services/sellerTransferService.ts - Seller Transfer (Payout) Management
import { supabase } from "@/src/lib/supabase";
import { Tables } from "@/src/types/database.types";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

type SellerTransfer = Tables<"seller_transfers">;
type TicketTransfer = Tables<"ticket_transfers">;

export interface SellerTransferWithDetails extends SellerTransfer {
  escrow_payment: {
    id: string;
    order_id: string;
    amount_cents: number;
    status: string;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
}

export interface TicketTransferUpdate {
  status?: TicketTransfer["status"];
  transfer_method?: string;
  transfer_proof_url?: string;
  transfer_initiated_at?: string;
}

export class SellerTransferService {
  // ============================================
  // TICKET TRANSFER ACTIONS (SELLER SIDE)
  // ============================================

  /**
   * Seller initiates ticket transfer
   * (Marks that they've sent the ticket to buyer)
   */
  static async initiateTicketTransfer(
    orderId: string,
    transferMethod: string,
    proofUrl?: string
  ): Promise<ServiceResponse<TicketTransfer>> {
    try {
      console.log("📤 Initiating ticket transfer:", orderId);

      // Verify current user is the seller
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Get the ticket transfer record
      const { data: transfer, error: getError } = await supabase
        .from("ticket_transfers")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (getError || !transfer) {
        return { data: null, error: "Transfer record not found", success: false };
      }

      if (transfer.seller_id !== user.id) {
        return { data: null, error: "Only the seller can initiate transfer", success: false };
      }

      if (transfer.status !== "pending") {
        return { data: null, error: "Transfer already initiated or completed", success: false };
      }

      // Update the ticket transfer
      const { data: updated, error: updateError } = await supabase
        .from("ticket_transfers")
        .update({
          status: "transfer_initiated",
          transfer_method: transferMethod,
          transfer_proof_url: proofUrl || null,
          transfer_initiated_at: new Date().toISOString(),
        })
        .eq("id", transfer.id)
        .select()
        .single();

      if (updateError) {
        return { data: null, error: updateError.message, success: false };
      }

      // Update order escrow status
      await supabase
        .from("orders")
        .update({ escrow_status: "transfer_pending" })
        .eq("id", orderId);

      console.log("✅ Ticket transfer initiated");
      return { data: updated, error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Update transfer proof (e.g., add screenshot)
   */
  static async updateTransferProof(
    orderId: string,
    proofUrl: string
  ): Promise<ServiceResponse<TicketTransfer>> {
    try {
      console.log("📷 Updating transfer proof:", orderId);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Verify seller owns this transfer
      const { data: transfer, error: getError } = await supabase
        .from("ticket_transfers")
        .select("*")
        .eq("order_id", orderId)
        .single();

      if (getError || !transfer) {
        return { data: null, error: "Transfer not found", success: false };
      }

      if (transfer.seller_id !== user.id) {
        return { data: null, error: "Only the seller can update proof", success: false };
      }

      const { data: updated, error: updateError } = await supabase
        .from("ticket_transfers")
        .update({ transfer_proof_url: proofUrl })
        .eq("id", transfer.id)
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
  // SELLER PAYOUT OPERATIONS
  // ============================================

  /**
   * Create seller transfer record (payout to seller)
   * Called after buyer confirms receipt or auto-confirm
   */
  static async createSellerTransfer(params: {
    escrowPaymentId: string;
    sellerId: string;
    stripeTransferId: string;
    stripeAccountId: string;
    amountCents: number;
  }): Promise<ServiceResponse<SellerTransfer>> {
    try {
      console.log("💰 Creating seller transfer record...", params);

      const { data, error } = await supabase
        .from("seller_transfers")
        .insert({
          escrow_payment_id: params.escrowPaymentId,
          seller_id: params.sellerId,
          stripe_transfer_id: params.stripeTransferId,
          stripe_account_id: params.stripeAccountId,
          amount_cents: params.amountCents,
          status: "pending",
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating seller transfer:", error);
        return { data: null, error: error.message, success: false };
      }

      console.log("✅ Seller transfer created:", data.id);
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
   * Update seller transfer status
   * Called from webhook when Stripe transfer completes
   */
  static async updateSellerTransferStatus(
    stripeTransferId: string,
    status: SellerTransfer["status"],
    failureReason?: string
  ): Promise<ServiceResponse<SellerTransfer>> {
    try {
      console.log("🔄 Updating seller transfer status:", stripeTransferId, status);

      const updateData: Partial<SellerTransfer> = {
        status,
      };

      if (status === "paid") {
        updateData.transferred_at = new Date().toISOString();
      }

      if (failureReason) {
        updateData.failure_reason = failureReason;
      }

      const { data, error } = await supabase
        .from("seller_transfers")
        .update(updateData)
        .eq("stripe_transfer_id", stripeTransferId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      // If transfer completed, update escrow payment and order
      if (status === "paid") {
        const { data: escrowPayment } = await supabase
          .from("escrow_payments")
          .select("order_id")
          .eq("id", data.escrow_payment_id)
          .single();

        if (escrowPayment) {
          await supabase
            .from("escrow_payments")
            .update({ status: "paid_out" })
            .eq("id", data.escrow_payment_id);

          await supabase
            .from("orders")
            .update({ escrow_status: "completed" })
            .eq("id", escrowPayment.order_id);
        }
      }

      console.log("✅ Seller transfer status updated");
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
   * Get seller's transfer history
   */
  static async getSellerTransferHistory(): Promise<ServiceResponse<SellerTransferWithDetails[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      const { data, error } = await supabase
        .from("seller_transfers")
        .select(`
          *,
          escrow_payment:escrow_payments (
            id,
            order_id,
            amount_cents,
            status
          ),
          seller:profiles (
            id,
            full_name,
            email,
            username
          )
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as SellerTransferWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get seller's total earnings
   */
  static async getSellerEarnings(): Promise<ServiceResponse<{
    totalEarnings: number;
    pendingPayouts: number;
    completedPayouts: number;
    transferCount: number;
  }>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      const { data: transfers, error } = await supabase
        .from("seller_transfers")
        .select("amount_cents, status")
        .eq("seller_id", user.id);

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      const completed = transfers?.filter((t) => t.status === "paid") || [];
      const pending = transfers?.filter((t) => t.status === "pending") || [];

      const totalEarnings = completed.reduce((sum, t) => sum + t.amount_cents, 0);
      const pendingPayouts = pending.reduce((sum, t) => sum + t.amount_cents, 0);

      return {
        data: {
          totalEarnings: totalEarnings / 100, // Convert to dollars
          pendingPayouts: pendingPayouts / 100,
          completedPayouts: totalEarnings / 100,
          transferCount: completed.length,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  /**
   * Get all pending transfers (admin only)
   */
  static async getPendingTransfers(): Promise<ServiceResponse<SellerTransferWithDetails[]>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data, error } = await supabase
        .from("seller_transfers")
        .select(`
          *,
          escrow_payment:escrow_payments (
            id,
            order_id,
            amount_cents,
            status
          ),
          seller:profiles (
            id,
            full_name,
            email,
            username
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as SellerTransferWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get failed transfers (admin only)
   */
  static async getFailedTransfers(): Promise<ServiceResponse<SellerTransferWithDetails[]>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data, error } = await supabase
        .from("seller_transfers")
        .select(`
          *,
          escrow_payment:escrow_payments (
            id,
            order_id,
            amount_cents,
            status
          ),
          seller:profiles (
            id,
            full_name,
            email,
            username
          )
        `)
        .eq("status", "failed")
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as SellerTransferWithDetails[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Retry failed transfer (admin only)
   */
  static async retryFailedTransfer(transferId: string): Promise<ServiceResponse<{ success: boolean }>> {
    try {
      console.log("🔄 Retrying failed transfer:", transferId);

      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      // Call Edge Function to retry the Stripe transfer
      const { data, error } = await supabase.functions.invoke("retry-transfer", {
        body: { transferId },
      });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: { success: true }, error: null, success: true };
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
   * Get transfer status display info
   */
  static getTransferStatusInfo(status: string): {
    color: string;
    icon: string;
    label: string;
  } {
    switch (status) {
      case "pending":
        return { color: "#f59e0b", icon: "time", label: "Pending" };
      case "paid":
        return { color: "#10b981", icon: "checkmark-circle", label: "Paid" };
      case "failed":
        return { color: "#ef4444", icon: "close-circle", label: "Failed" };
      case "reversed":
        return { color: "#6b7280", icon: "return-up-back", label: "Reversed" };
      default:
        return { color: "#6b7280", icon: "help-circle", label: "Unknown" };
    }
  }

  /**
   * Get ticket transfer method display info
   */
  static getTransferMethodInfo(method: string): {
    icon: string;
    label: string;
    description: string;
  } {
    switch (method) {
      case "email_transfer":
        return {
          icon: "mail",
          label: "Email Transfer",
          description: "Ticket sent via email/ticket provider",
        };
      case "airdrop":
        return {
          icon: "share",
          label: "AirDrop",
          description: "Ticket sent via AirDrop",
        };
      case "screenshot":
        return {
          icon: "image",
          label: "Screenshot",
          description: "Screenshot/barcode shared",
        };
      case "in_person":
        return {
          icon: "people",
          label: "In Person",
          description: "Meeting in person to transfer",
        };
      default:
        return {
          icon: "swap-horizontal",
          label: "Other",
          description: "Other transfer method",
        };
    }
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
