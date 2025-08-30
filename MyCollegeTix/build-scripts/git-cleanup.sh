#!/bin/bash

# Change to project root directory
cd "$(dirname "$0")/.."

echo "🧹 Git Cleanup Script"
echo "===================="
echo "This script will clean up your Git repo to prevent future corruption issues."

# Remove Pods directory if it exists (it will be regenerated)
if [ -d "ios/Pods" ]; then
    echo "📦 Removing ios/Pods directory..."
    rm -rf ios/Pods
fi

# Remove archives
if [ -d "ios/*.xcarchive" ]; then
    echo "📦 Removing archive files..."
    rm -rf ios/*.xcarchive
fi

# Remove other build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf ios/build
rm -rf ios/DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData

# Remove problematic files from Git tracking
echo "🔧 Removing binary files from Git index..."
git rm -r --cached ios/Pods/ 2>/dev/null || echo "  ✅ ios/Pods/ not in index"
git rm -r --cached ios/Podfile.lock 2>/dev/null || echo "  ✅ Podfile.lock not in index"
git rm -r --cached ios/*.xcarchive 2>/dev/null || echo "  ✅ Archives not in index"

# Remove hermes binaries from tracking
git rm --cached ios/Pods/hermes-engine/destroot/bin/* 2>/dev/null || echo "  ✅ Hermes binaries not in index"
git rm --cached ios/Pods/hermes-engine/destroot/Library/Frameworks/**/*.framework/hermes 2>/dev/null || echo "  ✅ Hermes frameworks not in index"

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Run: git add ."
echo "2. Run: git commit -m 'Fix gitignore and remove binary files'"
echo "3. Run: git push"
echo ""
echo "🚨 IMPORTANT: Before your next build, run:"
echo "   cd ios && pod install"
echo ""
echo "This should prevent future Git corruption issues!"