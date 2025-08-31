#!/bin/sh

# Pre-build script for Xcode Cloud
# This script runs before xcodebuild to install CocoaPods dependencies

# Change to project root directory
cd "$(dirname "$0")/.."

echo "🔧 Installing CocoaPods dependencies..."
echo "Current directory: $(pwd)"
echo "Workspace: $CI_WORKSPACE"

# Based on the xcodebuild path, the ios directory is at $CI_WORKSPACE/MyCollegeTix/ios
# Try multiple possible paths
if [ -d "$CI_WORKSPACE/MyCollegeTix/ios" ]; then
    echo "Using CI_WORKSPACE/MyCollegeTix/ios path"
    cd "$CI_WORKSPACE/MyCollegeTix/ios"
elif [ -d "$CI_WORKSPACE/ios" ]; then
    echo "Using CI_WORKSPACE/ios path"
    cd "$CI_WORKSPACE/ios"
elif [ -d "./MyCollegeTix/ios" ]; then
    echo "Using relative MyCollegeTix/ios path"
    cd "./MyCollegeTix/ios"
elif [ -d "./ios" ]; then
    echo "Using relative ios path"
    cd "./ios"
else
    echo "❌ Error: Cannot find ios directory"
    echo "Available directories:"
    ls -la
    if [ -d "./MyCollegeTix" ]; then
        echo "MyCollegeTix contents:"
        ls -la ./MyCollegeTix/
    fi
    exit 1
fi

echo "Installing pods in: $(pwd)"

# Install CocoaPods dependencies
pod install

echo "✅ CocoaPods installation complete"