// src/app/(tabs)/orders.tsx - Brand New Orders Tab with College Theme
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
import { supabase } from "@/src/lib/supabase";

type OrderType = "buying" | "selling" | "watchlist";

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
  type: "purchase" | "listing";
}

export default function OrdersScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OrderType>("buying");
  const [purchases, setPurchases] = useState<OrderItem[]>([]);
  const [listings, setListings] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const buyingStats = getTabStats("buying");
  const sellingStats = getTabStats("selling");

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

      // Load purchases and listings in parallel
      const [purchasesData, listingsData] = await Promise.all([
        loadUserPurchases(),
        loadUserListings(),
      ]);

      setPurchases(purchasesData);
      setListings(listingsData);

      console.log("✅ Orders data loaded successfully");
      console.log("Purchases:", purchasesData.length);
      console.log("Listings:", listingsData.length);
    } catch (error) {
      console.error("Error loading orders:", error);
      Alert.alert("Error", "Failed to load your orders. Please try again.");

      // Set empty arrays so the UI doesn't break
      setPurchases([]);
      setListings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUserPurchases = async (): Promise<OrderItem[]> => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          amount,
          status,
          created_at,
          completed_at,
          ticket:tickets (
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
            status
          )
        `
        )
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading purchases:", error);
        return [];
      }

      return (data || [])
        .filter((order: any) => order.ticket)
        .map((order: any) => ({
          id: order.ticket.id,
          title: order.ticket.title,
          description: order.ticket.description,
          price: order.amount || order.ticket.price,
          event_date: order.ticket.event_date,
          location: order.ticket.location,
          sport: order.ticket.sport,
          section: order.ticket.section,
          row_number: order.ticket.row_number,
          seat_number: order.ticket.seat_number,
          status: order.status,
          created_at: order.created_at,
          order_id: order.id,
          type: "purchase" as const,
        }));
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
        created_at
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
        type: "listing" as const,
      }));
    } catch (error) {
      console.error("Error in loadUserListings:", error);
      return [];
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [user]);

  const getStatusConfig = (status: string): StatusConfig => {
    switch (status.toLowerCase()) {
      case "sold":
        return {
          color: theme.primary,
          icon: "checkmark-circle-outline",
          text: "Sold",
        };
      case "available":
        return {
          color: "#3b82f6",
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
          color: theme.primary,
          icon: "checkmark-circle-outline",
          text: "Completed",
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
    const orders = tab === "buying" ? purchases : listings;
    const total = orders.reduce((sum, order) => sum + order.price, 0);
    return { count: orders.length, total };
  }

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

  const renderOrder = ({ item }: { item: OrderItem }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <BlurView intensity={20} style={styles.orderCard}>
        <TouchableOpacity
          onPress={() => router.push(`/ticket-details/${item.id}`)}
          style={styles.orderContent}
        >
          {/* Header */}
          <View style={styles.orderHeader}>
            <Text style={styles.orderTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusConfig.color },
              ]}
            >
              <Ionicons
                name={statusConfig.icon as any}
                size={12}
                color="white"
              />
              <Text style={styles.statusText}>{statusConfig.text}</Text>
            </View>
          </View>

          {/* Order Details */}
          <View style={styles.orderDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="location" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="calendar" size={14} color="#6b7280" />
              <Text style={styles.detailText}>
                {new Date(item.event_date).toLocaleDateString()}
              </Text>
            </View>
            {item.section && (
              <View style={styles.detailRow}>
                <Ionicons name="ticket" size={14} color="#6b7280" />
                <Text style={styles.detailText}>
                  Sec {item.section}, Row {item.row_number}, Seat{" "}
                  {item.seat_number}
                </Text>
              </View>
            )}
            {item.sport && (
              <View style={styles.detailRow}>
                <Ionicons name="trophy" size={14} color="#6b7280" />
                <Text style={styles.detailText}>{item.sport}</Text>
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={[styles.price, { color: theme.primary }]}>
              ${item.price.toFixed(2)}
            </Text>
            <Text style={styles.dateText}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Actions for listings */}
        {activeTab === "selling" && item.status === "available" && (
          <View style={styles.orderActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelListing(item.id)}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </BlurView>
    );
  };

  const currentData = activeTab === "buying" ? purchases : listings;

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
          { backgroundColor: `${theme.secondary}10` },
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
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
            Track your ticket purchases, sales, and watchlist
          </Text>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications" as any)}
          >
            <NotificationBadge
              iconName="notifications-outline"
              iconSize={24}
              iconColor={theme.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Ionicons name="bag-outline" size={24} color={theme.primary} />
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>
                  {buyingStats.count}
                </Text>
                <Text style={styles.statLabel}>Purchases</Text>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  ${buyingStats.total.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons
                name="storefront-outline"
                size={24}
                color={theme.primary}
              />
              <View style={styles.statContent}>
                <Text style={[styles.statNumber, { color: theme.primary }]}>
                  {sellingStats.count}
                </Text>
                <Text style={styles.statLabel}>Listings</Text>
                <Text style={[styles.statValue, { color: theme.primary }]}>
                  ${sellingStats.total.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Section */}
        <View style={styles.tabSection}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "buying" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("buying")}
            >
              <Ionicons
                name="bag-outline"
                size={20}
                color={activeTab === "buying" ? "white" : "#6b7280"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "buying" && styles.activeTabText,
                ]}
              >
                Buying ({buyingStats.count})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "selling" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("selling")}
            >
              <Ionicons
                name="storefront-outline"
                size={20}
                color={activeTab === "selling" ? "white" : "#6b7280"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "selling" && styles.activeTabText,
                ]}
              >
                Selling ({sellingStats.count})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === "watchlist" && { backgroundColor: theme.primary },
              ]}
              onPress={() => setActiveTab("watchlist")}
            >
              <Ionicons
                name="bookmark-outline"
                size={20}
                color={activeTab === "watchlist" ? "white" : "#6b7280"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "watchlist" && styles.activeTabText,
                ]}
              >
                Watchlist
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          {activeTab === "watchlist" ? (
            <WatchlistSection onRefresh={onRefresh} />
          ) : (
            <>
              {loading ? (
                <BlurView intensity={20} style={styles.loadingState}>
                  <Ionicons name="refresh" size={24} color="#6b7280" />
                  <Text style={styles.loadingText}>Loading your orders...</Text>
                </BlurView>
              ) : currentData.length > 0 ? (
                <FlatList
                  data={currentData}
                  renderItem={renderOrder}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <BlurView intensity={20} style={styles.emptyState}>
                  <View style={styles.emptyIconContainer}>
                    <Ionicons
                      name={
                        activeTab === "buying"
                          ? "bag-outline"
                          : "storefront-outline"
                      }
                      size={48}
                      color="#6b7280"
                    />
                  </View>
                  <Text style={styles.emptyStateTitle}>
                    No {activeTab === "buying" ? "purchases" : "listings"} yet
                  </Text>
                  <Text style={styles.emptyStateText}>
                    {activeTab === "buying"
                      ? "Browse available tickets and make your first purchase"
                      : "Create your first ticket listing to start selling"}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.emptyStateButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={() =>
                      router.push(
                        activeTab === "buying" ? "/(tabs)" : "/(tabs)/sell"
                      )
                    }
                  >
                    <Text style={styles.emptyStateButtonText}>
                      {activeTab === "buying"
                        ? "Browse Tickets"
                        : "Create Listing"}
                    </Text>
                  </TouchableOpacity>
                </BlurView>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f2f28",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  floatingElement1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: 100,
    right: -50,
  },
  floatingElement2: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    bottom: 200,
    left: -30,
  },
  scrollView: {
    flex: 1,
    paddingTop: 60,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 22,
  },
  notificationButton: {
    position: "absolute",
    top: 0,
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  statContent: {
    alignItems: "flex-start",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "600",
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 20,
  },
  tabSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
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
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: "hidden",
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
    color: "#9ca3af",
  },
  orderActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  loadingState: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    marginHorizontal: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    marginHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});
