/** English strings: offline queue, sync and connectivity messages. Keys are `offline.<name>`. Mirror every key in offline.sw.ts. */
export const enOffline = {
  // Global status banner (app/_layout.tsx)
  'offline.banner':
    'You are offline. Your changes are saved on this phone and will sync when you reconnect.',
  'offline.pending': 'Waiting to sync: {count}',
  'offline.syncing': 'Syncing: {count}',
  'offline.failed': 'Could not sync: {count}',
  'offline.retry': 'Retry',
  'offline.viewQueue': 'View',
  'offline.dismiss': 'Dismiss',

  // Notification shown when changes that had been waiting are finally saved
  'offline.syncedTitle': 'Sync complete',
  'offline.syncedBody': 'Saved to your account: {count}',

  // Log out (Profile)
  'offline.signOut.title': 'Log out',
  'offline.signOut.body': 'Are you sure you want to log out? You will need to sign in again.',
  'offline.signOut.unsynced':
    'You have unsaved changes on this phone ({count}). We will try to save them now. Anything that cannot be saved will be lost.',
  'offline.signOut.confirm': 'Log out',
} as const;
