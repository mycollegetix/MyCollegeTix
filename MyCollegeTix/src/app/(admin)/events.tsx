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
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/src/lib/supabase";
import { Tables, EventWithColleges } from "@/src/types/database.types";
import AdminLayout from "@/src/components/AdminLayout";

type Event = Tables<"events">;

type College = Tables<"colleges">;

const { width } = Dimensions.get("window");

const STATUS_COLORS = {
  scraped: "#9CA3AF", // Gray
  available: "#10B981", // Green
  inactive: "#EF4444", // Red
  completed: "#6B7280", // Dark gray
  cancelled: "#F59E0B", // Orange
};

const STATUS_LABELS = {
  scraped: "Scraped",
  available: "Available",
  inactive: "Inactive",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ✅ FIXED: Moved EditEventModal outside of the main component to prevent re-renders
const EditEventModal = ({
  visible,
  onClose,
  onSave,
  editForm,
  updateFormField,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  editForm: {
    title: string;
    event_date: string;
    game_time: string;
    location: string;
    venue: string;
    sport: string;
    opponent: string;
    is_home_game: boolean;
    status: Event['status'];
    description: string;
    is_season_pass: boolean;
  };
  updateFormField: (field: string, value: string | boolean) => void;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { maxHeight: '90%' }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.modalTitle}>
            Edit Event Details
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Event Title *</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.title}
              onChangeText={(text) => updateFormField('title', text)}
              placeholder="Enter event title"
              multiline
            />
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.formLabel}>Date *</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.event_date}
                onChangeText={(text) => updateFormField('event_date', text)}
                placeholder="YYYY-MM-DD"
              />
            </View>
            
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.formLabel}>Time</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.game_time}
                onChangeText={(text) => updateFormField('game_time', text)}
                placeholder="7:00 PM"
              />
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Location *</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.location}
              onChangeText={(text) => updateFormField('location', text)}
              placeholder="City, State"
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Venue</Text>
            <TextInput
              style={styles.formInput}
              value={editForm.venue}
              onChangeText={(text) => updateFormField('venue', text)}
              placeholder="Stadium or arena name"
            />
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.formLabel}>Sport</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.sport}
                onChangeText={(text) => updateFormField('sport', text)}
                placeholder="Football, Basketball, etc."
              />
            </View>
            
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.formLabel}>Opponent</Text>
              <TextInput
                style={styles.formInput}
                value={editForm.opponent}
                onChangeText={(text) => updateFormField('opponent', text)}
                placeholder="Opposing team"
              />
            </View>
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.formLabel}>Game Type</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentedOption,
                    editForm.is_home_game && styles.segmentedOptionActive
                  ]}
                  onPress={() => updateFormField('is_home_game', true)}
                >
                  <Text style={[
                    styles.segmentedOptionText,
                    editForm.is_home_game && styles.segmentedOptionTextActive
                  ]}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedOption,
                    !editForm.is_home_game && styles.segmentedOptionActive
                  ]}
                  onPress={() => updateFormField('is_home_game', false)}
                >
                  <Text style={[
                    styles.segmentedOptionText,
                    !editForm.is_home_game && styles.segmentedOptionTextActive
                  ]}>Away</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.formLabel}>Status</Text>
              <View style={styles.statusPicker}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {Object.keys(STATUS_LABELS).map((status) => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.statusOption,
                        { backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] },
                        editForm.status === status && styles.statusOptionActive
                      ]}
                      onPress={() => updateFormField('status', status)}
                    >
                      <Text style={styles.statusOptionText}>
                        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Description</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={editForm.description}
              onChangeText={(text) => updateFormField('description', text)}
              placeholder="Additional event details..."
              multiline
              numberOfLines={3}
            />
          </View>
          
          {/* Season Pass Toggle */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Event Type</Text>
            <TouchableOpacity
              style={[
                styles.seasonPassToggle,
                editForm.is_season_pass && styles.seasonPassToggleActive
              ]}
              onPress={() => updateFormField('is_season_pass', !editForm.is_season_pass)}
            >
              <View style={styles.seasonPassToggleContent}>
                <Ionicons
                  name="trophy-outline"
                  size={20}
                  color={editForm.is_season_pass ? "#18453b" : "#9ca3af"}
                />
                <View style={styles.seasonPassToggleText}>
                  <Text style={[styles.seasonPassToggleTitle, editForm.is_season_pass && styles.seasonPassToggleTitleActive]}>
                    Season Pass Event
                  </Text>
                  <Text style={styles.seasonPassToggleSubtitle}>
                    Enable ticket type selection for sellers
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.toggleSwitch,
                  editForm.is_season_pass && styles.toggleSwitchActive
                ]}
              >
                <View
                  style={[
                    styles.toggleSwitchThumb,
                    editForm.is_season_pass && styles.toggleSwitchThumbActive
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveBtn, { opacity: editForm.title && editForm.event_date && editForm.location ? 1 : 0.5 }]}
              onPress={onSave}
              disabled={!editForm.title || !editForm.event_date || !editForm.location}
            >
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default function EventManagement() {
  const [events, setEvents] = useState<EventWithColleges[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithColleges[]>([]);
  const [groupedEvents, setGroupedEvents] = useState<{
    [key: string]: EventWithColleges[];
  }>({});
  const [colleges, setColleges] = useState<College[]>([]);
  const [openColleges, setOpenColleges] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sportFilter, setSportFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithColleges | null>(null);
  const [editForm, setEditForm] = useState({
    title: '',
    event_date: '',
    game_time: '',
    location: '',
    venue: '',
    sport: '',
    opponent: '',
    is_home_game: true,
    status: 'scraped' as Event['status'],
    description: '',
    is_season_pass: false
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(
          `
          *,
          home_college:colleges!events_home_college_id_fkey(*),
          away_college:colleges!events_away_college_id_fkey(*)
        `
        )
        .order("event_date", { ascending: true });

      if (eventError) throw eventError;

      const { data: collegeData, error: collegeError } = await supabase
        .from("colleges")
        .select("*")
        .order("name");

      if (collegeError) throw collegeError;

      setEvents(eventData || []);
      setColleges(collegeData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      Alert.alert("Error", "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  };

  useEffect(() => {
    const groupAndFilterEvents = () => {
      let filtered = events;

      if (statusFilter !== "all") {
        filtered = filtered.filter((event) => event.status === statusFilter);
      }

      if (sportFilter !== "all") {
        filtered = filtered.filter((event) => event.sport === sportFilter);
      }

      if (searchText.trim()) {
        filtered = filtered.filter(
          (event) =>
            event.title.toLowerCase().includes(searchText.toLowerCase()) ||
            event.sport?.toLowerCase().includes(searchText.toLowerCase()) ||
            event.location.toLowerCase().includes(searchText.toLowerCase()) ||
            event.opponent?.toLowerCase().includes(searchText.toLowerCase()) ||
            event.home_college?.name
              .toLowerCase()
              .includes(searchText.toLowerCase()) ||
            event.away_college?.name
              .toLowerCase()
              .includes(searchText.toLowerCase())
        );
      }

      const grouped = colleges.reduce((acc, college) => {
        acc[college.id] = [];
        return acc;
      }, {} as { [key: string]: EventWithColleges[] });

      // Add a group for events with no college affiliation
      grouped["none"] = [];

      filtered.forEach((event) => {
        if (event.home_college_id) {
          if (grouped[event.home_college_id]) {
            grouped[event.home_college_id].push(event);
          }
        } else if (event.away_college_id) {
          if (grouped[event.away_college_id]) {
            grouped[event.away_college_id].push(event);
          }
        } else {
          grouped["none"].push(event);
        }
      });

      setGroupedEvents(grouped);
    };

    groupAndFilterEvents();
  }, [events, colleges, searchText, statusFilter, sportFilter]);

  const toggleCollege = (collegeId: string) => {
    const newOpenColleges = new Set(openColleges);
    if (newOpenColleges.has(collegeId)) {
      newOpenColleges.delete(collegeId);
    } else {
      newOpenColleges.add(collegeId);
    }
    setOpenColleges(newOpenColleges);
  };

  const updateEventStatus = async (eventId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("events")
        .update({
          status: newStatus as
            | "scraped"
            | "available"
            | "inactive"
            | "completed"
            | "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);

      if (error) throw error;

      // Update local state
      setEvents((prev) =>
        prev.map((event) =>
          event.id === eventId ? { ...event, status: newStatus as any } : event
        )
      );

      Alert.alert(
        "Success",
        `Event status updated to ${
          STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]
        }`
      );
    } catch (error) {
      console.error("Error updating event status:", error);
      Alert.alert("Error", "Failed to update event status");
    }
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedEvents.size === 0) {
      Alert.alert("Error", "No events selected");
      return;
    }

    try {
      const eventIds = Array.from(selectedEvents);

      const { error } = await supabase
        .from("events")
        .update({
          status: newStatus as
            | "scraped"
            | "available"
            | "inactive"
            | "completed"
            | "cancelled",
          updated_at: new Date().toISOString(),
        })
        .in("id", eventIds);

      if (error) throw error;

      // Update local state
      setEvents((prev) =>
        prev.map((event) =>
          selectedEvents.has(event.id)
            ? { ...event, status: newStatus as any }
            : event
        )
      );

      setSelectedEvents(new Set());
      setSelectMode(false);
      setBulkModalVisible(false);

      Alert.alert(
        "Success",
        `Updated ${eventIds.length} events to ${
          STATUS_LABELS[newStatus as keyof typeof STATUS_LABELS]
        }`
      );
    } catch (error) {
      console.error("Error bulk updating events:", error);
      Alert.alert("Error", "Failed to update events");
    }
  };

  const toggleEventSelection = (eventId: string) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const selectAllVisible = () => {
    const allVisibleIds = new Set(filteredEvents.map((event) => event.id));
    setSelectedEvents(allVisibleIds);
  };

  const clearSelection = () => {
    setSelectedEvents(new Set());
    setSelectMode(false);
  };

  const getUniqueValues = (key: keyof Event) => {
    const values = events
      .map((event) => event[key])
      .filter((value, index, self) => value && self.indexOf(value) === index)
      .sort();
    return values as string[];
  };

  const StatusBadge = ({ status }: { status: string }) => (
    <View
      style={[
        styles.statusBadge,
        {
          backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS],
        },
      ]}
    >
      <Text style={styles.statusText}>
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
      </Text>
    </View>
  );

  const EventCard = ({ event }: { event: Event }) => {
    const isSelected = selectedEvents.has(event.id);
    // Parse date as local date to avoid timezone issues
    const eventDateStr = event.event_date.split('T')[0]; // Get YYYY-MM-DD
    const [year, month, day] = eventDateStr.split('-').map(Number);
    const eventDate = new Date(year, month - 1, day); // Create local date

    // Event expires at 11:59 PM on the event day, not immediately when date passes
    const endOfEventDay = new Date(year, month - 1, day, 23, 59, 59, 999);
    const isExpired = endOfEventDay < new Date();

    return (
      <TouchableOpacity
        style={[
          styles.eventCard, 
          isSelected && styles.selectedCard,
          isExpired && styles.expiredCard
        ]}
        onPress={() => {
          if (selectMode) {
            toggleEventSelection(event.id);
          } else {
            // Show event details or quick actions
            showEventActions(event);
          }
        }}
        onLongPress={() => {
          if (!selectMode) {
            setSelectMode(true);
            toggleEventSelection(event.id);
          }
        }}
      >
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventTitle} numberOfLines={2}>
              {event.title}
            </Text>
            <View style={styles.badgeContainer}>
              <StatusBadge status={event.status} />
              {event.is_season_pass && (
                <View style={[styles.seasonBadge, { backgroundColor: '#FFD700' }]}>
                  <Text style={styles.seasonBadgeText}>SEASON</Text>
                </View>
              )}
            </View>
          </View>
          {selectMode && (
            <TouchableOpacity
              style={[styles.checkbox, isSelected && styles.checkedBox]}
              onPress={() => toggleEventSelection(event.id)}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.eventInfoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.eventInfoText}>
              {eventDate.toLocaleDateString()} at {event.game_time || "TBA"}
            </Text>
          </View>

          <View style={styles.eventInfoRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.eventInfoText}>
              {event.venue
                ? `${event.venue}, ${event.location}`
                : event.location}
            </Text>
          </View>

          {event.sport && (
            <View style={styles.eventInfoRow}>
              <Ionicons name="football-outline" size={16} color="#6B7280" />
              <Text style={styles.eventInfoText}>{event.sport}</Text>
            </View>
          )}

          {event.opponent && (
            <View style={styles.eventInfoRow}>
              <Ionicons
                name={event.is_home_game ? "home-outline" : "airplane-outline"}
                size={16}
                color="#6B7280"
              />
              <Text style={styles.eventInfoText}>
                {event.is_home_game ? "vs" : "at"} {event.opponent}
              </Text>
            </View>
          )}
        </View>

        {!selectMode && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: STATUS_COLORS.available },
              ]}
              onPress={() => updateEventStatus(event.id, "available")}
            >
              <Text style={styles.quickActionText}>Activate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionBtn,
                { backgroundColor: STATUS_COLORS.inactive },
              ]}
              onPress={() => updateEventStatus(event.id, "inactive")}
            >
              <Text style={styles.quickActionText}>Deactivate</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const showEventActions = (event: EventWithColleges) => {
    Alert.alert(
      "Event Actions",
      `${event.title}\n${new Date(event.event_date).toLocaleDateString()}`,
      [
        {
          text: "Edit Event Details",
          onPress: () => openEditModal(event),
        },
        {
          text: "Set Available",
          onPress: () => updateEventStatus(event.id, "available"),
        },
        {
          text: "Set Inactive",
          onPress: () => updateEventStatus(event.id, "inactive"),
        },
        {
          text: "Set Scraped",
          onPress: () => updateEventStatus(event.id, "scraped"),
        },
        {
          text: "Set Completed",
          onPress: () => updateEventStatus(event.id, "completed"),
        },
        {
          text: "Set Cancelled",
          onPress: () => updateEventStatus(event.id, "cancelled"),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const openEditModal = (event: EventWithColleges) => {
    setEditingEvent(event);
    setEditForm({
      title: event.title || '',
      event_date: event.event_date.split('T')[0], // Format as YYYY-MM-DD
      game_time: event.game_time || '',
      location: event.location || '',
      venue: event.venue || '',
      sport: event.sport || '',
      opponent: event.opponent || '',
      is_home_game: event.is_home_game ?? true,
      status: event.status,
      description: event.description || '',
      is_season_pass: event.is_season_pass ?? false
    });
    setEditModalVisible(true);
  };

  const saveEventChanges = async () => {
    if (!editingEvent) return;

    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editForm.title,
          event_date: (() => {
            let date = editForm.event_date;
            // If it's just a date (YYYY-MM-DD), add time and timezone
            if (date && !date.includes('T')) {
              date = date + 'T12:00:00.000Z'; // Use noon UTC to avoid timezone issues
            }
            // Validate the date
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
              throw new Error('Invalid date format');
            }
            return date;
          })(),
          game_time: editForm.game_time || null, // Always save game_time, set to null if empty
          location: editForm.location,
          venue: editForm.venue,
          sport: editForm.sport,
          opponent: editForm.opponent,
          is_home_game: editForm.is_home_game,
          status: editForm.status,
          description: editForm.description,
          is_season_pass: editForm.is_season_pass,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      // Update local state
      setEvents(prev => prev.map(event =>
        event.id === editingEvent.id
          ? { ...event, ...editForm }
          : event
      ));

      setEditModalVisible(false);
      setEditingEvent(null);

      Alert.alert('Success', 'Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', 'Failed to update event');
    }
  };

  const BulkActionsModal = () => (
    <Modal
      visible={bulkModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setBulkModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            Bulk Update {selectedEvents.size} Events
          </Text>

          <TouchableOpacity
            style={[
              styles.bulkActionBtn,
              { backgroundColor: STATUS_COLORS.available },
            ]}
            onPress={() => bulkUpdateStatus("available")}
          >
            <Text style={styles.bulkActionText}>Set Available</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkActionBtn,
              { backgroundColor: STATUS_COLORS.inactive },
            ]}
            onPress={() => bulkUpdateStatus("inactive")}
          >
            <Text style={styles.bulkActionText}>Set Inactive</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkActionBtn,
              { backgroundColor: STATUS_COLORS.scraped },
            ]}
            onPress={() => bulkUpdateStatus("scraped")}
          >
            <Text style={styles.bulkActionText}>Set Scraped</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkActionBtn,
              { backgroundColor: STATUS_COLORS.completed },
            ]}
            onPress={() => bulkUpdateStatus("completed")}
          >
            <Text style={styles.bulkActionText}>Set Completed</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.bulkActionBtn,
              { backgroundColor: STATUS_COLORS.cancelled },
            ]}
            onPress={() => bulkUpdateStatus("cancelled")}
          >
            <Text style={styles.bulkActionText}>Set Cancelled</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => setBulkModalVisible(false)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const statsData = {
    total: events.length,
    scraped: events.filter((e) => e.status === "scraped").length,
    available: events.filter((e) => e.status === "available").length,
    inactive: events.filter((e) => e.status === "inactive").length,
    completed: events.filter((e) => e.status === "completed").length,
    cancelled: events.filter((e) => e.status === "cancelled").length,
  };

  const updateFormField = (field: string, value: string | boolean) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <AdminLayout
      title="Event Management"
      subtitle={`${filteredEvents.length} of ${events.length} events`}
      showBackButton={true}
    >
      <View style={styles.container}>
        {selectMode && (
          <View style={styles.selectionHeader}>
            <Text style={styles.selectionText}>
              {selectedEvents.size} selected
            </Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity
                style={styles.selectionBtn}
                onPress={selectAllVisible}
              >
                <Text style={styles.selectionBtnText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.selectionBtn}
                onPress={clearSelection}
              >
                <Text style={styles.selectionBtnText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.selectionBtn, styles.bulkBtn]}
                onPress={() => setBulkModalVisible(true)}
                disabled={selectedEvents.size === 0}
              >
                <Text style={styles.selectionBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{statsData.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[styles.statNumber, { color: STATUS_COLORS.scraped }]}
                >
                  {statsData.scraped}
                </Text>
                <Text style={styles.statLabel}>Scraped</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statNumber,
                    { color: STATUS_COLORS.available },
                  ]}
                >
                  {statsData.available}
                </Text>
                <Text style={styles.statLabel}>Available</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[styles.statNumber, { color: STATUS_COLORS.inactive }]}
                >
                  {statsData.inactive}
                </Text>
                <Text style={styles.statLabel}>Inactive</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statNumber,
                    { color: STATUS_COLORS.completed },
                  ]}
                >
                  {statsData.completed}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
              <View style={styles.statItem}>
                <Text
                  style={[
                    styles.statNumber,
                    { color: STATUS_COLORS.cancelled },
                  ]}
                >
                  {statsData.cancelled}
                </Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Search and Filters */}
        <View style={styles.filtersContainer}>
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
          >
            {/* Status Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[
                  "all",
                  "scraped",
                  "available",
                  "inactive",
                  "completed",
                  "cancelled",
                ].map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      statusFilter === status && styles.activeFilterChip,
                    ]}
                    onPress={() => setStatusFilter(status)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        statusFilter === status && styles.activeFilterChipText,
                      ]}
                    >
                      {status === "all"
                        ? "All"
                        : STATUS_LABELS[status as keyof typeof STATUS_LABELS]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Sport Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Sport:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {["all", ...getUniqueValues("sport")].map((sport) => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.filterChip,
                      sportFilter === sport && styles.activeFilterChip,
                    ]}
                    onPress={() => setSportFilter(sport)}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        sportFilter === sport && styles.activeFilterChipText,
                      ]}
                    >
                      {sport === "all" ? "All Sports" : sport}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>

        {/* Events List */}
        <ScrollView
          style={styles.eventsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#18453b" />
              <Text style={styles.loadingText}>Loading events...</Text>
            </View>
          ) : Object.keys(groupedEvents).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No events found</Text>
              <Text style={styles.emptySubtitle}>
                {searchText || statusFilter !== "all" || sportFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Import some events to get started"}
              </Text>
            </View>
          ) : (
            [...colleges, { id: "none", name: "No College Affiliation" }].map(
              (college) => {
                const collegeEvents = groupedEvents[college.id] || [];
                if (collegeEvents.length === 0) return null;

                const isOpen = openColleges.has(college.id);

                return (
                  <View key={college.id} style={styles.collegeSection}>
                    <TouchableOpacity
                      style={styles.collegeHeader}
                      onPress={() => toggleCollege(college.id)}
                    >
                      <Text style={styles.collegeName}>{college.name}</Text>
                      <View style={styles.collegeHeaderRight}>
                        <Text style={styles.eventCount}>
                          {collegeEvents.length} events
                        </Text>
                        <Ionicons
                          name={isOpen ? "chevron-down" : "chevron-forward"}
                          size={20}
                          color="#6B7280"
                        />
                      </View>
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={styles.eventList}>
                        {collegeEvents.map((event) => (
                          <EventCard key={event.id} event={event} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              }
            )
          )}
        </ScrollView>

        <BulkActionsModal />
        <EditEventModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSave={saveEventChanges}
          editForm={editForm}
          updateFormField={updateFormField}
        />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#18453b",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.2)",
  },
  selectionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  selectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  selectionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 6,
  },
  bulkBtn: {
    backgroundColor: "#10B981",
  },
  selectionBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  statsContainer: {
    backgroundColor: "white",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
    marginRight: 32,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "uppercase",
    fontWeight: "500",
  },
  filtersContainer: {
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 16,
    color: "#1F2937",
  },
  filterScrollView: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterGroup: {
    marginRight: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: "#18453b",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
  },
  activeFilterChipText: {
    color: "white",
    fontWeight: "600",
  },
  eventsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: "#18453b",
  },
  expiredCard: {
    opacity: 0.6,
    backgroundColor: "#F3F4F6",
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  eventTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  seasonBadgeText: {
    color: '#1F2937',
    fontSize: 12,
    fontWeight: '600',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkedBox: {
    backgroundColor: "#18453b",
    borderColor: "#18453b",
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  eventInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  quickActions: {
    flexDirection: "row",
    gap: 8,
  },
  quickActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  quickActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    width: width * 0.8,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
    textAlign: "center",
  },
  bulkActionBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  bulkActionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginTop: 8,
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  collegeSection: {
    marginBottom: 12,
  },
  collegeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    padding: 12,
    borderRadius: 8,
  },
  collegeName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
  },
  collegeHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  eventList: {
    paddingTop: 8,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
  },
  segmentedOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  segmentedOptionActive: {
    backgroundColor: '#18453b',
  },
  segmentedOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  segmentedOptionTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  statusPicker: {
    marginTop: 4,
  },
  statusOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    borderColor: '#1F2937',
    borderWidth: 2,
  },
  statusOptionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: '#18453b',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Season Pass Toggle Styles
  seasonPassToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  seasonPassToggleActive: {
    borderColor: '#18453b',
    backgroundColor: '#F0FDF4',
  },
  seasonPassToggleContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  seasonPassToggleText: {
    marginLeft: 12,
    flex: 1,
  },
  seasonPassToggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  seasonPassToggleTitleActive: {
    color: '#18453b',
  },
  seasonPassToggleSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  toggleSwitch: {
    width: 48,
    height: 28,
    backgroundColor: '#D1D5DB',
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#18453b',
  },
  toggleSwitchThumb: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  toggleSwitchThumbActive: {
    alignSelf: 'flex-end',
  },
});
