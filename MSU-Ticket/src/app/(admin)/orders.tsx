// src/app/(admin)/orders.tsx - Clean Admin Orders Page
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import AdminLayout from "@/src/components/AdminLayout";

const { width } = Dimensions.get("window");

interface OrderWithDetails {
  id: string;
  amount: number;
  buyer_id: string;
  seller_id: string;
  ticket_id: string;
  status: string;
  payment_method: string | null;
  transaction_id: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  buyer: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  } | null;
  seller: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  } | null;
  ticket: {
    id: string;
    title: string;
    event_date: string;
    location: string;
  } | null;
}

interface OrderFilters {
  status?: string;
  searchTerm?: string;
}

export default function AdminOrdersScreen() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(
    null
  );

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  const { user } = useAuth();

  const loadOrders = useCallback(async () => {
    try {
      let query = supabase
        .from("orders")
        .select(
          `
          *,
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            email,
            username
          ),
          ticket:tickets (
            id,
            title,
            event_date,
            location
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error loading orders:", error);
        Alert.alert("Error", "Failed to load orders");
        setOrders([]);
        return;
      }

      const transformedData: OrderWithDetails[] = (data || []).map(
        (order: any) => ({
          ...order,
          buyer: Array.isArray(order.buyer) ? order.buyer[0] : order.buyer,
          seller: Array.isArray(order.seller) ? order.seller[0] : order.seller,
          ticket: Array.isArray(order.ticket) ? order.ticket[0] : order.ticket,
        })
      );

      setOrders(transformedData);
      calculateStats(transformedData);
    } catch (error) {
      console.error("Error in loadOrders:", error);
      Alert.alert("Error", "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const calculateStats = (orderData: OrderWithDetails[]) => {
    const totalRevenue = orderData
      .filter((order) => order.status === "completed")
      .reduce((sum, order) => sum + order.amount, 0);

    setStats({
      totalOrders: orderData.length,
      totalRevenue,
      pendingOrders: orderData.filter((order) => order.status === "pending")
        .length,
      completedOrders: orderData.filter((order) => order.status === "completed")
        .length,
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
  }, [loadOrders]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, searchTerm: query }));
  };

  const handleFilterChange = (key: keyof OrderFilters, value: string) => {
    const newValue = value === "" ? undefined : value;
    setFilters((prev) => ({ ...prev, [key]: newValue }));
  };

  const openDetailsModal = (order: OrderWithDetails) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          completed_at:
            newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating order:", error);
        Alert.alert("Error", "Failed to update order");
        return;
      }

      Alert.alert("Success", "Order status updated successfully");
      loadOrders();
    } catch (error) {
      console.error("Error updating order status:", error);
      Alert.alert("Error", "Failed to update order status");
    }
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    Alert.alert("Update Order Status", `Change status to ${newStatus}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Update",
        onPress: () => updateOrderStatus(orderId, newStatus),
      },
    ]);
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, loadOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "#10b981";
      case "pending":
        return "#f59e0b";
      case "cancelled":
        return "#ef4444";
      case "refunded":
        return "#8b5cf6";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "pending":
        return "time";
      case "cancelled":
        return "close-circle";
      case "refunded":
        return "return-up-back";
      default:
        return "help-circle";
    }
  };

  const renderOrderItem = ({ item }: { item: OrderWithDetails }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
          <Text style={styles.ticketTitle}>
            {item.ticket?.title || "Unknown Ticket"}
          </Text>
          <Text style={styles.orderDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.orderAmount}>
          <Text style={styles.amountText}>${item.amount.toFixed(2)}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) },
            ]}
          >
            <Ionicons
              name={getStatusIcon(item.status) as any}
              size={12}
              color="white"
            />
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Buyer:</Text>
          <Text style={styles.userName}>
            {item.buyer?.full_name || "Unknown"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Seller:</Text>
          <Text style={styles.userName}>
            {item.seller?.full_name || "Unknown"}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.detailsButton]}
          onPress={() => openDetailsModal(item)}
        >
          <Ionicons name="eye" size={16} color="white" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>

        {item.status === "pending" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleStatusUpdate(item.id, "completed")}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleStatusUpdate(item.id, "cancelled")}
            >
              <Ionicons name="close" size={16} color="white" />
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );

  return (
    <AdminLayout
      title="Order Management"
      subtitle={`${orders.length} total orders`}
    >
      <View style={styles.container}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalOrders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${stats.totalRevenue.toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingOrders}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedOrders}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons
              name="search"
              size={20}
              color="#9ca3af"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search orders..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                !filters.status && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange("status", "")}
            >
              <Text
                style={[
                  styles.filterText,
                  !filters.status && styles.filterTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {["pending", "completed", "cancelled", "refunded"].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  filters.status === status && styles.filterButtonActive,
                ]}
                onPress={() => handleFilterChange("status", status)}
              >
                <Text
                  style={[
                    styles.filterText,
                    filters.status === status && styles.filterTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Orders List */}
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="refresh" size={32} color="#6b7280" />
                <Text style={styles.emptyText}>Loading orders...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color="#6b7280" />
                <Text style={styles.emptyText}>No orders found</Text>
                <Text style={styles.emptySubtext}>
                  {filters.status
                    ? `No ${filters.status} orders available`
                    : "Orders will appear here when users make purchases"}
                </Text>
              </View>
            )
          }
        />

        {/* Order Details Modal */}
        <Modal visible={showDetailsModal} animationType="slide" transparent>
          <BlurView intensity={50} style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Order Details</Text>
                <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              {selectedOrder && (
                <ScrollView style={styles.modalContent}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Order ID</Text>
                    <Text style={styles.detailValue}>#{selectedOrder.id}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Amount</Text>
                    <Text style={styles.detailValue}>
                      ${selectedOrder.amount.toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: getStatusColor(selectedOrder.status),
                        },
                      ]}
                    >
                      <Ionicons
                        name={getStatusIcon(selectedOrder.status) as any}
                        size={12}
                        color="white"
                      />
                      <Text style={styles.statusText}>
                        {selectedOrder.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Buyer</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.buyer?.full_name || "Unknown"}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {selectedOrder.buyer?.email || "No email"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Seller</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.seller?.full_name || "Unknown"}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {selectedOrder.seller?.email || "No email"}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Ticket</Text>
                    <Text style={styles.detailValue}>
                      {selectedOrder.ticket?.title || "Unknown Ticket"}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {selectedOrder.ticket?.location || "Unknown Location"}
                    </Text>
                    {selectedOrder.ticket?.event_date && (
                      <Text style={styles.detailSubValue}>
                        {new Date(
                          selectedOrder.ticket.event_date
                        ).toLocaleDateString()}
                      </Text>
                    )}
                  </View>

                  {selectedOrder.payment_method && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Payment Method</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.payment_method}
                      </Text>
                    </View>
                  )}

                  {selectedOrder.transaction_id && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Transaction ID</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.transaction_id}
                      </Text>
                    </View>
                  )}

                  {selectedOrder.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Notes</Text>
                      <Text style={styles.detailValue}>
                        {selectedOrder.notes}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Created</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedOrder.created_at).toLocaleString()}
                    </Text>
                  </View>

                  {selectedOrder.completed_at && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailLabel}>Completed</Text>
                      <Text style={styles.detailValue}>
                        {new Date(selectedOrder.completed_at).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              )}
            </View>
          </BlurView>
        </Modal>
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    fontWeight: "500",
  },
  searchContainer: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#1F2937",
  },
  filtersContainer: {
    flexDirection: "row",
  },
  filterButton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#18453b",
  },
  filterText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "white",
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  orderCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
    marginBottom: 4,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  orderAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#18453b",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  orderDetails: {
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  userLabel: {
    fontSize: 14,
    color: "#6B7280",
    width: 60,
    fontWeight: "500",
  },
  userName: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
    flex: 1,
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    gap: 4,
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  detailsButton: {
    backgroundColor: "#3b82f6",
  },
  completeButton: {
    backgroundColor: "#10b981",
  },
  cancelButton: {
    backgroundColor: "#ef4444",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#6B7280",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#9CA3AF",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: width - 40,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#18453b",
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: "500",
  },
  detailSubValue: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
});
