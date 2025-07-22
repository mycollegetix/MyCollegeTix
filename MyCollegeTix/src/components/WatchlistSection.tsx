// src/components/WatchlistSection.tsx - With theme support
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";
import {
  WatchlistService,
  WatchlistWithTicket,
} from "@/src/services/watchlistService";

const { width } = Dimensions.get("window");

interface WatchlistSectionProps {
  onRefresh?: () => void;
}

interface EventGroup {
  eventTitle: string;
  eventDate: string;
  items: WatchlistWithTicket[];
  expanded: boolean;
}

const WatchlistSection: React.FC<WatchlistSectionProps> = ({ onRefresh }) => {
  const router = useRouter();
  const theme = useTheme();
  const [watchlist, setWatchlist] = useState<WatchlistWithTicket[]>([]);
  const [eventGroups, setEventGroups] = useState<EventGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalItems: 0,
    availableTickets: 0,
    soldTickets: 0,
    averagePrice: 0,
    priceRange: { min: 0, max: 0 },
  });
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WatchlistWithTicket | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    notes: "",
    priceAlertThreshold: "",
    notificationEnabled: true,
  });

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      const [watchlistResult, statsResult] = await Promise.all([
        WatchlistService.getUserWatchlist(),
        WatchlistService.getWatchlistStats(),
      ]);

      if (watchlistResult.error) {
        throw watchlistResult.error;
      }

      if (statsResult.error) {
        throw statsResult.error;
      }

      const watchlistData = watchlistResult.data || [];
      setWatchlist(watchlistData);
      setEventGroups(groupWatchlistByEvent(watchlistData));
      setStats(
        statsResult.data || {
          totalItems: 0,
          availableTickets: 0,
          soldTickets: 0,
          averagePrice: 0,
          priceRange: { min: 0, max: 0 },
        }
      );
    } catch (error) {
      console.error("Error loading watchlist:", error);
      Alert.alert("Error", "Failed to load watchlist. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const groupWatchlistByEvent = (
    items: WatchlistWithTicket[]
  ): EventGroup[] => {
    const groups = items.reduce((acc, item) => {
      const eventKey = `${item.ticket.title}_${item.ticket.event_date}`;
      if (!acc[eventKey]) {
        acc[eventKey] = {
          eventTitle: item.ticket.title,
          eventDate: item.ticket.event_date,
          items: [],
          expanded: true, // Default to expanded
        };
      }
      acc[eventKey].items.push(item);
      return acc;
    }, {} as Record<string, EventGroup>);

    return Object.values(groups).sort(
      (a, b) =>
        new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()
    );
  };

  const toggleEventGroup = (index: number) => {
    setEventGroups((prev) =>
      prev.map((group, i) =>
        i === index ? { ...group, expanded: !group.expanded } : group
      )
    );
  };

  const onRefreshData = useCallback(() => {
    setRefreshing(true);
    loadWatchlist();
    onRefresh?.();
  }, [onRefresh]);

  const handleRemoveFromWatchlist = async (
    ticketId: string,
    ticketTitle: string
  ) => {
    Alert.alert(
      "Remove from Watchlist",
      `Remove "${ticketTitle}" from your watchlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await WatchlistService.removeFromWatchlist(
                ticketId
              );
              if (error) throw error;

              Alert.alert("Success", "Ticket removed from watchlist");
              loadWatchlist();
            } catch (error) {
              console.error("Error removing from watchlist:", error);
              Alert.alert(
                "Error",
                "Failed to remove from watchlist. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleEditWatchlistItem = (item: WatchlistWithTicket) => {
    setSelectedItem(item);
    setEditForm({
      notes: item.notes || "",
      priceAlertThreshold: item.price_alert_threshold?.toString() || "",
      notificationEnabled: item.notification_enabled,
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await WatchlistService.updateWatchlistItem(
        selectedItem.ticket_id,
        {
          notes: editForm.notes || null,
          priceAlertThreshold: editForm.priceAlertThreshold
            ? parseFloat(editForm.priceAlertThreshold)
            : null,
          notificationEnabled: editForm.notificationEnabled,
        }
      );

      if (error) throw error;

      Alert.alert("Success", "Watchlist item updated");
      setEditModalVisible(false);
      loadWatchlist();
    } catch (error) {
      console.error("Error updating watchlist item:", error);
      Alert.alert(
        "Error",
        "Failed to update watchlist item. Please try again."
      );
    }
  };

  const handleCleanupWatchlist = async () => {
    Alert.alert(
      "Clean Up Watchlist",
      "Remove all sold and cancelled tickets from your watchlist?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clean Up",
          onPress: async () => {
            try {
              const { error } = await WatchlistService.cleanupWatchlist();
              if (error) throw error;

              Alert.alert("Success", "Watchlist cleaned up");
              loadWatchlist();
            } catch (error) {
              console.error("Error cleaning up watchlist:", error);
              Alert.alert(
                "Error",
                "Failed to clean up watchlist. Please try again."
              );
            }
          },
        },
      ]
    );
  };


  const getStatusConfig = (status: string) => {
    switch (status.toLowerCase()) {
      case "available":
        return {
          color: "#10b981",
          icon: "checkmark-circle",
          text: "Available",
        };
      case "sold":
        return { color: "#6b7280", icon: "close-circle", text: "Sold" };
      case "cancelled":
        return { color: "#ef4444", icon: "close-circle", text: "Cancelled" };
      default:
        return { color: "#6b7280", icon: "help-circle", text: status };
    }
  };

  const renderWatchlistItem = ({ item }: { item: WatchlistWithTicket }) => {
    const statusConfig = getStatusConfig(item.ticket.status);
    const isPriceAlert =
      item.price_alert_threshold &&
      item.ticket.price <= item.price_alert_threshold;

    return (
      <BlurView intensity={20} style={styles.watchlistCard}>
        <TouchableOpacity
          onPress={() => router.push(`/ticket-details/${item.ticket.id}`)}
          style={styles.cardContent}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.ticketTitle} numberOfLines={2}>
              {item.ticket.title}
            </Text>
            <View style={styles.headerActions}>
              {isPriceAlert && (
                <View style={styles.priceAlertBadge}>
                  <Ionicons name="arrow-down" size={12} color="white" />
                  <Text style={styles.priceAlertText}>Price Alert</Text>
                </View>
              )}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusConfig.color },
                ]}
              >
                <Ionicons
                  name={statusConfig.icon as any}
                  size={12}
                  color="white"
                />
                <Text style={styles.statusText}>{statusConfig.text}</Text>
              </View>
            </View>
          </View>

          {/* Ticket Info */}
          <View style={styles.ticketInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="location" size={14} color="#6b7280" />
              <Text style={styles.infoText}>{item.ticket.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={14} color="#6b7280" />
              <Text style={styles.infoText}>
                {new Date(item.ticket.event_date).toLocaleDateString()}
              </Text>
            </View>
            {item.ticket.section && (
              <View style={styles.infoRow}>
                <Ionicons name="ticket" size={14} color="#6b7280" />
                <Text style={styles.infoText}>
                  Sec {item.ticket.section}, Row {item.ticket.row_number}, Seat{" "}
                  {item.ticket.seat_number}
                </Text>
              </View>
            )}
          </View>

          {/* Price and Alerts */}
          <View style={styles.priceSection}>
            <View style={styles.priceContainer}>
              <Text style={[styles.currentPrice, { color: theme.primary }]}>
                ${item.ticket.price.toFixed(2)}
              </Text>
              {item.price_alert_threshold && (
                <Text style={styles.alertThreshold}>
                  Alert: ${item.price_alert_threshold.toFixed(2)}
                </Text>
              )}
            </View>
            <Text style={styles.addedDate}>
              Added {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          {/* Notes */}
          {item.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditWatchlistItem(item)}
          >
            <Ionicons name="create-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() =>
              handleRemoveFromWatchlist(item.ticket_id, item.ticket.title)
            }
          >
            <Ionicons name="trash-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </BlurView>
    );
  };

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsSection}>
        <BlurView intensity={15} style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View
              style={[
                styles.statBox,
                { backgroundColor: `${theme.primary}15` },
              ]}
            >
              <Ionicons name="bookmark" size={20} color={theme.primary} />
              <Text style={[styles.statNumber, { color: theme.primary }]}>
                {stats.totalItems}
              </Text>
              <Text style={styles.statLabel}>Watching</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: "#10b98115" }]}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={[styles.statNumber, { color: "#10b981" }]}>
                {stats.availableTickets}
              </Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: "#3b82f615" }]}>
              <Ionicons name="trending-down" size={20} color="#3b82f6" />
              <Text style={[styles.statNumber, { color: "#3b82f6" }]}>
                ${stats.averagePrice.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Avg Price</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.cleanupButton,
              { backgroundColor: `${theme.primary}10` },
            ]}
            onPress={handleCleanupWatchlist}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.primary} />
            <Text style={[styles.cleanupButtonText, { color: theme.primary }]}>
              Clean Up Sold Items
            </Text>
          </TouchableOpacity>
        </BlurView>
      </View>

      {/* Event Groups */}
      {loading ? (
        <BlurView intensity={20} style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading your watchlist...</Text>
        </BlurView>
      ) : eventGroups.length > 0 ? (
        <View>
          {eventGroups.map((group, index) => (
            <View
              key={`${group.eventTitle}_${group.eventDate}`}
              style={styles.eventGroup}
            >
              <TouchableOpacity
                style={styles.eventGroupHeader}
                onPress={() => toggleEventGroup(index)}
              >
                <View style={styles.eventGroupInfo}>
                  <Text style={styles.eventGroupTitle} numberOfLines={1}>
                    {group.eventTitle}
                  </Text>
                  <View style={styles.eventGroupMeta}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#6b7280"
                    />
                    <Text style={styles.eventGroupDate}>
                      {new Date(group.eventDate).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                    <Text style={styles.eventGroupCount}>
                      • {group.items.length} tickets
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={group.expanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.primary}
                />
              </TouchableOpacity>

              {group.expanded && (
                <View style={styles.eventGroupContent}>
                  {group.items.map((item) => (
                    <View key={item.id}>{renderWatchlistItem({ item })}</View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <BlurView intensity={20} style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bookmark-outline" size={48} color="#6b7280" />
          </View>
          <Text style={styles.emptyStateTitle}>No tickets in watchlist</Text>
          <Text style={styles.emptyStateText}>
            Find interesting tickets and add them to your watchlist to track
            price changes
          </Text>
          <TouchableOpacity
            style={[styles.browseButton, { backgroundColor: theme.primary }]}
            onPress={() => router.push("/(tabs)")}
          >
            <Text style={styles.browseButtonText}>Browse Tickets</Text>
          </TouchableOpacity>
        </BlurView>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Watchlist Item</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.primary }]}>
                  Notes
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.notes}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, notes: text })
                  }
                  placeholder="Add personal notes..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price Alert Threshold */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.primary }]}>
                  Price Alert Threshold
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={editForm.priceAlertThreshold}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, priceAlertThreshold: text })
                  }
                  placeholder="Enter price (e.g., 50.00)"
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  Get notified when price drops below this amount
                </Text>
              </View>

              {/* Notification Toggle */}
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={[styles.inputLabel, { color: theme.primary }]}>
                    Enable Notifications
                  </Text>
                  <Switch
                    value={editForm.notificationEnabled}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, notificationEnabled: value })
                    }
                    trackColor={{ false: "#d1d5db", true: theme.primary }}
                    thumbColor="#ffffff"
                  />
                </View>
                <Text style={styles.inputHint}>
                  Receive notifications for price changes and updates
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveEdit}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  cleanupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  eventGroup: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  eventGroupHeader: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventGroupInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventGroupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  eventGroupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventGroupDate: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  eventGroupCount: {
    fontSize: 13,
    color: "#6b7280",
  },
  eventGroupContent: {
    marginTop: 8,
  },
  cleanupButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  watchlistCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  priceAlertBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  priceAlertText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  ticketInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#6b7280",
    flex: 1,
  },
  priceSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currentPrice: {
    fontSize: 18,
    fontWeight: "700",
  },
  alertThreshold: {
    fontSize: 12,
    color: "#f59e0b",
    fontWeight: "600",
  },
  addedDate: {
    fontSize: 11,
    color: "#9ca3af",
  },
  notesSection: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },
  cardActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    backgroundColor: "#3b82f6",
  },
  removeButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  loadingState: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    marginHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "500",
  },
  emptyState: {
    padding: 40,
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    marginHorizontal: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#f9fafb",
    textAlignVertical: "top",
  },
  inputHint: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontStyle: "italic",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});

export default WatchlistSection;
