// screens/HelpAndSupportScreen.tsx - With theme support
import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  View,
  Text,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useTheme } from "@/src/providers/ThemeProvider";
import { supabase } from "@/src/lib/supabase";
import Constants from "expo-constants";

const { width, height } = Dimensions.get("window");

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface ContactMethod {
  id: string;
  title: string;
  description: string;
  icon: string;
  action: () => void;
  color: string;
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "What is MyCollegeTix?",
    answer:
      "MyCollegeTix is an exclusive college ticket marketplace that connects students within their college communities. We provide a platform for students to buy and sell tickets for sporting events like football, basketball, and hockey with a simple, clean interface built specifically for students.",
    category: "general",
  },
  {
    id: "2",
    question: "How do I verify my college email?",
    answer:
      "You must sign up with a valid .edu email address from your college. Only supported college emails are permitted. We verify your student status through this email to ensure our platform remains exclusively for college students.",
    category: "account",
  },
  {
    id: "3",
    question: "How does the platform work?",
    answer:
      "After verifying your college email, you can list tickets for sporting events or browse available tickets from fellow students. Use our built-in messaging system to communicate with other students and coordinate meetups. All payment and transfer details are handled directly between students.",
    category: "general",
  },
  {
    id: "4",
    question: "How do I sell my tickets?",
    answer:
      "Go to the 'Sell' tab and list your tickets with event details, date, seat information, and price. Your listing will be visible to other verified students from your college. You can even post last-minute ticket listings. Use the messaging system to coordinate with interested buyers.",
    category: "selling",
  },
  {
    id: "5",
    question: "Are there any fees?",
    answer:
      "MyCollegeTix acts as a connection service - we facilitate the platform for students to find each other, but we're not involved in the actual transactions. Students handle all payment and transfer details independently between themselves.",
    category: "general",
  },
  {
    id: "6",
    question: "How do I communicate with other students?",
    answer:
      "We provide an instant messaging system within the app for coordination between buyers and sellers. This allows you to discuss details, arrange meetup locations, and coordinate payment directly with fellow students from your college.",
    category: "buying",
  },
  {
    id: "7",
    question: "What types of events can I find tickets for?",
    answer:
      "MyCollegeTix supports tickets for various college sports events including football, basketball, hockey, and other sporting events. You can find both advance listings and last-minute ticket postings from fellow students.",
    category: "general",
  },
  {
    id: "8",
    question: "How do I arrange payment and ticket transfer?",
    answer:
      "Payment and ticket transfer are arranged directly between students. Use our messaging system to coordinate meetup details, payment method, and ticket exchange. MyCollegeTix provides the platform for connection but doesn't handle the transaction itself.",
    category: "buying",
  },
  {
    id: "9",
    question: "Is MyCollegeTix available on mobile and web?",
    answer:
      "Yes! MyCollegeTix is available as both a mobile app and web platform. Download our mobile app for the best experience, or access the platform through our website at mycollegetix.com.",
    category: "general",
  },
  {
    id: "10",
    question: "Can I browse real-time ticket listings?",
    answer:
      "Absolutely! Our platform provides real-time ticket listings from students in your college community. You can see the latest available tickets and even last-minute postings as they become available.",
    category: "buying",
  },
];

const categories = [
  { id: "all", name: "All", icon: "grid-outline" },
  { id: "buying", name: "Buying", icon: "bag-outline" },
  { id: "selling", name: "Selling", icon: "storefront-outline" },
  { id: "account", name: "Account", icon: "person-outline" },
  { id: "general", name: "General", icon: "help-circle-outline" },
];

export default function HelpAndSupportScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: "",
    priority: "medium",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactMethods: ContactMethod[] = [
    {
      id: "form",
      title: "Contact Form",
      description: "Detailed support request",
      icon: "document-text-outline",
      color: "#8b5cf6",
      action: () => setShowContactForm(true),
    },
  ];

  const filteredFAQs = faqData.filter((faq) => {
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    const matchesSearch =
      searchQuery === "" ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSubmitContactForm = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      Alert.alert("Error", "Please fill in both subject and message fields.");
      return;
    }

    setIsSubmitting(true);

    const appVersion = Constants.expoConfig?.version || "1.1.0";
    const buildNumber =
      Constants.expoConfig?.ios?.buildNumber ||
      Constants.expoConfig?.android?.versionCode?.toString() ||
      "10";
    const platform = Platform.OS === "ios" ? "iOS" : "Android";

    try {
      const { error } = await supabase.functions.invoke("submit-support-request", {
        body: {
          subject: contactForm.subject.trim(),
          message: contactForm.message.trim(),
          priority: contactForm.priority,
          appVersion,
          buildNumber,
          platform,
        },
      });

      if (error) {
        throw error;
      }

      setShowContactForm(false);
      setContactForm({ subject: "", message: "", priority: "medium" });
      Alert.alert(
        "Message Sent",
        "Your support request has been sent. We'll get back to you as soon as possible."
      );
    } catch (error) {
      console.error("Support request error:", error);
      Alert.alert("Error", "Failed to send your message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const CategoryPill = ({ category }: { category: (typeof categories)[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryPill,
        selectedCategory === category.id && [
          styles.activeCategoryPill,
          { backgroundColor: theme.primary },
        ],
      ]}
      onPress={() => setSelectedCategory(category.id)}
    >
      <Ionicons
        name={category.icon as any}
        size={16}
        color={selectedCategory === category.id ? "white" : theme.primary}
      />
      <Text
        style={[
          styles.categoryPillText,
          { color: theme.primary },
          selectedCategory === category.id && styles.activeCategoryPillText,
        ]}
      >
        {category.name}
      </Text>
    </TouchableOpacity>
  );

  const FAQItem = ({ item }: { item: FAQItem }) => {
    const isExpanded = expandedFAQ === item.id;

    return (
      <View style={styles.faqItem}>
        <TouchableOpacity
          style={styles.faqQuestion}
          onPress={() => setExpandedFAQ(isExpanded ? null : item.id)}
        >
          <Text style={styles.faqQuestionText}>{item.question}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.primary}
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.faqAnswer}>
            <Text style={styles.faqAnswerText}>{item.answer}</Text>
          </View>
        )}
      </View>
    );
  };

  const ContactMethodCard = ({ method }: { method: ContactMethod }) => (
    <TouchableOpacity style={styles.contactCard} onPress={method.action}>
      <LinearGradient
        colors={[method.color, `${method.color}dd`]}
        style={styles.contactIconContainer}
      >
        <Ionicons name={method.icon as any} size={24} color="white" />
      </LinearGradient>
      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{method.title}</Text>
        <Text style={styles.contactDescription}>{method.description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

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
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[theme.secondary, `${theme.secondary}DD`]}
            style={styles.logo}
          >
            <Ionicons
              name="help-circle-outline"
              size={32}
              color={theme.primary}
            />
          </LinearGradient>
        </View>
        <Text style={styles.heroTitle}>How can we help you?</Text>
        <Text style={styles.heroSubtitle}>
          Find answers to common questions or contact our support team
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          style={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Contact Methods */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Get Help Now
            </Text>
            <Text style={styles.sectionSubtitle}>
              Choose the best way to reach our support team
            </Text>

            <View style={styles.contactGrid}>
              {contactMethods.map((method) => (
                <ContactMethodCard key={method.id} method={method} />
              ))}
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Frequently Asked Questions
            </Text>
            <Text style={styles.sectionSubtitle}>
              Find quick answers to common questions
            </Text>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <View style={styles.searchWrapper}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color="#9ca3af"
                  style={styles.searchIcon}
                />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search FAQs..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#9ca3af"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearchQuery("")}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoriesContainer}
            >
              {categories.map((category) => (
                <CategoryPill key={category.id} category={category} />
              ))}
            </ScrollView>

            {/* FAQ List */}
            <View style={styles.faqContainer}>
              {filteredFAQs.length > 0 ? (
                filteredFAQs.map((faq) => <FAQItem key={faq.id} item={faq} />)
              ) : (
                <BlurView intensity={20} style={styles.emptyState}>
                  <Ionicons name="search-outline" size={48} color="#6b7280" />
                  <Text style={styles.emptyStateTitle}>No FAQs found</Text>
                  <Text style={styles.emptyStateText}>
                    Try adjusting your search or category filter
                  </Text>
                </BlurView>
              )}
            </View>
          </View>

          {/* Additional Resources */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>
              Additional Resources
            </Text>

            <TouchableOpacity
              style={styles.websiteCard}
              onPress={() => Linking.openURL("https://mycollegetix.com")}
            >
              <View style={[styles.websiteIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons
                  name="globe-outline"
                  size={32}
                  color={theme.primary}
                />
              </View>
              <View style={styles.websiteInfo}>
                <Text style={[styles.websiteTitle, { color: theme.primary }]}>Visit MyCollegeTix.com</Text>
                <Text style={styles.websiteDescription}>
                  Access the full website for additional resources, detailed policies, and more information about our platform.
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Contact Form Modal */}
      {showContactForm && (
        <View style={styles.modalOverlay}>
          <BlurView intensity={50} style={styles.modalBlur}>
            <View style={styles.contactFormModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Contact Support</Text>
                <TouchableOpacity onPress={() => setShowContactForm(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.primary }]}>
                  Subject *
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Brief description of your issue"
                  value={contactForm.subject}
                  onChangeText={(subject) =>
                    setContactForm({ ...contactForm, subject })
                  }
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.primary }]}>
                  Priority
                </Text>
                <View style={styles.prioritySelector}>
                  {["low", "medium", "high"].map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityOption,
                        contactForm.priority === priority && [
                          styles.activePriorityOption,
                          { backgroundColor: theme.primary },
                        ],
                      ]}
                      onPress={() =>
                        setContactForm({ ...contactForm, priority })
                      }
                    >
                      <Text
                        style={[
                          styles.priorityText,
                          contactForm.priority === priority &&
                            styles.activePriorityText,
                        ]}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: theme.primary }]}>
                  Message *
                </Text>
                <TextInput
                  style={[styles.formInput, styles.messageInput]}
                  placeholder="Please describe your issue in detail..."
                  value={contactForm.message}
                  onChangeText={(message) =>
                    setContactForm({ ...contactForm, message })
                  }
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  maxLength={500}
                />
                <Text style={styles.charCount}>
                  {500 - contactForm.message.length} characters remaining
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submittingButton,
                ]}
                onPress={handleSubmitContactForm}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={
                    isSubmitting
                      ? ["#9ca3af", "#6b7280"]
                      : [theme.primary, theme.secondary]
                  }
                  style={styles.submitButtonGradient}
                >
                  {isSubmitting ? (
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  ) : (
                    <>
                      <Ionicons name="send" size={20} color="white" />
                      <Text style={styles.submitButtonText}>Send Message</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      )}
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
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  keyboardContainer: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  contactGrid: {
    gap: 12,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 2,
  },
  contactDescription: {
    fontSize: 14,
    color: "#6b7280",
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
  },
  clearButton: {
    padding: 4,
  },
  categoriesContainer: {
    marginBottom: 20,
  },
  categoryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "white",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginRight: 8,
    gap: 6,
  },
  activeCategoryPill: {
    borderColor: "transparent",
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: "600",
  },
  activeCategoryPillText: {
    color: "white",
  },
  faqContainer: {
    gap: 12,
  },
  faqItem: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    padding: 20,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  faqAnswerText: {
    fontSize: 15,
    color: "#4b5563",
    lineHeight: 22,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  websiteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  websiteIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  websiteInfo: {
    flex: 1,
  },
  websiteTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  websiteDescription: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  contactFormModal: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1e293b",
  },
  messageInput: {
    height: 120,
    textAlignVertical: "top",
  },
  prioritySelector: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  activePriorityOption: {
    borderColor: "transparent",
  },
  priorityText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  activePriorityText: {
    color: "white",
  },
  submitButton: {
    borderRadius: 12,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submittingButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  charCount: {
    textAlign: "right",
    color: "#6b7280",
    fontSize: 12,
    marginTop: 4,
  },
});
