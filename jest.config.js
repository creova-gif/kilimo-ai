module.exports = {
  preset: "jest-expo",
  // Agent/git worktrees live under .claude/ and native projects under ios/android;
  // they duplicate package.json (haste collision) and must not be scanned.
  modulePathIgnorePatterns: ["<rootDir>/.claude/", "<rootDir>/ios/", "<rootDir>/android/"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-qrcode-svg|lucide-react-native)"
  ],
  // @testing-library/react-native v13 auto-extends Jest matchers on import,
  // so no separate extend-expect setup file is required.
};
