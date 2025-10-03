// src/providers/AuthProvider.tsx - Simple fix for registration
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { supabase } from "@/src/lib/supabase";
import { College } from "@/src/types/database.types";
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithCollege | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await loadUserProfile(session.user.id);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (mounted) setIsLoading(false);
      }
    };

    initializeAuth();

    // Handle app state changes (when user returns from browser)
    const handleAppStateChange = async (nextAppState: string) => {
      if (nextAppState === 'active') {
        console.log("📱 App became active, checking for new session...");
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error("❌ Error checking session on app resume:", error);
            return;
          }
          
          if (session && !user) {
            console.log("✅ New session found on app resume!");
            setSession(session);
            setUser(session.user);
            if (session.user) {
              await loadUserProfile(session.user.id);
            }
          }
        } catch (error) {
          console.error("❌ Error refreshing session:", error);
        }
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth event:", event);

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        // Load profile immediately without delay to improve performance
        loadUserProfile(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      authSubscription.unsubscribe();
      appStateSubscription?.remove();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    if (isFetchingProfile) return;

    setIsFetchingProfile(true);
    console.log("👤 Loading profile for user:", userId);

    // Set a timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      console.log("⚠️ Profile loading timeout, continuing without profile...");
      setIsFetchingProfile(false);
    }, 10000); // 10 second timeout

    try {
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

      if (profileError) {
        console.error("❌ Profile fetch error:", profileError.message);
        console.error("❌ Full error details:", profileError);
        // Don't return early, let the auth system continue
      }

      if (!profileData && !profileError) {
        console.log("❌ No profile found for user - this may be expected for new users");
        return;
      }

      if (profileData) {
        console.log("✅ Profile loaded:", profileData.email);

        const fullProfile: ProfileWithCollege = {
          ...profileData,
          college: profileData.colleges || null,
        };

        setProfile(fullProfile);

        // Check if user needs to accept terms
        if (!profileData.accepted_terms) {
          console.log("⚠️ User has not accepted terms, showing modal");
          setShowTermsModal(true);
        }

        // Track user IP address on login/profile load with smart throttling
        ipTrackingService.trackUserIP(userId, { trigger: 'login' }).then((result) => {
          if (result.success) {
            console.log("🌐 Login IP tracking successful:", result.ip, result.reason);
          } else {
            console.log("⏰ Login IP tracking skipped:", result.reason);
          }
        }).catch((error) => {
          console.log("❌ Login IP tracking error:", error);
        });
      }
    } catch (error) {
      console.error("💥 Unexpected error loading profile:", error);
      // Continue operation rather than breaking auth
    } finally {
      clearTimeout(timeoutId);
      setIsFetchingProfile(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Attempting sign in for:", email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("❌ Sign in failed:", error.message);
        console.error("❌ Full error:", error);
      } else {
        console.log("✅ Sign in successful for:", data.user?.email);
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
      console.log("📧 Email:", email);
      console.log("👤 Name:", name);
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
        console.log("✅ Google sign-in successful for:", result.user.email);
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

      const result = await microsoftAuthService.signInWithMicrosoft(termsAccepted);

      if (result.error) {
        console.error("❌ Microsoft sign-in failed:", result.error.message);
        return { error: result.error };
      }

      if (result.cancelled) {
        console.log("ℹ️ Microsoft sign-in was cancelled by user");
        return { error: new Error("Sign-in was cancelled") };
      }

      if (result.user) {
        console.log("✅ Microsoft sign-in successful for:", result.user.email);
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

  const signOut = async () => {
    try {
      await Promise.all([
        supabase.auth.signOut(),
        googleAuthService.signOut(),
        microsoftAuthService.signOut()
      ]);
      setSession(null);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Error signing out:", error);
    }
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {user && (
        <TermsAcceptanceModal
          visible={showTermsModal}
          userId={user.id}
          onAccept={handleTermsAccept}
          onDecline={handleTermsDecline}
        />
      )}
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
