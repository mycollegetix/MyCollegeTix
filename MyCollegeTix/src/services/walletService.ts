// src/services/walletService.ts - Seller balance / wallet visibility service
//
// Read-only. Pulls from the `seller_balances` SQL view created by
// migration 20260530000000_seller_balances_view.sql. The view does the
// aggregation in Postgres; this service just exposes a typed wrapper.
//
// This service does NOT change any escrow / payout / refund behavior.

import { supabase } from "@/src/lib/supabase";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

export interface SellerBalances {
  /**
   * Funds collected from buyers but not yet paid out to the seller's bank.
   * In dollars.
   */
  pendingBalance: number;
  /**
   * Total money actually deposited via Stripe Transfer over the seller's
   * lifetime (status='paid_out' only). Orthogonal to pendingBalance — adding
   * the two gives total gross sales ever. In dollars.
   */
  lifetimeEarnings: number;
}

// Shape of one row of the `seller_balances` view. Not yet in the generated
// database.types.ts — that file is regenerated from Supabase after the
// migration runs. Once regenerated, the cast on .from() below can be removed.
interface SellerBalanceRow {
  pending_cents: number;
  lifetime_earnings_cents: number;
}

const EMPTY_BALANCES: SellerBalances = {
  pendingBalance: 0,
  lifetimeEarnings: 0,
};

export class WalletService {
  /**
   * Get available / pending / lifetime balances for a seller.
   *
   * If `userId` is omitted, uses the currently authenticated user. RLS on the
   * underlying tables ensures a non-admin can only read their own row from
   * the `seller_balances` view, so passing someone else's id from a regular
   * client will return zeros (or null) without erroring.
   *
   * Returns dollars (the view stores cents).
   */
  static async getSellerBalances(
    userId?: string
  ): Promise<ServiceResponse<SellerBalances>> {
    try {
      let sellerId = userId;

      if (!sellerId) {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          return {
            data: null,
            error: "User not authenticated",
            success: false,
          };
        }
        sellerId = user.id;
      }

      // Cast to any: `seller_balances` is a SQL view added by migration
      // 20260530000000. Until `database.types.ts` is regenerated
      // (`npx supabase gen types typescript --linked > src/types/database.types.ts`),
      // the generated types don't know about it. Remove the cast after regenerating.
      const { data, error } = await (supabase as any)
        .from("seller_balances")
        .select("pending_cents, lifetime_earnings_cents")
        .eq("seller_id", sellerId)
        .maybeSingle();

      if (error) {
        console.error("❌ Error loading seller balances:", error);
        return { data: null, error: error.message, success: false };
      }

      // Seller with zero sales: view returns no row. That's expected.
      if (!data) {
        return { data: EMPTY_BALANCES, error: null, success: true };
      }

      const row = data as SellerBalanceRow;
      const balances: SellerBalances = {
        pendingBalance: centsToDollars(row.pending_cents),
        lifetimeEarnings: centsToDollars(row.lifetime_earnings_cents),
      };

      return { data: balances, error: null, success: true };
    } catch (err) {
      console.error("💥 Unexpected error in getSellerBalances:", err);
      return {
        data: null,
        error: err instanceof Error ? err.message : "Unknown error",
        success: false,
      };
    }
  }
}

function centsToDollars(cents: number | null | undefined): number {
  if (cents == null) return 0;
  // Round to 2 decimal places to avoid floating-point display oddness.
  return Math.round(cents) / 100;
}

/** Format a dollar amount for display, e.g. 1847.5 -> "$1,847.50". */
export function formatBalance(dollars: number): string {
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
