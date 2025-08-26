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
import { WatchlistService } from "@/src/services/watchlistService";
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

  const buyingStats = getTabStats("buying");
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

  const handleTabChange = useCallback((tab: OrderType) => {
    setActiveTab(tab);
    // Refresh data when switching to buying or selling tabs
    if (tab === "buying" || tab === "selling") {
      onRefresh();
    }
  }, [onRefresh]);

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
    const orders = tab === "buying" ? purchases : listings;
    const total = orders.reduce((sum, order) => sum + order.price, 0);
    return { count: orders.length, total };
  }

  // Mark ticket as sold
  const handleMarkAsSold = async (ticketId: string, ticketTitle: string) => {
    Alert.alert(
      "Mark as Sold",
      `Mark "${ticketTitle}" as sold? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Sold",
          style: "default",
          onPress: async () => {
            try {
              const { error } = await TicketService.updateTicket(ticketId, {
                status: "sold",
              });

              if (error) {
                throw error;
              }

              Alert.alert("Success", "Ticket marked as sold successfully");
              loadData(); // Refresh the data
            } catch (error) {
              console.error("Error marking ticket as sold:", error);
              Alert.alert(
                "Error",
                "Failed to mark ticket as sold. Please try again."
              );
            }
          },
        },
      ]
    );
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
                handleMarkAsSold(item.id, item.title);
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
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === "buying" ? purchases : listings;

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
        keyboardDismissMode={Platform.OS === 'android' ? 'on-drag' : 'interactive'}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TouchableOpacity 
            style={styles.notificationButton}
            onPress={() => router.push('/notifications')}
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
          {(["selling", "watchlist"] as OrderType[]).map((tab) => {
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
                  {currentData.length}{" "}
                  listing{currentData.length !== 1 ? "s" : ""} found
                </Text>
                <Text style={styles.currentSort}>Sorted by most recent</Text>
              </View>

              {loading ? (
                <BlurView intensity={20} style={styles.loadingState}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={styles.loadingText}>Loading your orders...</Text>
                </BlurView>
              ) : currentData.length > 0 ? (
                <FlatList
                  data={currentData}
                  renderItem={renderOrder}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled={true}
                  removeClippedSubviews={Platform.OS === 'android'}
                  keyboardShouldPersistTaps="handled"
                />
              ) : (
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
});
