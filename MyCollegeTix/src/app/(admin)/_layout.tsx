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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="users" />
      <Stack.Screen name="tickets" />
      <Stack.Screen name="events" />
      <Stack.Screen name="colleges" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="analytics" />
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
