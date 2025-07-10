// app/ticket-details/[id].tsx - FIXED Hook Usage
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { TicketService } from "@/src/services/ticketService";
import { TicketWithSeller } from "@/src/types/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { useChat } from "@/src/providers/ChatProvider"; // ✅ MOVED TO TOP LEVEL

const { width, height } = Dimensions.get("window");

export default function TicketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { getOrCreateConversation } = useChat(); // ✅ CALLED AT TOP LEVEL

  const [ticket, setTicket] = useState<TicketWithSeller | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicket();
    }
  }, [id]);

  const loadTicket = async () => {
    if (!id) return;

    setLoading(true);
    try {
      const { data, error } = await TicketService.getTicketById(id);

      if (error) {
        console.error("Error loading ticket:", error);
        Alert.alert(
          "Error",
          "Failed to load ticket details. Please try again."
        );
        router.back();
        return;
      }

      setTicket(data);
    } catch (error) {
      console.error("Error loading ticket:", error);
      Alert.alert("Error", "Failed to load ticket details. Please try again.");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!ticket || !user) return;

    if (ticket.seller.id === user.id) {
      Alert.alert("Error", "You cannot purchase your own ticket.");
      return;
    }

    Alert.alert(
      "Confirm Purchase",
      `Are you sure you want to purchase this ticket for $${ticket.price.toFixed(
        2
      )}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Purchase",
          onPress: async () => {
            setPurchasing(true);
            try {
              const { data, error } = await TicketService.purchaseTicket(
                ticket.id
              );

              if (error) {
                throw error;
              }

              Alert.alert(
                "Purchase Successful!",
                "Congratulations! You have successfully purchased this ticket. You can find it in your orders.",
                [
                  {
                    text: "View My Orders",
                    onPress: () => (router.push as any)("/(tabs)/orders"),
                  },
                  {
                    text: "OK",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error: any) {
              console.error("Error purchasing ticket:", error);

              let errorMessage = "Failed to purchase ticket. Please try again.";
              if (error.message?.includes("not available")) {
                errorMessage = "Sorry, this ticket is no longer available.";
              } else if (error.message?.includes("not found")) {
                errorMessage = "This ticket listing could not be found.";
              }

              Alert.alert("Purchase Failed", errorMessage);
            } finally {
              setPurchasing(false);
            }
          },
        },
      ]
    );
  };

  const handleContactSeller = async () => {
    if (!ticket || !user) {
      console.error("❌ Missing ticket or user data");
      Alert.alert("Error", "Unable to start conversation - missing data");
      return;
    }

    if (ticket.seller.id === user.id) {
      Alert.alert("Info", "This is your own ticket listing.");
      return;
    }

    console.log("🗨️ Starting conversation with seller...");
    console.log("🔍 Current user:", user.id);
    console.log("🔍 Seller ID:", ticket.seller.id);
    console.log("🔍 Ticket ID:", ticket.id);

    try {
      console.log("🔄 Calling getOrCreateConversation...");
      const conversationId = await getOrCreateConversation(
        ticket.seller.id,
        ticket.id
      );

      console.log("🔍 Conversation result:", conversationId);

      if (conversationId) {
        console.log("✅ Conversation created/found:", conversationId);
        // ✅ UPDATED: Navigate to chat tab first, then to specific conversation
        (router.push as any)(`/(tabs)/chat/${conversationId}`);
      } else {
        throw new Error("Failed to create conversation - no ID returned");
      }
    } catch (error) {
      console.error("❌ Error starting conversation:", error);
      Alert.alert("Error", "Unable to start conversation. Please try again.");
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return { dateStr, timeStr };
  };

  const getSportFromTitle = (title: string): string => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes("football")) return "Football";
    if (lowerTitle.includes("basketball")) return "Basketball";
    if (lowerTitle.includes("hockey")) return "Hockey";
    if (lowerTitle.includes("soccer")) return "Soccer";
    if (lowerTitle.includes("volleyball")) return "Volleyball";
    return "Sports";
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

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#18453b", "#2a6b5a", "#0f2f28"]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      </View>
    );
  }

  if (!ticket || !ticket.seller) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#18453b", "#2a6b5a", "#0f2f28"]}
          style={styles.background}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="white" />
          <Text style={styles.errorText}>Ticket not found</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const sport = getSportFromTitle(ticket.title);
  const { dateStr, timeStr } = formatEventDate(ticket.event_date);
  const isOwnTicket = user?.id === ticket.seller.id;
  const isAvailable = ticket.status === "available";

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
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
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Content Card */}
        <View style={styles.contentCard}>
          {/* Sport Badge */}
          <View style={styles.sportBadgeContainer}>
            <View style={styles.sportBadge}>
              <Ionicons
                name={getSportIcon(sport) as any}
                size={16}
                color="#18453b"
              />
              <Text style={styles.sportBadgeText}>{sport}</Text>
            </View>

            {/* Status Badge */}
            <View
              style={[
                styles.statusBadge,
                ticket.status === "available"
                  ? styles.availableBadge
                  : ticket.status === "sold"
                  ? styles.soldBadge
                  : styles.cancelledBadge,
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Event Title */}
          <Text style={styles.eventTitle}>{ticket.title}</Text>

          {/* Event Details */}
          <View style={styles.eventDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color="#18453b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>{dateStr}</Text>
                <Text style={styles.detailSubValue}>{timeStr}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color="#18453b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Venue</Text>
                <Text style={styles.detailValue}>{ticket.location}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="ticket-outline" size={20} color="#18453b" />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Seat Location</Text>
                <Text style={styles.detailValue}>
                  Section {ticket.section}, Row {ticket.row_number}, Seat{" "}
                  {ticket.seat_number}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>
              {ticket.description || "No description provided"}
            </Text>
          </View>

          {/* Seller Info */}
          {ticket.seller && (
            <View style={styles.sellerSection}>
              <Text style={styles.sectionTitle}>Seller Information</Text>
              <View style={styles.sellerCard}>
                <View style={styles.sellerAvatar}>
                  <Text style={styles.sellerInitials}>
                    {ticket.seller.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.sellerInfo}>
                  <Text style={styles.sellerName}>
                    {ticket.seller.full_name}
                  </Text>
                  <Text style={styles.sellerUsername}>
                    @{ticket.seller.username}
                  </Text>
                </View>
                {!isOwnTicket && (
                  <TouchableOpacity
                    style={styles.contactButton}
                    onPress={handleContactSeller} // ✅ Now properly uses the hook
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="#18453b"
                    />
                    <Text style={styles.contactButtonText}>Message</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Ticket Price</Text>
              <Text style={styles.priceValue}>${ticket.price.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      {!isOwnTicket && isAvailable && (
        <BlurView intensity={90} style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              purchasing && styles.purchaseButtonDisabled,
            ]}
            onPress={handlePurchase}
            disabled={purchasing}
          >
            <LinearGradient
              colors={
                purchasing ? ["#9ca3af", "#6b7280"] : ["#18453b", "#2a6b5a"]
              }
              style={styles.purchaseButtonGradient}
            >
              {purchasing ? (
                <View style={styles.purchaseButtonContent}>
                  <Text style={styles.purchaseButtonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.purchaseButtonContent}>
                  <Ionicons name="card-outline" size={20} color="white" />
                  <Text style={styles.purchaseButtonText}>
                    Purchase for ${ticket.price.toFixed(2)}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </BlurView>
      )}
    </View>
  );
}

// Your existing styles remain the same
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
  },
  loadingText: {
    fontSize: 16,
    color: "white",
    fontStyle: "italic",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 18,
    color: "white",
    marginTop: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
    minHeight: height * 0.8,
  },
  sportBadgeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sportBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#18453b",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  availableBadge: {
    backgroundColor: "#10b981",
  },
  soldBadge: {
    backgroundColor: "#ef4444",
  },
  cancelledBadge: {
    backgroundColor: "#6b7280",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 24,
    lineHeight: 34,
  },
  eventDetails: {
    gap: 20,
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  detailSubValue: {
    fontSize: 14,
    color: "#6b7280",
  },
  descriptionSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  sellerSection: {
    marginBottom: 32,
  },
  sellerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#18453b",
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
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 2,
  },
  sellerUsername: {
    fontSize: 14,
    color: "#6b7280",
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#18453b",
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
  },
  priceSection: {
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  priceContainer: {
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 36,
    fontWeight: "800",
    color: "#18453b",
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
  },
  purchaseButton: {
    borderRadius: 16,
    shadowColor: "#18453b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  purchaseButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  purchaseButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  purchaseButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
