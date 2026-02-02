// debug-import.js - Simple debug version
const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log("🔧 Debug script started");
console.log("📂 Input path:", process.argv[2]);
console.log("🏫 College key:", process.argv[3]);

// Check environment variables
console.log("🌍 Environment check:");
console.log(
  "  EXPO_PUBLIC_SUPABASE_URL:",
  process.env.EXPO_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"
);
console.log(
  "  SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY ? "✅ Set" : "❌ Missing"
);

const inputPath = process.argv[2];
const collegeKey = process.argv[3];

console.log("\n📋 Parameter check:");
if (!inputPath) {
  console.log("❌ Missing input path");
  process.exit(1);
}
if (!collegeKey) {
  console.log("❌ Missing college key");
  process.exit(1);
}

console.log("✅ Parameters provided");

// Check if path exists
console.log("\n📂 File system check:");
try {
  if (!fs.existsSync(inputPath)) {
    console.log(`❌ Path does not exist: ${inputPath}`);
    process.exit(1);
  }
  console.log(`✅ Path exists: ${inputPath}`);

  const stats = fs.statSync(inputPath);
  if (stats.isDirectory()) {
    console.log("📁 Input is a directory");
    const files = fs.readdirSync(inputPath);
    console.log(`📄 Files found: ${files.length}`);
    files.forEach((file) => console.log(`   - ${file}`));

    const txtFiles = files.filter((file) => file.endsWith(".txt"));
    console.log(`📝 .txt files: ${txtFiles.length}`);
    txtFiles.forEach((file) => console.log(`   - ${file}`));
  } else {
    console.log("📄 Input is a file");
  }
} catch (error) {
  console.log(`❌ File system error: ${error.message}`);
  process.exit(1);
}

// Test Supabase connection
console.log("\n🔌 Testing Supabase connection...");
try {
  const { createClient } = require("@supabase/supabase-js");

  const supabaseUrl =
    process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log("❌ Missing Supabase credentials");
    process.exit(1);
  }

  console.log("✅ Supabase credentials found");
  const supabase = createClient(supabaseUrl, supabaseKey);
  console.log("✅ Supabase client created");

  // Test database connection
  supabase
    .from("colleges")
    .select("count")
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log(`❌ Database connection failed: ${error.message}`);
      } else {
        console.log("✅ Database connection successful");
      }
    });
} catch (error) {
  console.log(`❌ Supabase connection error: ${error.message}`);
}

console.log(
  "\n🎯 Debug complete. If you see this, the basic setup is working."
);
console.log("The original script might have an issue in the main logic.");
