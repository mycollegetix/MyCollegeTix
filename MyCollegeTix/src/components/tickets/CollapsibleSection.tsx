// src/components/tickets/CollapsibleSection.tsx
// Reusable collapsible section with variant-based theming
// Used for Action Required (amber), Active Disputes (slate-blue), and other ticket sections

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Variant themes - visually differentiate section types
const VARIANT_THEMES = {
  "action-required": {
    headerBg: "#fffbeb", // Amber-50
    border: "#fcd34d", // Amber-300
    iconColor: "#f59e0b", // Amber-500
    textColor: "#92400e", // Amber-800
    subtitleColor: "#b45309", // Amber-700
    leftBorder: true,
    leftBorderColor: "#f59e0b",
    chevronColor: "#f59e0b",
  },
  dispute: {
    headerBg: "#f1f5f9", // Slate-100
    border: "#cbd5e1", // Slate-300
    iconColor: "#64748b", // Slate-500
    textColor: "#334155", // Slate-700
    subtitleColor: "#475569", // Slate-600
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#64748b",
  },
  awaiting: {
    headerBg: "#f0fdfa", // Teal-50
    border: "#99f6e4", // Teal-200
    iconColor: "#0d9488", // Teal-600
    textColor: "#115e59", // Teal-800
    subtitleColor: "#0f766e", // Teal-700
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#0d9488",
  },
  "awaiting-confirmation": {
    headerBg: "#faf5ff", // Purple-50
    border: "#d8b4fe", // Purple-300
    iconColor: "#8b5cf6", // Violet-500
    textColor: "#581c87", // Purple-900
    subtitleColor: "#6b21a8", // Purple-800
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#8b5cf6",
  },
  active: {
    headerBg: "#f8fafc", // Slate-50
    border: "#e2e8f0", // Slate-200
    iconColor: "#64748b", // Slate-500
    textColor: "#1e293b", // Slate-800
    subtitleColor: "#475569", // Slate-600
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#6b7280",
  },
  sold: {
    headerBg: "#f0fdf4", // Green-50
    border: "#bbf7d0", // Green-200
    iconColor: "#16a34a", // Green-600
    textColor: "#14532d", // Green-900
    subtitleColor: "#15803d", // Green-700
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#16a34a",
  },
  cancelled: {
    headerBg: "#fef2f2", // Red-50
    border: "#fecaca", // Red-200
    iconColor: "#dc2626", // Red-600
    textColor: "#7f1d1d", // Red-900
    subtitleColor: "#b91c1c", // Red-700
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#dc2626",
  },
  expired: {
    headerBg: "#f9fafb", // Gray-50
    border: "#e5e7eb", // Gray-200
    iconColor: "#6b7280", // Gray-500
    textColor: "#374151", // Gray-700
    subtitleColor: "#6b7280", // Gray-500
    leftBorder: false,
    leftBorderColor: "transparent",
    chevronColor: "#6b7280",
  },
};

export type SectionVariant = keyof typeof VARIANT_THEMES;

interface BadgeConfig {
  text: string;
  backgroundColor: string;
  textColor: string;
}

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  variant: SectionVariant;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: BadgeConfig;
  style?: ViewStyle;
  testID?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  count,
  icon,
  variant,
  expanded,
  onToggle,
  children,
  badge,
  style,
  testID,
}: CollapsibleSectionProps) {
  const theme = VARIANT_THEMES[variant];

  return (
    <View style={[styles.container, style]} testID={testID}>
      <TouchableOpacity
        style={[
          styles.header,
          {
            backgroundColor: theme.headerBg,
            borderColor: theme.border,
            borderLeftWidth: theme.leftBorder ? 4 : 1,
            borderLeftColor: theme.leftBorder
              ? theme.leftBorderColor
              : theme.border,
          },
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title}, ${count} items, ${expanded ? "expanded" : "collapsed"}`}
      >
        <View style={styles.headerContent}>
          {/* Icon Container */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${theme.iconColor}15`,
              },
            ]}
          >
            <Ionicons name={icon} size={20} color={theme.iconColor} />
          </View>

          {/* Text Content */}
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: theme.textColor }]}>
                {title}
              </Text>
              {badge && (
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: badge.backgroundColor },
                  ]}
                >
                  <Text style={[styles.badgeText, { color: badge.textColor }]}>
                    {badge.text}
                  </Text>
                </View>
              )}
            </View>
            {subtitle && (
              <Text style={[styles.subtitle, { color: theme.subtitleColor }]}>
                {subtitle}
              </Text>
            )}
          </View>

          {/* Count Badge */}
          {count > 0 && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: `${theme.iconColor}20` },
              ]}
            >
              <Text style={[styles.countText, { color: theme.iconColor }]}>
                {count}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.chevronColor}
        />
      </TouchableOpacity>

      {/* Expandable Content */}
      {expanded && <View style={styles.content}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  countBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginRight: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    marginTop: 8,
  },
});

export default CollapsibleSection;
