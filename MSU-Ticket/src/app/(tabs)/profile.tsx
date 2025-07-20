import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
} from "react-native";
import { UserAvatar } from "@/src/components/UserAvatar";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { NotificationBadge } from "@/src/components/NotificationBadge";

const { width, height } = Dimensions.get("window");

export default function ProfileScreen() {
  const { signOut, profile, user } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [activeSection, setActiveSection] = useState<"profile" | "settings">(
    "profile"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Check if user is admin
  const isAdmin = profile?.is_admin === true;

  const handleSignOut = async () => {
    console.log("🚪 Starting sign out process...");
    await signOut();
    console.log("✅ Sign out complete, redirecting to login");
    router.replace("/(auth)/login");
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      Alert.alert("Error", "No email address found for your account");
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔐 Sending password reset email to:", user.email);

      const { error } = await supabase.auth.resetPasswordForEmail(user.email);

      if (error) {
        console.error("❌ Password reset error:", error);
        throw error;
      }

      console.log("✅ Password reset email sent successfully");

      Alert.alert(
        "Password Reset Email Sent",
        `We've sent a password reset link to ${user.email}. Please check your email and follow the instructions to reset your password.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("❌ Password reset failed:", error);
      Alert.alert(
        "Error",
        error.message ||
          "Failed to send password reset email. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      console.log("🗑️ Starting account deletion...");

      if (!user?.id) {
        throw new Error("No user found");
      }

      // Call the delete_user function
      console.log("📝 Calling delete_user function...");
      const { error: deleteError } = await supabase.rpc("delete_user");

      if (deleteError) {
        console.error("❌ Account deletion error:", deleteError);
        throw deleteError;
      }

      console.log("✅ Account deleted successfully");

      Alert.alert(
        "Account Deleted",
        "Your account has been deleted successfully. You will now be signed out.",
        [
          {
            text: "OK",
            onPress: async () => {
              await signOut();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Account deletion failed:", error);

      // Provide more specific error messages
      if (
        error.message.includes("permission denied") ||
        error.message.includes("not found")
      ) {
        Alert.alert(
          "Error",
          "Unable to delete account. Please contact support for assistance."
        );
      } else {
        Alert.alert("Error", error.message || "Failed to delete account");
      }
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      "Final Confirmation",
      "Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently remove all your data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: handleDeleteAccount,
        },
      ]
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
      <View
        style={[
          styles.infoIconContainer,
          { backgroundColor: `${theme.primary}15` },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={theme.primary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: theme.primary }]}>
          {label}
        </Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Floating elements */}
      <View
        style={[
          styles.floatingElement1,
          { backgroundColor: `${theme.secondary}08` },
        ]}
      />
      <View
        style={[
          styles.floatingElement2,
          { backgroundColor: "rgba(255, 255, 255, 0.05)" },
        ]}
      />

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
                colors={[theme.secondary, `${theme.secondary}DD`]}
                style={styles.logo}
              >
                <Ionicons
                  name="person-circle-outline"
                  size={32}
                  color={theme.primary}
                />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>
              {profile?.full_name || "MSU Student"}
            </Text>
            <Text style={styles.headerSubtitle}>{user?.email}</Text>

            {/* Admin Badge */}
            {isAdmin && (
              <View
                style={[
                  styles.adminBadge,
                  {
                    backgroundColor: `${theme.secondary}20`,
                    borderColor: theme.secondary,
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={16}
                  color={theme.secondary}
                />
                <Text
                  style={[styles.adminBadgeText, { color: theme.secondary }]}
                >
                  Administrator
                </Text>
              </View>
            )}
          </View>

          {/* Tab Section */}
          <View style={styles.tabSection}>
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tab,
                  activeSection === "profile" && {
                    backgroundColor: theme.primary,
                  },
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
                  activeSection === "settings" && {
                    backgroundColor: theme.primary,
                  },
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
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  Account Information
                </Text>
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
                  {isAdmin && (
                    <InfoCard
                      icon="shield-checkmark-outline"
                      label="Account Type"
                      value="Administrator"
                    />
                  )}
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                    Quick Actions
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    Manage your account preferences
                  </Text>

                  <View style={styles.quickActionsGrid}>
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => (router.push as any)("/notifications")}
                    >
                      <View
                        style={[
                          styles.quickActionIcon,
                          { backgroundColor: `${theme.primary}15` },
                        ]}
                      >
                        <NotificationBadge
                          iconName="notifications-outline"
                          iconSize={24}
                          iconColor={theme.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.quickActionText,
                          { color: theme.primary },
                        ]}
                      >
                        Notifications
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#6b7280"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => (router.push as any)("/support/")}
                    >
                      <View
                        style={[
                          styles.quickActionIcon,
                          { backgroundColor: `${theme.primary}15` },
                        ]}
                      >
                        <Ionicons
                          name="help-circle-outline"
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.quickActionText,
                          { color: theme.primary },
                        ]}
                      >
                        Help & Support
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="#6b7280"
                      />
                    </TouchableOpacity>

                    {/* Admin Panel Button - Only show if user is admin */}
                    {isAdmin && (
                      <TouchableOpacity
                        style={[
                          styles.quickActionCard,
                          {
                            backgroundColor: `${theme.primary}10`,
                            borderColor: theme.secondary,
                          },
                        ]}
                        onPress={() => (router.push as any)("/(admin)/")}
                      >
                        <View
                          style={[
                            styles.quickActionIcon,
                            { backgroundColor: `${theme.secondary}20` },
                          ]}
                        >
                          <Ionicons
                            name="settings"
                            size={24}
                            color={theme.secondary}
                          />
                        </View>
                        <Text
                          style={[
                            styles.quickActionText,
                            { color: theme.secondary },
                          ]}
                        >
                          Admin Panel
                        </Text>
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={theme.secondary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.settingsContent}>
                <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                  Security Settings
                </Text>
                <Text style={styles.sectionSubtitle}>
                  Manage your account security and privacy
                </Text>

                {/* Password Reset Card */}
                <View style={styles.formCard}>
                  <Text style={[styles.formTitle, { color: theme.primary }]}>
                    Reset Password
                  </Text>
                  <Text style={styles.formSubtitle}>
                    Send a secure password reset link to your email address
                  </Text>

                  <View
                    style={[
                      styles.resetInfoBox,
                      {
                        backgroundColor: `${theme.primary}10`,
                        borderColor: `${theme.primary}40`,
                      },
                    ]}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={24}
                      color={theme.primary}
                    />
                    <View style={styles.resetInfoContent}>
                      <Text
                        style={[
                          styles.resetInfoTitle,
                          { color: theme.primary },
                        ]}
                      >
                        Email Reset
                      </Text>
                      <Text style={styles.resetInfoText}>
                        We'll send a secure link to{" "}
                        {user?.email || "your email"} to reset your password
                        safely.
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.resetButton,
                      isLoading && styles.loadingButton,
                    ]}
                    onPress={handlePasswordReset}
                    disabled={isLoading}
                  >
                    <LinearGradient
                      colors={[theme.primary, `${theme.primary}CC`]}
                      style={styles.buttonGradient}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons name="mail-outline" size={20} color="white" />
                        <Text style={styles.buttonText}>
                          {isLoading
                            ? "Sending Reset Link..."
                            : "Send Password Reset Email"}
                        </Text>
                      </View>
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
                <Text style={[styles.modalTitle, { color: theme.primary }]}>
                  Delete Account
                </Text>
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
                    confirmDeleteAccount();
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
  },
  floatingElement2: {
    position: "absolute",
    bottom: "30%",
    right: "15%",
    width: 60,
    height: 60,
    borderRadius: 30,
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
    shadowColor: "#000",
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
    marginBottom: 12,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  adminBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quickActionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
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
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  resetInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    gap: 12,
  },
  resetInfoContent: {
    flex: 1,
  },
  resetInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  resetInfoText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  resetButton: {
    borderRadius: 12,
    shadowColor: "#000",
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
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
