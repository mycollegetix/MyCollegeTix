import React, { useState, useEffect } from "react";
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
  FlatList,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useAuth } from "@/src/providers/AuthProvider";
import { CollegeService } from "@/src/services/collegeService";
import { legalService } from "@/src/services/legalService";
import { College } from "@/src/types/database.types";

const { width, height } = Dimensions.get("window");

export default function EnhancedRegisterScreen() {
  // Form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [colleges, setColleges] = useState<College[]>([]);
  const [loadingColleges, setLoadingColleges] = useState(true);
  const [emailValidationMessage, setEmailValidationMessage] = useState("");
  
  // Legal agreement state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const { signUp } = useAuth();
  const router = useRouter();

  // Load colleges on mount
  useEffect(() => {
    loadColleges();
  }, []);

  // Validate email when it changes
  useEffect(() => {
    if (email && selectedCollege) {
      validateEmailDomain();
    } else {
      setEmailValidationMessage("");
    }
  }, [email, selectedCollege]);

  const loadColleges = async () => {
    console.log("🔍 Loading colleges for registration...");
    try {
      const result = await CollegeService.getActiveColleges();

      if (!result.success || !result.data) {
        console.error("❌ Error loading colleges:", result.error);

        // Fallback to MSU if there's an
        return;
      }

      console.log("✅ Colleges loaded successfully:", result.data.length);
      setColleges(result.data);
    } catch (error) {
      console.error("💥 Unexpected error loading colleges:", error);
    } finally {
      setLoadingColleges(false);
    }
  };

  // Replace these functions in your register.tsx file:

  const validateEmailDomain = () => {
    if (!selectedCollege || !email) {
      setEmailValidationMessage("");
      return;
    }

    const emailDomain = email.split("@")[1]?.toLowerCase().trim();
    const expectedDomain = selectedCollege.email_domain.toLowerCase().trim();

    console.log("🔍 Email validation:");
    console.log("🔍 Email:", email);
    console.log("🔍 Extracted domain:", `"${emailDomain}"`);
    console.log("🔍 Expected domain:", `"${expectedDomain}"`);
    console.log("🔍 Match:", emailDomain === expectedDomain);

    if (!emailDomain) {
      setEmailValidationMessage("Please enter a valid email address");
      return;
    }

    if (emailDomain !== expectedDomain) {
      setEmailValidationMessage(
        `Please use your ${selectedCollege.short_name} email address (@${expectedDomain})`
      );
      return;
    }

    setEmailValidationMessage("✓ Valid college email");
  };

  const isEmailValid = () => {
    if (!selectedCollege || !email) return false;

    const emailDomain = email.split("@")[1]?.toLowerCase().trim();
    const expectedDomain = selectedCollege.email_domain.toLowerCase().trim();

    console.log("🔍 isEmailValid check:");
    console.log("🔍 emailDomain:", `"${emailDomain}"`);
    console.log("🔍 expectedDomain:", `"${expectedDomain}"`);
    console.log("🔍 Result:", emailDomain === expectedDomain);

    return emailDomain === expectedDomain;
  };

  // Alternative: More flexible validation that might help
  const isEmailValidFlexible = () => {
    if (!selectedCollege || !email) return false;

    // Get domain from email
    const emailParts = email.split("@");
    if (emailParts.length !== 2) return false;

    const emailDomain = emailParts[1].toLowerCase().trim();
    const expectedDomain = selectedCollege.email_domain.toLowerCase().trim();

    // Check for exact match
    const exactMatch = emailDomain === expectedDomain;

    console.log("🔍 Flexible validation:");
    console.log("🔍 Email parts:", emailParts);
    console.log("🔍 emailDomain:", `"${emailDomain}"`);
    console.log("🔍 expectedDomain:", `"${expectedDomain}"`);
    console.log("🔍 Exact match:", exactMatch);

    return exactMatch;
  };

  const handleRegister = async () => {
    // Prevent double-clicks by setting loading immediately
    if (isLoading) {
      console.log("⏳ Registration already in progress, ignoring click");
      return;
    }

    // College selection validation
    if (!selectedCollege) {
      Alert.alert("Error", "Please select your college or university");
      return;
    }

    // Basic validation
    if (!name.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!isEmailValid()) {
      Alert.alert(
        "Invalid Email",
        `Please use your official ${selectedCollege.short_name} email address (@${selectedCollege.email_domain})`
      );
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    // Legal agreements validation
    if (!termsAccepted || !privacyAccepted) {
      Alert.alert(
        "Legal Agreements Required",
        "You must accept both the Terms of Service and Privacy Policy to create an account."
      );
      return;
    }

    // Set loading state IMMEDIATELY to prevent double-clicks
    setIsLoading(true);
    console.log("🔄 Starting registration process...");

    try {
      console.log("🔄 Starting registration for:", email);
      console.log("🏫 Selected college:", selectedCollege.name);

      // Use the AuthProvider signUp method which handles college assignment
      const { error } = await signUp(email, password, name, selectedCollege.id, true);

      if (error) {
        console.error("❌ Registration error:", error);

        // Handle specific error types
        if (error.message.includes("User already registered")) {
          Alert.alert(
            "Registration Failed",
            "An account with this email already exists. Please try signing in instead."
          );
        } else if (error.message.includes("Password should be at least")) {
          Alert.alert(
            "Registration Failed",
            "Password should be at least 6 characters long."
          );
        } else if (error.message.includes("Unable to validate email")) {
          Alert.alert(
            "Registration Failed",
            "Please enter a valid email address."
          );
        } else {
          Alert.alert(
            "Registration Failed",
            error.message ||
              "An error occurred during registration. Please try again."
          );
        }
      } else {
        console.log(
          "✅ Registration successful - profile should be created by trigger"
        );

        // Success - show verification message and redirect to login
        Alert.alert(
          "Account Created Successfully!",
          `We've sent a verification email to ${email}. Please check your email and click the verification link to activate your account before signing in.`,
          [
            {
              text: "OK",
              onPress: () => {
                // Clear the form
                setName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setSelectedCollege(null);
                setEmailValidationMessage("");

                // Navigate to login
                router.replace("/(auth)/login");
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error("💥 Unexpected registration error:", error);
      Alert.alert(
        "Registration Failed",
        "An unexpected error occurred. Please try again."
      );
    } finally {
      // Always reset loading state
      setIsLoading(false);
      console.log("🏁 Registration process completed");
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { color: "#ef4444", text: "Weak" };
    if (password.length < 10) return { color: "#f59e0b", text: "Medium" };
    return { color: "#10b981", text: "Strong" };
  };

  const getThemeColors = () => {
    if (selectedCollege) {
      return {
        primary: selectedCollege.primary_color,
        secondary: selectedCollege.secondary_color,
      };
    }
    // Default MSU colors
    return {
      primary: "#18453b",
      secondary: "#ffd700",
    };
  };

  const getDynamicTitle = () => {
    if (selectedCollege) {
      return `${selectedCollege.short_name} Tickets`;
    }
    return "MyCollegeTix";
  };

  const getDynamicSubtitle = () => {
    if (selectedCollege) {
      return `Your gateway to exclusive ${selectedCollege.short_name} events and experiences`;
    }
    return "Your gateway to exclusive campus events and experiences";
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
        color={getThemeColors().secondary}
        style={styles.featureIcon}
      />
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </BlurView>
  );

  const CollegeItem = ({ college }: { college: College }) => (
    <TouchableOpacity
      style={styles.collegeItem}
      onPress={() => {
        setSelectedCollege(college);
        setShowCollegeModal(false);
      }}
    >
      <View style={styles.collegeInfo}>
        <Text style={styles.collegeName}>{college.name}</Text>
        <Text style={styles.collegeShortName}>{college.short_name}</Text>
        <Text style={styles.collegeEmail}>@{college.email_domain}</Text>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );

  const passwordStrength = getPasswordStrength(password);
  const themeColors = getThemeColors();

  const dynamicStyles = StyleSheet.create({
    background: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    logo: {
      width: 60,
      height: 60,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    heroTitle: {
      fontSize: 24,
      fontWeight: "700",
      color: "white",
      marginTop: 16,
      textAlign: "center",
    },
    registerButton: {
      borderRadius: 16,
      marginTop: 20,
      overflow: "hidden",
    },
    collegeButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "white",
      borderRadius: 12,
      borderWidth: 2,
      borderColor: selectedCollege ? themeColors.primary : "#e5e7eb",
      paddingHorizontal: 16,
      height: 52,
      justifyContent: "space-between",
    },
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          themeColors.primary,
          `${themeColors.primary}CC`,
          `${themeColors.primary}99`,
        ]}
        style={dynamicStyles.background}
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
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[themeColors.secondary, `${themeColors.secondary}DD`]}
                style={dynamicStyles.logo}
              >
                <Ionicons
                  name="ticket-outline"
                  size={32}
                  color={themeColors.primary}
                />
              </LinearGradient>
            </View>

            <Text style={dynamicStyles.heroTitle}>{getDynamicTitle()}</Text>
            <Text style={styles.heroSubtitle}>{getDynamicSubtitle()}</Text>

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
              <Text style={[styles.formTitle, { color: themeColors.primary }]}>
                Create Account
              </Text>
              <Text style={styles.formSubtitle}>
                Join thousands of students already registered
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* College Selection */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: themeColors.primary }]}
                >
                  Select Your College
                </Text>
                <TouchableOpacity
                  style={dynamicStyles.collegeButton}
                  onPress={() => setShowCollegeModal(true)}
                >
                  <View style={styles.collegeSelectContent}>
                    <Ionicons
                      name="school-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <Text
                      style={
                        selectedCollege
                          ? styles.selectedCollegeText
                          : styles.placeholderText
                      }
                    >
                      {selectedCollege
                        ? selectedCollege.name
                        : "Choose your college or university"}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-down-outline"
                    size={20}
                    color="#9ca3af"
                  />
                </TouchableOpacity>
              </View>

              {/* Name Input */}
              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, { color: themeColors.primary }]}
                >
                  Full Name
                </Text>
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
                <Text
                  style={[styles.inputLabel, { color: themeColors.primary }]}
                >
                  {selectedCollege
                    ? `${selectedCollege.short_name} Email Address`
                    : "Email Address"}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    emailValidationMessage.includes("✓") &&
                      styles.inputWrapperValid,
                    emailValidationMessage &&
                      !emailValidationMessage.includes("✓") &&
                      styles.inputWrapperError,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder={
                      selectedCollege
                        ? `student@${selectedCollege.email_domain}`
                        : "Enter your email"
                    }
                    value={email}
                    onChangeText={setEmail}
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
                {emailValidationMessage && (
                  <Text
                    style={[
                      styles.validationText,
                      emailValidationMessage.includes("✓")
                        ? styles.validText
                        : styles.errorText,
                    ]}
                  >
                    {emailValidationMessage}
                  </Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text
                    style={[styles.inputLabel, { color: themeColors.primary }]}
                  >
                    Password
                  </Text>
                  <Text
                    style={[
                      styles.strengthText,
                      { color: passwordStrength.color },
                    ]}
                  >
                    {password ? passwordStrength.text : ""}
                  </Text>
                </View>
                <View style={styles.inputWrapper}>
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
                    style={styles.input}
                    secureTextEntry={!showPassword}
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
                <Text
                  style={[styles.inputLabel, { color: themeColors.primary }]}
                >
                  Confirm Password
                </Text>
                <View style={styles.inputWrapper}>
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
                    style={styles.input}
                    secureTextEntry={!showConfirmPassword}
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
              </View>

              {/* Legal Agreements Section */}
              <View style={styles.legalSection}>
                <View style={styles.legalHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={themeColors.primary} />
                  <Text style={[styles.legalHeaderText, { color: themeColors.primary }]}>
                    Legal Agreements
                  </Text>
                </View>
                
                <Text style={styles.legalDescription}>
                  By creating an account, you agree to our terms and policies:
                </Text>

                {/* Terms of Service Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                >
                  <View style={[
                    styles.checkbox,
                    termsAccepted && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                  ]}>
                    {termsAccepted && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <View style={styles.checkboxText}>
                    <Text style={styles.checkboxLabel}>
                      I accept the{' '}
                      <Text 
                        style={[styles.linkText, { color: themeColors.primary }]}
                        onPress={() => router.push('/legal/terms')}
                      >
                        Terms of Service
                      </Text>
                    </Text>
                    <Text style={styles.checkboxSubtext}>
                      Including our zero-tolerance policy for inappropriate content
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Privacy Policy Checkbox */}
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setPrivacyAccepted(!privacyAccepted)}
                >
                  <View style={[
                    styles.checkbox,
                    privacyAccepted && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                  ]}>
                    {privacyAccepted && (
                      <Ionicons name="checkmark" size={14} color="white" />
                    )}
                  </View>
                  <View style={styles.checkboxText}>
                    <Text style={styles.checkboxLabel}>
                      I accept the{' '}
                      <Text 
                        style={[styles.linkText, { color: themeColors.primary }]}
                        onPress={() => router.push('/legal/privacy')}
                      >
                        Privacy Policy
                      </Text>
                    </Text>
                    <Text style={styles.checkboxSubtext}>
                      How we collect, use, and protect your information
                    </Text>
                  </View>
                </TouchableOpacity>

                {(!termsAccepted || !privacyAccepted) && (
                  <View style={styles.legalWarning}>
                    <Ionicons name="warning" size={16} color="#f59e0b" />
                    <Text style={styles.legalWarningText}>
                      You must accept both agreements to create an account
                    </Text>
                  </View>
                )}
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  dynamicStyles.registerButton,
                  (isLoading || !selectedCollege || !isEmailValid() || !termsAccepted || !privacyAccepted) &&
                    styles.disabledButton,
                ]}
                onPress={handleRegister}
                disabled={isLoading || !selectedCollege || !isEmailValid() || !termsAccepted || !privacyAccepted}
                activeOpacity={isLoading ? 1 : 0.8} // Prevent visual feedback when disabled
              >
                <LinearGradient
                  colors={[themeColors.primary, `${themeColors.primary}DD`]}
                  style={styles.registerButtonGradient}
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
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color={themeColors.primary}
                  />
                  <Text
                    style={[styles.loginText, { color: themeColors.primary }]}
                  >
                    Sign In Here
                  </Text>
                </TouchableOpacity>
              </Link>

              {/* Terms and Privacy */}
              <View style={styles.legalSection}>
                <View style={styles.legalTextContainer}>
                  <Text style={styles.termsText}>
                    By creating an account, you agree to our{" "}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/legal/terms")}
                    style={styles.legalLinkButton}
                  >
                    <Text
                      style={[styles.linkText, { color: themeColors.primary }]}
                    >
                      Terms of Service
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.termsText}> and </Text>
                  <TouchableOpacity
                    onPress={() => router.push("/legal/privacy")}
                    style={styles.legalLinkButton}
                  >
                    <Text
                      style={[styles.linkText, { color: themeColors.primary }]}
                    >
                      Privacy Policy
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* College Selection Modal */}
      <Modal
        visible={showCollegeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCollegeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} style={styles.modalBlur}>
            <View style={styles.collegeModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Your College</Text>
                <TouchableOpacity onPress={() => setShowCollegeModal(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {loadingColleges ? (
                <View style={styles.loadingContainer}>
                  <Text>Loading colleges...</Text>
                </View>
              ) : (
                <FlatList
                  data={colleges}
                  renderItem={({ item }) => <CollegeItem college={item} />}
                  keyExtractor={(item) => item.id}
                  style={styles.collegeList}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyStateText}>
                        No colleges available. Contact support to add your
                        college.
                      </Text>
                    </View>
                  }
                />
              )}

              <TouchableOpacity
                style={styles.addCollegeButton}
                onPress={() => {
                  setShowCollegeModal(false);
                  Alert.alert(
                    "Add Your College",
                    "Don't see your college? Contact support to have it added to our platform.",
                    [
                      { text: "OK", style: "default" },
                      {
                        text: "Contact Support",
                        onPress: () => {
                          // You can add navigation to support or email functionality here
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="add-outline" size={20} color="#6b7280" />
                <Text style={styles.addCollegeText}>
                  Don't see your college?
                </Text>
              </TouchableOpacity>
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
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  floatingElement1: {
    position: "absolute",
    top: height * 0.1,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  floatingElement2: {
    position: "absolute",
    top: height * 0.25,
    left: -40,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  heroSection: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  logoContainer: {
    alignItems: "center",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  featuresGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
    paddingHorizontal: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: "center",
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
  inputWrapperValid: {
    borderColor: "#10b981",
  },
  inputWrapperError: {
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
  validationText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  validText: {
    color: "#10b981",
  },
  errorText: {
    color: "#ef4444",
  },
  collegeSelectContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  selectedCollegeText: {
    fontSize: 16,
    color: "#333",
  },
  placeholderText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  registerButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  spinner: {
    marginLeft: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "white",
    borderTopColor: "transparent",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#6b7280",
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
  },
  loginText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  legalSection: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  legalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  legalHeaderText: {
    fontSize: 16,
    fontWeight: "700",
  },
  legalDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 20,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkboxText: {
    flex: 1,
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
    marginBottom: 2,
  },
  checkboxSubtext: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
  legalWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  legalWarningText: {
    fontSize: 12,
    color: "#92400e",
    flex: 1,
  },
  legalTextContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
  },
  termsText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },
  legalLinkButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  linkText: {
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalBlur: {
    flex: 1,
    justifyContent: "flex-end",
  },
  collegeModal: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: height * 0.7,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  collegeList: {
    paddingHorizontal: 20,
  },
  collegeItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  collegeInfo: {
    flex: 1,
  },
  collegeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  collegeShortName: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  collegeEmail: {
    fontSize: 12,
    color: "#9ca3af",
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  addCollegeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  addCollegeText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#6b7280",
  },
});
