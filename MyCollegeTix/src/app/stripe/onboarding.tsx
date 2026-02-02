// src/app/stripe/onboarding.tsx
// Stripe Connect onboarding screen for sellers
import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/providers/AuthProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useStripeConnect } from "@/src/hooks/useStripeConnect";

export default function StripeOnboardingScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const {
    isLoading,
    error,
    accountStatus,
    fetchAccountStatus,
    openOnboarding,
    canReceivePayments,
    getStatusMessage,
    getStatusColor,
  } = useStripeConnect();

  useEffect(() => {
    fetchAccountStatus();
  }, []);

  const handleStartOnboarding = async () => {
    const success = await openOnboarding();
    if (success) {
      // Refresh status after returning
      await fetchAccountStatus();
    }
  };

  if (!user) {
    return null;
  }

  const isComplete = canReceivePayments();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
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
        <Text style={styles.headerTitle}>Payment Setup</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.contentCard}>
          {/* Status Icon */}
          <View style={styles.statusIconContainer}>
            <View
              style={[
                styles.statusIconCircle,
                { backgroundColor: isComplete ? "#10b981" : theme.primary },
              ]}
            >
              <Ionicons
                name={isComplete ? "checkmark" : "card-outline"}
                size={48}
                color="white"
              />
            </View>
          </View>

          {/* Title & Status */}
          <Text style={styles.title}>
            {isComplete ? "You're All Set!" : "Set Up Payments"}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusBadgeText}>{getStatusMessage()}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>
            {isComplete
              ? "Your Stripe account is connected and ready to receive payments. When you sell a ticket, funds will be automatically transferred to your bank account."
              : "To sell tickets on MyCollegeTix, you need to set up a Stripe account. This takes about 5 minutes and allows you to receive payments directly to your bank account."}
          </Text>

          {/* Benefits */}
          {!isComplete && (
            <View style={styles.benefitsSection}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                What You'll Get
              </Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <View style={[styles.benefitIcon, { backgroundColor: `${theme.primary}1A` }]}>
                    <Ionicons name="flash" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Fast Payouts</Text>
                    <Text style={styles.benefitDescription}>
                      Get paid within 1-2 business days after ticket transfer is confirmed
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <View style={[styles.benefitIcon, { backgroundColor: `${theme.primary}1A` }]}>
                    <Ionicons name="shield-checkmark" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Secure Payments</Text>
                    <Text style={styles.benefitDescription}>
                      Stripe handles all payment security and fraud protection
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <View style={[styles.benefitIcon, { backgroundColor: `${theme.primary}1A` }]}>
                    <Ionicons name="wallet" size={20} color={theme.primary} />
                  </View>
                  <View style={styles.benefitContent}>
                    <Text style={styles.benefitTitle}>Direct Deposit</Text>
                    <Text style={styles.benefitDescription}>
                      Funds go straight to your linked bank account
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Account Details (if complete) */}
          {isComplete && accountStatus && (
            <View style={styles.accountDetails}>
              <Text style={[styles.sectionTitle, { color: theme.primary }]}>
                Account Status
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Charges</Text>
                <View style={styles.detailValue}>
                  <Ionicons
                    name={accountStatus.chargesEnabled ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={accountStatus.chargesEnabled ? "#10b981" : "#ef4444"}
                  />
                  <Text style={styles.detailText}>
                    {accountStatus.chargesEnabled ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payouts</Text>
                <View style={styles.detailValue}>
                  <Ionicons
                    name={accountStatus.payoutsEnabled ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={accountStatus.payoutsEnabled ? "#10b981" : "#ef4444"}
                  />
                  <Text style={styles.detailText}>
                    {accountStatus.payoutsEnabled ? "Enabled" : "Disabled"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              { backgroundColor: isComplete ? "#f1f5f9" : theme.primary },
              isLoading && styles.actionButtonDisabled,
            ]}
            onPress={isComplete ? () => router.back() : handleStartOnboarding}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={isComplete ? theme.primary : "white"} />
            ) : (
              <>
                <Ionicons
                  name={isComplete ? "arrow-back" : "open-outline"}
                  size={20}
                  color={isComplete ? theme.primary : "white"}
                />
                <Text
                  style={[
                    styles.actionButtonText,
                    { color: isComplete ? theme.primary : "white" },
                  ]}
                >
                  {isComplete
                    ? "Go Back"
                    : accountStatus?.hasAccount
                    ? "Continue Setup"
                    : "Start Setup"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Note */}
          {!isComplete && (
            <Text style={styles.noteText}>
              You must be 18 or older to create a Stripe account. By continuing, you agree
              to Stripe's terms of service.
            </Text>
          )}
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  contentCard: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    marginTop: 20,
    minHeight: 600,
  },
  statusIconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  statusIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
  description: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  benefitsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  benefitsList: {
    gap: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  accountDetails: {
    marginBottom: 32,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    fontSize: 15,
    color: "#6b7280",
  },
  detailValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 16,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: "700",
  },
  noteText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    lineHeight: 18,
  },
});
