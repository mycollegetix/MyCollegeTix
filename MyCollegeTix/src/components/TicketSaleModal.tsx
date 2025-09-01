import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/src/lib/supabase";

const { width } = Dimensions.get("window");

interface TicketSaleModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSale: (saleData: TicketSaleData) => Promise<void>;
  ticket: {
    id: string;
    title: string;
    price: number;
  };
  isLoading?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TicketSaleData {
  buyerId?: string;
  buyerName: string;
  salePrice: string;
  paymentMethod?: string;
  additionalNotes?: string;
  buyerRating: number;
  buyerReview?: string;
  communicationRating: number;
  reliabilityRating: number;
  transactionSmoothness: number;
}

interface ConversationParticipant {
  id: string;
  username: string;
  full_name: string;
}

const PAYMENT_METHODS = [
  "Cash",
  "Venmo",
  "PayPal",
  "Zelle",
  "Apple Pay",
  "Bank Transfer",
  "Other",
];

export default function TicketSaleModal({
  visible,
  onClose,
  onConfirmSale,
  ticket,
  isLoading = false,
  primaryColor = "#18453b",
  secondaryColor = "#ffd700",
}: TicketSaleModalProps) {
  const [formData, setFormData] = useState<TicketSaleData>({
    buyerId: "",
    buyerName: "",
    salePrice: ticket.price.toString(),
    paymentMethod: "",
    additionalNotes: "",
    buyerRating: 0,
    buyerReview: "",
    communicationRating: 0,
    reliabilityRating: 0,
    transactionSmoothness: 0,
  });

  const [conversationParticipants, setConversationParticipants] = useState<
    ConversationParticipant[]
  >([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [errors, setErrors] = useState<Partial<TicketSaleData>>({});

  // Load conversations when modal opens
  useEffect(() => {
    if (visible && ticket.id) {
      loadConversationParticipants();
    }
  }, [visible, ticket.id]);

  const loadConversationParticipants = async () => {
    setLoadingConversations(true);
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user) {
        console.error("Error getting current user:", userError);
        return;
      }
      const currentUserId = userData.user.id;

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          participant_1_id,
          participant_2_id,
          participant_1:profiles!participant_1_id(id, username, full_name),
          participant_2:profiles!participant_2_id(id, username, full_name)
        `
        )
        .eq("ticket_id", ticket.id);

      if (error) {
        console.error("Error loading conversations:", error);
        return;
      }

      const participants = new Map<string, ConversationParticipant>();

      data?.forEach((conversation) => {
        const p1 = conversation.participant_1;
        if (p1 && p1.id !== currentUserId) {
          participants.set(p1.id, {
            id: p1.id,
            username: p1.username || "",
            full_name: p1.full_name || "",
          });
        }

        const p2 = conversation.participant_2;
        if (p2 && p2.id !== currentUserId) {
          participants.set(p2.id, {
            id: p2.id,
            username: p2.username || "",
            full_name: p2.full_name || "",
          });
        }
      });

      setConversationParticipants(Array.from(participants.values()));
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        buyerId: "",
        buyerName: "",
        salePrice: ticket.price.toString(),
        paymentMethod: "",
        additionalNotes: "",
        buyerRating: 0,
        buyerReview: "",
        communicationRating: 0,
        reliabilityRating: 0,
        transactionSmoothness: 0,
      });
      setErrors({});
      setConversationParticipants([]);
      onClose();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<TicketSaleData> = {};

    if (!formData.buyerName.trim()) {
      newErrors.buyerName = "Buyer name is required";
    } else if (formData.buyerName.length > 100) {
      newErrors.buyerName = "Buyer name must be less than 100 characters";
    }

    const salePrice = parseFloat(formData.salePrice);
    if (!formData.salePrice || isNaN(salePrice) || salePrice < 0) {
      newErrors.salePrice = "Please enter a valid sale price";
    }

    if (formData.additionalNotes && formData.additionalNotes.length > 500) {
      newErrors.additionalNotes =
        "Additional notes must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmSale = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onConfirmSale(formData);
      handleClose();
    } catch (error) {
      console.error("Error confirming sale:", error);
      Alert.alert(
        "Error",
        "Failed to record sale information. Please try again."
      );
    }
  };

  const renderPaymentMethods = () => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>How did they pay?</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.optionsScroll}
      >
        {PAYMENT_METHODS.map((method) => (
          <TouchableOpacity
            key={method}
            style={[
              styles.optionButton,
              formData.paymentMethod === method && {
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              },
            ]}
            onPress={() => setFormData({ ...formData, paymentMethod: method })}
          >
            <Text
              style={[
                styles.optionButtonText,
                formData.paymentMethod === method && { color: "white" },
              ]}
            >
              {method}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderPriceComparison = () => {
    const salePrice = parseFloat(formData.salePrice);
    if (isNaN(salePrice) || ticket.price === salePrice) return null;

    const difference = Math.abs(salePrice - ticket.price);
    const sign = salePrice > ticket.price ? "+" : "-";

    return (
      <Text style={styles.priceComparison}>
        {`Original asking price: $${ticket.price.toFixed(
          2
        )} (${sign}$${difference.toFixed(2)})`}
      </Text>
    );
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
            <Text style={styles.headerTitle}>Mark as Sold</Text>
            <View style={styles.placeholder} />
          </View>
          <Text style={styles.headerSubtitle}>{ticket.title}</Text>
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {/* Buyer Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Who did you sell this to? <Text style={styles.required}>*</Text>
              </Text>

              {loadingConversations ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>
                    Loading people you've chatted with...
                  </Text>
                </View>
              ) : conversationParticipants.length > 0 ? (
                <>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.optionsScroll}
                  >
                    {conversationParticipants.map((participant) => (
                      <TouchableOpacity
                        key={participant.id}
                        style={[
                          styles.participantButton,
                          formData.buyerId === participant.id && {
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                          },
                        ]}
                        onPress={() =>
                          setFormData({
                            ...formData,
                            buyerId: participant.id,
                            buyerName:
                              participant.full_name ||
                              participant.username ||
                              "Unknown User",
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.participantButtonText,
                            formData.buyerId === participant.id && {
                              color: "white",
                            },
                          ]}
                        >
                          {participant.full_name ||
                            participant.username ||
                            "Unknown User"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[
                        styles.participantButton,
                        !formData.buyerId &&
                          formData.buyerName === "other" && {
                            backgroundColor: primaryColor,
                            borderColor: primaryColor,
                          },
                      ]}
                      onPress={() =>
                        setFormData({
                          ...formData,
                          buyerId: "",
                          buyerName: "other",
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.participantButtonText,
                          !formData.buyerId &&
                            formData.buyerName === "other" && {
                              color: "white",
                            },
                        ]}
                      >
                        Other
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </>
              ) : (
                <TouchableOpacity
                  style={styles.otherPersonButton}
                  onPress={() =>
                    setFormData({ ...formData, buyerName: "other" })
                  }
                >
                  <Text style={styles.otherPersonButtonText}>
                    Add buyer name
                  </Text>
                </TouchableOpacity>
              )}

              {!formData.buyerId && formData.buyerName === "other" && (
                <TextInput
                  style={[styles.input, errors.buyerName && styles.inputError]}
                  placeholder="Enter buyer's name"
                  value={
                    formData.buyerName === "other" ? "" : formData.buyerName
                  }
                  onChangeText={(text) =>
                    setFormData({ ...formData, buyerName: text })
                  }
                  editable={!isLoading}
                  maxLength={100}
                  autoFocus
                />
              )}

              {errors.buyerName && (
                <Text style={styles.errorText}>{errors.buyerName}</Text>
              )}
            </View>

            {/* Sale Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Final sale price <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.dollarSign}>$</Text>
                <TextInput
                  style={[
                    styles.priceInput,
                    errors.salePrice && styles.inputError,
                  ]}
                  placeholder="0.00"
                  value={formData.salePrice}
                  onChangeText={(text) =>
                    setFormData({ ...formData, salePrice: text })
                  }
                  keyboardType="numeric"
                  editable={!isLoading}
                />
              </View>
              {renderPriceComparison()}
              {errors.salePrice && (
                <Text style={styles.errorText}>{errors.salePrice}</Text>
              )}
            </View>

            {/* Payment Method */}
            {renderPaymentMethods()}

            {/* Rating Section - STAR RATING IN MARK AS SOLD MODAL */}
            {formData.buyerName !== "" && formData.buyerName !== "other" && (
              <View style={styles.ratingSection}>
                <Text style={styles.sectionTitle}>Rate Your Buyer</Text>
                <Text style={styles.sectionSubtitle}>Help build trust in our community</Text>

                <View style={styles.ratingGroup}>
                  <Text style={styles.ratingLabel}>Overall Rating</Text>
                  <View style={styles.starRating}>
                    <TouchableOpacity 
                      style={styles.starButton}
                      onPress={() => setFormData({...formData, buyerRating: 1})}
                    >
                      <Ionicons 
                        name="star" 
                        size={28} 
                        color={formData.buyerRating >= 1 ? "#fbbf24" : "#d1d5db"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.starButton}
                      onPress={() => setFormData({...formData, buyerRating: 2})}
                    >
                      <Ionicons 
                        name="star" 
                        size={28} 
                        color={formData.buyerRating >= 2 ? "#fbbf24" : "#d1d5db"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.starButton}
                      onPress={() => setFormData({...formData, buyerRating: 3})}
                    >
                      <Ionicons 
                        name="star" 
                        size={28} 
                        color={formData.buyerRating >= 3 ? "#fbbf24" : "#d1d5db"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.starButton}
                      onPress={() => setFormData({...formData, buyerRating: 4})}
                    >
                      <Ionicons 
                        name="star" 
                        size={28} 
                        color={formData.buyerRating >= 4 ? "#fbbf24" : "#d1d5db"} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.starButton}
                      onPress={() => setFormData({...formData, buyerRating: 5})}
                    >
                      <Ionicons 
                        name="star" 
                        size={28} 
                        color={formData.buyerRating >= 5 ? "#fbbf24" : "#d1d5db"} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {formData.buyerRating > 0 && (
                  <View style={styles.reviewGroup}>
                    <Text style={styles.ratingLabel}>Review (Optional)</Text>
                    <TextInput
                      style={styles.reviewInput}
                      placeholder="Share your experience with this buyer"
                      placeholderTextColor="#9ca3af"
                      value={formData.buyerReview || ""}
                      onChangeText={(text) => setFormData({...formData, buyerReview: text})}
                      multiline
                      numberOfLines={3}
                      maxLength={300}
                      textAlignVertical="top"
                      editable={!isLoading}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Additional Notes */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Additional notes (optional)</Text>
              <TextInput
                style={[
                  styles.textArea,
                  errors.additionalNotes && styles.inputError,
                ]}
                placeholder="Any additional details about the sale..."
                value={formData.additionalNotes}
                onChangeText={(text) =>
                  setFormData({ ...formData, additionalNotes: text })
                }
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!isLoading}
                maxLength={500}
              />
              <Text style={styles.characterCount}>
                {(formData.additionalNotes?.length || 0).toString()}/500
              </Text>
              {errors.additionalNotes && (
                <Text style={styles.errorText}>{errors.additionalNotes}</Text>
              )}
            </View>
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
            ]}
            onPress={handleConfirmSale}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.confirmButtonText}>Saving...</Text>
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="white" />
                <Text style={styles.confirmButtonText}>Confirm Sale</Text>
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
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  required: {
    color: "#ef4444",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "white",
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    paddingLeft: 12,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    borderWidth: 0,
  },
  priceComparison: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "white",
    minHeight: 80,
  },
  characterCount: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 4,
  },
  optionsScroll: {
    marginVertical: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
  },
  optionButtonText: {
    fontSize: 14,
    color: "#374151",
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
  loadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 14,
    color: "#6b7280",
  },
  participantButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "white",
    minWidth: 100,
  },
  participantButtonText: {
    fontSize: 14,
    color: "#374151",
    textAlign: "center",
  },
  otherPersonButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#f9fafb",
  },
  otherPersonButtonText: {
    fontSize: 14,
    color: "#6b7280",
  },
  ratingSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    marginBottom: 20,
    lineHeight: 20,
  },
  ratingGroup: {
    marginBottom: 16,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  reviewGroup: {
    marginTop: 8,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: "white",
    minHeight: 80,
    color: "#1f2937",
    textAlignVertical: "top",
  },
  starRating: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  starButton: {
    padding: 4,
  },
});
