// src/app/(tabs)/index.tsx - Fixed Browse Screen with College Theme
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { TicketCard } from "@/src/components/TicketCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { TicketService } from "@/src/services/ticketService";
import { TicketWithSeller } from "@/src/types/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { NotificationBadge } from "@/src/components/NotificationBadge";

const sports = [
  { name: "All Sports", icon: "grid-outline" },
  { name: "Football", icon: "american-football-outline" },
  { name: "Basketball", icon: "basketball-outline" },
  { name: "Hockey", icon: "golf-outline" },
  { name: "Soccer", icon: "football-outline" },
  { name: "Volleyball", icon: "tennisball-outline" },
  { name: "Baseball", icon: "baseball-outline" },
  { name: "Tennis", icon: "tennisball-outline" },
];

const sortOptions = [
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Date: Soonest", value: "event_date" },
  { label: "Recently Added", value: "created_at" },
];

export default function BrowseScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [sortBy, setSortBy] = useState<
    "price_asc" | "price_desc" | "event_date" | "created_at"
  >("event_date");
  const [showSortModal, setShowSortModal] = useState(false);
  const [showSeasonTicketsOnly, setShowSeasonTicketsOnly] = useState(false);
  const [tickets, setTickets] = useState<TicketWithSeller[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadTickets = async (reset = false) => {
    if (!user?.id || !profile?.college_id) {
      console.log("⚠️ User or college not loaded yet, skipping ticket load");
      return;
    }

    if (loading && !reset) return;

    setLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      const { data, error } = await TicketService.getTicketsForCollege({
        collegeId: profile.college_id,
        sport: selectedSport,
        searchQuery: searchQuery.trim() || undefined,
        sortBy,
        limit: 20,
        offset: currentOffset,
        excludeUserId: user.id,
        onlySeasonTickets: showSeasonTicketsOnly,
      });

      if (error) {
        console.error("Error loading tickets:", error);
        Alert.alert("Error", "Failed to load tickets. Please try again.");
        return;
      }

      // Process tickets with college context
      const processedData = data.map((ticket) => {
        // The collegeMatchup and isFromUserCollege are already added by the service
        return {
          ...ticket,
          // These properties are already included by the service, but ensuring they exist
          collegeMatchup: ticket.collegeMatchup || getCollegeMatchup(ticket),
          isFromUserCollege:
            ticket.isFromUserCollege ||
            ticket.home_college?.id === profile.college_id ||
            ticket.away_college?.id === profile.college_id,
        };
      });

      if (reset) {
        setTickets(processedData);
        setOffset(processedData.length);
      } else {
        setTickets((prev) => [...prev, ...processedData]);
        setOffset((prev) => prev + processedData.length);
      }

      setHasMore(data.length === 20);
    } catch (error) {
      console.error("Error loading tickets:", error);
      Alert.alert("Error", "Failed to load tickets. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCollegeMatchup = (ticket: TicketWithSeller) => {
    if (ticket.home_college && ticket.away_college) {
      return `${ticket.home_college.short_name} vs ${ticket.away_college.short_name}`;
    }
    return (
      ticket.home_college?.short_name || ticket.away_college?.short_name || null
    );
  };

  // Load tickets on mount and when filters change
  useEffect(() => {
    if (user?.id && profile?.college_id) {
      loadTickets(true);
    }
  }, [
    selectedSport,
    sortBy,
    user?.id,
    profile?.college_id,
    showSeasonTicketsOnly,
  ]);

  // Search with debounce
  useEffect(() => {
    if (user?.id && profile?.college_id) {
      const timeoutId = setTimeout(() => {
        loadTickets(true);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, user?.id, profile?.college_id]);

  const onRefresh = useCallback(() => {
    if (user?.id && profile?.college_id) {
      setRefreshing(true);
      loadTickets(true);
    }
  }, [
    selectedSport,
    sortBy,
    searchQuery,
    user?.id,
    profile?.college_id,
    showSeasonTicketsOnly,
  ]);

  const loadMore = () => {
    if (hasMore && !loading && user?.id && profile?.college_id) {
      loadTickets(false);
    }
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

  const handleTicketPress = (ticket: TicketWithSeller) => {
    router.push(`/ticket-details/${ticket.id}`);
  };

  const SportFilterCard = ({
    sport,
    icon,
  }: {
    sport: string;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.sportFilterCard,
        selectedSport === sport && {
          backgroundColor: theme.primary,
          borderColor: theme.secondary,
        },
      ]}
      onPress={() => setSelectedSport(sport)}
    >
      <View
        style={[
          styles.sportFilterIconContainer,
          selectedSport === sport && {
            backgroundColor: `${theme.secondary}30`,
          },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={selectedSport === sport ? theme.secondary : theme.primary}
        />
      </View>
      <Text
        style={[
          styles.sportFilterText,
          selectedSport === sport && { color: "white" },
        ]}
      >
        {sport}
      </Text>
    </TouchableOpacity>
  );

  const formatTicketForCard = (ticket: TicketWithSeller) => {
    const eventDate = new Date(ticket.event_date);
    const dateStr = eventDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = eventDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return {
      id: ticket.id,
      sport: getSportFromTitle(ticket.title),
      event: ticket.title,
      date: `${dateStr} • ${timeStr}`,
      price: ticket.price,
      section: ticket.section || "N/A",
      row: ticket.row_number || "N/A",
      seat: ticket.seat_number || "N/A",
      location: ticket.location,
      seller: ticket.seller,
      isSeasonTicket: ticket.is_season_ticket,
      collegeMatchup: ticket.collegeMatchup,
    };
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

  const renderTicket = ({ item }: { item: TicketWithSeller }) => {
    const formattedTicket = formatTicketForCard(item);

    return (
      <View style={styles.ticketCardContainer}>
        <EnhancedTicketCard
          sport={formattedTicket.sport}
          event={formattedTicket.event}
          date={formattedTicket.date}
          price={formattedTicket.price}
          section={item.section || "N/A"}
          row={item.row_number || "N/A"}
          seat={item.seat_number || "N/A"}
          onPress={() => handleTicketPress(item)}
          isSeasonTicket={item.is_season_ticket}
          collegeMatchup={formattedTicket.collegeMatchup}
        />
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={styles.footerLoaderText}>Loading more tickets...</Text>
      </View>
    );
  };

  // Show loading or error state if user/profile not ready
  if (!user || !profile?.college_id) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.secondary} />
          <Text style={styles.loadingText}>
            Loading your college information...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Floating elements */}
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => router.push("/notifications" as any)}
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
              <Ionicons name="search-outline" size={32} color={theme.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>Browse Tickets</Text>
          <Text style={styles.headerSubtitle}>
            Find tickets for {profile.college?.name || "your college"} events
          </Text>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View
              style={[
                styles.searchWrapper,
                { borderColor: `${theme.primary}30` },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color="#9ca3af"
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search events, teams, or sports..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#9ca3af"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery("")}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Filter and Sort Row */}
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.primary }]}>
              Filter by Sport
            </Text>
            <View style={styles.filterButtons}>
              <TouchableOpacity
                style={[
                  styles.seasonFilter,
                  { borderColor: `${theme.primary}30` },
                  showSeasonTicketsOnly && {
                    backgroundColor: theme.primary,
                    borderColor: theme.primary,
                  },
                ]}
                onPress={() => setShowSeasonTicketsOnly(!showSeasonTicketsOnly)}
              >
                <Ionicons
                  name="ticket"
                  size={16}
                  color={showSeasonTicketsOnly ? "white" : theme.primary}
                />
                <Text
                  style={[
                    styles.seasonFilterText,
                    { color: theme.primary },
                    showSeasonTicketsOnly && { color: "white" },
                  ]}
                >
                  Season Only
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.sortButton,
                  { borderColor: `${theme.primary}30` },
                ]}
                onPress={() => setShowSortModal(true)}
              >
                <Ionicons
                  name="funnel-outline"
                  size={16}
                  color={theme.primary}
                />
                <Text style={[styles.sortButtonText, { color: theme.primary }]}>
                  Sort
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sport Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sportFiltersContainer}
            contentContainerStyle={styles.sportFiltersContent}
          >
            {sports.map((sport) => (
              <SportFilterCard
                key={sport.name}
                sport={sport.name}
                icon={sport.icon}
              />
            ))}
          </ScrollView>

          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsCount, { color: theme.primary }]}>
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""} found
              {hasMore && !loading && " (scroll for more)"}
            </Text>
            <Text style={styles.currentSort}>
              Sorted by:{" "}
              {sortOptions.find((opt) => opt.value === sortBy)?.label}
            </Text>
          </View>
        </View>

        {/* Tickets List */}
        <View style={styles.ticketsSection}>
          {tickets.length > 0 ? (
            <FlatList
              data={tickets}
              renderItem={renderTicket}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              onEndReached={loadMore}
              onEndReachedThreshold={0.5}
              ListFooterComponent={renderFooter}
            />
          ) : (
            <BlurView intensity={20} style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color="#6b7280" />
              </View>
              <Text style={styles.emptyStateTitle}>
                {loading ? "Loading tickets..." : "No tickets found"}
              </Text>
              {!loading && (
                <>
                  <Text style={styles.emptyStateText}>
                    Try adjusting your filters or search terms to find more
                    tickets
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.clearFiltersButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={() => {
                      setSearchQuery("");
                      setSelectedSport("All Sports");
                      setShowSeasonTicketsOnly(false);
                    }}
                  >
                    <Text style={styles.clearFiltersText}>Clear Filters</Text>
                  </TouchableOpacity>
                </>
              )}
            </BlurView>
          )}
        </View>
      </ScrollView>

      {/* Sort Modal */}
      {showSortModal && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} style={styles.modalBlur}>
            <View style={styles.sortModal}>
              <View style={styles.sortModalHeader}>
                <Text style={[styles.sortModalTitle, { color: theme.primary }]}>
                  Sort by
                </Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && {
                      backgroundColor: `${theme.primary}15`,
                    },
                  ]}
                  onPress={() => {
                    setSortBy(option.value as any);
                    setShowSortModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && {
                        fontWeight: "600",
                        color: theme.primary,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </BlurView>
        </View>
      )}
    </View>
  );
}

// Enhanced TicketCard component that includes season ticket and college info
const EnhancedTicketCard = ({
  sport,
  event,
  date,
  price,
  section,
  row,
  seat,
  onPress,
  isSeasonTicket,
  collegeMatchup,
}: {
  sport: string;
  event: string;
  date: string;
  price: number;
  section: string;
  row: string;
  seat: string;
  onPress?: () => void;
  isSeasonTicket?: boolean;
  collegeMatchup?: string | null;
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={styles.enhancedTicketCard}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header with badges */}
      <View style={styles.ticketHeader}>
        <View style={styles.leftBadges}>
          <View style={[styles.sportBadge, { backgroundColor: theme.primary }]}>
            <Text style={styles.sportBadgeText}>{sport}</Text>
          </View>
          {isSeasonTicket && (
            <View
              style={[styles.seasonBadge, { backgroundColor: theme.secondary }]}
            >
              <Text style={styles.seasonBadgeText}>SEASON</Text>
            </View>
          )}
        </View>
        {collegeMatchup && (
          <View
            style={[
              styles.collegeBadge,
              {
                backgroundColor: `${theme.primary}15`,
                borderColor: `${theme.primary}40`,
              },
            ]}
          >
            <Ionicons name="shield-outline" size={12} color={theme.primary} />
            <Text style={[styles.collegeBadgeText, { color: theme.primary }]}>
              {collegeMatchup}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.ticketContent}>
        <Text style={styles.eventText} numberOfLines={2}>
          {event}
        </Text>
        <Text style={styles.dateText}>{date}</Text>
        <View style={styles.detailsRow}>
          <Text style={styles.locationText}>
            Section {section} • Row {row} • Seat {seat}
          </Text>
          <View
            style={[styles.priceContainer, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.priceText}>${price.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

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
  searchSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchContainer: {
    marginBottom: 24,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
  },
  clearButton: {
    padding: 4,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  seasonFilter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
  },
  seasonFilterText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  sportFiltersContainer: {
    marginBottom: 20,
  },
  sportFiltersContent: {
    paddingRight: 20,
    gap: 12,
  },
  sportFilterCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minWidth: 90,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  sportFilterIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  sportFilterText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    color: "#18453b",
  },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  currentSort: {
    fontSize: 12,
    color: "#6b7280",
  },
  ticketsSection: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  ticketCardContainer: {
    marginBottom: 16,
  },
  // Enhanced Ticket Card Styles
  enhancedTicketCard: {
    backgroundColor: "white",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    overflow: "hidden",
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 8,
  },
  leftBadges: {
    flexDirection: "row",
    gap: 8,
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sportBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  seasonBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  collegeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  collegeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ticketContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  eventText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    lineHeight: 24,
  },
  dateText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
    fontWeight: "500",
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
    marginRight: 12,
  },
  priceContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
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
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  clearFiltersButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearFiltersText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  footerLoader: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sortModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 320,
  },
  sortModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sortModalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  sortOptionText: {
    fontSize: 16,
    color: "#374151",
  },
});
