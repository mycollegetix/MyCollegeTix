// screens/NotificationsScreen.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Dimensions,
  RefreshControl,
  Alert,
  Animated,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useNotifications } from "@/src/providers/NotificationProvider";
import { Database } from "@/src/types/database.types";

const { width, height } = Dimensions.get("window");

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type and related data
    if (notification.related_ticket_id) {
      (router.push as any)(`/ticket-details/${notification.related_ticket_id}`);
    } else if (
      notification.type === "purchase" ||
      notification.type === "sale"
    ) {
      (router.push as any)("/(tabs)/orders");
    }
  };

  const handleDelete = (notificationId: string) => {
    Alert.alert(
      "Delete Notification",
      "Are you sure you want to delete this notification?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingId(notificationId);
            await deleteNotification(notificationId);
            setDeletingId(null);
          },
        },
      ]
    );
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      Alert.alert(
        "Mark All as Read",
        `Mark all ${unreadCount} unread notifications as read?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Mark All Read", onPress: markAllAsRead },
        ]
      );
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "purchase":
        return "bag-check-outline";
      case "sale":
        return "cash-outline";
      case "listing":
        return "pricetag-outline";
      case "system":
        return "information-circle-outline";
      default:
        return "notifications-outline";
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case "purchase":
        return {
          primary: "#10b981",
          secondary: "#d1fae5",
          gradient: ["#10b981", "#059669"],
        };
      case "sale":
        return {
          primary: "#3b82f6",
          secondary: "#dbeafe",
          gradient: ["#3b82f6", "#2563eb"],
        };
      case "listing":
        return {
          primary: "#f59e0b",
          secondary: "#fef3c7",
          gradient: ["#f59e0b", "#d97706"],
        };
      case "system":
        return {
          primary: "#6b7280",
          secondary: "#f3f4f6",
          gradient: ["#6b7280", "#4b5563"],
        };
      default:
        return {
          primary: "#18453b",
          secondary: "#f0fdf4",
          gradient: ["#18453b", "#15803d"],
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080)
      return `${Math.floor(diffInMinutes / 1440)}d ago`;

    return date.toLocaleDateString();
  };

  const renderNotification = ({
    item,
    index,
  }: {
    item: Notification;
    index: number;
  }) => {
    const colors = getNotificationColors(item.type);
    const isDeleting = deletingId === item.id;

    return (
      <Animated.View
        style={[styles.notificationWrapper, { opacity: isDeleting ? 0.5 : 1 }]}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            !item.read && styles.unreadNotification,
            { transform: [{ scale: isDeleting ? 0.95 : 1 }] },
          ]}
          onPress={() => handleNotificationPress(item)}
          disabled={isDeleting}
        >
          <View style={styles.notificationContent}>
            <LinearGradient
              colors={["#18453b", "#2a6b5a", "#0f2f28"] as const}
              style={styles.notificationIcon}
            >
              <Ionicons
                name={getNotificationIcon(item.type) as any}
                size={22}
                color="white"
              />
            </LinearGradient>

            <View style={styles.notificationText}>
              <View style={styles.notificationHeader}>
                <Text
                  style={[
                    styles.notificationTitle,
                    !item.read && styles.unreadTitle,
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {!item.read && (
                  <View
                    style={[
                      styles.unreadDot,
                      { backgroundColor: colors.primary },
                    ]}
                  />
                )}
              </View>

              <Text style={styles.notificationMessage} numberOfLines={2}>
                {item.message}
              </Text>

              <View style={styles.notificationFooter}>
                <Text style={styles.notificationTime}>
                  {formatDate(item.created_at)}
                </Text>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: colors.secondary },
                  ]}
                >
                  <Text
                    style={[styles.typeBadgeText, { color: colors.primary }]}
                  >
                    {item.type}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(item.id)}
            disabled={isDeleting}
          >
            <View style={styles.deleteButtonInner}>
              <Ionicons
                name={isDeleting ? "hourglass-outline" : "trash-outline"}
                size={16}
                color="#ef4444"
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              (router.push as any)("/(tabs)/");
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleMarkAllRead}
          >
            <Ionicons name="checkmark-done" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      {/* Enhanced Stats */}
      <View style={styles.statsContainer}>
        <BlurView intensity={30} style={styles.statsCard}>
          <LinearGradient
            colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
            style={styles.statsGradient}
          >
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="notifications" size={20} color="#18453b" />
              </View>
              <Text style={styles.statNumber}>{notifications.length}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="mail-unread" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.statNumber, { color: "#ef4444" }]}>
                {unreadCount}
              </Text>
              <Text style={styles.statLabel}>Unread</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-done" size={20} color="#10b981" />
              </View>
              <Text style={[styles.statNumber, { color: "#10b981" }]}>
                {notifications.length - unreadCount}
              </Text>
              <Text style={styles.statLabel}>Read</Text>
            </View>
          </LinearGradient>
        </BlurView>
      </View>

      {/* Notifications List */}
      <View style={styles.notificationsContainer}>
        {notifications.length > 0 ? (
          <FlatList
            data={notifications}
            renderItem={renderNotification}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#18453b"
                colors={["#18453b"]}
              />
            }
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyStateContainer}>
            <BlurView intensity={20} style={styles.emptyState}>
              <LinearGradient
                colors={["rgba(24,69,59,0.1)", "rgba(24,69,59,0.05)"]}
                style={styles.emptyStateGradient}
              >
                <View style={styles.emptyIconContainer}>
                  <LinearGradient
                    colors={["#18453b", "#2d7a6b"]}
                    style={styles.emptyIconGradient}
                  >
                    <Ionicons
                      name="notifications-outline"
                      size={32}
                      color="white"
                    />
                  </LinearGradient>
                </View>
                <Text style={styles.emptyStateTitle}>No notifications yet</Text>
                <Text style={styles.emptyStateText}>
                  You'll see notifications here when you buy, sell, or list
                  tickets
                </Text>
              </LinearGradient>
            </BlurView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  headerBadge: {
    backgroundColor: "#18453b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  statsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "hidden",
  },
  statsGradient: {
    flexDirection: "row",
    padding: 20,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "white",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    marginHorizontal: 16,
  },
  notificationsContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  separator: {
    height: 8,
  },
  notificationWrapper: {
    marginBottom: 4,
  },
  notificationCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  unreadNotification: {
    borderColor: "#18453b",
    backgroundColor: "#fefffe",
    shadowColor: "#18453b",
    shadowOpacity: 0.1,
  },
  notificationContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationText: {
    flex: 1,
    gap: 6,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  unreadTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  notificationMessage: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  deleteButton: {
    padding: 12,
    marginLeft: 8,
  },
  deleteButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  emptyState: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
    overflow: "hidden",
  },
  emptyStateGradient: {
    alignItems: "center",
    padding: 48,
  },
  emptyIconContainer: {
    marginBottom: 24,
  },
  emptyIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
});
