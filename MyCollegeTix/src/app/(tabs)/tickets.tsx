// src/app/(tabs)/tickets.tsx - Tickets screen with Selling / Bought / Watchlist tabs
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { TicketService } from "@/src/services/ticketService";
import { useTheme } from "@/src/providers/ThemeProvider";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import WatchlistSection from "@/src/components/WatchlistSection";
import { TicketSaleData } from "@/src/components/TicketSaleModal";
import { TicketEditData } from "@/src/components/TicketEditModal";
import { TicketSaleService } from "@/src/services/ticketSaleService";
import { useStripePayment } from "@/src/hooks/useStripePayment";
import { TransferProofService } from "@/src/services/transferProofService";
import { StripeConnectService } from "@/src/services/stripeConnectService";
import { SellingTab, BuyingTab, TicketModals } from "@/src/components/tickets";
import { OrderItem } from "@/src/components/tickets/types";
import { useTicketData } from "@/src/hooks/useTicketData";
import { useRatingPrompts } from "@/src/hooks/useRatingPrompts";

type OrderType = "selling" | "bought" | "watchlist";

interface FilterOption {
  value: OrderType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
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

  // ─── Data from hook ───────────────────────────────────────────────
  const {
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
  } = useTicketData(user?.id);

  // Animation refs for tab switching
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  // ─── Edit modal state ─────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<OrderItem | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Sale modal state
  const [saleModalVisible, setSaleModalVisible] = useState(false);
  const [selectedTicketForSale, setSelectedTicketForSale] =
    useState<OrderItem | null>(null);
  const [savingSale, setSavingSale] = useState(false);

  // ─── Rating prompts (hook manages all rating state + logic) ────────
  const ratings = useRatingPrompts(user?.id, purchases, activeTab, loadData);

  // Stripe payment hook
  const { confirmReceipt, markTransferSent } = useStripePayment();
  const [confirmingTransfer, setConfirmingTransfer] = useState(false);
  const [markingTransferId, setMarkingTransferId] = useState<string | null>(
    null
  );

  // Transfer proof modal state
  const [transferProofModalVisible, setTransferProofModalVisible] =
    useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] =
    useState<OrderItem | null>(null);

  // Stripe dashboard loading state
  const [isLoadingStripeDashboard, setIsLoadingStripeDashboard] =
    useState(false);

  // Filter options for segmented control
  const filterOptions: FilterOption[] = [
    { value: "selling", label: "Selling", icon: "storefront-outline" },
    { value: "bought", label: "Bought", icon: "receipt-outline" },
    { value: "watchlist", label: "Watchlist", icon: "bookmark-outline" },
  ];

  // Initialize animation position based on current filter
  useEffect(() => {
    const index = filterOptions.findIndex(
      (option) => option.value === activeTab
    );
    slideAnimation.setValue(index);
  }, []);

  // ─── Tab animation ────────────────────────────────────────────────
  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const selectFilter = (filter: OrderType, index: number) => {
    if (filter === activeTab) return;

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

    Animated.spring(slideAnimation, {
      toValue: index,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setActiveTab(filter);

    if (filter === "bought" || filter === "selling") {
      onRefresh();
    }
    if (filter === "bought") {
      setTimeout(() => ratings.checkForPendingRatings(), 1000);
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────
  const handleMarkAsSold = (ticket: OrderItem) => {
    setSelectedTicketForSale(ticket);
    setSaleModalVisible(true);
  };

  const handleConfirmSale = async (saleData: TicketSaleData) => {
    if (!selectedTicketForSale || !user) return;
    setSavingSale(true);
    try {
      const saleResult = await TicketSaleService.recordTicketSale(
        selectedTicketForSale.id,
        user.id,
        profile?.full_name || profile?.username || "Unknown Seller",
        selectedTicketForSale.price,
        saleData
      );
      if (!saleResult.success) throw new Error(saleResult.error || "Failed to record sale");

      const { error } = await TicketService.updateTicket(
        selectedTicketForSale.id,
        { status: "sold" }
      );
      if (error) throw error;

      Alert.alert("Success", "Ticket marked as sold successfully!");
      loadData();
      setSaleModalVisible(false);
      setSelectedTicketForSale(null);
    } catch (error) {
      console.error("Error marking ticket as sold:", error);
      Alert.alert("Error", "Failed to mark ticket as sold. Please try again.");
    } finally {
      setSavingSale(false);
    }
  };

  const handleEditTicket = (ticket: OrderItem) => {
    setSelectedTicket(ticket);
    setEditModalVisible(true);
  };

  const openInAppBrowser = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: "#635bff",
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  const handleOpenStripeDashboard = async () => {
    setIsLoadingStripeDashboard(true);
    try {
      const result = await StripeConnectService.getDashboardLink();
      if (!result.success || !result.data) {
        Alert.alert(
          "Error",
          result.error || "Unable to access payment settings. Please try again."
        );
        return;
      }

      const { hasAccount, onboardingComplete, url } = result.data;

      if (!hasAccount) {
        Alert.alert(
          "Payment Setup Required",
          "You need to set up your payment account to access the Stripe dashboard. Would you like to set it up now?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Set Up Payments",
              onPress: async () => {
                const onboardingResult =
                  await StripeConnectService.createConnectAccount();
                if (
                  onboardingResult.success &&
                  onboardingResult.data?.onboardingUrl
                ) {
                  await openInAppBrowser(onboardingResult.data.onboardingUrl);
                } else {
                  Alert.alert(
                    "Error",
                    onboardingResult.error || "Failed to start payment setup."
                  );
                }
              },
            },
          ]
        );
        return;
      }

      if (!onboardingComplete && url) {
        Alert.alert(
          "Complete Setup",
          "Please complete your payment setup to access the full dashboard.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Continue Setup", onPress: () => openInAppBrowser(url) },
          ]
        );
        return;
      }

      if (url) await openInAppBrowser(url);
    } catch (error) {
      console.error("Error opening Stripe dashboard:", error);
      Alert.alert(
        "Error",
        "Unable to open payment settings. Please try again."
      );
    } finally {
      setIsLoadingStripeDashboard(false);
    }
  };

  const handleSaveEdit = async (editData: TicketEditData) => {
    if (!selectedTicket) return;
    const newPrice = parseFloat(editData.price);
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert("Error", "Please enter a valid price greater than 0");
      return;
    }
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
      if (error) throw error;

      Alert.alert("Success", "Ticket updated successfully");
      setEditModalVisible(false);
      loadData();
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
              if (error) throw error;
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

  const handleMarkTransferSent = (item: OrderItem) => {
    if (!item.escrow_order_id) {
      Alert.alert("Error", "Order information not found");
      return;
    }
    setSelectedItemForTransfer(item);
    setTransferProofModalVisible(true);
  };

  const handleConfirmTransferWithProof = async (
    proofImageUri: string | null
  ) => {
    if (!selectedItemForTransfer?.escrow_order_id) return;
    setMarkingTransferId(selectedItemForTransfer.escrow_order_id);
    try {
      let proofUrl: string | undefined;
      if (proofImageUri) {
        const uploadResult = await TransferProofService.uploadProof(
          selectedItemForTransfer.escrow_order_id,
          proofImageUri
        );
        if (uploadResult.success && uploadResult.url) {
          proofUrl = uploadResult.url;
        }
      }

      const result = await markTransferSent(
        selectedItemForTransfer.escrow_order_id,
        proofUrl
      );

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

  // ─── Segmented control ────────────────────────────────────────────
  const renderEnhancedFilter = () => {
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 40;
    const controlPadding = 8;
    const availableWidth = screenWidth - containerPadding - controlPadding;
    const segmentWidth = availableWidth / filterOptions.length;

    return (
      <View style={styles.enhancedFilterContainer}>
        <BlurView intensity={25} style={styles.segmentedControlBlur}>
          <View style={styles.segmentedControl}>
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

            {filterOptions.map((option, index) => {
              const isActive = activeTab === option.value;
              const stats =
                option.value === "selling"
                  ? tabStats.selling
                  : option.value === "bought"
                  ? tabStats.bought
                  : tabStats.watchlist;

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

  // ─── Loading guard ────────────────────────────────────────────────
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

  // ─── Main render ──────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

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
            style={styles.stripeButton}
            onPress={handleOpenStripeDashboard}
            disabled={isLoadingStripeDashboard}
          >
            {isLoadingStripeDashboard ? (
              <ActivityIndicator size="small" color={theme.secondary} />
            ) : (
              <Ionicons name="card-outline" size={24} color={theme.secondary} />
            )}
          </TouchableOpacity>

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
                <SellingTab
                  data={selling}
                  theme={{ primary: theme.primary, secondary: theme.secondary }}
                  onMarkTransfer={handleMarkTransferSent}
                  markingTransferId={markingTransferId}
                  onEdit={handleEditTicket}
                  onCancel={handleCancelListing}
                  onRateSeller={ratings.sellerRating.onRate}
                />
              ) : (
                <BuyingTab
                  data={buying}
                  theme={{ primary: theme.primary, secondary: theme.secondary }}
                  onConfirmReceipt={handleConfirmTransfer}
                  confirmingTransfer={confirmingTransfer}
                  onEdit={handleEditTicket}
                  onCancel={handleCancelListing}
                  onRateSeller={ratings.sellerRating.onRate}
                  hasPurchases={currentData.length > 0}
                />
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ─── Modals ──────────────────────────────────────────────── */}
      <TicketModals
        primaryColor={profile?.college?.primary_color || "#18453b"}
        secondaryColor={profile?.college?.secondary_color || "#ffd700"}
        editVisible={editModalVisible}
        editTicket={selectedTicket}
        editSaving={savingEdit}
        onEditClose={() => {
          setEditModalVisible(false);
          setSelectedTicket(null);
        }}
        onEditSave={handleSaveEdit}
        saleVisible={saleModalVisible}
        saleTicket={selectedTicketForSale}
        saleSaving={savingSale}
        onSaleClose={() => {
          setSaleModalVisible(false);
          setSelectedTicketForSale(null);
        }}
        onSaleConfirm={handleConfirmSale}
        ratings={ratings}
        transferProofVisible={transferProofModalVisible}
        transferItem={selectedItemForTransfer}
        onTransferProofClose={() => {
          setTransferProofModalVisible(false);
          setSelectedItemForTransfer(null);
        }}
        onTransferProofConfirm={handleConfirmTransferWithProof}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
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
  stripeButton: {
    position: "absolute",
    top: 60,
    left: 20,
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
  // Segmented Control
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
  // Loading state
  loadingState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
  },
});
