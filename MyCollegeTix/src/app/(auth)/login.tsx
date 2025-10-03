import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/src/providers/AuthProvider";
import { GoogleSignInButton } from "@/src/components/GoogleSignInButton";
import { MicrosoftSignInButton } from "@/src/components/MicrosoftSignInButton";

const { width, height } = Dimensions.get("window");

export default function OAuthLoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithMicrosoft } = useAuth();

  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loginError, setLoginError] = useState("");

  const handleGoogleSignIn = async () => {
    if (!termsAccepted) {
      Alert.alert(
        "Terms Required",
        "Please accept the Terms of Service and Privacy Policy to continue."
      );
      return;
    }

    setIsGoogleLoading(true);
    setLoginError("");

    try {
      console.log("🚀 Starting Google sign in process...");
      const { error } = await signInWithGoogle(termsAccepted);

      if (error) {
        console.error("Google sign in error:", error);

        // Check if error is about terms not being accepted
        if (error.message.includes("terms")) {
          setLoginError("Please accept the Terms of Service to continue.");
        } else {
          setLoginError(`Google sign in failed: ${error.message}`);
        }
      } else {
        console.log("✅ Google sign in process completed");
        // Navigation handled by AuthProvider
      }
    } catch (error) {
      console.error("Unexpected Google sign in error:", error);
      setLoginError("An unexpected error occurred with Google sign in.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleMicrosoftSignIn = async () => {
    if (!termsAccepted) {
      Alert.alert(
        "Terms Required",
        "Please accept the Terms of Service and Privacy Policy to continue."
      );
      return;
    }

    setIsMicrosoftLoading(true);
    setLoginError("");

    try {
      console.log("🚀 Starting Microsoft sign in process...");
      const { error } = await signInWithMicrosoft(termsAccepted);

      if (error) {
        console.error("Microsoft sign in error:", error);

        // Check if error is about terms not being accepted
        if (error.message.includes("terms")) {
          setLoginError("Please accept the Terms of Service to continue.");
        } else {
          setLoginError(`Microsoft sign in failed: ${error.message}`);
        }
      } else {
        console.log("✅ Microsoft sign in process completed");
        // Navigation handled by AuthProvider
      }
    } catch (error) {
      console.error("Unexpected Microsoft sign in error:", error);
      setLoginError("An unexpected error occurred with Microsoft sign in.");
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f2f28", "#18453b", "#2a6b5a"]}
        style={styles.background}
      />

      {/* Animated background elements */}
      <View style={styles.floatingElement1} />
      <View style={styles.floatingElement2} />

      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../../../assets/images/icon.png")}
              style={styles.logo}
            />
          </View>

          <Text style={styles.welcomeTitle}>Welcome to MyCollegeTix</Text>
          <Text style={styles.welcomeSubtitle}>
            Sign in or register to access your campus marketplace for buying and
            selling tickets
          </Text>
        </View>

        {/* Login Card Section */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sign in or Register</Text>
            <Text style={styles.cardSubtitle}>
              Continue with your college email
            </Text>
          </View>

          <View style={styles.cardContent}>
            {/* Error Message */}
            {loginError ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#ef4444"
                />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Google Sign In Button */}
            <GoogleSignInButton
              onPress={handleGoogleSignIn}
              loading={isGoogleLoading}
              disabled={isGoogleLoading || isMicrosoftLoading}
              style={styles.oauthButton}
            />

            {/* Microsoft Sign In Button */}
            <MicrosoftSignInButton
              onPress={handleMicrosoftSignIn}
              loading={isMicrosoftLoading}
              disabled={isGoogleLoading || isMicrosoftLoading}
              style={styles.oauthButton}
            />

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Before Registration</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Terms of Service Checkbox */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && (
                    <Ionicons name="checkmark" size={16} color="#fff" />
                  )}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => {
                      // TODO: Navigate to Terms of Service
                      Alert.alert("Terms of Service", "Terms page coming soon");
                    }}
                  >
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text
                    style={styles.termsLink}
                    onPress={() => {
                      // TODO: Navigate to Privacy Policy
                      Alert.alert("Privacy Policy", "Privacy page coming soon");
                    }}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#6b7280"
              />
              <Text style={styles.infoText}>
                By signing in, you'll automatically be registered if you're a
                new user. Your college will be detected from your email domain.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  background: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  floatingElement1: {
    position: "absolute",
    top: "10%",
    right: "10%",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 215, 0, 0.1)",
  },
  floatingElement2: {
    position: "absolute",
    bottom: "20%",
    left: "5%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  welcomeSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  cardSection: {
    backgroundColor: "white",
    borderRadius: 40,
    paddingTop: 40,
    paddingBottom: 40,
    minHeight: height * 0.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#18453b",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  cardContent: {
    paddingHorizontal: 20,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "500",
  },
  oauthButton: {
    marginBottom: 12,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  termsContainer: {
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#18453b",
    borderColor: "#18453b",
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  termsLink: {
    color: "#18453b",
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f0f9ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#1e40af",
    lineHeight: 18,
  },
});
