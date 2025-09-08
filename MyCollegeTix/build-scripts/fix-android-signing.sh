#!/bin/bash

# Set JAVA_HOME to the correct Java 17 installation
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
echo "☕ Using Java: $JAVA_HOME"

# Change to project root directory
cd "$(dirname "$0")/.."

echo "🔧 Fixing Android build while preserving keystore..."

# Clean prebuild to update manifest and apply signing plugin
echo "🧹 Clean prebuild to update manifest..."
npx expo prebuild --platform android --clean

# Ensure android/app directory exists and restore keystore from Documents
echo "📁 Creating android/app directory..."
mkdir -p android/app

echo "🔄 Restoring keystore from Documents..."
cp ~/Documents/MyCollegeTix-KEYSTORE-BACKUP.keystore android/app/release-key.keystore

# Verify that the Expo plugin applied the signing configuration correctly
echo "🔒 Verifying release signing configuration..."
if grep -A 15 "signingConfigs {" android/app/build.gradle | grep -A 5 "release {" | grep -q "storeFile file('release-key.keystore')"; then
    echo "✅ Release signing config applied by Expo plugin"
else
    echo "❌ Expo plugin failed to apply signing config"
    echo "Please check plugins/android-signing.js"
    exit 1
fi

# Clean gradle cache
echo "🧹 Cleaning gradle cache..."
cd android && ./gradlew clean && cd ..

echo "✅ Android build fixed! Your keystore is preserved."
echo "🔒 Release signing configuration verified."
echo "📦 Now run: ./build-scripts/build-android.sh"
