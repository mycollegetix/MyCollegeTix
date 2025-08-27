// app/ticket-details/[id].tsx - Enhanced with theme support and Watchlist
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
import { useChat } from "@/src/providers/ChatProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import WatchlistButton from "@/src/components/WatchlistButton";
import { TicketTransferButton } from "@/src/components/TicketTransferButton";
import { formatEventDateSeparate } from "@/src/utils/dateUtils";

const { width, height } = Dimensions.get("window");

export default function TicketDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { getOrCreateConversation } = useChat();
  const theme = useTheme();

  const [ticket, setTicket] = useState<TicketWithSeller | null>(null);
  const [loading, setLoading] = useState(true);

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
        (router.push as any)(`/(tabs)/chat/${conversationId}`);
      } else {
        throw new Error("Failed to create conversation - no ID returned");
      }
    } catch (error) {
      console.error("❌ Error starting conversation:", error);
      Alert.alert("Error", "Unable to start conversation. Please try again.");
    }
  };

  // Use shared utility function for consistent date/time formatting
  const formatEventDate = (dateString: string, gameTime?: string | null) => {
    return formatEventDateSeparate(dateString, gameTime, 'long');
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
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
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
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
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
  const { dateStr, timeStr } = formatEventDate(ticket.event_date, ticket.event?.game_time);
  const isOwnTicket = user?.id === ticket.seller.id;
  const isAvailable = ticket.status === "available";

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
            <View
              style={[
                styles.sportBadge,
                { backgroundColor: `${theme.primary}1A` },
              ]}
            >
              <Ionicons
                name={getSportIcon(sport) as any}
                size={16}
                color={theme.primary}
              />
              <Text style={[styles.sportBadgeText, { color: theme.primary }]}>
                {sport}
              </Text>
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
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.primary}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Date & Time</Text>
                <Text style={styles.detailValue}>{dateStr}</Text>
                <Text style={styles.detailSubValue}>{timeStr}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={20}
                color={theme.primary}
              />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Venue</Text>
                <Text style={styles.detailValue}>{ticket.location}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="ticket-outline" size={20} color={theme.primary} />
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Seat Location</Text>
                <Text style={styles.detailValue}>
                  Section {ticket.section}, Row {ticket.row_number}, Seat{" "}
                  {ticket.seat_number}
                </Text>
              </View>
            </View>
          </View>

          {/* Is Season Ticket */}
          {ticket.is_season_ticket && (
            <View style={styles.seasonTicketSection}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Season Ticket
              </Text>
              <Text style={styles.seasonTicketText}>
                This is a season ticket. Additional details may apply.
              </Text>
            </View>
          )}

          {/* Description */}
          <View style={styles.descriptionSection}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Description
            </Text>
            <Text style={styles.descriptionText}>
              {ticket.description || "No description provided"}
            </Text>
          </View>

          {/* Watchlist Section - Only show for other users' tickets */}
          {!isOwnTicket && (
            <View style={styles.watchlistSection}>
              <WatchlistButton
                ticketId={ticket.id}
                ticketTitle={ticket.title}
                currentPrice={ticket.price}
                style={styles.fullWidthWatchlistButton}
                size="medium"
                showText={true}
              />
            </View>
          )}

          {/* Seller Info */}
          {ticket.seller && (
            <View style={styles.sellerSection}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Seller Information
              </Text>
              <View style={styles.sellerCard}>
                <View
                  style={[
                    styles.sellerAvatar,
                    { backgroundColor: theme.primary },
                  ]}
                >
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
                    style={[
                      styles.contactButton,
                      { borderColor: theme.primary },
                    ]}
                    onPress={handleContactSeller}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color={theme.primary}
                    />
                    <Text
                      style={[
                        styles.contactButtonText,
                        { color: theme.primary },
                      ]}
                    >
                      Message
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Transfer Portal Section - Only show for own available tickets */}
          {isOwnTicket && ticket.status === 'available' && (ticket.home_college_id || ticket.away_college_id) && (
            <View style={styles.transferSection}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Ticket Transfer Portal
              </Text>
              <View style={styles.transferCard}>
                <View style={styles.transferInfo}>
                  <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
                  <View style={styles.transferText}>
                    <Text style={styles.transferTitle}>
                      Official Transfer Portal
                    </Text>
                    <Text style={styles.transferDescription}>
                      Use your college's official portal to securely transfer this ticket to a buyer
                    </Text>
                  </View>
                </View>
                <TicketTransferButton
                  collegeId={ticket.home_college_id || ticket.away_college_id}
                  ticketInfo={{
                    title: ticket.title,
                    eventDate: formatEventDateSeparate(ticket.event_date).fullDateTime,
                    section: ticket.section,
                    row: ticket.row_number,
                    seat: ticket.seat_number,
                  }}
                  variant="secondary"
                  size="medium"
                  style={styles.transferButton}
                />
              </View>
            </View>
          )}

          {/* Price Section */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Ticket Price</Text>
              <Text style={[styles.priceValue, { color: theme.primary }]}>
                ${ticket.price.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Buttons */}
      {!isOwnTicket && isAvailable && (
        <BlurView intensity={90} style={styles.bottomBar}>
          <View style={styles.actionButtonsContainer}>
            {/* Message Seller Button */}
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleContactSeller}
            >
              <View
                style={[
                  styles.messageButtonGradient,
                  {
                    backgroundColor: theme.primary,
                  },
                ]}
              >
                <View style={styles.messageButtonContent}>
                  <Ionicons name="chatbubble-outline" size={20} color="white" />
                  <Text style={styles.messageButtonText}>
                    Message About Ticket
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </BlurView>
      )}

      {/* Alternative: Only show watchlist when ticket is not available for purchase */}
      {!isOwnTicket && !isAvailable && (
        <BlurView intensity={90} style={styles.bottomBar}>
          <WatchlistButton
            ticketId={ticket.id}
            ticketTitle={ticket.title}
            currentPrice={ticket.price}
            style={styles.fullWidthBottomButton}
            size="large"
            showText={true}
          />
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: "600",
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
  seasonTicketSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  seasonTicketText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  descriptionText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  // Watchlist Styles
  watchlistSection: {
    marginBottom: 32,
  },
  fullWidthWatchlistButton: {
    borderRadius: 16,
    height: 56,
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
  },
  contactButtonText: {
    fontSize: 14,
    fontWeight: "600",
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
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
  },
  // Action Buttons Container
  actionButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  watchlistQuickButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  messageButton: {
    flex: 1,
    borderRadius: 16,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  messageButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  messageButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  messageButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  // Full width bottom button (for non-available tickets)
  fullWidthBottomButton: {
    borderRadius: 16,
    height: 56,
  },
  // Transfer Portal Styles
  transferSection: {
    marginBottom: 32,
  },
  transferCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  transferInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  transferText: {
    flex: 1,
  },
  transferTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0c4a6e",
    marginBottom: 4,
  },
  transferDescription: {
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
  },
  transferButton: {
    alignSelf: "stretch",
  },
});
