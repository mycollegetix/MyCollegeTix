// src/app/legal/privacy.tsx - Privacy Policy Page
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

export default function PrivacyPolicyScreen() {
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

        <Text style={styles.headerTitle}>Privacy Policy</Text>
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
              This Privacy Policy describes how MSU Tickets collects, uses, and protects your personal information when you use our ticket marketplace platform.
            </Text>
            <Text style={styles.placeholderText}>
              [DETAILED PRIVACY POLICY TO BE ADDED]
            </Text>
          </View>

          {/* Information We Collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Information We Collect</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Personal info, account data, transaction info, device info, etc.]
            </Text>
          </View>

          {/* How We Use Your Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Service provision, communication, security, improvements, etc.]
            </Text>
          </View>

          {/* Information Sharing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Information Sharing and Disclosure</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Third-party services, legal requirements, business transfers, etc.]
            </Text>
          </View>

          {/* Data Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Security measures, encryption, access controls, etc.]
            </Text>
          </View>

          {/* Data Retention */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Data Retention</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - How long we keep data, deletion policies, etc.]
            </Text>
          </View>

          {/* Your Rights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Your Privacy Rights</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Access, correction, deletion, portability, opt-out rights, etc.]
            </Text>
          </View>

          {/* Cookies and Tracking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Cookies and Tracking Technologies</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Cookie usage, analytics, tracking preferences, etc.]
            </Text>
          </View>

          {/* Third-Party Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Third-Party Services</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Payment processors, analytics, integrations, etc.]
            </Text>
          </View>

          {/* International Users */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Cross-border data handling, safeguards, etc.]
            </Text>
          </View>

          {/* Children's Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Children's Privacy</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - Age restrictions, parental consent, etc.]
            </Text>
          </View>

          {/* Policy Updates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Changes to This Privacy Policy</Text>
            <Text style={styles.placeholderText}>
              [CONTENT TO BE ADDED - How policy updates are handled, notification process, etc.]
            </Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </Text>
            <Text style={styles.placeholderText}>
              [CONTACT INFORMATION TO BE ADDED - Email, address, data protection officer, etc.]
            </Text>
          </View>

          {/* Related Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>14. Related Documents</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/legal/terms")}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>
                View Terms of Service →
              </Text>
            </TouchableOpacity>
          </View>

          {/* Template Notice */}
          <View style={styles.templateNotice}>
            <Text style={styles.templateNoticeText}>
              📝 This is a template. Actual privacy policy will be added by legal team.
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