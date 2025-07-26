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
              Effective Date: January 1, 2025
            </Text>
          </View>

          {/* Acceptance of Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By accessing and using MyCollegeTix ("Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </Text>
          </View>

          {/* Description of Service */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Description of Service</Text>
            <Text style={styles.sectionText}>
              MyCollegeTix is a platform that connects verified college students for the purpose of buying and selling event tickets. We provide the platform only; all transactions are conducted directly between users.
            </Text>
          </View>

          {/* User Eligibility */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. User Eligibility</Text>
            <Text style={styles.sectionText}>
              To use MyCollegeTix, you must:
            </Text>
            <Text style={styles.sectionText}>
              • Be a current student at a supported college or university{"\n"}
              • Provide a valid .edu email address for verification{"\n"}
              • Be at least 18 years old or have parental consent{"\n"}
              • Agree to these terms and conditions
            </Text>
          </View>

          {/* User Responsibilities */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. User Responsibilities</Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>4.1 Account Security{"\n"}</Text>
              You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>4.2 Content Standards and Prohibited Activities{"\n"}</Text>
              MyCollegeTix has ZERO TOLERANCE for objectionable content and abusive behavior. Users may not:
            </Text>
            <Text style={styles.sectionText}>
              • Post false, misleading, or fraudulent listings{"\n"}
              • Sell tickets at prices significantly above face value (price gouging){"\n"}
              • Create multiple accounts{"\n"}
              • Harass, abuse, threaten, or bully other users{"\n"}
              • Post content that is hateful, discriminatory, or offensive{"\n"}
              • Share inappropriate, explicit, or pornographic content{"\n"}
              • Engage in spam, scams, or fraudulent activities{"\n"}
              • Use the platform for any illegal activities{"\n"}
              • Post content that violates intellectual property rights
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>4.3 Content Moderation{"\n"}</Text>
              All user-generated content is subject to automated and manual review. We reserve the right to remove any content that violates these terms without notice.
            </Text>
          </View>

          {/* Content Moderation and Reporting */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Content Moderation and Reporting</Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>5.1 Automated Filtering{"\n"}</Text>
              We employ automated systems to detect and filter objectionable content including hate speech, harassment, spam, and inappropriate material.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>5.2 User Reporting{"\n"}</Text>
              Users can report inappropriate content or abusive behavior through our in-app reporting system. We encourage users to report any violations of these terms.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>5.3 User Blocking{"\n"}</Text>
              Users have the ability to block other users to prevent unwanted communication and interactions.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>5.4 Response Time{"\n"}</Text>
              We commit to reviewing and acting on all content reports within 24 hours. Violations will result in content removal and potential account suspension or termination.
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>5.5 Enforcement{"\n"}</Text>
              Users who violate our content standards will face immediate consequences including content removal, account warnings, temporary suspension, or permanent account termination.
            </Text>
          </View>

          {/* Transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Transactions</Text>
            <Text style={styles.sectionText}>
              MyCollegeTix facilitates connections between users but does not process payments or handle transactions. All financial transactions are conducted directly between buyers and sellers. We recommend using secure payment methods and meeting in safe, public locations.
            </Text>
          </View>

          {/* Limitation of Liability */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              MyCollegeTix is not responsible for:
            </Text>
            <Text style={styles.sectionText}>
              • The validity or authenticity of tickets{"\n"}
              • Failed transactions between users{"\n"}
              • User conduct or safety during meetings{"\n"}
              • Any damages arising from use of the platform
            </Text>
          </View>

          {/* Termination */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Termination</Text>
            <Text style={styles.sectionText}>
              We reserve the right to terminate or suspend accounts that violate these terms or engage in fraudulent or harmful behavior.
            </Text>
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Privacy</Text>
            <Text style={styles.sectionText}>
              Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
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
            <Text style={styles.sectionTitle}>10. Changes to Terms</Text>
            <Text style={styles.sectionText}>
              We reserve the right to modify these terms at any time. Users will be notified of significant changes, and continued use of the service constitutes acceptance of modified terms.
            </Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Information</Text>
            <Text style={styles.sectionText}>
              If you have any questions about these Terms and Conditions, please contact us at legal@mycollegetix.com.
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