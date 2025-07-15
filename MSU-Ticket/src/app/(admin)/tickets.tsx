// src/app/(admin)/tickets.tsx
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/src/lib/supabase";
import { Tables } from "@/src/types/database.types";

type TicketWithDetails = Tables<"tickets"> & {
  seller: Tables<"profiles">;
  event?: Tables<"events"> | null;
};

export default function TicketManagement() {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketWithDetails[]>(
    []
  );
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [searchText, statusFilter, tickets]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey(*),
          event:events(*)
        `
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Alert.alert("Error", "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (statusFilter !== "all") {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    if (searchText.trim()) {
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(searchText.toLowerCase()) ||
          ticket.seller.full_name
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          ticket.sport?.toLowerCase().includes(searchText.toLowerCase()) ||
          ticket.location.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId);

      if (error) throw error;

      Alert.alert("Success", `Ticket status updated to ${newStatus}`);
      fetchTickets();
    } catch (error) {
      console.error("Error updating ticket:", error);
      Alert.alert("Error", "Failed to update ticket status");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "#16a34a";
      case "sold":
        return "#dc2626";
      case "cancelled":
        return "#6b7280";
      default:
        return "#6b7280";
    }
  };

  const TicketCard = ({ ticket }: { ticket: TicketWithDetails }) => (
    <View style={styles.ticketCard}>
      <View style={styles.ticketHeader}>
        <Text style={styles.ticketTitle}>{ticket.title}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(ticket.status) },
          ]}
        >
          <Text style={styles.statusText}>{ticket.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.ticketInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="person" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{ticket.seller.full_name}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash" size={16} color="#6b7280" />
          <Text style={styles.infoText}>${ticket.price}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#6b7280" />
          <Text style={styles.infoText}>{ticket.location}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar" size={16} color="#6b7280" />
          <Text style={styles.infoText}>
            {new Date(ticket.event_date).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.ticketActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#16a34a" }]}
          onPress={() => updateTicketStatus(ticket.id, "available")}
        >
          <Text style={styles.actionText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: "#dc2626" }]}
          onPress={() => updateTicketStatus(ticket.id, "cancelled")}
        >
          <Text style={styles.actionText}>Cancel</Text>
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
          <Text style={styles.headerTitle}>Ticket Management</Text>
          <Text style={styles.headerSubtitle}>
            {tickets.length} total tickets
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.filtersContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilters}
        >
          {["all", "available", "sold", "cancelled"].map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                statusFilter === status && styles.activeFilter,
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterText,
                  statusFilter === status && styles.activeFilterText,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.ticketsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredTickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </ScrollView>
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
  ticketsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  ticketCard: {
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
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  ticketInfo: {
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
  ticketActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    flex: 1,
    alignItems: "center",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});
