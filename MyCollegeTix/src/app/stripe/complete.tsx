// src/app/stripe/complete.tsx
// Deep link handler for successful Stripe Connect onboarding
import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useStripeConnect } from "@/src/hooks/useStripeConnect";
import { analyticsService } from "@/src/services/analyticsService";

export default function StripeCompleteScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { fetchAccountStatus, canReceivePayments } = useStripeConnect();

  useEffect(() => {
    const handleComplete = async () => {
      analyticsService.logStripeOnboardingCompleted();
      // Refresh status
      await fetchAccountStatus();

      // Wait a moment for state to update
      setTimeout(() => {
        // Navigate based on status
        if (canReceivePayments()) {
          router.replace("/(tabs)/sell" as any);
        } else {
          router.replace("/stripe/onboarding" as any);
        }
      }, 2000);
    };

    handleComplete();
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primary, `${theme.primary}CC`, `${theme.primary}99`]}
        style={styles.background}
      />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <Ionicons name="checkmark-done" size={48} color="white" />
        </View>
        <Text style={styles.title}>Processing...</Text>
        <Text style={styles.description}>
          Verifying your payment setup
        </Text>
        <ActivityIndicator size="large" color="white" style={styles.loader} />
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
  },
  loader: {
    marginTop: 32,
  },
});
