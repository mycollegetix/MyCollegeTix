// src/app/(admin)/orders.tsx - Admin Order Management Screen
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
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { OrderService } from "@/src/services/orderService";
import { useAuth } from "@/src/providers/AuthProvider";

const { width } = Dimensions.get("window");

// Order interface based on your database types
interface Order {
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
}

// Extended order with profile and ticket info
interface OrderWithDetails extends Order {
  buyer: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
  seller: {
    id: string;
    full_name: string;
    email: string;
    username: string;
  };
  ticket: {
    id: string;
    title: string;
    event_date: string;
    location: string;
  };
}

interface OrderFilters {
  status?: string;
  dateRange?: string;
  searchTerm?: string;
}

interface OrderUpdateData {
  status?: string;
  notes?: string;
  payment_method?: string;
  transaction_id?: string;
}

export default function OrderManagementScreen() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter and search states
  const [filters, setFilters] = useState<OrderFilters>({});
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(
    null
  );
  const [updateData, setUpdateData] = useState<OrderUpdateData>({});
  const [updating, setUpdating] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
  });

  const { profile } = useAuth();

  // ✅ Memoized functions to prevent re-renders
  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const result = await OrderService.getAllOrdersWithDetails(filters);
      if (result.success && result.data) {
        setOrders(result.data);
        calculateStats(result.data);
      } else {
        Alert.alert("Error", result.error || "Failed to load orders");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  }, [loadOrders]);

  const calculateStats = useCallback((orderData: OrderWithDetails[]) => {
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
  }, []);

  // Status update handler
  const handleStatusUpdate = useCallback(
    async (orderId: string, newStatus: string) => {
      Alert.alert("Update Order Status", `Change status to ${newStatus}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Update",
          style: "default",
          onPress: async () => {
            try {
              const result = await OrderService.updateOrderStatus(
                orderId,
                newStatus
              );
              if (result.success) {
                loadOrders();
                Alert.alert("Success", "Order status updated successfully");
              } else {
                Alert.alert("Error", result.error || "Failed to update order");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to update order status");
            }
          },
        },
      ]);
    },
    [loadOrders]
  );

  // Search handler
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setFilters((prev) => ({ ...prev, searchTerm: query }));
  }, []);

  // Filter handler
  const handleFilterChange = useCallback(
    (key: keyof OrderFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Modal handlers
  const openDetailsModal = useCallback((order: OrderWithDetails) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  }, []);

  const openUpdateModal = useCallback((order: OrderWithDetails) => {
    setSelectedOrder(order);
    setUpdateData({
      status: order.status,
      notes: order.notes || "",
      payment_method: order.payment_method || "",
      transaction_id: order.transaction_id || "",
    });
    setShowUpdateModal(true);
  }, []);

  const closeDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedOrder(null);
  }, []);

  const closeUpdateModal = useCallback(() => {
    setShowUpdateModal(false);
    setSelectedOrder(null);
    setUpdateData({});
  }, []);

  // Update order handler
  const handleUpdateOrder = useCallback(async () => {
    if (!selectedOrder) return;

    setUpdating(true);
    try {
      const result = await OrderService.updateOrder(
        selectedOrder.id,
        updateData
      );
      if (result.success) {
        loadOrders();
        closeUpdateModal();
        Alert.alert("Success", "Order updated successfully");
      } else {
        Alert.alert("Error", result.error || "Failed to update order");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update order");
    } finally {
      setUpdating(false);
    }
  }, [selectedOrder, updateData, loadOrders, closeUpdateModal]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Get status color
  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  // Get status icon
  const getStatusIcon = useCallback((status: string) => {
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
  }, []);

  // Render order item
  const renderOrderItem = useCallback(
    ({ item }: { item: OrderWithDetails }) => (
      <BlurView intensity={20} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>#{item.id.slice(-8)}</Text>
            <Text style={styles.ticketTitle}>{item.ticket.title}</Text>
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
                name={getStatusIcon(item.status)}
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
            <Text style={styles.userName}>{item.buyer.full_name}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userLabel}>Seller:</Text>
            <Text style={styles.userName}>{item.seller.full_name}</Text>
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

          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openUpdateModal(item)}
          >
            <Ionicons name="pencil" size={16} color="white" />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>

          {item.status === "pending" && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => handleStatusUpdate(item.id, "completed")}
            >
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    ),
    [
      openDetailsModal,
      openUpdateModal,
      handleStatusUpdate,
      getStatusColor,
      getStatusIcon,
    ]
  );

  return (
    <LinearGradient colors={["#18453b", "#2d5a4d"]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
        <Text style={styles.subtitle}>Monitor and manage ticket orders</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>${stats.totalRevenue.toFixed(0)}</Text>
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
              filters.status === undefined && styles.filterButtonActive,
            ]}
            onPress={() => handleFilterChange("status", "")}
          >
            <Text
              style={[
                styles.filterText,
                filters.status === undefined && styles.filterTextActive,
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
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />

      {/* Order Details Modal */}
      <Modal visible={showDetailsModal} animationType="slide" transparent>
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={closeDetailsModal}>
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
                      { backgroundColor: getStatusColor(selectedOrder.status) },
                    ]}
                  >
                    <Ionicons
                      name={getStatusIcon(selectedOrder.status)}
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
                    {selectedOrder.buyer.full_name}
                  </Text>
                  <Text style={styles.detailSubValue}>
                    {selectedOrder.buyer.email}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Seller</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.seller.full_name}
                  </Text>
                  <Text style={styles.detailSubValue}>
                    {selectedOrder.seller.email}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Ticket</Text>
                  <Text style={styles.detailValue}>
                    {selectedOrder.ticket.title}
                  </Text>
                  <Text style={styles.detailSubValue}>
                    {selectedOrder.ticket.location}
                  </Text>
                  <Text style={styles.detailSubValue}>
                    {new Date(
                      selectedOrder.ticket.event_date
                    ).toLocaleDateString()}
                  </Text>
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

      {/* Update Order Modal */}
      <Modal visible={showUpdateModal} animationType="slide" transparent>
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Order</Text>
              <TouchableOpacity onPress={closeUpdateModal}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Status</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {["pending", "completed", "cancelled", "refunded"].map(
                    (status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          updateData.status === status &&
                            styles.statusOptionActive,
                        ]}
                        onPress={() =>
                          setUpdateData((prev) => ({ ...prev, status }))
                        }
                      >
                        <Text
                          style={[
                            styles.statusOptionText,
                            updateData.status === status &&
                              styles.statusOptionTextActive,
                          ]}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <TextInput
                  style={styles.input}
                  value={updateData.payment_method || ""}
                  onChangeText={(text) =>
                    setUpdateData((prev) => ({ ...prev, payment_method: text }))
                  }
                  placeholder="e.g., Credit Card, PayPal"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transaction ID</Text>
                <TextInput
                  style={styles.input}
                  value={updateData.transaction_id || ""}
                  onChangeText={(text) =>
                    setUpdateData((prev) => ({ ...prev, transaction_id: text }))
                  }
                  placeholder="Transaction reference"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={updateData.notes || ""}
                  onChangeText={(text) =>
                    setUpdateData((prev) => ({ ...prev, notes: text }))
                  }
                  placeholder="Additional notes..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeUpdateModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={handleUpdateOrder}
                disabled={updating}
              >
                <Text style={styles.updateButtonText}>
                  {updating ? "Updating..." : "Update Order"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 48,
    color: "white",
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: "row",
  },
  filterButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#ffd700",
  },
  filterText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#18453b",
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
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
    color: "#ffd700",
    fontWeight: "600",
    marginBottom: 4,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.7)",
  },
  orderAmount: {
    alignItems: "flex-end",
  },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
    color: "rgba(255, 255, 255, 0.7)",
    width: 50,
  },
  userName: {
    fontSize: 14,
    color: "white",
    fontWeight: "500",
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
  },
  actionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  detailsButton: {
    backgroundColor: "#2563eb",
  },
  editButton: {
    backgroundColor: "#7c3aed",
  },
  completeButton: {
    backgroundColor: "#10b981",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 16,
    marginTop: 16,
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1f2937",
    backgroundColor: "#f9fafb",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  statusOption: {
    backgroundColor: "#f3f4f6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  statusOptionActive: {
    backgroundColor: "#18453b",
  },
  statusOptionText: {
    color: "#6b7280",
    fontSize: 14,
    fontWeight: "500",
  },
  statusOptionTextActive: {
    color: "white",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  updateButton: {
    backgroundColor: "#18453b",
  },
  updateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
