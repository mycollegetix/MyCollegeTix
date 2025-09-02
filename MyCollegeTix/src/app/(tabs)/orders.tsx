// src/app/(tabs)/orders.tsx - Styled to match Browse Tab with Mark as Sold and Edit functionality
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
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
import { TicketSaleService } from "@/src/services/ticketSaleService";

type OrderType = "selling" | "bought" | "watchlist";

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
}

interface EditFormData {
  price: string;
  description: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderType>("selling");
  const [purchases, setPurchases] = useState<OrderItem[]>([]);
  const [listings, setListings] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);

  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OrderItem | null>(null);
  const [editForm, setEditForm] = useState<EditFormData>({
    price: "",
    description: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Sale modal state
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedTicketForSale, setSelectedTicketForSale] =
    useState<OrderItem | null>(null);
  const [savingSale, setSavingSale] = useState(false);

  // Seller rating modal state
  const [sellerRatingModalVisible, setSellerRatingModalVisible] =
    useState(false);
  const [selectedTicketForRating, setSelectedTicketForRating] =
    useState<OrderItem | null>(null);
  const [savingRating, setSavingRating] = useState(false);

  // Sold tickets dropdown state
  const [soldTicketsExpanded, setSoldTicketsExpanded] = useState(false);
  const [cancelledTicketsExpanded, setCancelledTicketsExpanded] =
    useState(false);

  const boughtStats = getTabStats("bought");
  const sellingStats = getTabStats("selling");
  const watchlistStats = { count: watchlistCount, total: 0 };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
            ticket_type: sale.tickets.ticket_type || undefined,
            event: sale.tickets.event || undefined,
            seller_name: sale.seller_name || undefined,
            seller_id: sale.seller_id || undefined,
            payment_method: sale.payment_method || undefined,
            needsSellerRating: sale.needsSellerRating,
            ratingCount: sale.ratingCount,
          };
        }) || [];

      console.log(`✅ Loaded ${purchases.length} purchases from ticket_sales`);
      return purchases;
    } catch (error) {
      console.error("Error in loadUserPurchases:", error);
      return [];
    }
  };

  const loadUserListings = async (): Promise<OrderItem[]> => {
    try {
      // Direct Supabase query instead of using TicketService
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

      return (data || []).map((ticket: any) => ({
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
        status: ticket.status,
        created_at: ticket.created_at,
        home_college_id: ticket.home_college_id,
        away_college_id: ticket.away_college_id,
        ticket_type: ticket.ticket_type,
        event: ticket.event,
        type: "listing" as const,
        sale:
          ticket.ticket_sales && ticket.ticket_sales.length > 0
            ? {
                buyer_name: ticket.ticket_sales[0].buyer_name,
                sale_date: ticket.ticket_sales[0].created_at,
                sale_price: ticket.ticket_sales[0].sale_price,
              }
            : undefined,
      }));
    } catch (error) {
      console.error("Error in loadUserListings:", error);
      return [];
    }
  };

  // Helper function to separate and sort tickets
  const getActiveListings = (allListings: OrderItem[]) => {
    return allListings
      .filter((ticket) => ticket.status === "available")
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ); // oldest first
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user]);

  const handleTabChange = useCallback(
    (tab: OrderType) => {
      setActiveTab(tab);
      // Refresh data when switching to bought or selling tabs
      if (tab === "bought" || tab === "selling") {
        onRefresh();
      }
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
      case "pending":
        return {
          color: theme.secondary,
          icon: "time-outline",
          text: "Pending",
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
      loadData(); // Refresh the data to remove the rating button
      setSellerRatingModalVisible(false);
      setSelectedTicketForRating(null);
    } catch (error) {
      console.error("Error submitting seller rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSavingRating(false);
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
    setEditForm({
      price: ticket.price.toString(),
      description: ticket.description,
    });
    setEditModalVisible(true);
  };

  // Save ticket edits
  const handleSaveEdit = async () => {
    if (!selectedTicket) return;

    // Validate price
    const newPrice = parseFloat(editForm.price);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert("Error", "Please enter a valid price greater than 0");
      return;
    }

    // Validate description
    if (!editForm.description.trim()) {
      Alert.alert("Error", "Please enter a description");
      return;
    }

    setSavingEdit(true);
    try {
      const { error } = await TicketService.updateTicket(selectedTicket.id, {
        price: newPrice,
        description: editForm.description.trim(),
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

        {/* Purchase Information for purchased tickets */}
        {item.status === "purchased" && item.type === "purchase" && (
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

            <TouchableOpacity
              style={[styles.actionButton, styles.soldButton]}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkAsSold(item);
              }}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Mark Sold</Text>
            </TouchableOpacity>

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

  const currentData = activeTab === "bought" ? purchases : listings;

  // For selling tab, separate active, sold, and cancelled tickets
  const activeListings =
    activeTab === "selling" ? getActiveListings(listings) : [];
  const soldTickets = activeTab === "selling" ? getSoldTickets(listings) : [];
  const cancelledTickets =
    activeTab === "selling" ? getCancelledTickets(listings) : [];

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
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>
            Track your purchases and sales for{" "}
            {profile.college?.name || "your college"} events
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabSection}>
          {(["selling", "bought", "watchlist"] as OrderType[]).map((tab) => {
            const stats = getTabStats(tab);
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && { backgroundColor: theme.primary },
                ]}
                onPress={() => handleTabChange(tab)}
              >
                <Ionicons
                  name={
                    tab === "selling"
                      ? "storefront-outline"
                      : tab === "bought"
                      ? "receipt-outline"
                      : "bookmark-outline"
                  }
                  size={20}
                  color={activeTab === tab ? "white" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab === "selling"
                    ? "Selling"
                    : tab === "bought"
                    ? "Bought"
                    : "Watchlist"}{" "}
                  ({stats.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

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
                  {/* Active Listings Section */}
                  {activeListings.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Ionicons
                          name="storefront"
                          size={20}
                          color={theme.primary}
                        />
                        <Text style={styles.sectionTitle}>Active Listings</Text>
                        <Text style={styles.sectionCount}>
                          ({activeListings.length})
                        </Text>
                      </View>
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

                  {/* Empty state for no listings */}
                  {activeListings.length === 0 &&
                    soldTickets.length === 0 &&
                    cancelledTickets.length === 0 && (
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
                // Original rendering for buying tab
                <FlatList
                  data={currentData}
                  renderItem={renderOrder}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  removeClippedSubviews={Platform.OS === "android"}
                  keyboardShouldPersistTaps="handled"
                />
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
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[theme.primary, `${theme.primary}CC`]}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              onPress={() => setEditModalVisible(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Ticket</Text>
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={savingEdit}
              style={[
                styles.modalSaveButton,
                { backgroundColor: theme.secondary },
                savingEdit && { opacity: 0.6 },
              ]}
            >
              <Text
                style={[styles.modalSaveButtonText, { color: theme.primary }]}
              >
                {savingEdit ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {selectedTicket && (
              <>
                <Text style={styles.ticketTitle}>{selectedTicket.title}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Price ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.price}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, price: text }))
                    }
                    placeholder="Enter price"
                    placeholderTextColor="#6b7280"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formTextArea}
                    value={editForm.description}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, description: text }))
                    }
                    placeholder="Enter description"
                    placeholderTextColor="#6b7280"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

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
  tabSection: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: -15,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeTabText: {
    color: "white",
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
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24,
    textAlign: "center",
    color: "#1e293b",
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#1e293b",
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "white",
    borderColor: "#e5e7eb",
    color: "#1e293b",
  },
  formTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: "white",
    borderColor: "#e5e7eb",
    color: "#1e293b",
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
});
