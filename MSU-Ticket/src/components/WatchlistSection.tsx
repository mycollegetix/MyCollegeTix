// src/components/WatchlistSection.tsx
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
import {
  WatchlistService,
  WatchlistWithTicket,
} from "@/src/services/watchlistService";

const { width } = Dimensions.get("window");

interface WatchlistSectionProps {
  onRefresh?: () => void;
}

const WatchlistSection: React.FC<WatchlistSectionProps> = ({ onRefresh }) => {
  const router = useRouter();
  const [watchlist, setWatchlist] = useState<WatchlistWithTicket[]>([]);
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

      setWatchlist(watchlistResult.data || []);
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
              <Text style={styles.currentPrice}>
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
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="bookmark" size={24} color="#18453b" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.totalItems}</Text>
              <Text style={styles.statLabel}>Watching</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{stats.availableTickets}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="trending-down" size={24} color="#3b82f6" />
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>
                ${stats.averagePrice.toFixed(0)}
              </Text>
              <Text style={styles.statLabel}>Avg Price</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.cleanupButton}
            onPress={handleCleanupWatchlist}
          >
            <Ionicons name="refresh-outline" size={16} color="#18453b" />
            <Text style={styles.cleanupButtonText}>Clean Up</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Watchlist */}
      {loading ? (
        <BlurView intensity={20} style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading your watchlist...</Text>
        </BlurView>
      ) : watchlist.length > 0 ? (
        <FlatList
          data={watchlist}
          renderItem={renderWatchlistItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefreshData} />
          }
        />
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
            style={styles.browseButton}
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
                <Text style={styles.inputLabel}>Notes</Text>
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
                <Text style={styles.inputLabel}>Price Alert Threshold</Text>
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
                  <Text style={styles.inputLabel}>Enable Notifications</Text>
                  <Switch
                    value={editForm.notificationEnabled}
                    onValueChange={(value) =>
                      setEditForm({ ...editForm, notificationEnabled: value })
                    }
                    trackColor={{ false: "#d1d5db", true: "#18453b" }}
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
                style={styles.saveButton}
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
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  statContent: {
    alignItems: "flex-start",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#18453b",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 16,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cleanupButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  cleanupButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
  },
  watchlistCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: "hidden",
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
    color: "#18453b",
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
    backgroundColor: "#18453b",
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
    color: "#374151",
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
    backgroundColor: "#18453b",
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});

export default WatchlistSection;
