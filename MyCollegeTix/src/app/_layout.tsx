// app/_layout.tsx - Fixed to prevent infinite loops and loading issues
import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { NotificationProvider } from "@/src/providers/NotificationProvider";
import { ThemeProvider } from "@/src/providers/ThemeProvider";
import { ChatProvider } from "@/src/providers/ChatProvider";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "react-native";
import { useEffect } from "react";
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';

function RootLayoutNav() {
  const { session, isLoading, profile } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inAdminGroup = segments[0] === "(admin)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inLegalGroup = segments[0] === "legal";

    // If user is in admin group but not an admin, redirect them out
    if (inAdminGroup && session && profile && !profile.is_admin) {
      router.replace("/(tabs)" as any);
      return;
    }

    // Handle normal authentication flow
    if (session && inAuthGroup) {
      router.replace("/(tabs)" as any);
      return;
    }

    // Allow access to legal pages without authentication
    if (!session && !inAuthGroup && !inLegalGroup) {
      router.replace("/(auth)/login" as any);
      return;
    }
  }, [session, segments, isLoading, router, profile]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(admin)" options={{ headerShown: false }} />
      <Stack.Screen name="legal" options={{ headerShown: false }} />
      <Stack.Screen name="ticket-details" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    Font.loadAsync({
      ...Ionicons.font,
    });
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
