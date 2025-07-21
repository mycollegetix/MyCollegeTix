// src/app/legal/terms.tsx - Terms of Service Page
import React from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";

export default function TermsOfServiceScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.push("/(tabs)/profile");
            }
          }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Last Updated */}
          <View style={styles.lastUpdatedContainer}>
            <Text style={styles.lastUpdatedText}>
              Last Updated: [DATE TO BE ADDED]
            </Text>
          </View>

          {/* Introduction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Introduction</Text>
            <Text style={styles.sectionText}>
              Welcome to MSU Tickets. These Terms of Service govern your use of our ticket marketplace platform. By accessing or using our service, you agree to be bound by these terms.
            </Text>
            <Text style={styles.placeholderText}>
              [DETAILED TERMS TO BE ADDED]
            </Text>
          </View>

          {/* Acceptance of Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Acceptance of Terms</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - User agreement, eligibility requirements, etc.]
            </Text>
          </View>

          {/* User Accounts */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Accounts</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Account creation, responsibilities, security, etc.]
            </Text>
          </View>

          {/* Ticket Sales and Purchases */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Ticket Sales and Purchases</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Listing rules, payment terms, transfer policies, etc.]
            </Text>
          </View>

          {/* Prohibited Activities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Prohibited Activities</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Scalping policies, fraud prevention, prohibited conduct, etc.]
            </Text>
          </View>

          {/* Platform Fees */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Platform Fees</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Fee structure, payment processing, refunds, etc.]
            </Text>
          </View>

          {/* Liability and Disclaimers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Liability and Disclaimers</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Limitation of liability, disclaimers, etc.]
            </Text>
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Privacy</Text>
            <Text style={styles.sectionText}>
              Your privacy is important to us. Please review our Privacy Policy to understand how we collect, use, and protect your information.
            </Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/legal/privacy")}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>
                View Privacy Policy →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Changes to Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Changes to Terms</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - How terms may be updated, notification process, etc.]
            </Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Contact Information</Text>
            <Text style={styles.sectionText}>
              If you have any questions about these Terms of Service, please contact us:
            </Text>
            <Text style={styles.placeholderText}>
              [CONTACT INFORMATION TO BE ADDED]
            </Text>
          </View>

          {/* Template Notice */}
          <View style={styles.templateNotice}>
            <Text style={styles.templateNoticeText}>
              📝 This is a template. Actual terms will be added by legal team.
            </Text>
          </View>

        </ScrollView>
      </View>
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  lastUpdatedContainer: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  lastUpdatedText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: "#9ca3af",
    fontStyle: "italic",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "dashed",
  },
  linkButton: {
    marginTop: 8,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600",
  },
  templateNotice: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  templateNoticeText: {
    fontSize: 14,
    color: "#92400e",
    fontWeight: "500",
    textAlign: "center",
  },
});