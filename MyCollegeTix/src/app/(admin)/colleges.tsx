// src/app/(admin)/colleges.tsx - Fixed version without modal flickering
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
  ScrollView,
  Switch,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { CollegeService } from "@/src/services/collegeService";
import { College } from "@/src/types/database.types";
import { useAuth } from "@/src/providers/AuthProvider";
import AdminLayout from "@/src/components/AdminLayout";

const { width } = Dimensions.get("window");

interface CollegeFormData {
  name: string;
  short_name: string;
  email_domain: string;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
}

// ✅ FIXED: Moved FormModal outside of the main component to prevent re-renders
const FormModal = ({
  visible,
  onClose,
  onSubmit,
  title,
  formData,
  formErrors,
  submitting,
  updateFormField,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  formData: CollegeFormData;
  formErrors: Record<string, string>;
  submitting: boolean;
  updateFormField: (
    field: keyof CollegeFormData,
    value: string | boolean
  ) => void;
}) => (
  <Modal visible={visible} animationType="slide" transparent>
    <BlurView intensity={50} style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.modalContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>College Name</Text>
            <TextInput
              style={[styles.input, formErrors.name && styles.inputError]}
              value={formData.name}
              onChangeText={(text) => updateFormField("name", text)}
              placeholder="e.g., Michigan State University"
              placeholderTextColor="#9ca3af"
            />
            {formErrors.name && (
              <Text style={styles.errorText}>{formErrors.name}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Short Name</Text>
            <TextInput
              style={[styles.input, formErrors.short_name && styles.inputError]}
              value={formData.short_name}
              onChangeText={(text) => updateFormField("short_name", text)}
              placeholder="e.g., MSU"
              placeholderTextColor="#9ca3af"
            />
            {formErrors.short_name && (
              <Text style={styles.errorText}>{formErrors.short_name}</Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email Domain</Text>
            <TextInput
              style={[
                styles.input,
                formErrors.email_domain && styles.inputError,
              ]}
              value={formData.email_domain}
              onChangeText={(text) => updateFormField("email_domain", text)}
              placeholder="e.g., msu.edu"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {formErrors.email_domain && (
              <Text style={styles.errorText}>{formErrors.email_domain}</Text>
            )}
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.inputLabel}>Primary Color</Text>
              <TextInput
                style={styles.input}
                value={formData.primary_color}
                onChangeText={(text) => updateFormField("primary_color", text)}
                placeholder="#18453b"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.inputLabel}>Secondary Color</Text>
              <TextInput
                style={styles.input}
                value={formData.secondary_color}
                onChangeText={(text) =>
                  updateFormField("secondary_color", text)
                }
                placeholder="#ffd700"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.inputLabel}>Active</Text>
            <Switch
              value={formData.is_active}
              onValueChange={(value) => updateFormField("is_active", value)}
              trackColor={{ false: "#e5e7eb", true: "#10b981" }}
              thumbColor={formData.is_active ? "#ffffff" : "#f3f4f6"}
            />
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity
            style={[styles.modalButton, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.submitButton]}
            onPress={onSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </BlurView>
  </Modal>
);

export default function CollegeManagementScreen() {
  const [colleges, setColleges] = useState<College[]>([]);
  const [filteredColleges, setFilteredColleges] = useState<College[]>([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCollege, setEditingCollege] = useState<College | null>(null);
  const [formData, setFormData] = useState<CollegeFormData>({
    name: "",
    short_name: "",
    email_domain: "",
    primary_color: "#18453b",
    secondary_color: "#ffd700",
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const { profile } = useAuth();

  const loadColleges = useCallback(async () => {
    setLoading(true);
    try {
      const result = await CollegeService.getAllColleges();
      if (result.success && result.data) {
        setColleges(result.data);
      } else {
        Alert.alert("Error", result.error || "Failed to load colleges");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to load colleges");
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadColleges();
    setRefreshing(false);
  }, [loadColleges]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "College name is required";
    }

    if (!formData.short_name.trim()) {
      errors.short_name = "Short name is required";
    }

    if (!formData.email_domain.trim()) {
      errors.email_domain = "Email domain is required";
    } else if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email_domain)) {
      errors.email_domain =
        "Please enter a valid domain (e.g., university.edu)";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleCreateCollege = useCallback(async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await CollegeService.createCollege(formData);
      if (result.success) {
        Alert.alert("Success", "College created successfully!");
        setShowCreateModal(false);
        resetForm();
        loadColleges();
      } else {
        Alert.alert("Error", result.error || "Failed to create college");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to create college");
    } finally {
      setSubmitting(false);
    }
  }, [formData, validateForm, loadColleges]);

  const handleEditCollege = useCallback(async () => {
    if (!editingCollege || !validateForm()) return;

    setSubmitting(true);
    try {
      const result = await CollegeService.updateCollege(
        editingCollege.id,
        formData
      );
      if (result.success) {
        Alert.alert("Success", "College updated successfully!");
        setShowEditModal(false);
        setEditingCollege(null);
        resetForm();
        loadColleges();
      } else {
        Alert.alert("Error", result.error || "Failed to update college");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update college");
    } finally {
      setSubmitting(false);
    }
  }, [editingCollege, formData, validateForm, loadColleges]);

  const handleToggleActive = useCallback(
    async (college: College) => {
      const newStatus = !college.is_active;
      const action = newStatus ? "activate" : "deactivate";

      Alert.alert(
        `${action.charAt(0).toUpperCase() + action.slice(1)} College`,
        `Are you sure you want to ${action} ${college.name}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: action.charAt(0).toUpperCase() + action.slice(1),
            style: newStatus ? "default" : "destructive",
            onPress: async () => {
              try {
                const result = await CollegeService.toggleCollegeActiveStatus(
                  college.id,
                  newStatus
                );
                if (result.success) {
                  loadColleges();
                } else {
                  Alert.alert(
                    "Error",
                    result.error || `Failed to ${action} college`
                  );
                }
              } catch (error) {
                Alert.alert("Error", `Failed to ${action} college`);
              }
            },
          },
        ]
      );
    },
    [loadColleges]
  );

  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      short_name: "",
      email_domain: "",
      primary_color: "#18453b",
      secondary_color: "#ffd700",
      is_active: true,
    });
    setFormErrors({});
  }, []);

  const openEditModal = useCallback((college: College) => {
    setEditingCollege(college);
    setFormData({
      name: college.name,
      short_name: college.short_name,
      email_domain: college.email_domain,
      primary_color: college.primary_color,
      secondary_color: college.secondary_color,
      is_active: college.is_active,
    });
    setFormErrors({});
    setShowEditModal(true);
  }, []);

  const updateFormField = useCallback(
    (field: keyof CollegeFormData, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (formErrors[field]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [formErrors]
  );

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    resetForm();
  }, [resetForm]);

  const closeEditModal = useCallback(() => {
    setShowEditModal(false);
    setEditingCollege(null);
    resetForm();
  }, [resetForm]);

  useEffect(() => {
    loadColleges();
  }, [loadColleges]);

  useEffect(() => {
    const filtered = colleges.filter(
      (college) =>
        college.name.toLowerCase().includes(searchText.toLowerCase()) ||
        college.short_name.toLowerCase().includes(searchText.toLowerCase()) ||
        college.email_domain.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredColleges(filtered);
  }, [searchText, colleges]);

  const renderCollegeItem = useCallback(
    ({ item }: { item: College }) => (
      <BlurView intensity={20} style={styles.collegeCard}>
        <View style={styles.collegeHeader}>
          <View style={styles.collegeInfo}>
            <Text style={styles.collegeName}>{item.name}</Text>
            <Text style={styles.collegeShortName}>{item.short_name}</Text>
            <Text style={styles.collegeEmail}>@{item.email_domain}</Text>
          </View>

          <View style={styles.collegeActions}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: item.is_active ? "#10b981" : "#ef4444" },
              ]}
            >
              <Text style={styles.statusText}>
                {item.is_active ? "Active" : "Inactive"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.collegeFooter}>
          <View style={styles.colorPreview}>
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: item.primary_color },
              ]}
            />
            <View
              style={[
                styles.colorSwatch,
                { backgroundColor: item.secondary_color },
              ]}
            />
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="pencil" size={16} color="white" />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                item.is_active
                  ? styles.deactivateButton
                  : styles.activateButton,
              ]}
              onPress={() => handleToggleActive(item)}
            >
              <Ionicons
                name={item.is_active ? "pause" : "play"}
                size={16}
                color="white"
              />
              <Text style={styles.actionButtonText}>
                {item.is_active ? "Deactivate" : "Activate"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BlurView>
    ),
    [openEditModal, handleToggleActive]
  );

  return (
    <AdminLayout
      title="College Management"
      subtitle={`${filteredColleges.length} of ${colleges.length} colleges`}
    >
      <View style={styles.container}>
        <View style={styles.controlsHeader}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search colleges..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              resetForm();
              setShowCreateModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.addButtonText}>Add College</Text>
          </TouchableOpacity>
        </View>

        {/* College List */}
        <FlatList
          data={filteredColleges}
          renderItem={renderCollegeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Create Modal */}
        <FormModal
          visible={showCreateModal}
          onClose={closeCreateModal}
          onSubmit={handleCreateCollege}
          title="Create New College"
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          updateFormField={updateFormField}
        />

        {/* Edit Modal */}
        <FormModal
          visible={showEditModal}
          onClose={closeEditModal}
          onSubmit={handleEditCollege}
          title="Edit College"
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          updateFormField={updateFormField}
        />
      </View>
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  controlsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: "#1F2937",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18453b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  listContainer: {
    padding: 20,
  },
  collegeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  },
  collegeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  collegeInfo: {
    flex: 1,
  },
  collegeName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  collegeShortName: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  collegeEmail: {
    fontSize: 12,
    color: "#9ca3af",
  },
  collegeActions: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "white",
  },
  collegeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  colorPreview: {
    flexDirection: "row",
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: "#3b82f6",
  },
  activateButton: {
    backgroundColor: "#10b981",
  },
  deactivateButton: {
    backgroundColor: "#ef4444",
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "500",
    color: "white",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    width: width - 40,
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
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
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: "#1f2937",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  submitButton: {
    backgroundColor: "#18453b",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#6b7280",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
});