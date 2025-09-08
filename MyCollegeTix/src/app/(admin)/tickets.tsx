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

import AdminLayout from "@/src/components/AdminLayout";

type TicketWithDetails = Tables<"tickets"> & {
  seller: Tables<"profiles">;
  event?: Tables<"events"> | null;
  home_college?: Tables<"colleges"> | null;
  away_college?: Tables<"colleges"> | null;
};

type College = Tables<"colleges">;

export default function TicketManagement() {
  const [tickets, setTickets] = useState<TicketWithDetails[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketWithDetails[]>(
    []
  );
  const [groupedTickets, setGroupedTickets] = useState<{
    [key: string]: TicketWithDetails[];
  }>({});
  const [colleges, setColleges] = useState<College[]>([]);
  const [openColleges, setOpenColleges] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    groupAndFilterTickets();
  }, [searchText, statusFilter, tickets, colleges]);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const { data: ticketData, error: ticketError } = await supabase
        .from("tickets")
        .select(
          `
          *,
          seller:profiles!tickets_seller_id_fkey(*),
          event:events(*),
          home_college:colleges!tickets_home_college_id_fkey(*),
          away_college:colleges!tickets_away_college_id_fkey(*)
        `
        )
        .order("created_at", { ascending: false });

      if (ticketError) throw ticketError;

      const { data: collegeData, error: collegeError } = await supabase
        .from("colleges")
        .select("*")
        .order("name");

      if (collegeError) throw collegeError;

      setTickets(ticketData || []);
      setColleges(collegeData || []);
    } catch (error) {
      console.error("Error fetching tickets:", error);
      Alert.alert("Error", "Failed to load tickets");
    } finally {
      setIsLoading(false);
    }
  };

  const groupAndFilterTickets = () => {
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
          ticket.location.toLowerCase().includes(searchText.toLowerCase()) ||
          ticket.home_college?.name
            .toLowerCase()
            .includes(searchText.toLowerCase()) ||
          ticket.away_college?.name
            .toLowerCase()
            .includes(searchText.toLowerCase())
      );
    }

    // Group tickets by college
    const grouped = colleges.reduce((acc, college) => {
      acc[college.id] = [];
      return acc;
    }, {} as { [key: string]: TicketWithDetails[] });

    // Add a group for tickets with no college affiliation
    grouped["none"] = [];

    filtered.forEach((ticket) => {
      if (ticket.home_college_id) {
        if (grouped[ticket.home_college_id]) {
          grouped[ticket.home_college_id].push(ticket);
        }
      } else if (ticket.away_college_id) {
        if (grouped[ticket.away_college_id]) {
          grouped[ticket.away_college_id].push(ticket);
        }
      } else {
        grouped["none"].push(ticket);
      }
    });

    setGroupedTickets(grouped);
    setFilteredTickets(filtered);
  };

  const toggleCollege = (collegeId: string) => {
    const newOpenColleges = new Set(openColleges);
    if (newOpenColleges.has(collegeId)) {
      newOpenColleges.delete(collegeId);
    } else {
      newOpenColleges.add(collegeId);
    }
    setOpenColleges(newOpenColleges);
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { data, error } = await supabase
        .from("tickets")
        .update({ status: newStatus })
        .eq("id", ticketId)
        .select();

      if (error) {
        Alert.alert("Error", `Failed to update ticket: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        Alert.alert("Error", "Unable to update ticket. Permission denied.");
        return;
      }

      Alert.alert("Success", `Ticket status updated to ${newStatus}`);
      fetchTickets();
    } catch (error) {
      Alert.alert("Error", `Failed to update ticket status: ${error}`);
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
        {(ticket.home_college || ticket.away_college) && (
          <View style={styles.infoRow}>
            <Ionicons name="school" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              {ticket.home_college?.name} {ticket.away_college ? `vs ${ticket.away_college.name}` : ''}
            </Text>
          </View>
        )}
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
          onPress={() => {
            Alert.alert(
              "Cancel Ticket",
              `Are you sure you want to cancel this ticket: "${ticket.title}"?`,
              [
                { text: "No", style: "cancel" },
                { 
                  text: "Yes, Cancel", 
                  style: "destructive",
                  onPress: () => updateTicketStatus(ticket.id, "cancelled")
                }
              ]
            );
          }}
        >
          <Text style={styles.actionText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <AdminLayout
      title="Ticket Management"
      subtitle={`${filteredTickets.length} of ${tickets.length} tickets`}
    >
      <View style={styles.container}>
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
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading tickets...</Text>
            </View>
          ) : Object.keys(groupedTickets).length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="ticket-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptySubtitle}>
                {searchText || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No tickets have been created yet"}
              </Text>
            </View>
          ) : (
            [...colleges, { id: "none", name: "No College Affiliation" }].map(
              (college) => {
                const collegeTickets = groupedTickets[college.id] || [];
                if (collegeTickets.length === 0) return null;

                const isOpen = openColleges.has(college.id);

                return (
                  <View key={college.id} style={styles.collegeSection}>
                    <TouchableOpacity
                      style={styles.collegeHeader}
                      onPress={() => toggleCollege(college.id)}
                    >
                      <Text style={styles.collegeName}>{college.name}</Text>
                      <View style={styles.collegeHeaderRight}>
                        <Text style={styles.ticketCount}>
                          {collegeTickets.length} tickets
                        </Text>
                        <Ionicons
                          name={isOpen ? "chevron-down" : "chevron-forward"}
                          size={20}
                          color="#6B7280"
                        />
                      </View>
                    </TouchableOpacity>
                    {isOpen && (
                      <View style={styles.ticketList}>
                        {collegeTickets.map((ticket) => (
                          <TicketCard key={ticket.id} ticket={ticket} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              }
            )
          )}
        </ScrollView>
      </View>
    </AdminLayout>
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
  ticketCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  ticketList: {
    paddingTop: 8,
  },
});
