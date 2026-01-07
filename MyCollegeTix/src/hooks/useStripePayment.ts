// src/hooks/useStripePayment.ts
// Custom hook for handling Stripe payments in the app
import { useState, useCallback } from "react";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";

// Dynamically import Stripe hooks to handle Expo Go
let usePaymentSheet: any = null;
let PaymentSheetError: any = null;
let stripeHooksAvailable = false;

try {
  const stripe = require("@stripe/stripe-react-native");
  usePaymentSheet = stripe.usePaymentSheet;
  PaymentSheetError = stripe.PaymentSheetError;
  stripeHooksAvailable = true;
} catch (e) {
  console.warn("⚠️ Stripe hooks not available");
}

export interface PaymentResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export interface CheckoutDetails {
  clientSecret: string;
  orderId: string;
  paymentIntentId: string;
  amount: number;
  amountCents: number;
  transferDeadline: string;
  ticket: {
    id: string;
    title: string;
    eventDate: string;
  };
  seller: {
    name: string;
  };
}

export function useStripePayment() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conditionally use Stripe hooks - returns dummy functions if not available
  const stripeSheet = stripeHooksAvailable && usePaymentSheet ? usePaymentSheet() : null;
  const initPaymentSheet = stripeSheet?.initPaymentSheet || (async () => ({ error: { message: "Stripe not available" } }));
  const presentPaymentSheet = stripeSheet?.presentPaymentSheet || (async () => ({ error: { message: "Stripe not available" } }));

  /**
   * Initialize payment for a ticket purchase
   */
  const initializePayment = useCallback(
    async (ticketId: string): Promise<CheckoutDetails | null> => {
      if (!user) {
        setError("You must be logged in to make a purchase");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Get session token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("No active session");
        }

        // Call Edge Function to create PaymentIntent
        const { data, error: fnError } = await supabase.functions.invoke(
          "create-payment-intent",
          {
            body: { ticketId },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (fnError) {
          throw new Error(fnError.message || "Failed to create payment");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to create payment intent");
        }

        // Initialize the PaymentSheet
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: data.clientSecret,
          merchantDisplayName: "MyCollegeTix",
          style: "automatic",
          allowsDelayedPaymentMethods: false,
          defaultBillingDetails: {
            email: user.email,
          },
          applePay: {
            merchantCountryCode: "US",
          },
          googlePay: {
            merchantCountryCode: "US",
            testEnv: __DEV__,
          },
        });

        if (initError) {
          throw new Error(initError.message);
        }

        return {
          clientSecret: data.clientSecret,
          orderId: data.orderId,
          paymentIntentId: data.paymentIntentId,
          amount: data.amount,
          amountCents: data.amountCents,
          transferDeadline: data.transferDeadline,
          ticket: data.ticket,
          seller: data.seller,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment initialization failed";
        setError(message);
        console.error("Payment initialization error:", err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, initPaymentSheet]
  );

  /**
   * Present the payment sheet and complete payment
   */
  const completePayment = useCallback(async (): Promise<PaymentResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === PaymentSheetError.Canceled) {
          return {
            success: false,
            error: "Payment was cancelled",
          };
        }
        throw new Error(paymentError.message);
      }

      return {
        success: true,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      setError(message);
      console.error("Payment error:", err);
      return {
        success: false,
        error: message,
      };
    } finally {
      setIsLoading(false);
    }
  }, [presentPaymentSheet]);

  /**
   * Full checkout flow: initialize and present payment
   */
  const checkout = useCallback(
    async (ticketId: string): Promise<PaymentResult & { orderId?: string }> => {
      // Initialize payment
      const checkoutDetails = await initializePayment(ticketId);
      if (!checkoutDetails) {
        return {
          success: false,
          error: error || "Failed to initialize payment",
        };
      }

      // Complete payment
      const result = await completePayment();

      if (result.success) {
        return {
          success: true,
          orderId: checkoutDetails.orderId,
        };
      }

      return result;
    },
    [initializePayment, completePayment, error]
  );

  /**
   * Confirm receipt of a ticket (buyer action)
   */
  const confirmReceipt = useCallback(
    async (orderId: string): Promise<{ success: boolean; error?: string }> => {
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

        const { data, error: fnError } = await supabase.functions.invoke(
          "confirm-receipt",
          {
            body: { orderId },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (fnError) {
          throw new Error(fnError.message || "Failed to confirm receipt");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to confirm receipt");
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to confirm receipt";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  /**
   * Mark transfer as sent (seller action)
   * Called when seller has transferred the ticket on their end
   */
  const markTransferSent = useCallback(
    async (orderId: string): Promise<{ success: boolean; error?: string }> => {
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

        const { data, error: fnError } = await supabase.functions.invoke(
          "mark-transfer-sent",
          {
            body: { orderId },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          }
        );

        if (fnError) {
          throw new Error(fnError.message || "Failed to mark transfer");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to mark transfer as sent");
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to mark transfer";
        setError(message);
        return { success: false, error: message };
      } finally {
        setIsLoading(false);
      }
    },
    [user]
  );

  return {
    isLoading,
    error,
    initializePayment,
    completePayment,
    checkout,
    confirmReceipt,
    markTransferSent,
    clearError: () => setError(null),
  };
}
