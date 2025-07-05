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
} from "react-native";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

const sports = [
  { name: "Football", icon: "american-football-outline" },
  { name: "Basketball", icon: "basketball-outline" },
  { name: "Hockey", icon: "golf-outline" },
  { name: "Soccer", icon: "football-outline" },
  { name: "Volleyball", icon: "tennisball-outline" },
];

export default function SellScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [formData, setFormData] = useState({
    sport: "",
    event: "",
    date: "",
    time: "",
    section: "",
    row: "",
    seat: "",
    price: "",
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);
    // We'll implement this with Supabase later
    console.log("Form submitted:", formData);
    setTimeout(() => setIsLoading(false), 2000); // Simulate API call
  };

  const isFormValid = () => {
    return Object.values(formData).every((value) => value.trim() !== "");
  };

  const SportCard = ({ sport, icon }: { sport: string; icon: string }) => (
    <TouchableOpacity
      style={[
        styles.sportCard,
        formData.sport === sport && styles.sportCardSelected,
      ]}
      onPress={() => setFormData({ ...formData, sport })}
    >
      <View
        style={[
          styles.sportIconContainer,
          formData.sport === sport && styles.sportIconSelected,
        ]}
      >
        <Ionicons
          name={icon as any}
          size={24}
          color={formData.sport === sport ? "#ffd700" : "#18453b"}
        />
      </View>
      <Text
        style={[
          styles.sportText,
          formData.sport === sport && styles.sportTextSelected,
        ]}
      >
        {sport}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#18453b", "#2a6b5a", "#0f2f28"]}
        style={styles.background}
      />

      {/* Floating elements */}
      <View style={styles.floatingElement1} />
      <View style={styles.floatingElement2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardContainer}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["#ffd700", "#ffed4a"]}
                style={styles.logo}
              >
                <Ionicons name="ticket-outline" size={32} color="#18453b" />
              </LinearGradient>
            </View>
            <Text style={styles.headerTitle}>Sell Your Ticket</Text>
            <Text style={styles.headerSubtitle}>
              List your MSU tickets securely and reach thousands of Spartans
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            {/* Sport Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Sport</Text>
              <Text style={styles.sectionSubtitle}>
                Choose the sport for your ticket
              </Text>

              <View style={styles.sportsGrid}>
                {sports.map((sport) => (
                  <SportCard
                    key={sport.name}
                    sport={sport.name}
                    icon={sport.icon}
                  />
                ))}
              </View>
            </View>

            {/* Event Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Event Details</Text>
              <Text style={styles.sectionSubtitle}>
                Provide information about the event
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Event Name</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#9ca3af"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., MSU vs Michigan"
                    value={formData.event}
                    onChangeText={(event) =>
                      setFormData({ ...formData, event })
                    }
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Date</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="MM/DD/YYYY"
                      value={formData.date}
                      onChangeText={(date) =>
                        setFormData({ ...formData, date })
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Time</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="time-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="HH:MM AM/PM"
                      value={formData.time}
                      onChangeText={(time) =>
                        setFormData({ ...formData, time })
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Seat Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Seat Information</Text>
              <Text style={styles.sectionSubtitle}>
                Specify your seat location
              </Text>

              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.thirdWidth]}>
                  <Text style={styles.inputLabel}>Section</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#9ca3af"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="Section"
                      value={formData.section}
                      onChangeText={(section) =>
                        setFormData({ ...formData, section })
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.thirdWidth]}>
                  <Text style={styles.inputLabel}>Row</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { paddingLeft: 16 }]}
                      placeholder="Row"
                      value={formData.row}
                      onChangeText={(row) => setFormData({ ...formData, row })}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.thirdWidth]}>
                  <Text style={styles.inputLabel}>Seat</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={[styles.input, { paddingLeft: 16 }]}
                      placeholder="Seat"
                      value={formData.seat}
                      onChangeText={(seat) =>
                        setFormData({ ...formData, seat })
                      }
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* Price */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Set Your Price</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your asking price
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Price</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.dollarContainer}>
                    <Text style={styles.dollarSign}>$</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { paddingLeft: 8 }]}
                    placeholder="0.00"
                    value={formData.price}
                    onChangeText={(price) =>
                      setFormData({ ...formData, price })
                    }
                    keyboardType="decimal-pad"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid() && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || isLoading}
            >
              <LinearGradient
                colors={
                  isFormValid()
                    ? ["#18453b", "#2a6b5a"]
                    : ["#9ca3af", "#6b7280"]
                }
                style={styles.buttonGradient}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.buttonText}>Listing Ticket...</Text>
                    <View style={styles.spinner} />
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.buttonText}>LIST MY TICKET</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Info Box */}
            <BlurView intensity={20} style={styles.infoBox}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#18453b"
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Secure & Protected</Text>
                <Text style={styles.infoText}>
                  Your ticket listing is protected by our secure platform with
                  verified buyers only.
                </Text>
              </View>
            </BlurView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 50,
  },
  headerSection: {
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
  headerTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  formSection: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#18453b",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
  },
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  sportCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    minWidth: 100,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  sportCardSelected: {
    backgroundColor: "#18453b",
    borderColor: "#ffd700",
  },
  sportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f9ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  sportIconSelected: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
  },
  sportText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
  },
  sportTextSelected: {
    color: "white",
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
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  thirdWidth: {
    flex: 1,
  },
  dollarContainer: {
    marginRight: 8,
  },
  dollarSign: {
    fontSize: 18,
    fontWeight: "600",
    color: "#18453b",
  },
  submitButton: {
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: "#18453b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(24, 69, 59, 0.2)",
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#18453b",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 16,
  },
});
