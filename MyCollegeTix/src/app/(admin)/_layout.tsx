// src/app/(admin)/_layout.tsx - Updated with Orders route
import React from "react";
import { Stack } from "expo-router";
import { useAuth } from "@/src/providers/AuthProvider";
import { View, Text, StyleSheet } from "react-native";

export default function AdminLayout() {
  const { user, profile, isLoading } = useAuth();

  // Check if user is admin using the profile data
  const isAdmin = profile?.is_admin === true;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If user is not authenticated OR not admin, return null
  // (Let root layout handle the redirect)
  if (!user || !isAdmin) {
    return null;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="users" options={{ headerShown: false }} />
      <Stack.Screen name="tickets" options={{ headerShown: false }} />
      <Stack.Screen name="events" options={{ headerShown: false }} />
      <Stack.Screen name="colleges" options={{ headerShown: false }} />
      <Stack.Screen name="orders" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
