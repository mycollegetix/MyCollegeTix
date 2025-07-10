// src/components/NotificationBadge.tsx
import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@/src/providers/NotificationProvider";
import { useChat } from "@/src/providers/ChatProvider";

interface NotificationBadgeProps {
  iconName: string;
  iconSize?: number;
  iconColor?: string;
  showChatBadge?: boolean;
}

export function NotificationBadge({
  iconName,
  iconSize = 24,
  iconColor = "#ffd700",
  showChatBadge = false,
}: NotificationBadgeProps) {
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: chatUnreadCount } = useChat();

  const totalUnreadCount = showChatBadge
    ? chatUnreadCount
    : notificationUnreadCount;

  return (
    <View style={styles.container}>
      <Ionicons name={iconName as any} size={iconSize} color={iconColor} />
      {totalUnreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "white",
    textAlign: "center",
  },
});
