// src/providers/AuthProvider.tsx - Production-grade auth with proper lifecycle handling
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { AppState, AppStateStatus, View } from "react-native";
import { supabase } from "@/src/lib/supabase";

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const SESSION_CHECK_INTERVAL_MS = 60 * 1000; // Check every minute
const BACKGROUND_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes in background
const PROFILE_LOAD_TIMEOUT_MS = 10 * 1000; // 10 second profile load timeout
const AUTH_RECOVERY_TIMEOUT_MS = 5 * 1000; // 5 second recovery timeout before force logout

import { Tables } from "@/src/types/database.types";

// College type from database
type College = Tables<"colleges">;
import { AccountService } from "@/src/services/accountService";
import { ipTrackingService } from "@/src/services/ipTrackingService";
import { googleAuthService } from "@/src/services/googleAuthService";
import { microsoftAuthService } from "@/src/services/microsoftAuthService";
import { TermsAcceptanceModal } from "@/src/components/TermsAcceptanceModal";

// Interface definitions
export interface UserProfile {
  id: string;
  created_at: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  is_admin: boolean;
  college_id: string | null;
  accepted_terms: boolean;
  accepted_terms_at: string | null;
}

export interface ProfileWithCollege extends UserProfile {
  college: College | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileWithCollege | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: (termsAccepted?: boolean) => Promise<{ error: any }>;
  signInWithMicrosoft: (termsAccepted?: boolean) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name: string,
    collegeId?: string
  ) => Promise<{ error: any; data?: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<{ success: boolean; error?: any }>;
  resetActivityTimer: () => void; // Call this on user interactions to prevent session timeout
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithCollege | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Auth lifecycle states to prevent race conditions
  const [isResuming, setIsResuming] = useState(false); // Blocks operations during app resume
  const [isSigningOut, setIsSigningOut] = useState(false); // Prevents concurrent signouts

  // Session timeout tracking
  const lastActivityRef = useRef<number>(Date.now());
  const backgroundTimeRef = useRef<number | null>(null);
  const sessionCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const profileAbortControllerRef = useRef<AbortController | null>(null);
  const authRecoveryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset activity timer (call this on user interactions)
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  // Check if session should timeout due to inactivity
  const checkSessionTimeout = useCallback(async () => {
    if (!session || !user || isSigningOut || isResuming) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
      console.log("⏰ Session timeout due to inactivity, signing out...");
      await signOutInternal("inactivity_timeout");
    }
  }, [session, user, isSigningOut, isResuming]);

  // Set up session timeout checker
  useEffect(() => {
    if (session && user && !isSigningOut) {
      // Reset activity on session start
      resetActivityTimer();

      // Set up periodic check
      sessionCheckIntervalRef.current = setInterval(
        checkSessionTimeout,
        SESSION_CHECK_INTERVAL_MS
      );

      return () => {
        if (sessionCheckIntervalRef.current) {
          clearInterval(sessionCheckIntervalRef.current);
          sessionCheckIntervalRef.current = null;
        }
      };
    }
  }, [session, user, checkSessionTimeout, resetActivityTimer, isSigningOut]);

  // SINGLE consolidated AppState handler - prevents race conditions
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Going to background
      if (nextAppState === "background" || nextAppState === "inactive") {
        backgroundTimeRef.current = Date.now();
        console.log("📱 App going to background");
        return;
      }

      // Returning to foreground
      if (nextAppState === "active" && backgroundTimeRef.current) {
        const timeInBackground = Date.now() - backgroundTimeRef.current;
        backgroundTimeRef.current = null;

        console.log(`📱 App returning to foreground after ${Math.round(timeInBackground / 1000)}s`);

        // Prevent concurrent resume handling
        if (isResuming || isSigningOut) {
          console.log("⏳ Already handling resume or signout, skipping...");
          return;
        }

        setIsResuming(true);

        try {
          // STEP 1: Check if background timeout exceeded - MUST complete before anything else
          if (timeInBackground >= BACKGROUND_TIMEOUT_MS) {
            console.log("⏰ Background timeout exceeded, signing out for security...");
            await signOutInternal("background_timeout");
            return; // Exit early - no session refresh needed
          }

          // STEP 2: Reset activity timer since user returned within allowed time
          resetActivityTimer();

          // STEP 3: Refresh session from Supabase (handles token refresh + OAuth returns)
          console.log("🔄 Checking session after resume...");
          const { data: { session: freshSession }, error } = await supabase.auth.getSession();

          if (error) {
            console.error("❌ Error checking session on resume:", error);
            // Don't sign out on error - might be network issue
            return;
          }

          // STEP 4: Handle session state changes
          if (freshSession && !session) {
            // New session appeared (OAuth callback or refresh)
            console.log("✅ New session detected on resume");
            setSession(freshSession);
            setUser(freshSession.user);
            if (freshSession.user) {
              // Don't await - let profile load in background
              loadUserProfile(freshSession.user.id);
            }
          } else if (!freshSession && session) {
            // Session was invalidated while in background
            console.log("⚠️ Session invalidated while in background, signing out...");
            await signOutInternal("session_expired");
          } else if (freshSession && session) {
            // Session still valid - just refresh profile if needed
            if (!profile && freshSession.user) {
              console.log("🔄 Session valid but no profile, loading...");
              // Don't await - let profile load in background
              loadUserProfile(freshSession.user.id);
            }
          }
          // If !freshSession && !session, user is already logged out - nothing to do

        } catch (error) {
          console.error("❌ Error during app resume:", error);
        } finally {
          setIsResuming(false);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [session, profile, isResuming, isSigningOut, resetActivityTimer]);

  // Auth initialization and subscription effect
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        console.log("🔐 Initializing auth...");
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error("❌ Error getting initial session:", error);
          setIsLoading(false);
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        // Set loading false BEFORE profile load - don't block navigation
        setIsLoading(false);
        console.log("✅ Auth initialized:", { hasSession: !!initialSession });

        // Load profile in background - don't await
        if (initialSession?.user) {
          loadUserProfile(initialSession.user.id);
        }
      } catch (error) {
        console.error("💥 Error initializing auth:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Auth state change listener (handles sign in, sign out, token refresh)
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("🔄 Auth event:", event);

        if (!mounted) return;

        // Ignore events during signout to prevent race conditions
        if (isSigningOut && event !== "SIGNED_OUT") {
          console.log("⏳ Ignoring auth event during signout:", event);
          return;
        }

        // Ignore spurious SIGNED_OUT events if we actually have a valid session
        if (event === "SIGNED_OUT" && newSession) {
          console.log("⚠️ Ignoring spurious SIGNED_OUT event - session still valid");
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === "SIGNED_IN" && newSession?.user) {
          // Cancel any existing profile load
          if (profileAbortControllerRef.current) {
            profileAbortControllerRef.current.abort();
          }
          // Load profile in background - don't block auth state
          loadUserProfile(newSession.user.id);
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
          setIsFetchingProfile(false);
        } else if (event === "TOKEN_REFRESHED" && newSession?.user && !profile) {
          // Profile might have been lost during token refresh
          loadUserProfile(newSession.user.id);
        }

        setIsLoading(false);
      }
    );

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      // Cancel any pending profile load
      if (profileAbortControllerRef.current) {
        profileAbortControllerRef.current.abort();
      }
      // Clear recovery timeout
      if (authRecoveryTimeoutRef.current) {
        clearTimeout(authRecoveryTimeoutRef.current);
      }
    };
  }, [isSigningOut]);

  const loadUserProfile = async (userId: string) => {
    // Allow retry if currently fetching but with abort
    if (isFetchingProfile) {
      console.log("⏳ Profile fetch already in progress, aborting previous...");
      if (profileAbortControllerRef.current) {
        profileAbortControllerRef.current.abort();
      }
    }

    // Don't load profile during signout
    if (isSigningOut) {
      console.log("⏳ Skipping profile load during signout");
      return;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    profileAbortControllerRef.current = abortController;

    setIsFetchingProfile(true);
    console.log("👤 Loading profile for user:", userId);

    // Set a timeout to prevent indefinite loading - just abort and continue
    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        console.log("⚠️ Profile loading timeout, continuing without profile...");
        abortController.abort();
        setIsFetchingProfile(false);
        // Don't force logout - just continue without profile
        // The app should work, user can retry or refresh
      }
    }, PROFILE_LOAD_TIMEOUT_MS);

    try {
      // Check if aborted before making request
      if (abortController.signal.aborted) {
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          `
          *,
          colleges (*)
        `
        )
        .eq("id", userId)
        .single();

      // Check if aborted after request
      if (abortController.signal.aborted) {
        console.log("⏳ Profile load aborted, discarding result");
        return;
      }

      // Clear recovery timeout since we got a response
      if (authRecoveryTimeoutRef.current) {
        clearTimeout(authRecoveryTimeoutRef.current);
        authRecoveryTimeoutRef.current = null;
      }

      if (profileError) {
        console.error("❌ Profile fetch error:", profileError.message);
        // If profile doesn't exist, this might be a new user - don't break auth
        if (profileError.code === "PGRST116") {
          console.log("⚠️ No profile found - may be new user, waiting for trigger");
        }
        return;
      }

      if (!profileData) {
        console.log("❌ No profile data returned");
        return;
      }

      console.log("✅ Profile loaded for user");

      const fullProfile: ProfileWithCollege = {
        ...profileData,
        accepted_terms: profileData.accepted_terms ?? false,
        college: profileData.colleges || null,
      };

      setProfile(fullProfile);

      // Check if user needs to accept terms
      if (!profileData.accepted_terms) {
        console.log("⚠️ User has not accepted terms, showing modal");
        setShowTermsModal(true);
      }

      // Track user IP address on login/profile load (non-blocking)
      ipTrackingService
        .trackUserIP(userId, { trigger: "login" })
        .then((result) => {
          if (result.success) {
            console.log("🌐 Login IP tracking successful:", result.ip, result.reason);
          } else {
            console.log("⏰ Login IP tracking skipped:", result.reason);
          }
        })
        .catch((error) => {
          console.log("❌ Login IP tracking error:", error);
        });

    } catch (error: any) {
      if (error.name === "AbortError" || abortController.signal.aborted) {
        console.log("⏳ Profile load was aborted");
        return;
      }
      console.error("💥 Unexpected error loading profile:", error);
    } finally {
      clearTimeout(timeoutId);
      // Only clear fetching state if this is still the current request
      if (profileAbortControllerRef.current === abortController) {
        setIsFetchingProfile(false);
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting sign in...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Sign in failed:", error.message);
      } else {
        console.log("✅ Sign in successful");
      }

      return { error };
    } catch (error) {
      console.error("💥 Unexpected sign in error:", error);
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    collegeId?: string
  ) => {
    try {
      console.log("🔄 Starting registration with trigger...");
      console.log("🏫 College ID:", collegeId);

      // Pass user data in metadata for the trigger to use
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            college_id: collegeId,
          },
        },
      });

      if (error) {
        console.error("❌ Auth signup failed:", error);
        return { error, data: null };
      }

      if (!data.user) {
        console.error("❌ No user returned from signup");
        return { error: new Error("No user returned from signup"), data: null };
      }

      console.log("✅ Auth user created:", data.user.id);
      console.log(
        "✅ Email confirmed:",
        data.user.email_confirmed_at ? "Yes" : "No"
      );

      // The trigger should automatically create the profile
      if (data.session) {
        console.log(
          "✅ User signed in immediately - trigger should have created profile"
        );
        const userId = data.user.id;
        // Load profile immediately without delay
        loadUserProfile(userId);
      } else {
        console.log(
          "📧 User created, needs email confirmation - profile created by trigger"
        );
        console.log("📧 Check your email for confirmation link");
      }

      return { error: null, data };
    } catch (error) {
      console.error("💥 Unexpected signup error:", error);
      return { error, data: null };
    }
  };

  const signInWithGoogle = async (termsAccepted: boolean = false) => {
    try {
      console.log("🔐 Starting Google sign-in flow...");

      const result = await googleAuthService.signInWithGoogle(termsAccepted);

      if (result.error) {
        console.error("❌ Google sign-in failed:", result.error.message);
        return { error: result.error };
      }

      if (result.cancelled) {
        console.log("ℹ️ Google sign-in was cancelled by user");
        return { error: new Error("Sign-in was cancelled") };
      }

      if (result.user) {
        console.log("✅ Google sign-in successful");
        // The session is already set by googleAuthService, so we just return success
        // The auth state change listener will handle the rest
        return { error: null };
      }

      // This should not happen, but handle it just in case
      console.error("❌ Unexpected Google sign-in result");
      return { error: new Error("Unexpected authentication result") };
    } catch (error: any) {
      console.error("💥 Unexpected Google sign-in error:", error);
      return { error: new Error(`Google sign-in failed: ${error.message}`) };
    }
  };

  const signInWithMicrosoft = async (termsAccepted: boolean = false) => {
    try {
      console.log("🔐 Starting Microsoft sign-in flow...");

      const result = await microsoftAuthService.signInWithMicrosoft(
        termsAccepted
      );

      if (result.error) {
        console.error("❌ Microsoft sign-in failed:", result.error.message);
        return { error: result.error };
      }

      if (result.cancelled) {
        console.log("ℹ️ Microsoft sign-in was cancelled by user");
        return { error: new Error("Sign-in was cancelled") };
      }

      if (result.user) {
        console.log("✅ Microsoft sign-in successful");
        // The session is already set by microsoftAuthService, so we just return success
        // The auth state change listener will handle the rest
        return { error: null };
      }

      // This should not happen, but handle it just in case
      console.error("❌ Unexpected Microsoft sign-in result");
      return { error: new Error("Unexpected authentication result") };
    } catch (error: any) {
      console.error("💥 Unexpected Microsoft sign-in error:", error);
      return { error: new Error(`Microsoft sign-in failed: ${error.message}`) };
    }
  };

  // Internal signOut with reason tracking - prevents concurrent signouts
  const signOutInternal = async (reason: string) => {
    // Prevent concurrent signouts
    if (isSigningOut) {
      console.log("⏳ Signout already in progress, skipping duplicate");
      return;
    }

    setIsSigningOut(true);
    console.log(`🚪 Starting sign out process (reason: ${reason})...`);

    try {
      // Cancel any pending profile load
      if (profileAbortControllerRef.current) {
        profileAbortControllerRef.current.abort();
        profileAbortControllerRef.current = null;
      }

      // Clear recovery timeout
      if (authRecoveryTimeoutRef.current) {
        clearTimeout(authRecoveryTimeoutRef.current);
        authRecoveryTimeoutRef.current = null;
      }

      // Clear session check interval
      if (sessionCheckIntervalRef.current) {
        clearInterval(sessionCheckIntervalRef.current);
        sessionCheckIntervalRef.current = null;
      }

      // Clear state immediately to prevent components from making requests
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsFetchingProfile(false);
      setShowTermsModal(false);

      // Sign out from Supabase
      await supabase.auth.signOut();

      console.log("✅ Sign out complete");
    } catch (error) {
      console.error("❌ Error signing out:", error);
      // Even on error, ensure state is cleared
      setSession(null);
      setUser(null);
      setProfile(null);
    } finally {
      setIsSigningOut(false);
      setIsResuming(false);
    }
  };

  // Public signOut function
  const signOut = async () => {
    await signOutInternal("user_initiated");
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const deleteAccount = async () => {
    return await AccountService.deleteUserAccount();
  };

  const handleTermsAccept = async () => {
    console.log("✅ User accepted terms");
    setShowTermsModal(false);
    // Refresh profile to get updated accepted_terms value
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  const handleTermsDecline = async () => {
    console.log("❌ User declined terms, signing out");
    setShowTermsModal(false);
    await signOut();
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signInWithGoogle,
    signInWithMicrosoft,
    signUp,
    signOut,
    refreshProfile,
    deleteAccount,
    resetActivityTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      <View
        style={{ flex: 1 }}
        onTouchStart={resetActivityTimer}
        onTouchMove={resetActivityTimer}
      >
        {children}
        {user && (
          <TermsAcceptanceModal
            visible={showTermsModal}
            userId={user.id}
            onAccept={handleTermsAccept}
            onDecline={handleTermsDecline}
          />
        )}
      </View>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useUserCollege = (): College | null => {
  const { profile } = useAuth();
  return profile?.college || null;
};

export const useIsAdmin = (): boolean => {
  const { profile } = useAuth();
  return profile?.is_admin || false;
};

export const useCollegeTheme = () => {
  const college = useUserCollege();
  return {
    primary: college?.primary_color || "#18453b",
    secondary: college?.secondary_color || "#ffd700",
    name: college?.short_name || "MSU",
    fullName: college?.name || "Michigan State University",
  };
};
