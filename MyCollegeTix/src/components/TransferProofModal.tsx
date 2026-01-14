// src/components/TransferProofModal.tsx
// Modal for sellers to upload proof of transfer with skip warnings

import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { TransferProofService } from "@/src/services/transferProofService";

interface TransferProofModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (proofUrl: string | null) => Promise<void>;
  ticketTitle: string;
  buyerName: string;
  primaryColor?: string;
}

export default function TransferProofModal({
  visible,
  onClose,
  onConfirm,
  ticketTitle,
  buyerName,
  primaryColor = "#18453b",
}: TransferProofModalProps) {
  console.log("🟢 TransferProofModal render, visible:", visible);
  const [selectedImage, setSelectedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    const result = await TransferProofService.pickImage();
    if (result) {
      setSelectedImage(result);
    }
  };

  const handleTakePhoto = async () => {
    const result = await TransferProofService.takePhoto();
    if (result) {
      setSelectedImage(result);
    }
  };

  const handleConfirmWithProof = async () => {
    if (!selectedImage) {
      Alert.alert(
        "No Image",
        "Please select or take a photo of your transfer proof."
      );
      return;
    }

    setUploading(true);
    try {
      // Pass the base64 data for upload
      await onConfirm(selectedImage.base64);
      resetAndClose();
    } catch (error) {
      Alert.alert("Error", "Failed to confirm transfer. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Are you sure you want to skip?",
      "If the buyer disputes this transfer, you won't have evidence to support your claim. Without proof, we may not be able to protect you in a dispute.",
      [
        {
          text: "Upload Proof",
          style: "cancel",
        },
        {
          text: "Skip Anyway",
          style: "destructive",
          onPress: async () => {
            setUploading(true);
            try {
              await onConfirm(null);
              resetAndClose();
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to confirm transfer. Please try again."
              );
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const resetAndClose = () => {
    setSelectedImage(null);
    setUploading(false);
    onClose();
  };

  const handleClose = () => {
    if (uploading) return;
    resetAndClose();
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
              disabled={uploading}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm Transfer</Text>
            <View style={styles.placeholder} />
          </View>
          <Text style={styles.headerSubtitle}>{ticketTitle}</Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Transfer Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>
                Transferring to:{" "}
                <Text style={styles.infoHighlight}>{buyerName}</Text>
              </Text>
            </View>
          </View>

          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <Ionicons name="shield-checkmark" size={24} color="#d97706" />
            <View style={styles.warningTextContainer}>
              <Text style={styles.warningTitle}>Protect Yourself</Text>
              <Text style={styles.warningText}>
                A screenshot of your transfer confirmation email protects you if
                the buyer claims they didn't receive the ticket.
              </Text>
            </View>
          </View>

          {/* Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Upload Proof of Transfer</Text>
            <Text style={styles.sectionSubtitle}>
              Screenshot of your transfer confirmation email, app notification,
              or ticket transfer page
            </Text>

            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.imagePreview}
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                  disabled={uploading}
                >
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadOptions}>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handlePickImage}
                  disabled={uploading}
                >
                  <View
                    style={[
                      styles.uploadIconContainer,
                      { backgroundColor: primaryColor + "15" },
                    ]}
                  >
                    <Ionicons
                      name="images-outline"
                      size={32}
                      color={primaryColor}
                    />
                  </View>
                  <Text style={styles.uploadButtonText}>
                    Choose from Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleTakePhoto}
                  disabled={uploading}
                >
                  <View
                    style={[
                      styles.uploadIconContainer,
                      { backgroundColor: primaryColor + "15" },
                    ]}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={32}
                      color={primaryColor}
                    />
                  </View>
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>What makes good proof?</Text>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.tipText}>Transfer confirmation email</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.tipText}>
                Screenshot of completed transfer page
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color="#10b981" />
              <Text style={styles.tipText}>
                Buyer's email and name visible in the transfer
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={uploading}
          >
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: primaryColor },
              (!selectedImage || uploading) && styles.buttonDisabled,
            ]}
            onPress={handleConfirmWithProof}
            disabled={!selectedImage || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.confirmButtonText}>
                  {selectedImage ? "Confirm Transfer" : "Select Proof First"}
                </Text>
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
    padding: 20,
  },
  infoSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoText: {
    fontSize: 15,
    color: "#6b7280",
  },
  infoHighlight: {
    fontWeight: "600",
    color: "#1f2937",
  },
  warningBanner: {
    flexDirection: "row",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#fbbf24",
    gap: 12,
  },
  warningTextContainer: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#a16207",
    lineHeight: 20,
  },
  uploadSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadOptions: {
    flexDirection: "row",
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  imagePreviewContainer: {
    position: "relative",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  imagePreview: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    resizeMode: "cover",
  },
  removeImageButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 14,
  },
  tipsSection: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#166534",
    marginBottom: 12,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: "#15803d",
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
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6b7280",
    textDecorationLine: "underline",
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
