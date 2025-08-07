#!/bin/bash

echo "📦 Quick iOS Archive Script"
echo "============================"

# Get current build number from iOS Info.plist and increment it
CURRENT=$(grep -A1 '<key>CFBundleVersion</key>' ios/MyCollegeTix/Info.plist | grep '<string>' | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
# Increment build number (e.g., 1.6 -> 1.7)
NEW=$(echo "$CURRENT + 0.1" | bc)

echo "📱 Updating iOS CFBundleVersion from $CURRENT to $NEW"

# Update the CFBundleVersion in iOS Info.plist
sed -i '' "/<key>CFBundleVersion<\/key>/{n;s/<string>$CURRENT<\/string>/<string>$NEW<\/string>/;}" ios/MyCollegeTix/Info.plist

echo "✅ iOS build number updated successfully"

# Navigate to iOS directory
cd ios

# Clean up previous archives
echo "🧹 Cleaning up old archives..."
rm -rf *.xcarchive

# Archive the project
echo "📦 Creating iOS archive..."
xcodebuild -workspace MyCollegeTix.xcworkspace \
           -scheme MyCollegeTix \
           -configuration Release \
           -destination "generic/platform=iOS" \
           archive \
           -archivePath ./MyCollegeTix.xcarchive \
           -allowProvisioningUpdates

# Check if archive was created successfully
if [ -d "./MyCollegeTix.xcarchive" ]; then
    echo "✅ Archive created successfully!"
    echo ""
    echo "📍 Archive location: $(pwd)/MyCollegeTix.xcarchive"
    echo ""
    echo "📤 Next steps:"
    echo "1. Run: open MyCollegeTix.xcarchive"
    echo "2. In Xcode Organizer: Distribute App → App Store Connect"
    echo "3. Go to appstoreconnect.apple.com to manage your build"
    echo ""
    echo "🚀 Ready for TestFlight/App Store!"
else
    echo "❌ Archive creation failed!"
    echo "Check the output above for error details."
    exit 1
fi