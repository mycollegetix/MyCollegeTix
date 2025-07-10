// app/_layout.tsx - Updated to include ChatProvider
import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { NotificationProvider } from "@/src/providers/NotificationProvider";
import { ChatProvider } from "@/src/providers/ChatProvider";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "react-native";
import { useEffect } from "react";

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (session && inAuthGroup) {
      router.replace("/");
    } else if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [session, segments, isLoading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="ticket-details" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <NotificationProvider>
        <ChatProvider>
          <RootLayoutNav />
        </ChatProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
