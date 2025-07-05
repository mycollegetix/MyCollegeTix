import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  FlatList,
  View,
  Text,
  Dimensions,
  ScrollView,
} from "react-native";
import { TicketCard } from "@/src/components/TicketCard";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

// Mock data - we'll replace this with real data from Supabase later
const mockOrders = {
  buying: [
    {
      id: "1",
      sport: "Football",
      event: "MSU vs Michigan",
      date: "Oct 21, 2024 • 7:30 PM",
      price: 150.0,
      section: "25",
      row: "G",
      seat: "12",
      status: "Confirmed",
    },
    {
      id: "2",
      sport: "Basketball",
      event: "MSU vs Ohio State",
      date: "Nov 15, 2024 • 8:00 PM",
      price: 75.0,
      section: "118",
      row: "C",
      seat: "5",
      status: "Pending",
    },
  ],
  selling: [
    {
      id: "3",
      sport: "Hockey",
      event: "MSU vs Notre Dame",
      date: "Dec 5, 2024 • 6:00 PM",
      price: 45.0,
      section: "8",
      row: "K",
      seat: "15",
      status: "Listed",
    },
  ],
};

type OrderType = "buying" | "selling";

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderType>("buying");
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return {
          color: "#10b981",
          icon: "checkmark-circle-outline",
          text: "Confirmed",
        };
      case "pending":
        return { color: "#f59e0b", icon: "time-outline", text: "Pending" };
      case "listed":
        return { color: "#3b82f6", icon: "pricetag-outline", text: "Listed" };
      default:
        return { color: "#6b7280", icon: "help-circle-outline", text: status };
    }
  };

  const getTabStats = (tab: OrderType) => {
    const orders = mockOrders[tab];
    const total = orders.reduce((sum, order) => sum + order.price, 0);
    return { count: orders.length, total };
  };

  const renderOrder = ({ item }: { item: (typeof mockOrders.buying)[0] }) => {
    const statusConfig = getStatusConfig(item.status);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.sportIconContainer}>
            <Ionicons
              name={getSportIcon(item.sport)}
              size={24}
              color="#18453b"
            />
          </View>
          <View style={styles.orderInfo}>
            <Text style={styles.eventName}>{item.event}</Text>
            <Text style={styles.sportName}>{item.sport}</Text>
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

        <View style={styles.orderDetails}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>{item.date}</Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#6b7280" />
              <Text style={styles.detailText}>
                Section {item.section} • Row {item.row} • Seat {item.seat}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>
              {activeTab === "buying" ? "Paid" : "Listed for"}
            </Text>
            <Text style={styles.priceValue}>${item.price.toFixed(2)}</Text>
          </View>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#18453b" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const getSportIcon = (sport: string) => {
    switch (sport.toLowerCase()) {
      case "football":
        return "american-football-outline";
      case "basketball":
        return "basketball-outline";
      case "hockey":
        return "golf-outline";
      case "soccer":
        return "football-outline";
      case "volleyball":
        return "tennisball-outline";
      default:
        return "ticket-outline";
    }
  };

  const buyingStats = getTabStats("buying");
  const sellingStats = getTabStats("selling");

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
        style={styles.background}
      />

      {/* Floating elements */}
      <View style={styles.floatingElement1} />
      <View style={styles.floatingElement2} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <LinearGradient colors={["#ffd700", "#ffed4a"]} style={styles.logo}>
              <Ionicons name="receipt-outline" size={32} color="#18453b" />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>
            Track your ticket purchases and sales
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Ionicons name="bag-outline" size={24} color="#18453b" />
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{buyingStats.count}</Text>
                <Text style={styles.statLabel}>Purchases</Text>
              </View>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="storefront-outline" size={24} color="#18453b" />
              <View style={styles.statContent}>
                <Text style={styles.statNumber}>{sellingStats.count}</Text>
                <Text style={styles.statLabel}>Listings</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tab Section */}
        <View style={styles.tabSection}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === "buying" && styles.activeTab]}
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
              style={[styles.tab, activeTab === "selling" && styles.activeTab]}
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
          </View>
        </View>

        {/* Orders List */}
        <View style={styles.ordersSection}>
          {mockOrders[activeTab].length > 0 ? (
            <FlatList
              data={mockOrders[activeTab]}
              renderItem={renderOrder}
              keyExtractor={(item) => item.id}
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
                  ? "Start browsing tickets to make your first purchase"
                  : "List your first ticket to start selling"}
              </Text>
              <TouchableOpacity style={styles.emptyActionButton}>
                <LinearGradient
                  colors={["#18453b", "#2a6b5a"]}
                  style={styles.emptyButtonGradient}
                >
                  <Text style={styles.emptyActionText}>
                    {activeTab === "buying"
                      ? "Browse Tickets"
                      : "Sell a Ticket"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </BlurView>
          )}
        </View>
      </ScrollView>
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
    backgroundColor: "rgba(255, 215, 0, 0.08)",
  },
  floatingElement2: {
    position: "absolute",
    bottom: "30%",
    right: "15%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  scrollView: {
    flex: 1,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 30,
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
    shadowColor: "#ffd700",
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
    color: "#18453b",
  },
  statLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 40,
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
  activeTab: {
    backgroundColor: "#18453b",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeTabText: {
    color: "white",
  },
  ordersSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sportIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  sportName: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
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
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  orderFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  priceContainer: {
    alignItems: "flex-start",
  },
  priceLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#18453b",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
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
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  emptyActionButton: {
    borderRadius: 12,
  },
  emptyButtonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
