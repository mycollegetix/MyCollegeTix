import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://jcbsvogibivndsubxusm.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYnN2b2dpYml2bmRzdWJ4dXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjk3NjEsImV4cCI6MjA2NjkwNTc2MX0.gVNGAXyERGmW6V2xs_da6NPCigmjam3jDclrMmu3KqA";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
