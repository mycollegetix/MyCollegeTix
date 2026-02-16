import React, { useState, useRef, useEffect } from "react";
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
  Animated,
  ActivityIndicator,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

import { UserAvatar } from "@/src/components/UserAvatar";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { useRouter } from "expo-router";
import { supabase } from "@/src/lib/supabase";
import { NotificationBadge } from "@/src/components/NotificationBadge";
import { AccountService } from "@/src/services/accountService";
import { StripeConnectService } from "@/src/services/stripeConnectService";
import { LegalDocumentStatus } from "@/src/components/LegalDocumentStatus";
import UserProfileCard from "@/src/components/UserProfileCard";
import Constants from "expo-constants";

const { width, height } = Dimensions.get("window");

type SectionType = "profile" | "settings";

interface FilterOption {
  value: SectionType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function ProfileScreen() {
  const { signOut, profile, user, deleteAccount } = useAuth();
  const router = useRouter();
  const theme = useTheme();

  const [activeSection, setActiveSection] = useState<SectionType>("profile");
  const [isLoading, setIsLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [dataSummary, setDataSummary] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingStripeDashboard, setIsLoadingStripeDashboard] =
    useState(false);

  // Animation refs for tab switching
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  // Filter options for segmented control
  const filterOptions: FilterOption[] = [
    {
      value: "profile",
      label: "Profile",
      icon: "person-circle-outline",
    },
    {
      value: "settings",
      label: "Settings",
      icon: "settings-outline",
    },
  ];

  // Initialize animation position based on current filter
  useEffect(() => {
    const index = filterOptions.findIndex(
      (option) => option.value === activeSection
    );
    slideAnimation.setValue(index);
  }, []);

  // Enhanced animation functions for segmented control
  const selectFilter = (filter: SectionType, index: number) => {
    if (filter === activeSection) return;

    // Fade out content briefly for smooth transition
    Animated.sequence([
      Animated.timing(fadeAnimation, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Slide indicator to new position
    Animated.spring(slideAnimation, {
      toValue: index,
      tension: 120,
      friction: 8,
      useNativeDriver: true,
    }).start();

    setActiveSection(filter);
  };

  // Check if user is admin
  const isAdmin = profile?.is_admin === true;

  const handleSignOut = async () => {
    console.log("🚪 Starting sign out process...");
    await signOut();
    console.log("✅ Sign out complete, redirecting to login");
    router.replace("/(auth)/login");
  };

  const loadDataSummary = async () => {
    try {
      const { data, error } = await AccountService.getAccountDataSummary();
      if (!error && data) {
        setDataSummary(data);
      }
    } catch (error) {
      console.error("Error loading data summary:", error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      console.log("🗑️ Starting comprehensive account deletion...");

      const result = await deleteAccount();

      if (result.success) {
        console.log("✅ Account deleted successfully");

        Alert.alert(
          "Account Deleted",
          "Your account and all associated data have been permanently deleted. You will now be signed out.",
          [
            {
              text: "OK",
              onPress: () => {
                // User is automatically signed out by deleteAccount function
                router.replace("/(auth)/login");
              },
            },
          ]
        );
      } else {
        throw new Error(result.error?.message || "Failed to delete account");
      }
    } catch (error: any) {
      console.error("❌ Account deletion failed:", error);

      Alert.alert(
        "Deletion Failed",
        error.message ||
          "Unable to delete account. Please contact support for assistance."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    const dataText = dataSummary
      ? `\n\nThis will permanently delete:\n• ${
          dataSummary.messages || 0
        } messages\n• ${dataSummary.tickets || 0} tickets\n• ${
          dataSummary.orders || 0
        } orders\n• ${dataSummary.conversations || 0} conversations\n• ${
          dataSummary.watchlist || 0
        } watchlist items\n• ${dataSummary.notifications || 0} notifications`
      : "";

    Alert.alert(
      "Final Confirmation",
      `Are you absolutely sure you want to delete your account? This action cannot be undone and will permanently remove all your data.${dataText}`,
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
  const openInAppBrowser = async (url: string) => {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: "#635bff", // Stripe purple (optional)
      showTitle: true,
      enableBarCollapsing: true,
    });
  };

  const handleOpenStripeDashboard = async () => {
    setIsLoadingStripeDashboard(true);

    try {
      const result = await StripeConnectService.getDashboardLink();

      if (!result.success || !result.data) {
        Alert.alert(
          "Error",
          result.error || "Unable to access payment settings. Please try again."
        );
        return;
      }

      const { hasAccount, onboardingComplete, url } = result.data;

      // No Stripe account yet
      if (!hasAccount) {
        Alert.alert(
          "Payment Setup Required",
          "You need to set up your payment account to access the Stripe dashboard. Would you like to set it up now?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Set Up Payments",
              onPress: async () => {
                const onboardingResult =
                  await StripeConnectService.createConnectAccount();

                if (
                  onboardingResult.success &&
                  onboardingResult.data?.onboardingUrl
                ) {
                  await openInAppBrowser(onboardingResult.data.onboardingUrl);
                } else {
                  Alert.alert(
                    "Error",
                    onboardingResult.error || "Failed to start payment setup."
                  );
                }
              },
            },
          ]
        );
        return;
      }

      // Account exists but onboarding incomplete
      if (!onboardingComplete && url) {
        Alert.alert(
          "Complete Setup",
          "Please complete your payment setup to access the full dashboard.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue Setup",
              onPress: () => openInAppBrowser(url),
            },
          ]
        );
        return;
      }

      // Fully set up → open Stripe dashboard
      if (url) {
        await openInAppBrowser(url);
      }
    } catch (error) {
      console.error("Error opening Stripe dashboard:", error);
      Alert.alert(
        "Error",
        "Unable to open payment settings. Please try again."
      );
    } finally {
      setIsLoadingStripeDashboard(false);
    }
  };

  // Enhanced segmented control filter component
  const renderEnhancedFilter = () => {
    const screenWidth = Dimensions.get("window").width;
    const containerPadding = 40; // 20px on each side
    const controlPadding = 12; // 6px on each side inside control
    const availableWidth = screenWidth - containerPadding - controlPadding;
    const segmentWidth = availableWidth / filterOptions.length;

    return (
      <View style={styles.enhancedFilterContainer}>
        <BlurView intensity={25} style={styles.segmentedControlBlur}>
          <View style={styles.segmentedControl}>
            {/* Animated sliding background indicator */}
            <Animated.View
              style={[
                styles.segmentIndicator,
                {
                  width: segmentWidth,
                  backgroundColor: theme.primary,
                  transform: [
                    {
                      translateX: slideAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, segmentWidth],
                        extrapolate: "clamp",
                      }),
                    },
                  ],
                },
              ]}
            />

            {/* Filter segments */}
            {filterOptions.map((option, index) => {
              const isActive = activeSection === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.segmentButton, { width: segmentWidth }]}
                  onPress={() => selectFilter(option.value, index)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.label} section`}
                  accessibilityState={{ selected: isActive }}
                >
                  <Animated.View
                    style={[styles.segmentContent, { opacity: fadeAnimation }]}
                  >
                    {/* Icon with subtle animation */}
                    <Animated.View
                      style={[
                        styles.segmentIconContainer,
                        {
                          backgroundColor: isActive
                            ? "rgba(255, 255, 255, 0.35)"
                            : "rgba(30, 41, 59, 0.08)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={isActive ? "white" : "#1e293b"}
                      />
                    </Animated.View>

                    {/* Label with dynamic styling */}
                    <Text
                      style={[
                        styles.segmentLabel,
                        {
                          color: isActive ? "white" : "#1e293b",
                          fontWeight: isActive ? "800" : "700",
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
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
          scrollEventThrottle={16}
          keyboardDismissMode={
            Platform.OS === "android" ? "on-drag" : "interactive"
          }
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

          {/* Animated Tab Section */}
          {renderEnhancedFilter()}

          {/* Content Section */}
          <View style={styles.contentSection}>
            <Animated.View style={{ opacity: fadeAnimation }}>
              {activeSection === "profile" ? (
                <View style={styles.profileContent}>
                  {/* Account Information Section */}
                  <View style={styles.premiumSection}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIconContainer,
                          { backgroundColor: `${theme.primary}12` },
                        ]}
                      >
                        <Ionicons
                          name="person-circle"
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <Text
                          style={[
                            styles.premiumSectionTitle,
                            { color: theme.primary },
                          ]}
                        >
                          Account Information
                        </Text>
                        <Text style={styles.premiumSectionSubtitle}>
                          Your personal account details
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoCardsContainer}>
                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: `${theme.primary}08` },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={20}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>Full Name</Text>
                          <Text
                            style={[
                              styles.infoCardValue,
                              { color: theme.primary },
                            ]}
                          >
                            {profile?.full_name || "Not set"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: `${theme.primary}08` },
                          ]}
                        >
                          <Ionicons
                            name="mail-outline"
                            size={20}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>
                            Email Address
                          </Text>
                          <Text
                            style={[
                              styles.infoCardValue,
                              { color: theme.primary },
                            ]}
                          >
                            {user?.email || ""}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: `${theme.primary}08` },
                          ]}
                        >
                          <Ionicons
                            name="school-outline"
                            size={20}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>College</Text>
                          <Text
                            style={[
                              styles.infoCardValue,
                              { color: theme.primary },
                            ]}
                          >
                            {profile?.college?.name || "No college assigned"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: `${theme.primary}08` },
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={20}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>Member Since</Text>
                          <Text
                            style={[
                              styles.infoCardValue,
                              { color: theme.primary },
                            ]}
                          >
                            {user?.created_at
                              ? new Date(user.created_at).toLocaleDateString()
                              : "Unknown"}
                          </Text>
                        </View>
                      </View>

                      {isAdmin && (
                        <View style={styles.premiumInfoCard}>
                          <View
                            style={[
                              styles.infoCardIcon,
                              { backgroundColor: `${theme.secondary}08` },
                            ]}
                          >
                            <Ionicons
                              name="shield-checkmark-outline"
                              size={20}
                              color={theme.secondary}
                            />
                          </View>
                          <View style={styles.infoCardContent}>
                            <Text style={styles.infoCardLabel}>
                              Account Type
                            </Text>
                            <Text
                              style={[
                                styles.infoCardValue,
                                { color: theme.secondary },
                              ]}
                            >
                              Administrator
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.infoCardBadge,
                              { backgroundColor: "#10b98112" },
                            ]}
                          >
                            <Text
                              style={[styles.badgeText, { color: "#10b981" }]}
                            >
                              ADMIN
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Reviews & Reputation Section */}
                  <View style={styles.premiumSection}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIconContainer,
                          { backgroundColor: `${theme.secondary}12` },
                        ]}
                      >
                        <Ionicons
                          name="star"
                          size={24}
                          color={theme.secondary}
                        />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <Text
                          style={[
                            styles.premiumSectionTitle,
                            { color: theme.secondary },
                          ]}
                        >
                          Reviews & Reputation
                        </Text>
                        <Text style={styles.premiumSectionSubtitle}>
                          Your community standing and reviews
                        </Text>
                      </View>
                    </View>

                    <UserProfileCard
                      userId={user?.id || ""}
                      username={profile?.username || ""}
                      fullName={profile?.full_name || "User"}
                      collegeName={profile?.college?.name}
                      showFullProfile={true}
                      style={styles.trustProfileCard}
                    />
                  </View>

                  {/* Quick Actions Section */}
                  <View style={styles.premiumSection}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIconContainer,
                          { backgroundColor: "#06b6d412" },
                        ]}
                      >
                        <Ionicons name="flash" size={24} color="#06b6d4" />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <Text
                          style={[
                            styles.premiumSectionTitle,
                            { color: "#06b6d4" },
                          ]}
                        >
                          Quick Actions
                        </Text>
                        <Text style={styles.premiumSectionSubtitle}>
                          Manage your account preferences
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoCardsContainer}>
                      <TouchableOpacity
                        style={styles.premiumQuickActionCard}
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
                        <View style={styles.quickActionContent}>
                          <Text
                            style={[
                              styles.premiumQuickActionText,
                              { color: theme.primary },
                            ]}
                          >
                            Notifications
                          </Text>
                          <Text style={styles.quickActionDescription}>
                            Manage your notification preferences
                          </Text>
                        </View>
                        <View style={styles.quickActionArrow}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#94a3b8"
                          />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.premiumQuickActionCard,
                          {
                            backgroundColor: "#f0fdf4",
                            borderColor: "#bbf7d0",
                          },
                        ]}
                        onPress={handleOpenStripeDashboard}
                        disabled={isLoadingStripeDashboard}
                      >
                        <View
                          style={[
                            styles.quickActionIcon,
                            { backgroundColor: "#dcfce7" },
                          ]}
                        >
                          {isLoadingStripeDashboard ? (
                            <ActivityIndicator size="small" color="#16a34a" />
                          ) : (
                            <Ionicons
                              name="card-outline"
                              size={24}
                              color="#16a34a"
                            />
                          )}
                        </View>
                        <View style={styles.quickActionContent}>
                          <Text
                            style={[
                              styles.premiumQuickActionText,
                              { color: "#16a34a" },
                            ]}
                          >
                            Payments & Payouts
                          </Text>
                          <Text
                            style={[
                              styles.quickActionDescription,
                              { color: "#166534" },
                            ]}
                          >
                            Manage your Stripe payment settings
                          </Text>
                        </View>
                        <View style={styles.quickActionArrow}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#16a34a"
                          />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.premiumQuickActionCard}
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
                        <View style={styles.quickActionContent}>
                          <Text
                            style={[
                              styles.premiumQuickActionText,
                              { color: theme.primary },
                            ]}
                          >
                            Help & Support
                          </Text>
                          <Text style={styles.quickActionDescription}>
                            Get assistance and contact support
                          </Text>
                        </View>
                        <View style={styles.quickActionArrow}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#94a3b8"
                          />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.premiumQuickActionCard}
                        onPress={() => (router.push as any)("/legal/terms")}
                      >
                        <View
                          style={[
                            styles.quickActionIcon,
                            { backgroundColor: `${theme.primary}15` },
                          ]}
                        >
                          <Ionicons
                            name="document-text-outline"
                            size={24}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.quickActionContent}>
                          <Text
                            style={[
                              styles.premiumQuickActionText,
                              { color: theme.primary },
                            ]}
                          >
                            Terms of Service
                          </Text>
                          <Text style={styles.quickActionDescription}>
                            Review our terms and conditions
                          </Text>
                        </View>
                        <View style={styles.quickActionArrow}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#94a3b8"
                          />
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.premiumQuickActionCard}
                        onPress={() => (router.push as any)("/legal/privacy")}
                      >
                        <View
                          style={[
                            styles.quickActionIcon,
                            { backgroundColor: `${theme.primary}15` },
                          ]}
                        >
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={24}
                            color={theme.primary}
                          />
                        </View>
                        <View style={styles.quickActionContent}>
                          <Text
                            style={[
                              styles.premiumQuickActionText,
                              { color: theme.primary },
                            ]}
                          >
                            Privacy Policy
                          </Text>
                          <Text style={styles.quickActionDescription}>
                            Learn how we protect your data
                          </Text>
                        </View>
                        <View style={styles.quickActionArrow}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#94a3b8"
                          />
                        </View>
                      </TouchableOpacity>

                      {/* Admin Panel Button - Only show if user is admin */}
                      {isAdmin && (
                        <TouchableOpacity
                          style={[
                            styles.premiumQuickActionCard,
                            styles.adminQuickActionCard,
                            {
                              backgroundColor: `${theme.secondary}08`,
                              borderColor: `${theme.secondary}30`,
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
                          <View style={styles.quickActionContent}>
                            <Text
                              style={[
                                styles.premiumQuickActionText,
                                { color: theme.secondary },
                              ]}
                            >
                              Admin Panel
                            </Text>
                            <Text
                              style={[
                                styles.quickActionDescription,
                                { color: `${theme.secondary}CC` },
                              ]}
                            >
                              Access administrative features
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.infoCardBadge,
                              { backgroundColor: `${theme.secondary}15` },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeText,
                                { color: theme.secondary },
                              ]}
                            >
                              ADMIN
                            </Text>
                          </View>
                          <View style={styles.quickActionArrow}>
                            <Ionicons
                              name="chevron-forward"
                              size={18}
                              color={theme.secondary}
                            />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {/* Legal Documents */}
                  <LegalDocumentStatus />
                </View>
              ) : (
                <View style={styles.settingsContent}>
                  {/* App Information Section */}
                  <View style={styles.premiumSection}>
                    <View style={styles.sectionHeader}>
                      <View
                        style={[
                          styles.sectionIconContainer,
                          { backgroundColor: "#06b6d412" },
                        ]}
                      >
                        <Ionicons
                          name="information-circle"
                          size={24}
                          color="#06b6d4"
                        />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <Text
                          style={[
                            styles.premiumSectionTitle,
                            { color: "#06b6d4" },
                          ]}
                        >
                          Application Details
                        </Text>
                        <Text style={styles.premiumSectionSubtitle}>
                          Version and build information
                        </Text>
                      </View>
                    </View>

                    <View style={styles.infoCardsContainer}>
                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: "#06b6d408" },
                          ]}
                        >
                          <Ionicons
                            name="layers-outline"
                            size={20}
                            color="#06b6d4"
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>App Version</Text>
                          <Text
                            style={[styles.infoCardValue, { color: "#06b6d4" }]}
                          >
                            v{Constants.expoConfig?.version || "1.1.0"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.infoCardBadge,
                            { backgroundColor: "#10b98112" },
                          ]}
                        >
                          <Text
                            style={[styles.badgeText, { color: "#10b981" }]}
                          >
                            STABLE
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: "#06b6d408" },
                          ]}
                        >
                          <Ionicons
                            name="hammer-outline"
                            size={20}
                            color="#06b6d4"
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>Build Number</Text>
                          <Text
                            style={[styles.infoCardValue, { color: "#06b6d4" }]}
                          >
                            {Constants.expoConfig?.ios?.buildNumber ||
                              Constants.expoConfig?.android?.versionCode?.toString() ||
                              "10"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.premiumInfoCard}>
                        <View
                          style={[
                            styles.infoCardIcon,
                            { backgroundColor: "#06b6d408" },
                          ]}
                        >
                          <Ionicons
                            name={
                              Platform.OS === "ios"
                                ? "logo-apple"
                                : "logo-android"
                            }
                            size={20}
                            color="#06b6d4"
                          />
                        </View>
                        <View style={styles.infoCardContent}>
                          <Text style={styles.infoCardLabel}>Platform</Text>
                          <Text
                            style={[styles.infoCardValue, { color: "#06b6d4" }]}
                          >
                            {Platform.OS === "ios" ? "iOS" : "Android"}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.platformBadge,
                            Platform.OS === "ios"
                              ? styles.iosBadge
                              : styles.androidBadge,
                          ]}
                        >
                          <Text style={styles.platformBadgeText}>
                            {Platform.OS === "ios" ? "iOS" : "Android"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Danger Zone Section */}
                  <View style={styles.dangerSection}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.dangerIconContainer}>
                        <Ionicons name="warning" size={24} color="#dc2626" />
                      </View>
                      <View style={styles.sectionHeaderContent}>
                        <Text style={styles.dangerSectionTitle}>
                          Danger Zone
                        </Text>
                        <Text style={styles.dangerSectionSubtitle}>
                          Irreversible actions that permanently affect your
                          account
                        </Text>
                      </View>
                    </View>

                    <View style={styles.dangerCard}>
                      <View style={styles.dangerCardHeader}>
                        <View style={styles.dangerCardIcon}>
                          <Ionicons
                            name="trash-outline"
                            size={22}
                            color="#dc2626"
                          />
                        </View>
                        <View style={styles.dangerCardContent}>
                          <Text style={styles.dangerCardTitle}>
                            Delete Account
                          </Text>
                          <Text style={styles.dangerCardDescription}>
                            Permanently remove your account and all associated
                            data. This action cannot be undone.
                          </Text>
                        </View>
                      </View>

                      <View style={styles.warningPanel}>
                        <View style={styles.warningIcon}>
                          <Ionicons
                            name="alert-circle"
                            size={16}
                            color="#f59e0b"
                          />
                        </View>
                        <Text style={styles.warningText}>
                          This will permanently delete all your messages,
                          tickets, orders, and personal data.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.dangerButton,
                          isDeleting && styles.dangerButtonLoading,
                        ]}
                        onPress={() => {
                          loadDataSummary();
                          setDeleteModalVisible(true);
                        }}
                        disabled={isDeleting}
                      >
                        <View style={styles.dangerButtonContent}>
                          {isDeleting ? (
                            <>
                              <View style={styles.deletingSpinner} />
                              <Text style={styles.dangerButtonText}>
                                Processing Deletion...
                              </Text>
                            </>
                          ) : (
                            <>
                              <Ionicons name="trash" size={18} color="#fff" />
                              <Text style={styles.dangerButtonText}>
                                Delete My Account
                              </Text>
                              <View style={styles.dangerArrow}>
                                <Ionicons
                                  name="arrow-forward"
                                  size={14}
                                  color="rgba(255,255,255,0.7)"
                                />
                              </View>
                            </>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}
            </Animated.View>

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
                <Text style={styles.modalWarningText}>
                  ⚠️ Deleting your account will permanently remove all your
                  data, including:
                </Text>
                {dataSummary && (
                  <View style={styles.dataSummary}>
                    <Text style={styles.dataSummaryItem}>
                      • {dataSummary.messages || 0} messages
                    </Text>
                    <Text style={styles.dataSummaryItem}>
                      • {dataSummary.tickets || 0} tickets
                    </Text>
                    <Text style={styles.dataSummaryItem}>
                      • {dataSummary.orders || 0} orders
                    </Text>
                    <Text style={styles.dataSummaryItem}>
                      • {dataSummary.conversations || 0} conversations
                    </Text>
                    <Text style={styles.dataSummaryItem}>
                      • {dataSummary.watchlist || 0} watchlist items
                    </Text>
                    <Text style={styles.dataSummaryItem}>
                      • {dataSummary.notifications || 0} notifications
                    </Text>
                  </View>
                )}
                <Text style={styles.modalWarningText}>
                  This action is irreversible.
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
                  style={[
                    styles.confirmDeleteButton,
                    isDeleting && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setDeleteModalVisible(false);
                    confirmDeleteAccount();
                  }}
                  disabled={isDeleting}
                >
                  <Text style={styles.confirmDeleteText}>
                    {isDeleting ? "Deleting..." : "Delete Account"}
                  </Text>
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
    gap: 40,
  },
  appInfoSection: {
    marginBottom: 32,
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

  // Premium Section Styles
  premiumSection: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  sectionHeaderContent: {
    flex: 1,
  },
  premiumSectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  premiumSectionSubtitle: {
    fontSize: 15,
    color: "#64748b",
    lineHeight: 20,
  },

  // Premium Card Styles
  premiumCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  premiumCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  cardIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 19,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardContent: {
    gap: 20,
  },

  // Info Panel Styles
  infoPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  infoPanelIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  infoPanelContent: {
    flex: 1,
  },
  infoPanelTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  infoPanelDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 19,
  },

  // Premium Button Styles
  premiumButton: {
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  premiumButtonLoading: {
    shadowOpacity: 0.05,
    elevation: 2,
  },
  premiumButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 24,
  },
  premiumButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingSpinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderTopColor: "white",
  },

  // Info Cards Container
  infoCardsContainer: {
    gap: 16,
  },
  premiumInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  infoCardIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  infoCardValue: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  infoCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  platformBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  iosBadge: {
    backgroundColor: "#0071e312",
  },
  androidBadge: {
    backgroundColor: "#3ddc8412",
  },
  platformBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#64748b",
  },

  // Danger Section Styles
  dangerSection: {
    marginBottom: 20,
  },
  dangerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    marginRight: 16,
  },
  dangerSectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  dangerSectionSubtitle: {
    fontSize: 15,
    color: "#991b1b",
    lineHeight: 20,
  },
  dangerCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: "#fecaca",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  dangerCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  dangerCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    marginRight: 16,
  },
  dangerCardContent: {
    flex: 1,
  },
  dangerCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#dc2626",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  dangerCardDescription: {
    fontSize: 14,
    color: "#991b1b",
    lineHeight: 20,
  },
  warningPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fed7aa",
    gap: 10,
    width: "100%",
    flexWrap: "nowrap",
  },
  warningIcon: {
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: "#92400e",
    lineHeight: 18,
    flexWrap: "wrap",
    flexShrink: 1,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    borderRadius: 16,
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  dangerButtonLoading: {
    opacity: 0.7,
    shadowOpacity: 0.1,
  },
  dangerButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
    minHeight: 24,
  },
  dangerButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  dangerArrow: {
    marginLeft: 4,
  },
  deletingSpinner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    borderTopColor: "white",
  },

  // Premium Quick Action Card Styles
  premiumQuickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    gap: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  premiumQuickActionText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  quickActionDescription: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 17,
  },
  quickActionArrow: {
    marginLeft: 8,
  },
  adminQuickActionCard: {
    borderWidth: 1.5,
    shadowColor: "#06b6d4",
    shadowOpacity: 0.08,
  },

  // Legacy styles (keeping for compatibility)
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
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 12,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIcon: {
    width: 70,
    height: 70,
    backgroundColor: "#fef2f2",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 15,
    color: "#64748b",
    fontWeight: "500",
    lineHeight: 20,
  },
  modalWarning: {
    backgroundColor: "#fef2f2",
    borderWidth: 1.5,
    borderColor: "#fecaca",
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  modalWarningText: {
    fontSize: 15,
    color: "#dc2626",
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 21,
  },
  dataSummary: {
    marginVertical: 12,
    paddingVertical: 8,
  },
  dataSummaryItem: {
    fontSize: 14,
    color: "#dc2626",
    textAlign: "center",
    marginVertical: 3,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 18,
    backgroundColor: "#f1f5f9",
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: -0.1,
  },
  confirmDeleteButton: {
    flex: 1,
    paddingVertical: 18,
    backgroundColor: "#dc2626",
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
    letterSpacing: -0.1,
  },
  trustProfileCard: {
    marginHorizontal: 0,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0,
  },

  // Enhanced Segmented Control Filter Styles
  enhancedFilterContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    zIndex: 100,
  },
  segmentedControlBlur: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  segmentedControl: {
    flexDirection: "row",
    position: "relative",
    padding: 6,
    height: 60,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
  },
  segmentIndicator: {
    position: "absolute",
    top: 6,
    left: 6,
    bottom: 6,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  segmentButton: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    zIndex: 2,
  },
  segmentContent: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 4,
  },
  segmentIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 3,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
    textAlign: "center",
    flexShrink: 1,
  },
});
