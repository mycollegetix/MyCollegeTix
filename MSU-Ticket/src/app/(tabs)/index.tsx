import React, { useState } from "react";
import {
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  ScrollView,
} from "react-native";
import { TicketCard } from "@/src/components/TicketCard";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

interface Ticket {
  id: string;
  sport: string;
  event: string;
  date: string;
  price: number;
  section: string;
  row: string;
  seat: string;
}

// Sample data - we'll replace this with real data from Supabase later
const sampleTickets: Ticket[] = [
  {
    id: "1",
    sport: "Football",
    event: "MSU vs Michigan",
    date: "Oct 21, 2024 • 7:30 PM",
    price: 150.0,
    section: "25",
    row: "G",
    seat: "12",
  },
  {
    id: "2",
    sport: "Basketball",
    event: "MSU vs Ohio State",
    date: "Nov 15, 2024 • 8:00 PM",
    price: 75.0,
    section: "118",
    row: "C",
    seat: "5",
  },
  {
    id: "3",
    sport: "Hockey",
    event: "MSU vs Notre Dame",
    date: "Dec 5, 2024 • 6:00 PM",
    price: 45.0,
    section: "8",
    row: "K",
    seat: "15",
  },
  {
    id: "4",
    sport: "Basketball",
    event: "MSU vs Purdue",
    date: "Jan 8, 2025 • 7:00 PM",
    price: 85.0,
    section: "110",
    row: "F",
    seat: "8",
  },
  {
    id: "5",
    sport: "Football",
    event: "MSU vs Penn State",
    date: "Nov 30, 2024 • 3:30 PM",
    price: 125.0,
    section: "18",
    row: "M",
    seat: "20",
  },
];

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
  { label: "Date: Soonest", value: "date_asc" },
  { label: "Event Name", value: "name" },
];

export default function BrowseScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [sortBy, setSortBy] = useState("date_asc");
  const [showSortModal, setShowSortModal] = useState(false);

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

  const filteredAndSortedTickets = () => {
    let filtered = sampleTickets;

    // Filter by sport
    if (selectedSport !== "All Sports") {
      filtered = filtered.filter((ticket) => ticket.sport === selectedSport);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ticket.sport.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "date_asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "name":
          return a.event.localeCompare(b.event);
        default:
          return 0;
      }
    });

    return filtered;
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

  const ticketsData = filteredAndSortedTickets();

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
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
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
              {ticketsData.length} ticket{ticketsData.length !== 1 ? "s" : ""}{" "}
              found
            </Text>
            <Text style={styles.currentSort}>
              Sorted by:{" "}
              {sortOptions.find((opt) => opt.value === sortBy)?.label}
            </Text>
          </View>
        </View>

        {/* Tickets List */}
        <View style={styles.ticketsSection}>
          {ticketsData.length > 0 ? (
            <FlatList<Ticket>
              data={ticketsData}
              renderItem={({ item }) => (
                <View style={styles.ticketCardContainer}>
                  <TicketCard
                    sport={item.sport}
                    event={item.event}
                    date={item.date}
                    price={item.price}
                    section={item.section}
                    row={item.row}
                    seat={item.seat}
                    onPress={() => {
                      // We'll implement ticket details navigation later
                      console.log("Ticket pressed:", item.id);
                    }}
                  />
                  <View style={styles.sportBadge}>
                    <Ionicons
                      name={getSportIcon(item.sport) as any}
                      size={14}
                      color="#18453b"
                    />
                    <Text style={styles.sportBadgeText}>{item.sport}</Text>
                  </View>
                </View>
              )}
              keyExtractor={(item: Ticket) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <BlurView intensity={20} style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={48} color="#6b7280" />
              </View>
              <Text style={styles.emptyStateTitle}>No tickets found</Text>
              <Text style={styles.emptyStateText}>
                Try adjusting your filters or search terms to find more tickets
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
                    setSortBy(option.value);
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
