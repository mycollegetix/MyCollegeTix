// src/components/WatchlistButton.tsx
import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  Modal,
  View,
  TextInput,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { WatchlistService } from "@/src/services/watchlistService";

interface WatchlistButtonProps {
  ticketId: string;
  ticketTitle: string;
  currentPrice: number;
  style?: any;
  size?: "small" | "medium" | "large";
  showText?: boolean;
}

const WatchlistButton: React.FC<WatchlistButtonProps> = ({
  ticketId,
  ticketTitle,
  currentPrice,
  style,
  size = "medium",
  showText = true,
}) => {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    notes: "",
    priceAlertThreshold: "",
    notificationEnabled: true,
  });

  useEffect(() => {
    checkWatchlistStatus();
  }, [ticketId]);

  const checkWatchlistStatus = async () => {
    try {
      const { data } = await WatchlistService.isInWatchlist(ticketId);
      setIsInWatchlist(data);
    } catch (error) {
      console.error("Error checking watchlist status:", error);
    }
  };

  const handleWatchlistToggle = async () => {
    if (isInWatchlist) {
      // Remove from watchlist
      Alert.alert(
        "Remove from Watchlist",
        `Remove "${ticketTitle}" from your watchlist?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: removeFromWatchlist,
          },
        ]
      );
    } else {
      // Show add to watchlist modal
      setFormData({
        notes: "",
        priceAlertThreshold: "",
        notificationEnabled: true,
      });
      setModalVisible(true);
    }
  };

  const addToWatchlist = async () => {
    setLoading(true);
    try {
      const { error } = await WatchlistService.addToWatchlist(ticketId, {
        notes: formData.notes || undefined,
        priceAlertThreshold: formData.priceAlertThreshold
          ? parseFloat(formData.priceAlertThreshold)
          : undefined,
        notificationEnabled: formData.notificationEnabled,
      });

      if (error) throw error;

      setIsInWatchlist(true);
      setModalVisible(false);
      Alert.alert("Success", "Ticket added to your watchlist!");
    } catch (error) {
      console.error("Error adding to watchlist:", error);
      Alert.alert("Error", "Failed to add to watchlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWatchlist = async () => {
    setLoading(true);
    try {
      const { error } = await WatchlistService.removeFromWatchlist(ticketId);

      if (error) throw error;

      setIsInWatchlist(false);
      Alert.alert("Success", "Ticket removed from watchlist");
    } catch (error) {
      console.error("Error removing from watchlist:", error);
      Alert.alert(
        "Error",
        "Failed to remove from watchlist. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const getSizeConfig = () => {
    switch (size) {
      case "small":
        return {
          iconSize: 16,
          paddingVertical: 8,
          paddingHorizontal: 12,
          fontSize: 12,
          borderRadius: 8,
        };
      case "large":
        return {
          iconSize: 24,
          paddingVertical: 16,
          paddingHorizontal: 24,
          fontSize: 16,
          borderRadius: 16,
        };
      default: // medium
        return {
          iconSize: 20,
          paddingVertical: 12,
          paddingHorizontal: 16,
          fontSize: 14,
          borderRadius: 12,
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const buttonStyles = [
    styles.button,
    {
      paddingVertical: sizeConfig.paddingVertical,
      paddingHorizontal: sizeConfig.paddingHorizontal,
      borderRadius: sizeConfig.borderRadius,
    },
    style,
  ];

  const textStyles = [styles.buttonText, { fontSize: sizeConfig.fontSize }];

  return (
    <>
      <TouchableOpacity
        style={buttonStyles}
        onPress={handleWatchlistToggle}
        disabled={loading}
      >
        <LinearGradient
          colors={
            isInWatchlist
              ? ["#ef4444", "#dc2626"] // Red gradient for remove
              : ["#18453b", "#2a6b5a"] // Green gradient for add
          }
          style={styles.gradient}
        >
          <Ionicons
            name={isInWatchlist ? "bookmark" : "bookmark-outline"}
            size={sizeConfig.iconSize}
            color="white"
          />
          {showText && (
            <Text style={textStyles}>
              {loading
                ? "Loading..."
                : isInWatchlist
                ? "Remove from Watchlist"
                : "Add to Watchlist"}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Add to Watchlist Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={50} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add to Watchlist</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Ticket Info */}
              <View style={styles.ticketInfo}>
                <Text style={styles.ticketTitle} numberOfLines={2}>
                  {ticketTitle}
                </Text>
                <Text style={styles.ticketPrice}>
                  Current Price: ${currentPrice.toFixed(2)}
                </Text>
              </View>

              {/* Notes */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.notes}
                  onChangeText={(text) =>
                    setFormData({ ...formData, notes: text })
                  }
                  placeholder="Add personal notes about this ticket..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Price Alert */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price Alert (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.priceAlertThreshold}
                  onChangeText={(text) =>
                    setFormData({ ...formData, priceAlertThreshold: text })
                  }
                  placeholder={`Enter price (e.g., ${(
                    currentPrice * 0.9
                  ).toFixed(2)})`}
                  keyboardType="numeric"
                />
                <Text style={styles.inputHint}>
                  Get notified when the price drops below this amount
                </Text>
              </View>

              {/* Notifications Toggle */}
              <View style={styles.inputGroup}>
                <View style={styles.switchRow}>
                  <Text style={styles.inputLabel}>Enable Notifications</Text>
                  <Switch
                    value={formData.notificationEnabled}
                    onValueChange={(value) =>
                      setFormData({ ...formData, notificationEnabled: value })
                    }
                    trackColor={{ false: "#d1d5db", true: "#18453b" }}
                    thumbColor="#ffffff"
                  />
                </View>
                <Text style={styles.inputHint}>
                  Receive notifications for price changes and ticket updates
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addToWatchlist}
                disabled={loading}
              >
                <Text style={styles.addButtonText}>
                  {loading ? "Adding..." : "Add to Watchlist"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: "hidden",
  },
  gradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    flex: 1,
  },
  buttonText: {
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
  ticketInfo: {
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 14,
    color: "#18453b",
    fontWeight: "600",
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
  addButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#18453b",
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});

export default WatchlistButton;
