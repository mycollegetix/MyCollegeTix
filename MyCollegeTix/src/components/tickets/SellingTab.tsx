// src/components/tickets/SellingTab.tsx
// Selling tab content with collapsible sections for the Tickets screen

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
import { ActionRequiredSection } from "./ActionRequiredSection";
import { ActiveDisputesSection } from "./ActiveDisputesSection";
import { AwaitingConfirmationSection } from "./AwaitingConfirmationSection";
import { TicketCard } from "./TicketCard";
import { OrderItem, ThemeColors } from "./types";

interface SellingTabProps {
  data: {
    disputed: OrderItem[];
    pendingTransfers: OrderItem[];
    awaitingConfirmation: OrderItem[];
    active: OrderItem[];
    sold: OrderItem[];
    cancelled: OrderItem[];
    expired: OrderItem[];
  };
  theme: ThemeColors;
  onMarkTransfer: (item: OrderItem) => void;
  markingTransferId: string | null;
  onEdit: (item: OrderItem) => void;
  onCancel: (id: string) => void;
  onRateSeller: (item: OrderItem) => void;
}

export function SellingTab({
  data,
  theme,
  onMarkTransfer,
  markingTransferId,
  onEdit,
  onCancel,
  onRateSeller,
}: SellingTabProps) {
  const router = useRouter();

  // Section expand/collapse state — managed locally
  const [disputedExpanded, setDisputedExpanded] = useState(true);
  const [pendingTransfersExpanded, setPendingTransfersExpanded] = useState(true);
  const [awaitingConfirmationExpanded, setAwaitingConfirmationExpanded] =
    useState(true);
  const [activeListingsExpanded, setActiveListingsExpanded] = useState(true);
  const [soldExpanded, setSoldExpanded] = useState(false);
  const [cancelledExpanded, setCancelledExpanded] = useState(false);
  const [expiredExpanded, setExpiredExpanded] = useState(false);

  const renderOrder = ({ item }: { item: OrderItem }) => (
    <TicketCard
      item={item}
      activeTab="selling"
      theme={theme}
      onEdit={onEdit}
      onCancel={onCancel}
      onRateSeller={onRateSeller}
    />
  );

  const isEmpty =
    data.active.length === 0 &&
    data.sold.length === 0 &&
    data.cancelled.length === 0 &&
    data.expired.length === 0 &&
    data.disputed.length === 0 &&
    data.pendingTransfers.length === 0 &&
    data.awaitingConfirmation.length === 0;

  if (isEmpty) {
    return (
      <BlurView intensity={20} style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="storefront-outline" size={48} color="#6b7280" />
        </View>
        <Text style={styles.emptyStateTitle}>No listings yet</Text>
        <Text style={styles.emptyStateText}>
          Create your first ticket listing to start selling
        </Text>
        <TouchableOpacity
          style={[styles.clearFiltersButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push("/(tabs)/sell")}
        >
          <Text style={styles.clearFiltersText}>List a Ticket</Text>
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
        role="seller"
      />

      {/* Action Required Section */}
      <ActionRequiredSection
        items={data.pendingTransfers}
        expanded={pendingTransfersExpanded}
        onToggle={() => setPendingTransfersExpanded(!pendingTransfersExpanded)}
        onMarkTransfer={onMarkTransfer}
        markingTransferId={markingTransferId}
        theme={theme}
      />

      {/* Awaiting Confirmation Section */}
      <AwaitingConfirmationSection
        items={data.awaitingConfirmation}
        expanded={awaitingConfirmationExpanded}
        onToggle={() =>
          setAwaitingConfirmationExpanded(!awaitingConfirmationExpanded)
        }
      />

      {/* Active Listings Section */}
      {data.active.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.activeListingsHeader}
            onPress={() => setActiveListingsExpanded(!activeListingsExpanded)}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons name="storefront" size={20} color={theme.primary} />
              <Text style={styles.activeListingsTitle}>Active Listings</Text>
              <Text style={styles.sectionCount}>
                ({data.active.length})
              </Text>
            </View>
            <Ionicons
              name={activeListingsExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {activeListingsExpanded && (
            <FlatList
              data={data.active}
              renderItem={renderOrder}
              keyExtractor={(item) => `active-${item.id}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={Platform.OS === "android"}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}

      {/* Sold Tickets Section */}
      {data.sold.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.soldTicketsHeader}
            onPress={() => setSoldExpanded(!soldExpanded)}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
              <Text style={styles.soldTicketsTitle}>Sold Tickets</Text>
              <Text style={styles.soldTicketsCount}>
                ({data.sold.length})
              </Text>
            </View>
            <Ionicons
              name={soldExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {soldExpanded && (
            <FlatList
              data={data.sold}
              renderItem={renderOrder}
              keyExtractor={(item) => `sold-${item.id}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={Platform.OS === "android"}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}

      {/* Cancelled Tickets Section */}
      {data.cancelled.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.cancelledTicketsHeader}
            onPress={() => setCancelledExpanded(!cancelledExpanded)}
          >
            <View style={styles.sectionHeaderContent}>
              <Ionicons name="close-circle" size={20} color="#dc2626" />
              <Text style={styles.cancelledTicketsTitle}>
                Cancelled Tickets
              </Text>
              <Text style={styles.cancelledTicketsCount}>
                ({data.cancelled.length})
              </Text>
            </View>
            <Ionicons
              name={cancelledExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>

          {cancelledExpanded && (
            <FlatList
              data={data.cancelled}
              renderItem={renderOrder}
              keyExtractor={(item) => `cancelled-${item.id}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={Platform.OS === "android"}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}

      {/* Expired Listings Section */}
      {data.expired.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.expiredListingsHeader}
            onPress={() => setExpiredExpanded(!expiredExpanded)}
          >
            <View style={styles.expiredListingsHeaderContent}>
              <View style={styles.expiredIconContainer}>
                <Ionicons name="time-outline" size={20} color="#6b7280" />
              </View>
              <View style={styles.expiredListingsHeaderText}>
                <Text style={styles.expiredListingsTitle}>
                  Expired Listings
                </Text>
                <Text style={styles.expiredListingsSubtitle}>
                  {data.expired.length} ticket
                  {data.expired.length !== 1 ? "s" : ""} - event has passed
                </Text>
              </View>
              <Ionicons
                name={expiredExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#6b7280"
              />
            </View>
          </TouchableOpacity>

          {expiredExpanded && (
            <FlatList
              data={data.expired}
              renderItem={renderOrder}
              keyExtractor={(item) => `expired-${item.id}`}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
              removeClippedSubviews={Platform.OS === "android"}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // Section headers
  activeListingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  activeListingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 8,
    flex: 1,
  },
  sectionCount: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    marginRight: 8,
  },
  soldTicketsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f0f9ff",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e0f2fe",
    marginTop: 8,
  },
  soldTicketsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#16a34a",
    marginLeft: 8,
    flex: 1,
  },
  soldTicketsCount: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "500",
    marginRight: 8,
  },
  cancelledTicketsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fef2f2",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#fecaca",
    marginTop: 8,
  },
  cancelledTicketsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#dc2626",
    marginLeft: 8,
    flex: 1,
  },
  cancelledTicketsCount: {
    fontSize: 14,
    color: "#b91c1c",
    fontWeight: "500",
    marginRight: 8,
  },
  expiredListingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#f3f4f6",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 12,
    marginBottom: 12,
    marginTop: 8,
  },
  expiredListingsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  expiredIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  expiredListingsHeaderText: {
    flex: 1,
  },
  expiredListingsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b7280",
  },
  expiredListingsSubtitle: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  // Empty state
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

export default SellingTab;
