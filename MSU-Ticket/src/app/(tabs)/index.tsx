// src/app/(tabs)/index.tsx - Complete Updated Browse Screen
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { TicketCard } from "@/src/components/TicketCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { TicketService } from "@/src/services/ticketService";
import { TicketWithSeller } from "@/src/types/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { NotificationBadge } from "@/src/components/NotificationBadge";

const { width, height } = Dimensions.get("window");

const sports = [
  { name: "All Sports", icon: "grid-outline" },
  { name: "Football", icon: "american-football-outline" },
  { name: "Basketball", icon: "basketball-outline" },
  { name: "Hockey", icon: "golf-outline" },
  { name: "Soccer", icon: "football-outline" },
  { name: "Volleyball", icon: "tennisball-outline" },
];

const sortOptions = [
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Date: Soonest", value: "event_date" },
  { label: "Recently Added", value: "created_at" },
];

export default function BrowseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [sortBy, setSortBy] = useState<
    "price_asc" | "price_desc" | "event_date" | "created_at"
  >("event_date");
  const [showSortModal, setShowSortModal] = useState(false);
  const [tickets, setTickets] = useState<TicketWithSeller[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadTickets = async (reset = false) => {
    if (loading && !reset) return;

    setLoading(true);
    const currentOffset = reset ? 0 : offset;

    try {
      const { data, error } = await TicketService.getTickets({
        sport: selectedSport,
        searchQuery: searchQuery.trim() || undefined,
        sortBy,
        limit: 20,
        offset: currentOffset,
        excludeUserId: user?.id,
      });
      if (!user) {
        console.log("⚠️ User not loaded yet, skipping ticket load");
        setLoading(false);
        return;
      }

      if (error) {
        console.error("Error loading tickets:", error);
        Alert.alert("Error", "Failed to load tickets. Please try again.");
        return;
      }
      // FRONTEND FILTER - Remove tickets from current user
      const filteredData = data.filter(
        (ticket) => ticket.seller_id !== user.id
      );

      if (reset) {
        setTickets(data);
        setOffset(data.length);
      } else {
        setTickets((prev) => [...prev, ...data]);
        setOffset((prev) => prev + data.length);
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

  // Load tickets on mount and when filters change
  useEffect(() => {
    if (user?.id) {
      // Only load when user is authenticated
      loadTickets(true);
    }
  }, [selectedSport, sortBy, user?.id]);

  // Search with debounce
  useEffect(() => {
    if (user?.id) {
      // Only search when user is authenticated
      const timeoutId = setTimeout(() => {
        loadTickets(true);
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, user?.id]);

  const onRefresh = useCallback(() => {
    if (user?.id) {
      // Only refresh when user is authenticated
      setRefreshing(true);
      loadTickets(true);
    }
  }, [selectedSport, sortBy, searchQuery, user?.id]);

  const loadMore = () => {
    if (hasMore && !loading) {
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
        selectedSport === sport && styles.sportFilterCardSelected,
      ]}
      onPress={() => setSelectedSport(sport)}
    >
      <View
        style={[
          styles.sportFilterIconContainer,
          selectedSport === sport && styles.sportFilterIconSelected,
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={selectedSport === sport ? "#ffd700" : "#18453b"}
        />
      </View>
      <Text
        style={[
          styles.sportFilterText,
          selectedSport === sport && styles.sportFilterTextSelected,
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
        <TicketCard
          sport={formattedTicket.sport}
          event={formattedTicket.event}
          date={formattedTicket.date}
          price={formattedTicket.price}
          section={item.section || "N/A"}
          row={item.row_number || "N/A"}
          seat={item.seat_number || "N/A"}
          onPress={() => handleTicketPress(item)}
        />
        <View style={styles.sportBadge}>
          <Ionicons
            name={getSportIcon(formattedTicket.sport) as any}
            size={14}
            color="#18453b"
          />
          <Text style={styles.sportBadgeText}>{formattedTicket.sport}</Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;

    return (
      <View style={styles.footerLoader}>
        <Text style={styles.footerLoaderText}>Loading more tickets...</Text>
      </View>
    );
  };

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => (router.push as any)("../notifications/")}
          >
            <NotificationBadge
              iconName="notifications-outline"
              iconSize={24}
              iconColor="#ffd700"
            />
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <LinearGradient colors={["#ffd700", "#ffed4a"]} style={styles.logo}>
              <Ionicons name="search-outline" size={32} color="#18453b" />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>Browse Tickets</Text>
          <Text style={styles.headerSubtitle}>
            Find the perfect tickets for MSU events
          </Text>
        </View>

        {/* Search and Filter Section */}
        <View style={styles.searchSection}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
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
            <Text style={styles.filterLabel}>Filter by Sport</Text>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => setShowSortModal(true)}
            >
              <Ionicons name="funnel-outline" size={16} color="#18453b" />
              <Text style={styles.sortButtonText}>Sort</Text>
            </TouchableOpacity>
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
            <Text style={styles.resultsCount}>
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
                    style={styles.clearFiltersButton}
                    onPress={() => {
                      setSearchQuery("");
                      setSelectedSport("All Sports");
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
                <Text style={styles.sortModalTitle}>Sort by</Text>
                <TouchableOpacity onPress={() => setShowSortModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.sortOption,
                    sortBy === option.value && styles.sortOptionSelected,
                  ]}
                  onPress={() => {
                    setSortBy(option.value as any);
                    setShowSortModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === option.value && styles.sortOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color="#18453b" />
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
    borderColor: "#e2e8f0",
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
    color: "#18453b",
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
    borderColor: "#e2e8f0",
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
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
  sportFilterCardSelected: {
    backgroundColor: "#18453b",
    borderColor: "#ffd700",
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
  sportFilterIconSelected: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  sportFilterText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#18453b",
    textAlign: "center",
  },
  sportFilterTextSelected: {
    color: "white",
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
    color: "#18453b",
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
    position: "relative",
    marginBottom: 16,
  },
  sportBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#18453b",
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
    backgroundColor: "#18453b",
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
    color: "#1e293b",
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
  sortOptionSelected: {
    backgroundColor: "#f0f9ff",
  },
  sortOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  sortOptionTextSelected: {
    fontWeight: "600",
    color: "#18453b",
  },
});
