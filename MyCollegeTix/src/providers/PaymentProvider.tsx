// src/providers/PaymentProvider.tsx
// Wraps the app with Stripe Provider for payment functionality
import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "./AuthProvider";

// Dynamically import Stripe to handle Expo Go where native modules aren't available
let RNStripeProvider: any = null;
let stripeAvailable = false;

try {
  const stripe = require("@stripe/stripe-react-native");
  RNStripeProvider = stripe.StripeProvider;
  stripeAvailable = true;
} catch (e) {
  console.warn("⚠️ Stripe native module not available (running in Expo Go?)");
}

// Stripe publishable key (safe to expose client-side)
const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

interface PaymentContextType {
  isStripeReady: boolean;
  stripeAccountStatus: StripeAccountStatus | null;
  refreshStripeStatus: () => Promise<void>;
}

interface StripeAccountStatus {
  hasAccount: boolean;
  accountId: string | null;
  accountStatus: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingCompleted: boolean;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isStripeReady, setIsStripeReady] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] =
    useState<StripeAccountStatus | null>(null);

  // Fetch user's Stripe account status
  const refreshStripeStatus = async () => {
    if (!user) {
      setStripeAccountStatus(null);
      return;
    }

    try {
      const { data: account, error } = await supabase
        .from("stripe_accounts")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = not found, which is fine
        console.error("Error fetching Stripe account:", error);
      }

      if (account) {
        setStripeAccountStatus({
          hasAccount: true,
          accountId: account.stripe_account_id,
          accountStatus: account.account_status,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          onboardingCompleted: account.onboarding_completed,
        });
      } else {
        setStripeAccountStatus({
          hasAccount: false,
          accountId: null,
          accountStatus: null,
          chargesEnabled: false,
          payoutsEnabled: false,
          onboardingCompleted: false,
        });
      }
    } catch (error) {
      console.error("Error fetching Stripe account status:", error);
    }
  };

  // Refresh status when user changes
  useEffect(() => {
    refreshStripeStatus();
  }, [user?.id]);

  // Check if Stripe is configured and available
  useEffect(() => {
    if (STRIPE_PUBLISHABLE_KEY && stripeAvailable) {
      setIsStripeReady(true);
    } else {
      if (!stripeAvailable) {
        console.warn(
          "⚠️ Stripe native module not available - payments disabled"
        );
      } else {
        console.warn("Stripe publishable key not configured");
      }
      setIsStripeReady(false);
    }
  }, []);

  const contextValue: PaymentContextType = {
    isStripeReady,
    stripeAccountStatus,
    refreshStripeStatus,
  };

  // Only wrap with StripeProvider if we have the key AND native module is available
  if (!STRIPE_PUBLISHABLE_KEY || !stripeAvailable || !RNStripeProvider) {
    return (
      <PaymentContext.Provider value={contextValue}>
        {children}
      </PaymentContext.Provider>
    );
  }

  return (
    <PaymentContext.Provider value={contextValue}>
      <RNStripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.mycollegetix.app"
        urlScheme="mycollegetix"
      >
        {children}
      </RNStripeProvider>
    </PaymentContext.Provider>
  );
}

export const usePayment = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error("usePayment must be used within a PaymentProvider");
  }
  return context;
};
