/** Legacy route kept for old links. The canonical Terms of Service is /legal/terms (KIL-011). */
import React from 'react';
import { Redirect } from 'expo-router';

export default function TermsRedirect() {
  return <Redirect href="/legal/terms" />;
}
