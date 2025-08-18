#!/usr/bin/env node

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
  const packagePath = path.join(__dirname, 'MyCollegeTix', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  packageJson.version = newVersion;
  
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated package.json version to ${newVersion}`);
}

function updateAndroidVersion(newVersion) {
  const buildGradlePath = path.join(__dirname, 'MyCollegeTix', 'android', 'app', 'build.gradle');
  let content = fs.readFileSync(buildGradlePath, 'utf8');
  
  // Update versionName
  content = content.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${newVersion}"`
  );
  
  // Increment versionCode
  const versionCodeMatch = content.match(/versionCode\s+(\d+)/);
  if (versionCodeMatch) {
    const currentVersionCode = parseInt(versionCodeMatch[1]);
    const newVersionCode = currentVersionCode + 1;
    content = content.replace(
      /versionCode\s+\d+/,
      `versionCode ${newVersionCode}`
    );
    console.log(`✅ Updated Android versionCode to ${newVersionCode} and versionName to ${newVersion}`);
  }
  
  fs.writeFileSync(buildGradlePath, content);
}

function updateiOSVersion(newVersion) {
  const infoPlistPath = path.join(__dirname, 'MyCollegeTix', 'ios', 'MyCollegeTix', 'Info.plist');
  let content = fs.readFileSync(infoPlistPath, 'utf8');
  
  // Update CFBundleShortVersionString
  content = content.replace(
    /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]+<\/string>/,
    `<key>CFBundleShortVersionString</key>\n    <string>${newVersion}</string>`
  );
  
  // Increment CFBundleVersion (build number)
  const bundleVersionMatch = content.match(/<key>CFBundleVersion<\/key>\s*<string>([^<]+)<\/string>/);
  if (bundleVersionMatch) {
    const currentBuildNumber = parseFloat(bundleVersionMatch[1]);
    const newBuildNumber = (currentBuildNumber + 0.1).toFixed(1);
    content = content.replace(
      /<key>CFBundleVersion<\/key>\s*<string>[^<]+<\/string>/,
      `<key>CFBundleVersion</key>\n    <string>${newBuildNumber}</string>`
    );
    console.log(`✅ Updated iOS CFBundleShortVersionString to ${newVersion} and CFBundleVersion to ${newBuildNumber}`);
  }
  
  fs.writeFileSync(infoPlistPath, content);
}

function main() {
  const args = process.argv.slice(2);
  const versionType = args[0] || 'patch'; // patch, minor, major
  
  if (!['patch', 'minor', 'major'].includes(versionType)) {
    console.error('❌ Invalid version type. Use: patch, minor, or major');
    process.exit(1);
  }
  
  try {
    // Read current version from package.json
    const packagePath = path.join(__dirname, 'MyCollegeTix', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const currentVersion = packageJson.version;
    
    // Calculate new version
    const newVersion = incrementVersion(currentVersion, versionType);
    
    console.log(`🚀 Bumping version from ${currentVersion} to ${newVersion} (${versionType})`);
    console.log('');
    
    // Update all platform versions
    updatePackageJson(newVersion);
    updateAndroidVersion(newVersion);
    updateiOSVersion(newVersion);
    
    console.log('');
    console.log(`🎉 Successfully bumped all platform versions to ${newVersion}`);
    console.log('');
    console.log('📋 Summary:');
    console.log(`   • package.json: ${newVersion}`);
    console.log(`   • Android: versionName "${newVersion}" + incremented versionCode`);
    console.log(`   • iOS: CFBundleShortVersionString "${newVersion}" + incremented CFBundleVersion`);
    
  } catch (error) {
    console.error('❌ Error bumping version:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}