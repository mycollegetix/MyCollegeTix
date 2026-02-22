// src/components/tickets/SectionBanner.tsx
// Info and warning banners for section headers

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type BannerVariant = "info" | "warning" | "error" | "success";

const BANNER_THEMES = {
  info: {
    backgroundColor: "#eff6ff", // Blue-50
    borderColor: "#bfdbfe", // Blue-200
    iconColor: "#2563eb", // Blue-600
    textColor: "#1e40af", // Blue-800
    icon: "information-circle" as const,
  },
  warning: {
    backgroundColor: "#fffbeb", // Amber-50
    borderColor: "#fcd34d", // Amber-300
    iconColor: "#d97706", // Amber-600
    textColor: "#92400e", // Amber-800
    icon: "warning" as const,
  },
  error: {
    backgroundColor: "#fef2f2", // Red-50
    borderColor: "#fecaca", // Red-200
    iconColor: "#dc2626", // Red-600
    textColor: "#991b1b", // Red-800
    icon: "alert-circle" as const,
  },
  success: {
    backgroundColor: "#f0fdf4", // Green-50
    borderColor: "#bbf7d0", // Green-200
    iconColor: "#16a34a", // Green-600
    textColor: "#166534", // Green-800
    icon: "checkmark-circle" as const,
  },
};

interface SectionBannerProps {
  text: string;
  variant: BannerVariant;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SectionBanner({ text, variant, icon }: SectionBannerProps) {
  const theme = BANNER_THEMES[variant];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          borderColor: theme.borderColor,
        },
      ]}
    >
      <Ionicons
        name={icon || theme.icon}
        size={18}
        color={theme.iconColor}
        style={styles.icon}
      />
      <Text style={[styles.text, { color: theme.textColor }]}>{text}</Text>
    </View>
  );
}

// Convenience components
export function InfoBanner({ text }: { text: string }) {
  return <SectionBanner text={text} variant="info" />;
}

export function WarningBanner({ text }: { text: string }) {
  return <SectionBanner text={text} variant="warning" />;
}

export function ErrorBanner({ text }: { text: string }) {
  return <SectionBanner text={text} variant="error" />;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  text: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});

export default SectionBanner;
