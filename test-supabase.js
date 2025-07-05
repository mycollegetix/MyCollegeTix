const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = "https://jcbsvogibivndsubxusm.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjYnN2b2dpYml2bmRzdWJ4dXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzMjk3NjEsImV4cCI6MjA2NjkwNTc2MX0.gVNGAXyERGmW6V2xs_da6NPCigmjam3jDclrMmu3KqA";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabase() {
  console.log("Testing Supabase connection...");

  try {
    // Test 1: Sign up
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = "testpassword123";

    console.log(`\nTest 1: Signing up with email: ${testEmail}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: testEmail,
        password: testPassword,
      }
    );

    if (signUpError) {
      console.error("❌ Sign up failed:", signUpError.message);
    } else {
      console.log("✅ Sign up successful!");
      console.log("User ID:", signUpData.user.id);
    }

    // Test 2: Sign in
    console.log("\nTest 2: Signing in with the same credentials");
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

    if (signInError) {
      console.error("❌ Sign in failed:", signInError.message);
    } else {
      console.log("✅ Sign in successful!");
      console.log(
        "Session:",
        signInData.session ? "✅ Created" : "❌ Not created"
      );
    }
  } catch (error) {
    console.error("❌ Test failed with error:", error.message);
  }
}

testSupabase();
