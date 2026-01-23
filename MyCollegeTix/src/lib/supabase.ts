// lib/supabase.ts - Updated with TypeScript types and secure storage
import "react-native-url-polyfill/auto";
import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { Database } from "../types/database.types";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check that EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

// Secure storage adapter for mobile (uses Keychain on iOS, Keystore on Android)
// This provides encrypted storage for auth tokens
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      // Fallback for cases where secure store is unavailable (e.g., certain simulators)
      console.warn("SecureStore.getItemAsync failed, returning null:", error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.warn("SecureStore.setItemAsync failed:", error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.warn("SecureStore.deleteItemAsync failed:", error);
    }
  },
};

// Define a mock storage for SSR (server-side rendering)
const noopStorage = {
  getItem: (_key: string) => Promise.resolve(null),
  setItem: (_key: string, _value: string) => Promise.resolve(),
  removeItem: (_key: string) => Promise.resolve(),
};

// Use secure storage on mobile, localStorage on web
const storage =
  Platform.OS === "web"
    ? typeof window !== "undefined"
      ? window.localStorage
      : noopStorage // Use noopStorage during SSR
    : ExpoSecureStoreAdapter; // Encrypted storage on mobile

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
