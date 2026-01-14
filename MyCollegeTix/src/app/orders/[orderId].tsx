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
import { usePendingOrders } from "@/src/hooks/usePendingOrders";
import { EscrowService } from "@/src/services/escrowService";
import { supabase } from "@/src/lib/supabase";
import SellerRatingModal, { SellerRatingData } from "@/src/components/SellerRatingModal";

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
  const { confirmReceipt, markTransferSent, isLoading: paymentLoading } = useStripePayment();
  const { refresh: refreshPendingOrders } = usePendingOrders();
  const [markingTransfer, setMarkingTransfer] = useState(false);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [pendingRatingPrompt, setPendingRatingPrompt] = useState<{
    id: string;
    ratee_id: string;
    ratee_name: string;
    prompt_type: string;
  } | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
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
        `
        )
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

      const orderData: OrderDetails = {
        id: data.id,
        status: data.status,
        escrow_status: data.escrow_status || "pending",
        amount: data.amount,
        transfer_deadline: data.transfer_deadline || "",
        buyer_id: data.buyer_id,
        seller_id: data.seller_id,
        created_at: data.created_at,
        ticket: {
          id: data.ticket.id,
          title: data.ticket.title,
          event_date: data.ticket.event_date,
          location: data.ticket.location,
          section: data.ticket.section || "",
          row_number: data.ticket.row_number || "",
          seat_number: data.ticket.seat_number || "",
        },
        buyer: data.buyer,
        seller: data.seller,
        ticket_transfer: transfer
          ? {
              status: transfer.status,
              transfer_method: transfer.transfer_method ?? undefined,
              transfer_initiated_at:
                transfer.transfer_initiated_at ?? undefined,
              confirmed_at: transfer.confirmed_at ?? undefined,
              confirmed_by: transfer.confirmed_by ?? undefined,
            }
          : undefined,
      };
      setOrder(orderData);
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

  // Check for pending rating prompts (for seller to rate buyer)
  useEffect(() => {
    const checkPendingRatingPrompt = async () => {
      if (!order || !user) return;

      // Only check for sellers - buyers get modal immediately after confirm
      const isSeller = order.seller_id === user.id;
      if (!isSeller) return;

      try {
        const { data: prompt } = await supabase
          .from("rating_prompts")
          .select("id, ratee_id, prompt_type")
          .eq("ticket_sale_id", order.id)
          .eq("prompter_id", user.id)
          .eq("status", "pending")
          .single();

        if (prompt) {
          setPendingRatingPrompt({
            id: prompt.id,
            ratee_id: prompt.ratee_id,
            ratee_name: order.buyer.full_name,
            prompt_type: prompt.prompt_type,
          });
          // Show modal after a short delay
          setTimeout(() => setRatingModalVisible(true), 500);
        }
      } catch (err) {
        // No pending prompt, that's fine
      }
    };

    // Only check if order is completed
    if (order?.escrow_status === "completed") {
      checkPendingRatingPrompt();
    }
  }, [order, user]);

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
              loadOrder();
              // Refresh the pending orders count immediately
              refreshPendingOrders();
              // Show rating modal to rate the seller
              setRatingModalVisible(true);
            } else {
              Alert.alert("Error", result.error || "Failed to confirm receipt");
            }
          },
        },
      ]
    );
  };

  const handleSubmitRating = async (ratingData: SellerRatingData) => {
    if (!order || !user) return;

    const isSeller = order.seller_id === user.id;
    const ratedUserId = pendingRatingPrompt?.ratee_id || order.seller_id;
    const transactionType = isSeller ? "selling" : "buying";

    setSubmittingRating(true);
    try {
      const { error } = await supabase.from("user_ratings").insert({
        rater_id: user.id,
        rated_user_id: ratedUserId,
        ticket_sale_id: order.id,
        transaction_type: transactionType,
        rating: ratingData.rating,
        review_text: ratingData.review || null,
      });

      if (error) {
        console.error("Error submitting rating:", error);
        Alert.alert("Error", "Failed to submit rating. Please try again.");
        return;
      }

      // Mark rating prompt as completed if this was from a prompt
      if (pendingRatingPrompt) {
        await supabase
          .from("rating_prompts")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", pendingRatingPrompt.id);
        setPendingRatingPrompt(null);
      }

      setRatingModalVisible(false);
      Alert.alert(
        "Thank You!",
        isSeller
          ? "Your rating for the buyer has been submitted."
          : "Your rating has been submitted. Enjoy the event!"
      );
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert("Error", "Failed to submit rating. Please try again.");
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleFileDispute = () => {
    if (!order) return;
    router.push(`/dispute/${order.id}`);
  };

  const handleMarkTransferSent = async () => {
    if (!order) return;

    Alert.alert(
      "Confirm Transfer",
      "Have you transferred the ticket to the buyer? This will notify them to check their email or ticketing app.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Yes, I've Transferred It",
          onPress: async () => {
            setMarkingTransfer(true);
            const result = await markTransferSent(order.id);
            setMarkingTransfer(false);

            if (result.success) {
              Alert.alert(
                "Success",
                "Transfer marked as sent! The buyer has been notified to check for the ticket."
              );
              loadOrder();
              refreshPendingOrders();
            } else {
              Alert.alert("Error", result.error || "Failed to mark transfer");
            }
          },
        },
      ]
    );
  };

  const getStatusInfo = (escrowStatus: string) => {
    const statusMap: Record<
      string,
      { color: string; icon: string; label: string; description: string }
    > = {
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
        description:
          "Payment is held securely. Waiting for seller to transfer the ticket.",
      },
      transfer_pending: {
        color: "#8b5cf6",
        icon: "swap-horizontal-outline",
        label: "Transfer in Progress",
        description:
          "Seller has initiated the ticket transfer. Please check your email or ticket account.",
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

    return (
      statusMap[escrowStatus] || {
        color: "#6b7280",
        icon: "help-circle-outline",
        label: "Unknown",
        description: "Status unknown",
      }
    );
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
  const canConfirm =
    isBuyer &&
    ["payment_held", "transfer_pending"].includes(order.escrow_status);
  // Both buyers and sellers can file disputes during active transaction
  const canDispute =
    (isBuyer || isSeller) &&
    ["payment_held", "transfer_pending"].includes(order.escrow_status);
  // Seller can mark transfer when payment is held (before they've sent it)
  const canMarkTransfer =
    isSeller && order.escrow_status === "payment_held";
  // Seller has already marked transfer as sent
  const transferSent =
    isSeller && order.escrow_status === "transfer_pending";

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
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="white"
          />
        }
      >
        <View style={styles.contentCard}>
          {/* Status Card */}
          <View style={[styles.statusCard, { borderColor: statusInfo.color }]}>
            <View
              style={[
                styles.statusIconCircle,
                { backgroundColor: statusInfo.color },
              ]}
            >
              <Ionicons name={statusInfo.icon as any} size={32} color="white" />
            </View>
            <Text style={styles.statusLabel}>{statusInfo.label}</Text>
            <Text style={styles.statusDescription}>
              {statusInfo.description}
            </Text>
          </View>

          {/* Transfer Deadline */}
          {order.transfer_deadline &&
            !["completed", "refunded"].includes(order.escrow_status) && (
              <View
                style={[
                  styles.deadlineCard,
                  isDeadlinePassed(order.transfer_deadline) &&
                    styles.deadlineCardExpired,
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={
                    isDeadlinePassed(order.transfer_deadline)
                      ? "#ef4444"
                      : "#f59e0b"
                  }
                />
                <View style={styles.deadlineContent}>
                  <Text style={styles.deadlineLabel}>Transfer Deadline</Text>
                  <Text
                    style={[
                      styles.deadlineValue,
                      isDeadlinePassed(order.transfer_deadline) &&
                        styles.deadlineValueExpired,
                    ]}
                  >
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
                <Text style={styles.ticketDetailText}>
                  {order.ticket.location}
                </Text>
              </View>
              <View style={styles.ticketDetail}>
                <Ionicons name="ticket-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>
                  Section {order.ticket.section}, Row {order.ticket.row_number},
                  Seat {order.ticket.seat_number}
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
              <View
                style={[styles.partyAvatar, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.partyInitials}>
                  {(isBuyer ? order.seller.full_name : order.buyer.full_name)
                    .charAt(0)
                    .toUpperCase()}
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
                    {order.ticket_transfer.status
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
                {order.ticket_transfer.transfer_method && (
                  <View style={styles.transferRow}>
                    <Text style={styles.transferLabel}>Method</Text>
                    <Text style={styles.transferValue}>
                      {order.ticket_transfer.transfer_method
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
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
                <Text style={styles.paymentValue}>
                  {formatDate(order.created_at)}
                </Text>
              </View>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Order ID</Text>
                <Text style={styles.paymentValue}>
                  {order.id.slice(0, 8)}...
                </Text>
              </View>
            </View>
          </View>

          {/* Seller Action Section - Transfer the ticket */}
          {canMarkTransfer && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Action Required
              </Text>

              {/* Instructions for seller */}
              <View style={styles.instructionCard}>
                <View style={styles.instructionHeader}>
                  <Ionicons
                    name="send"
                    size={24}
                    color="#3b82f6"
                  />
                  <Text style={styles.instructionTitle}>
                    Transfer the Ticket
                  </Text>
                </View>
                <Text style={styles.instructionText}>
                  A buyer has purchased your ticket! Please transfer it to them using your school's ticketing system (e.g., Paciolan, Ticketmaster).
                </Text>
                <Text style={[styles.instructionText, { marginTop: 8 }]}>
                  Once you've transferred the ticket, tap the button below to notify the buyer.
                </Text>
              </View>

              {/* Buyer Info */}
              <View style={styles.buyerInfoCard}>
                <View style={styles.buyerInfoHeader}>
                  <Ionicons name="person" size={20} color="#10b981" />
                  <Text style={styles.buyerInfoTitle}>Buyer</Text>
                </View>
                <Text style={styles.buyerInfoName}>{order.buyer.full_name}</Text>
                <Text style={styles.buyerInfoUsername}>@{order.buyer.username}</Text>
              </View>

              {/* Mark Transfer Button */}
              <TouchableOpacity
                style={[styles.markTransferButton, { backgroundColor: theme.primary }]}
                onPress={handleMarkTransferSent}
                disabled={markingTransfer || paymentLoading}
              >
                {markingTransfer ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={22} color="white" />
                    <Text style={styles.markTransferButtonText}>
                      I've Transferred the Ticket
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Seller Waiting Section - After marking transfer */}
          {transferSent && (
            <View style={styles.section}>
              <View style={styles.transferSentCard}>
                <Ionicons name="time" size={32} color="#8b5cf6" />
                <Text style={styles.transferSentTitle}>Transfer Sent</Text>
                <Text style={styles.transferSentText}>
                  You've marked the ticket as transferred. Waiting for {order.buyer.full_name} to confirm receipt.
                </Text>
                <Text style={styles.transferSentSubtext}>
                  Once they confirm, the payment will be released to your account.
                </Text>
              </View>
            </View>
          )}

          {/* Action Required Section - Only for buyers awaiting transfer */}
          {canConfirm && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Action Required
              </Text>

              {/* Instructions */}
              <View style={styles.instructionCard}>
                <View style={styles.instructionHeader}>
                  <Ionicons
                    name="information-circle"
                    size={24}
                    color="#3b82f6"
                  />
                  <Text style={styles.instructionTitle}>
                    Waiting for Your Ticket
                  </Text>
                </View>
                <Text style={styles.instructionText}>
                  The seller has been notified to transfer your ticket. Once you
                  receive the ticket in your email or ticketing app, come back
                  here and tap "Confirm Receipt" below.
                </Text>
              </View>

              {/* Warning */}
              <View style={styles.warningCard}>
                <View style={styles.warningHeader}>
                  <Ionicons name="warning" size={24} color="#dc2626" />
                  <Text style={styles.warningTitle}>Important Notice</Text>
                </View>
                <Text style={styles.warningText}>
                  You must confirm receipt once you receive your ticket. If the
                  seller provides proof that they sent the ticket and you fail
                  to confirm, you may be subject to a fine and the payment will
                  be released to the seller.
                </Text>
                <Text style={styles.warningSubtext}>
                  Only confirm after you have verified you can access the
                  ticket.
                </Text>
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  styles.confirmReceiptButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleConfirmReceipt}
                disabled={paymentLoading}
              >
                {paymentLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="white" />
                    <Text style={styles.confirmReceiptButtonText}>
                      I Received My Ticket - Confirm Receipt
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Completed Message */}
          {order.escrow_status === "completed" && (
            <View style={styles.section}>
              <View style={styles.completedCard}>
                <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                <Text style={styles.completedTitle}>Transaction Complete!</Text>
                <Text style={styles.completedText}>
                  {isBuyer
                    ? "You confirmed receipt of your ticket. The payment has been released to the seller. Enjoy the event!"
                    : "The buyer confirmed receipt. Payment has been sent to your account!"}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewTicketsButton}
                onPress={() =>
                  router.replace(
                    isSeller
                      ? "/(tabs)/tickets?tab=selling" as any
                      : "/(tabs)/tickets?tab=bought" as any
                  )
                }
              >
                <Ionicons name={isSeller ? "storefront-outline" : "ticket-outline"} size={20} color="#3b82f6" />
                <Text style={styles.viewTicketsButtonText}>
                  {isSeller ? "Back to My Listings" : "View My Tickets"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Navigation to Tickets */}
          {order.escrow_status !== "completed" && (
            <TouchableOpacity
              style={styles.viewTicketsButton}
              onPress={() =>
                router.replace(
                  isSeller
                    ? "/(tabs)/tickets?tab=selling" as any
                    : "/(tabs)/tickets?tab=bought" as any
                )
              }
            >
              <Ionicons name="arrow-back" size={20} color="#3b82f6" />
              <Text style={styles.viewTicketsButtonText}>
                {isSeller ? "Back to My Listings" : "Back to My Purchases"}
              </Text>
            </TouchableOpacity>
          )}
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
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#ef4444"
                />
                <Text style={styles.disputeButtonText}>Report Issue</Text>
              </TouchableOpacity>
            )}
            {/* {canConfirm && (
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
            )} */}
          </View>
        </BlurView>
      )}

      {/* Rating Modal - shown after buyer confirms receipt OR seller visits completed order */}
      {order && (
        <SellerRatingModal
          visible={ratingModalVisible}
          onClose={() => {
            setRatingModalVisible(false);
            // If dismissing a seller prompt, mark as dismissed
            if (pendingRatingPrompt) {
              supabase
                .from("rating_prompts")
                .update({ status: "dismissed" })
                .eq("id", pendingRatingPrompt.id);
              setPendingRatingPrompt(null);
            }
          }}
          onConfirmRating={handleSubmitRating}
          ticket={{
            id: order.ticket.id,
            title: order.ticket.title,
            seller_name: pendingRatingPrompt?.ratee_name || order.seller.full_name,
          }}
          isLoading={submittingRating}
          primaryColor={theme.primary}
          secondaryColor={theme.secondary}
          isSellerRatingBuyer={pendingRatingPrompt?.prompt_type === 'seller_rate_buyer'}
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
  // Action Required section styles
  instructionCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  instructionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e40af",
  },
  instructionText: {
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
  },
  warningCard: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#991b1b",
  },
  warningText: {
    fontSize: 14,
    color: "#991b1b",
    lineHeight: 20,
    marginBottom: 8,
  },
  warningSubtext: {
    fontSize: 13,
    color: "#b91c1c",
    fontStyle: "italic",
  },
  confirmReceiptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmReceiptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  completedCard: {
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  completedTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#065f46",
    marginTop: 12,
    marginBottom: 8,
  },
  completedText: {
    fontSize: 14,
    color: "#047857",
    textAlign: "center",
    lineHeight: 20,
  },
  viewTicketsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  viewTicketsButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3b82f6",
  },
  // Seller UI styles
  buyerInfoCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  buyerInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  buyerInfoTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10b981",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buyerInfoName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#065f46",
  },
  buyerInfoUsername: {
    fontSize: 14,
    color: "#047857",
    marginTop: 2,
  },
  markTransferButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  markTransferButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  transferSentCard: {
    alignItems: "center",
    backgroundColor: "#f5f3ff",
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#c4b5fd",
  },
  transferSentTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#5b21b6",
    marginTop: 12,
    marginBottom: 8,
  },
  transferSentText: {
    fontSize: 14,
    color: "#6d28d9",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  transferSentSubtext: {
    fontSize: 13,
    color: "#7c3aed",
    textAlign: "center",
    fontStyle: "italic",
  },
});
