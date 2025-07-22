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
              Effective Date: January 1, 2025
            </Text>
          </View>

          {/* Information We Collect */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>1.1 Account Information{"\n"}</Text>
              When you create an account, we collect:
            </Text>
            <Text style={styles.sectionText}>
              • Name and email address (.edu required for verification){"\n"}
              • College or university affiliation{"\n"}
              • Profile information you choose to provide
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>1.2 Usage Information{"\n"}</Text>
              We automatically collect:
            </Text>
            <Text style={styles.sectionText}>
              • Device and browser information{"\n"}
              • IP address and location data{"\n"}
              • How you interact with our platform{"\n"}
              • Pages visited and features used
            </Text>
          </View>

          {/* How We Use Your Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.sectionText}>
              We use your information to:
            </Text>
            <Text style={styles.sectionText}>
              • Verify your student status and college affiliation{"\n"}
              • Provide and improve our services{"\n"}
              • Facilitate connections between verified students{"\n"}
              • Send important service updates and notifications{"\n"}
              • Prevent fraud and maintain platform safety{"\n"}
              • Analyze usage patterns to improve user experience
            </Text>
          </View>

          {/* Information Sharing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Information Sharing</Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>3.1 With Other Users{"\n"}</Text>
              When you use MyCollegeTix, other verified students can see:
            </Text>
            <Text style={styles.sectionText}>
              • Your name and college affiliation{"\n"}
              • Ticket listings you post{"\n"}
              • Basic profile information you choose to share
            </Text>
            <Text style={styles.sectionText}>
              <Text style={{fontWeight: 'bold'}}>3.2 With Third Parties{"\n"}</Text>
              We do not sell your personal information. We may share data with:
            </Text>
            <Text style={styles.sectionText}>
              • Service providers who help us operate the platform{"\n"}
              • Law enforcement when required by law{"\n"}
              • Academic institutions for verification purposes only
            </Text>
          </View>

          {/* Data Security */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </Text>
            <Text style={styles.sectionText}>
              However, no method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </Text>
          </View>

          {/* Student Email Verification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Student Email Verification</Text>
            <Text style={styles.sectionText}>
              We require .edu email addresses to verify student status. This information is used solely for verification purposes and to ensure only current students can access the platform.
            </Text>
            <Text style={styles.sectionText}>
              We may periodically re-verify student status to maintain platform integrity.
            </Text>
          </View>

          {/* Cookies and Tracking */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Cookies and Tracking</Text>
            <Text style={styles.sectionText}>
              We use cookies and similar technologies to:
            </Text>
            <Text style={styles.sectionText}>
              • Remember your login status{"\n"}
              • Improve site performance{"\n"}
              • Analyze user behavior{"\n"}
              • Provide personalized experiences
            </Text>
            <Text style={styles.sectionText}>
              You can control cookie settings through your browser preferences.
            </Text>
          </View>

          {/* Your Rights */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Your Rights</Text>
            <Text style={styles.sectionText}>
              You have the right to:
            </Text>
            <Text style={styles.sectionText}>
              • Access and update your personal information{"\n"}
              • Delete your account and associated data{"\n"}
              • Opt out of non-essential communications{"\n"}
              • Request a copy of your data{"\n"}
              • File a complaint with relevant authorities
            </Text>
          </View>

          {/* Data Retention */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain your information for as long as your account is active or as needed to provide services. When you delete your account, we remove your personal information within 30 days, except where required by law.
            </Text>
          </View>

          {/* Children's Privacy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
            <Text style={styles.sectionText}>
              Our service is intended for college students 18 and older. We do not knowingly collect information from children under 13. If you are under 18, you need parental consent to use our service.
            </Text>
          </View>

          {/* Changes to This Policy */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
            <Text style={styles.sectionText}>
              We may update this privacy policy from time to time. We will notify users of significant changes via email or platform notifications. Continued use after changes constitutes acceptance.
            </Text>
          </View>

          {/* Contact Us */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have questions about this privacy policy or how we handle your data, please contact us at:
            </Text>
            <Text style={styles.sectionText}>
              • Email: privacy@mycollegetix.com{"\n"}
              • General inquiries: contact@mycollegetix.com
            </Text>
          </View>



          {/* Related Documents */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Related Documents</Text>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => router.push("/legal/terms")}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>
                View Terms of Service →
              </Text>
            </TouchableOpacity>
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