// src/app/(admin)/events.tsx
import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/src/lib/supabase";
import { Tables } from "@/src/types/database.types";

type Event = Tables<"events">;

export default function EventManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchText, setSearchText] = useState("");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    sport: "",
    location: "",
    event_date: "",
    is_home_game: true,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    filterEvents();
  }, [searchText, sportFilter, events]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error("Error fetching events:", error);
      Alert.alert("Error", "Failed to load events");
    } finally {
      setIsLoading(false);
    }
  };

  const filterEvents = () => {
    let filtered = events;

    if (sportFilter !== "all") {
      filtered = filtered.filter((event) => event.sport === sportFilter);
    }

    if (searchText.trim()) {
      filtered = filtered.filter(
        (event) =>
          event.title.toLowerCase().includes(searchText.toLowerCase()) ||
          event.sport?.toLowerCase().includes(searchText.toLowerCase()) ||
          event.location.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredEvents(filtered);
  };

  const createEvent = async () => {
    if (
      !newEvent.title ||
      !newEvent.sport ||
      !newEvent.location ||
      !newEvent.event_date
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      const { error } = await supabase.from("events").insert([
        {
          title: newEvent.title,
          sport: newEvent.sport,
          location: newEvent.location,
          event_date: newEvent.event_date,
          is_home_game: newEvent.is_home_game,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success", "Event created successfully");
      setCreateModalVisible(false);
      setNewEvent({
        title: "",
        sport: "",
        location: "",
        event_date: "",
        is_home_game: true,
      });
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      Alert.alert("Error", "Failed to create event");
    }
  };

  const deleteEvent = async (eventId: string) => {
    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("events")
              .delete()
              .eq("id", eventId);

            if (error) throw error;

            Alert.alert("Success", "Event deleted successfully");
            fetchEvents();
          } catch (error) {
            console.error("Error deleting event:", error);
            Alert.alert("Error", "Failed to delete event");
          }
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  const uniqueSports = [
    ...new Set(events.map((event) => event.sport).filter(Boolean)),
  ];

  const EventCard = ({ event }: { event: Event }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <View style={styles.eventBadge}>
          <Text style={styles.eventBadgeText}>{event.sport}</Text>
        </View>
      </View>

      <View style={styles.eventInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{event.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {new Date(event.event_date).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons
            name={event.is_home_game ? "home" : "airplane"}
            size={16}
            color="#6b7280"
          />
          <Text style={styles.infoText}>
            {event.is_home_game ? "Home Game" : "Away Game"}
          </Text>
        </View>
      </View>

      <View style={styles.eventActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#dc2626" }]}
          onPress={() => deleteEvent(event.id)}
        >
          <Ionicons name="trash" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2d5f52"]}
        style={styles.headerBackground}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Event Management</Text>
          <Text style={styles.headerSubtitle}>
            {events.length} total events
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilters}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              sportFilter === "all" && styles.activeFilter,
            ]}
            onPress={() => setSportFilter("all")}
          >
            <Text
              style={[
                styles.filterText,
                sportFilter === "all" && styles.activeFilterText,
              ]}
            >
              All Sports
            </Text>
          </TouchableOpacity>
          {uniqueSports.map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[
                styles.filterButton,
                sportFilter === sport && styles.activeFilter,
              ]}
              onPress={() => setSportFilter(sport || "")}
            >
              <Text
                style={[
                  styles.filterText,
                  sportFilter === sport && styles.activeFilterText,
                ]}
              >
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createButtonText}>Create Event</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.eventsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </ScrollView>

      {/* Create Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={createModalVisible}
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Event</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Event Title"
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Sport"
              value={newEvent.sport}
              onChangeText={(text) => setNewEvent({ ...newEvent, sport: text })}
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Location"
              value={newEvent.location}
              onChangeText={(text) =>
                setNewEvent({ ...newEvent, location: text })
              }
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Event Date (YYYY-MM-DD)"
              value={newEvent.event_date}
              onChangeText={(text) =>
                setNewEvent({ ...newEvent, event_date: text })
              }
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#6b7280" }]}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#18453b" }]}
                onPress={createEvent}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  headerBackground: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
  },
  filtersContainer: {
    padding: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  statusFilters: {
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "white",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  activeFilter: {
    backgroundColor: "#18453b",
    borderColor: "#18453b",
  },
  filterText: {
    fontSize: 14,
    color: "#6b7280",
  },
  activeFilterText: {
    color: "white",
  },
  createButton: {
    backgroundColor: "#18453b",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  eventsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  eventBadge: {
    backgroundColor: "#18453b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  eventInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 8,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
    textAlign: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
