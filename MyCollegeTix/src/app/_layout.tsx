// app/_layout.tsx - Fixed to prevent infinite loops and loading issues
import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { NotificationProvider } from "@/src/providers/NotificationProvider";
import { ThemeProvider } from "@/src/providers/ThemeProvider";
import { ChatProvider } from "@/src/providers/ChatProvider";
import { PaymentProvider } from "@/src/providers/PaymentProvider";
import { PendingOrdersProvider } from "@/src/providers/PendingOrdersProvider";
import NotificationDeepLinkHandler from "@/src/components/NotificationDeepLinkHandler";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme, KeyboardAvoidingView, Platform, AppState, AppStateStatus } from "react-native";
import { useEffect, useRef } from "react";
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ipTrackingService } from "@/src/services/ipTrackingService";

function RootLayoutNav() {
  const { session, isLoading, profile, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (isLoading) {
      console.log("🔄 Auth still loading, waiting...");
      return;
    }

    // Add timeout to prevent infinite loading on Android
    const timeoutId = setTimeout(() => {
      if (session && !profile) {
        console.log("⚠️ Session exists but profile still loading after timeout, forcing navigation...");
        router.replace("/(tabs)" as any);
      }
    }, 3000); // 3 second timeout

    const inAuthGroup = segments[0] === "(auth)";
    const inAdminGroup = segments[0] === "(admin)";
    const inTabsGroup = segments[0] === "(tabs)";
    const inLegalGroup = segments[0] === "legal";
    const inNotificationsGroup = segments[0] === "notifications";
    const inSupportGroup = segments[0] === "support";
    const inTicketDetailsGroup = segments[0] === "ticket-details";
    const inCheckoutGroup = segments[0] === "checkout";
    const inStripeGroup = segments[0] === "stripe";
    const inOrdersGroup = segments[0] === "orders";
    const inDisputeGroup = segments[0] === "dispute";

    console.log("🧭 Navigation check:", {
      session: !!session,
      inAuthGroup,
      inAdminGroup,
      inTabsGroup,
      inLegalGroup,
      inNotificationsGroup,
      inSupportGroup,
      inTicketDetailsGroup,
      inCheckoutGroup,
      inStripeGroup,
      inOrdersGroup,
      inDisputeGroup,
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

    // If user has session but is not in a recognized route group, redirect them to tabs
    const isInValidGroup = inAuthGroup || inTabsGroup || inAdminGroup || inLegalGroup ||
                          inNotificationsGroup || inSupportGroup || inTicketDetailsGroup ||
                          inCheckoutGroup || inStripeGroup || inOrdersGroup || inDisputeGroup;
    
    if (session && !isInValidGroup) {
      console.log("✅ Authenticated user not in valid route group, redirecting to tabs...");
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

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [session, segments, isLoading, router, profile]);

  // AppState listener for IP tracking on app resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        user?.id
      ) {
        console.log('📱 App has come to the foreground - attempting IP tracking');
        
        // Track IP on app resume with smart throttling
        ipTrackingService.trackOnAppResume(user.id).then((result) => {
          if (result.success) {
            console.log('🌐 App resume IP tracking successful:', result.ip, result.reason);
          } else {
            console.log('⏰ App resume IP tracking skipped:', result.reason);
          }
        }).catch((error) => {
          console.log('❌ App resume IP tracking error:', error);
        });
      }

      appState.current = nextAppState;
    };

    // Add the app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [user?.id]);

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
        <Stack.Screen 
          name="notifications" 
          options={{ 
            headerShown: false,
            presentation: 'modal', // Add modal presentation for better Android support
            gestureEnabled: true,
            gestureDirection: 'vertical'
          }} 
        />
        <Stack.Screen name="support" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="stripe" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="dispute" options={{ headerShown: false }} />
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
        <PaymentProvider>
          <PendingOrdersProvider>
            <NotificationProvider>
              <ChatProvider>
                <ThemeProvider>
                  <RootLayoutNav />
                </ThemeProvider>
              </ChatProvider>
            </NotificationProvider>
          </PendingOrdersProvider>
        </PaymentProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
