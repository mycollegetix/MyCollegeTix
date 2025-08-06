#!/bin/bash

echo "🔧 Fixing Android build while preserving keystore..."

# Back up the keystore first
echo "💾 Backing up keystore..."
cp android/app/release-key.keystore android/app/release-key.keystore.bak

# Clean prebuild to remove billing permission from manifest
echo "🧹 Clean prebuild to update manifest..."
npx expo prebuild --platform android --clean

# Restore the keystore
echo "🔄 Restoring keystore..."
cp android/app/release-key.keystore.bak android/app/release-key.keystore

# Clean gradle cache
echo "🧹 Cleaning gradle cache..."
./android/gradlew -p android clean

echo "✅ Android build fixed! Your keystore is preserved."
echo "📦 Now run: ./build-android.sh"
