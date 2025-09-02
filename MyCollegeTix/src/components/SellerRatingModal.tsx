import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface SellerRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmRating: (ratingData: SellerRatingData) => Promise<void>;
  ticket: {
    id: string;
    title: string;
    seller_name: string;
  };
  isLoading?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface SellerRatingData {
  rating: number;
  review?: string;
}

export default function SellerRatingModal({
  visible,
  onClose,
  onConfirmRating,
  ticket,
  isLoading = false,
  primaryColor = "#18453b",
  secondaryColor = "#ffd700",
}: SellerRatingModalProps) {
  const [ratingData, setRatingData] = useState<SellerRatingData>({
    rating: 0,
    review: "",
  });

  const handleClose = () => {
    if (!isLoading) {
      setRatingData({
        rating: 0,
        review: "",
      });
      onClose();
    }
  };

  const handleConfirmRating = async () => {
    if (ratingData.rating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.");
      return;
    }

    try {
      await onConfirmRating(ratingData);
      handleClose();
    } catch (error) {
      console.error("Error submitting rating:", error);
      Alert.alert(
        "Error",
        "Failed to submit rating. Please try again."
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <LinearGradient
          colors={[primaryColor, primaryColor + "88"]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rate Seller</Text>
            <View style={styles.placeholder} />
          </View>
          <Text style={styles.headerSubtitle}>{ticket.title}</Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Seller Info */}
            <View style={styles.sellerSection}>
              <Text style={styles.sectionTitle}>Rating for</Text>
              <Text style={styles.sellerName}>{ticket.seller_name}</Text>
              <Text style={styles.sectionSubtitle}>
                Help other buyers by sharing your experience with this seller
              </Text>
            </View>

            {/* Star Rating Section */}
            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>Overall Rating</Text>
              <View style={styles.starRating}>
                <TouchableOpacity 
                  style={styles.starButton}
                  onPress={() => setRatingData({...ratingData, rating: 1})}
                >
                  <Ionicons 
                    name="star" 
                    size={32} 
                    color={ratingData.rating >= 1 ? "#fbbf24" : "#d1d5db"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.starButton}
                  onPress={() => setRatingData({...ratingData, rating: 2})}
                >
                  <Ionicons 
                    name="star" 
                    size={32} 
                    color={ratingData.rating >= 2 ? "#fbbf24" : "#d1d5db"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.starButton}
                  onPress={() => setRatingData({...ratingData, rating: 3})}
                >
                  <Ionicons 
                    name="star" 
                    size={32} 
                    color={ratingData.rating >= 3 ? "#fbbf24" : "#d1d5db"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.starButton}
                  onPress={() => setRatingData({...ratingData, rating: 4})}
                >
                  <Ionicons 
                    name="star" 
                    size={32} 
                    color={ratingData.rating >= 4 ? "#fbbf24" : "#d1d5db"} 
                  />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.starButton}
                  onPress={() => setRatingData({...ratingData, rating: 5})}
                >
                  <Ionicons 
                    name="star" 
                    size={32} 
                    color={ratingData.rating >= 5 ? "#fbbf24" : "#d1d5db"} 
                  />
                </TouchableOpacity>
              </View>

              {/* Rating Description */}
              {ratingData.rating > 0 && (
                <Text style={styles.ratingDescription}>
                  {ratingData.rating === 1 && "Poor - Had significant issues"}
                  {ratingData.rating === 2 && "Fair - Below expectations"}
                  {ratingData.rating === 3 && "Good - Met expectations"}
                  {ratingData.rating === 4 && "Very Good - Exceeded expectations"}
                  {ratingData.rating === 5 && "Excellent - Outstanding experience"}
                </Text>
              )}
            </View>

            {/* Review Section */}
            {ratingData.rating > 0 && (
              <View style={styles.reviewSection}>
                <Text style={styles.reviewLabel}>Review (Optional)</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Share details about your experience with this seller..."
                  placeholderTextColor="#9ca3af"
                  value={ratingData.review || ""}
                  onChangeText={(text) => setRatingData({...ratingData, review: text})}
                  multiline
                  numberOfLines={4}
                  maxLength={300}
                  textAlignVertical="top"
                  editable={!isLoading}
                />
                <Text style={styles.characterCount}>
                  {(ratingData.review?.length || 0).toString()}/300
                </Text>
              </View>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cancelButton, isLoading && styles.buttonDisabled]}
            onPress={handleClose}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: primaryColor },
              isLoading && styles.buttonDisabled,
              ratingData.rating === 0 && styles.buttonDisabled,
            ]}
            onPress={handleConfirmRating}
            disabled={isLoading || ratingData.rating === 0}
          >
            {isLoading ? (
              <Text style={styles.confirmButtonText}>Submitting...</Text>
            ) : (
              <>
                <Ionicons name="star" size={20} color="white" />
                <Text style={styles.confirmButtonText}>Submit Rating</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
  },
  placeholder: {
    width: 40,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  sellerSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8,
  },
  sellerName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 16,
  },
  starRating: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
  },
  reviewSection: {
    marginBottom: 24,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    backgroundColor: "white",
    minHeight: 100,
    color: "#1f2937",
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 8,
  },
  footer: {
    flexDirection: "row",
    padding: 20,
    paddingBottom: 34,
    gap: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    backgroundColor: "white",
  },
  confirmButton: {
    flex: 2,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});