// src/components/StripeEligibilityBanner.tsx
// Displays Stripe selling eligibility status with user-friendly messaging
import React from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/src/providers/ThemeProvider";
import {
  SellingEligibilityResult,
  EligibilityReason,
} from "@/src/services/stripeConnectService";

interface StripeEligibilityBannerProps {
  eligibility: SellingEligibilityResult | null;
  isLoading: boolean;
  onAction: () => void;
  onRetry?: () => void;
}

interface BannerConfig {
  backgroundColor: string;
  borderColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  titleColor: string;
  textColor: string;
  buttonText: string;
  buttonColor: string;
  buttonTextColor: string;
}

const getBannerConfig = (
  reason: EligibilityReason,
  theme: { primary: string; secondary: string }
): BannerConfig => {
  switch (reason) {
    case "no_account":
      return {
        backgroundColor: theme.secondary,
        borderColor: theme.primary,
        iconName: "card-outline",
        iconColor: theme.primary,
        titleColor: theme.primary,
        textColor: theme.primary,
        buttonText: "Set Up Payments",
        buttonColor: theme.primary,
        buttonTextColor: theme.secondary,
      };
    case "incomplete_onboarding":
      return {
        backgroundColor: "#fef3c7",
        borderColor: "#f59e0b",
        iconName: "alert-circle-outline",
        iconColor: "#d97706",
        titleColor: "#92400e",
        textColor: "#78350f",
        buttonText: "Continue Setup",
        buttonColor: "#f59e0b",
        buttonTextColor: "#ffffff",
      };
    case "restricted":
      return {
        backgroundColor: "#fef3c7",
        borderColor: "#f59e0b",
        iconName: "warning-outline",
        iconColor: "#d97706",
        titleColor: "#92400e",
        textColor: "#78350f",
        buttonText: "Update Information",
        buttonColor: "#f59e0b",
        buttonTextColor: "#ffffff",
      };
    case "disabled":
      return {
        backgroundColor: "#fee2e2",
        borderColor: "#ef4444",
        iconName: "close-circle-outline",
        iconColor: "#dc2626",
        titleColor: "#991b1b",
        textColor: "#7f1d1d",
        buttonText: "Get Help",
        buttonColor: "#ef4444",
        buttonTextColor: "#ffffff",
      };
    case "pending_verification":
      return {
        backgroundColor: "#dbeafe",
        borderColor: "#3b82f6",
        iconName: "time-outline",
        iconColor: "#2563eb",
        titleColor: "#1e40af",
        textColor: "#1e3a8a",
        buttonText: "Check Status",
        buttonColor: "#3b82f6",
        buttonTextColor: "#ffffff",
      };
    case "error":
      return {
        backgroundColor: "#f3f4f6",
        borderColor: "#9ca3af",
        iconName: "refresh-outline",
        iconColor: "#6b7280",
        titleColor: "#374151",
        textColor: "#4b5563",
        buttonText: "Try Again",
        buttonColor: "#6b7280",
        buttonTextColor: "#ffffff",
      };
    default:
      return {
        backgroundColor: "#f3f4f6",
        borderColor: "#9ca3af",
        iconName: "help-circle-outline",
        iconColor: "#6b7280",
        titleColor: "#374151",
        textColor: "#4b5563",
        buttonText: "Learn More",
        buttonColor: "#6b7280",
        buttonTextColor: "#ffffff",
      };
  }
};

const getBannerTitle = (reason: EligibilityReason): string => {
  switch (reason) {
    case "no_account":
      return "Set Up Payments";
    case "incomplete_onboarding":
      return "Complete Payment Setup";
    case "restricted":
      return "Action Required";
    case "disabled":
      return "Account Issue";
    case "pending_verification":
      return "Verification In Progress";
    case "error":
      return "Connection Issue";
    default:
      return "Payment Setup";
  }
};

export function StripeEligibilityBanner({
  eligibility,
  isLoading,
  onAction,
  onRetry,
}: StripeEligibilityBannerProps) {
  const theme = useTheme();

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.primary }]}>
          Checking payment status...
        </Text>
      </View>
    );
  }

  // No eligibility data or user can sell
  if (!eligibility || eligibility.canSell) {
    return null;
  }

  const config = getBannerConfig(eligibility.reason, theme);
  const title = getBannerTitle(eligibility.reason);

  const handlePress = () => {
    if (eligibility.reason === "error" && onRetry) {
      onRetry();
    } else {
      onAction();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${config.iconColor}20` },
          ]}
        >
          <Ionicons
            name={config.iconName}
            size={24}
            color={config.iconColor}
          />
        </View>

        <View style={styles.textContent}>
          <Text style={[styles.title, { color: config.titleColor }]}>
            {title}
          </Text>
          <Text style={[styles.message, { color: config.textColor }]}>
            {eligibility.message}
          </Text>

          {/* Show details if available */}
          {eligibility.details && eligibility.details.length > 0 && (
            <View style={styles.detailsContainer}>
              {eligibility.details.slice(0, 3).map((detail, index) => (
                <View key={index} style={styles.detailItem}>
                  <View
                    style={[
                      styles.detailBullet,
                      { backgroundColor: config.iconColor },
                    ]}
                  />
                  <Text style={[styles.detailText, { color: config.textColor }]}>
                    {detail}
                  </Text>
                </View>
              ))}
              {eligibility.details.length > 3 && (
                <Text style={[styles.moreDetails, { color: config.textColor }]}>
                  +{eligibility.details.length - 3} more items
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: config.buttonColor }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Text style={[styles.buttonText, { color: config.buttonTextColor }]}>
          {config.buttonText}
        </Text>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={config.buttonTextColor}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.9,
  },
  detailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  detailBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  moreDetails: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
    opacity: 0.7,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    gap: 6,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default StripeEligibilityBanner;
