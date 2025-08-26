const { withAppBuildGradle } = require('@expo/config-plugins');

function withAndroidSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const { contents } = config.modResults;
    
    // Check if release signing config already exists
    if (contents.includes('release {') && contents.includes("storeFile file('release-key.keystore')")) {
      return config;
    }
    
    // Add release signing configuration to signingConfigs
    const signingConfigsRegex = /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\})([\s\S]*?\})/;
    
    const releaseSigningConfig = `
        release {
            storeFile file('release-key.keystore')
            storePassword System.getenv('KEYSTORE_PASSWORD') ?: 'NIKmam046214!'
            keyAlias 'release-key'
            keyPassword System.getenv('KEY_PASSWORD') ?: 'NIKmam046214!'
        }`;
    
    if (signingConfigsRegex.test(contents)) {
      config.modResults.contents = contents.replace(signingConfigsRegex, `$1${releaseSigningConfig}$2`);
    }
    
    // Ensure buildTypes use release signing
    config.modResults.contents = config.modResults.contents.replace(
      /signingConfig signingConfigs\.debug/g,
      'signingConfig signingConfigs.release'
    );
    
    return config;
  });
}

module.exports = withAndroidSigning;