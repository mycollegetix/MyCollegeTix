// src/app/(tabs)/chat.tsx
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

export default function ChatTabScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main chat screen
    (router.replace as any)("/chat");
  }, []);

  // Show loading while redirecting
  return (
    <View style={styles.container}>
      <Text style={styles.loadingText}>Loading chats...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
    fontStyle: "italic",
  },
});
