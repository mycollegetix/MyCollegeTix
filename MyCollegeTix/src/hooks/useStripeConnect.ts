// src/hooks/useStripeConnect.ts
// Custom hook for Stripe Connect seller onboarding
import { useState, useCallback, useEffect } from "react";
import { Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";

export interface StripeAccountStatus {
  hasAccount: boolean;
  accountId: string | null;
  accountStatus: "pending" | "onboarding" | "enabled" | "restricted" | "disabled" | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompleted: boolean;
  detailsSubmitted: boolean;
}

export interface OnboardingResult {
  success: boolean;
  onboardingUrl?: string;
  error?: string;
}

export function useStripeConnect() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<StripeAccountStatus | null>(null);

  /**
   * Fetch current Stripe account status from local database
   */
  const fetchAccountStatus = useCallback(async (): Promise<StripeAccountStatus | null> => {
    if (!user) {
      setAccountStatus(null);
      return null;
    }

    try {
      const { data: account, error: fetchError } = await supabase
        .from("stripe_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching Stripe account:", fetchError);
      }

      const status: StripeAccountStatus = account
        ? {
            hasAccount: true,
            accountId: account.stripe_account_id,
            accountStatus: account.account_status,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            onboardingCompleted: account.onboarding_completed,
            detailsSubmitted: account.details_submitted,
          }
        : {
            hasAccount: false,
            accountId: null,
            accountStatus: null,
            chargesEnabled: false,
            payoutsEnabled: false,
            onboardingCompleted: false,
            detailsSubmitted: false,
          };

      setAccountStatus(status);
      return status;
    } catch (err) {
      console.error("Error fetching account status:", err);
      return null;
    }
  }, [user]);

  /**
   * Sync account status directly from Stripe (more reliable than webhooks)
   */
  const syncAccountStatus = useCallback(async (): Promise<StripeAccountStatus | null> => {
    if (!user) {
      return null;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      console.log("🔄 Syncing account status from Stripe...");

      const { data, error: fnError } = await supabase.functions.invoke(
        "sync-connect-status",
        {
          body: {},
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (fnError) {
        console.error("Sync error:", fnError);
        // Fall back to local database
        return fetchAccountStatus();
      }

      if (!data?.success) {
        console.error("Sync failed:", data?.error);
        return fetchAccountStatus();
      }

      console.log("✅ Synced from Stripe:", data);

      // Update local state with synced data
      const status: StripeAccountStatus = {
        hasAccount: true,
        accountId: accountStatus?.accountId || null,
        accountStatus: data.accountStatus,
        chargesEnabled: data.chargesEnabled,
        payoutsEnabled: data.payoutsEnabled,
        onboardingCompleted: data.onboardingCompleted,
        detailsSubmitted: data.detailsSubmitted,
      };

      setAccountStatus(status);
      return status;
    } catch (err) {
      console.error("Error syncing account status:", err);
      return fetchAccountStatus();
    }
  }, [user, accountStatus?.accountId, fetchAccountStatus]);

  // Refresh status when user changes
  useEffect(() => {
    fetchAccountStatus();
  }, [fetchAccountStatus]);

  /**
   * Start or continue Stripe Connect onboarding
   */
  const startOnboarding = useCallback(async (): Promise<OnboardingResult> => {
    if (!user) {
      return { success: false, error: "You must be logged in" };
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      // Check if user already has an account
      const currentStatus = await fetchAccountStatus();

      let functionName = "create-connect-account";
      let body: any = { userId: user.id };

      // If they have an account but haven't completed onboarding, refresh the link
      if (currentStatus?.hasAccount && !currentStatus.onboardingCompleted) {
        functionName = "refresh-connect-onboarding";
        body = {};
      }

      console.log(`📡 Calling Edge Function: ${functionName}`, body);

      const { data, error: fnError } = await supabase.functions.invoke(
        functionName,
        {
          body,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      console.log("📡 Edge Function response:", { data, fnError });

      if (fnError) {
        console.error("Edge Function error:", fnError);
        throw new Error(fnError.message || "Failed to start onboarding");
      }

      if (!data?.success) {
        console.error("Edge Function returned error:", data?.error);
        throw new Error(data?.error || "Failed to start onboarding");
      }

      // If onboarding is already complete
      if (data.isComplete) {
        await fetchAccountStatus();
        return {
          success: true,
          error: "Onboarding already complete!",
        };
      }

      return {
        success: true,
        onboardingUrl: data.onboardingUrl,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onboarding failed";
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchAccountStatus]);

  /**
   * Open Stripe onboarding in browser
   */
  const openOnboarding = useCallback(async (): Promise<boolean> => {
    const result = await startOnboarding();

    if (!result.success || !result.onboardingUrl) {
      return false;
    }

    try {
      // Open in browser - user will be redirected back to app via deep link
      await WebBrowser.openBrowserAsync(result.onboardingUrl, {
        dismissButtonStyle: "cancel",
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      });

      // Sync status directly from Stripe after returning from browser
      // This is more reliable than waiting for webhooks
      await syncAccountStatus();
      return true;
    } catch (err) {
      console.error("Error opening onboarding:", err);
      setError("Failed to open onboarding page");
      return false;
    }
  }, [startOnboarding, syncAccountStatus]);

  /**
   * Check if user can receive payments
   */
  const canReceivePayments = useCallback((): boolean => {
    if (!accountStatus) return false;
    return (
      accountStatus.hasAccount &&
      accountStatus.chargesEnabled &&
      accountStatus.payoutsEnabled &&
      accountStatus.onboardingCompleted
    );
  }, [accountStatus]);

  /**
   * Check if user needs to complete onboarding
   */
  const needsOnboarding = useCallback((): boolean => {
    if (!accountStatus) return true;
    return !accountStatus.onboardingCompleted || !accountStatus.payoutsEnabled;
  }, [accountStatus]);

  /**
   * Get human-readable status message
   */
  const getStatusMessage = useCallback((): string => {
    if (!accountStatus) return "Loading...";

    if (!accountStatus.hasAccount) {
      return "Set up payments to start selling tickets";
    }

    switch (accountStatus.accountStatus) {
      case "pending":
        return "Payment setup pending";
      case "onboarding":
        return "Complete your payment setup";
      case "enabled":
        return "Payments enabled - You're ready to sell!";
      case "restricted":
        return "Action required - Complete verification";
      case "disabled":
        return "Payments disabled - Contact support";
      default:
        return "Unknown status";
    }
  }, [accountStatus]);

  /**
   * Get status badge color
   */
  const getStatusColor = useCallback((): string => {
    if (!accountStatus) return "#6b7280"; // gray

    switch (accountStatus.accountStatus) {
      case "enabled":
        return "#10b981"; // green
      case "onboarding":
      case "pending":
        return "#f59e0b"; // yellow
      case "restricted":
        return "#f97316"; // orange
      case "disabled":
        return "#ef4444"; // red
      default:
        return "#6b7280"; // gray
    }
  }, [accountStatus]);

  return {
    isLoading,
    error,
    accountStatus,
    fetchAccountStatus,
    syncAccountStatus,
    startOnboarding,
    openOnboarding,
    canReceivePayments,
    needsOnboarding,
    getStatusMessage,
    getStatusColor,
    clearError: () => setError(null),
  };
}
