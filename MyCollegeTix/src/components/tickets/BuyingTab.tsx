// src/components/tickets/BuyingTab.tsx
// Buying tab content with collapsible sections for the Tickets screen

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { ActiveDisputesSection } from "./ActiveDisputesSection";
import { AwaitingTransferSection } from "./AwaitingTransferSection";
import { TicketCard } from "./TicketCard";
import { OrderItem, ThemeColors } from "./types";

interface BuyingTabProps {
  data: {
    disputed: OrderItem[];
    awaitingTransfer: OrderItem[];
    other: OrderItem[];
  };
  theme: ThemeColors;
  onConfirmReceipt: (item: OrderItem) => void;
  confirmingTransfer: boolean;
  onEdit: (item: OrderItem) => void;
  onCancel: (id: string) => void;
  onRateSeller: (item: OrderItem) => void;
  hasPurchases: boolean;
}

export function BuyingTab({
  data,
  theme,
  onConfirmReceipt,
  confirmingTransfer,
  onEdit,
  onCancel,
  onRateSeller,
  hasPurchases,
}: BuyingTabProps) {
  const router = useRouter();

  // Section expand/collapse state — managed locally
  const [disputedExpanded, setDisputedExpanded] = useState(true);
  const [awaitingTransferExpanded, setAwaitingTransferExpanded] = useState(true);

  const renderOrder = ({ item }: { item: OrderItem }) => (
    <TicketCard
      item={item}
      activeTab="bought"
      theme={theme}
      onEdit={onEdit}
      onCancel={onCancel}
      onRateSeller={onRateSeller}
    />
  );

  if (!hasPurchases) {
    return (
      <BlurView intensity={20} style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="receipt-outline" size={48} color="#6b7280" />
        </View>
        <Text style={styles.emptyStateTitle}>No purchases yet</Text>
        <Text style={styles.emptyStateText}>
          Browse tickets to make your first purchase
        </Text>
        <TouchableOpacity
          style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/")}
        >
          <Text style={styles.clearFiltersText}>Browse Tickets</Text>
        </TouchableOpacity>
      </BlurView>
    );
  }

  return (
    <>
      {/* Active Disputes Section */}
      <ActiveDisputesSection
        items={data.disputed}
        expanded={disputedExpanded}
        onToggle={() => setDisputedExpanded(!disputedExpanded)}
        role="buyer"
      />

      {/* Awaiting Transfer Section */}
      <AwaitingTransferSection
        items={data.awaitingTransfer}
        expanded={awaitingTransferExpanded}
        onToggle={() =>
          setAwaitingTransferExpanded(!awaitingTransferExpanded)
        }
        onConfirmReceipt={onConfirmReceipt}
        confirmingTransfer={confirmingTransfer}
      />

      {/* Other Purchases */}
      {data.other.length > 0 && (
        <FlatList
          data={data.other}
          renderItem={renderOrder}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          removeClippedSubviews={Platform.OS === "android"}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {data.awaitingTransfer.length > 0 && data.other.length === 0 && (
        <View style={styles.otherPurchasesEmpty}>
          <Text style={styles.otherPurchasesEmptyText}>
            Your confirmed purchases will appear here
          </Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
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
  otherPurchasesEmpty: {
    padding: 16,
    alignItems: "center",
  },
  otherPurchasesEmptyText: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
  },
});

export default BuyingTab;
