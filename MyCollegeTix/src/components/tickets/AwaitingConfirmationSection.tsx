// src/components/tickets/AwaitingConfirmationSection.tsx
// Section for seller's tickets that have been transferred but awaiting buyer confirmation
// Uses purple/violet styling to indicate "waiting" status

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CollapsibleSection } from "./CollapsibleSection";
import { InfoBanner } from "./SectionBanner";
import { OrderItem, formatEventDate, formatEventTime } from "./types";

interface AwaitingConfirmationSectionProps {
  items: OrderItem[];
  expanded: boolean;
  onToggle: () => void;
}

export function AwaitingConfirmationSection({
  items,
  expanded,
  onToggle,
}: AwaitingConfirmationSectionProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <CollapsibleSection
      title="Awaiting Confirmation"
      subtitle={`${items.length} ticket${items.length !== 1 ? "s" : ""} waiting for buyer`}
      count={items.length}
      icon="time-outline"
      variant="awaiting-confirmation"
      expanded={expanded}
      onToggle={onToggle}
      badge={{
        text: "PENDING",
        backgroundColor: "#8b5cf6",
        textColor: "#ffffff",
      }}
    >
      <InfoBanner text="You've transferred these tickets. Waiting for buyers to confirm receipt." />

      {items.map((item) => (
        <View key={`awaiting-conf-${item.id}`} style={styles.card}>
          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconContainer}>
              <Ionicons name="checkmark-done" size={14} color="#8b5cf6" />
            </View>
            <Text style={styles.statusText}>
              Transfer sent - Waiting for buyer
            </Text>
          </View>

          {/* Ticket Info */}
          <TouchableOpacity
            style={styles.ticketContent}
            onPress={() => router.push(`/ticket-details/${item.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.ticketHeader}>
              <View style={styles.sportBadge}>
                <Text style={styles.sportBadgeText}>
                  {item.sport || "Event"}
                </Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
              </View>
            </View>

            <Text style={styles.ticketTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Event Details */}
            <View style={styles.eventInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.infoText}>
                  {formatEventDate(item.event_date)} at{" "}
                  {formatEventTime(item.event_date)}
                </Text>
              </View>
              {item.section && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.infoText}>
                    Sec {item.section}, Row {item.row_number}, Seat{" "}
                    {item.seat_number}
                  </Text>
                </View>
              )}
            </View>

            {/* Buyer Info */}
            {item.buyer_name && (
              <View style={styles.buyerInfo}>
                <Ionicons name="person-outline" size={14} color="#8b5cf6" />
                <Text style={styles.buyerText}>
                  Sold to{" "}
                  <Text style={styles.buyerName}>{item.buyer_name}</Text>
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* View Order Details */}
          <TouchableOpacity
            style={styles.viewOrderButton}
            onPress={() =>
              router.push(`/orders/${item.escrow_order_id}` as any)
            }
            activeOpacity={0.7}
          >
            <Text style={styles.viewOrderButtonText}>View Order Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
      ))}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d8b4fe",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#8b5cf6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#faf5ff",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  statusIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ede9fe",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b21a8",
  },
  ticketContent: {
    padding: 16,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sportBadge: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sportBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  priceContainer: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  priceText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 10,
    lineHeight: 22,
  },
  eventInfo: {
    gap: 6,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: "#64748b",
  },
  buyerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#faf5ff",
    padding: 10,
    borderRadius: 8,
  },
  buyerText: {
    fontSize: 14,
    color: "#6b21a8",
  },
  buyerName: {
    fontWeight: "600",
  },
  viewOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ede9fe",
    gap: 4,
  },
  viewOrderButtonText: {
    color: "#8b5cf6",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AwaitingConfirmationSection;
