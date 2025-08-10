// src/app/(tabs)/sell.tsx - Enhanced version with season ticket support and college theme
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  View,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
  StatusBar,
} from "react-native";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { TicketService } from "@/src/services/ticketService";
import { EventService } from "@/src/services/eventService";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import { Event } from "@/src/types/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useNotifications } from "@/src/providers/NotificationProvider";

const { width, height } = Dimensions.get("window");

const sports = [
  { name: "All Sports", icon: "grid-outline" },
  { name: "Football", icon: "american-football-outline" },
  { name: "Basketball", icon: "basketball-outline" },
  { name: "Soccer", icon: "football-outline" },
  { name: "Volleyball", icon: "tennisball-outline" },
  { name: "Hockey", icon: "hockey-puck", iconSet: "MaterialCommunityIcons" },
  { name: "Baseball", icon: "baseball-outline" },
  { name: "Tennis", icon: "tennisball-outline" },
  { name: "Track and Field", icon: "run-fast", iconSet: "MaterialCommunityIcons" },
  { name: "Cross Country", icon: "run", iconSet: "MaterialCommunityIcons" },
  { name: "Golf", icon: "golf-outline" },
];

interface FormData {
  section: string;
  row_number: string;
  seat_number: string;
  price: string;
  description: string;
  is_season_ticket: boolean;
}

export default function SellScreen() {
  const theme = useTheme();
  const router = useRouter();

  // Event selection state
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [selectedSport, setSelectedSport] = useState("All Sports");
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Form state with season ticket support
  const [formData, setFormData] = useState<FormData>({
    section: "",
    row_number: "",
    seat_number: "",
    price: "",
    description: "",
    is_season_ticket: false,
  });

  const [isLoading, setIsLoading] = useState(false);

  const { profile } = useAuth();
  const { refreshNotifications } = useNotifications();

  // Load available events when sport changes
  useEffect(() => {
    loadAvailableEvents();
  }, [selectedSport]);

  const loadAvailableEvents = async () => {
    setLoadingEvents(true);
    try {
      const { data, error } = await EventService.getEventsForCollege({
        sport: selectedSport !== "All Sports" ? selectedSport : undefined,
        limit: 100,
        collegeId: profile?.college_id ?? undefined,
      });

      if (error) {
        console.error("Error loading events:", error);
        Alert.alert("Error", "Failed to load events. Please try again.");
        return;
      }

      setAvailableEvents(data);
    } catch (error) {
      console.error("Error loading events:", error);
      Alert.alert("Error", "Failed to load events. Please try again.");
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleOpenEventModal = async () => {
    await loadAvailableEvents();
    setShowEventModal(true);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setShowEventModal(false);

    // Auto-fill description based on event
    setFormData((prev) => ({
      ...prev,
      description:
        prev.description ||
        `Ticket for ${event.title} - ${formatEventDate(event.event_date)}`,
    }));
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr} • ${timeStr}`;
  };

  const updateFormData = (key: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const isFormValid = () => {
    return (
      selectedEvent &&
      formData.section.trim() &&
      formData.row_number.trim() &&
      formData.seat_number.trim() &&
      formData.price.trim() &&
      parseFloat(formData.price) > 0
    );
  };

  const resetForm = () => {
    setSelectedEvent(null);
    setFormData({
      section: "",
      row_number: "",
      seat_number: "",
      price: "",
      description: "",
      is_season_ticket: false,
    });
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    if (!selectedEvent) {
      Alert.alert("Error", "Please select an event");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await TicketService.createTicket({
        event_id: selectedEvent.id,
        section: formData.section,
        row_number: formData.row_number,
        seat_number: formData.seat_number,
        price: parseFloat(formData.price),
        description: formData.description,
        is_season_ticket: formData.is_season_ticket,
      });

      if (error) {
        throw error;
      }

      // Refresh notifications state
      await refreshNotifications();

      Alert.alert("Success!", "Your ticket has been listed successfully!", [
        {
          text: "View Listing",
          onPress: () => {
            resetForm(); // Clear form
            if (data) {
              (router.push as any)(`/ticket-details/${data.id}`);
            }
          },
        },
        {
          text: "List Another",
          onPress: () => {
            resetForm(); // Clear form
          },
        },
        {
          text: "Go to My Listings",
          onPress: () => {
            resetForm(); // Clear form
            (router.push as any)("/(tabs)/orders");
          },
        },
      ]);
    } catch (error: any) {
      console.error("Error creating ticket:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to create ticket listing. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
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
        styles.sportCard,
        selectedSport === sport && {
          backgroundColor: theme.primary,
          borderColor: theme.secondary,
        },
      ]}
      onPress={() => setSelectedSport(sport)}
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
      <Text
        style={[
          styles.sportText,
          { color: theme.primary },
          selectedSport === sport && { color: "white" },
        ]}
      >
        {sport}
      </Text>
    </TouchableOpacity>
  );

  const renderEventItem = ({ item }: { item: Event }) => (
    <TouchableOpacity
      style={styles.eventItem}
      onPress={() => handleEventSelect(item)}
    >
      <View style={styles.eventItemContent}>
        <View style={styles.eventItemInfo}>
          <Text style={styles.eventItemTitle}>{item.title}</Text>
          <Text style={styles.eventItemDate}>
            {formatEventDate(item.event_date)}
          </Text>
          <Text style={styles.eventItemLocation}>
            {item.venue || item.location}
          </Text>
          {item.opponent && (
            <Text style={styles.eventItemOpponent}>vs {item.opponent}</Text>
          )}
        </View>
        <View
          style={[
            styles.eventItemSport,
            {
              backgroundColor: `${theme.primary}15`,
              borderColor: `${theme.primary}40`,
            },
          ]}
        >
          <Text style={[styles.eventItemSportText, { color: theme.primary }]}>
            {item.sport}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
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
        keyboardDismissMode={Platform.OS === 'android' ? 'on-drag' : 'interactive'}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[theme.secondary, `${theme.secondary}DD`]}
              style={styles.logo}
            >
              <Ionicons name="cash-outline" size={32} color={theme.primary} />
            </LinearGradient>
          </View>
          <Text style={styles.headerTitle}>Sell Tickets</Text>
          <Text style={styles.headerSubtitle}>
            List your tickets for sale and reach buyers instantly
          </Text>
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
        </View>

        {/* Main Content Container */}
        <View style={styles.contentContainer}>
          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
          >
            {/* Event Selection */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Select Event
              </Text>
              <Text style={styles.sectionSubtitle}>
                Choose the event you're selling tickets for
              </Text>

              {selectedEvent ? (
                <View
                  style={[
                    styles.selectedEventContainer,
                    {
                      backgroundColor: `${theme.primary}10`,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  <View style={styles.selectedEventHeader}>
                    <View style={styles.selectedEventInfo}>
                      <Text
                        style={[
                          styles.selectedEventTitle,
                          { color: theme.primary },
                        ]}
                      >
                        {selectedEvent.title}
                      </Text>
                      <Text
                        style={[
                          styles.selectedEventDate,
                          { color: theme.primary },
                        ]}
                      >
                        {formatEventDate(selectedEvent.event_date)}
                      </Text>
                      <Text style={styles.selectedEventLocation}>
                        {selectedEvent.venue || selectedEvent.location}
                      </Text>
                      {selectedEvent.opponent && (
                        <Text style={styles.selectedEventVenue}>
                          vs {selectedEvent.opponent}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.changeEventButton,
                        { borderColor: theme.primary },
                      ]}
                      onPress={() => setShowEventModal(true)}
                    >
                      <Text
                        style={[
                          styles.changeEventText,
                          { color: theme.primary },
                        ]}
                      >
                        Change
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.selectEventButton,
                    { borderColor: `${theme.primary}30` },
                  ]}
                  onPress={handleOpenEventModal}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.primary}
                  />
                  <Text
                    style={[styles.selectEventText, { color: theme.primary }]}
                  >
                    Select an Event
                  </Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Season Ticket Toggle */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Ticket Type
              </Text>
              <Text style={styles.sectionSubtitle}>
                Specify if this is a student season ticket
              </Text>

              <TouchableOpacity
                style={[
                  styles.seasonTicketToggle,
                  { borderColor: `${theme.primary}30` },
                  formData.is_season_ticket && {
                    borderColor: theme.primary,
                    backgroundColor: `${theme.primary}10`,
                  },
                ]}
                onPress={() =>
                  updateFormData("is_season_ticket", !formData.is_season_ticket)
                }
              >
                <View style={styles.seasonTicketIcon}>
                  <Ionicons
                    name="trophy-outline"
                    size={20}
                    color={
                      formData.is_season_ticket ? theme.primary : "#9ca3af"
                    }
                  />
                </View>
                <View style={styles.seasonTicketContent}>
                  <Text
                    style={[styles.seasonTicketTitle, { color: theme.primary }]}
                  >
                    Season or Student Ticket
                  </Text>
                  <Text style={styles.seasonTicketSubtitle}>
                    Specify if buyer might need to show student ID
                  </Text>
                </View>
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: `${theme.primary}30` },
                    formData.is_season_ticket && {
                      backgroundColor: theme.primary,
                      borderColor: theme.primary,
                    },
                  ]}
                >
                  {formData.is_season_ticket && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
            </View>

            {/* Seat Information */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Seat Information
              </Text>
              <Text style={styles.sectionSubtitle}>
                Specify your seat location
              </Text>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.thirdWidth]}>
                  <Text style={[styles.inputLabel, { color: theme.primary }]}>
                    Section *
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderColor: `${theme.primary}30` },
                    ]}
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Section"
                      value={formData.section}
                      onChangeText={(section) =>
                        updateFormData("section", section)
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.thirdWidth]}>
                  <Text style={[styles.inputLabel, { color: theme.primary }]}>
                    Row *
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderColor: `${theme.primary}30` },
                    ]}
                  >
                    <Ionicons
                      name="list-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Row"
                      value={formData.row_number}
                      onChangeText={(row_number) =>
                        updateFormData("row_number", row_number)
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.thirdWidth]}>
                  <Text style={[styles.inputLabel, { color: theme.primary }]}>
                    Seat *
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderColor: `${theme.primary}30` },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Seat"
                      value={formData.seat_number}
                      onChangeText={(seat_number) =>
                        updateFormData("seat_number", seat_number)
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Price
              </Text>
              <Text style={styles.sectionSubtitle}>Set your asking price</Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.primary }]}>
                  Price *
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderColor: `${theme.primary}30` },
                  ]}
                >
                  <View style={styles.dollarContainer}>
                    <Text style={[styles.dollarSign, { color: theme.primary }]}>
                      $
                    </Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={formData.price}
                    onChangeText={(price) => updateFormData("price", price)}
                    keyboardType="numeric"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Description
              </Text>
              <Text style={styles.sectionSubtitle}>
                Add any additional details (optional)
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.primary }]}>
                  Additional Details
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    styles.textAreaWrapper,
                    { borderColor: `${theme.primary}30` },
                  ]}
                >
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add any additional information about your tickets..."
                    value={formData.description}
                    onChangeText={(description) =>
                      updateFormData("description", description)
                    }
                    multiline
                    numberOfLines={4}
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || isLoading}
            >
              <LinearGradient
                colors={
                  isFormValid()
                    ? [theme.primary, `${theme.primary}E6`]
                    : ["#9ca3af", "#6b7280"]
                }
                style={styles.submitButtonGradient}
              >
                {isLoading ? (
                  <Text style={styles.submitButtonText}>Listing...</Text>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="white" />
                    <Text style={styles.submitButtonText}>
                      {formData.is_season_ticket
                        ? "List Season Ticket"
                        : "List Ticket"}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </ScrollView>

      {/* Event Selection Modal */}
      <Modal
        visible={showEventModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
            style={styles.modalBackground}
          />

          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowEventModal(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Event</Text>
            <View style={styles.modalCloseButton} />
          </View>

          {/* Sport Filters */}
          <View style={styles.modalFilters}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sportsGrid}
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
          </View>

          {/* Events List */}
          <View style={styles.modalEventsContainer}>
            <Text style={[styles.modalEventsHeader, { color: theme.primary }]}>
              {availableEvents.length} Available Events
            </Text>

            {loadingEvents ? (
              <View style={styles.modalLoadingContainer}>
                <Text style={styles.modalLoadingText}>Loading events...</Text>
              </View>
            ) : availableEvents.length > 0 ? (
              <FlatList
                data={availableEvents}
                renderItem={renderEventItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={Platform.OS === 'android'}
                contentContainerStyle={styles.modalEventsList}
              />
            ) : (
              <View style={styles.modalEmptyState}>
                <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                <Text style={styles.modalEmptyTitle}>No Events Found</Text>
                <Text style={styles.modalEmptyText}>
                  No events available for {selectedSport}. Try selecting a
                  different sport.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  // Floating elements
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
  scrollContent: {
    flexGrow: 1,
  },
  // Header Section
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
  },
  // Main Content Container
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  keyboardView: {
    flex: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  selectedEventContainer: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedEventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  selectedEventInfo: {
    flex: 1,
    marginRight: 12,
  },
  selectedEventTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  selectedEventDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  selectedEventLocation: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  selectedEventVenue: {
    fontSize: 12,
    color: "#6b7280",
  },
  changeEventButton: {
    backgroundColor: "white",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  changeEventText: {
    fontSize: 12,
    fontWeight: "600",
  },
  selectEventButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectEventText: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 12,
  },
  // Season Ticket Toggle Styles
  seasonTicketToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  seasonTicketIcon: {
    marginRight: 12,
  },
  seasonTicketContent: {
    flex: 1,
    marginRight: 12,
  },
  seasonTicketTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  seasonTicketSubtitle: {
    fontSize: 12,
    color: "#6b7280",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textAreaWrapper: {
    height: 100,
    alignItems: "flex-start",
    paddingTop: 16,
    paddingBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  textArea: {
    height: 68,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  thirdWidth: {
    flex: 1,
  },
  dollarContainer: {
    marginRight: 8,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: "600",
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  modalFilters: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sportsGrid: {
    paddingRight: 20,
    gap: 12,
  },
  sportCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  sportText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalEventsContainer: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  modalEventsHeader: {
    fontSize: 16,
    fontWeight: "600",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalEventsList: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modalLoadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  modalLoadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  modalEmptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  modalEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  modalEmptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  eventItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventItemContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventItemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  eventItemDate: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  eventItemLocation: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  eventItemOpponent: {
    fontSize: 12,
    color: "#059669",
    fontWeight: "500",
  },
  eventItemSport: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  eventItemSportText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
