#!/bin/sh

# Pre-build script for Xcode Cloud
# This script runs before xcodebuild to install CocoaPods dependencies

echo "🔧 Installing CocoaPods dependencies..."
echo "Current directory: $(pwd)"
echo "Workspace: $CI_WORKSPACE"

# Navigate to the iOS directory (try both possible paths)
if [ -d "$CI_WORKSPACE/ios" ]; then
    echo "Using CI_WORKSPACE/ios path"
    cd "$CI_WORKSPACE/ios"
elif [ -d "./ios" ]; then
    echo "Using relative ios path"
    cd "./ios"
else
    echo "❌ Error: Cannot find ios directory"
    ls -la
    exit 1
fi

echo "Installing pods in: $(pwd)"

# Install CocoaPods dependencies
pod install

echo "✅ CocoaPods installation complete"