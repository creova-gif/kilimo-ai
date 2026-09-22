/** Legacy route kept for old links. The canonical Privacy Policy is /legal/privacy (KIL-011). */
import React from 'react';
import { Redirect } from 'expo-router';

export default function PrivacyRedirect() {
  return <Redirect href="/legal/privacy" />;
}
