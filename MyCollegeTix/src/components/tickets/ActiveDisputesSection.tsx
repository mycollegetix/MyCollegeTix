// src/components/tickets/ActiveDisputesSection.tsx
// Informational section for disputes under review
// Uses cool slate-blue styling to differentiate from urgent action-required sections

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CollapsibleSection } from "./CollapsibleSection";
import { InfoBanner } from "./SectionBanner";
import { OrderItem, formatEventDate } from "./types";

interface ActiveDisputesSectionProps {
  items: OrderItem[];
  expanded: boolean;
  onToggle: () => void;
  role: "buyer" | "seller"; // Determines label text (Buyer vs Seller)
}

export function ActiveDisputesSection({
  items,
  expanded,
  onToggle,
  role,
}: ActiveDisputesSectionProps) {
  const router = useRouter();

  if (items.length === 0) return null;

  const entityLabel = role === "buyer" ? "purchase" : "ticket";
  const counterpartyLabel = role === "buyer" ? "Seller" : "Buyer";

  return (
    <CollapsibleSection
      title="Active Disputes"
      subtitle={`${items.length} ${entityLabel}${items.length !== 1 ? "s" : ""} under review`}
      count={items.length}
      icon="eye-outline"
      variant="dispute"
      expanded={expanded}
      onToggle={onToggle}
      badge={{
        text: "IN REVIEW",
        backgroundColor: "#64748b",
        textColor: "#ffffff",
      }}
    >
      <InfoBanner text="These transactions are being reviewed by our team. You can add evidence to support your case." />

      {items.map((item) => (
        <View key={`dispute-${item.id}`} style={styles.card}>
          {/* Status Banner */}
          <View style={styles.statusBanner}>
            <View style={styles.statusIconContainer}>
              <Ionicons name="hourglass-outline" size={14} color="#64748b" />
            </View>
            <Text style={styles.statusText}>Under Review</Text>
          </View>

          {/* Ticket Info */}
          <View style={styles.ticketContent}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {item.title}
            </Text>

            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={14} color="#64748b" />
              <Text style={styles.infoText}>
                {formatEventDate(item.event_date)}
              </Text>
            </View>

            {/* Counterparty Info */}
            {(role === "buyer" ? item.seller_name : item.buyer_name) && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={14} color="#64748b" />
                <Text style={styles.infoText}>
                  {counterpartyLabel}:{" "}
                  <Text style={styles.infoTextBold}>
                    {role === "buyer" ? item.seller_name : item.buyer_name}
                  </Text>
                </Text>
              </View>
            )}

            {/* Price */}
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={14} color="#64748b" />
              <Text style={styles.infoText}>
                Amount: <Text style={styles.infoTextBold}>${item.price.toFixed(2)}</Text>
              </Text>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={styles.viewDisputeButton}
            onPress={() =>
              router.push(`/dispute/status/${item.dispute_id}` as any)
            }
            activeOpacity={0.7}
          >
            <View style={styles.viewDisputeButtonContent}>
              <Ionicons name="document-text-outline" size={18} color="#ffffff" />
              <Text style={styles.viewDisputeButtonText}>
                View & Add Evidence
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ffffff" />
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
    borderColor: "#cbd5e1",
    overflow: "hidden",
    marginBottom: 12,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 8,
  },
  statusIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    letterSpacing: 0.3,
  },
  ticketContent: {
    padding: 16,
    gap: 8,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
    lineHeight: 22,
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
  infoTextBold: {
    fontWeight: "600",
    color: "#334155",
  },
  viewDisputeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#475569",
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  viewDisputeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  viewDisputeButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});

export default ActiveDisputesSection;
