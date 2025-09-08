import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "./Themed";
import { PriceTag } from "./PriceTag";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "./useColorScheme";
import StarRating from "./StarRating";
import TrustedBadge from "./TrustedBadge";

interface TicketCardProps {
  sport: string;
  event: string;
  date: string;
  price: number;
  section: string;
  row: string;
  seat: string;
  onPress?: () => void;
  // Seller trust information
  sellerName?: string;
  sellerTransactionCount?: number;
  isTrustedSeller?: boolean;
  showSellerInfo?: boolean;
}

export function TicketCard({
  sport,
  event,
  date,
  price,
  section,
  row,
  seat,
  onPress,
  sellerName,
  sellerTransactionCount,
  isTrustedSeller = false,
  showSellerInfo = false,
}: TicketCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.sportBadge, { backgroundColor: colors.primary }]}>
        <Text style={styles.sportText}>{sport}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.event} numberOfLines={2}>
          {event}
        </Text>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.details}>
          <Text style={styles.location}>
            Section {section} • Row {row} • Seat {seat}
          </Text>
          <PriceTag price={price} size="medium" />
        </View>
        
        {/* Seller Info */}
        {showSellerInfo && sellerName && (
          <View style={[styles.sellerInfo, { borderTopColor: colors.border }]}>
            <View style={styles.sellerDetails}>
              <View style={styles.sellerNameRow}>
                <Text style={[styles.sellerLabel, { color: colors.textSecondary }]}>
                  Seller:
                </Text>
                <Text style={[styles.sellerName, { color: colors.text }]} numberOfLines={1}>
                  {sellerName}
                </Text>
                {isTrustedSeller && (
                  <TrustedBadge isTrusted={isTrustedSeller} size="small" />
                )}
              </View>
              
              {sellerTransactionCount !== undefined ? (
                <Text style={[styles.transactionCount, { color: colors.textSecondary }]}>
                  {sellerTransactionCount === 0 ? 'New seller' : `${sellerTransactionCount} transaction${sellerTransactionCount !== 1 ? 's' : ''}`}
                </Text>
              ) : (
                <Text style={[styles.noRating, { color: colors.textSecondary }]}>
                  New seller
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
  },
  sportBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: "flex-start",
    margin: 12,
  },
  sportText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    padding: 12,
    paddingTop: 0,
  },
  event: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  details: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  location: {
    fontSize: 14,
    color: "#666",
    flex: 1,
    marginRight: 8,
  },
  sellerInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  sellerDetails: {
    gap: 6,
  },
  sellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sellerLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  transactionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  noRating: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
