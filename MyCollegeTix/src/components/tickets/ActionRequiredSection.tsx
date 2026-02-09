// src/components/tickets/ActionRequiredSection.tsx
// Urgent action required section with amber/orange styling
// Used for pending transfers that require immediate seller action

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CollapsibleSection } from "./CollapsibleSection";
import { WarningBanner } from "./SectionBanner";
import { TicketTransferButton } from "@/src/components/TicketTransferButton";
import {
  OrderItem,
  ThemeColors,
  getTimeRemaining,
  formatEventDate,
  formatEventTime,
  formatSaleDate,
} from "./types";

interface ActionRequiredSectionProps {
  items: OrderItem[];
  expanded: boolean;
  onToggle: () => void;
  onMarkTransfer: (item: OrderItem) => void;
  markingTransferId: string | null;
  theme: ThemeColors;
}

export function ActionRequiredSection({
  items,
  expanded,
  onToggle,
  onMarkTransfer,
  markingTransferId,
  theme,
}: ActionRequiredSectionProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <CollapsibleSection
      title="Action Required"
      subtitle={`${items.length} ticket${items.length !== 1 ? "s" : ""} need your attention`}
      count={items.length}
      icon="flash"
      variant="action-required"
      expanded={expanded}
      onToggle={onToggle}
      badge={{
        text: "URGENT",
        backgroundColor: "#dc2626",
        textColor: "#ffffff",
      }}
    >
      <WarningBanner text="Transfer these tickets now to avoid refunds and account penalties." />

      {items.map((item) => {
        const timeRemaining = item.transfer_deadline
          ? getTimeRemaining(item.transfer_deadline)
          : null;

        return (
          <View key={`action-${item.id}`} style={styles.card}>
            {/* Urgency Banner */}
            <View
              style={[
                styles.urgencyBanner,
                timeRemaining?.expired && styles.urgencyBannerExpired,
                timeRemaining?.urgent &&
                  !timeRemaining?.expired &&
                  styles.urgencyBannerUrgent,
                !timeRemaining?.urgent &&
                  !timeRemaining?.expired &&
                  styles.urgencyBannerNormal,
              ]}
            >
              <Ionicons
                name={timeRemaining?.expired ? "alert" : "time"}
                size={14}
                color={
                  timeRemaining?.expired
                    ? "#7f1d1d"
                    : timeRemaining?.urgent
                      ? "#92400e"
                      : "#1e40af"
                }
              />
              <Text
                style={[
                  styles.urgencyText,
                  timeRemaining?.expired && styles.urgencyTextExpired,
                  timeRemaining?.urgent &&
                    !timeRemaining?.expired &&
                    styles.urgencyTextUrgent,
                  !timeRemaining?.urgent &&
                    !timeRemaining?.expired &&
                    styles.urgencyTextNormal,
                ]}
              >
                {timeRemaining?.text || "Transfer ASAP"}
              </Text>
            </View>

            {/* Ticket Info */}
            <TouchableOpacity
              style={styles.ticketContent}
              onPress={() => router.push(`/ticket-details/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={styles.ticketHeader}>
                <View
                  style={[styles.sportBadge, { backgroundColor: theme.primary }]}
                >
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
                <Text style={styles.eventDate}>
                  {formatEventDate(item.event_date)} at{" "}
                  {formatEventTime(item.event_date)}
                </Text>
                {item.section && (
                  <Text style={styles.seatInfo}>
                    Sec {item.section}, Row {item.row_number}, Seat{" "}
                    {item.seat_number}
                  </Text>
                )}
              </View>

              {/* Buyer Info */}
              {item.buyer_name && (
                <View style={styles.buyerInfo}>
                  <View style={styles.buyerIconContainer}>
                    <Ionicons name="person" size={16} color="#f59e0b" />
                  </View>
                  <View style={styles.buyerDetails}>
                    <Text style={styles.buyerLabel}>Sold to</Text>
                    <Text style={styles.buyerName}>{item.buyer_name}</Text>
                    {item.sold_at && (
                      <Text style={styles.soldDate}>
                        {formatSaleDate(item.sold_at)}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Transfer Portal Button */}
              {(item.home_college_id || item.away_college_id) && (
                <TicketTransferButton
                  collegeId={item.home_college_id || item.away_college_id || ""}
                  ticketInfo={{
                    title: item.title,
                    eventDate: new Date(item.event_date).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    ),
                    section: item.section,
                    row: item.row_number,
                    seat: item.seat_number,
                  }}
                  variant="outline"
                  size="medium"
                  style={styles.transferPortalButton}
                />
              )}

              {/* Mark as Transferred Button */}
              <TouchableOpacity
                style={[
                  styles.markTransferredButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={() => onMarkTransfer(item)}
                disabled={markingTransferId === item.escrow_order_id}
                activeOpacity={0.8}
              >
                {markingTransferId === item.escrow_order_id ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="white" />
                    <Text style={styles.markTransferredButtonText}>
                      I've Transferred the Ticket
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* View Order Details Link */}
              <TouchableOpacity
                style={styles.viewOrderButton}
                onPress={() =>
                  router.push(`/orders/${item.escrow_order_id}` as any)
                }
                activeOpacity={0.7}
              >
                <Text style={styles.viewOrderButtonText}>View Order Details</Text>
                <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </CollapsibleSection>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fcd34d",
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  urgencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  urgencyBannerExpired: {
    backgroundColor: "#fef2f2",
  },
  urgencyBannerUrgent: {
    backgroundColor: "#fffbeb",
  },
  urgencyBannerNormal: {
    backgroundColor: "#eff6ff",
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  urgencyTextExpired: {
    color: "#7f1d1d",
  },
  urgencyTextUrgent: {
    color: "#92400e",
  },
  urgencyTextNormal: {
    color: "#1e40af",
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
    fontSize: 17,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    lineHeight: 22,
  },
  eventInfo: {
    marginBottom: 12,
  },
  eventDate: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },
  seatInfo: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  buyerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fef3c7",
  },
  buyerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef3c7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  buyerDetails: {
    flex: 1,
  },
  buyerLabel: {
    fontSize: 12,
    color: "#92400e",
    fontWeight: "500",
  },
  buyerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#78350f",
  },
  soldDate: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 2,
  },
  actions: {
    padding: 12,
    paddingTop: 0,
    gap: 10,
  },
  transferPortalButton: {
    alignSelf: "stretch",
  },
  markTransferredButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  markTransferredButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  viewOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  viewOrderButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ActionRequiredSection;
