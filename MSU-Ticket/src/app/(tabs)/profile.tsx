import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
} from "react-native";
import { UserAvatar } from "@/src/components/UserAvatar";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

export default function ProfileScreen() {
  const { signOut, profile, user } = useAuth();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [activeSection, setActiveSection] = useState<"profile" | "settings">(
    "profile"
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const handleSignOut = async () => {
    console.log("🚪 Starting sign out process...");
    await signOut();
    console.log("✅ Sign out complete, redirecting to login");
    router.replace("/(auth)/login");
  };

  const handlePasswordUpdate = async () => {
    if (!password) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      // Here you would implement password update with Supabase
      // const { error } = await supabase.auth.updateUser({ password });
      // if (error) throw error;

      Alert.alert("Success", "Password updated successfully");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Final Confirmation",
      "Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently remove all your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              // Here you would implement account deletion
              // await deleteUserAccount();
              Alert.alert(
                "Account Deleted",
                "Your account has been deleted successfully"
              );
              await signOut();
            } catch (error: any) {
              Alert.alert("Error", "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  const PasswordStrengthIndicator = ({ password }: { password: string }) => {
    const getStrength = () => {
      if (password.length < 6)
        return { color: "#ef4444", text: "Weak", flex: 0.25 };
      if (password.length < 10)
        return { color: "#f59e0b", text: "Medium", flex: 0.6 };
      return { color: "#10b981", text: "Strong", flex: 1 };
    };

    const strength = getStrength();

    return (
      <View style={styles.strengthContainer}>
        <View style={styles.strengthBar}>
          <View
            style={[
              styles.strengthFill,
              { backgroundColor: strength.color, flex: strength.flex },
            ]}
          />
        </View>
        <Text style={[styles.strengthText, { color: strength.color }]}>
          {strength.text}
        </Text>
      </View>
    );
  };

  const InfoCard = ({
    icon,
    label,
    value,
  }: {
    icon: string;
    label: string;
    value: string;
  }) => (
    <View style={styles.infoCard}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon as any} size={20} color="#18453b" />
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
        style={styles.background}
      />

      {/* Floating elements */}
      <View style={styles.floatingElement1} />
      <View style={styles.floatingElement2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#ffd700", "#ffed4a"]}
                style={styles.logo}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={32}
                  color="#18453b"
                />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>
              {profile?.full_name || "MSU Student"}
            </Text>
            <Text style={styles.headerSubtitle}>{user?.email}</Text>
          </View>

          {/* Tab Section */}
          <View style={styles.tabSection}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeSection === "profile" && styles.activeTab,
                ]}
                onPress={() => setActiveSection("profile")}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color={activeSection === "profile" ? "white" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeSection === "profile" && styles.activeTabText,
                  ]}
                >
                  Profile
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tab,
                  activeSection === "settings" && styles.activeTab,
                ]}
                onPress={() => setActiveSection("settings")}
              >
                <Ionicons
                  name="settings-outline"
                  size={20}
                  color={activeSection === "settings" ? "white" : "#6b7280"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeSection === "settings" && styles.activeTabText,
                  ]}
                >
                  Settings
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {activeSection === "profile" ? (
              <View style={styles.profileContent}>
                <Text style={styles.sectionTitle}>Account Information</Text>
                <Text style={styles.sectionSubtitle}>
                  Your personal account details
                </Text>

                <View style={styles.infoGrid}>
                  <InfoCard
                    icon="person-outline"
                    label="Full Name"
                    value={profile?.full_name || "Not set"}
                  />
                  <InfoCard
                    icon="mail-outline"
                    label="Email Address"
                    value={user?.email || ""}
                  />
                  <InfoCard
                    icon="calendar-outline"
                    label="Member Since"
                    value={
                      user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "Unknown"
                    }
                  />
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Quick Actions</Text>
                  <Text style={styles.sectionSubtitle}>
                    Manage your account preferences
                  </Text>

                  <View style={styles.quickActionsGrid}>
                    <TouchableOpacity style={styles.quickActionCard}>
                      <View style={styles.quickActionIcon}>
                        <Ionicons
                          name="notifications-outline"
                          size={24}
                          color="#18453b"
                        />
                      </View>
                      <Text style={styles.quickActionText}>Notifications</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#6b7280"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.quickActionCard}>
                      <View style={styles.quickActionIcon}>
                        <Ionicons
                          name="help-circle-outline"
                          size={24}
                          color="#18453b"
                        />
                      </View>
                      <Text style={styles.quickActionText}>Help & Support</Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#6b7280"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.settingsContent}>
                <Text style={styles.sectionTitle}>Security Settings</Text>
                <Text style={styles.sectionSubtitle}>
                  Manage your account security and privacy
                </Text>

                {/* Password Update Form */}
                <View style={styles.formCard}>
                  <Text style={styles.formTitle}>Update Password</Text>
                  <Text style={styles.formSubtitle}>
                    Enter a new password to update your account security
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#9ca3af"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Enter new password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>
                    </View>
                    {password.length > 0 && (
                      <PasswordStrengthIndicator password={password} />
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm Password</Text>
                    <View style={styles.inputWrapper}>
                      <Ionicons
                        name="lock-closed-outline"
                        size={20}
                        color="#9ca3af"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={styles.input}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        placeholderTextColor="#9ca3af"
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        style={styles.eyeIcon}
                      >
                        <Ionicons
                          name={
                            showConfirmPassword
                              ? "eye-outline"
                              : "eye-off-outline"
                          }
                          size={20}
                          color="#9ca3af"
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPassword.length > 0 &&
                      confirmPassword !== password && (
                        <Text style={styles.errorText}>
                          Passwords do not match
                        </Text>
                      )}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.updateButton,
                      isLoading && styles.loadingButton,
                    ]}
                    onPress={handlePasswordUpdate}
                    disabled={
                      isLoading || !password || password !== confirmPassword
                    }
                  >
                    <LinearGradient
                      colors={["#18453b", "#2a6b5a"]}
                      style={styles.buttonGradient}
                    >
                      <Text style={styles.buttonText}>
                        {isLoading ? "Updating..." : "Update Password"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Danger Zone */}
                <View style={styles.dangerZone}>
                  <Text style={styles.dangerTitle}>Danger Zone</Text>
                  <Text style={styles.dangerSubtitle}>
                    These actions cannot be undone
                  </Text>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => setDeleteModalVisible(true)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.deleteButtonText}>Delete Account</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Sign Out Button */}
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            {/* Security Info */}
            <BlurView intensity={20} style={styles.infoBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#18453b"
              />
              <View style={styles.infoBoxContent}>
                <Text style={styles.infoBoxTitle}>Secure & Protected</Text>
                <Text style={styles.infoBoxText}>
                  Your personal information is encrypted and secure with MSU
                  Ticket Exchange.
                </Text>
              </View>
            </BlurView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Delete Account Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} style={styles.modalBlur}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons name="warning-outline" size={32} color="#ef4444" />
                </View>
                <Text style={styles.modalTitle}>Delete Account</Text>
                <Text style={styles.modalSubtitle}>
                  This action cannot be undone
                </Text>
              </View>

              <View style={styles.modalWarning}>
                <Text style={styles.warningText}>
                  ⚠️ Deleting your account will permanently remove all your
                  data, tickets, and order history. This action is irreversible.
                </Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    handleDeleteAccount();
                  }}
                >
                  <Text style={styles.confirmDeleteText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
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
  floatingElement1: {
    position: "absolute",
    top: "15%",
    left: "10%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 215, 0, 0.08)",
  },
  floatingElement2: {
    position: "absolute",
    bottom: "30%",
    right: "15%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
  },
  headerSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  tabSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  activeTab: {
    backgroundColor: "#18453b",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activeTabText: {
    color: "white",
  },
  contentSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  profileContent: {
    gap: 32,
  },
  settingsContent: {
    gap: 32,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  infoGrid: {
    gap: 16,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  quickActionsGrid: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  formCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#18453b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    height: 52,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 4,
  },
  strengthContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    flexDirection: "row",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 50,
  },
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 8,
  },
  updateButton: {
    borderRadius: 12,
    marginTop: 8,
    shadowColor: "#18453b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  dangerZone: {
    backgroundColor: "#fef2f2",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 4,
  },
  dangerSubtitle: {
    fontSize: 14,
    color: "#991b1b",
    marginBottom: 16,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#dc2626",
    paddingVertical: 16,
    borderRadius: 12,
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    marginTop: 20,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ef4444",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
    gap: 12,
  },
  infoBoxContent: {
    flex: 1,
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
    marginBottom: 4,
  },
  infoBoxText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIcon: {
    width: 60,
    height: 60,
    backgroundColor: "#fef2f2",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
  },
  modalWarning: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  warningText: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 16,
    backgroundColor: "#dc2626",
    borderRadius: 12,
    alignItems: "center",
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
});
