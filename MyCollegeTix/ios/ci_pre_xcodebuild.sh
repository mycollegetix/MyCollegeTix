#!/bin/sh

# Pre-build script for Xcode Cloud
# This script runs before xcodebuild to install CocoaPods dependencies

echo "🔧 Installing CocoaPods dependencies..."

# Navigate to the iOS directory
cd "$CI_WORKSPACE/ios"

# Install CocoaPods dependencies
pod install

echo "✅ CocoaPods installation complete"