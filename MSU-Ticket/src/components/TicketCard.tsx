import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "./Themed";
import { PriceTag } from "./PriceTag";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "./useColorScheme";

interface TicketCardProps {
  sport: string;
  event: string;
  date: string;
  price: number;
  section: string;
  row: string;
  seat: string;
  onPress?: () => void;
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
});
