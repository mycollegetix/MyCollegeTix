import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { Text, View } from "@/src/components/Themed";
import { TicketCard } from "@/src/components/TicketCard";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";

// Mock data - we'll replace this with real data from Supabase later
const mockOrders = {
  buying: [
    {
      id: "1",
      sport: "Football",
      event: "MSU vs Michigan",
      date: "Oct 21, 2024 • 7:30 PM",
      price: 150.0,
      section: "25",
      row: "G",
      seat: "12",
      status: "Confirmed",
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
      status: "Pending",
    },
  ],
  selling: [
    {
      id: "3",
      sport: "Hockey",
      event: "MSU vs Notre Dame",
      date: "Dec 5, 2024 • 6:00 PM",
      price: 45.0,
      section: "8",
      row: "K",
      seat: "15",
      status: "Listed",
    },
  ],
};

type OrderType = "buying" | "selling";

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<OrderType>("buying");
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const renderTab = (tab: OrderType, label: string) => (
    <TouchableOpacity
      style={[
        styles.tab,
        activeTab === tab && { borderBottomColor: colors.primary },
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text
        style={[styles.tabText, activeTab === tab && { color: colors.primary }]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOrder = ({ item }: { item: (typeof mockOrders.buying)[0] }) => (
    <View style={styles.orderContainer}>
      <TicketCard
        sport={item.sport}
        event={item.event}
        date={item.date}
        price={item.price}
        section={item.section}
        row={item.row}
        seat={item.seat}
      />
      <View style={[styles.statusBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        {renderTab("buying", "Buying")}
        {renderTab("selling", "Selling")}
      </View>

      <FlatList
        data={mockOrders[activeTab]}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No {activeTab === "buying" ? "purchases" : "listings"} yet
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  list: {
    padding: 15,
  },
  orderContainer: {
    marginBottom: 20,
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
  },
});
