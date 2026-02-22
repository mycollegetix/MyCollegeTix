// src/components/tickets/AwaitingTransferSection.tsx
// Section for buyer's purchases where seller has sent the ticket
// Buyer needs to confirm receipt - this is an action required for buyers
// Uses teal/cyan styling

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
import { InfoBanner } from "./SectionBanner";
import { OrderItem, formatEventDate } from "./types";

interface AwaitingTransferSectionProps {
  items: OrderItem[];
  expanded: boolean;
  onToggle: () => void;
  onConfirmReceipt: (item: OrderItem) => void;
  confirmingTransfer: boolean;
}

export function AwaitingTransferSection({
  items,
  expanded,
  onToggle,
  onConfirmReceipt,
  confirmingTransfer,
}: AwaitingTransferSectionProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  return (
    <CollapsibleSection
      title="Confirm Receipt"
      subtitle={`${items.length} ticket${items.length !== 1 ? "s" : ""} ready for you`}
      count={items.length}
      icon="download-outline"
      variant="awaiting"
      expanded={expanded}
      onToggle={onToggle}
      badge={{
        text: "ACTION",
        backgroundColor: "#0891b2",
        textColor: "#ffffff",
      }}
    >
      <InfoBanner text="The seller has transferred these tickets. Check your email or ticketing app, then confirm receipt." />

      {items.map((item) => (
        <View key={`awaiting-transfer-${item.id}`} style={styles.card}>
          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconContainer}>
              <Ionicons name="checkmark-circle" size={14} color="#0891b2" />
            </View>
            <Text style={styles.statusText}>
              Seller has transferred this ticket
            </Text>
          </View>

          {/* Ticket Info */}
          <View style={styles.ticketContent}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {item.title}
            </Text>

            {/* Event Details */}
            <View style={styles.eventInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={14} color="#64748b" />
                <Text style={styles.infoText}>
                  {formatEventDate(item.event_date)}
                </Text>
              </View>
              {(item.section || item.row_number || item.seat_number) && (
                <View style={styles.infoRow}>
                  <Ionicons name="location-outline" size={14} color="#64748b" />
                  <Text style={styles.infoText}>
                    {[
                      item.section && `Sec ${item.section}`,
                      item.row_number && `Row ${item.row_number}`,
                      item.seat_number && `Seat ${item.seat_number}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              )}
            </View>

            {/* Seller Info */}
            <View style={styles.sellerInfo}>
              <Ionicons name="person-outline" size={14} color="#0891b2" />
              <Text style={styles.sellerText}>
                From: {item.seller_name || "Seller"}
              </Text>
            </View>

            {/* Instructions */}
            <View style={styles.instructions}>
              <Ionicons name="information-circle" size={16} color="#0369a1" />
              <Text style={styles.instructionsText}>
                Check your email or ticketing app for the ticket. Once received,
                tap "Confirm Receipt" below.
              </Text>
            </View>

            {/* Confirm Receipt Button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                confirmingTransfer && styles.confirmButtonDisabled,
              ]}
              onPress={() => onConfirmReceipt(item)}
              disabled={confirmingTransfer}
              activeOpacity={0.8}
            >
              {confirmingTransfer ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.confirmButtonText}>Confirm Receipt</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Report Issue Button */}
            <TouchableOpacity
              style={styles.reportButton}
              onPress={() => router.push(`/dispute/${item.escrow_order_id}`)}
              activeOpacity={0.7}
            >
              <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
              <Text style={styles.reportButtonText}>Report an Issue</Text>
            </TouchableOpacity>
          </View>
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
    borderColor: "#99f6e4",
    borderLeftWidth: 4,
    borderLeftColor: "#0891b2",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#0891b2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdfa",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  statusIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#ccfbf1",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f766e",
  },
  ticketContent: {
    padding: 16,
  },
  ticketTitle: {
    fontSize: 17,
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
  sellerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sellerText: {
    fontSize: 14,
    color: "#0f766e",
    fontWeight: "500",
  },
  instructions: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
  },
  instructionsText: {
    flex: 1,
    fontSize: 13,
    color: "#0369a1",
    lineHeight: 18,
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0891b2",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
  },
  reportButtonText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default AwaitingTransferSection;
