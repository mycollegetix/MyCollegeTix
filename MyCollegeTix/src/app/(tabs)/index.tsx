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
  Platform,
} from "react-native";
import { TicketCard } from "@/src/components/TicketCard";
import { EventFolder } from "@/src/components/EventFolder";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { TicketService } from "@/src/services/ticketService";
import { EventService } from "@/src/services/eventService";
import { TicketWithSeller, Event } from "@/src/types/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import { WatchlistService } from "@/src/services/watchlistService";
import { 
  groupTicketsByEvents, 
  filterEventGroups, 
  sortEventGroups,
  EventGroup,
  EventGroupingResult
} from "@/src/utils/eventGroupingUtils";
import { formatEventDateTime } from "@/src/utils/dateUtils";

const sports = [
  { name: "All Sports", icon: "grid-outline" },
  { name: "Football", icon: "american-football-outline" },
  { name: "Basketball", icon: "basketball-outline" },
  { name: "Hockey", icon: "hockey-puck", iconSet: "MaterialCommunityIcons" },
  { name: "Soccer", icon: "football-outline" },
  { name: "Volleyball", icon: "tennisball-outline" },
  { name: "Baseball", icon: "baseball-outline" },
  { name: "Tennis", icon: "tennisball-outline" },
  {
    name: "Track and Field",
    icon: "run-fast",
    iconSet: "MaterialCommunityIcons",
  },
  { name: "Cross Country", icon: "run", iconSet: "MaterialCommunityIcons" },
  { name: "Golf", icon: "golf-outline" },
];

const sortOptions = [
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Date: Soonest", value: "event_date" },
  { label: "Recently Added", value: "created_at" },
];

// Custom hook for watchlist status
const useWatchlistStatus = (ticketId: string) => {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        setLoading(true);
        const { data } = await WatchlistService.isInWatchlist(ticketId);
        setIsInWatchlist(data);
      } catch (error) {
        console.error("Error checking watchlist status:", error);
        setIsInWatchlist(false);
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      checkStatus();
    }
  }, [ticketId]);

  return { isInWatchlist, loading };
};

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
  // Remove pagination since we load all events at once
  
  // Event folder system state
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [groupingResult, setGroupingResult] = useState<EventGroupingResult>({ 
    groups: [], 
    totalTickets: 0, 
    totalEvents: 0 
  });

  const loadTickets = async (reset = false) => {
    if (!user?.id) {
      console.log("⚠️ User not loaded yet, skipping event load");
      return;
    }

    if (!profile?.college_id) {
      console.log("⚠️ College not loaded yet, skipping event load");
      return;
    }

    if (loading && !reset) return;

    setLoading(true);

    try {
      // First, load all events for the college (same as sell screen)
      const { data: events, error: eventsError } = await EventService.getEventsForCollege({
        sport: selectedSport !== "All Sports" ? selectedSport : undefined,
        limit: 100,
        collegeId: profile.college_id,
      });

      if (eventsError) {
        console.error("Error loading events:", eventsError);
        Alert.alert("Error", "Failed to load events. Please try again.");
        return;
      }

      // Then, load all tickets for this college to group by events
      const { data: allTickets, error: ticketsError } = await TicketService.getTicketsForCollege({
        collegeId: profile.college_id,
        sport: selectedSport,
        searchQuery: searchQuery.trim() || undefined,
        sortBy,
        limit: 1000, // Get all tickets to group properly
        offset: 0,
        excludeUserId: user.id,
        onlySeasonTickets: showSeasonTicketsOnly,
      });

      if (ticketsError) {
        console.error("Error loading tickets:", ticketsError);
        // Continue without tickets - just show events
      }

      // Process tickets with college context
      const processedTickets = (allTickets || []).map((ticket) => {
        return {
          ...ticket,
          collegeMatchup: ticket.collegeMatchup || getCollegeMatchup(ticket),
          isFromUserCollege:
            ticket.isFromUserCollege ||
            ticket.home_college?.id === profile.college_id ||
            ticket.away_college?.id === profile.college_id,
        };
      });

      setTickets(processedTickets);
      
      // Process events and tickets into event groups
      processEventsAndTicketsIntoGroups(events || [], processedTickets);
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load events. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Process events and tickets into event groups
  const processEventsAndTicketsIntoGroups = (allEvents: Event[], allTickets: TicketWithSeller[]) => {
    // Create event groups from all events (similar to groupTicketsByEvents but starts with events)
    const eventGroups: EventGroup[] = allEvents
      .map(event => {
        // Find tickets for this specific event
        const eventTickets = allTickets.filter(ticket => 
          ticket.event_id === event.id ||
          (ticket.title?.toLowerCase().includes(event.title?.toLowerCase() || '') && 
           ticket.sport?.toLowerCase() === event.sport?.toLowerCase())
        );

        // Format event date and time using the same utility as sell screen
        const dateStr = formatEventDateTime(event.event_date, event.game_time, {
          dateStyle: "medium",
          separator: " • ",
        });

        
        return {
          id: event.id,
          eventName: event.title || 'Unknown Event',
          sport: event.sport,
          eventDate: event.event_date,
          location: event.location || 'Unknown Location',
          homeTeam: event.home_team || null,
          awayTeam: event.away_team || null,
          collegeMatchup: event.home_team && event.away_team 
            ? `${event.home_team} vs ${event.away_team}`
            : null,
          isSeasonPass: event.is_season_pass || false,
          tickets: eventTickets,
          ticketCount: eventTickets.length,
          displayDate: dateStr,
          displayTime: "",
          sportIcon: getSportIcon(event.sport),
        };
      })
      .filter(eventGroup => eventGroup.ticketCount > 0); // Only show events with tickets

    console.log("🔍 Created event groups:", eventGroups.length);
    console.log("🔍 Total events before filtering:", allEvents.length);
    console.log("🔍 Events with tickets:", eventGroups.length);
    if (eventGroups.length > 0) {
      console.log("🔍 First event group sportIcon:", eventGroups[0].sportIcon);
    }

    // Sort groups based on current sort preference
    const sortedGroups = sortEventGroups(eventGroups, sortBy);
    
    // Apply search filtering if active
    const { filteredGroups, expandedGroupIds } = filterEventGroups(
      sortedGroups, 
      searchQuery
    );
    
    setGroupingResult({
      groups: filteredGroups,
      totalTickets: allTickets.length,
      totalEvents: allEvents.length
    });
    setEventGroups(filteredGroups);
    
    // Auto-expand groups when searching
    if (searchQuery.trim()) {
      setExpandedGroups(expandedGroupIds);
    }
  };

  // Add the getSportIcon helper function
  const getSportIcon = (sport: string | null): string => {
    if (!sport) return "calendar-outline";
    
    switch (sport.toLowerCase()) {
      case "football":
        return "american-football-outline";
      case "basketball":
        return "basketball-outline"; 
      case "hockey":
        return "hockey-puck";
      case "soccer":
        return "football-outline";
      case "volleyball":
        return "tennisball-outline";
      case "baseball":
        return "baseball-outline";
      case "tennis":
        return "tennisball-outline";
      case "track and field":
        return "run-fast";
      case "cross country":
        return "run";
      case "golf":
        return "golf-outline";
      default:
        return "calendar-outline";
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
        // Always load fresh data for search since we need both events and tickets
        loadTickets(true);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [searchQuery, user?.id, profile?.college_id]);
  
  // Reload data when sort or season filter changes
  useEffect(() => {
    if (user?.id && profile?.college_id) {
      loadTickets(true);
    }
  }, [sortBy, showSeasonTicketsOnly]);

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

  // Removed loadMore since we load all events at once

  const handleTicketPress = (ticket: TicketWithSeller) => {
    router.push(`/ticket-details/${ticket.id}`);
  };

  const SportFilterCard = ({
    sport,
    icon,
    iconSet,
  }: {
    sport: string;
    icon: string;
    iconSet?: string;
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
        {iconSet === "MaterialCommunityIcons" ? (
          <MaterialCommunityIcons
            name={icon as any}
            size={20}
            color={selectedSport === sport ? theme.secondary : theme.primary}
          />
        ) : (
          <Ionicons
            name={icon as any}
            size={20}
            color={selectedSport === sport ? theme.secondary : theme.primary}
          />
        )}
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
    // Use the same date formatting as sell.tsx for consistency
    // Get game_time from the associated event, not from ticket (tickets don't have game_time)
    const dateStr = formatEventDateTime(ticket.event_date, ticket.event?.game_time, {
      dateStyle: "medium", 
      separator: " • ",
    });


    return {
      id: ticket.id,
      sport: getSportFromTitle(ticket.title),
      event: ticket.title,
      date: dateStr,
      price: ticket.price,
      section: ticket.section || "N/A",
      row: ticket.row_number || "N/A",
      seat: ticket.seat_number || "N/A",
      location: ticket.location,
      seller: ticket.seller,
      ticketType: ticket.ticket_type,
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
    if (lowerTitle.includes("track") || lowerTitle.includes("field"))
      return "Track and Field";
    if (lowerTitle.includes("cross country")) return "Cross Country";
    if (lowerTitle.includes("golf")) return "Golf";
    return "Sports";
  };

  // Toggle event group expansion
  const handleGroupToggle = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };
  
  // Render individual ticket within event folder
  const renderTicketInFolder = (ticket: TicketWithSeller) => {
    const formattedTicket = formatTicketForCard(ticket);

    return (
      <EnhancedTicketCard
        sport={formattedTicket.sport}
        event={formattedTicket.event}
        date={formattedTicket.date}
        price={formattedTicket.price}
        section={ticket.section || "N/A"}
        row={ticket.row_number || "N/A"}
        seat={ticket.seat_number || "N/A"}
        onPress={() => handleTicketPress(ticket)}
        ticketType={ticket.ticket_type}
        collegeMatchup={formattedTicket.collegeMatchup}
        isSeasonPass={ticket.event?.is_season_pass}
        ticketId={ticket.id}
      />
    );
  };
  
  // Render event folder
  const renderEventFolder = ({ item }: { item: EventGroup }) => {
    return (
      <EventFolder
        eventGroup={item}
        isExpanded={expandedGroups.has(item.id)}
        onToggle={handleGroupToggle}
        onTicketPress={handleTicketPress}
        renderTicket={renderTicketInFolder}
        searchQuery={searchQuery}
      />
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
  if (!user) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.secondary} />
          <Text style={styles.loadingText}>Loading user information...</Text>
        </View>
      </View>
    );
  }

  // Show college setup needed if profile exists but no college
  if (profile && !profile?.college_id) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            Please complete your profile setup
          </Text>
          <TouchableOpacity
            style={[
              styles.clearFiltersButton,
              { backgroundColor: theme.secondary, marginTop: 16 },
            ]}
            onPress={() => router.push("/(tabs)/profile" as any)}
          >
            <Text style={styles.clearFiltersText}>Go to Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Still loading profile
  if (!profile) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.secondary} />
          <Text style={styles.loadingText}>Loading your profile...</Text>
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
        scrollEventThrottle={16}
        keyboardDismissMode={
          Platform.OS === "android" ? "on-drag" : "interactive"
        }
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            onPress={() => {
              console.log("🔔 Notification button pressed");
              // Add small delay for Android to prevent timing issues
              setTimeout(
                () => {
                  try {
                    console.log(
                      "🔔 Attempting to navigate to notifications..."
                    );
                    router.push("/notifications" as any);
                  } catch (error) {
                    console.error("❌ Navigation error:", error);
                    try {
                      // Fallback navigation method for Android
                      console.log("🔔 Trying fallback navigation...");
                      router.replace("/notifications" as any);
                    } catch (fallbackError) {
                      console.error(
                        "❌ Fallback navigation also failed:",
                        fallbackError
                      );
                      Alert.alert(
                        "Error",
                        "Unable to open notifications. Please try again."
                      );
                    }
                  }
                },
                Platform.OS === "android" ? 100 : 0
              );
            }}
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
                iconSet={(sport as any).iconSet}
              />
            ))}
          </ScrollView>

          {/* Results Header */}
          <View style={styles.resultsHeader}>
            <View style={styles.resultsLeft}>
              <Text style={[styles.resultsCount, { color: theme.primary }]}>
                {groupingResult.totalEvents} event{groupingResult.totalEvents !== 1 ? "s" : ""} • {groupingResult.totalTickets} ticket{groupingResult.totalTickets !== 1 ? "s" : ""}
              </Text>
              <Text style={styles.currentSort}>
                Sorted by: {sortOptions.find((opt) => opt.value === sortBy)?.label}
              </Text>
            </View>
            
            {/* View Toggle */}
            <TouchableOpacity
              style={[styles.viewToggle, { borderColor: `${theme.primary}30` }]}
              onPress={() => {
                // Future: could add flat list view toggle
                Alert.alert("Event View", "You're viewing tickets organized by events. This makes it easier to find tickets for specific games!");
              }}
            >
              <Ionicons 
                name="folder-open-outline" 
                size={16} 
                color={theme.primary} 
              />
              <Text style={[styles.viewToggleText, { color: theme.primary }]}>
                Events
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Event Folders List */}
        <View style={styles.ticketsSection}>
          {eventGroups.length > 0 ? (
            <FlatList
              data={eventGroups}
              renderItem={renderEventFolder}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={Platform.OS === "android"}
              keyboardShouldPersistTaps="handled"
              ListFooterComponent={renderFooter}
              ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
            />
          ) : (
            <BlurView intensity={20} style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                {loading ? (
                  <ActivityIndicator size="large" color={theme.primary} />
                ) : (
                  <Ionicons name="folder-open-outline" size={48} color="#6b7280" />
                )}
              </View>
              <Text style={styles.emptyStateTitle}>
                {loading ? "Loading events..." : "No events found"}
              </Text>
              {!loading && (
                <>
                  <Text style={styles.emptyStateText}>
                    Try adjusting your filters or search terms to find events with available tickets
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
                      setExpandedGroups(new Set());
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
  ticketType,
  collegeMatchup,
  isSeasonPass,
  ticketId,
}: {
  sport: string;
  event: string;
  date: string;
  price: number;
  section: string;
  row: string;
  seat: string;
  onPress?: () => void;
  ticketType?: "general_admission" | "student";
  collegeMatchup?: string | null;
  isSeasonPass?: boolean;
  ticketId: string;
}) => {
  const theme = useTheme();
  const { isInWatchlist } = useWatchlistStatus(ticketId);

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
          {isSeasonPass && (
            <View
              style={[styles.seasonBadge, { backgroundColor: theme.secondary }]}
            >
              <Text style={styles.seasonBadgeText}>SEASON</Text>
            </View>
          )}
          {ticketType === "general_admission" && (
            <View style={[styles.generalBadge, { backgroundColor: "#10b981" }]}>
              <Text style={styles.generalBadgeText}>GENERAL</Text>
            </View>
          )}
          {isInWatchlist && (
            <View style={[styles.watchlistBadge, { backgroundColor: "#f59e0b" }]}>
              <Ionicons name="bookmark" size={12} color="white" />
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
    alignItems: "flex-start",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  resultsLeft: {
    flex: 1,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  currentSort: {
    fontSize: 12,
    color: "#6b7280",
  },
  viewToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
  },
  viewToggleText: {
    fontSize: 12,
    fontWeight: "600",
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
  generalBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  generalBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  watchlistBadge: {
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    borderRadius: 12,
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
