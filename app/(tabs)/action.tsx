import { Redirect } from 'expo-router';

// The center "+" tab uses a custom tabBarButton (see (tabs)/_layout.tsx) that
// routes to /features, so this screen is normally never shown. If it is ever
// reached directly (deep link, back-stack edge case), send the user to the
// Features hub instead of a blank placeholder.
export default function ActionScreen() {
  return <Redirect href="/features" />;
}
