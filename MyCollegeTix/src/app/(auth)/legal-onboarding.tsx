// src/app/(auth)/legal-onboarding.tsx - Legal Agreement Onboarding
import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  Alert,
  ActivityIndicator,
  StatusBar,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useAuth } from "@/src/providers/AuthProvider";
import { legalService } from "@/src/services/legalService";

export default function LegalOnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAcceptAgreements = async () => {
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert(
        "Agreements Required",
        "You must accept both the Terms of Service and Privacy Policy to continue using MyCollegeTix."
      );
      return;
    }

    if (!user) {
      Alert.alert("Error", "User authentication required");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await legalService.acceptLegalAgreements(user.id, [
        "terms_of_service",
        "privacy_policy",
      ]);

      if (result.success) {
        // Navigate to main app
        router.replace("/(tabs)" as any);
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to record agreement acceptance"
        );
      }
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openTerms = () => {
    router.push("/legal/terms");
  };

  const openPrivacy = () => {
    router.push("/legal/privacy");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.primary }]}>
        <View style={styles.headerContent}>
          <View
            style={[styles.logoContainer, { backgroundColor: theme.secondary }]}
          >
            <Ionicons name="shield-checkmark" size={24} color={theme.primary} />
          </View>
          <Text style={styles.headerTitle}>Legal Agreements</Text>
          <Text style={styles.headerSubtitle}>
            Please review and accept our terms to continue
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Message */}
          <View style={styles.welcomeCard}>
            <View style={styles.welcomeHeader}>
              <Ionicons
                name="information-circle"
                size={20}
                color={theme.primary}
              />
              <Text style={[styles.welcomeTitle, { color: theme.primary }]}>
                Welcome to MyCollegeTix
              </Text>
            </View>
            <Text style={styles.welcomeText}>
              Before you can start buying and selling tickets, we need you to
              review and accept our legal agreements. This helps keep our
              community safe and secure.
            </Text>
          </View>

          {/* Terms of Service */}
          <View style={styles.agreementCard}>
            <View style={styles.agreementHeader}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setTermsAccepted(!termsAccepted)}
              >
                <View
                  style={[
                    styles.checkboxInner,
                    termsAccepted && { backgroundColor: theme.primary },
                  ]}
                >
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.agreementContent}>
                <Text style={styles.agreementTitle}>Terms of Service</Text>
                <Text style={styles.agreementDescription}>
                  Our terms outline the rules for using MyCollegeTix, including
                  our zero-tolerance policy for inappropriate content and
                  behavior.
                </Text>

                <TouchableOpacity style={styles.readButton} onPress={openTerms}>
                  <Text
                    style={[styles.readButtonText, { color: theme.primary }]}
                  >
                    Read Terms of Service
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Privacy Policy */}
          <View style={styles.agreementCard}>
            <View style={styles.agreementHeader}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
              >
                <View
                  style={[
                    styles.checkboxInner,
                    privacyAccepted && { backgroundColor: theme.primary },
                  ]}
                >
                  {privacyAccepted && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.agreementContent}>
                <Text style={styles.agreementTitle}>Privacy Policy</Text>
                <Text style={styles.agreementDescription}>
                  Learn how we collect, use, and protect your personal
                  information when you use our platform.
                </Text>

                <TouchableOpacity
                  style={styles.readButton}
                  onPress={openPrivacy}
                >
                  <Text
                    style={[styles.readButtonText, { color: theme.primary }]}
                  >
                    Read Privacy Policy
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.primary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Important Notice */}
          <View style={styles.noticeCard}>
            <View style={styles.noticeHeader}>
              <Ionicons name="warning" size={18} color="#f59e0b" />
              <Text style={styles.noticeTitle}>Important</Text>
            </View>
            <Text style={styles.noticeText}>
              By accepting these agreements, you confirm that you:
            </Text>
            <Text style={styles.noticeList}>
              • Are a verified college student{"\n"}• Agree to our
              zero-tolerance policy for inappropriate content{"\n"}• Understand
              our content moderation and reporting systems{"\n"}• Will conduct
              transactions safely and responsibly
            </Text>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.acceptButton,
              {
                backgroundColor:
                  termsAccepted && privacyAccepted ? theme.primary : "#d1d5db",
              },
            ]}
            onPress={handleAcceptAgreements}
            disabled={!termsAccepted || !privacyAccepted || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.acceptButtonText}>Accept & Continue</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            You must accept both agreements to use MyCollegeTix
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  headerContent: {
    alignItems: "center",
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
  contentContainer: {
    flex: 1,
    paddingTop: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  welcomeText: {
    fontSize: 15,
    color: "#6b7280",
    lineHeight: 22,
  },
  agreementCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  agreementHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  checkbox: {
    marginTop: 2,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  agreementContent: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 8,
  },
  agreementDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  readButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  readButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  noticeCard: {
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
  },
  noticeText: {
    fontSize: 14,
    color: "#92400e",
    marginBottom: 8,
  },
  noticeList: {
    fontSize: 14,
    color: "#92400e",
    lineHeight: 20,
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  acceptButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 8,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
