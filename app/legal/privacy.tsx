/** Canonical Privacy Policy route (KIL-011). /privacy redirects here. */
import React from 'react';
import { LegalDocument } from '../../components/profile/LegalDocument';

export default function PrivacyPolicyScreen() {
  return <LegalDocument doc="privacy" />;
}
