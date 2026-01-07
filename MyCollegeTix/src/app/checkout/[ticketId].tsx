// src/app/checkout/[ticketId].tsx
// Checkout screen for purchasing tickets with Stripe
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useStripePayment, CheckoutDetails } from "@/src/hooks/useStripePayment";
import { TicketService } from "@/src/services/ticketService";
import { TicketWithSeller } from "@/src/types/database.types";
import { formatEventDateSeparate } from "@/src/utils/dateUtils";

export default function CheckoutScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { initializePayment, completePayment, isLoading, error, clearError } = useStripePayment();

  const [ticket, setTicket] = useState<TicketWithSeller | null>(null);
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutDetails | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    if (ticketId) {
      loadTicket();
    }
  }, [ticketId]);

  const loadTicket = async () => {
    if (!ticketId) return;

    setLoadingTicket(true);
    try {
      const { data, error: ticketError } = await TicketService.getTicketById(ticketId);

      if (ticketError || !data) {
        Alert.alert("Error", "Ticket not found");
        router.back();
        return;
      }

      if (data.status !== "available") {
        Alert.alert("Unavailable", "This ticket is no longer available for purchase");
        router.back();
        return;
      }

      if (data.seller_id === user?.id) {
        Alert.alert("Error", "You cannot purchase your own ticket");
        router.back();
        return;
      }

      setTicket(data);
    } catch (err) {
      console.error("Error loading ticket:", err);
      Alert.alert("Error", "Failed to load ticket details");
      router.back();
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleInitiateCheckout = async () => {
    if (!ticketId) return;

    clearError();
    const details = await initializePayment(ticketId);

    if (details) {
      setCheckoutDetails(details);
    } else if (error) {
      Alert.alert("Error", error);
    }
  };

  const handleCompletePurchase = async () => {
    setProcessingPayment(true);

    // Initialize payment if not already done
    let details = checkoutDetails;
    if (!details) {
      clearError();
      details = await initializePayment(ticketId!);

      if (!details) {
        setProcessingPayment(false);
        Alert.alert("Error", error || "Failed to initialize payment");
        return;
      }
      setCheckoutDetails(details);
    }

    // Immediately show the payment sheet
    const result = await completePayment();
    setProcessingPayment(false);

    if (result.success) {
      Alert.alert(
        "Purchase Successful!",
        "Your payment is being processed. The seller will be notified to transfer the ticket to you.",
        [
          {
            text: "View Order",
            onPress: () => router.replace(`/orders/${details!.orderId}` as any),
          },
        ]
      );
    } else if (result.error && result.error !== "Payment was cancelled") {
      Alert.alert("Payment Failed", result.error);
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loadingTicket) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading checkout...</Text>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return null;
  }

  const { dateStr, timeStr } = formatEventDateSeparate(
    ticket.event_date,
    ticket.event?.game_time,
    "long"
  );

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
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentCard}>
          {/* Ticket Summary */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Ticket Details
            </Text>
            <View style={styles.ticketSummary}>
              <Text style={styles.ticketTitle}>{ticket.title}</Text>
              <View style={styles.ticketDetail}>
                <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>{dateStr} at {timeStr}</Text>
              </View>
              <View style={styles.ticketDetail}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>{ticket.location}</Text>
              </View>
              <View style={styles.ticketDetail}>
                <Ionicons name="ticket-outline" size={16} color="#6b7280" />
                <Text style={styles.ticketDetailText}>
                  Section {ticket.section}, Row {ticket.row_number}, Seat {ticket.seat_number}
                </Text>
              </View>
            </View>
          </View>

          {/* Escrow Protection Info */}
          <View style={styles.section}>
            <View style={styles.escrowCard}>
              <View style={styles.escrowHeader}>
                <Ionicons name="shield-checkmark" size={24} color="#10b981" />
                <Text style={styles.escrowTitle}>Buyer Protection</Text>
              </View>
              <Text style={styles.escrowDescription}>
                Your payment is held securely until you confirm receipt of the ticket.
                If something goes wrong, you can file a dispute for a full refund.
              </Text>
              <View style={styles.escrowSteps}>
                <View style={styles.escrowStep}>
                  <View style={[styles.escrowStepNumber, { backgroundColor: theme.primary }]}>
                    <Text style={styles.escrowStepNumberText}>1</Text>
                  </View>
                  <Text style={styles.escrowStepText}>Pay securely</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
                <View style={styles.escrowStep}>
                  <View style={[styles.escrowStepNumber, { backgroundColor: theme.primary }]}>
                    <Text style={styles.escrowStepNumberText}>2</Text>
                  </View>
                  <Text style={styles.escrowStepText}>Receive ticket</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
                <View style={styles.escrowStep}>
                  <View style={[styles.escrowStepNumber, { backgroundColor: theme.primary }]}>
                    <Text style={styles.escrowStepNumberText}>3</Text>
                  </View>
                  <Text style={styles.escrowStepText}>Confirm & release</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transfer Window */}
          {checkoutDetails && (
            <View style={styles.section}>
              <View style={styles.deadlineCard}>
                <Ionicons name="time-outline" size={20} color="#f59e0b" />
                <View style={styles.deadlineContent}>
                  <Text style={styles.deadlineLabel}>Transfer Deadline</Text>
                  <Text style={styles.deadlineValue}>
                    {formatDeadline(checkoutDetails.transferDeadline)}
                  </Text>
                  <Text style={styles.deadlineNote}>
                    Seller must transfer the ticket by this time, or you can request a refund.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Seller Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Seller
            </Text>
            <View style={styles.sellerCard}>
              <View style={[styles.sellerAvatar, { backgroundColor: theme.primary }]}>
                <Text style={styles.sellerInitials}>
                  {ticket.seller.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{ticket.seller.full_name}</Text>
                <Text style={styles.sellerUsername}>@{ticket.seller.username}</Text>
              </View>
            </View>
          </View>

          {/* Price Summary */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Payment Summary
            </Text>
            <View style={styles.priceSummary}>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Ticket Price</Text>
                <Text style={styles.priceValue}>${ticket.price.toFixed(2)}</Text>
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Service Fee</Text>
                <Text style={styles.priceValue}>$0.00</Text>
              </View>
              <View style={styles.priceDivider} />
              <View style={styles.priceRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={[styles.totalValue, { color: theme.primary }]}>
                  ${ticket.price.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          {/* Terms Notice */}
          <View style={styles.termsNotice}>
            <Text style={styles.termsText}>
              By completing this purchase, you agree to our Terms of Service and
              Buyer Protection Policy.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <BlurView intensity={90} style={styles.bottomBar}>
        <View style={styles.bottomContent}>
          <View style={styles.bottomPrice}>
            <Text style={styles.bottomPriceLabel}>Total</Text>
            <Text style={[styles.bottomPriceValue, { color: theme.primary }]}>
              ${ticket.price.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              { backgroundColor: theme.primary },
              (isLoading || processingPayment) && styles.purchaseButtonDisabled,
            ]}
            onPress={handleCompletePurchase}
            disabled={isLoading || processingPayment}
          >
            {isLoading || processingPayment ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={18} color="white" />
                <Text style={styles.purchaseButtonText}>
                  {checkoutDetails ? "Pay Now" : "Continue to Payment"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </BlurView>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  ticketSummary: {
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
  escrowCard: {
    backgroundColor: "#ecfdf5",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  escrowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065f46",
  },
  escrowDescription: {
    fontSize: 14,
    color: "#047857",
    lineHeight: 20,
    marginBottom: 16,
  },
  escrowSteps: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  escrowStep: {
    alignItems: "center",
    gap: 4,
  },
  escrowStepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  escrowStepNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  escrowStepText: {
    fontSize: 11,
    color: "#065f46",
    fontWeight: "500",
  },
  deadlineCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#fde68a",
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
    marginBottom: 4,
  },
  deadlineNote: {
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  sellerInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  sellerUsername: {
    fontSize: 14,
    color: "#6b7280",
  },
  priceSummary: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 15,
    color: "#6b7280",
  },
  priceValue: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "500",
  },
  priceDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  termsNotice: {
    paddingTop: 16,
  },
  termsText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
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
  bottomContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomPrice: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  bottomPriceValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 180,
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
});
