/**
 * Wallet admin — there is no wallet-admin backend yet, so this route shows the honest
 * "not available yet" state (admin-only; see components/profile/WalletAdminUnavailable.tsx).
 */
import React from 'react';
import { WalletAdminUnavailable } from '../../components/profile/WalletAdminUnavailable';

export default function WalletAdminScreen() {
  return <WalletAdminUnavailable />;
}
