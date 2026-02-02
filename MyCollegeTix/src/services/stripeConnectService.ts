// src/services/stripeConnectService.ts - Stripe Connect Account Management
import { supabase } from "@/src/lib/supabase";
import { Tables, TablesUpdate } from "@/src/types/database.types";

export interface ServiceResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

type StripeAccount = Tables<"stripe_accounts">;

export interface StripeAccountWithProfile extends StripeAccount {
  user: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
}

export interface OnboardingResult {
  accountId: string;
  onboardingUrl: string;
}

export interface DashboardLinkResult {
  hasAccount: boolean;
  onboardingComplete: boolean;
  url: string | null;
  message?: string;
}

export type EligibilityReason =
  | "eligible"
  | "no_account"
  | "incomplete_onboarding"
  | "restricted"
  | "disabled"
  | "pending_verification"
  | "error";

export type EligibilityAction =
  | "create_account"
  | "complete_onboarding"
  | "update_info"
  | "contact_support"
  | "retry";

export interface SellingEligibilityResult {
  canSell: boolean;
  reason: EligibilityReason;
  message: string;
  details?: string[];
  actionRequired?: EligibilityAction;
  onboardingUrl?: string;
}

export class StripeConnectService {
  // ============================================
  // ACCOUNT CREATION & ONBOARDING
  // ============================================

  /**
   * Create a Stripe Connect Express account for the current user
   * Calls the Edge Function which handles the Stripe API
   */
  static async createConnectAccount(): Promise<ServiceResponse<OnboardingResult>> {
    try {
      console.log("🔗 Creating Stripe Connect account...");

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Check if user already has an account
      const existing = await this.getAccountByUserId(user.id);
      if (existing.data) {
        // Return refresh link instead
        return this.refreshOnboardingLink();
      }

      // Call Edge Function to create account
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { userId: user.id },
      });

      if (error) {
        console.error("❌ Error creating Connect account:", error);
        return { data: null, error: error.message, success: false };
      }

      console.log("✅ Connect account created:", data.accountId);
      return {
        data: {
          accountId: data.accountId,
          onboardingUrl: data.onboardingUrl,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in createConnectAccount:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get a Stripe Express dashboard login link for the current user
   * If user has no account, returns flag to initiate onboarding
   * If onboarding incomplete, returns onboarding link instead
   */
  static async getDashboardLink(): Promise<ServiceResponse<DashboardLinkResult>> {
    try {
      console.log("🔗 Getting Stripe dashboard link...");

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Call Edge Function to get dashboard link
      const { data, error } = await supabase.functions.invoke("get-stripe-dashboard-link", {
        body: {},
      });

      if (error) {
        console.error("❌ Error getting dashboard link:", error);
        return { data: null, error: error.message, success: false };
      }

      if (!data.success) {
        return { data: null, error: data.error || "Failed to get dashboard link", success: false };
      }

      console.log("✅ Dashboard link result:", data.hasAccount ? "has account" : "no account");
      return {
        data: {
          hasAccount: data.hasAccount,
          onboardingComplete: data.onboardingComplete ?? false,
          url: data.url || null,
          message: data.message,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in getDashboardLink:", error);
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Check if the current user is eligible to sell tickets
   * Performs a server-side check against Stripe API for accurate status
   * Returns detailed information about why they can't sell if blocked
   */
  static async checkSellingEligibility(): Promise<ServiceResponse<SellingEligibilityResult>> {
    try {
      console.log("🔍 Checking selling eligibility...");

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Call Edge Function to check eligibility
      const { data, error } = await supabase.functions.invoke("check-selling-eligibility", {
        body: {},
      });

      if (error) {
        console.error("❌ Error checking eligibility:", error);
        // Return a blocking result on error (fail safely)
        return {
          data: {
            canSell: false,
            reason: "error",
            message: "Unable to verify your payment account. Please check your connection and try again.",
            actionRequired: "retry",
          },
          error: error.message,
          success: false,
        };
      }

      if (!data.success && data.error) {
        // Edge function returned an error but with eligibility data
        return {
          data: {
            canSell: data.canSell ?? false,
            reason: data.reason ?? "error",
            message: data.message ?? "An error occurred",
            details: data.details,
            actionRequired: data.actionRequired,
            onboardingUrl: data.onboardingUrl,
          },
          error: data.error,
          success: false,
        };
      }

      console.log("✅ Eligibility check result:", data.canSell ? "eligible" : data.reason);
      return {
        data: {
          canSell: data.canSell,
          reason: data.reason,
          message: data.message,
          details: data.details,
          actionRequired: data.actionRequired,
          onboardingUrl: data.onboardingUrl,
        },
        error: null,
        success: true,
      };
    } catch (error) {
      console.error("💥 Unexpected error in checkSellingEligibility:", error);
      // Return a blocking result on error (fail safely)
      return {
        data: {
          canSell: false,
          reason: "error",
          message: "Unable to verify your payment account. Please try again.",
          actionRequired: "retry",
        },
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get a fresh onboarding link for an existing account
   * (Links expire, so we may need to refresh)
   */
  static async refreshOnboardingLink(): Promise<ServiceResponse<OnboardingResult>> {
    try {
      console.log("🔄 Refreshing onboarding link...");

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      // Call Edge Function to refresh link
      const { data, error } = await supabase.functions.invoke("refresh-connect-onboarding", {
        body: { userId: user.id },
      });

      if (error) {
        console.error("❌ Error refreshing onboarding link:", error);
        return { data: null, error: error.message, success: false };
      }

      return {
        data: {
          accountId: data.accountId,
          onboardingUrl: data.onboardingUrl,
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
  // ACCOUNT STATUS & RETRIEVAL
  // ============================================

  /**
   * Get current user's Stripe account
   */
  static async getCurrentUserAccount(): Promise<ServiceResponse<StripeAccount>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { data: null, error: "User not authenticated", success: false };
      }

      return this.getAccountByUserId(user.id);
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get Stripe account by user ID
   */
  static async getAccountByUserId(userId: string): Promise<ServiceResponse<StripeAccount>> {
    try {
      const { data, error } = await supabase
        .from("stripe_accounts")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No account found
          return { data: null, error: null, success: true };
        }
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
   * Get Stripe account by Stripe account ID
   */
  static async getAccountByStripeId(stripeAccountId: string): Promise<ServiceResponse<StripeAccount>> {
    try {
      const { data, error } = await supabase
        .from("stripe_accounts")
        .select("*")
        .eq("stripe_account_id", stripeAccountId)
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
   * Check if current user is ready to receive payments
   */
  static async isReadyToReceivePayments(): Promise<ServiceResponse<boolean>> {
    try {
      const { data: account, error } = await this.getCurrentUserAccount();

      if (error) {
        return { data: false, error, success: false };
      }

      if (!account) {
        return { data: false, error: null, success: true };
      }

      const isReady =
        account.onboarding_completed &&
        account.charges_enabled &&
        account.payouts_enabled &&
        account.account_status === "enabled";

      return { data: isReady, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Check if a specific seller is ready to receive payments
   */
  static async isSellerReadyToReceivePayments(sellerId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: account, error } = await this.getAccountByUserId(sellerId);

      if (error) {
        return { data: false, error, success: false };
      }

      if (!account) {
        return { data: false, error: null, success: true };
      }

      const isReady =
        account.onboarding_completed &&
        account.charges_enabled &&
        account.payouts_enabled &&
        account.account_status === "enabled";

      return { data: isReady, error: null, success: true };
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  // ============================================
  // ACCOUNT STATUS UPDATES
  // (Called by webhooks via Edge Functions)
  // ============================================

  /**
   * Update Stripe account status
   * Typically called from webhook handler
   */
  static async updateAccountStatus(
    stripeAccountId: string,
    updates: {
      account_status?: StripeAccount["account_status"];
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
      details_submitted?: boolean;
      onboarding_completed?: boolean;
    }
  ): Promise<ServiceResponse<StripeAccount>> {
    try {
      console.log("🔄 Updating Stripe account status:", stripeAccountId, updates);

      const { data, error } = await supabase
        .from("stripe_accounts")
        .update(updates)
        .eq("stripe_account_id", stripeAccountId)
        .select()
        .single();

      if (error) {
        console.error("❌ Error updating account status:", error);
        return { data: null, error: error.message, success: false };
      }

      // Also update the profile's stripe_onboarding_complete flag
      if (updates.onboarding_completed !== undefined) {
        await supabase
          .from("profiles")
          .update({ stripe_onboarding_complete: updates.onboarding_completed })
          .eq("id", data.user_id);
      }

      console.log("✅ Account status updated");
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
   * Mark account as disabled (e.g., deauthorized)
   */
  static async disableAccount(stripeAccountId: string): Promise<ServiceResponse<StripeAccount>> {
    try {
      console.log("⚠️ Disabling Stripe account:", stripeAccountId);

      const { data, error } = await supabase
        .from("stripe_accounts")
        .update({
          account_status: "disabled",
          charges_enabled: false,
          payouts_enabled: false,
        })
        .eq("stripe_account_id", stripeAccountId)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      // Update profile flag
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: false })
        .eq("id", data.user_id);

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
  // ADMIN FUNCTIONS
  // ============================================

  /**
   * Get all Stripe accounts (admin only)
   */
  static async getAllAccounts(): Promise<ServiceResponse<StripeAccountWithProfile[]>> {
    try {
      // Verify admin
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data, error } = await supabase
        .from("stripe_accounts")
        .select(`
          *,
          user:profiles (
            id,
            full_name,
            email,
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as StripeAccountWithProfile[], error: null, success: true };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
        success: false,
      };
    }
  }

  /**
   * Get accounts with issues (admin only)
   */
  static async getAccountsWithIssues(): Promise<ServiceResponse<StripeAccountWithProfile[]>> {
    try {
      const isAdmin = await this.verifyAdminPermissions();
      if (!isAdmin) {
        return { data: null, error: "Admin privileges required", success: false };
      }

      const { data, error } = await supabase
        .from("stripe_accounts")
        .select(`
          *,
          user:profiles (
            id,
            full_name,
            email,
            username
          )
        `)
        .in("account_status", ["restricted", "disabled", "pending"])
        .order("created_at", { ascending: false });

      if (error) {
        return { data: null, error: error.message, success: false };
      }

      return { data: data as StripeAccountWithProfile[], error: null, success: true };
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
   * Get account status display info
   */
  static getAccountStatusInfo(status: string): {
    color: string;
    icon: string;
    label: string;
    description: string;
  } {
    switch (status) {
      case "pending":
        return {
          color: "#f59e0b",
          icon: "time",
          label: "Pending",
          description: "Account created, onboarding not started",
        };
      case "onboarding":
        return {
          color: "#3b82f6",
          icon: "person-add",
          label: "Onboarding",
          description: "User is completing Stripe setup",
        };
      case "enabled":
        return {
          color: "#10b981",
          icon: "checkmark-circle",
          label: "Active",
          description: "Ready to receive payments",
        };
      case "restricted":
        return {
          color: "#f59e0b",
          icon: "warning",
          label: "Restricted",
          description: "Additional verification needed",
        };
      case "disabled":
        return {
          color: "#ef4444",
          icon: "close-circle",
          label: "Disabled",
          description: "Account is disabled",
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
   * Verify admin permissions
   */
  private static async verifyAdminPermissions(): Promise<boolean> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return false;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (profileError) return false;
      return profile?.is_admin === true;
    } catch {
      return false;
    }
  }
}
