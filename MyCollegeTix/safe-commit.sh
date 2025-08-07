#!/bin/bash

if [ -z "$1" ]; then
    echo "❌ Please provide a commit message"
    echo "Usage: ./safe-commit.sh \"your commit message\""
    exit 1
fi

COMMIT_MESSAGE="$1"

echo "🔍 Safety Check: Cleaning build artifacts before commit..."

# Remove iOS build artifacts that could corrupt Git
echo "🧹 Cleaning iOS artifacts..."
rm -rf ios/Pods
rm -rf ios/build  
rm -rf ios/*.xcarchive
rm -rf ios/DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData

# Remove node_modules if they exist (will be reinstalled)
if [ -d "node_modules" ]; then
    echo "📦 Removing node_modules (will need npm install later)..."
    rm -rf node_modules
fi

echo ""
echo "📋 Checking Git status..."
git status

echo ""
echo "🚨 SAFETY CHECK:"
echo "Look at the files above. Do you see:"
echo "- ios/Pods/hermes-engine files?"
echo "- Hundreds of modified files?"
echo "- Large binary files?"
echo ""
read -p "Does everything look safe to commit? (y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Proceeding with commit..."
    git add .
    git commit -m "$COMMIT_MESSAGE"
    echo "🎉 Commit successful!"
    echo ""
    echo "📝 Remember to run 'npm install' and 'cd ios && pod install' before building."
else
    echo "❌ Commit cancelled. Clean up the problematic files first."
    exit 1
fi