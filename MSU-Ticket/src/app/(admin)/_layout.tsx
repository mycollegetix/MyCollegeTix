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
      <Stack.Screen name="index" options={{ title: "Admin Dashboard" }} />
      <Stack.Screen name="users" options={{ title: "User Management" }} />
      <Stack.Screen name="tickets" options={{ title: "Ticket Management" }} />
      <Stack.Screen name="events" options={{ title: "Event Management" }} />
      <Stack.Screen name="colleges" options={{ title: "College Management" }} />
      <Stack.Screen name="orders" options={{ title: "Order Management" }} />
      <Stack.Screen name="analytics" options={{ title: "Analytics" }} />
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
