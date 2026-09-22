/** English strings: profile, edit-profile, verification, legal, settings. Keys are `profile.<name>`. Mirror every key in profile.sw.ts. */
export const enProfile = {
  // ── Profile tab ────────────────────────────────────────────────────────────
  'profile.title': 'Profile',
  'profile.a11y.editProfile': 'Edit profile',
  'profile.a11y.openAgroId': 'Open Agro ID for {name}',
  'profile.a11y.languageHint': 'Switches the app between English and Kiswahili',
  'profile.a11y.opens': 'Opens this feature',
  'profile.a11y.signOutHint': 'Signs you out and returns to the sign-in screen',
  'profile.a11y.deleteHint': 'Permanently deletes your account and all your data',
  'profile.card.agroId': 'AGRO ID',
  'profile.card.certified': 'SANKOFA CERTIFIED',
  'profile.card.tier': 'Plan: {tier}',
  'profile.card.memberSince': 'Member since {date}',
  'profile.card.none.title': 'No Agro ID yet',
  'profile.card.none.body':
    'Create your Agro ID to keep your farm records, prices and verification in one place.',
  'profile.card.none.action': 'Set up Agro ID',
  'profile.section.account': 'Account',
  'profile.row.editProfile': 'Edit farm profile',
  'profile.row.verification': 'Identity verification',
  'profile.row.language': 'App language',
  'profile.row.notifications': 'Notifications',
  'profile.row.sync': 'Saved changes & sync',
  'profile.verification.verified': 'Verified',
  'profile.verification.pending': 'Under review',
  'profile.verification.rejected': 'Not approved — you can apply again',
  'profile.verification.unverified': 'Not verified yet',
  'profile.sync.clear': 'Everything is saved to your account',
  'profile.sync.pending': 'Waiting to sync: {count}',
  'profile.sync.failed': 'Could not sync: {count} — tap to review',
  'profile.signOut': 'Log out',
  'profile.delete.action': 'Delete account',
  'profile.delete.title': 'Delete account',
  'profile.delete.body':
    'This permanently deletes your account and all your data (financial records, Agro ID). This cannot be undone.',
  'profile.delete.confirm': 'Delete forever',
  'profile.delete.failedTitle': 'Deletion failed',
  'profile.delete.failedBody': 'Please try again. {detail}',

  // ── More / Zaidi (KIL-005) ─────────────────────────────────────────────────
  'profile.more.title': 'More',
  'profile.more.group.farm': 'Farm',
  'profile.more.group.money': 'Money & protection',
  'profile.more.group.advice': 'Advice & community',
  'profile.more.group.system': 'App & admin',
  'profile.more.map': 'Farm map',
  'profile.more.map.sub': 'Your fields on a map',
  'profile.more.cropPlanning': 'Crop planning',
  'profile.more.cropPlanning.sub': 'Plan the season and your rotations',
  'profile.more.calendar': 'Farm calendar',
  'profile.more.calendar.sub': 'Tasks and dates for the season',
  'profile.more.livestock': 'Livestock',
  'profile.more.livestock.sub': 'Animals, health and events',
  'profile.more.inventory': 'Inventory',
  'profile.more.inventory.sub': 'Seed, fertiliser and stock you hold',
  'profile.more.farmTwin': 'Digital farm twin',
  'profile.more.farmTwin.sub': 'Field-by-field view of your farm',
  'profile.more.iot': 'IoT & drone systems',
  'profile.more.iot.sub': 'Sensors and devices you have connected',
  'profile.more.soil': 'Soil analysis',
  'profile.more.soil.sub': 'Soil test results and advice',
  'profile.more.finance': 'Finance',
  'profile.more.finance.sub': 'Income, costs and profit',
  'profile.more.mobileMoney': 'Mobile money',
  'profile.more.mobileMoney.sub': 'M-Pesa and other payment records',
  'profile.more.insurance': 'Insurance',
  'profile.more.insurance.sub': 'Crop and livestock cover, claims',
  'profile.more.upgrade': 'Plans',
  'profile.more.upgrade.sub': 'Compare Kilimo AI plans',
  'profile.more.forecast': 'Weather forecast',
  'profile.more.forecast.sub': 'The coming days for your area',
  'profile.more.aiVoice': 'Voice assistant',
  'profile.more.aiVoice.sub': 'Ask Sankofa AI by speaking',
  'profile.more.consultations': 'Expert consultations',
  'profile.more.consultations.sub': 'Ask an agronomist or extension officer',
  'profile.more.peerGroups': 'Farmer groups',
  'profile.more.peerGroups.sub': 'Talk with farmers growing the same crops',
  'profile.more.aiTraining': 'Sankofa AI training',
  'profile.more.aiTraining.sub': 'Learn to get the most from the AI',
  'profile.more.videoHub': 'Video library',
  'profile.more.videoHub.sub': 'Farming videos and lessons',
  'profile.more.offlineQueue': 'Offline changes',
  'profile.more.offlineQueue.sub': 'Changes on this phone waiting to sync',
  'profile.more.walletAdmin': 'Wallet admin',
  'profile.more.walletAdmin.sub': 'Co-op member payouts and ledger',
  'profile.more.aiAdmin': 'AI admin',
  'profile.more.aiAdmin.sub': 'Administrator tools for the AI',
  'profile.more.privacy': 'Privacy policy',
  'profile.more.privacy.sub': 'How we use and protect your data',
  'profile.more.terms': 'Terms of service',
  'profile.more.terms.sub': 'The rules for using Kilimo AI',

  // ── Notifications ──────────────────────────────────────────────────────────
  'profile.notif.title': 'Notifications',
  'profile.notif.unreadCount': '{count} unread',
  'profile.notif.markAll': 'Mark all as read',
  'profile.notif.offline': 'You are offline. Showing the notifications saved on this phone.',
  'profile.notif.stale': 'Could not refresh. These may be out of date.',
  'profile.notif.actionFailed': 'That change was not saved. Check your connection and try again.',
  'profile.notif.empty.title': 'No notifications',
  'profile.notif.empty.body': 'Alerts about weather, markets and your tasks will appear here.',
  'profile.notif.error.title': 'Could not load notifications',
  'profile.notif.error.body': 'Check your connection and try again.',
  'profile.notif.signedOut.title': 'Sign in to see notifications',
  'profile.notif.signedOut.body': 'Notifications are linked to your account.',
  'profile.notif.unavailable.title': 'Notifications unavailable',
  'profile.notif.unavailable.body':
    'This build is not connected to a server, so there are no notifications.',
  'profile.notif.mode.realtime': 'New notifications appear automatically.',
  'profile.notif.mode.polling':
    'Checking for new notifications every minute. Pull down to check now.',
  'profile.notif.type.weather': 'Weather',
  'profile.notif.type.market': 'Market',
  'profile.notif.type.task': 'Task',
  'profile.notif.type.insight': 'Advice',
  'profile.notif.type.other': 'Update',
  'profile.notif.a11y.unread': 'Unread',
  'profile.notif.a11y.markReadHint': 'Marks this notification as read',
  'profile.notif.a11y.delete': 'Delete notification: {title}',

  // ── Offline queue ──────────────────────────────────────────────────────────
  'profile.queue.title': 'Offline changes',
  'profile.queue.subtitle': 'Waiting {pending} · Failed {failed}',
  'profile.queue.offlineBanner':
    'You are offline. These changes are safe on this phone and will sync when you reconnect.',
  'profile.queue.lastSynced': 'Last synced {time}',
  'profile.queue.neverSynced': 'Nothing has synced from this phone yet.',
  'profile.queue.empty.title': 'All changes are saved',
  'profile.queue.empty.body':
    'Nothing is waiting on this phone. Everything has reached your account.',
  'profile.queue.syncNow': 'Sync now',
  'profile.queue.syncing': 'Syncing…',
  'profile.queue.retryFailed': 'Retry failed ({count})',
  'profile.queue.section.failed': 'Could not sync',
  'profile.queue.section.pending': 'Waiting to sync',
  'profile.queue.failedHelp':
    'These changes stopped after repeated errors. Retry them, or discard any you no longer need.',
  'profile.queue.status.pending': 'Waiting',
  'profile.queue.status.failed': 'Failed',
  'profile.queue.saved': 'Saved {time}',
  'profile.queue.attempts': 'Attempts {count} of {max}',
  'profile.queue.op.insert': 'New',
  'profile.queue.op.update': 'Edit',
  'profile.queue.op.delete': 'Delete',
  'profile.queue.table.tasks': 'Task',
  'profile.queue.table.farms': 'Farm',
  'profile.queue.table.plots': 'Field',
  'profile.queue.table.finance': 'Finance record',
  'profile.queue.table.payments': 'Payment record',
  'profile.queue.table.livestock': 'Livestock record',
  'profile.queue.table.inventory': 'Inventory record',
  'profile.queue.table.market': 'Market listing',
  'profile.queue.table.community': 'Group post',
  'profile.queue.table.consultations': 'Consultation request',
  'profile.queue.table.devices': 'Device record',
  'profile.queue.table.insurance': 'Insurance record',
  'profile.queue.table.other': 'Record',
  'profile.queue.reason.unsupported':
    'This version of the app cannot send this change. Update the app.',
  'profile.queue.reason.invalid':
    'The server rejected this change because some details are not valid.',
  'profile.queue.reason.missing':
    'The record this change belongs to no longer exists on your account.',
  'profile.queue.reason.permission':
    'Your account is not allowed to make this change. Try signing in again.',
  'profile.queue.reason.conflict':
    'This change conflicts with data already saved (for example a duplicate).',
  'profile.queue.reason.network': 'Could not reach the server. It will be retried.',
  'profile.queue.discard.title': 'Discard this change?',
  'profile.queue.discard.body':
    'It has not reached your account. If you discard it, it is deleted from this phone and cannot be recovered.',
  'profile.queue.discard.confirm': 'Discard',
  'profile.queue.discard.a11y': 'Discard change: {item}',
  'profile.queue.msg.offline': 'You are offline. Connect to the internet to sync.',
  'profile.queue.msg.noSession': 'Sign in again to sync these changes.',
  'profile.queue.msg.noBackend': 'This build is not connected to a server, so changes cannot sync.',
  'profile.queue.msg.synced': 'Saved to your account: {count}',
  'profile.queue.msg.partial': 'Saved {synced}. Still on this phone: {left}.',
  'profile.queue.msg.retrying': 'Trying again: {count}',
  'profile.queue.msg.discarded': 'Change discarded.',

  // ── Edit profile ───────────────────────────────────────────────────────────
  'profile.edit.title': 'Edit farm profile',
  'profile.edit.sub': 'Changes refine your AI recommendations immediately',
  'profile.edit.name': 'Full name',
  'profile.edit.namePh': 'e.g. Amina Juma',
  'profile.edit.nameErr': 'Name must be at least 2 characters',
  'profile.edit.nameHint': 'Enter your full name of two or more characters',
  'profile.edit.role': 'Role',
  'profile.edit.region': 'Region',
  'profile.edit.regionErr': 'Choose your region',
  'profile.edit.crops': 'Primary crops (pick up to {max})',
  'profile.edit.cropsErr': 'Select at least one crop',
  'profile.edit.cropsMax': '{max} crops selected — the maximum',
  'profile.edit.size': 'Farm size (acres)',
  'profile.edit.sizeHint': 'Enter the size of your farm in acres',
  'profile.edit.activity': 'Main activity',
  'profile.edit.activity.crops': 'Crops',
  'profile.edit.activity.livestock': 'Livestock',
  'profile.edit.activity.mixed': 'Mixed',
  'profile.edit.livestock': 'Raise livestock?',
  'profile.edit.irrigation': 'Have irrigation?',
  'profile.edit.language': 'App language',
  'profile.edit.appearance': 'Appearance',
  'profile.edit.theme.system': 'System',
  'profile.edit.theme.light': 'Light',
  'profile.edit.theme.dark': 'Dark',
  'profile.edit.save': 'Save changes',
  'profile.edit.unsaved': 'Unsaved changes',
  'profile.edit.unsavedHint': 'You have unsaved changes',
  'profile.edit.discard.title': 'Discard changes?',
  'profile.edit.discard.body': 'Your unsaved changes will be lost.',
  'profile.edit.discard.keep': 'Keep editing',
  'profile.edit.discard.confirm': 'Discard',
  'profile.edit.saved.title': 'Profile saved',
  'profile.edit.saved.body': 'AI recommendations will use your updated profile.',
  'profile.edit.syncFailed.title': 'Sync failed',
  'profile.edit.syncFailed.body': 'Profile saved on this phone but could not sync online.',

  // ── Verification (KYC) ─────────────────────────────────────────────────────
  'profile.verify.step': 'Step {step} of {total}',
  'profile.verify.intro.title': 'Verify your identity',
  'profile.verify.intro.body':
    'Financial features such as the co-op wallet and contracts need a verified identity. A reviewer checks the details you send.',
  'profile.verify.intro.needTitle': 'What you will need',
  'profile.verify.intro.needId': 'Your NIDA number or passport number',
  'profile.verify.intro.needBusiness':
    'Business name, TIN and BRELA registration number (only if you have a business)',
  'profile.verify.intro.review':
    'A person reviews your request. You can check its status in Profile at any time.',
  'profile.verify.intro.consent':
    'I agree that Kilimo AI may process these details to verify my identity, as described in the privacy policy.',
  'profile.verify.intro.privacyLink': 'Read the privacy policy',
  'profile.verify.intro.start': 'Start verification',
  'profile.verify.personal.title': 'Personal details',
  'profile.verify.personal.body':
    'Enter your NIDA number (20 digits) or your passport number, exactly as it appears on the document.',
  'profile.verify.personal.idLabel': 'NIDA or passport number',
  'profile.verify.personal.idHint': 'Dashes and spaces are fine',
  'profile.verify.personal.idError':
    'Enter a 20-digit NIDA number or a 6–12 character passport number',
  'profile.verify.personal.continue': 'Continue',
  'profile.verify.business.title': 'Business details',
  'profile.verify.business.body':
    'Only fill these in if you farm or trade as a registered business. Leave them empty to verify as an individual.',
  'profile.verify.business.nameLabel': 'Business name (optional)',
  'profile.verify.business.tinLabel': 'TIN (optional)',
  'profile.verify.business.tinHint': '9 digits, e.g. 123-456-789',
  'profile.verify.business.tinError': 'A TIN has 9 digits',
  'profile.verify.business.regLabel': 'BRELA registration number (optional)',
  'profile.verify.business.missingId': 'Your ID number is missing. Go back and enter it first.',
  'profile.verify.business.goBack': 'Enter ID number',
  'profile.verify.business.submit': 'Submit for review',
  'profile.verify.business.submitting': 'Submitting…',
  'profile.verify.error.notConfigured':
    'This build is not connected to a server, so verification cannot be submitted.',
  'profile.verify.error.offline':
    'You are offline. Connect to the internet to submit. Nothing was sent.',
  'profile.verify.error.signedOut': 'Sign in to your account to verify your identity.',
  'profile.verify.error.server': 'Your request was not submitted. Please try again.',
  'profile.verify.status.title': 'Verification status',
  'profile.verify.status.unavailable.title': 'Verification unavailable',
  'profile.verify.status.signedOut.title': 'Not signed in',
  'profile.verify.status.error.title': 'Could not load your status',
  'profile.verify.status.none.title': 'No request yet',
  'profile.verify.status.none.body': 'You have not submitted identity details for review.',
  'profile.verify.status.pending.title': 'Under review',
  'profile.verify.status.pending.body':
    'Your details were received and are waiting for a reviewer. Pull down to check for an update.',
  'profile.verify.status.verified.title': 'Verified',
  'profile.verify.status.verified.body': 'Your identity has been verified.',
  'profile.verify.status.rejected.title': 'Not approved',
  'profile.verify.status.rejected.body': 'The reviewer could not approve this request.',
  'profile.verify.status.reviewerNote': 'Reviewer note: {note}',
  'profile.verify.status.resubmit': 'Submit new details',
  'profile.verify.status.submitted': 'Submitted {time}',
  'profile.verify.status.typePersonal': 'Individual',
  'profile.verify.status.typeBusiness': 'Business',

  // ── Wallet admin ───────────────────────────────────────────────────────────
  'profile.walletAdmin.title': 'Wallet admin',
  'profile.walletAdmin.denied.title': 'Not available for your role',
  'profile.walletAdmin.denied.body':
    'Wallet admin is only for co-op leaders and commercial administrators.',
  'profile.walletAdmin.unavailable.title': 'Not available yet',
  'profile.walletAdmin.unavailable.body':
    'Managing member balances, payout approvals and the co-op M-Pesa ledger needs a wallet service that Kilimo AI does not have yet.',
  'profile.walletAdmin.unavailable.caption':
    'Nothing here is shown until it comes from real records.',
  'profile.walletAdmin.unavailable.finance': 'Open my finance records',

  // ── Legal (canonical: /legal/privacy, /legal/terms) ────────────────────────
  'profile.legal.updated': 'Last updated: 25 May 2026 · Effective: 25 May 2026',
  'profile.legal.translationNotice':
    'This is a Kiswahili translation. If it differs from the English version, the English version applies.',

  'profile.legal.privacy.title': 'Privacy policy',
  'profile.legal.privacy.intro':
    'KILIMO AI ("we", "our", "us") is operated by Kilimo AI Ltd., a company registered in Tanzania. This policy explains how we collect, use, store and share your personal information when you use the KILIMO AI mobile app ("App"). By using the App, you agree to the practices described below.',
  'profile.legal.privacy.s1.title': 'Who is responsible for your data',
  'profile.legal.privacy.s1.body':
    'Kilimo AI Ltd., Dar es Salaam, Tanzania, is the data controller for your personal information. Contact: privacy@kilimo.ai.',
  'profile.legal.privacy.s2.title': 'Information we collect',
  'profile.legal.privacy.s2.body':
    'a) Account and identity: your name, phone number and Agro ID. If you apply for identity verification, your NIDA or passport number and, for businesses, business name, TIN and BRELA number.\nb) Farm profile: region, district, farm size, main crops, livestock and irrigation.\nc) Location: region or district for weather and prices. GPS is used only in the Farm Map feature, and only while the App is open.\nd) Farm activity: crop photos and AI diagnosis results, tasks, market listings, contracts and livestock records.\ne) Voice: recordings made with the Sankofa AI voice feature, used only to transcribe what you said.\nf) Financial: records you enter and the mobile money number you choose to link. We never store your M-Pesa PIN.\ng) Device and diagnostics: device type, operating system and app version. Where crash reporting is enabled, anonymised crash diagnostics (via Sentry). We do not use advertising or behavioural analytics.',
  'profile.legal.privacy.s3.title': 'How we use your data',
  'profile.legal.privacy.s3.body':
    'To create and manage your Agro ID account; give AI crop diagnosis, farming advice and market information; show weather for your region; record payments and co-operative activity; send in-app notifications and, with your consent, SMS alerts; verify identity when you apply; improve our AI using anonymised, aggregated farm data; meet our legal duties under Tanzanian law; and prevent fraud and keep the platform secure.',
  'profile.legal.privacy.s4.title': 'Legal basis for processing',
  'profile.legal.privacy.s4.body':
    'Contract: to provide the services you signed up for. Legitimate interests: to improve the App, detect fraud and keep it secure. Consent: for SMS alerts, voice recording, camera access and identity verification — you may withdraw consent at any time. Legal obligation: to meet the requirements of Tanzanian law.',
  'profile.legal.privacy.s5.title': 'Third-party services',
  'profile.legal.privacy.s5.body':
    "OpenAI (USA): crop photos and chat messages are sent for AI analysis; we do not send your name or phone number with them. Supabase (USA/EU): our database and sign-in provider. Africa's Talking (Kenya): delivers SMS alerts when enabled. Mobile money providers: process payments you start. OpenWeatherMap (USA): weather for your region. We do not sell your personal data.",
  'profile.legal.privacy.s6.title': 'Camera, microphone and location',
  'profile.legal.privacy.s6.body':
    "Camera and photo library: to diagnose crop photos. Microphone: for voice questions to Sankofa AI; audio is used only for transcription. Location: for the Farm Map and precise weather; if you refuse, region-level weather still works. You can withdraw any permission in your phone's settings.",
  'profile.legal.privacy.s7.title': 'How long we keep data',
  'profile.legal.privacy.s7.body':
    'Account data: while your account is active, plus up to 90 days after you ask for deletion. Crop photos: not kept unless you save the result. Voice recordings: deleted after transcription. Farm activity records: up to 3 years, for yield history. Financial records: 7 years, as Tanzanian financial rules require. Crash diagnostics: up to 90 days at Sentry.',
  'profile.legal.privacy.s8.title': 'Your rights',
  'profile.legal.privacy.s8.body':
    'You may ask to access, correct or delete your data, receive your farm data in a machine-readable format (CSV/JSON), object to processing based on legitimate interests, and withdraw consent at any time. Email privacy@kilimo.ai; we reply within 30 days. You can delete your account yourself in Profile → Delete account.',
  'profile.legal.privacy.s9.title': 'Security',
  'profile.legal.privacy.s9.body':
    "Data between the App and our servers is encrypted in transit (TLS). Sign-in tokens are kept in your phone's secure keychain. Agro IDs are random identifiers. Access to production data is limited to authorised staff. If a breach affects your rights, we will tell you within 72 hours as the law requires.",
  'profile.legal.privacy.s10.title': 'Children',
  'profile.legal.privacy.s10.body':
    'KILIMO AI is not meant for children under 16 and we do not knowingly collect their data. If you believe a child has registered, contact privacy@kilimo.ai and we will delete the account.',
  'profile.legal.privacy.s11.title': 'Transfers outside Tanzania',
  'profile.legal.privacy.s11.body':
    'Your data may be processed outside Tanzania, including in the USA and EU, where our providers operate. We use appropriate safeguards, such as Standard Contractual Clauses, where required.',
  'profile.legal.privacy.s12.title': 'Cookies and diagnostics',
  'profile.legal.privacy.s12.body':
    'The mobile app does not use browser cookies or advertising analytics. Where crash reporting is enabled, anonymised crash diagnostics are collected only to fix problems.',
  'profile.legal.privacy.s13.title': 'SMS alerts',
  'profile.legal.privacy.s13.body':
    "If you enable SMS alerts, we send critical farm alerts (for example disease or severe weather warnings) to your phone number. To stop SMS alerts, contact privacy@kilimo.ai. Your carrier's normal message rates may apply.",
  'profile.legal.privacy.s14.title': 'AI advice',
  'profile.legal.privacy.s14.body':
    'Crop diagnoses, market predictions and farming advice come from AI models and are for information only. They do not replace a qualified agronomist. We are not liable for decisions based only on AI recommendations.',
  'profile.legal.privacy.s15.title': 'Changes and complaints',
  'profile.legal.privacy.s15.body':
    'We will tell you in the App about material changes and update the date above. For questions or to use your rights, email privacy@kilimo.ai. If you are not satisfied with our answer, you may complain to the Personal Data Protection Commission of Tanzania or another competent authority.',

  'profile.legal.terms.title': 'Terms of service',
  'profile.legal.terms.intro':
    'These Terms are a legally binding agreement between you and Kilimo AI Ltd. ("KILIMO AI", "we", "us") for your use of the KILIMO AI mobile app ("App"). By registering or using any feature of the App you confirm that you have read, understood and agree to these Terms.',
  'profile.legal.terms.s1.title': 'Acceptance',
  'profile.legal.terms.s1.body':
    'By creating an Agro ID or using the App you agree to these Terms and to our Privacy Policy. If you do not agree, do not use the App. Continued use after we notify you of changes means you accept them.',
  'profile.legal.terms.s2.title': 'Eligibility',
  'profile.legal.terms.s2.body':
    'You must be at least 18 years old. Financial features need a verified identity. Accounts for co-operatives or agribusinesses must be opened by an authorised representative.',
  'profile.legal.terms.s3.title': 'Our services',
  'profile.legal.terms.s3.body':
    'Sankofa AI farming advice in Kiswahili and English; AI crop diagnosis from photos; market price information; contract, task, inventory and livestock records; the Agro ID farming identity; payment records and mobile money integration; and weather information. Availability may depend on your plan and location.',
  'profile.legal.terms.s4.title': 'Your account and Agro ID',
  'profile.legal.terms.s4.body':
    'Keep your sign-in details private and give accurate information. You are responsible for activity on your account. Tell us at support@kilimo.ai if you suspect unauthorised access. We may suspend accounts that give false information or break these Terms.',
  'profile.legal.terms.s5.title': 'Permitted use',
  'profile.legal.terms.s5.body':
    'Use the App only for lawful farm management and advice, in line with Tanzanian law. Treat AI results as advice, not as professional agricultural or legal advice, and respect the intellectual property of KILIMO AI and others.',
  'profile.legal.terms.s6.title': 'Prohibited use',
  'profile.legal.terms.s6.body':
    "Do not submit false or fraudulent data; reverse-engineer the App; use bots or scrapers; upload illegal content or content that violates others' rights; get around plan limits or access controls; manipulate market prices or spread false market information; share your credentials; or harm our servers or network.",
  'profile.legal.terms.s7.title': 'AI disclaimer and limitation of liability',
  'profile.legal.terms.s7.body':
    'AI diagnoses, forecasts, market predictions and advice are for information only and may be wrong or incomplete. Check important treatment decisions with a qualified agronomist. Market data comes from third parties and may be delayed. KILIMO AI is not liable for crop, financial or other losses from relying on AI output. To the extent the law allows, our total liability is limited to what you paid us in the 12 months before the claim.',
  'profile.legal.terms.s8.title': 'Plans and payment',
  'profile.legal.terms.s8.body':
    "KILIMO AI may offer Free, Premium and Cooperative plans. Paid plans are billed at the prices shown in the App, through supported payment methods, and renew unless cancelled at least 24 hours before renewal. Partial periods are not refunded except where Tanzanian law requires. We give 30 days' notice of price changes.",
  'profile.legal.terms.s9.title': 'Intellectual property',
  'profile.legal.terms.s9.body':
    'The App, its software, AI models, trademarks and design belong to Kilimo AI Ltd. or its licensors. You get a limited, non-exclusive, non-transferable licence to use it. Farm data you enter stays yours; you allow us to use it in anonymised, aggregated form to improve our AI.',
  'profile.legal.terms.s10.title': 'Third-party services',
  'profile.legal.terms.s10.body':
    "The App uses third-party services including OpenAI, Supabase, Africa's Talking, mobile money providers and OpenWeatherMap. Their own terms apply, and we are not responsible for their availability or conduct.",
  'profile.legal.terms.s11.title': 'Data and privacy',
  'profile.legal.terms.s11.body':
    'Our Privacy Policy is part of these Terms. By using the App you agree to the use of your data as it describes.',
  'profile.legal.terms.s12.title': 'Availability and changes to the service',
  'profile.legal.terms.s12.body':
    'We do not promise the App will always be available or error-free. We may change, suspend or end features with reasonable notice and will try to announce planned maintenance. We are not liable for outages beyond our reasonable control.',
  'profile.legal.terms.s13.title': 'Ending your account',
  'profile.legal.terms.s13.body':
    'You can delete your account at any time in Profile → Delete account. We may suspend or close accounts that break these Terms, commit fraud or create a security risk. Financial records are kept for 7 years as the law requires. Sections 7, 9, 14 and 15 continue after termination.',
  'profile.legal.terms.s14.title': 'Disputes',
  'profile.legal.terms.s14.body':
    'We will first try to settle any dispute in good faith. If that fails within 30 days, it goes to mediation under the rules of the Tanzania Institute of Arbitrators, and then to arbitration in Dar es Salaam under the UNCITRAL Arbitration Rules. Either party may still seek urgent relief from a competent court.',
  'profile.legal.terms.s15.title': 'Governing law',
  'profile.legal.terms.s15.body':
    'These Terms are governed by the laws of the United Republic of Tanzania. The courts of Dar es Salaam have jurisdiction over matters not subject to arbitration.',
  'profile.legal.terms.s16.title': 'No warranties',
  'profile.legal.terms.s16.body':
    'To the extent the law allows, the App is provided "as is" and "as available", without warranties of any kind, including merchantability, fitness for a particular purpose and non-infringement. We do not promise that it will be error-free, secure or uninterrupted.',
  'profile.legal.terms.s17.title': 'Changes and contact',
  'profile.legal.terms.s17.body':
    "We give at least 14 days' notice in the App of material changes. Using the App after they take effect means you accept them. Questions: legal@kilimo.ai, Kilimo AI Ltd., Dar es Salaam, Tanzania.",
  'profile.agroId.title': 'Agro ID',
  'profile.agroId.offline': 'You are offline. Showing what was last loaded.',
  'profile.agroId.qr.open': 'Show verification QR',
  'profile.agroId.qr.unavailable':
    'Verification is not available until the app is connected to the Kilimo server.',
  'profile.agroId.qr.title': 'Verification QR',
  'profile.agroId.qr.a11y': 'QR code that verifies this Agro ID',
  'profile.agroId.qr.body':
    'A bank, buyer or cooperative can scan this to confirm your Agro ID exists and see a summary of your record: how many entries, since when, and a net income band. It never shows your name, phone or individual transactions. Your entries are self-reported.',
  'profile.agroId.credit.title': 'Credit readiness estimate',
  'profile.agroId.credit.a11y': 'Estimated score {score}, {band}',
  'profile.agroId.credit.range': 'Scale 300–850, computed on this phone from your own records.',
  'profile.agroId.credit.empty':
    'Record your income and expenses to build an estimate. It is computed only from what you enter.',
  'profile.agroId.credit.disclaimer':
    'An estimate from your self-reported records, not a lender’s decision and not financial advice.',
  'profile.agroId.ledger.title': 'Income and expenses',
  'profile.agroId.ledger.income': 'Income',
  'profile.agroId.ledger.expense': 'Expenses',
  'profile.agroId.ledger.net': 'Net',
  'profile.agroId.ledger.recent': 'Recent entries',
  'profile.agroId.ledger.empty': 'No entries yet. Add them on the Finance screen.',
  'profile.agroId.ledger.open': 'Open Finance ledger',
  'profile.agroId.export.button': 'Export P&L as PDF',
  'profile.agroId.export.period': '{from} – {to}',
  'profile.agroId.export.failed': 'Could not create the PDF. Please try again.',
  'profile.more.vra': "Input planner",
  'profile.more.vra.sub': "Work out seed and fertiliser for a plot",
} as const;
