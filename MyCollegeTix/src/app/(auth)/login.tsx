import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  Image,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";
import { GoogleSignInButton } from "@/src/components/GoogleSignInButton";
import { MicrosoftSignInButton } from "@/src/components/MicrosoftSignInButton";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [isResetLoading, setIsResetLoading] = useState(false);
  const [resendVerificationVisible, setResendVerificationVisible] =
    useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const { signIn, signInWithGoogle, signInWithMicrosoft } = useAuth();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [showOAuthComplete, setShowOAuthComplete] = useState(false);

  const handleLogin = async () => {
    // Clear any previous errors
    setLoginError("");

    if (!email || !password) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        console.error("Login error:", error);

        // Handle specific error types
        if (error.message.includes("Invalid login credentials")) {
          setLoginError(
            "Invalid email or password. Please check your credentials and try again."
          );
        } else if (error.message.includes("Email not confirmed")) {
          setLoginError(
            "Please check your email and confirm your account before signing in."
          );

          // Auto-open verification modal with user's email
          setTimeout(() => {
            Alert.alert(
              "Email Verification Required",
              "Your account isn't verified yet. We'll help you resend the verification email so you can complete your registration.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Send Verification Email",
                  onPress: () => {
                    setVerificationEmail(email);
                    setResendVerificationVisible(true);
                  },
                },
              ]
            );
          }, 500); // Small delay to let login error show first
        } else if (error.message.includes("Too many requests")) {
          setLoginError(
            "Too many login attempts. Please wait a moment and try again."
          );
        } else if (
          error.message.includes("email_not_confirmed") ||
          error.message.includes("not confirmed") ||
          error.message.includes("unverified")
        ) {
          setLoginError(
            "Please check your email and confirm your account before signing in."
          );

          // Auto-open verification modal with user's email
          setTimeout(() => {
            Alert.alert(
              "Email Verification Required",
              "Your account isn't verified yet. We'll help you resend the verification email so you can complete your registration.",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Send Verification Email",
                  onPress: () => {
                    setVerificationEmail(email);
                    setResendVerificationVisible(true);
                  },
                },
              ]
            );
          }, 500);
        } else {
          setLoginError(
            "Login failed. Please check your credentials and try again."
          );
        }
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error);
      setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(verificationEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsResendLoading(true);
    try {
      console.log(
        "📧 Requesting verification resend for email:",
        verificationEmail
      );

      // Call secure server-side function instead of direct database queries
      const { data, error } = await supabase.functions.invoke(
        "resend-verification",
        {
          body: { email: verificationEmail },
        }
      );

      if (error) {
        console.error(
          "❌ Resend verification failed:",
          error.message || "Unknown error"
        );

        // Handle different HTTP status codes
        const statusCode = error.context?.status;

        if (statusCode === 404) {
          // User not found
          Alert.alert(
            "Account Not Found",
            "No account found with this email address. Please create a new account or check the email address.",
            [
              {
                text: "OK",
                onPress: () => {
                  setResendVerificationVisible(false);
                  setVerificationEmail("");
                },
              },
            ]
          );
          return;
        } else if (statusCode === 429) {
          // Rate limited
          Alert.alert(
            "Rate Limited",
            "Too many requests. Please wait a few minutes before trying again.",
            [
              {
                text: "OK",
                onPress: () => {
                  setResendVerificationVisible(false);
                  setVerificationEmail("");
                },
              },
            ]
          );
          return;
        }

        // Try to extract error message from the response data
        if (data && typeof data === "object") {
          const errorResponse = data as {
            success: boolean;
            message: string;
            action?: string;
          };
          if (errorResponse.message) {
            let title = "Error";
            switch (errorResponse.action) {
              case "already_verified":
                title = "Already Verified";
                break;
              case "not_found":
                title = "Account Not Found";
                break;
              case "rate_limited":
                title = "Rate Limited";
                break;
            }

            Alert.alert(title, errorResponse.message, [
              {
                text: "OK",
                onPress: () => {
                  setResendVerificationVisible(false);
                  setVerificationEmail("");
                },
              },
            ]);
            return;
          }
        }

        // Generic error handling
        Alert.alert(
          "Error",
          "Unable to process your request. Please check your connection and try again.",
          [
            {
              text: "OK",
              onPress: () => {
                setResendVerificationVisible(false);
                setVerificationEmail("");
              },
            },
          ]
        );
        return;
      }

      console.log("✅ Verification email processing completed");

      const response = data as {
        success: boolean;
        message: string;
        action?: string;
      };

      if (response.success) {
        // Success - verification email sent
        console.log("✅ Verification email sent successfully");
        Alert.alert("Verification Email Sent! ✅", response.message, [
          {
            text: "OK",
            onPress: () => {
              setResendVerificationVisible(false);
              setVerificationEmail("");
            },
          },
        ]);
      } else {
        // Handle different error scenarios based on action type
        console.log("❌ Function returned error:", response.message);

        let title = "Error";
        let message = response.message;

        switch (response.action) {
          case "already_verified":
            title = "Already Verified";
            break;
          case "not_found":
            title = "Account Not Found";
            break;
          case "rate_limited":
            title = "Rate Limited";
            break;
          default:
            title = "Error";
            break;
        }

        Alert.alert(title, message, [
          {
            text: "OK",
            onPress: () => {
              setResendVerificationVisible(false);
              setVerificationEmail("");
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error("💥 Unexpected resend verification error:", error);

      // Handle network and other errors
      let errorMessage = "An unexpected error occurred. Please try again.";

      if (error.message?.includes("fetch")) {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Request timeout. Please try again.";
      }

      Alert.alert("Error", errorMessage, [
        {
          text: "OK",
          onPress: () => {
            setResendVerificationVisible(false);
            setVerificationEmail("");
          },
        },
      ]);
    } finally {
      setIsResendLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setLoginError("");

    try {
      console.log("🚀 Starting Google sign in process...");
      const { error } = await signInWithGoogle();
      if (error) {
        console.error("Google sign in error:", error);
        setLoginError(`Google sign in failed: ${error.message}`);
      } else {
        console.log("✅ Google sign in process completed");
        setShowOAuthComplete(true);
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
      const { error } = await signInWithMicrosoft();
      if (error) {
        console.error("Microsoft sign in error:", error);
        setLoginError(`Microsoft sign in failed: ${error.message}`);
      } else {
        console.log("✅ Microsoft sign in process completed");
        setShowOAuthComplete(true);
      }
    } catch (error) {
      console.error("Unexpected Microsoft sign in error:", error);
      setLoginError("An unexpected error occurred with Microsoft sign in.");
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  const handleCheckSession = async () => {
    console.log("🔄 Manually checking for session...");
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("❌ Error checking session:", error);
        setLoginError("Error checking session");
        return;
      }
      
      if (session) {
        console.log("✅ Session found! User should be logged in");
        console.log("👤 User:", session.user.email);
        setShowOAuthComplete(false);
        setIsGoogleLoading(false);
        // The AuthProvider will handle the navigation
      } else {
        console.log("❌ No session found");
        setLoginError("OAuth completed but no session found. Please try again.");
        setShowOAuthComplete(false);
        setIsGoogleLoading(false);
      }
    } catch (error) {
      console.error("❌ Error checking session:", error);
      setLoginError("Error checking session");
      setShowOAuthComplete(false);
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    setIsResetLoading(true);
    try {
      console.log("🔐 Sending password reset email to:", resetEmail);

      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: process.env.EXPO_PUBLIC_RESET_PASSWORD_URL!,
      });

      if (error) {
        console.error("❌ Password reset error:", error);
        throw error;
      }

      console.log("✅ Password reset email sent successfully");

      Alert.alert(
        "Password Reset Email Sent",
        `We've sent a password reset link to ${resetEmail}. Please check your email and follow the instructions to reset your password.`,
        [
          {
            text: "OK",
            onPress: () => {
              setForgotPasswordVisible(false);
              setResetEmail("");
            },
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Password reset failed:", error);

      if (error.message.includes("User not found")) {
        Alert.alert(
          "Email Not Found",
          "No account found with this email address. Please check the email or create a new account."
        );
      } else {
        Alert.alert(
          "Error",
          error.message ||
            "Failed to send password reset email. Please try again."
        );
      }
    } finally {
      setIsResetLoading(false);
    }
  };

  const StatCard = ({ number, label }: { number: string; label: string }) => (
    <BlurView intensity={20} style={styles.statCard}>
      <Text style={styles.statNumber}>{number}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </BlurView>
  );

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
        showsVerticalScrollIndicator={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../../assets/images/icon.png")}
                style={styles.logo}
              />
            </View>

            <Text style={styles.welcomeTitle}>Welcome</Text>
            <Text style={styles.welcomeSubtitle}>
              Login to access your campus marketplace for buying and selling
              tickets
            </Text>
          </View>

          {/* Login Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Sign In</Text>
              <Text style={styles.formSubtitle}>
                Enter your credentials to access your account
              </Text>
            </View>

            <View style={styles.formContainer}>
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

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View
                  style={[styles.inputWrapper, loginError && styles.inputError]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (loginError) setLoginError(""); // Clear error when user types
                    }}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <View
                  style={[styles.inputWrapper, loginError && styles.inputError]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (loginError) setLoginError(""); // Clear error when user types
                    }}
                    secureTextEntry={!showPassword}
                    style={[styles.input, { flex: 1 }]}
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Form Options */}
              <View style={styles.formOptions}>
                <TouchableOpacity
                  onPress={() => setResendVerificationVisible(true)}
                >
                  <Text style={styles.resendVerification}>
                    Resend Verification Email
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setForgotPasswordVisible(true)}
                >
                  <Text style={styles.forgotPassword}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.loadingButton]}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={["#18453b", "#2a6b5a"]}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.buttonText}>Signing In...</Text>
                      <View style={styles.spinner} />
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>SIGN IN</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Google Sign In Button */}
              <GoogleSignInButton
                onPress={handleGoogleSignIn}
                loading={isGoogleLoading}
                disabled={isGoogleLoading}
                style={styles.googleButton}
              />

              {/* Microsoft Sign In Button */}
              <MicrosoftSignInButton
                onPress={handleMicrosoftSignIn}
                loading={isMicrosoftLoading}
                disabled={isMicrosoftLoading}
                style={styles.microsoftButton}
              />

              {/* Production Note */}
              <View style={styles.productionNote}>
                <Text style={styles.productionNoteText}>
                  🚀 Production-ready OAuth implementation
                </Text>
                <Text style={styles.productionNoteSubtext}>
                  Will work in built apps with proper redirect handling
                </Text>
              </View>

              {/* Register Link */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Don't have an account?</Text>
                <View style={styles.dividerLine} />
              </View>

              <Link href="../(auth)/register" asChild>
                <TouchableOpacity style={styles.registerLink}>
                  <Ionicons
                    name="person-add-outline"
                    size={20}
                    color="#18453b"
                  />
                  <Text style={styles.registerText}>Create Account</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </KeyboardAvoidingView>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setForgotPasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} style={styles.modalBlur}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons name="mail-outline" size={32} color="#18453b" />
                </View>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your email to receive a password reset link
                </Text>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email address"
                      value={resetEmail}
                      onChangeText={setResetEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={styles.modalInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#6b7280"
                  />
                  <Text style={styles.infoText}>
                    We'll send a secure link to reset your password to this
                    email address.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setForgotPasswordVisible(false);
                    setResetEmail("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    isResetLoading && styles.loadingButton,
                  ]}
                  onPress={handleForgotPassword}
                  disabled={isResetLoading}
                >
                  <LinearGradient
                    colors={["#18453b", "#2a6b5a"]}
                    style={styles.buttonGradient}
                  >
                    {isResetLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.buttonText}>Sending...</Text>
                        <View style={styles.spinner} />
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Send Reset Link</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Resend Verification Email Modal */}
      <Modal
        visible={resendVerificationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setResendVerificationVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} style={styles.modalBlur}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.modalIcon}>
                  <Ionicons
                    name="mail-unread-outline"
                    size={32}
                    color="#18453b"
                  />
                </View>
                <Text style={styles.modalTitle}>Resend Verification Email</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your email to resend the verification email
                </Text>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="mail-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your email address"
                      value={verificationEmail}
                      onChangeText={setVerificationEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={styles.modalInfo}>
                  <Ionicons
                    name="information-circle-outline"
                    size={20}
                    color="#6b7280"
                  />
                  <Text style={styles.infoText}>
                    We'll check if your account exists and send a verification
                    email if needed.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setResendVerificationVisible(false);
                    setVerificationEmail("");
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.resetButton,
                    isResendLoading && styles.loadingButton,
                  ]}
                  onPress={handleResendVerification}
                  disabled={isResendLoading}
                >
                  <LinearGradient
                    colors={["#18453b", "#2a6b5a"]}
                    style={styles.buttonGradient}
                  >
                    {isResendLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.buttonText}>Sending...</Text>
                        <View style={styles.spinner} />
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>
                        Send Verification Email
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>
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
  keyboardContainer: {
    flex: 1,
    width: "100%",
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
    fontSize: 36,
    fontWeight: "900",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    maxWidth: 300,
  },
  statCard: {
    width: 70,
    height: 60,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffd700",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  formSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 40, // Increased radius for a more pronounced curve
    borderTopRightRadius: 40, // Increased radius for a more pronounced curve
    borderBottomLeftRadius: 40, // Added for bottom curve
    borderBottomRightRadius: 40, // Added for bottom curve
    paddingTop: 40,
    paddingBottom: 40,
    minHeight: height * 0.6,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#18453b",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  formContainer: {
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#18453b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    height: 56,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  eyeIcon: {
    padding: 4,
  },
  formOptions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  resendVerification: {
    fontSize: 14,
    color: "#18453b",
    fontWeight: "500",
  },
  forgotPassword: {
    fontSize: 14,
    color: "#18453b",
    fontWeight: "500",
  },
  loginButton: {
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: "#18453b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingButton: {
    opacity: 0.8,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderTopColor: "white",
    marginLeft: 10,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  registerLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
    marginBottom: 20,
  },
  registerText: {
    fontSize: 16,
    color: "#18453b",
    fontWeight: "600",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "rgba(24, 69, 59, 0.05)",
    borderRadius: 10,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: "#18453b",
    fontWeight: "500",
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBlur: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "100%",
    maxWidth: 400,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalIcon: {
    width: 60,
    height: 60,
    backgroundColor: "#f0f9ff",
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  modalContent: {
    marginBottom: 24,
  },
  modalInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  resetButton: {
    flex: 1,
    borderRadius: 12,
  },
  googleButton: {
    marginBottom: 12,
  },
  microsoftButton: {
    marginBottom: 20,
  },
  oauthCompleteContainer: {
    backgroundColor: "#f0f9ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  oauthCompleteText: {
    fontSize: 14,
    color: "#1e40af",
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "500",
  },
  checkSessionButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  checkSessionButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  productionNote: {
    backgroundColor: "#dcfdf7",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#10b981",
  },
  productionNoteText: {
    fontSize: 14,
    color: "#047857",
    textAlign: "center",
    fontWeight: "600",
    marginBottom: 4,
  },
  productionNoteSubtext: {
    fontSize: 12,
    color: "#047857",
    textAlign: "center",
  },
});
