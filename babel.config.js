// Fails the bundle if mock OTP acceptance is no longer gated on __DEV__.
require('./scripts/assert-mock-auth-gated');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
