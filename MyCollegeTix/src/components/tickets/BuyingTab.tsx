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
import { BuyerAwaitingTransferSection } from "./BuyerAwaitingTransferSection";
import { CollapsibleSection } from "./CollapsibleSection";
import { TicketCard } from "./TicketCard";
import { OrderItem, ThemeColors } from "./types";

interface BuyingTabProps {
  data: {
    disputed: OrderItem[];
    actionRequired: OrderItem[];
    awaitingTransfer: OrderItem[];
    purchased: OrderItem[];
  };
  theme: ThemeColors;
  onConfirmReceipt: (item: OrderItem) => void;
  confirmingTransfer: boolean;
  onRateSeller: (item: OrderItem) => void;
  hasPurchases: boolean;
}

export function BuyingTab({
  data,
  theme,
  onConfirmReceipt,
  confirmingTransfer,
  onRateSeller,
  hasPurchases,
}: BuyingTabProps) {
  const router = useRouter();

  // Section expand/collapse state — managed locally
  const [disputedExpanded, setDisputedExpanded] = useState(true);
  const [confirmReceiptExpanded, setConfirmReceiptExpanded] = useState(true);
  const [awaitingTransferExpanded, setAwaitingTransferExpanded] = useState(true);
  const [purchasedExpanded, setPurchasedExpanded] = useState(true);

  const renderOrder = ({ item }: { item: OrderItem }) => (
    <TicketCard
      item={item}
      activeTab="bought"
      theme={theme}
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

      {/* Confirm Receipt Section (transfer_pending — seller has sent) */}
      <AwaitingTransferSection
        items={data.actionRequired}
        expanded={confirmReceiptExpanded}
        onToggle={() => setConfirmReceiptExpanded(!confirmReceiptExpanded)}
        onConfirmReceipt={onConfirmReceipt}
        confirmingTransfer={confirmingTransfer}
      />

      {/* Awaiting Transfer Section (payment_held — seller hasn't sent yet) */}
      <BuyerAwaitingTransferSection
        items={data.awaitingTransfer}
        expanded={awaitingTransferExpanded}
        onToggle={() => setAwaitingTransferExpanded(!awaitingTransferExpanded)}
      />

      {/* Purchased — completed purchases */}
      {data.purchased.length > 0 && (
        <CollapsibleSection
          title="Purchased"
          subtitle={`${data.purchased.length} completed purchase${data.purchased.length !== 1 ? "s" : ""}`}
          count={data.purchased.length}
          icon="checkmark-done-outline"
          variant="sold"
          expanded={purchasedExpanded}
          onToggle={() => setPurchasedExpanded(!purchasedExpanded)}
        >
          <FlatList
            data={data.purchased}
            renderItem={renderOrder}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
            removeClippedSubviews={Platform.OS === "android"}
            keyboardShouldPersistTaps="handled"
          />
        </CollapsibleSection>
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
});

export default BuyingTab;
