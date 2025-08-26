#!/bin/bash

echo "🍎 Starting iOS build process..."

# Get current build number from iOS Info.plist and increment it
CURRENT=$(grep -A1 '<key>CFBundleVersion</key>' ios/MyCollegeTix/Info.plist | grep '<string>' | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
# Increment build number (e.g., 1.5 -> 1.6)
NEW=$(echo "$CURRENT + 0.1" | bc)

echo "📱 Updating iOS CFBundleVersion from $CURRENT to $NEW"

# Update the CFBundleVersion in iOS Info.plist (more specific pattern)
sed -i '' "/<key>CFBundleVersion<\/key>/{n;s/<string>$CURRENT<\/string>/<string>$NEW<\/string>/;}" ios/MyCollegeTix/Info.plist

echo "✅ iOS build number updated successfully"

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
xcodebuild -workspace MyCollegeTix.xcworkspace -scheme MyCollegeTix -configuration Release -destination "generic/platform=iOS" archive -archivePath ./MyCollegeTix.xcarchive -allowProvisioningUpdates

# Check if archive was created successfully
if [ -d "./MyCollegeTix.xcarchive" ]; then
    echo "✅ Archive created successfully!"
else
    echo "❌ Archive creation failed!"
    exit 1
fi

echo "🎉 iOS build complete!"
echo ""
echo "📤 Next steps:"
echo "1. Run: open MyCollegeTix.xcarchive"
echo "2. In Xcode: Distribute App → App Store Connect"
echo "3. Go to appstoreconnect.apple.com"
echo "4. Create new version if needed and submit for review"