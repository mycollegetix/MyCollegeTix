// src/components/EventFolder.tsx - Clean Event Folder Component
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  AccessibilityInfo,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "../providers/ThemeProvider";
import { EventGroup } from "../utils/eventGroupingUtils";
import { TicketWithSeller } from "../types/database.types";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface EventFolderProps {
  eventGroup: EventGroup;
  isExpanded: boolean;
  onToggle: (groupId: string) => void;
  onTicketPress: (ticket: TicketWithSeller) => void;
  renderTicket: (ticket: TicketWithSeller) => React.ReactNode;
  searchQuery?: string;
}

export const EventFolder: React.FC<EventFolderProps> = ({
  eventGroup,
  isExpanded,
  onToggle,
  onTicketPress,
  renderTicket,
  searchQuery,
}) => {
  const theme = useTheme();
  const rotationAnim = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
  const [layoutHeight, setLayoutHeight] = useState(0);

  // Animation for rotation
  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotationAnim]);

  // Layout animation for expansion
  useEffect(() => {
    if (Platform.OS === "ios") {
      LayoutAnimation.configureNext({
        duration: 300,
        create: { type: "easeInEaseOut", property: "opacity" },
        update: { type: "easeInEaseOut" },
        delete: { type: "easeInEaseOut", property: "opacity" },
      });
    }
  }, [isExpanded]);

  const handleToggle = () => {
    onToggle(eventGroup.id);

    // Announce to screen readers
    const announcement = isExpanded
      ? `Collapsed ${eventGroup.eventName}`
      : `Expanded ${eventGroup.eventName}, ${eventGroup.ticketCount} tickets`;

    if (Platform.OS === "ios") {
      AccessibilityInfo.announceForAccessibility(announcement);
    }
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const getPriceRange = () => {
    const prices = eventGroup.tickets.map((t) => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    if (minPrice === maxPrice) {
      return `$${minPrice.toFixed(2)}`;
    }
    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  };

  return (
    <View style={styles.container}>
      {/* Folder Header */}
      <TouchableOpacity
        style={[styles.header, { borderColor: `${theme.primary}20` }]}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${eventGroup.eventName}, ${
          eventGroup.ticketCount
        } tickets available, ${isExpanded ? "expanded" : "collapsed"}`}
        accessibilityHint={
          isExpanded
            ? "Tap to collapse tickets"
            : "Tap to expand and view tickets"
        }
      >
        <BlurView intensity={10} style={styles.headerBlur}>
          <LinearGradient
            colors={["rgba(255, 255, 255, 0.95)", "rgba(255, 255, 255, 0.85)"]}
            style={styles.headerGradient}
          >
            {/* Top Row - Price and Badges */}
            <View style={styles.topRow}>
              {/* Price Range - Top Left */}
              <Text style={[styles.priceRange, { color: theme.primary }]}>
                {getPriceRange()}
              </Text>

              {/* Right Section - Badges and Toggle */}
              <View style={styles.topRight}>
                <View style={styles.badgesContainer}>
                  <View style={styles.badgesTopRow}>
                    {/* Sport Badge */}
                    {eventGroup.sport && (
                      <View
                        style={[
                          styles.sportBadge,
                          { backgroundColor: `${theme.primary}15` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.sportBadgeText,
                            { color: theme.primary },
                          ]}
                        >
                          {eventGroup.sport.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Ticket Count Badge */}
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: theme.primary },
                      ]}
                    >
                      <Text style={styles.countBadgeText}>
                        {eventGroup.ticketCount}
                      </Text>
                    </View>
                  </View>

                  {/* Season Pass Badge - Below sport badge when present */}
                  {eventGroup.isSeasonPass && (
                    <View style={styles.badgesBottomRow}>
                      <View
                        style={[
                          styles.seasonBadge,
                          { backgroundColor: theme.secondary },
                        ]}
                      >
                        <Text style={styles.seasonBadgeText}>SEASON</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Expand/Collapse Arrow */}
                <Animated.View style={{ transform: [{ rotate: rotation }] }}>
                  <Ionicons
                    name="chevron-down"
                    size={24}
                    color={theme.primary}
                  />
                </Animated.View>
              </View>
            </View>

            {/* Bottom Row - Event Title */}
            <View style={styles.bottomRow}>
              <View style={styles.iconContainer}>
                {eventGroup.sportIcon?.includes("run") ? (
                  <MaterialCommunityIcons
                    name={eventGroup.sportIcon as any}
                    size={20}
                    color={theme.primary}
                  />
                ) : (
                  <Ionicons
                    name={(eventGroup.sportIcon || "calendar-outline") as any}
                    size={20}
                    color={theme.primary}
                  />
                )}
              </View>

              <View style={styles.eventInfo}>
                <Text
                  style={[styles.eventTitle, { color: theme.primary }]}
                  numberOfLines={2}
                >
                  {eventGroup.eventName}
                </Text>
                <Text style={[styles.eventDate, { color: `${theme.primary}80` }]}>
                  {eventGroup.displayDate}
                </Text>
              </View>
            </View>

            {/* College Matchup Strip */}
            {eventGroup.collegeMatchup && (
              <View
                style={[
                  styles.matchupStrip,
                  { backgroundColor: `${theme.primary}08` },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={14}
                  color={theme.primary}
                />
                <Text style={[styles.matchupText, { color: theme.primary }]}>
                  {eventGroup.collegeMatchup}
                </Text>
              </View>
            )}
          </LinearGradient>
        </BlurView>
      </TouchableOpacity>

      {/* Expandable Ticket List */}
      {isExpanded && (
        <View
          style={styles.ticketList}
          onLayout={(event) => {
            setLayoutHeight(event.nativeEvent.layout.height);
          }}
        >
          {eventGroup.tickets.map((ticket, index) => (
            <View key={ticket.id} style={styles.ticketContainer}>
              {renderTicket(ticket)}
            </View>
          ))}

          {/* Ticket List Footer */}
          <View
            style={[
              styles.listFooter,
              { borderTopColor: `${theme.primary}10` },
            ]}
          >
            <Text style={[styles.footerText, { color: theme.primary }]}>
              {eventGroup.ticketCount} ticket
              {eventGroup.ticketCount !== 1 ? "s" : ""} for this event
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
  },
  headerBlur: {
    overflow: "hidden",
  },
  headerGradient: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  topRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventInfo: {
    flex: 1,
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 22,
  },
  eventDate: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
  badgesContainer: {
    alignItems: "flex-end",
  },
  badgesTopRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  badgesBottomRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  seasonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  seasonBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  sportBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: "center",
  },
  countBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  priceRange: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 18,
    fontWeight: "700",
  },
  matchupStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderRadius: 8,
  },
  matchupText: {
    fontSize: 13,
    fontWeight: "600",
  },
  ticketList: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingTop: 8,
    marginTop: -8,
  },
  ticketContainer: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  listFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  footerText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
  },
});
