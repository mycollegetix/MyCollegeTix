// src/providers/AuthProvider.tsx - Simple fix for registration
import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/src/lib/supabase";
import { College } from "@/src/types/database.types";

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
  signUp: (
    email: string,
    password: string,
    name: string,
    collegeId?: string,
    acceptedAgreements?: boolean
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileWithCollege | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);

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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth event:", event);

      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (event === "SIGNED_IN" && session?.user) {
        // Small delay to ensure the profile exists
        setTimeout(() => {
          loadUserProfile(session.user.id);
        }, 1000);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      }

      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    if (isFetchingProfile) return;

    setIsFetchingProfile(true);
    console.log("👤 Loading profile for user:", userId);

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
        return;
      }

      if (!profileData) {
        console.log("❌ No profile found for user");
        return;
      }

      console.log("✅ Profile loaded:", profileData.email);

      const fullProfile: ProfileWithCollege = {
        ...profileData,
        college: profileData.colleges || null,
      };

      setProfile(fullProfile);
    } catch (error) {
      console.error("💥 Unexpected error loading profile:", error);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    collegeId?: string,
    acceptedAgreements?: boolean
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
            legal_agreements_accepted: acceptedAgreements,
          },
        },
      });

      if (error) {
        console.error("❌ Auth signup failed:", error);
        return { error };
      }

      if (!data.user) {
        console.error("❌ No user returned from signup");
        return { error: new Error("No user returned from signup") };
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
        setTimeout(() => loadUserProfile(userId), 1500);
      } else {
        console.log(
          "📧 User created, needs email confirmation - profile created by trigger"
        );
        console.log("📧 Check your email for confirmation link");
      }

      return { error: null };
    } catch (error) {
      console.error("💥 Unexpected signup error:", error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
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

  const value = {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
