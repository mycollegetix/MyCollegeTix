import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme } from "react-native";
import { useEffect } from "react";

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    console.log("🔍 Auth state:", {
      isLoading,
      hasSession: !!session,
      segments,
      firstSegment: segments[0],
    });

    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    console.log("📍 Navigation logic:", {
      hasSession: !!session,
      inAuthGroup,
      shouldRedirectToTabs: session && inAuthGroup,
      shouldRedirectToLogin: !session && !inAuthGroup,
    });

    if (session && inAuthGroup) {
      console.log("🔄 Redirecting to tabs");
      router.replace("/");
    } else if (!session && !inAuthGroup) {
      console.log("🔄 Redirecting to login");
      router.replace("/(auth)/login");
    }
  }, [session, segments, isLoading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
