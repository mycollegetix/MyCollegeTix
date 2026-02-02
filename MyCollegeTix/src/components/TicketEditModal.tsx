// src/components/TicketEditModal.tsx
// Modal for editing ticket price and description
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface TicketEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (editData: TicketEditData) => Promise<void>;
  ticket: {
    id: string;
    title: string;
    price: number;
    description: string;
  } | null;
  isLoading?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface TicketEditData {
  price: string;
  description: string;
}

export default function TicketEditModal({
  visible,
  onClose,
  onSave,
  ticket,
  isLoading = false,
  primaryColor = "#18453b",
  secondaryColor = "#ffd700",
}: TicketEditModalProps) {
  const [editForm, setEditForm] = useState<TicketEditData>({
    price: "",
    description: "",
  });

  // Reset form when ticket changes
  useEffect(() => {
    if (ticket) {
      setEditForm({
        price: ticket.price.toString(),
        description: ticket.description || "",
      });
    }
  }, [ticket]);

  const handleSave = async () => {
    if (!editForm.price || parseFloat(editForm.price) <= 0) {
      return;
    }
    await onSave(editForm);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={[primaryColor, `${primaryColor}CC`]}
            style={styles.modalHeader}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Ticket</Text>
            <TouchableOpacity
              onPress={handleSave}
              disabled={isLoading}
              style={[
                styles.modalSaveButton,
                { backgroundColor: secondaryColor },
                isLoading && { opacity: 0.6 },
              ]}
            >
              <Text
                style={[styles.modalSaveButtonText, { color: primaryColor }]}
              >
                {isLoading ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {ticket && (
              <>
                <Text style={styles.ticketTitle}>{ticket.title}</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Price ($)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.price}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, price: text }))
                    }
                    placeholder="Enter price"
                    placeholderTextColor="#6b7280"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    style={styles.formTextArea}
                    value={editForm.description}
                    onChangeText={(text) =>
                      setEditForm((prev) => ({ ...prev, description: text }))
                    }
                    placeholder="Enter description"
                    placeholderTextColor="#6b7280"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  modalSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  ticketTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 20,
    lineHeight: 28,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
  },
  formTextArea: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1e293b",
    minHeight: 120,
    textAlignVertical: "top",
  },
});
