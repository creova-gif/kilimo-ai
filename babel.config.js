// Fails the bundle if mock OTP acceptance is no longer gated on __DEV__.
require('./scripts/assert-mock-auth-gated');
// CRE-179 legal hold: fails a production/preview bundle if the credit-score
// real-data flag is set (see scripts/assert-credit-real-data-off.js).
require('./scripts/assert-credit-real-data-off');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
