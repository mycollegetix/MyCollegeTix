#!/bin/bash

echo "🍎 Starting iOS build process..."

# Get current buildNumber and increment it
CURRENT=$(grep -o '"buildNumber": "[0-9.]*"' app.json | grep -o '[0-9.]*')
# Increment build number (e.g., 1.5 -> 1.6)
NEW=$(echo "$CURRENT + 0.1" | bc)

echo "📱 Updating buildNumber from $CURRENT to $NEW"

# Update the buildNumber in app.json
sed -i '' "s/\"buildNumber\": \"$CURRENT\"/\"buildNumber\": \"$NEW\"/" app.json

echo "✅ Build number updated successfully"

# Step 1: Update JS bundle
echo "📦 Updating JS bundle..."
npx expo export --platform ios --clear

# Step 2: Clean and prepare
echo "🧹 Cleaning build artifacts..."
cd ios
rm -rf ~/Library/Developer/Xcode/DerivedData
rm -rf build
rm -rf *.xcarchive

# Step 3: Fresh pod install
echo "🔄 Fresh CocoaPods installation..."
pod deintegrate && rm -rf Podfile.lock && rm -rf Pods && rm -rf ~/Library/Caches/CocoaPods 
pod install
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild clean -workspace MyCollegeTix.xcworkspace -scheme MyCollegeTix
pod update --no-repo-update
rm -rf ~/Library/Developer/Xcode/DerivedData
xcodebuild clean -workspace MyCollegeTix.xcworkspace -scheme MyCollegeTix
pod update --no-repo-update

# Step 4: Archive
echo "📦 Creating iOS archive..."
xcodebuild -workspace MyCollegeTix.xcworkspace -scheme MyCollegeTix -configuration Release -destination "generic/platform=iOS" archive -archivePath ./MyCollegeTix.xcarchive

echo "🎉 iOS build complete!"
echo ""
echo "📤 Next steps:"
echo "1. Run: open MyCollegeTix.xcarchive"
echo "2. In Xcode: Distribute App → App Store Connect"
echo "3. Go to appstoreconnect.apple.com"
echo "4. Create new version if needed and submit for review"