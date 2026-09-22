import type { enOffline } from './offline.en';

/** Swahili strings: offline queue, sync and connectivity messages. Must define exactly the keys in offline.en.ts. */
export const swOffline: Record<keyof typeof enOffline, string> = {
  'offline.banner':
    'Uko nje ya mtandao. Mabadiliko yako yamehifadhiwa kwenye simu hii na yatasawazishwa ukiunganishwa tena.',
  'offline.pending': 'Yanasubiri kusawazishwa: {count}',
  'offline.syncing': 'Inasawazisha: {count}',
  'offline.failed': 'Imeshindwa kusawazisha: {count}',
  'offline.retry': 'Jaribu tena',
  'offline.viewQueue': 'Angalia',
  'offline.dismiss': 'Funga',

  'offline.syncedTitle': 'Usawazishaji umekamilika',
  'offline.syncedBody': 'Vilivyohifadhiwa kwenye akaunti yako: {count}',

  'offline.signOut.title': 'Ondoka',
  'offline.signOut.body': 'Una uhakika unataka kuondoka? Utahitaji kuingia tena.',
  'offline.signOut.unsynced':
    'Una mabadiliko ambayo hayajahifadhiwa kwenye akaunti yako bado ({count}). Tutajaribu kuyahifadhi sasa. Yale yasiyoweza kuhifadhiwa yatapotea.',
  'offline.signOut.confirm': 'Ondoka',
};
