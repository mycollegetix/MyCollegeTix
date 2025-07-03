import React, { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Text, View } from "@/src/components/Themed";
import Colors from "@/src/constants/Colors";
import { useColorScheme } from "@/src/components/useColorScheme";
import FontAwesome from "@expo/vector-icons/FontAwesome";

const sports = ["Football", "Basketball", "Hockey", "Soccer", "Volleyball"];

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

  const handleSubmit = () => {
    // We'll implement this with Supabase later
    console.log("Form submitted:", formData);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Sell Your Ticket</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Sport</Text>
        <View style={styles.sportsGrid}>
          {sports.map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[
                styles.sportButton,
                formData.sport === sport && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setFormData({ ...formData, sport })}
            >
              <Text
                style={[
                  styles.sportButtonText,
                  formData.sport === sport && { color: "#fff" },
                ]}
              >
                {sport}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Details</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.card }]}
          placeholder="Event Name (e.g., MSU vs Michigan)"
          value={formData.event}
          onChangeText={(event) => setFormData({ ...formData, event })}
          placeholderTextColor="#999"
        />
        <View style={styles.row}>
          <TextInput
            style={[
              styles.input,
              styles.halfInput,
              { backgroundColor: colors.card },
            ]}
            placeholder="Date (MM/DD/YYYY)"
            value={formData.date}
            onChangeText={(date) => setFormData({ ...formData, date })}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[
              styles.input,
              styles.halfInput,
              { backgroundColor: colors.card },
            ]}
            placeholder="Time (HH:MM AM/PM)"
            value={formData.time}
            onChangeText={(time) => setFormData({ ...formData, time })}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Seat Information</Text>
        <View style={styles.row}>
          <TextInput
            style={[
              styles.input,
              styles.thirdInput,
              { backgroundColor: colors.card },
            ]}
            placeholder="Section"
            value={formData.section}
            onChangeText={(section) => setFormData({ ...formData, section })}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[
              styles.input,
              styles.thirdInput,
              { backgroundColor: colors.card },
            ]}
            placeholder="Row"
            value={formData.row}
            onChangeText={(row) => setFormData({ ...formData, row })}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[
              styles.input,
              styles.thirdInput,
              { backgroundColor: colors.card },
            ]}
            placeholder="Seat"
            value={formData.seat}
            onChangeText={(seat) => setFormData({ ...formData, seat })}
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price</Text>
        <View style={styles.priceInput}>
          <Text style={styles.dollarSign}>$</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, flex: 1 }]}
            placeholder="0.00"
            value={formData.price}
            onChangeText={(price) => setFormData({ ...formData, price })}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, { backgroundColor: colors.primary }]}
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>List Ticket</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  sportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  sportButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    margin: 6,
  },
  sportButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  thirdInput: {
    width: "31%",
  },
  priceInput: {
    flexDirection: "row",
    alignItems: "center",
  },
  dollarSign: {
    fontSize: 20,
    marginRight: 8,
  },
  submitButton: {
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
