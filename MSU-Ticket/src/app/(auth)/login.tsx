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
  Animated,
  Dimensions,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      console.log("Login pressed");
    }, 2000);
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
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#ffd700", "#ffed4a"]}
                style={styles.logo}
              >
                <Ionicons name="ticket-outline" size={36} color="#18453b" />
              </LinearGradient>
            </View>

            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSubtitle}>
              Sign in to access your tickets and discover amazing Spartan events
            </Text>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <StatCard number="50K+" label="Students" />
              <StatCard number="500+" label="Events" />
              <StatCard number="99.9%" label="Uptime" />
              <StatCard number="24/7" label="Support" />
            </View>
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
              {/* Email Input */}
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
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
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
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
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
                  style={styles.rememberMe}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  <View
                    style={[styles.checkbox, rememberMe && styles.checkedBox]}
                  >
                    {rememberMe && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <Text style={styles.rememberText}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity>
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

              {/* Social Login */}
              <View style={styles.socialLogin}>
                <Text style={styles.socialTitle}>Or sign in with</Text>
                <View style={styles.socialButtons}>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-google" size={20} color="#4285f4" />
                    <Text style={[styles.socialText, { color: "#4285f4" }]}>
                      Google
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.socialButton}>
                    <Ionicons name="logo-microsoft" size={20} color="#0078d4" />
                    <Text style={[styles.socialText, { color: "#0078d4" }]}>
                      Microsoft
                    </Text>
                  </TouchableOpacity>
                </View>
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

              {/* Security Badge */}
              <View style={styles.securityBadge}>
                <Ionicons name="shield-checkmark" size={16} color="#ffd700" />
                <Text style={styles.securityText}>
                  Your data is protected with bank-level security
                </Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  rememberMe: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkedBox: {
    backgroundColor: "#18453b",
    borderColor: "#18453b",
  },
  rememberText: {
    fontSize: 14,
    color: "#6b7280",
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
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
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
  socialLogin: {
    marginBottom: 24,
  },
  socialTitle: {
    textAlign: "center",
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  socialText: {
    fontSize: 14,
    fontWeight: "500",
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
});
