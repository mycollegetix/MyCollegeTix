// app/_layout.tsx - Fixed to prevent infinite loops and loading issues
import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { NotificationProvider } from "@/src/providers/NotificationProvider";
import { ThemeProvider } from "@/src/providers/ThemeProvider";
import { ChatProvider } from "@/src/providers/ChatProvider";
import NotificationDeepLinkHandler from "@/src/components/NotificationDeepLinkHandler";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme, KeyboardAvoidingView, Platform } from "react-native";
import { useEffect } from "react";
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';

function RootLayoutNav() {
  const { session, isLoading, profile } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) {
      console.log("🔄 Auth still loading, waiting...");
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";
    const inAdminGroup = segments[0] === "(admin)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inLegalGroup = segments[0] === "legal";

    console.log("🧭 Navigation check:", {
      session: !!session,
      inAuthGroup,
      inAdminGroup,
      inTabsGroup,
      inLegalGroup,
      segments: segments.join('/'),
      profileLoaded: !!profile
    });

    // If user is in admin group but not an admin, redirect them out
    if (inAdminGroup && session && profile && !profile.is_admin) {
      console.log("🚫 Non-admin trying to access admin area, redirecting...");
      router.replace("/(tabs)" as any);
      return;
    }

    // Handle normal authentication flow
    if (session && inAuthGroup) {
      console.log("✅ Authenticated user in auth pages, redirecting to tabs...");
      router.replace("/(tabs)" as any);
      return;
    }

    // Allow access to legal pages without authentication
    if (!session && !inAuthGroup && !inLegalGroup) {
      console.log("🔐 Unauthenticated user accessing protected area, redirecting to login...");
      router.replace("/(auth)/login" as any);
      return;
    }

    console.log("✅ Navigation check passed, staying in current location");
  }, [session, segments, isLoading, router, profile]);

  return (
    <>
      <NotificationDeepLinkHandler />
      <Stack screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        gestureDirection: 'horizontal'
      }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(admin)" options={{ headerShown: false }} />
        <Stack.Screen name="legal" options={{ headerShown: false }} />
        <Stack.Screen name="ticket-details" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="support" options={{ headerShown: false }} />
      </Stack>
    </>
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
    <SafeAreaProvider>
      <AuthProvider>
        <NotificationProvider>
          <ChatProvider>
            <ThemeProvider>
              <RootLayoutNav />
            </ThemeProvider>
          </ChatProvider>
        </NotificationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
