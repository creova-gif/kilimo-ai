/**
 * English resources. `sw.ts` MUST define exactly the same keys — enforced by
 * __tests__/i18n.parity.test.ts. Add new strings here first, then in sw.ts.
 * Keys are namespaced: `<area>.<name>`. Use {param} placeholders.
 */
export const en = {
  // Generic actions
  'common.continue': 'Continue',
  'common.back': 'Back',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.retry': 'Try again',
  'common.close': 'Close',
  'common.done': 'Done',
  'common.seeAll': 'See all',

  // Loading / empty / error / offline states (shared by every screen)
  'state.loading': 'Loading…',
  'state.empty.title': 'Nothing here yet',
  'state.error.title': 'Something went wrong',
  'state.error.body': 'We could not load this. Check your connection and try again.',
  'state.offline.banner': 'You are offline. Changes will sync when you reconnect.',
  'state.offline.lastSynced': 'Last synced {time}',
  'state.stale': 'This data may be out of date',
  'state.unavailable.title': 'Service unavailable',
  'state.unavailable.body': 'This feature is temporarily unavailable. Please try again later.',

  // Auth
  'auth.notConfigured':
    'Sign-in is not available: this build is not configured with a backend.',
  'auth.invalidCode': 'That code is not valid or has expired.',
  'auth.rateLimited': 'Too many attempts. Please wait a moment and try again.',
  'auth.network': 'No connection. Check your internet and try again.',

  // Permissions
  'permission.camera.title': 'Camera access needed',
  'permission.camera.body': 'Allow camera access to scan your crops for problems.',
  'permission.location.title': 'Location access needed',
  'permission.location.body': 'Allow location access to show weather and map for your farm.',
  'permission.notifications.title': 'Notifications are off',
  'permission.notifications.body': 'Turn on notifications to receive alerts about your farm.',
  'permission.openSettings': 'Open settings',

  // AI diagnosis (never fabricate results — these are the honest failure states)
  'ai.unavailable': 'AI diagnosis is unavailable right now.',
  'ai.lowConfidence': 'Low confidence. Retake the photo or ask an extension officer.',
  'ai.blurry': 'The photo is blurry. Hold steady and retake it.',
  'ai.noPlant': 'No plant detected. Frame the affected leaf and try again.',
  'ai.unsupportedCrop': 'This crop is not supported yet.',

  // Navigation
  'nav.home': 'Home',
  'nav.farm': 'Farm',
  'nav.ai': 'Ask AI',
  'nav.market': 'Market',
  'nav.me': 'Me',

  // Dashboard ("Today")
  'dash.greeting': 'Hello, {name}',
  'dash.notifications': 'Notifications',
  'dash.notifications.unread': 'Notifications, {count} unread',
  'dash.verify.title': 'Verify your Agro ID',
  'dash.verify.body': 'Add your ID so buyers and banks can trust your profile.',
  'dash.verify.action': 'Verify now',
  'dash.verify.pending.title': 'Verification in review',
  'dash.verify.pending.body': 'We received your ID. A reviewer will confirm it.',
  'dash.weather.title': 'Weather',
  'dash.weather.unconfigured': 'Weather is not set up on this device yet.',
  'dash.weather.error': 'Could not load the weather.',
  'dash.weather.humidity': 'Humidity {value}%',
  'dash.weather.wind': 'Wind {value} km/h',
  'dash.weather.feelsLike': 'Feels like {value}°',
  'dash.tasks.title': "Today's tasks",
  'dash.tasks.empty.title': 'No tasks yet',
  'dash.tasks.empty.body': 'Add a task to plan your day on the farm.',
  'dash.tasks.add': 'Add task',
  'dash.tasks.error': 'Could not load your tasks.',
  'dash.tasks.markDone': 'Mark "{title}" as done',
  'dash.farm.title': 'Your farm',
  'dash.farm.size': '{acres} acres',
  'dash.farm.empty.title': 'Set up your farm',
  'dash.farm.empty.body': 'Add your region and crops to get relevant advice.',
  'dash.farm.edit': 'Edit farm',
  'dash.quick.title': 'Quick actions',
  'dash.quick.scan': 'Scan crop',
  'dash.quick.calendar': 'Calendar',
  'dash.quick.tasks': 'Tasks',
  'dash.quick.market': 'Market',
  'dash.quick.finance': 'Finance',
  'dash.quick.soil': 'Soil',
  'dash.quick.analytics': 'Analytics',
  'dash.quick.weather': 'Forecast',
  'dash.ai.title': 'Ask Kilimo AI',
  'dash.ai.body': 'Ask about your crops, pests or prices.',
  'dash.ai.action': 'Ask a question',
} as const;

export type TranslationKey = keyof typeof en;
