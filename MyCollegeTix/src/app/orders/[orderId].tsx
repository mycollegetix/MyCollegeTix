// src/app/orders/[orderId].tsx
// Order status screen - shows escrow status and allows confirmation/dispute
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useStripePayment } from "@/src/hooks/useStripePayment";
import { EscrowService } from "@/src/services/escrowService";
import { supabase } from "@/src/lib/supabase";

interface OrderDetails {
  id: string;
  status: string;
  escrow_status: string;
  amount: number;
  transfer_deadline: string;
  buyer_id: string;
  seller_id: string;
  created_at: string;
  ticket: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    section: string;
    row_number: string;
    seat_number: string;
  };
  buyer: {
    id: string;
    full_name: string;
    username: string;
  };
  seller: {
    id: string;
    full_name: string;
    username: string;
  };
  ticket_transfer?: {
    status: string;
    transfer_method?: string;
    transfer_initiated_at?: string;
    confirmed_at?: string;
    confirmed_by?: string;
  };
}

export default function OrderStatusScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { confirmReceipt, isLoading: confirmLoading } = useStripePayment();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          ticket:tickets!orders_ticket_id_fkey (
            id,
            title,
            event_date,
            location,
            section,
            row_number,
            seat_number
          ),
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("id", orderId)
        .single();

      if (error) {
        throw error;
      }

      // Handle missing ticket data
      if (!data.ticket) {
        console.warn("Order ticket data is missing, using fallback");
        data.ticket = {
          id: data.ticket_id || "unknown",
          title: "Ticket (details loading...)",
          event_date: data.created_at,
          location: "TBD",
          section: "",
          row_number: "",
          seat_number: "",
        };
      }

      // Also fetch ticket transfer status
      const { data: transfer } = await supabase
        .from("ticket_transfers")
        .select("*")
        .eq("order_id", orderId)
        .single();

      setOrder({
        ...data,
        ticket_transfer: transfer ?? undefined,
      });
    } catch (err) {
      console.error("Error loading order:", err);
      Alert.alert("Error", "Failed to load order details");
      router.back();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrder();
  }, [loadOrder]);

  const handleConfirmReceipt = async () => {
    if (!order) return;

    Alert.alert(
      "Confirm Receipt",
      "Have you received the ticket? This will release payment to the seller and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, Confirm",
          onPress: async () => {
            const result = await confirmReceipt(order.id);
            if (result.success) {
              Alert.alert("Success", "Receipt confirmed! Payment will be sent to the seller.");
              loadOrder();
            } else {
              Alert.alert("Error", result.error || "Failed to confirm receipt");
            }
          },
        },
      ]
    );
  };

  const handleFileDispute = () => {
    if (!order) return;
    // Navigate to dispute screen (to be implemented)
    Alert.alert(
      "File Dispute",
      "If you haven't received your ticket or there's an issue, you can file a dispute. Our team will review and help resolve the issue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "File Dispute",
          style: "destructive",
          onPress: () => {
            // TODO: Navigate to dispute form
            Alert.alert("Coming Soon", "Dispute filing will be available soon.");
          },
        },
      ]
    );
  };

  const getStatusInfo = (escrowStatus: string) => {
    const statusMap: Record<string, { color: string; icon: string; label: string; description: string }> = {
      payment_pending: {
        color: "#f59e0b",
        icon: "time-outline",
        label: "Payment Pending",
        description: "Waiting for payment to be processed",
      },
      payment_held: {
        color: "#3b82f6",
        icon: "shield-checkmark-outline",
        label: "Payment Secured",
        description: "Payment is held securely. Waiting for seller to transfer the ticket.",
      },
      transfer_pending: {
        color: "#8b5cf6",
        icon: "swap-horizontal-outline",
        label: "Transfer in Progress",
        description: "Seller has initiated the ticket transfer. Please check your email or ticket account.",
      },
      payout_pending: {
        color: "#10b981",
        icon: "card-outline",
        label: "Payout Processing",
        description: "Receipt confirmed! Payment is being sent to the seller.",
      },
      completed: {
        color: "#10b981",
        icon: "checkmark-circle",
        label: "Completed",
        description: "Transaction complete! Enjoy the event!",
      },
      disputed: {
        color: "#ef4444",
        icon: "alert-circle-outline",
        label: "Disputed",
        description: "This order is under review by our team.",
      },
      refunded: {
        color: "#6b7280",
        icon: "refresh-outline",
        label: "Refunded",
        description: "Payment has been refunded to your account.",
      },
    };

    return statusMap[escrowStatus] || {
      color: "#6b7280",
      icon: "help-circle-outline",
      label: "Unknown",
      description: "Status unknown",
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const isDeadlinePassed = (deadline: string) => {
    return new Date(deadline) < new Date();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading order...</Text>
        </View>
      </View>
    );
  }

  if (!order || !user) {
    return null;
  }

  const statusInfo = getStatusInfo(order.escrow_status);
  const isBuyer = user.id === order.buyer_id;
  const isSeller = user.id === order.seller_id;
  const canConfirm = isBuyer && ["payment_held", "transfer_pending"].includes(order.escrow_status);
  const canDispute = isBuyer && ["payment_held", "transfer_pending"].includes(order.escrow_status);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Status</Text>
        <TouchableOpacity style={styles.headerButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
        }
      >
        <View style={styles.contentCard}>
          {/* Status Card */}
          <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
            <View style={[styles.statusIconCircle, { backgroundColor: statusInfo.color }]}>
              <Ionicons name={statusInfo.icon as any} size={32} color="white" />
            </View>
            <Text style={styles.statusLabel}>{statusInfo.label}</Text>
            <Text style={styles.statusDescription}>{statusInfo.description}</Text>
          </View>

          {/* Transfer Deadline */}
          {order.transfer_deadline && !["completed", "refunded"].includes(order.escrow_status) && (
            <View style={[
              styles.deadlineCard,
              isDeadlinePassed(order.transfer_deadline) && styles.deadlineCardExpired
            ]}>
              <Ionicons
                name="time-outline"
                size={20}
                color={isDeadlinePassed(order.transfer_deadline) ? "#ef4444" : "#f59e0b"}
              />
              <View style={styles.deadlineContent}>
                <Text style={styles.deadlineLabel}>Transfer Deadline</Text>
                <Text style={[
                  styles.deadlineValue,
                  isDeadlinePassed(order.transfer_deadline) && styles.deadlineValueExpired
                ]}>
                  {formatDate(order.transfer_deadline)}
                </Text>
                {isDeadlinePassed(order.transfer_deadline) && (
                  <Text style={styles.deadlineExpiredNote}>
                    Deadline has passed. You can request a refund.
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Ticket Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Ticket Details
            </Text>
            <View style={styles.ticketCard}>
              <Text style={styles.ticketTitle}>{order.ticket.title}</Text>
              <View style={styles.ticketDetail}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>
                  {formatDate(order.ticket.event_date)}
                </Text>
              </View>
              <View style={styles.ticketDetail}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>{order.ticket.location}</Text>
              </View>
              <View style={styles.ticketDetail}>
                <Ionicons name="ticket-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>
                  Section {order.ticket.section}, Row {order.ticket.row_number}, Seat {order.ticket.seat_number}
                </Text>
              </View>
            </View>
          </View>

          {/* Parties Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              {isBuyer ? "Seller" : "Buyer"}
            </Text>
            <View style={styles.partyCard}>
              <View style={[styles.partyAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.partyInitials}>
                  {(isBuyer ? order.seller.full_name : order.buyer.full_name).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.partyInfo}>
                <Text style={styles.partyName}>
                  {isBuyer ? order.seller.full_name : order.buyer.full_name}
                </Text>
                <Text style={styles.partyUsername}>
                  @{isBuyer ? order.seller.username : order.buyer.username}
                </Text>
              </View>
            </View>
          </View>

          {/* Transfer Status */}
          {order.ticket_transfer && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Transfer Status
              </Text>
              <View style={styles.transferCard}>
                <View style={styles.transferRow}>
                  <Text style={styles.transferLabel}>Status</Text>
                  <Text style={styles.transferValue}>
                    {order.ticket_transfer.status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
                {order.ticket_transfer.transfer_method && (
                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>Method</Text>
                    <Text style={styles.transferValue}>
                      {order.ticket_transfer.transfer_method.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                  </View>
                )}
                {order.ticket_transfer.transfer_initiated_at && (
                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>Initiated</Text>
                    <Text style={styles.transferValue}>
                      {formatDate(order.ticket_transfer.transfer_initiated_at)}
                    </Text>
                  </View>
                )}
                {order.ticket_transfer.confirmed_at && (
                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>Confirmed</Text>
                    <Text style={styles.transferValue}>
                      {formatDate(order.ticket_transfer.confirmed_at)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Payment Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Payment
            </Text>
            <View style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Amount</Text>
                <Text style={[styles.paymentValue, { color: theme.primary }]}>
                  ${order.amount.toFixed(2)}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Order Date</Text>
                <Text style={styles.paymentValue}>{formatDate(order.created_at)}</Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Order ID</Text>
                <Text style={styles.paymentValue}>{order.id.slice(0, 8)}...</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      {(canConfirm || canDispute) && (
        <BlurView intensity={90} style={styles.bottomBar}>
          <View style={styles.bottomActions}>
            {canDispute && (
              <TouchableOpacity
                style={styles.disputeButton}
                onPress={handleFileDispute}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#ef4444" />
                <Text style={styles.disputeButtonText}>Report Issue</Text>
              </TouchableOpacity>
            )}
            {canConfirm && (
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                onPress={handleConfirmReceipt}
                disabled={confirmLoading}
              >
                {confirmLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "white",
  },
  scrollView: {
    flex: 1,
  },
  contentCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 20,
    paddingBottom: 150,
  },
  statusCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: 24,
    backgroundColor: "#f8fafc",
  },
  statusIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
  },
  statusDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  deadlineCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  deadlineCardExpired: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  deadlineContent: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  deadlineValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#78350f",
  },
  deadlineValueExpired: {
    color: "#dc2626",
  },
  deadlineExpiredNote: {
    fontSize: 12,
    color: "#dc2626",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  ticketCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  ticketTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  ticketDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  ticketDetailText: {
    fontSize: 14,
    color: "#6b7280",
  },
  partyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  partyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  partyInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  partyUsername: {
    fontSize: 14,
    color: "#6b7280",
  },
  transferCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  transferRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  transferLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  transferValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  paymentCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  paymentLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
  },
  bottomActions: {
    flexDirection: "row",
    gap: 12,
  },
  disputeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  disputeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
  confirmButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
