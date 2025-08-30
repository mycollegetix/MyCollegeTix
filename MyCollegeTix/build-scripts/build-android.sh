#!/bin/bash

# Change to project root directory
cd "$(dirname "$0")/.."

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
cd android && ./gradlew clean && cd ..

echo "📦 Building release bundle..."
cd android && ./gradlew bundleRelease && cd ..

echo "🎉 Build complete! Your .aab file is at:"
echo "   android/app/build/outputs/bundle/release/app-release.aab"