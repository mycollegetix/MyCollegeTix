// components/NotificationBadge.tsx
import React from "react";
import { StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useNotifications } from "@/src/providers/NotificationProvider";

interface NotificationBadgeProps {
  iconName?: string;
  iconSize?: number;
  iconColor?: string;
  showCount?: boolean;
}

export function NotificationBadge({
  iconName = "notifications-outline",
  iconSize = 24,
  iconColor = "#18453b",
  showCount = true,
}: NotificationBadgeProps) {
  const router = useRouter();
  const { unreadCount } = useNotifications();

  const handlePress = () => {
    router.push("/notifications/NotificationScreen");
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress}>
      <Ionicons name={iconName as any} size={iconSize} color={iconColor} />
      {showCount && unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount.toString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
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
    color: "white",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
