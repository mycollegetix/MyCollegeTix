// src/app/(tabs)/tickets.tsx - Styled to match Browse Tab with Mark as Sold and Edit functionality
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { TicketService } from "@/src/services/ticketService";
import { useTheme } from "@/src/providers/ThemeProvider";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import WatchlistSection from "@/src/components/WatchlistSection";
import { TicketTransferButton } from "@/src/components/TicketTransferButton";
import { WatchlistService } from "@/src/services/watchlistService";
import { supabase } from "@/src/lib/supabase";
import TicketSaleModal, {
  TicketSaleData,
} from "@/src/components/TicketSaleModal";
import SellerRatingModal, {
  SellerRatingData,
} from "@/src/components/SellerRatingModal";
import TicketEditModal, {
  TicketEditData,
} from "@/src/components/TicketEditModal";
import { TicketSaleService } from "@/src/services/ticketSaleService";
import { useStripePayment } from "@/src/hooks/useStripePayment";
import TransferProofModal from "@/src/components/TransferProofModal";
import { TransferProofService } from "@/src/services/transferProofService";

type OrderType = "selling" | "bought" | "watchlist";

interface FilterOption {
  value: OrderType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface StatusConfig {
  color: string;
  icon: string;
  text: string;
}

interface OrderItem {
  id: string;
  title: string;
  description: string;
  price: number;
  event_date: string;
  location: string;
  sport?: string;
  section?: string;
  row_number?: string;
  seat_number?: string;
  status: string;
  created_at: string;
  order_id?: string;
  home_college_id?: string;
  away_college_id?: string;
  type: "purchase" | "listing";
  ticket_type?: "general_admission" | "student";
  event?: {
    id: string;
    is_season_pass: boolean;
  };
  sale?: {
    buyer_name: string;
    sale_date: string;
    sale_price: number;
  };
  // Additional fields for purchases
  seller_name?: string;
  seller_id?: string;
  payment_method?: string;
  // Rating information
  needsSellerRating?: boolean;
  ratingCount?: number;
  // Escrow/Stripe order fields
  escrow_status?: string;
  escrow_order_id?: string;
  transfer_deadline?: string;
  // Dispute fields
  dispute_id?: string;
  dispute_status?: string;
  // Buyer info (for sellers)
  buyer_name?: string;
  buyer_id?: string;
  // Pending transfer requiring seller action
  pending_transfer?: boolean;
  // Awaiting buyer confirmation (seller has transferred)
  awaiting_confirmation?: boolean;
  sold_at?: string;
}

export default function TicketsScreen() {
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const theme = useTheme();
  const { user, profile } = useAuth();

  // Set initial tab based on URL param or default to "selling"
  const getInitialTab = (): OrderType => {
    if (tab === "bought") return "bought";
    if (tab === "watchlist") return "watchlist";
    return "selling";
  };
  const [activeTab, setActiveTab] = useState<OrderType>(getInitialTab());

  // Update tab when URL param changes
  useEffect(() => {
    if (tab === "bought") setActiveTab("bought");
    else if (tab === "watchlist") setActiveTab("watchlist");
  }, [tab]);

  const [purchases, setPurchases] = useState<OrderItem[]>([]);
  const [listings, setListings] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Animation refs for tab switching
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OrderItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Sale modal state
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedTicketForSale, setSelectedTicketForSale] =
    useState<OrderItem | null>(null);
  const [savingSale, setSavingSale] = useState(false);

  // Seller rating modal state (for buyer rating seller)
  const [sellerRatingModalVisible, setSellerRatingModalVisible] =
    useState(false);
  const [selectedTicketForRating, setSelectedTicketForRating] =
    useState<OrderItem | null>(null);
  const [savingRating, setSavingRating] = useState(false);

  // Seller rating prompt state (for seller rating buyer)
  const [pendingSellerRatingPrompt, setPendingSellerRatingPrompt] = useState<{
    id: string;
    order_id: string;
    ratee_id: string;
    ratee_name: string;
    ticket_title: string;
  } | null>(null);
  const [sellerRatingBuyerModalVisible, setSellerRatingBuyerModalVisible] =
    useState(false);
  const [savingSellerRating, setSavingSellerRating] = useState(false);

  // Dropdown states for collapsible sections
  const [disputedTicketsExpanded, setDisputedTicketsExpanded] = useState(true); // Default open - urgent!
  const [pendingTransfersExpanded, setPendingTransfersExpanded] =
    useState(true); // Default open for urgency
  const [awaitingConfirmationExpanded, setAwaitingConfirmationExpanded] =
    useState(true); // Default open
  const [activeListingsExpanded, setActiveListingsExpanded] = useState(true);
  const [soldTicketsExpanded, setSoldTicketsExpanded] = useState(false);
  const [cancelledTicketsExpanded, setCancelledTicketsExpanded] =
    useState(false);
  const [expiredListingsExpanded, setExpiredListingsExpanded] = useState(false); // Collapsed by default

  // Buyer tab collapsible sections
  const [awaitingTransferExpanded, setAwaitingTransferExpanded] = useState(true); // Default open for urgency
  const [disputedPurchasesExpanded, setDisputedPurchasesExpanded] = useState(true); // Default open - urgent!

  // Stripe payment hook for confirming receipt and marking transfer
  const { confirmReceipt, markTransferSent } = useStripePayment();
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  const [markingTransferId, setMarkingTransferId] = useState<string | null>(
    null
  );

  // Transfer proof modal state
  const [transferProofModalVisible, setTransferProofModalVisible] = useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<OrderItem | null>(null);

  // Filter options for segmented control
  const filterOptions: FilterOption[] = [
    {
      value: "selling",
      label: "Selling",
      icon: "storefront-outline",
    },
    {
      value: "bought",
      label: "Bought",
      icon: "receipt-outline",
    },
    {
      value: "watchlist",
      label: "Watchlist",
      icon: "bookmark-outline",
    },
  ];

  const boughtStats = getTabStats("bought");
  const sellingStats = getTabStats("selling");
  const watchlistStats = { count: watchlistCount, total: 0 };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Initialize animation position based on current filter
  useEffect(() => {
    const index = filterOptions.findIndex(
      (option) => option.value === activeTab
    );
    slideAnimation.setValue(index);
  }, []);

  // Check for pending ratings when the component mounts or when data changes
  useEffect(() => {
    checkForPendingRatings();
  }, [purchases]);

  const checkForPendingRatings = () => {
    // Find the first ticket that needs a seller rating
    const ticketNeedingRating = purchases.find(
      (ticket) => ticket.needsSellerRating
    );

    if (ticketNeedingRating && !sellerRatingModalVisible) {
      // Automatically show the rating modal for the first pending rating
      setSelectedTicketForRating(ticketNeedingRating);
      setSellerRatingModalVisible(true);
    }
  };

  // Check for pending rating prompts for sellers (seller rates buyer)
  const checkForSellerRatingPrompts = async () => {
    if (!user) return;

    try {
      // Query rating_prompts for pending prompts where this user is the prompter
      const { data: prompts, error } = await supabase
        .from("rating_prompts")
        .select(`
          id,
          ticket_sale_id,
          ratee_id,
          prompt_type
        `)
        .eq("prompter_id", user.id)
        .eq("prompt_type", "seller_rate_buyer")
        .eq("status", "pending")
        .limit(1)
        .single();

      if (error || !prompts) {
        // No pending prompts
        return;
      }

      // Get the order details to show in the modal
      const { data: order } = await supabase
        .from("orders")
        .select(`
          id,
          buyer:profiles!orders_buyer_id_fkey(full_name),
          ticket:tickets!orders_ticket_id_fkey(title)
        `)
        .eq("id", prompts.ticket_sale_id)
        .single();

      if (order) {
        setPendingSellerRatingPrompt({
          id: prompts.id,
          order_id: order.id,
          ratee_id: prompts.ratee_id,
          ratee_name: order.buyer?.full_name || "Buyer",
          ticket_title: order.ticket?.title || "Ticket",
        });
        // Show modal after a short delay
        setTimeout(() => setSellerRatingBuyerModalVisible(true), 500);
      }
    } catch (err) {
      console.log("No pending seller rating prompts");
    }
  };

  // Check for seller rating prompts when component mounts or tab changes to selling
  useEffect(() => {
    if (user && activeTab === "selling") {
      checkForSellerRatingPrompts();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log("🔄 Loading orders data for user:", user.id);

      // Load purchases, listings, and watchlist data in parallel
      const [purchasesData, listingsData, watchlistStatsData] =
        await Promise.all([
          loadUserPurchases(),
          loadUserListings(),
          WatchlistService.getWatchlistStats(),
        ]);

      setPurchases(purchasesData);
      setListings(listingsData);
      setWatchlistCount(watchlistStatsData.data?.totalItems || 0);

      console.log("✅ Orders data loaded successfully");
      console.log("Purchases:", purchasesData.length);
      console.log("Listings:", listingsData.length);
      console.log("Watchlist:", watchlistStatsData.data?.totalItems || 0);
    } catch (error) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load your orders. Please try again.");

      // Set empty arrays so the UI doesn't break
      setPurchases([]);
      setListings([]);
      setWatchlistCount(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserPurchases = async (): Promise<OrderItem[]> => {
    try {
      if (!user?.id) {
        return [];
      }

      // Load purchases from ticket_sales table where user is the buyer
      console.log(`🔍 Looking for purchases for user: ${user.id}`);

      // First, let's see what's in ticket_sales and why the join is failing
      const { data: salesOnly, error: salesError } = await supabase
        .from("ticket_sales")
        .select("id, ticket_id, buyer_id, sale_price, created_at")
        .eq("buyer_id", user.id);

      console.log("🔍 Raw ticket_sales data:", salesOnly);

      // Now check if those ticket IDs exist in the tickets table
      if (salesOnly && salesOnly.length > 0) {
        const ticketIds = salesOnly.map((sale) => sale.ticket_id);
        const { data: ticketsCheck } = await supabase
          .from("tickets")
          .select("id, title, status")
          .in("id", ticketIds);
        console.log("🔍 Corresponding tickets:", ticketsCheck);
      }

      const { data, error } = await supabase
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
          additional_notes,
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
            event:events (
              id,
              is_season_pass
            )
          )
        `
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      // For each purchase, check rating status
      const purchasesWithRatingInfo = await Promise.all(
        (data || []).map(async (sale) => {
          // Count total ratings for this ticket sale
          const { data: ratingsData, error: ratingsError } = await supabase
            .from("user_ratings")
            .select("id, rater_id, rated_user_id")
            .eq("ticket_sale_id", sale.id);

          if (ratingsError) {
            console.error(
              "Error loading ratings for sale:",
              sale.id,
              ratingsError
            );
            return { ...sale, ratingCount: 0, needsSellerRating: false };
          }

          const totalRatings = ratingsData?.length || 0;

          // Check if buyer (current user) has already rated the seller
          const buyerRatedSeller =
            ratingsData?.some(
              (rating) =>
                rating.rater_id === user.id &&
                rating.rated_user_id === sale.seller_id
            ) || false;

          // Buyer needs to rate seller if:
          // - There's at least one rating (seller rated buyer)
          // - But buyer hasn't rated seller yet
          // - And total ratings is less than 2
          const needsSellerRating =
            totalRatings > 0 && !buyerRatedSeller && totalRatings < 2;

          return {
            ...sale,
            ratingCount: totalRatings,
            needsSellerRating,
          };
        })
      );

      console.log(
        `📊 Found ${data?.length || 0} ticket_sales records for buyer_id: ${
          user.id
        }`
      );

      // Let's also check all ticket_sales for debugging
      const { data: allSales } = await supabase
        .from("ticket_sales")
        .select("id, buyer_id, buyer_name, seller_id, seller_name")
        .limit(10);
      console.log("🔍 Sample ticket_sales records:", allSales);

      if (error) {
        console.error("Error loading purchases:", error);
        return [];
      }

      // Transform ticket_sales data to OrderItem format
      const purchases =
        purchasesWithRatingInfo?.map((sale): OrderItem => {
          // Handle cases where the original ticket was deleted after sale
          if (!sale.tickets) {
            return {
              id: sale.id, // Use sale ID as fallback
              title: "Purchased Ticket (Details Unavailable)",
              description: `Purchased from ${
                sale.seller_name || "Unknown Seller"
              }`,
              price: sale.sale_price,
              event_date: sale.created_at, // Use sale date as fallback
              location: "Location Unavailable",
              status: "purchased",
              created_at: sale.created_at,
              order_id: sale.id,
              type: "purchase" as const,
              seller_name: sale.seller_name || undefined,
              seller_id: sale.seller_id || undefined,
              payment_method: sale.payment_method || undefined,
              needsSellerRating: sale.needsSellerRating,
              ratingCount: sale.ratingCount,
            };
          }

          // Normal case with ticket details
          return {
            id: sale.tickets.id,
            title: sale.tickets.title,
            description: sale.tickets.description,
            price: sale.sale_price,
            event_date: sale.tickets.event_date,
            location: sale.tickets.location,
            sport: sale.tickets.sport || undefined,
            section: sale.tickets.section || undefined,
            row_number: sale.tickets.row_number || undefined,
            seat_number: sale.tickets.seat_number || undefined,
            status: "purchased",
            created_at: sale.created_at,
            order_id: sale.id,
            home_college_id: sale.tickets.home_college_id || undefined,
            away_college_id: sale.tickets.away_college_id || undefined,
            type: "purchase" as const,
            ticket_type:
              (sale.tickets.ticket_type as
                | "general_admission"
                | "student"
                | undefined) || undefined,
            event: sale.tickets.event || undefined,
            seller_name: sale.seller_name || undefined,
            seller_id: sale.seller_id || undefined,
            payment_method: sale.payment_method || undefined,
            needsSellerRating: sale.needsSellerRating,
            ratingCount: sale.ratingCount,
          };
        }) || [];

      console.log(`✅ Loaded ${purchases.length} purchases from ticket_sales`);

      // Also load Stripe escrow orders
      const { data: stripeOrders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          escrow_status,
          amount,
          buyer_id,
          seller_id,
          ticket_id,
          transfer_deadline,
          created_at,
          ticket:tickets (
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
            home_college_id,
            away_college_id,
            event:events (
              id,
              is_season_pass
            )
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            username
          ),
          dispute:escrow_disputes (
            id,
            status
          )
        `
        )
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error loading Stripe orders:", ordersError);
      }

      // Filter out payment_pending orders (incomplete payments that never finished)
      // Only show orders where payment has actually been received
      const completedStripeOrders = (stripeOrders || []).filter(
        (order: any) => order.escrow_status !== "payment_pending"
      );

      // Transform Stripe orders to OrderItem format
      const stripeOrderItems: OrderItem[] = completedStripeOrders.map(
        (order: any): OrderItem => {
          const ticket = order.ticket;
          const seller = order.seller;
          // Get the most recent dispute (disputes is an array from the join)
          const dispute = Array.isArray(order.dispute) ? order.dispute[0] : order.dispute;

          return {
            id: ticket?.id || order.id,
            title: ticket?.title || "Ticket Purchase",
            description: ticket?.description || "",
            price: order.amount, // Already in dollars
            event_date: ticket?.event_date || order.created_at,
            location: ticket?.location || "Location TBD",
            sport: ticket?.sport || undefined,
            section: ticket?.section || undefined,
            row_number: ticket?.row_number || undefined,
            seat_number: ticket?.seat_number || undefined,
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
            home_college_id: ticket?.home_college_id || undefined,
            away_college_id: ticket?.away_college_id || undefined,
            type: "purchase" as const,
            ticket_type:
              (ticket?.ticket_type as
                | "general_admission"
                | "student"
                | undefined) || undefined,
            event: ticket?.event || undefined,
            seller_name: seller?.full_name || seller?.username || "Seller",
            seller_id: order.seller_id,
            payment_method: "Stripe",
            // Escrow fields
            escrow_status: order.escrow_status,
            escrow_order_id: order.id,
            transfer_deadline: order.transfer_deadline,
            // Dispute fields
            dispute_id: dispute?.id || undefined,
            dispute_status: dispute?.status || undefined,
          };
        }
      );

      console.log(
        `✅ Loaded ${
          stripeOrderItems.length
        } completed Stripe escrow orders (filtered from ${
          stripeOrders?.length || 0
        } total)`
      );
      console.log(
        "🔍 Stripe orders escrow_status:",
        stripeOrderItems.map((o) => ({
          id: o.escrow_order_id,
          escrow_status: o.escrow_status,
        }))
      );

      // Combine both sources, avoiding duplicates based on ticket_id
      // Use a Map to dedupe by ticket id, preferring Stripe orders (more recent/authoritative)
      const allPurchases = new Map<string, OrderItem>();

      // Add ticket_sales purchases first
      for (const purchase of purchases) {
        allPurchases.set(purchase.id, purchase);
      }

      // Override with Stripe orders (they take precedence)
      for (const order of stripeOrderItems) {
        allPurchases.set(order.id, order);
      }

      // Sort by most recent first
      const sortedPurchases = Array.from(allPurchases.values()).sort((a, b) => {
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      return sortedPurchases;
    } catch (error) {
      console.error("Error in loadUserPurchases:", error);
      return [];
    }
  };

  const loadUserListings = async (): Promise<OrderItem[]> => {
    try {
      // Load tickets where user is the seller
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
        id,
        title,
        description,
        price,
        event_date,
        location,
        sport,
        section,
        row_number,
        seat_number,
        status,
        created_at,
        home_college_id,
        away_college_id,
        ticket_type,
        event:events!tickets_event_id_fkey (
          id,
          is_season_pass
        ),
        ticket_sales (
          buyer_name,
          buyer_id,
          created_at,
          sale_price
        )
      `
        )
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading listings:", error);
        return [];
      }

      // Also load Stripe escrow orders where user is the SELLER
      const { data: sellerOrders, error: ordersError } = await supabase
        .from("orders")
        .select(
          `
          id,
          status,
          escrow_status,
          amount,
          buyer_id,
          seller_id,
          ticket_id,
          transfer_deadline,
          created_at,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            username
          ),
          dispute:escrow_disputes (
            id,
            status
          )
        `
        )
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error loading seller orders:", ordersError);
      }

      // Filter out payment_pending orders (incomplete payments) and create map
      // If multiple orders exist for the same ticket, prefer completed ones
      const stripeOrdersMap = new Map<string, any>();
      for (const order of sellerOrders || []) {
        // Skip payment_pending orders - these are incomplete transactions
        if (order.escrow_status === "payment_pending") {
          continue;
        }

        const existing = stripeOrdersMap.get(order.ticket_id);
        // Prefer payment_held or completed orders over pending ones
        if (
          !existing ||
          order.escrow_status === "payment_held" ||
          order.escrow_status === "transfer_pending" ||
          order.escrow_status === "completed"
        ) {
          stripeOrdersMap.set(order.ticket_id, order);
        }
      }

      // Map tickets to OrderItems, enriching with Stripe order data if available
      const listings = (data || []).map((ticket: any) => {
        const stripeOrder = stripeOrdersMap.get(ticket.id);
        // Get dispute info from order
        const dispute = stripeOrder?.dispute
          ? Array.isArray(stripeOrder.dispute)
            ? stripeOrder.dispute[0]
            : stripeOrder.dispute
          : undefined;
        // pending_transfer = needs seller action (hasn't transferred yet)
        const hasPendingTransfer =
          stripeOrder && stripeOrder.escrow_status === "payment_held";
        // awaiting_confirmation = seller has transferred, waiting for buyer
        const awaitingConfirmation =
          stripeOrder && stripeOrder.escrow_status === "transfer_pending";
        // Check if disputed
        const isDisputed = stripeOrder?.escrow_status === "disputed";

        // Use Stripe order buyer info if available, otherwise fall back to ticket_sales
        const buyerName =
          stripeOrder?.buyer?.full_name || ticket.ticket_sales?.[0]?.buyer_name;
        const buyerId =
          stripeOrder?.buyer_id || ticket.ticket_sales?.[0]?.buyer_id;
        const soldAt =
          stripeOrder?.created_at || ticket.ticket_sales?.[0]?.created_at;
        const salePrice =
          stripeOrder?.amount ||
          ticket.ticket_sales?.[0]?.sale_price ||
          ticket.price;

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
          ticket_type: ticket.ticket_type as
            | "general_admission"
            | "student"
            | undefined,
          event: ticket.event,
          type: "listing" as const,
          // Legacy sale info
          sale:
            ticket.ticket_sales && ticket.ticket_sales.length > 0
              ? {
                  buyer_name: ticket.ticket_sales[0].buyer_name,
                  sale_date: ticket.ticket_sales[0].created_at,
                  sale_price: ticket.ticket_sales[0].sale_price,
                }
              : undefined,
          // Escrow/Stripe order fields
          escrow_status: stripeOrder?.escrow_status,
          escrow_order_id: stripeOrder?.id,
          transfer_deadline: stripeOrder?.transfer_deadline,
          // Buyer info
          buyer_name: buyerName,
          buyer_id: buyerId,
          // Pending transfer flag for sellers (needs action)
          pending_transfer: hasPendingTransfer,
          // Awaiting confirmation flag (seller transferred, waiting for buyer)
          awaiting_confirmation: awaitingConfirmation,
          sold_at: soldAt,
          // Dispute fields
          dispute_id: dispute?.id,
          dispute_status: dispute?.status,
        };
      });

      return listings;
    } catch (error) {
      console.error("Error in loadUserListings:", error);
      return [];
    }
  };

  // Helper function to check if a ticket's event has expired
  const isEventExpired = (eventDate: string): boolean => {
    const now = new Date();
    const event = new Date(eventDate);
    // End of event day (11:59:59 PM)
    const endOfEventDay = new Date(event);
    endOfEventDay.setHours(23, 59, 59, 999);
    return now > endOfEventDay;
  };

  // Helper function to separate and sort tickets - only future events
  const getActiveListings = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => {
        if (ticket.status !== "available") return false;
        // Exclude tickets where event has already passed
        return !isEventExpired(ticket.event_date);
      })
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ); // oldest first
  };

  // Get expired listings - events that have passed but ticket was never sold
  const getExpiredListings = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => {
        if (ticket.status !== "available") return false;
        // Include only tickets where event has passed
        return isEventExpired(ticket.event_date);
      })
      .sort(
        (a, b) =>
          new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
      ); // most recent expired first
  };

  const getSoldTickets = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => ticket.status === "sold")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ); // newest first
  };

  const getCancelledTickets = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => ticket.status === "cancelled")
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ); // newest first
  };

  // Get tickets with pending transfers - these require seller action (payment_held)
  const getPendingTransfers = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => ticket.pending_transfer === true)
      .sort((a, b) => {
        // Sort by transfer deadline (most urgent first)
        if (a.transfer_deadline && b.transfer_deadline) {
          return (
            new Date(a.transfer_deadline).getTime() -
            new Date(b.transfer_deadline).getTime()
          );
        }
        return 0;
      });
  };

  // Get tickets awaiting buyer confirmation - seller has transferred, waiting for buyer
  const getAwaitingConfirmation = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => ticket.awaiting_confirmation === true)
      .sort((a, b) => {
        // Sort by when it was sold (most recent first)
        if (a.sold_at && b.sold_at) {
          return new Date(b.sold_at).getTime() - new Date(a.sold_at).getTime();
        }
        return 0;
      });
  };

  // Get tickets with active disputes
  const getDisputedTickets = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => ticket.escrow_status === "disputed")
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  // Get purchases awaiting transfer from seller (buyer's view - escrow_status = transfer_pending)
  const getAwaitingTransfer = (allPurchases: OrderItem[]) => {
    return allPurchases
      .filter((purchase) => purchase.escrow_status === "transfer_pending")
      .sort((a, b) => {
        // Sort by most recent first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  // Get disputed purchases (buyer's view)
  const getDisputedPurchases = (allPurchases: OrderItem[]) => {
    return allPurchases
      .filter((purchase) => purchase.escrow_status === "disputed")
      .sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  // Get other purchases (not awaiting transfer and not disputed)
  const getOtherPurchases = (allPurchases: OrderItem[]) => {
    return allPurchases
      .filter((purchase) =>
        purchase.escrow_status !== "transfer_pending" &&
        purchase.escrow_status !== "disputed"
      )
      .sort((a, b) => {
        // Sort by most recent first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  // Calculate time remaining until deadline
  const getTimeRemaining = (
    deadline: string
  ): { text: string; urgent: boolean; expired: boolean } => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffMs = deadlineDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { text: "OVERDUE", urgent: true, expired: true };
    }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours < 1) {
      return {
        text: `${diffMinutes}m remaining`,
        urgent: true,
        expired: false,
      };
    } else if (diffHours < 4) {
      return {
        text: `${diffHours}h ${diffMinutes}m remaining`,
        urgent: true,
        expired: false,
      };
    } else if (diffHours < 24) {
      return { text: `${diffHours}h remaining`, urgent: false, expired: false };
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return {
        text: `${diffDays}d ${diffHours % 24}h remaining`,
        urgent: false,
        expired: false,
      };
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user]);

  // Enhanced animation functions for segmented control
  const selectFilter = (filter: OrderType, index: number) => {
    if (filter === activeTab) return;

    // Fade out content briefly for smooth transition
    Animated.sequence([
      Animated.timing(fadeAnimation, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Slide indicator to new position
    Animated.spring(slideAnimation, {
      toValue: index,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setActiveTab(filter);

    // Refresh data when switching to bought or selling tabs
    if (filter === "bought" || filter === "selling") {
      onRefresh();
    }

    // Check for pending ratings when switching to bought tab
    if (filter === "bought") {
      setTimeout(() => {
        checkForPendingRatings();
      }, 1000); // Give time for data to load
    }
  };

  const handleTabChange = useCallback(
    (tab: OrderType) => {
      const index = filterOptions.findIndex((option) => option.value === tab);
      selectFilter(tab, index);
    },
    [onRefresh]
  );

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status.toLowerCase()) {
      case "sold":
        return {
          color: "#10b981",
          icon: "checkmark-circle-outline",
          text: "Sold",
        };
      case "available":
        return {
          color: "#10b981",
          icon: "pricetag-outline",
          text: "Listed",
        };
      case "cancelled":
        return {
          color: "#ef4444",
          icon: "close-circle-outline",
          text: "Cancelled",
        };
      case "completed":
        return {
          color: "#10b981",
          icon: "checkmark-circle-outline",
          text: "Completed",
        };
      case "purchased":
        return {
          color: "#3b82f6",
          icon: "receipt",
          text: "Purchased",
        };
      case "awaiting_transfer":
        return {
          color: "#f59e0b",
          icon: "time-outline",
          text: "Awaiting Transfer",
        };
      case "pending":
        return {
          color: theme.secondary,
          icon: "time-outline",
          text: "Pending",
        };
      case "disputed":
        return {
          color: "#ef4444",
          icon: "alert-circle-outline",
          text: "Under Review",
        };
      default:
        return {
          color: "#6b7280",
          icon: "help-circle-outline",
          text: status,
        };
    }
  };

  function getTabStats(tab: OrderType) {
    if (tab === "watchlist") {
      return watchlistStats;
    }
    const orders = tab === "bought" ? purchases : listings;
    const total = orders.reduce((sum, order) => sum + order.price, 0);
    return { count: orders.length, total };
  }

  // Mark ticket as sold - show sale modal
  const handleMarkAsSold = (ticket: OrderItem) => {
    setSelectedTicketForSale(ticket);
    setSaleModalVisible(true);
  };

  // Rate seller - show seller rating modal
  const handleRateSeller = (ticket: OrderItem) => {
    setSelectedTicketForRating(ticket);
    setSellerRatingModalVisible(true);
  };

  // Handle seller rating submission
  const handleConfirmSellerRating = async (ratingData: SellerRatingData) => {
    if (!selectedTicketForRating || !user) return;

    setSavingRating(true);
    try {
      // Submit rating to database
      const ratingPayload = {
        rater_id: user.id,
        rated_user_id: selectedTicketForRating.seller_id!,
        ticket_sale_id: selectedTicketForRating.order_id!,
        transaction_type: "buying" as const,
        rating: ratingData.rating,
        review_text: ratingData.review || null,
      };

      const { error } = await supabase
        .from("user_ratings")
        .insert(ratingPayload);

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Rating submitted successfully!");
      setSellerRatingModalVisible(false);
      setSelectedTicketForRating(null);

      // Refresh the data to remove the rating button and check for more pending ratings
      await loadData();

      // After refreshing data, check if there are more ratings needed
      setTimeout(() => {
        checkForPendingRatings();
      }, 500);
    } catch (error) {
      console.error("Error submitting seller rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSavingRating(false);
    }
  };

  // Handle seller rating buyer submission (from rating_prompts)
  const handleConfirmSellerRatingBuyer = async (ratingData: SellerRatingData) => {
    if (!pendingSellerRatingPrompt || !user) return;

    setSavingSellerRating(true);
    try {
      // Submit rating to database
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: user.id,
        rated_user_id: pendingSellerRatingPrompt.ratee_id,
        ticket_sale_id: pendingSellerRatingPrompt.order_id,
        transaction_type: "selling" as const,
        rating: ratingData.rating,
        review_text: ratingData.review || null,
      });

      if (error) throw error;

      // Mark the rating prompt as completed
      await supabase
        .from("rating_prompts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", pendingSellerRatingPrompt.id);

      Alert.alert("Thank You!", "Your rating for the buyer has been submitted.");
      setSellerRatingBuyerModalVisible(false);
      setPendingSellerRatingPrompt(null);

      // Check for more pending prompts
      setTimeout(() => checkForSellerRatingPrompts(), 500);
    } catch (error) {
      console.error("Error submitting buyer rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSavingSellerRating(false);
    }
  };

  // Handle sale confirmation from modal
  const handleConfirmSale = async (saleData: TicketSaleData) => {
    if (!selectedTicketForSale || !user) return;

    setSavingSale(true);
    try {
      // Record the sale information
      const saleResult = await TicketSaleService.recordTicketSale(
        selectedTicketForSale.id,
        user.id,
        profile?.full_name || profile?.username || "Unknown Seller",
        selectedTicketForSale.price,
        saleData
      );

      if (!saleResult.success) {
        throw new Error(saleResult.error || "Failed to record sale");
      }

      // Update ticket status to sold
      const { error } = await TicketService.updateTicket(
        selectedTicketForSale.id,
        {
          status: "sold",
        }
      );

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Ticket marked as sold successfully!");
      loadData(); // Refresh the data
      setSaleModalVisible(false);
      setSelectedTicketForSale(null);
    } catch (error) {
      console.error("Error marking ticket as sold:", error);
      Alert.alert("Error", "Failed to mark ticket as sold. Please try again.");
    } finally {
      setSavingSale(false);
    }
  };

  // Open edit modal
  const handleEditTicket = (ticket: OrderItem) => {
    setSelectedTicket(ticket);
    setEditModalVisible(true);
  };

  // Save ticket edits
  const handleSaveEdit = async (editData: TicketEditData) => {
    if (!selectedTicket) return;

    // Validate price
    const newPrice = parseFloat(editData.price);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert("Error", "Please enter a valid price greater than 0");
      return;
    }

    // Validate description
    if (!editData.description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await TicketService.updateTicket(selectedTicket.id, {
        price: newPrice,
        description: editData.description.trim(),
      });

      if (error) {
        throw error;
      }

      Alert.alert("Success", "Ticket updated successfully");
      setEditModalVisible(false);
      loadData(); // Refresh the data
    } catch (error) {
      console.error("Error updating ticket:", error);
      Alert.alert("Error", "Failed to update ticket. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCancelListing = async (ticketId: string) => {
    Alert.alert(
      "Cancel Listing",
      "Are you sure you want to cancel this ticket listing?",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await TicketService.cancelTicket(ticketId);
              if (error) {
                throw error;
              }
              Alert.alert("Success", "Listing cancelled successfully");
              loadData();
            } catch (error) {
              console.error("Error cancelling ticket:", error);
              Alert.alert(
                "Error",
                "Failed to cancel listing. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  // Confirm ticket transfer received (for Stripe escrow purchases)
  const handleConfirmTransfer = async (item: OrderItem) => {
    if (!item.escrow_order_id) {
      Alert.alert("Error", "Order information not found");
      return;
    }

    Alert.alert(
      "Confirm Receipt",
      "Have you received the ticket transfer? This will release the payment to the seller.",
      [
        { text: "Not Yet", style: "cancel" },
        {
          text: "Yes, I Received It",
          style: "default",
          onPress: async () => {
            setConfirmingTransfer(true);
            try {
              const result = await confirmReceipt(item.escrow_order_id!);

              if (result.success) {
                Alert.alert(
                  "Transfer Confirmed!",
                  "Thank you for confirming. The seller will receive their payment.",
                  [{ text: "OK", onPress: () => loadData() }]
                );
              } else {
                Alert.alert(
                  "Error",
                  result.error || "Failed to confirm receipt"
                );
              }
            } catch (error) {
              console.error("Error confirming transfer:", error);
              Alert.alert(
                "Error",
                "Failed to confirm receipt. Please try again."
              );
            } finally {
              setConfirmingTransfer(false);
            }
          },
        },
      ]
    );
  };

  // Mark ticket as transferred (for sellers) - opens proof modal
  const handleMarkTransferSent = (item: OrderItem) => {
    console.log("🔵 handleMarkTransferSent called from tickets.tsx");
    if (!item.escrow_order_id) {
      Alert.alert("Error", "Order information not found");
      return;
    }
    console.log("🔵 Opening transfer proof modal for order:", item.escrow_order_id);
    setSelectedItemForTransfer(item);
    setTransferProofModalVisible(true);
  };

  // Called when user confirms transfer from the proof modal
  const handleConfirmTransferWithProof = async (proofImageUri: string | null) => {
    console.log("🔵 handleConfirmTransferWithProof called, proofImageUri:", !!proofImageUri);
    if (!selectedItemForTransfer?.escrow_order_id) return;

    setMarkingTransferId(selectedItemForTransfer.escrow_order_id);
    try {
      let proofUrl: string | undefined;

      // If user provided an image, upload it first
      if (proofImageUri) {
        console.log("🔵 Uploading proof image...");
        const uploadResult = await TransferProofService.uploadProof(
          selectedItemForTransfer.escrow_order_id,
          proofImageUri
        );
        if (uploadResult.success && uploadResult.url) {
          proofUrl = uploadResult.url;
          console.log("🔵 Proof uploaded successfully");
        } else {
          console.warn("Proof upload failed:", uploadResult.error);
        }
      }

      // Mark transfer as sent
      const result = await markTransferSent(selectedItemForTransfer.escrow_order_id, proofUrl);

      if (result.success) {
        setTransferProofModalVisible(false);
        setSelectedItemForTransfer(null);
        Alert.alert(
          "Transfer Marked!",
          proofUrl
            ? "The buyer has been notified. Your proof has been saved."
            : "The buyer has been notified to check for the ticket.",
          [{ text: "OK", onPress: () => loadData() }]
        );
      } else {
        Alert.alert("Error", result.error || "Failed to mark transfer");
      }
    } catch (error) {
      console.error("Error marking transfer:", error);
      Alert.alert("Error", "Failed to mark transfer. Please try again.");
    } finally {
      setMarkingTransferId(null);
    }
  };

  const formatSaleDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const renderOrder = ({ item }: { item: OrderItem }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/ticket-details/${item.id}`)}
        activeOpacity={0.7}
      >
        {/* Header with badges */}
        <View style={styles.orderHeader}>
          <View style={styles.leftBadges}>
            <View
              style={[styles.sportBadge, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.sportBadgeText}>{item.sport || "Event"}</Text>
            </View>
            {/* Season badge for season pass events */}
            {item.event?.is_season_pass && (
              <View
                style={[
                  styles.seasonBadge,
                  { backgroundColor: theme.secondary },
                ]}
              >
                <Text style={styles.seasonBadgeText}>SEASON</Text>
              </View>
            )}
            {/* General badge for general admission tickets */}
            {item.ticket_type === "general_admission" && (
              <View
                style={[styles.generalBadge, { backgroundColor: "#10b981" }]}
              >
                <Text style={styles.generalBadgeText}>GENERAL</Text>
              </View>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusConfig.color },
            ]}
          >
            <Ionicons name={statusConfig.icon as any} size={12} color="white" />
            <Text style={styles.statusText}>{statusConfig.text}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.orderContent}>
          <Text style={styles.orderTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.dateText}>
            {new Date(item.event_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}{" "}
            •{" "}
            {new Date(item.event_date).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.locationDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="location" size={14} color="#6b7280" />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
              {item.section && (
                <View style={styles.detailItem}>
                  <Ionicons name="ticket" size={14} color="#6b7280" />
                  <Text style={styles.detailText}>
                    Sec {item.section}, Row {item.row_number}, Seat{" "}
                    {item.seat_number}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                styles.priceContainer,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Sale Information for sold tickets */}
        {item.status === "sold" && item.sale && (
          <View style={styles.saleInfoSection}>
            <View style={styles.saleInfoHeader}>
              <Ionicons name="person" size={16} color="#16a34a" />
              <Text style={styles.saleInfoTitle}>Sold to:</Text>
            </View>
            <View style={styles.saleInfoContent}>
              <Text style={styles.buyerName}>{item.sale.buyer_name}</Text>
              <Text style={styles.saleDate}>
                Sold {formatSaleDate(item.sale.sale_date)}
              </Text>
              {item.sale.sale_price !== item.price && (
                <Text style={styles.salePrice}>
                  Final price: ${item.sale.sale_price.toFixed(2)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Dispute Banner for Seller Listings */}
        {item.type === "listing" && item.escrow_status === "disputed" && item.dispute_id && (
          <View style={styles.disputeBanner}>
            <View style={styles.disputeBannerContent}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <View style={styles.disputeBannerText}>
                <Text style={styles.disputeBannerTitle}>Dispute Active</Text>
                <Text style={styles.disputeBannerSubtitle}>
                  This transaction is under review. View details and add evidence.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.viewDisputeButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push(`/dispute/status/${item.dispute_id}` as any);
              }}
            >
              <Text style={styles.viewDisputeButtonText}>View Dispute Status</Text>
              <Ionicons name="chevron-forward" size={16} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* View Order button for Stripe escrow orders - takes user to order details to confirm */}
        {item.type === "purchase" &&
          item.escrow_order_id &&
          item.escrow_status === "payment_held" && (
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.viewOrderButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/orders/${item.escrow_order_id}` as any);
                }}
              >
                <Ionicons name="eye" size={16} color="white" />
                <Text style={styles.actionButtonText}>
                  View Order & Confirm
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Purchase Information for purchased tickets (includes Stripe escrow orders) */}
        {item.type === "purchase" && (
          <View style={styles.purchaseInfoSection}>
            <View style={styles.purchaseInfoHeader}>
              <Ionicons name="receipt" size={16} color="#3b82f6" />
              <Text style={styles.purchaseInfoTitle}>Your Purchase</Text>
            </View>
            <View style={styles.purchaseInfoContent}>
              {item.seller_name && (
                <Text style={styles.sellerName}>
                  Purchased from: {item.seller_name}
                </Text>
              )}
              <Text style={styles.purchaseDate}>
                Purchased {formatSaleDate(item.created_at)}
              </Text>
              {item.payment_method && (
                <Text style={styles.paymentMethod}>
                  Payment: {item.payment_method}
                </Text>
              )}
              {/* Escrow status for Stripe orders */}
              {item.escrow_status && (
                <View style={styles.escrowStatusContainer}>
                  <Ionicons
                    name={
                      item.escrow_status === "disputed"
                        ? "alert-circle"
                        : item.escrow_status === "payment_held"
                        ? "time"
                        : item.escrow_status === "completed"
                        ? "checkmark-circle"
                        : "hourglass"
                    }
                    size={14}
                    color={
                      item.escrow_status === "disputed"
                        ? "#ef4444"
                        : item.escrow_status === "payment_held"
                        ? "#f59e0b"
                        : item.escrow_status === "completed"
                        ? "#10b981"
                        : "#6b7280"
                    }
                  />
                  <Text
                    style={[
                      styles.escrowStatusText,
                      {
                        color:
                          item.escrow_status === "disputed"
                            ? "#ef4444"
                            : item.escrow_status === "payment_held"
                            ? "#f59e0b"
                            : item.escrow_status === "completed"
                            ? "#10b981"
                            : "#6b7280",
                      },
                    ]}
                  >
                    {item.escrow_status === "disputed"
                      ? "Dispute Under Review"
                      : item.escrow_status === "payment_held"
                      ? "Awaiting ticket transfer"
                      : item.escrow_status === "completed"
                      ? "Transfer confirmed"
                      : item.escrow_status === "payout_pending"
                      ? "Processing payout"
                      : item.escrow_status}
                  </Text>
                </View>
              )}

              {/* Dispute Banner and Button */}
              {item.escrow_status === "disputed" && item.dispute_id && (
                <View style={styles.disputeBanner}>
                  <View style={styles.disputeBannerContent}>
                    <Ionicons name="alert-circle" size={20} color="#ef4444" />
                    <View style={styles.disputeBannerText}>
                      <Text style={styles.disputeBannerTitle}>Dispute Filed</Text>
                      <Text style={styles.disputeBannerSubtitle}>
                        This transaction is under review by our team
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.viewDisputeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      router.push(`/dispute/status/${item.dispute_id}` as any);
                    }}
                  >
                    <Text style={styles.viewDisputeButtonText}>View Status</Text>
                    <Ionicons name="chevron-forward" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              {item.transfer_deadline &&
                item.escrow_status === "payment_held" && (
                  <Text style={styles.transferDeadline}>
                    Transfer deadline: {formatSaleDate(item.transfer_deadline)}
                  </Text>
                )}

              {/* Instructions and Warning for awaiting transfer */}
              {item.escrow_status === "payment_held" && (
                <View style={styles.transferInstructions}>
                  <View style={styles.instructionBox}>
                    <Ionicons
                      name="information-circle"
                      size={16}
                      color="#3b82f6"
                    />
                    <Text style={styles.instructionText}>
                      The seller has been notified to transfer your ticket. Once
                      you receive it, tap to view order and confirm receipt.
                    </Text>
                  </View>
                  <View style={styles.warningBox}>
                    <Ionicons name="warning" size={16} color="#dc2626" />
                    <Text style={styles.warningText}>
                      Important: You must confirm once you receive your ticket.
                      Failure to confirm after the seller provides proof may
                      result in a fine.
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Rate Seller Button */}
            {item.needsSellerRating && (
              <TouchableOpacity
                style={styles.rateSellerButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRateSeller(item);
                }}
              >
                <Ionicons name="star" size={16} color="#fbbf24" />
                <Text style={styles.rateSellerButtonText}>Rate Seller</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions for listings */}
        {activeTab === "selling" && item.status === "available" && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleEditTicket(item);
              }}
            >
              <Ionicons name="pencil" size={16} color="white" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity
              style={[styles.actionButton, styles.soldButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkAsSold(item);
              }}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Mark Sold</Text>
            </TouchableOpacity> */}

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleCancelListing(item.id);
              }}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Transfer Portal for available tickets */}
        {activeTab === "selling" &&
          item.status === "available" &&
          (item.home_college_id || item.away_college_id) && (
            <View style={styles.transferSection}>
              <View style={styles.transferInfo}>
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={theme.primary}
                />
                <Text style={styles.transferText}>
                  Use official portal to transfer this ticket
                </Text>
              </View>
              <TicketTransferButton
                collegeId={item.home_college_id || item.away_college_id || ""}
                ticketInfo={{
                  title: item.title,
                  eventDate: new Date(item.event_date).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    }
                  ),
                  section: item.section,
                  row: item.row_number,
                  seat: item.seat_number,
                }}
                variant="outline"
                size="small"
                style={styles.transferButton}
              />
            </View>
          )}
      </TouchableOpacity>
    );
  };

  // Enhanced segmented control filter component
  const renderEnhancedFilter = () => {
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 40; // 20px on each side
    const controlPadding = 8; // 4px on each side inside control
    const availableWidth = screenWidth - containerPadding - controlPadding;
    const segmentWidth = availableWidth / filterOptions.length;

    return (
      <View style={styles.enhancedFilterContainer}>
        <BlurView intensity={25} style={styles.segmentedControlBlur}>
          <View style={styles.segmentedControl}>
            {/* Animated sliding background indicator */}
            <Animated.View
              style={[
                styles.segmentIndicator,
                {
                  width: segmentWidth,
                  backgroundColor: theme.primary,
                  transform: [
                    {
                      translateX: slideAnimation.interpolate({
                        inputRange: [0, 1, 2],
                        outputRange: [0, segmentWidth, segmentWidth * 2],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                },
              ]}
            />

            {/* Filter segments */}
            {filterOptions.map((option, index) => {
              const isActive = activeTab === option.value;
              const stats = getTabStats(option.value);

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segmentButton, { width: segmentWidth }]}
                  onPress={() => selectFilter(option.value, index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} orders, ${stats.count} total`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Animated.View
                    style={[styles.segmentContent, { opacity: fadeAnimation }]}
                  >
                    {/* Icon with subtle animation */}
                    <Animated.View
                      style={[
                        styles.segmentIconContainer,
                        {
                          backgroundColor: isActive
                            ? "rgba(255, 255, 255, 0.35)"
                            : "rgba(30, 41, 59, 0.08)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={isActive ? "white" : "#1e293b"}
                      />
                    </Animated.View>

                    {/* Label with dynamic styling */}
                    <Text
                      style={[
                        styles.segmentLabel,
                        {
                          color: isActive ? "white" : "#1e293b",
                          fontWeight: isActive ? "800" : "700",
                        },
                      ]}
                    >
                      {option.label}
                    </Text>

                    {/* Animated count badge */}
                    {stats.count > 0 && (
                      <Animated.View
                        style={[
                          styles.segmentBadge,
                          {
                            backgroundColor: isActive
                              ? "rgba(255, 255, 255, 0.3)"
                              : theme.secondary,
                            borderColor: isActive
                              ? "rgba(255, 255, 255, 0.5)"
                              : "rgba(30, 41, 59, 0.1)",
                            transform: [
                              {
                                scale: fadeAnimation.interpolate({
                                  inputRange: [0.7, 1],
                                  outputRange: [0.9, 1],
                                  extrapolate: "clamp",
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentBadgeText,
                            {
                              color: isActive ? "white" : "#1e293b",
                            },
                          ]}
                        >
                          {stats.count > 99 ? "99+" : stats.count}
                        </Text>
                      </Animated.View>
                    )}
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </View>
    );
  };

  const currentData = activeTab === "bought" ? purchases : listings;

  // For selling tab, separate disputed, pending transfers, awaiting confirmation, active, sold, and cancelled tickets
  const disputedTickets =
    activeTab === "selling" ? getDisputedTickets(listings) : [];
  const pendingTransfers =
    activeTab === "selling" ? getPendingTransfers(listings) : [];
  const awaitingConfirmation =
    activeTab === "selling" ? getAwaitingConfirmation(listings) : [];
  const activeListings =
    activeTab === "selling"
      ? getActiveListings(listings).filter(
          (t) => !t.pending_transfer && !t.awaiting_confirmation
        )
      : [];
  const soldTickets = activeTab === "selling" ? getSoldTickets(listings) : [];
  const cancelledTickets =
    activeTab === "selling" ? getCancelledTickets(listings) : [];
  const expiredListings =
    activeTab === "selling" ? getExpiredListings(listings) : [];

  // For buying tab, separate disputed, awaiting transfer, and other purchases
  const disputedPurchases =
    activeTab === "bought" ? getDisputedPurchases(purchases) : [];
  const awaitingTransfer =
    activeTab === "bought" ? getAwaitingTransfer(purchases) : [];
  const otherPurchases =
    activeTab === "bought" ? getOtherPurchases(purchases) : [];

  // Show loading or error state if user/profile not ready
  if (!user || !profile?.college_id) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.secondary} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Floating elements */}
      <View
        style={[
          styles.floatingElement1,
          { backgroundColor: `${theme.secondary}08` },
        ]}
      />
      <View
        style={[
          styles.floatingElement2,
          { backgroundColor: "rgba(255, 255, 255, 0.05)" },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        keyboardDismissMode={
          Platform.OS === "android" ? "on-drag" : "interactive"
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications")}
          >
            <NotificationBadge
              iconName="notifications-outline"
              iconSize={24}
              iconColor={theme.secondary}
            />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[theme.secondary, `${theme.secondary}DD`]}
              style={styles.logo}
            >
              <Ionicons
                name="receipt-outline"
                size={32}
                color={theme.primary}
              />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>My Tickets</Text>
          <Text style={styles.headerSubtitle}>
            Track your purchases and sales for{" "}
            {profile.college?.name || "your college"} events
          </Text>
        </View>

        {/* Animated Tab Navigation */}
        {renderEnhancedFilter()}

        {/* Content Section */}
        <View style={styles.contentSection}>
          {activeTab === "watchlist" ? (
            <WatchlistSection onRefresh={onRefresh} />
          ) : (
            <>
              {/* Results Header */}
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: theme.primary }]}>
                  {currentData.length} listing
                  {currentData.length !== 1 ? "s" : ""} found
                </Text>
                <Text style={styles.currentSort}>
                  {activeTab === "selling"
                    ? "Active listings sorted by oldest first"
                    : "Sorted by most recent"}
                </Text>
              </View>

              {loading ? (
                <BlurView intensity={20} style={styles.loadingState}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.loadingText}>Loading your orders...</Text>
                </BlurView>
              ) : activeTab === "selling" ? (
                // Special rendering for selling tab with sections
                <>
                  {/* CRITICAL: Disputed Tickets Section - Always at VERY TOP */}
                  {disputedTickets.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.disputedTicketsHeader}
                        onPress={() =>
                          setDisputedTicketsExpanded(!disputedTicketsExpanded)
                        }
                      >
                        <View style={styles.disputedTicketsHeaderContent}>
                          <View style={styles.disputeIconContainer}>
                            <Ionicons
                              name="alert-circle"
                              size={22}
                              color="#ef4444"
                            />
                          </View>
                          <View style={styles.disputedTicketsHeaderText}>
                            <Text style={styles.disputedTicketsTitle}>
                              Active Disputes
                            </Text>
                            <Text style={styles.disputedTicketsSubtitle}>
                              {disputedTickets.length} ticket
                              {disputedTickets.length !== 1 ? "s" : ""} under
                              review
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={
                            disputedTicketsExpanded
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>

                      {disputedTicketsExpanded && (
                        <>
                          {/* Info banner */}
                          <View style={styles.disputeInfoBanner}>
                            <Ionicons
                              name="information-circle"
                              size={18}
                              color="#991b1b"
                            />
                            <Text style={styles.disputeInfoText}>
                              These tickets have active disputes. View details and upload evidence to support your case.
                            </Text>
                          </View>

                          {/* Render disputed tickets */}
                          {disputedTickets.map((item) => (
                            <View
                              key={`disputed-${item.id}`}
                              style={styles.disputedTicketCard}
                            >
                              {/* Dispute banner at top of card */}
                              <View style={styles.disputeCardBanner}>
                                <Ionicons
                                  name="alert-circle"
                                  size={16}
                                  color="#ef4444"
                                />
                                <Text style={styles.disputeCardBannerText}>
                                  Under Review
                                </Text>
                              </View>

                              {/* Ticket info */}
                              <View style={styles.disputedTicketInfo}>
                                <Text
                                  style={styles.disputedTicketTitle}
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>
                                <Text style={styles.disputedTicketDate}>
                                  {new Date(item.event_date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </Text>
                                {item.buyer_name && (
                                  <Text style={styles.disputedTicketBuyer}>
                                    Buyer: {item.buyer_name}
                                  </Text>
                                )}
                              </View>

                              {/* View Dispute Button */}
                              <TouchableOpacity
                                style={styles.viewDisputeCardButton}
                                onPress={() =>
                                  router.push(
                                    `/dispute/status/${item.dispute_id}` as any
                                  )
                                }
                              >
                                <Text style={styles.viewDisputeCardButtonText}>
                                  View & Add Evidence
                                </Text>
                                <Ionicons
                                  name="chevron-forward"
                                  size={18}
                                  color="white"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {/* URGENT: Pending Transfers Section - Always at TOP */}
                  {pendingTransfers.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.pendingTransfersHeader}
                        onPress={() =>
                          setPendingTransfersExpanded(!pendingTransfersExpanded)
                        }
                      >
                        <View style={styles.pendingTransfersHeaderContent}>
                          <View style={styles.urgentIconContainer}>
                            <Ionicons
                              name="alert-circle"
                              size={22}
                              color="#dc2626"
                            />
                          </View>
                          <View style={styles.pendingTransfersHeaderText}>
                            <Text style={styles.pendingTransfersTitle}>
                              Action Required
                            </Text>
                            <Text style={styles.pendingTransfersSubtitle}>
                              {pendingTransfers.length} ticket
                              {pendingTransfers.length !== 1 ? "s" : ""}{" "}
                              awaiting transfer
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={
                            pendingTransfersExpanded
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#dc2626"
                        />
                      </TouchableOpacity>

                      {pendingTransfersExpanded && (
                        <>
                          {/* Warning banner */}
                          <View style={styles.transferWarningBanner}>
                            <Ionicons
                              name="warning"
                              size={18}
                              color="#92400e"
                            />
                            <Text style={styles.transferWarningText}>
                              You MUST transfer these tickets to buyers. Failure
                              to transfer will result in a refund and potential
                              account penalties.
                            </Text>
                          </View>

                          {/* Render pending transfer tickets with special styling */}
                          {pendingTransfers.map((item) => {
                            const timeRemaining = item.transfer_deadline
                              ? getTimeRemaining(item.transfer_deadline)
                              : null;

                            return (
                              <View
                                key={`pending-${item.id}`}
                                style={styles.pendingTransferCard}
                              >
                                {/* Urgency Banner */}
                                <View
                                  style={[
                                    styles.urgencyBanner,
                                    timeRemaining?.expired &&
                                      styles.urgencyBannerExpired,
                                    timeRemaining?.urgent &&
                                      !timeRemaining?.expired &&
                                      styles.urgencyBannerUrgent,
                                  ]}
                                >
                                  <Ionicons
                                    name={
                                      timeRemaining?.expired ? "alert" : "time"
                                    }
                                    size={14}
                                    color={
                                      timeRemaining?.expired
                                        ? "#7f1d1d"
                                        : timeRemaining?.urgent
                                        ? "#92400e"
                                        : "#1e40af"
                                    }
                                  />
                                  <Text
                                    style={[
                                      styles.urgencyText,
                                      timeRemaining?.expired &&
                                        styles.urgencyTextExpired,
                                      timeRemaining?.urgent &&
                                        !timeRemaining?.expired &&
                                        styles.urgencyTextUrgent,
                                    ]}
                                  >
                                    {timeRemaining?.text || "Transfer ASAP"}
                                  </Text>
                                </View>

                                {/* Ticket Info */}
                                <TouchableOpacity
                                  style={styles.pendingTicketContent}
                                  onPress={() =>
                                    router.push(`/ticket-details/${item.id}`)
                                  }
                                >
                                  <View style={styles.pendingTicketHeader}>
                                    <View
                                      style={[
                                        styles.sportBadge,
                                        { backgroundColor: theme.primary },
                                      ]}
                                    >
                                      <Text style={styles.sportBadgeText}>
                                        {item.sport || "Event"}
                                      </Text>
                                    </View>
                                    <View
                                      style={[
                                        styles.priceContainer,
                                        { backgroundColor: "#10b981" },
                                      ]}
                                    >
                                      <Text style={styles.priceText}>
                                        ${item.price.toFixed(2)}
                                      </Text>
                                    </View>
                                  </View>

                                  <Text
                                    style={styles.pendingTicketTitle}
                                    numberOfLines={2}
                                  >
                                    {item.title}
                                  </Text>

                                  {/* Event Details Row */}
                                  <View style={styles.pendingEventInfo}>
                                    <Text style={styles.pendingEventDate}>
                                      {new Date(
                                        item.event_date
                                      ).toLocaleDateString("en-US", {
                                        weekday: "short",
                                        month: "short",
                                        day: "numeric",
                                      })}{" "}
                                      at{" "}
                                      {new Date(
                                        item.event_date
                                      ).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                        hour12: true,
                                      })}
                                    </Text>
                                    {item.section && (
                                      <Text style={styles.pendingSeatInfo}>
                                        Sec {item.section}, Row{" "}
                                        {item.row_number}, Seat{" "}
                                        {item.seat_number}
                                      </Text>
                                    )}
                                  </View>

                                  {/* Buyer Info */}
                                  {item.buyer_name && (
                                    <View style={styles.pendingBuyerInfo}>
                                      <View style={styles.pendingBuyerIcon}>
                                        <Ionicons
                                          name="person"
                                          size={16}
                                          color="#3b82f6"
                                        />
                                      </View>
                                      <View style={styles.pendingBuyerDetails}>
                                        <Text style={styles.pendingBuyerLabel}>
                                          Sold to
                                        </Text>
                                        <Text style={styles.pendingBuyerName}>
                                          {item.buyer_name}
                                        </Text>
                                        {item.sold_at && (
                                          <Text style={styles.pendingSoldDate}>
                                            {formatSaleDate(item.sold_at)}
                                          </Text>
                                        )}
                                      </View>
                                    </View>
                                  )}
                                </TouchableOpacity>

                                {/* Transfer Action */}
                                <View style={styles.pendingTransferActions}>
                                  {/* Step 1: Open Transfer Portal */}
                                  {(item.home_college_id ||
                                    item.away_college_id) && (
                                    <TicketTransferButton
                                      collegeId={
                                        item.home_college_id ||
                                        item.away_college_id ||
                                        ""
                                      }
                                      ticketInfo={{
                                        title: item.title,
                                        eventDate: new Date(
                                          item.event_date
                                        ).toLocaleDateString("en-US", {
                                          month: "short",
                                          day: "numeric",
                                          year: "numeric",
                                        }),
                                        section: item.section,
                                        row: item.row_number,
                                        seat: item.seat_number,
                                      }}
                                      variant="outline"
                                      size="medium"
                                      style={styles.transferPortalButton}
                                    />
                                  )}

                                  {/* Step 2: Mark as Transferred */}
                                  <TouchableOpacity
                                    style={[
                                      styles.markTransferredButton,
                                      { backgroundColor: theme.primary },
                                    ]}
                                    onPress={() => handleMarkTransferSent(item)}
                                    disabled={
                                      markingTransferId === item.escrow_order_id
                                    }
                                  >
                                    {markingTransferId ===
                                    item.escrow_order_id ? (
                                      <ActivityIndicator
                                        size="small"
                                        color="white"
                                      />
                                    ) : (
                                      <>
                                        <Ionicons
                                          name="checkmark-done"
                                          size={20}
                                          color="white"
                                        />
                                        <Text
                                          style={
                                            styles.markTransferredButtonText
                                          }
                                        >
                                          I've Transferred the Ticket
                                        </Text>
                                      </>
                                    )}
                                  </TouchableOpacity>

                                  {/* View Order Details Link */}
                                  <TouchableOpacity
                                    style={styles.viewOrderDetailsButton}
                                    onPress={() =>
                                      router.push(
                                        `/orders/${item.escrow_order_id}` as any
                                      )
                                    }
                                  >
                                    <Text style={styles.viewOrderDetailsText}>
                                      View Order Details
                                    </Text>
                                    <Ionicons
                                      name="chevron-forward"
                                      size={16}
                                      color="#3b82f6"
                                    />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            );
                          })}
                        </>
                      )}
                    </>
                  )}

                  {/* Awaiting Confirmation Section */}
                  {awaitingConfirmation.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.awaitingConfirmationHeader}
                        onPress={() =>
                          setAwaitingConfirmationExpanded(
                            !awaitingConfirmationExpanded
                          )
                        }
                      >
                        <View style={styles.awaitingConfirmationHeaderContent}>
                          <View style={styles.awaitingIconContainer}>
                            <Ionicons name="time" size={20} color="#8b5cf6" />
                          </View>
                          <View style={styles.awaitingConfirmationHeaderText}>
                            <Text style={styles.awaitingConfirmationTitle}>
                              Awaiting Confirmation
                            </Text>
                            <Text style={styles.awaitingConfirmationSubtitle}>
                              {awaitingConfirmation.length} ticket
                              {awaitingConfirmation.length !== 1 ? "s" : ""}{" "}
                              waiting for buyer
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={
                            awaitingConfirmationExpanded
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#8b5cf6"
                        />
                      </TouchableOpacity>

                      {awaitingConfirmationExpanded && (
                        <>
                          {awaitingConfirmation.map((item) => (
                            <View
                              key={`awaiting-${item.id}`}
                              style={styles.awaitingConfirmationCard}
                            >
                              {/* Ticket Info */}
                              <TouchableOpacity
                                style={styles.awaitingTicketContent}
                                onPress={() =>
                                  router.push(`/ticket-details/${item.id}`)
                                }
                              >
                                <View style={styles.awaitingTicketHeader}>
                                  <View
                                    style={[
                                      styles.sportBadge,
                                      { backgroundColor: "#8b5cf6" },
                                    ]}
                                  >
                                    <Text style={styles.sportBadgeText}>
                                      {item.sport || "Event"}
                                    </Text>
                                  </View>
                                  <View
                                    style={[
                                      styles.priceContainer,
                                      { backgroundColor: "#10b981" },
                                    ]}
                                  >
                                    <Text style={styles.priceText}>
                                      ${item.price.toFixed(2)}
                                    </Text>
                                  </View>
                                </View>

                                <Text
                                  style={styles.awaitingTicketTitle}
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>

                                {/* Event Details */}
                                <View style={styles.awaitingEventInfo}>
                                  <Text style={styles.awaitingEventDate}>
                                    {new Date(
                                      item.event_date
                                    ).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}{" "}
                                    at{" "}
                                    {new Date(
                                      item.event_date
                                    ).toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                      hour12: true,
                                    })}
                                  </Text>
                                  {item.section && (
                                    <Text style={styles.awaitingSeatInfo}>
                                      Sec {item.section}, Row {item.row_number},
                                      Seat {item.seat_number}
                                    </Text>
                                  )}
                                </View>

                                {/* Buyer Info */}
                                {item.buyer_name && (
                                  <View style={styles.awaitingBuyerInfo}>
                                    <Ionicons
                                      name="person"
                                      size={14}
                                      color="#8b5cf6"
                                    />
                                    <Text style={styles.awaitingBuyerText}>
                                      Sold to{" "}
                                      <Text style={styles.awaitingBuyerName}>
                                        {item.buyer_name}
                                      </Text>
                                    </Text>
                                  </View>
                                )}

                                {/* Status Badge */}
                                <View style={styles.awaitingStatusBadge}>
                                  <Ionicons
                                    name="checkmark-done"
                                    size={14}
                                    color="#8b5cf6"
                                  />
                                  <Text style={styles.awaitingStatusText}>
                                    Transfer sent - Waiting for buyer to confirm
                                  </Text>
                                </View>
                              </TouchableOpacity>

                              {/* View Order Details */}
                              <View style={styles.awaitingActions}>
                                <TouchableOpacity
                                  style={styles.viewOrderDetailsButton}
                                  onPress={() =>
                                    router.push(
                                      `/orders/${item.escrow_order_id}` as any
                                    )
                                  }
                                >
                                  <Text style={styles.viewOrderDetailsText}>
                                    View Order Details
                                  </Text>
                                  <Ionicons
                                    name="chevron-forward"
                                    size={16}
                                    color="#3b82f6"
                                  />
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {/* Active Listings Section - Now Collapsible */}
                  {activeListings.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.activeListingsHeader}
                        onPress={() =>
                          setActiveListingsExpanded(!activeListingsExpanded)
                        }
                      >
                        <View style={styles.activeListingsHeaderContent}>
                          <Ionicons
                            name="storefront"
                            size={20}
                            color={theme.primary}
                          />
                          <Text style={styles.activeListingsTitle}>
                            Active Listings
                          </Text>
                          <Text style={styles.activeListingsCount}>
                            ({activeListings.length})
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            activeListingsExpanded
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>

                      {activeListingsExpanded && (
                        <FlatList
                          data={activeListings}
                          renderItem={renderOrder}
                          keyExtractor={(item) => `active-${item.id}`}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                          removeClippedSubviews={Platform.OS === "android"}
                          keyboardShouldPersistTaps="handled"
                        />
                      )}
                    </>
                  )}

                  {/* Sold Tickets Section */}
                  {soldTickets.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.soldTicketsHeader}
                        onPress={() =>
                          setSoldTicketsExpanded(!soldTicketsExpanded)
                        }
                      >
                        <View style={styles.soldTicketsHeaderContent}>
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color="#16a34a"
                          />
                          <Text style={styles.soldTicketsTitle}>
                            Sold Tickets
                          </Text>
                          <Text style={styles.soldTicketsCount}>
                            ({soldTickets.length})
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            soldTicketsExpanded ? "chevron-up" : "chevron-down"
                          }
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>

                      {soldTicketsExpanded && (
                        <FlatList
                          data={soldTickets}
                          renderItem={renderOrder}
                          keyExtractor={(item) => `sold-${item.id}`}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                          removeClippedSubviews={Platform.OS === "android"}
                          keyboardShouldPersistTaps="handled"
                        />
                      )}
                    </>
                  )}

                  {/* Cancelled Tickets Section */}
                  {cancelledTickets.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.cancelledTicketsHeader}
                        onPress={() =>
                          setCancelledTicketsExpanded(!cancelledTicketsExpanded)
                        }
                      >
                        <View style={styles.cancelledTicketsHeaderContent}>
                          <Ionicons
                            name="close-circle"
                            size={20}
                            color="#dc2626"
                          />
                          <Text style={styles.cancelledTicketsTitle}>
                            Cancelled Tickets
                          </Text>
                          <Text style={styles.cancelledTicketsCount}>
                            ({cancelledTickets.length})
                          </Text>
                        </View>
                        <Ionicons
                          name={
                            cancelledTicketsExpanded
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#6b7280"
                        />
                      </TouchableOpacity>

                      {cancelledTicketsExpanded && (
                        <FlatList
                          data={cancelledTickets}
                          renderItem={renderOrder}
                          keyExtractor={(item) => `cancelled-${item.id}`}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                          removeClippedSubviews={Platform.OS === "android"}
                          keyboardShouldPersistTaps="handled"
                        />
                      )}
                    </>
                  )}

                  {/* Expired Listings Section - Events that have passed */}
                  {expiredListings.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.expiredListingsHeader}
                        onPress={() =>
                          setExpiredListingsExpanded(!expiredListingsExpanded)
                        }
                      >
                        <View style={styles.expiredListingsHeaderContent}>
                          <View style={styles.expiredIconContainer}>
                            <Ionicons
                              name="time-outline"
                              size={20}
                              color="#6b7280"
                            />
                          </View>
                          <View style={styles.expiredListingsHeaderText}>
                            <Text style={styles.expiredListingsTitle}>
                              Expired Listings
                            </Text>
                            <Text style={styles.expiredListingsSubtitle}>
                              {expiredListings.length} ticket{expiredListings.length !== 1 ? 's' : ''} - event has passed
                            </Text>
                          </View>
                          <Ionicons
                            name={
                              expiredListingsExpanded ? "chevron-up" : "chevron-down"
                            }
                            size={20}
                            color="#6b7280"
                          />
                        </View>
                      </TouchableOpacity>

                      {expiredListingsExpanded && (
                        <FlatList
                          data={expiredListings}
                          renderItem={renderOrder}
                          keyExtractor={(item) => `expired-${item.id}`}
                          scrollEnabled={false}
                          showsVerticalScrollIndicator={false}
                          nestedScrollEnabled={true}
                          removeClippedSubviews={Platform.OS === "android"}
                          keyboardShouldPersistTaps="handled"
                        />
                      )}
                    </>
                  )}

                  {/* Empty state for no listings */}
                  {activeListings.length === 0 &&
                    soldTickets.length === 0 &&
                    cancelledTickets.length === 0 &&
                    expiredListings.length === 0 && (
                      <BlurView intensity={20} style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                          <Ionicons
                            name="storefront-outline"
                            size={48}
                            color="#6b7280"
                          />
                        </View>
                        <Text style={styles.emptyStateTitle}>
                          No listings yet
                        </Text>
                        <Text style={styles.emptyStateText}>
                          Create your first ticket listing to start selling
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.clearFiltersButton,
                            { backgroundColor: theme.primary },
                          ]}
                          onPress={() => router.push("/(tabs)/sell")}
                        >
                          <Text style={styles.clearFiltersText}>
                            List a Ticket
                          </Text>
                        </TouchableOpacity>
                      </BlurView>
                    )}
                </>
              ) : currentData.length > 0 ? (
                // Buying tab with sections
                <>
                  {/* CRITICAL: Disputed Purchases Section - Always at VERY TOP */}
                  {disputedPurchases.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.disputedTicketsHeader}
                        onPress={() =>
                          setDisputedPurchasesExpanded(!disputedPurchasesExpanded)
                        }
                      >
                        <View style={styles.disputedTicketsHeaderContent}>
                          <View style={styles.disputeIconContainer}>
                            <Ionicons
                              name="alert-circle"
                              size={22}
                              color="#ef4444"
                            />
                          </View>
                          <View style={styles.disputedTicketsHeaderText}>
                            <Text style={styles.disputedTicketsTitle}>
                              Active Disputes
                            </Text>
                            <Text style={styles.disputedTicketsSubtitle}>
                              {disputedPurchases.length} purchase
                              {disputedPurchases.length !== 1 ? "s" : ""} under
                              review
                            </Text>
                          </View>
                        </View>
                        <Ionicons
                          name={
                            disputedPurchasesExpanded
                              ? "chevron-up"
                              : "chevron-down"
                          }
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>

                      {disputedPurchasesExpanded && (
                        <>
                          {/* Info banner */}
                          <View style={styles.disputeInfoBanner}>
                            <Ionicons
                              name="information-circle"
                              size={18}
                              color="#991b1b"
                            />
                            <Text style={styles.disputeInfoText}>
                              These purchases have active disputes. View details and upload evidence to support your case.
                            </Text>
                          </View>

                          {/* Render disputed purchases */}
                          {disputedPurchases.map((item) => (
                            <View
                              key={`disputed-purchase-${item.id}`}
                              style={styles.disputedTicketCard}
                            >
                              {/* Dispute banner at top of card */}
                              <View style={styles.disputeCardBanner}>
                                <Ionicons
                                  name="alert-circle"
                                  size={16}
                                  color="#ef4444"
                                />
                                <Text style={styles.disputeCardBannerText}>
                                  Under Review
                                </Text>
                              </View>

                              {/* Ticket info */}
                              <View style={styles.disputedTicketInfo}>
                                <Text
                                  style={styles.disputedTicketTitle}
                                  numberOfLines={2}
                                >
                                  {item.title}
                                </Text>
                                <Text style={styles.disputedTicketDate}>
                                  {new Date(item.event_date).toLocaleDateString(
                                    "en-US",
                                    {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    }
                                  )}
                                </Text>
                                {item.seller_name && (
                                  <Text style={styles.disputedTicketBuyer}>
                                    Seller: {item.seller_name}
                                  </Text>
                                )}
                              </View>

                              {/* View Dispute Button */}
                              <TouchableOpacity
                                style={styles.viewDisputeCardButton}
                                onPress={() =>
                                  router.push(
                                    `/dispute/status/${item.dispute_id}` as any
                                  )
                                }
                              >
                                <Text style={styles.viewDisputeCardButtonText}>
                                  View & Add Evidence
                                </Text>
                                <Ionicons
                                  name="chevron-forward"
                                  size={18}
                                  color="white"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </>
                      )}
                    </>
                  )}

                  {/* Awaiting Transfer Section - Seller has sent the ticket */}
                  {awaitingTransfer.length > 0 && (
                    <>
                      <TouchableOpacity
                        style={styles.awaitingTransferHeader}
                        onPress={() =>
                          setAwaitingTransferExpanded(!awaitingTransferExpanded)
                        }
                      >
                        <View style={styles.awaitingTransferHeaderContent}>
                          <View style={styles.awaitingTransferIconContainer}>
                            <Ionicons
                              name="swap-horizontal"
                              size={20}
                              color="#0891b2"
                            />
                          </View>
                          <View style={styles.awaitingTransferHeaderText}>
                            <Text style={styles.awaitingTransferTitle}>
                              Awaiting Transfer
                            </Text>
                            <Text style={styles.awaitingTransferSubtitle}>
                              {awaitingTransfer.length} ticket{awaitingTransfer.length !== 1 ? 's' : ''} - seller has sent
                            </Text>
                          </View>
                          <Ionicons
                            name={
                              awaitingTransferExpanded ? "chevron-up" : "chevron-down"
                            }
                            size={20}
                            color="#0891b2"
                          />
                        </View>
                      </TouchableOpacity>

                      {awaitingTransferExpanded && (
                        <View>
                          {awaitingTransfer.map((item) => (
                            <View key={`awaiting-transfer-${item.id}`} style={styles.awaitingTransferCard}>
                              <View style={styles.awaitingTransferBanner}>
                                <Ionicons name="checkmark-circle" size={16} color="#0891b2" />
                                <Text style={styles.awaitingTransferBannerText}>
                                  Seller has transferred this ticket
                                </Text>
                              </View>
                              <View style={styles.awaitingTicketContent}>
                                <Text style={styles.awaitingTicketTitle} numberOfLines={2}>
                                  {item.title}
                                </Text>
                                <View style={styles.awaitingEventInfo}>
                                  <Text style={styles.awaitingEventDate}>
                                    {new Date(item.event_date).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </Text>
                                  {(item.section || item.row_number || item.seat_number) && (
                                    <Text style={styles.awaitingSeatInfo}>
                                      {[
                                        item.section && `Sec ${item.section}`,
                                        item.row_number && `Row ${item.row_number}`,
                                        item.seat_number && `Seat ${item.seat_number}`,
                                      ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                    </Text>
                                  )}
                                </View>

                                {/* Seller Info */}
                                <View style={styles.awaitingTransferSellerInfo}>
                                  <Ionicons name="person-outline" size={14} color="#0891b2" />
                                  <Text style={styles.awaitingTransferSellerText}>
                                    From: {item.seller_name || "Seller"}
                                  </Text>
                                </View>

                                {/* Action Instructions */}
                                <View style={styles.awaitingTransferInstructions}>
                                  <Ionicons name="information-circle" size={16} color="#0369a1" />
                                  <Text style={styles.awaitingTransferInstructionsText}>
                                    Check your email or ticketing app for the ticket. Once received, tap "Confirm Receipt" below.
                                  </Text>
                                </View>

                                {/* Confirm Receipt Button */}
                                <TouchableOpacity
                                  style={[
                                    styles.confirmReceiptButton,
                                    confirmingTransfer && { opacity: 0.6 }
                                  ]}
                                  onPress={() => handleConfirmTransfer(item)}
                                  disabled={confirmingTransfer}
                                >
                                  {confirmingTransfer ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                  ) : (
                                    <>
                                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                                      <Text style={styles.confirmReceiptButtonText}>
                                        Confirm Receipt
                                      </Text>
                                    </>
                                  )}
                                </TouchableOpacity>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  )}

                  {/* Other Purchases */}
                  {otherPurchases.length > 0 && (
                    <FlatList
                      data={otherPurchases}
                      renderItem={renderOrder}
                      keyExtractor={(item) => `${item.type}-${item.id}`}
                      scrollEnabled={false}
                      showsVerticalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      removeClippedSubviews={Platform.OS === "android"}
                      keyboardShouldPersistTaps="handled"
                    />
                  )}

                  {/* Empty state when only awaiting transfer exists */}
                  {awaitingTransfer.length > 0 && otherPurchases.length === 0 && (
                    <View style={styles.otherPurchasesEmpty}>
                      <Text style={styles.otherPurchasesEmptyText}>
                        Your confirmed purchases will appear here
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                // Empty state for buying tab
                <BlurView intensity={20} style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons
                      name="receipt-outline"
                      size={48}
                      color="#6b7280"
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>No purchases yet</Text>
                  <Text style={styles.emptyStateText}>
                    Browse tickets to make your first purchase
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.clearFiltersButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={() => router.push("/")}
                  >
                    <Text style={styles.clearFiltersText}>Browse Tickets</Text>
                  </TouchableOpacity>
                </BlurView>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <TicketEditModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedTicket(null);
        }}
        onSave={handleSaveEdit}
        ticket={selectedTicket ? {
          id: selectedTicket.id,
          title: selectedTicket.title,
          price: selectedTicket.price,
          description: selectedTicket.description,
        } : null}
        isLoading={savingEdit}
        primaryColor={profile?.college?.primary_color || "#18453b"}
        secondaryColor={profile?.college?.secondary_color || "#ffd700"}
      />

      {/* Sale Modal */}
      {selectedTicketForSale && (
        <TicketSaleModal
          visible={saleModalVisible}
          onClose={() => {
            setSaleModalVisible(false);
            setSelectedTicketForSale(null);
          }}
          onConfirmSale={handleConfirmSale}
          ticket={{
            id: selectedTicketForSale.id,
            title: selectedTicketForSale.title,
            price: selectedTicketForSale.price,
          }}
          isLoading={savingSale}
          primaryColor={profile?.college?.primary_color || "#18453b"}
          secondaryColor={profile?.college?.secondary_color || "#ffd700"}
        />
      )}

      {/* Seller Rating Modal */}
      {selectedTicketForRating && (
        <SellerRatingModal
          visible={sellerRatingModalVisible}
          onClose={() => {
            setSellerRatingModalVisible(false);
            setSelectedTicketForRating(null);

            // Check for more pending ratings after closing without rating
            setTimeout(() => {
              checkForPendingRatings();
            }, 300);
          }}
          onConfirmRating={handleConfirmSellerRating}
          ticket={{
            id: selectedTicketForRating.id,
            title: selectedTicketForRating.title,
            seller_name:
              selectedTicketForRating.seller_name || "Unknown Seller",
          }}
          isLoading={savingRating}
          primaryColor={profile?.college?.primary_color || "#18453b"}
          secondaryColor={profile?.college?.secondary_color || "#ffd700"}
        />
      )}

      {/* Seller Rating Buyer Modal - for seller to rate buyer after transaction */}
      {pendingSellerRatingPrompt && (
        <SellerRatingModal
          visible={sellerRatingBuyerModalVisible}
          onClose={() => {
            setSellerRatingBuyerModalVisible(false);
            // Mark as dismissed if closing without rating
            supabase
              .from("rating_prompts")
              .update({ status: "dismissed" })
              .eq("id", pendingSellerRatingPrompt.id);
            setPendingSellerRatingPrompt(null);
          }}
          onConfirmRating={handleConfirmSellerRatingBuyer}
          ticket={{
            id: pendingSellerRatingPrompt.order_id,
            title: pendingSellerRatingPrompt.ticket_title,
            seller_name: pendingSellerRatingPrompt.ratee_name,
          }}
          isLoading={savingSellerRating}
          primaryColor={profile?.college?.primary_color || "#18453b"}
          secondaryColor={profile?.college?.secondary_color || "#ffd700"}
          isSellerRatingBuyer={true}
        />
      )}

      {/* Transfer Proof Modal - for seller to upload proof when marking transfer */}
      {selectedItemForTransfer && (
        <TransferProofModal
          visible={transferProofModalVisible}
          onClose={() => {
            setTransferProofModalVisible(false);
            setSelectedItemForTransfer(null);
          }}
          onConfirm={handleConfirmTransferWithProof}
          ticketTitle={selectedItemForTransfer.title}
          buyerName={selectedItemForTransfer.buyer_name || "Buyer"}
          primaryColor={profile?.college?.primary_color || "#18453b"}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingElement1: {
    position: "absolute",
    top: "15%",
    left: "10%",
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  floatingElement2: {
    position: "absolute",
    bottom: "30%",
    right: "15%",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
    position: "relative",
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  notificationButton: {
    position: "absolute",
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    zIndex: 1000,
    elevation: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 16,
  },
  // Enhanced Segmented Control Filter Styles
  enhancedFilterContainer: {
    marginHorizontal: 20,
    marginTop: -15,
    marginBottom: 20,
    zIndex: 100,
  },
  segmentedControlBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  segmentedControl: {
    flexDirection: "row",
    position: "relative",
    padding: 4,
    height: 56,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
  },
  segmentIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    zIndex: 2,
  },
  segmentContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
    paddingHorizontal: 2,
  },
  segmentIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
    textAlign: "center",
    flexShrink: 1,
  },
  segmentBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  segmentBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
  contentSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
    marginTop: 20,
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: 20,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  currentSort: {
    fontSize: 12,
    color: "#6b7280",
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
    marginBottom: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 8,
  },
  leftBadges: {
    flexDirection: "row",
    gap: 8,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seasonBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  generalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  generalBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  orderContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    lineHeight: 24,
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  locationDetails: {
    flex: 1,
    marginRight: 12,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  priceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  orderActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    padding: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: "#3b82f6",
  },
  soldButton: {
    backgroundColor: "#10b981",
  },
  cancelButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: "#f8fafc",
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearFiltersText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Transfer Portal Styles
  transferSection: {
    borderTopWidth: 1,
    borderTopColor: "#e5f3ff",
    backgroundColor: "#f0f9ff",
    padding: 12,
    gap: 8,
  },
  transferInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  transferText: {
    fontSize: 12,
    color: "#0369a1",
    fontWeight: "500",
    flex: 1,
  },
  transferButton: {
    alignSelf: "stretch",
  },
  // Section header styles
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  // Sold tickets dropdown styles
  soldTicketsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f0f9ff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0f2fe",
    marginTop: 8,
  },
  soldTicketsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  soldTicketsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#16a34a",
    marginLeft: 8,
    flex: 1,
  },
  soldTicketsCount: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "500",
    marginRight: 8,
  },
  // Cancelled tickets dropdown styles
  cancelledTicketsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fef2f2",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#fecaca",
    marginTop: 8,
  },
  cancelledTicketsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cancelledTicketsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginLeft: 8,
    flex: 1,
  },
  cancelledTicketsCount: {
    fontSize: 14,
    color: "#b91c1c",
    fontWeight: "500",
    marginRight: 8,
  },
  // Sale information styles
  saleInfoSection: {
    borderTopWidth: 1,
    borderTopColor: "#dcfce7",
    backgroundColor: "#f0fdf4",
    padding: 12,
  },
  saleInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  saleInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  saleInfoContent: {
    gap: 4,
  },
  buyerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803d",
  },
  saleDate: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
  },
  salePrice: {
    fontSize: 14,
    color: "#16a34a",
    fontWeight: "500",
    fontStyle: "italic",
  },
  // Purchase information styles
  purchaseInfoSection: {
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    backgroundColor: "#eff6ff",
    padding: 12,
  },
  purchaseInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  purchaseInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
  },
  purchaseInfoContent: {
    gap: 4,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
  },
  purchaseDate: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
  },
  paymentMethod: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "500",
    fontStyle: "italic",
  },
  // Rate Seller Button Styles
  rateSellerButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
    gap: 4,
  },
  rateSellerButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },
  // Escrow status styles
  escrowStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  escrowStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Disputed tickets section styles (seller view)
  disputedTicketsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fef2f2",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  disputedTicketsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  disputeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  disputedTicketsHeaderText: {
    flex: 1,
  },
  disputedTicketsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991b1b",
  },
  disputedTicketsSubtitle: {
    fontSize: 13,
    color: "#b91c1c",
    marginTop: 2,
  },
  disputeInfoBanner: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    gap: 10,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  disputeInfoText: {
    flex: 1,
    fontSize: 13,
    color: "#991b1b",
    lineHeight: 18,
  },
  disputedTicketCard: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#fecaca",
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disputeCardBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#fecaca",
  },
  disputeCardBannerText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },
  disputedTicketInfo: {
    padding: 14,
  },
  disputedTicketTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  disputedTicketDate: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
  disputedTicketBuyer: {
    fontSize: 13,
    color: "#6b7280",
  },
  viewDisputeCardButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
  },
  viewDisputeCardButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  // Dispute banner styles
  disputeBanner: {
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  disputeBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  disputeBannerText: {
    flex: 1,
  },
  disputeBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991b1b",
    marginBottom: 2,
  },
  disputeBannerSubtitle: {
    fontSize: 12,
    color: "#b91c1c",
  },
  viewDisputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: "white",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  viewDisputeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ef4444",
  },
  transferDeadline: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 2,
  },
  // Transfer instructions and warning styles
  transferInstructions: {
    marginTop: 12,
    gap: 8,
  },
  instructionBox: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    color: "#1e40af",
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#991b1b",
    lineHeight: 18,
    fontWeight: "500",
  },
  viewOrderButton: {
    backgroundColor: "#3b82f6",
  },
  // Pending Transfers Section Styles
  pendingTransfersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fef2f2",
    borderWidth: 2,
    borderColor: "#fecaca",
    borderRadius: 12,
    marginBottom: 12,
  },
  pendingTransfersHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  urgentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pendingTransfersHeaderText: {
    flex: 1,
  },
  pendingTransfersTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#dc2626",
  },
  pendingTransfersSubtitle: {
    fontSize: 13,
    color: "#991b1b",
    marginTop: 2,
  },
  transferWarningBanner: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#fcd34d",
  },
  transferWarningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
    fontWeight: "500",
  },
  pendingTransferCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#fecaca",
    overflow: "hidden",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#dbeafe",
    gap: 6,
  },
  urgencyBannerUrgent: {
    backgroundColor: "#fef3c7",
  },
  urgencyBannerExpired: {
    backgroundColor: "#fee2e2",
  },
  urgencyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e40af",
  },
  urgencyTextUrgent: {
    color: "#92400e",
  },
  urgencyTextExpired: {
    color: "#7f1d1d",
  },
  pendingTicketContent: {
    padding: 12,
  },
  pendingTicketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pendingTicketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 22,
  },
  pendingEventInfo: {
    marginBottom: 12,
  },
  pendingEventDate: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
    marginBottom: 2,
  },
  pendingSeatInfo: {
    fontSize: 13,
    color: "#6b7280",
  },
  pendingBuyerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  pendingBuyerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pendingBuyerDetails: {
    flex: 1,
  },
  pendingBuyerLabel: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  pendingBuyerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e40af",
  },
  pendingSoldDate: {
    fontSize: 12,
    color: "#3b82f6",
    marginTop: 2,
  },
  pendingTransferActions: {
    padding: 12,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  transferPortalButton: {
    marginBottom: 0,
  },
  markTransferredButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  markTransferredButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  transferNowButton: {
    marginBottom: 4,
  },
  viewOrderDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  viewOrderDetailsText: {
    fontSize: 14,
    color: "#3b82f6",
    fontWeight: "600",
  },
  // Active Listings Collapsible Header Styles
  activeListingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 8,
    marginBottom: 8,
  },
  activeListingsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activeListingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  activeListingsCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    marginRight: 8,
  },
  // Awaiting Confirmation Section Styles (Purple theme)
  awaitingConfirmationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f5f3ff",
    borderWidth: 2,
    borderColor: "#c4b5fd",
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  awaitingConfirmationHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  awaitingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  awaitingConfirmationHeaderText: {
    flex: 1,
  },
  awaitingConfirmationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#7c3aed",
  },
  awaitingConfirmationSubtitle: {
    fontSize: 13,
    color: "#6d28d9",
    marginTop: 2,
  },
  awaitingConfirmationCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#c4b5fd",
    overflow: "hidden",
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  awaitingTicketContent: {
    padding: 12,
  },
  awaitingTicketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  awaitingTicketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 22,
  },
  awaitingEventInfo: {
    marginBottom: 12,
  },
  awaitingEventDate: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
    marginBottom: 2,
  },
  awaitingSeatInfo: {
    fontSize: 13,
    color: "#6b7280",
  },
  awaitingBuyerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  awaitingBuyerText: {
    fontSize: 14,
    color: "#6d28d9",
  },
  awaitingBuyerName: {
    fontWeight: "700",
    color: "#7c3aed",
  },
  awaitingStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ede9fe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },
  awaitingStatusText: {
    fontSize: 13,
    color: "#7c3aed",
    fontWeight: "600",
  },
  awaitingActions: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  // Expired Listings Section Styles (Gray theme)
  expiredListingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  expiredListingsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  expiredIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expiredListingsHeaderText: {
    flex: 1,
  },
  expiredListingsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
  },
  expiredListingsSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  // Awaiting Transfer Section Styles for Buyers (Teal/Cyan theme)
  awaitingTransferHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ecfeff",
    borderWidth: 2,
    borderColor: "#a5f3fc",
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  awaitingTransferHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  awaitingTransferIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#cffafe",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  awaitingTransferHeaderText: {
    flex: 1,
  },
  awaitingTransferTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0891b2",
  },
  awaitingTransferSubtitle: {
    fontSize: 13,
    color: "#0e7490",
    marginTop: 2,
  },
  awaitingTransferCard: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#a5f3fc",
    overflow: "hidden",
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  awaitingTransferBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#cffafe",
    gap: 8,
  },
  awaitingTransferBannerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0e7490",
  },
  awaitingTransferSellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfeff",
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 12,
  },
  awaitingTransferSellerText: {
    fontSize: 14,
    color: "#0e7490",
  },
  awaitingTransferInstructions: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    alignItems: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  awaitingTransferInstructionsText: {
    flex: 1,
    fontSize: 13,
    color: "#0369a1",
    lineHeight: 18,
  },
  confirmReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#0891b2",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  confirmReceiptButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "white",
  },
  otherPurchasesEmpty: {
    padding: 16,
    alignItems: "center",
  },
  otherPurchasesEmptyText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
});
