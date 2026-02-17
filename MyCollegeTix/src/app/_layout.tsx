// app/_layout.tsx - Production-grade navigation with auth state handling
import { AuthProvider, useAuth } from "@/src/providers/AuthProvider";
import { NotificationProvider } from "@/src/providers/NotificationProvider";
import { ThemeProvider } from "@/src/providers/ThemeProvider";
import { ChatProvider } from "@/src/providers/ChatProvider";
import { PaymentProvider } from "@/src/providers/PaymentProvider";
import { PendingOrdersProvider } from "@/src/providers/PendingOrdersProvider";
import { AnalyticsProvider } from "@/src/providers/AnalyticsProvider";
import NotificationDeepLinkHandler from "@/src/components/NotificationDeepLinkHandler";
import { Stack, useRouter, useSegments } from "expo-router";
import { useColorScheme, KeyboardAvoidingView, Platform, AppState, AppStateStatus, View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { useEffect, useRef, useState, useCallback } from "react";
import * as Font from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ipTrackingService } from "@/src/services/ipTrackingService";

// Navigation timeout - prevents infinite loading states
const NAVIGATION_TIMEOUT_MS = 5000;
// Maximum time to show loading screen before forcing action
const LOADING_SCREEN_TIMEOUT_MS = 8000;

// Loading screen component with timeout failsafe
function LoadingScreen({ onTimeout }: { onTimeout: () => void }) {
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  useEffect(() => {
    const warningTimeout = setTimeout(() => {
      setShowTimeoutMessage(true);
    }, LOADING_SCREEN_TIMEOUT_MS / 2);

    const forceTimeout = setTimeout(() => {
      console.log("🚨 Loading screen timeout, forcing action...");
      onTimeout();
    }, LOADING_SCREEN_TIMEOUT_MS);

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(forceTimeout);
    };
  }, [onTimeout]);

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#18453b" />
      <Text style={styles.loadingText}>
        {showTimeoutMessage ? "Taking longer than usual..." : "Loading..."}
      </Text>
    </View>
  );
}

function RootLayoutNav() {
  const { session, isLoading, profile, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const appState = useRef(AppState.currentState);
  const [forceShowContent, setForceShowContent] = useState(false);

  // Track if we've already navigated to prevent duplicate redirects
  const hasNavigatedRef = useRef(false);
  const lastNavigationTimeRef = useRef(0);

  // Handle loading screen timeout
  const handleLoadingTimeout = useCallback(() => {
    console.log("⚠️ Loading timeout - showing content anyway");
    setForceShowContent(true);
    // If no session after timeout, go to login
    if (!session && !user) {
      router.replace("/(auth)/login" as any);
    }
  }, [session, user, router]);

  // Reset force show when auth state changes
  useEffect(() => {
    if (!isLoading) {
      setForceShowContent(false);
    }
  }, [isLoading]);

  // Debounce navigation to prevent rapid-fire redirects during auth transitions
  const navigateWithDebounce = (path: string) => {
    const now = Date.now();
    if (now - lastNavigationTimeRef.current < 500) {
      console.log("⏳ Navigation debounced, too soon after last navigation");
      return;
    }
    lastNavigationTimeRef.current = now;
    router.replace(path as any);
  };

  // Reset navigation flag when auth state changes significantly
  useEffect(() => {
    hasNavigatedRef.current = false;
  }, [!!session, !!user]);

  useEffect(() => {
    // Don't run navigation logic while auth is still initializing
    if (isLoading) {
      console.log("🔄 Auth still loading, waiting...");
      return;
    }

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

    const isInValidGroup = inAuthGroup || inTabsGroup || inAdminGroup || inLegalGroup ||
                          inNotificationsGroup || inSupportGroup || inTicketDetailsGroup ||
                          inCheckoutGroup || inStripeGroup || inOrdersGroup || inDisputeGroup;

    console.log("🧭 Navigation check:", {
      session: !!session,
      user: !!user,
      profile: !!profile,
      segment: segments[0] || "root",
      inAuthGroup,
      isInValidGroup
    });

    // CASE 1: No session and no user - must go to login (unless legal pages)
    if (!session && !user) {
      if (!inAuthGroup && !inLegalGroup) {
        console.log("🔐 No auth, redirecting to login...");
        navigateWithDebounce("/(auth)/login");
      }
      return;
    }

    // CASE 2: Session exists - user is authenticated
    if (session && user) {
      // Redirect from auth pages to tabs
      if (inAuthGroup) {
        console.log("✅ Authenticated, leaving auth pages...");
        navigateWithDebounce("/(tabs)");
        return;
      }

      // Redirect from invalid routes to tabs
      if (!isInValidGroup) {
        console.log("✅ Authenticated, going to tabs from unknown route...");
        navigateWithDebounce("/(tabs)");
        return;
      }

      // Redirect non-admins from admin pages
      if (inAdminGroup && profile && !profile.is_admin) {
        console.log("🚫 Non-admin in admin area, redirecting...");
        navigateWithDebounce("/(tabs)");
        return;
      }

      // User is authenticated and in valid location
      console.log("✅ Navigation check passed");
      return;
    }

    // CASE 3: Inconsistent state (session without user or vice versa)
    // This is the "auth limbo" - wait briefly then force to login
    console.log("⚠️ Inconsistent auth state detected, waiting for resolution...");

    const recoveryTimeout = setTimeout(() => {
      // Re-check state
      if (!session || !user) {
        console.log("🚨 Auth state not recovered, forcing to login...");
        if (!inAuthGroup && !inLegalGroup) {
          navigateWithDebounce("/(auth)/login");
        }
      }
    }, NAVIGATION_TIMEOUT_MS);

    return () => clearTimeout(recoveryTimeout);

  }, [session, user, segments, isLoading, profile]);

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

  // Show loading screen during initial auth, unless timeout forces content
  if (isLoading && !forceShowContent) {
    return <LoadingScreen onTimeout={handleLoadingTimeout} />;
  }

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
        <AnalyticsProvider>
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
        </AnalyticsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
