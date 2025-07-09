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
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { supabase } from "@/src/lib/supabase";

const { width, height } = Dimensions.get("window");

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { signUp } = useAuth();

  const handleRegister = async () => {
    setIsLoading(true);
    const { error } = await signUp(email, password, name);
    if (error) {
      Alert.alert("Registration Failed", error.message);
    } else {
      // Optionally, you can navigate the user to the login screen
      // or directly to the main app area upon successful registration.
      Alert.alert("Success", "Your account has been created successfully!");
    }
    setIsLoading(false);
  };
  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { color: "#ef4444", text: "Weak" };
    if (password.length < 10) return { color: "#f59e0b", text: "Medium" };
    return { color: "#10b981", text: "Strong" };
  };

  const FeatureCard = ({
    icon,
    title,
    subtitle,
  }: {
    icon: string;
    title: string;
    subtitle: string;
  }) => (
    <BlurView intensity={20} style={styles.featureCard}>
      <Ionicons
        name={icon as any}
        size={24}
        color="#ffd700"
        style={styles.featureIcon}
      />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </BlurView>
  );

  const passwordStrength = getPasswordStrength(password);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
        style={styles.background}
      />

      {/* Animated background elements */}
      <View style={styles.floatingElement1} />
      <View style={styles.floatingElement2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#ffd700", "#ffed4a"]}
                style={styles.logo}
              >
                <Ionicons name="ticket-outline" size={32} color="#18453b" />
              </LinearGradient>
            </View>

            <Text style={styles.heroTitle}>MSU Tickets</Text>
            <Text style={styles.heroSubtitle}>
              Your gateway to exclusive Spartan events and experiences
            </Text>

            {/* Features Grid */}
            <View style={styles.featuresGrid}>
              <FeatureCard
                icon="shield-checkmark-outline"
                title="Secure"
                subtitle="Bank-level security"
              />
              <FeatureCard
                icon="flash-outline"
                title="Fast"
                subtitle="Instant registration"
              />
              <FeatureCard
                icon="star-outline"
                title="Premium"
                subtitle="Exclusive access"
              />
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Create Account</Text>
              <Text style={styles.formSubtitle}>
                Join thousands of Spartans already registered
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    style={styles.input}
                    autoCapitalize="words"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

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
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>Password</Text>
                  {password.length > 0 && (
                    <Text
                      style={[
                        styles.strengthText,
                        { color: passwordStrength.color },
                      ]}
                    >
                      {passwordStrength.text}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    password.length > 0 && {
                      borderColor: passwordStrength.color,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Create a strong password"
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

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    confirmPassword.length > 0 &&
                      confirmPassword !== password && {
                        borderColor: "#ef4444",
                      },
                    confirmPassword.length > 0 &&
                      confirmPassword === password && {
                        borderColor: "#10b981",
                      },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    style={[styles.input, { flex: 1 }]}
                    autoCapitalize="none"
                    placeholderTextColor="#9ca3af"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? "eye-outline" : "eye-off-outline"
                      }
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                {confirmPassword.length > 0 && confirmPassword !== password && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  isLoading && styles.loadingButton,
                ]}
                onPress={handleRegister}
                disabled={
                  isLoading ||
                  !name ||
                  !email ||
                  !password ||
                  password !== confirmPassword
                }
              >
                <LinearGradient
                  colors={["#18453b", "#2a6b5a"]}
                  style={styles.buttonGradient}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.buttonText}>Creating Account...</Text>
                      <View style={styles.spinner} />
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>CREATE ACCOUNT</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Already have an account?</Text>
                <View style={styles.dividerLine} />
              </View>

              <Link href="../(auth)/login" asChild>
                <TouchableOpacity style={styles.loginLink}>
                  <Ionicons name="log-in-outline" size={20} color="#18453b" />
                  <Text style={styles.loginText}>Sign In Here</Text>
                </TouchableOpacity>
              </Link>

              {/* Terms and Privacy */}
              <Text style={styles.termsText}>
                By creating an account, you agree to our{" "}
                <Text style={styles.linkText}>Terms of Service</Text> and{" "}
                <Text style={styles.linkText}>Privacy Policy</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  floatingElement1: {
    position: "absolute",
    top: "15%",
    left: "10%",
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 215, 0, 0.08)",
  },
  floatingElement2: {
    position: "absolute",
    bottom: "30%",
    right: "15%",
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
  },
  heroSection: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 70,
    height: 70,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ffd700",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  featuresGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 320,
    gap: 12,
  },
  featureCard: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  featureIcon: {
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 14,
  },
  formSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  formHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#18453b",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    height: 52,
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
  errorText: {
    fontSize: 12,
    color: "#ef4444",
    marginTop: 4,
    marginLeft: 4,
  },
  registerButton: {
    borderRadius: 12,
    marginTop: 8,
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
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
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
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
    gap: 8,
    marginBottom: 20,
  },
  loginText: {
    fontSize: 16,
    color: "#18453b",
    fontWeight: "500",
  },
  termsText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  linkText: {
    color: "#18453b",
    fontWeight: "500",
  },
});
