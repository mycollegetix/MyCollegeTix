import React, { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    name: string
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  signIn: async () => ({ error: new Error("Not implemented") }),
  signUp: async () => ({ error: new Error("Not implemented") }),
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting session:", sessionError.message);
        }

        if (mounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
          // Don't block loading on profile fetch
          if (initialSession?.user) {
            fetchProfile(initialSession.user.id).catch((error) => {
              console.error("Error fetching initial profile:", error);
            });
          }
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          console.log(
            "✅ Auth initialization complete, setting isLoading to false"
          );
          setIsLoading(false);
        }
      }
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setSession(session);
        setUser(session?.user ?? null);

        // Don't block on profile fetch
        if (session?.user) {
          fetchProfile(session.user.id).catch((error) => {
            console.error("Error fetching profile on auth change:", error);
          });
        } else {
          setProfile(null);
        }

        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log("🔍 Fetching profile for user:", userId);

      // Add a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000);
      });

      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      const { data, error } = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as any;

      if (error) {
        console.warn("Error fetching profile:", error.message);
        return null;
      }

      if (data) {
        console.log("✅ Profile fetched successfully");
        setProfile(data);
      } else {
        console.log("⚠️ No profile data found");
      }
      return data;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signUp,
    signOut,
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
