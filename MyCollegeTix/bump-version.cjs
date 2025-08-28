#!/usr/bin/env node

/**
 * Version Bump Script for MyCollegeTix Expo Project
 * 
 * This script automatically bumps version numbers across:
 * - package.json
 * - app.json (Expo configuration)
 * - Android versionCode
 * - iOS buildNumber
 * 
 * Usage:
 *   node bump-version.cjs patch    # 1.2.3 -> 1.2.4
 *   node bump-version.cjs minor    # 1.2.3 -> 1.3.0
 *   node bump-version.cjs major    # 1.2.3 -> 2.0.0
 * 
 * If no argument is provided, defaults to 'patch'
 */

const fs = require('fs');
const path = require('path');

function incrementVersion(version, type = 'patch') {
  const parts = version.split('.').map(Number);
  
  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
    default:
      parts[2]++;
      break;
  }
  
  return parts.join('.');
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated package.json version to ${newVersion}`);
}

function updateAppJson(newVersion) {
  const appJsonPath = path.join(__dirname, 'app.json');
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Update main version
  appJson.expo.version = newVersion;
  
  // Increment Android versionCode
  if (appJson.expo.android && appJson.expo.android.versionCode) {
    appJson.expo.android.versionCode += 1;
    console.log(`✅ Updated Android versionCode to ${appJson.expo.android.versionCode}`);
  }
  
  // Increment iOS buildNumber
  if (appJson.expo.ios && appJson.expo.ios.buildNumber) {
    const currentBuildNumber = parseFloat(appJson.expo.ios.buildNumber);
    const newBuildNumber = (currentBuildNumber + 0.1).toFixed(1);
    appJson.expo.ios.buildNumber = newBuildNumber;
    console.log(`✅ Updated iOS buildNumber to ${newBuildNumber}`);
  }
  
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n');
  console.log(`✅ Updated app.json version to ${newVersion}`);
}

function updateInfoPlist(newVersion, newBuildNumber) {
  const infoPlistPath = path.join(__dirname, 'ios', 'MyCollegeTix', 'Info.plist');
  
  if (!fs.existsSync(infoPlistPath)) {
    console.log(`⚠️ Info.plist not found at ${infoPlistPath}`);
    return;
  }
  
  let plistContent = fs.readFileSync(infoPlistPath, 'utf8');
  
  // Update CFBundleShortVersionString (version)
  plistContent = plistContent.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleShortVersionString</key>\n    <string>${newVersion}</string>`
  );
  
  // Update CFBundleVersion (build number)
  plistContent = plistContent.replace(
    /<key>CFBundleVersion<\/key>\s*<string>[^<]*<\/string>/,
    `<key>CFBundleVersion</key>\n    <string>${newBuildNumber}</string>`
  );
  
  fs.writeFileSync(infoPlistPath, plistContent);
  console.log(`✅ Updated Info.plist version to ${newVersion} and build to ${newBuildNumber}`);
}



function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major
  
  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: patch, minor, or major');
    process.exit(1);
  }
  
  try {
    // Read current version from app.json (Expo project)
    const appJsonPath = path.join(__dirname, 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const currentVersion = appJson.expo.version;
    
    // Calculate new version
    const newVersion = incrementVersion(currentVersion, versionType);
    
    console.log(`🚀 Bumping version from ${currentVersion} to ${newVersion} (${versionType})`);
    console.log('');
    
    // Update all platform versions
    updatePackageJson(newVersion);
    updateAppJson(newVersion);
    
    // Also update Info.plist with the new iOS build number from app.json
    const updatedAppJsonPath = path.join(__dirname, 'app.json');
    const updatedAppJson = JSON.parse(fs.readFileSync(updatedAppJsonPath, 'utf8'));
    const iosBuildNumber = updatedAppJson.expo.ios?.buildNumber || '1.0';
    updateInfoPlist(newVersion, iosBuildNumber);
    
    console.log('');
    console.log(`🎉 Successfully bumped all platform versions to ${newVersion}`);
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • package.json: ${newVersion}`);
    console.log(`   • app.json (Expo): ${newVersion}`);
    console.log(`   • Info.plist: ${newVersion}`);
    console.log(`   • Android: versionCode incremented`);
    console.log(`   • iOS: buildNumber incremented`);
    
  } catch (error) {
    console.error('❌ Error bumping version:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}