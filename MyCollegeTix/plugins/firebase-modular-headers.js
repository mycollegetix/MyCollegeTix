const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withFirebaseModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    (config) => {
      // Set use_frameworks :static via Podfile.properties.json
      // This is the Expo-supported way to configure CocoaPods frameworks
      const propsPath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile.properties.json"
      );
      const props = JSON.parse(fs.readFileSync(propsPath, "utf-8"));
      props["ios.useFrameworks"] = "static";
      fs.writeFileSync(propsPath, JSON.stringify(props, null, 2) + "\n");

      return config;
    },
  ]);
}

module.exports = withFirebaseModularHeaders;
