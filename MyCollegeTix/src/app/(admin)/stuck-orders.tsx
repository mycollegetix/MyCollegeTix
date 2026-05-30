// src/app/(admin)/stuck-orders.tsx
// Admin screen: orders stuck in escrow_status='payout_pending' for > 24h.
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AdminLayout from "@/src/components/AdminLayout";
import { OrderService, OrderWithDetails } from "@/src/services/orderService";
import { supabase } from "@/src/lib/supabase";

const DAY_MS = 24 * 60 * 60 * 1000;

function formatStuckAge(createdAt: string): string {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  const days = Math.floor(ageMs / DAY_MS);
  if (days >= 1) {
    return `stuck for ${days} day${days === 1 ? "" : "s"}`;
  }
  const hours = Math.floor(ageMs / (60 * 60 * 1000));
  return `stuck for ${hours} hour${hours === 1 ? "" : "s"}`;
}

function formatAmount(amount: number | null | undefined): string {
  return `$${(amount ?? 0).toFixed(2)}`;
}

export default function StuckOrdersScreen() {
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    const result = await OrderService.getStuckPayoutOrders();
    if (result.success && result.data) {
      setOrders(result.data);
    } else {
      Alert.alert("Error", result.error || "Failed to load stuck orders");
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders();
  }, [loadOrders]);

  const handleRetryPayout = async (order: OrderWithDetails) => {
    Alert.alert(
      "Retry payout?",
      `Trigger payout for "${order.ticket?.title || "this order"}" (${formatAmount(order.amount)})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Retry",
          style: "default",
          onPress: async () => {
            try {
              setRetryingOrderId(order.id);
              const { data, error } = await supabase.functions.invoke(
                "process-payout",
                {
                  body: {
                    orderId: order.id,
                    reason:
                      "Admin manual retry from stuck orders dashboard",
                  },
                }
              );

              if (error) {
                throw new Error(error.message || "Payout failed");
              }

              const success = (data as any)?.success !== false;
              Alert.alert(
                success ? "Payout triggered" : "Payout response",
                (data as any)?.message ||
                  (success
                    ? "Stripe transfer initiated. The order will leave this list once it succeeds."
                    : "See logs for details.")
              );

              await loadOrders();
            } catch (err) {
              Alert.alert(
                "Retry failed",
                err instanceof Error ? err.message : "Unknown error"
              );
            } finally {
              setRetryingOrderId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <AdminLayout
        title="Stuck Payouts"
        subtitle="Orders in payout_pending for more than 24 hours."
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
        </View>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Stuck Payouts"
      subtitle="Orders in payout_pending for more than 24 hours."
      onRefresh={onRefresh}
      isRefreshing={refreshing}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#10b981" />
            <Text style={styles.emptyStateText}>
              No stuck orders right now.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <Ionicons name="warning" size={18} color="#f59e0b" />
              <Text style={styles.summaryText}>
                {orders.length} order{orders.length === 1 ? "" : "s"} need
                attention
              </Text>
            </View>

            {orders.map((order) => {
              const isRetrying = retryingOrderId === order.id;
              const sellerName =
                order.seller?.full_name ||
                order.seller?.username ||
                order.seller?.email ||
                "Unknown seller";

              return (
                <View key={order.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.ticketTitle} numberOfLines={2}>
                      {order.ticket?.title || "Unknown ticket"}
                    </Text>
                    <Text style={styles.amount}>
                      {formatAmount(order.amount)}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="person" size={14} color="#6b7280" />
                    <Text style={styles.metaText}>{sellerName}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Ionicons name="time" size={14} color="#dc2626" />
                    <Text style={[styles.metaText, styles.stuckText]}>
                      {formatStuckAge(order.created_at)}
                    </Text>
                  </View>

                  <Text style={styles.orderId} numberOfLines={1}>
                    {order.id}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.retryButton,
                      isRetrying && styles.retryButtonDisabled,
                    ]}
                    onPress={() => handleRetryPayout(order)}
                    disabled={isRetrying || retryingOrderId !== null}
                  >
                    {isRetrying ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={18} color="white" />
                        <Text style={styles.retryButtonText}>
                          Retry payout
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  summaryText: {
    fontSize: 14,
    color: "#92400e",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#dc2626",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  ticketTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  metaText: {
    fontSize: 13,
    color: "#6b7280",
  },
  stuckText: {
    color: "#dc2626",
    fontWeight: "500",
  },
  orderId: {
    fontFamily: "Courier",
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 8,
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#18453b",
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
