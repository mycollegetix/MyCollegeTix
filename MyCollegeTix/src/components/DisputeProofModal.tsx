// src/components/DisputeProofModal.tsx
// Modal for uploading proof/evidence for disputes (buyer or seller)

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

interface DisputeProofModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (proofUrl: string) => Promise<void>;
  orderId: string;
  userRole: "buyer" | "seller";
  existingEvidence?: string[];
}

export default function DisputeProofModal({
  visible,
  onClose,
  onUpload,
  orderId,
  userRole,
  existingEvidence = [],
}: DisputeProofModalProps) {
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

  const handleUploadProof = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please select or take a photo of your evidence.");
      return;
    }

    setUploading(true);
    try {
      // Upload the image
      const uploadResult = await TransferProofService.uploadProof(orderId, selectedImage.base64);

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || "Failed to upload evidence");
      }

      await onUpload(uploadResult.url);
      resetAndClose();
      Alert.alert("Success", "Your evidence has been uploaded successfully.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to upload evidence");
    } finally {
      setUploading(false);
    }
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

  const getTipsForRole = () => {
    if (userRole === "seller") {
      return [
        "Screenshot of transfer confirmation email",
        "Ticket transfer receipt from your account",
        "Proof showing buyer's email in transfer",
        "Any communication with the buyer",
      ];
    } else {
      return [
        "Screenshot showing ticket not received",
        "Email inbox search for transfer",
        "Ticket account showing no ticket",
        "Any communication with the seller",
      ];
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
          colors={["#f59e0b", "#d97706"]}
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
            <Text style={styles.headerTitle}>Upload Evidence</Text>
            <View style={styles.placeholder} />
          </View>
          <Text style={styles.headerSubtitle}>
            Support your {userRole === "seller" ? "defense" : "claim"} with proof
          </Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={24} color="#0369a1" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Why Upload Evidence?</Text>
              <Text style={styles.infoText}>
                {userRole === "seller"
                  ? "Uploading proof of transfer helps protect you in disputes. Without evidence, the decision may favor the buyer."
                  : "Uploading evidence helps us understand your situation better and resolve the dispute faster."}
              </Text>
            </View>
          </View>

          {/* Existing Evidence */}
          {existingEvidence.length > 0 && (
            <View style={styles.existingSection}>
              <Text style={styles.sectionTitle}>Previously Uploaded</Text>
              <View style={styles.existingBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.existingText}>
                  {existingEvidence.length} file(s) already submitted
                </Text>
              </View>
            </View>
          )}

          {/* Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>Add New Evidence</Text>
            <Text style={styles.sectionSubtitle}>
              Upload screenshots, photos, or documents that support your case
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
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="images-outline" size={32} color="#f59e0b" />
                  </View>
                  <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleTakePhoto}
                  disabled={uploading}
                >
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="camera-outline" size={32} color="#f59e0b" />
                  </View>
                  <Text style={styles.uploadButtonText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Tips */}
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>
              {userRole === "seller" ? "Good evidence for sellers:" : "Good evidence for buyers:"}
            </Text>
            {getTipsForRole().map((tip, index) => (
              <View key={index} style={styles.tipRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleClose}
            disabled={uploading}
          >
            <Text style={styles.skipButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.uploadConfirmButton,
              (!selectedImage || uploading) && styles.buttonDisabled,
            ]}
            onPress={handleUploadProof}
            disabled={!selectedImage || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="white" />
                <Text style={styles.uploadConfirmButtonText}>
                  {selectedImage ? "Upload Evidence" : "Select Image First"}
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
  infoBanner: {
    flexDirection: "row",
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#bae6fd",
    gap: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0369a1",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#0c4a6e",
    lineHeight: 20,
  },
  existingSection: {
    marginBottom: 24,
  },
  existingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  existingText: {
    fontSize: 14,
    color: "#065f46",
    fontWeight: "500",
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
    backgroundColor: "#fef3c7",
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
    flex: 1,
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
  },
  uploadConfirmButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f59e0b",
  },
  uploadConfirmButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
