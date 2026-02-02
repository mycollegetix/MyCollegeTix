// src/app/dispute/[orderId].tsx
// File a dispute for an order
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { DisputeService, CreateDisputeParams } from "@/src/services/disputeService";
import { TransferProofService } from "@/src/services/transferProofService";
import { supabase } from "@/src/lib/supabase";

interface OrderInfo {
  id: string;
  buyer_id: string;
  seller_id: string;
  amount: number;
  escrow_status: string;
  ticket: {
    id: string;
    title: string;
    event_date: string;
  };
  other_party: {
    full_name: string;
    username: string;
  };
}

const DISPUTE_REASONS = DisputeService.getDisputeReasons();

export default function FileDisputeScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [evidenceImages, setEvidenceImages] = useState<{ uri: string; base64: string }[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId || !user) return;

    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id,
          buyer_id,
          seller_id,
          amount,
          escrow_status,
          ticket:tickets!orders_ticket_id_fkey (
            id,
            title,
            event_date
          ),
          buyer:profiles!orders_buyer_id_fkey (
            id,
            full_name,
            username
          ),
          seller:profiles!orders_seller_id_fkey (
            id,
            full_name,
            username
          )
        `)
        .eq("id", orderId)
        .single();

      if (error) throw error;

      const isBuyer = data.buyer_id === user.id;
      const otherParty = isBuyer ? data.seller : data.buyer;

      setOrder({
        id: data.id,
        buyer_id: data.buyer_id,
        seller_id: data.seller_id,
        amount: data.amount,
        escrow_status: data.escrow_status || "pending",
        ticket: data.ticket,
        other_party: otherParty,
      });
    } catch (err) {
      console.error("Error loading order:", err);
      Alert.alert("Error", "Failed to load order details");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [orderId, user]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handlePickImage = async () => {
    if (evidenceImages.length >= 5) {
      Alert.alert("Limit Reached", "You can upload up to 5 images as evidence.");
      return;
    }
    const result = await TransferProofService.pickImage();
    if (result) {
      setEvidenceImages([...evidenceImages, result]);
    }
  };

  const handleTakePhoto = async () => {
    if (evidenceImages.length >= 5) {
      Alert.alert("Limit Reached", "You can upload up to 5 images as evidence.");
      return;
    }
    const result = await TransferProofService.takePhoto();
    if (result) {
      setEvidenceImages([...evidenceImages, result]);
    }
  };

  const removeImage = (index: number) => {
    setEvidenceImages(evidenceImages.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Required", "Please select a reason for your dispute");
      return;
    }

    if (!description.trim()) {
      Alert.alert("Required", "Please provide a description of the issue");
      return;
    }

    if (description.trim().length < 20) {
      Alert.alert("More Detail Needed", "Please provide more details about the issue (at least 20 characters)");
      return;
    }

    Alert.alert(
      "File Dispute",
      "Are you sure you want to file this dispute? Our team will review it and respond within 24-48 hours.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "File Dispute",
          style: "destructive",
          onPress: async () => {
            setSubmitting(true);
            try {
              // Upload evidence images first if any
              const evidenceUrls: string[] = [];
              if (evidenceImages.length > 0) {
                setUploadingEvidence(true);
                for (const image of evidenceImages) {
                  const uploadResult = await TransferProofService.uploadProof(orderId!, image.base64);
                  if (uploadResult.success && uploadResult.url) {
                    evidenceUrls.push(uploadResult.url);
                  }
                }
                setUploadingEvidence(false);
              }

              const params: CreateDisputeParams = {
                orderId: orderId!,
                reason: selectedReason,
                description: description.trim(),
                evidenceUrls: evidenceUrls.length > 0 ? evidenceUrls : undefined,
              };

              const result = await DisputeService.openDispute(params);

              if (!result.success) {
                throw new Error(result.error || "Failed to file dispute");
              }

              Alert.alert(
                "Dispute Filed",
                evidenceUrls.length > 0
                  ? `Your dispute has been submitted with ${evidenceUrls.length} piece(s) of evidence. We'll review it and get back to you within 24-48 hours.`
                  : "Your dispute has been submitted. We'll review it and get back to you within 24-48 hours. You can track the status in your dispute history.",
                [
                  {
                    text: "View Status",
                    onPress: () => router.replace(`/dispute/status/${result.data?.id}`),
                  },
                  {
                    text: "Go Back",
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (err) {
              console.error("Error filing dispute:", err);
              Alert.alert("Error", err instanceof Error ? err.message : "Failed to file dispute");
            } finally {
              setSubmitting(false);
              setUploadingEvidence(false);
            }
          },
        },
      ]
    );
  };

  const getReasonLabel = (value: string) => {
    return DISPUTE_REASONS.find((r) => r.value === value)?.label || value;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={["#ef4444", "#dc2626", "#b91c1c"]}
          style={styles.background}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!order || !user) {
    return null;
  }

  const isBuyer = user.id === order.buyer_id;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#ef4444", "#dc2626", "#b91c1c"]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={styles.headerButton} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={styles.scrollViewContent}
          >
          <View style={styles.contentCard}>
            {/* Warning Banner */}
            <View style={styles.warningBanner}>
              <Ionicons name="warning" size={24} color="#dc2626" />
              <Text style={styles.warningText}>
                Filing a false dispute may result in account penalties. Please only file if you have a genuine issue.
              </Text>
            </View>

            {/* Order Info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Details</Text>
              <View style={styles.orderCard}>
                <Text style={styles.ticketTitle}>{order.ticket.title}</Text>
                <View style={styles.orderDetail}>
                  <Text style={styles.orderLabel}>Amount</Text>
                  <Text style={styles.orderValue}>${order.amount.toFixed(2)}</Text>
                </View>
                <View style={styles.orderDetail}>
                  <Text style={styles.orderLabel}>{isBuyer ? "Seller" : "Buyer"}</Text>
                  <Text style={styles.orderValue}>
                    {order.other_party.full_name} (@{order.other_party.username})
                  </Text>
                </View>
                <View style={styles.orderDetail}>
                  <Text style={styles.orderLabel}>Status</Text>
                  <Text style={styles.orderValue}>
                    {order.escrow_status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Text>
                </View>
              </View>
            </View>

            {/* Reason Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason for Dispute *</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowReasonPicker(!showReasonPicker)}
              >
                <Text
                  style={[
                    styles.pickerButtonText,
                    !selectedReason && styles.pickerPlaceholder,
                  ]}
                >
                  {selectedReason ? getReasonLabel(selectedReason) : "Select a reason..."}
                </Text>
                <Ionicons
                  name={showReasonPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {showReasonPicker && (
                <View style={styles.reasonList}>
                  {DISPUTE_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason.value}
                      style={[
                        styles.reasonOption,
                        selectedReason === reason.value && styles.reasonOptionSelected,
                      ]}
                      onPress={() => {
                        setSelectedReason(reason.value);
                        setShowReasonPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.reasonOptionText,
                          selectedReason === reason.value && styles.reasonOptionTextSelected,
                        ]}
                      >
                        {reason.label}
                      </Text>
                      {selectedReason === reason.value && (
                        <Ionicons name="checkmark" size={20} color="#ef4444" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Describe the Issue *</Text>
              <TextInput
                style={styles.textArea}
                value={description}
                onChangeText={setDescription}
                placeholder="Please provide as much detail as possible about what happened. Include dates, times, and any relevant information that will help us investigate."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>
                {description.length} / 1000 characters
              </Text>
            </View>

            {/* Evidence Upload Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upload Evidence (Optional)</Text>
              <Text style={styles.evidenceSubtitle}>
                Add screenshots or photos to support your claim. This helps us resolve your dispute faster.
              </Text>

              {/* Evidence Preview */}
              {evidenceImages.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.evidencePreviewRow}
                >
                  {evidenceImages.map((image, index) => (
                    <View key={index} style={styles.evidenceImageContainer}>
                      <Image source={{ uri: image.uri }} style={styles.evidenceImage} />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(index)}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}

              {/* Upload Buttons */}
              <View style={styles.evidenceButtons}>
                <TouchableOpacity
                  style={styles.evidenceUploadButton}
                  onPress={handlePickImage}
                  disabled={evidenceImages.length >= 5}
                >
                  <Ionicons name="images-outline" size={22} color={evidenceImages.length >= 5 ? "#9ca3af" : "#f59e0b"} />
                  <Text style={[styles.evidenceUploadText, evidenceImages.length >= 5 && styles.evidenceUploadTextDisabled]}>
                    Gallery
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.evidenceUploadButton}
                  onPress={handleTakePhoto}
                  disabled={evidenceImages.length >= 5}
                >
                  <Ionicons name="camera-outline" size={22} color={evidenceImages.length >= 5 ? "#9ca3af" : "#f59e0b"} />
                  <Text style={[styles.evidenceUploadText, evidenceImages.length >= 5 && styles.evidenceUploadTextDisabled]}>
                    Camera
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.evidenceCount}>
                {evidenceImages.length}/5 images added
              </Text>

              {/* Evidence Tips */}
              <View style={styles.evidenceTips}>
                <Text style={styles.evidenceTipsTitle}>Good evidence includes:</Text>
                <View style={styles.evidenceTipRow}>
                  <Ionicons name="checkmark" size={16} color="#10b981" />
                  <Text style={styles.evidenceTipText}>Screenshots of transfer confirmations</Text>
                </View>
                <View style={styles.evidenceTipRow}>
                  <Ionicons name="checkmark" size={16} color="#10b981" />
                  <Text style={styles.evidenceTipText}>Communication with the other party</Text>
                </View>
                <View style={styles.evidenceTipRow}>
                  <Ionicons name="checkmark" size={16} color="#10b981" />
                  <Text style={styles.evidenceTipText}>Email confirmations or receipts</Text>
                </View>
              </View>
            </View>

            {/* What Happens Next */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What Happens Next</Text>
              <View style={styles.infoCard}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoNumber}>1</Text>
                  </View>
                  <Text style={styles.infoText}>
                    Your dispute will be reviewed by our team within 24-48 hours
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoNumber}>2</Text>
                  </View>
                  <Text style={styles.infoText}>
                    The payment will be held until the dispute is resolved
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoNumber}>3</Text>
                  </View>
                  <Text style={styles.infoText}>
                    We may contact you or the other party for additional information
                  </Text>
                </View>
                <View style={styles.infoItem}>
                  <View style={styles.infoIcon}>
                    <Text style={styles.infoNumber}>4</Text>
                  </View>
                  <Text style={styles.infoText}>
                    You'll receive a notification when a decision is made
                  </Text>
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!selectedReason || !description.trim() || submitting) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!selectedReason || !description.trim() || submitting}
            >
              {submitting ? (
                <View style={styles.submittingContent}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.submitButtonText}>
                    {uploadingEvidence ? "Uploading Evidence..." : "Filing Dispute..."}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="alert-circle" size={22} color="white" />
                  <Text style={styles.submitButtonText}>
                    {evidenceImages.length > 0 ? `File Dispute with ${evidenceImages.length} Image${evidenceImages.length > 1 ? "s" : ""}` : "File Dispute"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: "white",
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  contentCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 20,
    paddingBottom: 100,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#991b1b",
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  orderCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  orderDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  orderLabel: {
    fontSize: 14,
    color: "#6b7280",
  },
  orderValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pickerButtonText: {
    fontSize: 16,
    color: "#1e293b",
  },
  pickerPlaceholder: {
    color: "#9ca3af",
  },
  reasonList: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  reasonOptionSelected: {
    backgroundColor: "#fef2f2",
  },
  reasonOptionText: {
    fontSize: 15,
    color: "#1e293b",
  },
  reasonOptionTextSelected: {
    color: "#ef4444",
    fontWeight: "600",
  },
  textArea: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "right",
    marginTop: 8,
  },
  infoCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "white",
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#0369a1",
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    marginTop: 8,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: "#fca5a5",
    shadowOpacity: 0,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "white",
  },
  cancelButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    marginTop: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b7280",
  },
  // Evidence Upload Styles
  evidenceSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  evidencePreviewRow: {
    marginBottom: 16,
  },
  evidenceImageContainer: {
    position: "relative",
    marginRight: 12,
  },
  evidenceImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
  },
  evidenceButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  evidenceUploadButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  evidenceUploadText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#92400e",
  },
  evidenceUploadTextDisabled: {
    color: "#9ca3af",
  },
  evidenceCount: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    marginBottom: 16,
  },
  evidenceTips: {
    backgroundColor: "#f0fdf4",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  evidenceTipsTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#166534",
    marginBottom: 8,
  },
  evidenceTipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  evidenceTipText: {
    fontSize: 13,
    color: "#15803d",
  },
  submittingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
});
