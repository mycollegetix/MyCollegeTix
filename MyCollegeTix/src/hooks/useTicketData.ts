// src/hooks/useTicketData.ts
// Hook for loading and filtering ticket data for the Tickets screen

import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { WatchlistService } from "@/src/services/watchlistService";
import { OrderItem } from "@/src/components/tickets/types";

// Helper function to check if a ticket's event has expired
function isEventExpired(eventDate: string): boolean {
  const now = new Date();
  const event = new Date(eventDate);
  const endOfEventDay = new Date(event);
  endOfEventDay.setHours(23, 59, 59, 999);
  return now > endOfEventDay;
}

interface TabStats {
  count: number;
  total: number;
}

export interface UseTicketDataReturn {
  // Raw data
  purchases: OrderItem[];
  listings: OrderItem[];
  watchlistCount: number;

  // Loading states
  loading: boolean;
  refreshing: boolean;

  // Actions
  refresh: () => Promise<void>;
  loadData: () => Promise<void>;

  // Filtered data for Selling tab
  selling: {
    disputed: OrderItem[];
    pendingTransfers: OrderItem[];
    awaitingConfirmation: OrderItem[];
    active: OrderItem[];
    sold: OrderItem[];
    cancelled: OrderItem[];
    expired: OrderItem[];
  };

  // Filtered data for Buying tab
  buying: {
    disputed: OrderItem[];
    awaitingTransfer: OrderItem[];
    other: OrderItem[];
  };

  // Tab stats for badge counts
  tabStats: {
    selling: TabStats;
    bought: TabStats;
    watchlist: TabStats;
  };
}

export function useTicketData(userId: string | undefined): UseTicketDataReturn {
  const [purchases, setPurchases] = useState<OrderItem[]>([]);
  const [listings, setListings] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Load user purchases from ticket_sales and orders tables
  const loadUserPurchases = useCallback(async (): Promise<OrderItem[]> => {
    if (!userId) return [];

    try {
      // Load from ticket_sales
      const { data: salesData, error: salesError } = await supabase
        .from("ticket_sales")
        .select(
          `
          id,
          created_at,
          sale_price,
          buyer_id,
          buyer_name,
          seller_id,
          seller_name,
          payment_method,
          ticket_id,
          tickets (
            id,
            title,
            description,
            event_date,
            location,
            sport,
            section,
            row_number,
            seat_number,
            ticket_type,
            status,
            home_college_id,
            away_college_id,
            event:events (id, is_season_pass)
          )
        `
        )
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });

      if (salesError) {
        console.error("Error loading purchases:", salesError);
        return [];
      }

      // Check ratings for each purchase
      const purchasesWithRatings = await Promise.all(
        (salesData || []).map(async (sale) => {
          const { data: ratingsData } = await supabase
            .from("user_ratings")
            .select("id, rater_id, rated_user_id")
            .eq("ticket_sale_id", sale.id);

          const totalRatings = ratingsData?.length || 0;
          const buyerRatedSeller =
            ratingsData?.some(
              (r) => r.rater_id === userId && r.rated_user_id === sale.seller_id
            ) || false;

          return {
            ...sale,
            ratingCount: totalRatings,
            needsSellerRating:
              totalRatings > 0 && !buyerRatedSeller && totalRatings < 2,
          };
        })
      );

      // Transform to OrderItem format
      const ticketSalePurchases: OrderItem[] = purchasesWithRatings.map(
        (sale): OrderItem => {
          const ticket = sale.tickets as any;
          if (!ticket) {
            return {
              id: sale.id,
              title: "Purchased Ticket (Details Unavailable)",
              description: `Purchased from ${
                sale.seller_name || "Unknown Seller"
              }`,
              price: sale.sale_price,
              event_date: sale.created_at,
              location: "Location Unavailable",
              status: "purchased",
              created_at: sale.created_at,
              order_id: sale.id,
              type: "purchase",
              seller_name: sale.seller_name ?? undefined,
              seller_id: sale.seller_id ?? undefined,
              payment_method: sale.payment_method ?? undefined,
              needsSellerRating: sale.needsSellerRating,
              ratingCount: sale.ratingCount,
            };
          }

          return {
            id: ticket.id,
            title: ticket.title,
            description: ticket.description,
            price: sale.sale_price,
            event_date: ticket.event_date,
            location: ticket.location,
            sport: ticket.sport,
            section: ticket.section,
            row_number: ticket.row_number,
            seat_number: ticket.seat_number,
            status: "purchased",
            created_at: sale.created_at,
            order_id: sale.id,
            home_college_id: ticket.home_college_id,
            away_college_id: ticket.away_college_id,
            type: "purchase",
            ticket_type: ticket.ticket_type,
            event: ticket.event,
            seller_name: sale.seller_name ?? undefined,
            seller_id: sale.seller_id ?? undefined,
            payment_method: sale.payment_method ?? undefined,
            needsSellerRating: sale.needsSellerRating,
            ratingCount: sale.ratingCount,
          };
        }
      );

      // Load Stripe escrow orders
      const { data: stripeOrders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id, status, escrow_status, amount, buyer_id, seller_id,
          ticket_id, transfer_deadline, created_at,
          ticket:tickets (
            id, title, description, event_date, location, sport,
            section, row_number, seat_number, ticket_type,
            home_college_id, away_college_id,
            event:events (id, is_season_pass)
          ),
          seller:profiles!orders_seller_id_fkey (id, full_name, username),
          dispute:escrow_disputes (id, status)
        `
        )
        .eq("buyer_id", userId)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error loading Stripe orders:", ordersError);
      }

      // Filter and transform Stripe orders
      const stripeOrderItems: OrderItem[] = (stripeOrders || [])
        .filter((order: any) => order.escrow_status !== "payment_pending")
        .map((order: any): OrderItem => {
          const ticket = order.ticket;
          const seller = order.seller;
          const dispute = Array.isArray(order.dispute)
            ? order.dispute[0]
            : order.dispute;

          return {
            id: ticket?.id || order.id,
            title: ticket?.title || "Ticket Purchase",
            description: ticket?.description || "",
            price: order.amount,
            event_date: ticket?.event_date || order.created_at,
            location: ticket?.location || "Location TBD",
            sport: ticket?.sport,
            section: ticket?.section,
            row_number: ticket?.row_number,
            seat_number: ticket?.seat_number,
            status:
              order.escrow_status === "disputed"
                ? "disputed"
                : order.escrow_status === "payment_held"
                ? "awaiting_transfer"
                : order.escrow_status === "completed"
                ? "completed"
                : "purchased",
            created_at: order.created_at,
            order_id: order.id,
            home_college_id: ticket?.home_college_id,
            away_college_id: ticket?.away_college_id,
            type: "purchase",
            ticket_type: ticket?.ticket_type,
            event: ticket?.event,
            seller_name: seller?.full_name || seller?.username || "Seller",
            seller_id: order.seller_id,
            payment_method: "Stripe",
            escrow_status: order.escrow_status,
            escrow_order_id: order.id,
            transfer_deadline: order.transfer_deadline,
            dispute_id: dispute?.id,
            dispute_status: dispute?.status,
          };
        });

      // Combine and dedupe
      const allPurchases = new Map<string, OrderItem>();
      ticketSalePurchases.forEach((p) => allPurchases.set(p.id, p));
      stripeOrderItems.forEach((o) => allPurchases.set(o.id, o));

      return Array.from(allPurchases.values()).sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error("Error in loadUserPurchases:", error);
      return [];
    }
  }, [userId]);

  // Load user listings
  const loadUserListings = useCallback(async (): Promise<OrderItem[]> => {
    if (!userId) return [];

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          id, title, description, price, event_date, location, sport,
          section, row_number, seat_number, status, created_at,
          home_college_id, away_college_id, ticket_type,
          event:events!tickets_event_id_fkey (id, is_season_pass),
          ticket_sales (buyer_name, buyer_id, created_at, sale_price)
        `
        )
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading listings:", error);
        return [];
      }

      // Load seller orders for escrow info
      const { data: sellerOrders } = await supabase
        .from("orders")
        .select(
          `
          id, status, escrow_status, amount, buyer_id, seller_id,
          ticket_id, transfer_deadline, created_at,
          buyer:profiles!orders_buyer_id_fkey (id, full_name, username),
          dispute:escrow_disputes (id, status)
        `
        )
        .eq("seller_id", userId)
        .order("created_at", { ascending: false });

      // Map orders by ticket_id
      const ordersMap = new Map<string, any>();
      (sellerOrders || []).forEach((order) => {
        if (order.escrow_status !== "payment_pending") {
          const existing = ordersMap.get(order.ticket_id);
          if (
            !existing ||
            (order.escrow_status &&
              ["payment_held", "transfer_pending", "completed"].includes(
                order.escrow_status
              ))
          ) {
            ordersMap.set(order.ticket_id, order);
          }
        }
      });

      // Transform to OrderItem format
      return (data || []).map((ticket: any): OrderItem => {
        const order = ordersMap.get(ticket.id);
        const dispute = order?.dispute
          ? Array.isArray(order.dispute)
            ? order.dispute[0]
            : order.dispute
          : undefined;

        const hasPendingTransfer = order?.escrow_status === "payment_held";
        const awaitingConfirmation =
          order?.escrow_status === "transfer_pending";
        const isDisputed = order?.escrow_status === "disputed";

        return {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          price: ticket.price,
          event_date: ticket.event_date,
          location: ticket.location,
          sport: ticket.sport,
          section: ticket.section,
          row_number: ticket.row_number,
          seat_number: ticket.seat_number,
          status: isDisputed ? "disputed" : ticket.status,
          created_at: ticket.created_at,
          home_college_id: ticket.home_college_id,
          away_college_id: ticket.away_college_id,
          ticket_type: ticket.ticket_type,
          event: ticket.event,
          type: "listing",
          sale: ticket.ticket_sales?.[0]
            ? {
                buyer_name: ticket.ticket_sales[0].buyer_name,
                sale_date: ticket.ticket_sales[0].created_at,
                sale_price: ticket.ticket_sales[0].sale_price,
              }
            : undefined,
          escrow_status: order?.escrow_status,
          escrow_order_id: order?.id,
          transfer_deadline: order?.transfer_deadline,
          buyer_name:
            order?.buyer?.full_name || ticket.ticket_sales?.[0]?.buyer_name,
          buyer_id: order?.buyer_id || ticket.ticket_sales?.[0]?.buyer_id,
          pending_transfer: hasPendingTransfer,
          awaiting_confirmation: awaitingConfirmation,
          sold_at: order?.created_at || ticket.ticket_sales?.[0]?.created_at,
          dispute_id: dispute?.id,
          dispute_status: dispute?.status,
        };
      });
    } catch (error) {
      console.error("Error in loadUserListings:", error);
      return [];
    }
  }, [userId]);

  // Main load function
  const loadData = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [purchasesData, listingsData, watchlistStats] = await Promise.all([
        loadUserPurchases(),
        loadUserListings(),
        WatchlistService.getWatchlistStats(),
      ]);

      setPurchases(purchasesData);
      setListings(listingsData);
      setWatchlistCount(watchlistStats.data?.totalItems || 0);
    } catch (error) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load your orders. Please try again.");
      setPurchases([]);
      setListings([]);
      setWatchlistCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, loadUserPurchases, loadUserListings]);

  // Refresh function
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // Load on mount
  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  // Memoized filtered data for Selling tab
  const selling = useMemo(
    () => ({
      disputed: listings
        .filter((t) => t.escrow_status === "disputed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),

      pendingTransfers: listings
        .filter((t) => t.pending_transfer === true)
        .sort((a, b) => {
          if (a.transfer_deadline && b.transfer_deadline) {
            return (
              new Date(a.transfer_deadline).getTime() -
              new Date(b.transfer_deadline).getTime()
            );
          }
          return 0;
        }),

      awaitingConfirmation: listings
        .filter((t) => t.awaiting_confirmation === true)
        .sort((a, b) => {
          if (a.sold_at && b.sold_at) {
            return (
              new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime()
            );
          }
          return 0;
        }),

      active: listings
        .filter(
          (t) =>
            t.status === "available" &&
            !isEventExpired(t.event_date) &&
            !t.pending_transfer &&
            !t.awaiting_confirmation
        )
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        ),

      sold: listings
        .filter((t) => t.status === "sold")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),

      cancelled: listings
        .filter((t) => t.status === "cancelled")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),

      expired: listings
        .filter((t) => t.status === "available" && isEventExpired(t.event_date))
        .sort(
          (a, b) =>
            new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
        ),
    }),
    [listings]
  );

  // Memoized filtered data for Buying tab
  const buying = useMemo(
    () => ({
      disputed: purchases
        .filter((p) => p.escrow_status === "disputed")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),

      awaitingTransfer: purchases
        .filter((p) => p.escrow_status === "transfer_pending")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),

      other: purchases
        .filter(
          (p) =>
            p.escrow_status !== "transfer_pending" &&
            p.escrow_status !== "disputed"
        )
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    }),
    [purchases]
  );

  // Memoized tab stats for badge counts
  const tabStats = useMemo(() => {
    // Selling: count active items (disputed + pending transfers + awaiting confirmation + active listings)
    const sellingActive = [
      ...selling.disputed,
      ...selling.pendingTransfers,
      ...selling.awaitingConfirmation,
      ...selling.active,
    ];
    const sellingTotal = sellingActive.reduce((sum, o) => sum + o.price, 0);

    // Bought: count active items (disputed + awaiting transfer)
    const boughtActive = [...buying.disputed, ...buying.awaitingTransfer];
    const boughtTotal = boughtActive.reduce((sum, o) => sum + o.price, 0);

    return {
      selling: { count: sellingActive.length, total: sellingTotal },
      bought: { count: boughtActive.length, total: boughtTotal },
      watchlist: { count: watchlistCount, total: 0 },
    };
  }, [selling, buying, watchlistCount]);

  return {
    purchases,
    listings,
    watchlistCount,
    loading,
    refreshing,
    refresh,
    loadData,
    selling,
    buying,
    tabStats,
  };
}

export default useTicketData;
