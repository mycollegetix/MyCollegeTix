// src/providers/PendingOrdersProvider.tsx
// Context provider for tracking pending orders across the app
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { useAuth } from "@/src/providers/AuthProvider";

interface PendingOrdersContextType {
  pendingAsBuyer: number;
  pendingAsSeller: number;
  totalPending: number;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PendingOrdersContext = createContext<PendingOrdersContextType>({
  pendingAsBuyer: 0,
  pendingAsSeller: 0,
  totalPending: 0,
  loading: true,
  refresh: async () => {},
});

export function usePendingOrders() {
  return useContext(PendingOrdersContext);
}

export function PendingOrdersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pendingAsBuyer, setPendingAsBuyer] = useState(0);
  const [pendingAsSeller, setPendingAsSeller] = useState(0);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  const fetchPendingOrders = useCallback(async () => {
    if (!user?.id) {
      setPendingAsBuyer(0);
      setPendingAsSeller(0);
      setLoading(false);
      return;
    }

    try {
      // Fetch orders where user is buyer and payment is held (awaiting transfer/confirmation)
      const { count: buyerCount, error: buyerError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("buyer_id", user.id)
        .in("escrow_status", ["payment_held", "transfer_pending"]);

      if (buyerError) {
        console.error("Error fetching buyer pending orders:", buyerError);
      }

      // Fetch orders where user is seller and needs to transfer ticket
      const { count: sellerCount, error: sellerError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("seller_id", user.id)
        .in("escrow_status", ["payment_held", "transfer_pending"]);

      if (sellerError) {
        console.error("Error fetching seller pending orders:", sellerError);
      }

      setPendingAsBuyer(buyerCount || 0);
      setPendingAsSeller(sellerCount || 0);
    } catch (error) {
      console.error("Error fetching pending orders:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch
  useEffect(() => {
    fetchPendingOrders();
  }, [fetchPendingOrders]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        // App has come to the foreground
        fetchPendingOrders();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchPendingOrders]);

  // Set up realtime subscription for order changes
  useEffect(() => {
    if (!user?.id) return;

    console.log("📡 Setting up realtime subscription for pending orders");

    const channel = supabase
      .channel(`pending-orders-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        (payload) => {
          console.log("📬 Order change detected:", payload.eventType);
          // Refresh counts when any order changes
          fetchPendingOrders();
        }
      )
      .subscribe((status) => {
        console.log("📡 Pending orders subscription status:", status);
      });

    return () => {
      console.log("📡 Removing pending orders subscription");
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchPendingOrders]);

  // Also listen to escrow_payments changes as backup
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`escrow-payments-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "escrow_payments",
        },
        () => {
          console.log("📬 Escrow payment change detected");
          fetchPendingOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchPendingOrders]);

  const value: PendingOrdersContextType = {
    pendingAsBuyer,
    pendingAsSeller,
    totalPending: pendingAsBuyer + pendingAsSeller,
    loading,
    refresh: fetchPendingOrders,
  };

  return (
    <PendingOrdersContext.Provider value={value}>
      {children}
    </PendingOrdersContext.Provider>
  );
}
