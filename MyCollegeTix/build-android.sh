#!/bin/bash

echo "🚀 Starting Android build process..."

# Get current versionCode and increment it
CURRENT=$(grep -o '"versionCode": [0-9]*' app.json | grep -o '[0-9]*')
NEW=$((CURRENT + 1))

echo "📱 Updating versionCode from $CURRENT to $NEW"

# Update the versionCode in app.json
sed -i '' "s/\"versionCode\": $CURRENT/\"versionCode\": $NEW/" app.json

echo "✅ Version updated successfully"

# Clean and build
echo "🧹 Cleaning previous build..."
./android/gradlew -p android clean

echo "📦 Building release bundle..."
./android/gradlew -p android bundleRelease

echo "🎉 Build complete! Your .aab file is at:"
echo "   android/app/build/outputs/bundle/release/app-release.aab"