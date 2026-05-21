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
import { useRouter, Link } from "expo-router";
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
  const [loginError, setLoginError] = useState("");

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setLoginError("");

    try {
      console.log("🚀 Starting Google sign in process...");

      // User agrees to terms by clicking sign in (shown on login screen)
      const { error } = await signInWithGoogle(true);

      if (error) {
        console.error("Google sign in error:", error);

        // Check if this is a database/email validation error
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes("database error") ||
          errorMessage.includes("saving new user") ||
          errorMessage.includes("limited to students") ||
          errorMessage.includes("college email") ||
          errorMessage.includes("email domain")
        ) {
          setLoginError(
            "Access is currently limited to students from Michigan State University and University of Michigan. Please use your college email (.edu) to sign up."
          );
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
    setIsMicrosoftLoading(true);
    setLoginError("");

    try {
      console.log("🚀 Starting Microsoft sign in process...");

      // User agrees to terms by clicking sign in (shown on login screen)
      const { error } = await signInWithMicrosoft(true);

      if (error) {
        console.error("Microsoft sign in error:", error);
        setLoginError(`Microsoft sign in failed: ${error.message}`);
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

            {/* Terms Notice */}
            <View style={styles.termsNotice}>
              <Text style={styles.termsNoticeText}>
                By signing in, you agree to our{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() => {
                    Alert.alert("Terms of Service", "Terms page coming soon");
                  }}
                >
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text
                  style={styles.termsLink}
                  onPress={() => {
                    Alert.alert("Privacy Policy", "Privacy page coming soon");
                  }}
                >
                  Privacy Policy
                </Text>
                .
              </Text>
            </View>

            {/* Info Note */}
            <View style={styles.infoNote}>
              <Ionicons
                name="information-circle-outline"
                size={20}
                color="#6b7280"
              />
              <Text style={styles.infoText}>
                Sign in with your college email. Your college will be
                automatically detected.
              </Text>
            </View>

            {/* Dev/Testing Login Link */}
            {process.env.EXPO_PUBLIC_SHOW_DEV_LOGIN === "true" && (
              <Link href="/(auth)/login-old-backup" asChild>
                <TouchableOpacity style={styles.devLoginButton}>
                  <Ionicons name="code-outline" size={18} color="#6b7280" />
                  <Text style={styles.devLoginText}>
                    Testing? Use Email/Password Login
                  </Text>
                </TouchableOpacity>
              </Link>
            )}
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
  termsNotice: {
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  termsNoticeText: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
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
  devLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 16,
  },
  devLoginText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
});
