// src/app/stripe/refresh.tsx
// Deep link handler when Stripe onboarding link expires or user returns early
import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/providers/ThemeProvider";

export default function StripeRefreshScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Ionicons name="refresh" size={48} color="white" />
        </View>
        <Text style={styles.title}>Link Expired</Text>
        <Text style={styles.description}>
          Your onboarding link has expired or the session was interrupted.
          Please try again to continue setting up your payment account.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/stripe/onboarding" as any)}
        >
          <Ionicons name="arrow-forward" size={20} color={theme.primary} />
          <Text style={[styles.buttonText, { color: theme.primary }]}>
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "white",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
