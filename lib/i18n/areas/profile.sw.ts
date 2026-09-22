import type { enProfile } from './profile.en';

/** Swahili strings: profile, edit-profile, verification, legal, settings. Must define exactly the keys in profile.en.ts. */
export const swProfile: Record<keyof typeof enProfile, string> = {
  // ── Profile tab ────────────────────────────────────────────────────────────
  'profile.title': 'Wasifu',
  'profile.a11y.editProfile': 'Hariri wasifu',
  'profile.a11y.openAgroId': 'Fungua Agro ID ya {name}',
  'profile.a11y.languageHint': 'Hubadilisha lugha ya programu kati ya Kiingereza na Kiswahili',
  'profile.a11y.opens': 'Hufungua huduma hii',
  'profile.a11y.signOutHint': 'Hukutoa kwenye akaunti na kurudi kwenye skrini ya kuingia',
  'profile.a11y.deleteHint': 'Hufuta kabisa akaunti yako na taarifa zako zote',
  'profile.card.agroId': 'AGRO ID',
  'profile.card.certified': 'AMETHIBITISHWA NA SANKOFA',
  'profile.card.tier': 'Kifurushi: {tier}',
  'profile.card.memberSince': 'Mwanachama tangu {date}',
  'profile.card.none.title': 'Bado huna Agro ID',
  'profile.card.none.body':
    'Tengeneza Agro ID yako ili rekodi za shamba, bei na uhakiki wako viwe sehemu moja.',
  'profile.card.none.action': 'Tengeneza Agro ID',
  'profile.section.account': 'Akaunti',
  'profile.row.editProfile': 'Hariri wasifu wa shamba',
  'profile.row.verification': 'Uhakiki wa utambulisho',
  'profile.row.language': 'Lugha ya programu',
  'profile.row.notifications': 'Arifa',
  'profile.row.sync': 'Mabadiliko yaliyohifadhiwa na usawazishaji',
  'profile.verification.verified': 'Umethibitishwa',
  'profile.verification.pending': 'Inakaguliwa',
  'profile.verification.rejected': 'Haikukubaliwa — unaweza kuomba tena',
  'profile.verification.unverified': 'Bado hujathibitishwa',
  'profile.sync.clear': 'Kila kitu kimehifadhiwa kwenye akaunti yako',
  'profile.sync.pending': 'Yanasubiri kusawazishwa: {count}',
  'profile.sync.failed': 'Hayakusawazishwa: {count} — gusa ili kukagua',
  'profile.signOut': 'Ondoka',
  'profile.delete.action': 'Futa akaunti',
  'profile.delete.title': 'Futa akaunti',
  'profile.delete.body':
    'Hii itafuta kabisa akaunti yako na taarifa zako zote (rekodi za fedha, Agro ID). Haiwezi kutenduliwa.',
  'profile.delete.confirm': 'Futa kabisa',
  'profile.delete.failedTitle': 'Kufuta kumeshindikana',
  'profile.delete.failedBody': 'Tafadhali jaribu tena. {detail}',

  // ── More / Zaidi (KIL-005) ─────────────────────────────────────────────────
  'profile.more.title': 'Zaidi',
  'profile.more.group.farm': 'Shamba',
  'profile.more.group.money': 'Fedha na kinga',
  'profile.more.group.advice': 'Ushauri na jamii',
  'profile.more.group.system': 'Programu na usimamizi',
  'profile.more.map': 'Ramani ya shamba',
  'profile.more.map.sub': 'Mashamba yako kwenye ramani',
  'profile.more.cropPlanning': 'Mpango wa mazao',
  'profile.more.cropPlanning.sub': 'Panga msimu na mzunguko wa mazao',
  'profile.more.calendar': 'Kalenda ya shamba',
  'profile.more.calendar.sub': 'Kazi na tarehe za msimu',
  'profile.more.livestock': 'Mifugo',
  'profile.more.livestock.sub': 'Wanyama, afya na matukio',
  'profile.more.inventory': 'Stoo',
  'profile.more.inventory.sub': 'Mbegu, mbolea na bidhaa ulizonazo',
  'profile.more.farmTwin': 'Pacha wa kidijitali wa shamba',
  'profile.more.farmTwin.sub': 'Mwonekano wa shamba lako kipande kwa kipande',
  'profile.more.iot': 'Mifumo ya IoT na droni',
  'profile.more.iot.sub': 'Vihisi na vifaa ulivyounganisha',
  'profile.more.soil': 'Uchambuzi wa udongo',
  'profile.more.soil.sub': 'Matokeo ya kipimo cha udongo na ushauri',
  'profile.more.finance': 'Fedha',
  'profile.more.finance.sub': 'Mapato, gharama na faida',
  'profile.more.mobileMoney': 'Pesa kwa simu',
  'profile.more.mobileMoney.sub': 'Rekodi za M-Pesa na malipo mengine',
  'profile.more.insurance': 'Bima',
  'profile.more.insurance.sub': 'Bima ya mazao na mifugo, madai',
  'profile.more.upgrade': 'Vifurushi',
  'profile.more.upgrade.sub': 'Linganisha vifurushi vya Kilimo AI',
  'profile.more.forecast': 'Utabiri wa hali ya hewa',
  'profile.more.forecast.sub': 'Siku zijazo katika eneo lako',
  'profile.more.aiVoice': 'Msaidizi wa sauti',
  'profile.more.aiVoice.sub': 'Muulize Sankofa AI kwa kuongea',
  'profile.more.consultations': 'Ushauri wa wataalamu',
  'profile.more.consultations.sub': 'Muulize mtaalamu wa kilimo au afisa ugani',
  'profile.more.peerGroups': 'Vikundi vya wakulima',
  'profile.more.peerGroups.sub': 'Ongea na wakulima wanaolima mazao kama yako',
  'profile.more.aiTraining': 'Mafunzo ya Sankofa AI',
  'profile.more.aiTraining.sub': 'Jifunze kutumia AI kikamilifu',
  'profile.more.videoHub': 'Maktaba ya video',
  'profile.more.videoHub.sub': 'Video na masomo ya kilimo',
  'profile.more.offlineQueue': 'Mabadiliko ya nje ya mtandao',
  'profile.more.offlineQueue.sub': 'Mabadiliko kwenye simu hii yanayosubiri kusawazishwa',
  'profile.more.walletAdmin': 'Usimamizi wa pochi',
  'profile.more.walletAdmin.sub': 'Malipo ya wanachama wa ushirika na leja',
  'profile.more.aiAdmin': 'Usimamizi wa AI',
  'profile.more.aiAdmin.sub': 'Zana za msimamizi wa AI',
  'profile.more.privacy': 'Sera ya faragha',
  'profile.more.privacy.sub': 'Jinsi tunavyotumia na kulinda taarifa zako',
  'profile.more.terms': 'Vigezo na masharti',
  'profile.more.terms.sub': 'Kanuni za kutumia Kilimo AI',

  // ── Notifications ──────────────────────────────────────────────────────────
  'profile.notif.title': 'Arifa',
  'profile.notif.unreadCount': 'Hazijasomwa {count}',
  'profile.notif.markAll': 'Weka zote kama zimesomwa',
  'profile.notif.offline': 'Huna mtandao. Zinaonyeshwa arifa zilizohifadhiwa kwenye simu hii.',
  'profile.notif.stale': 'Imeshindwa kusasisha. Huenda hizi si za karibuni.',
  'profile.notif.actionFailed':
    'Mabadiliko hayo hayakuhifadhiwa. Angalia mtandao kisha ujaribu tena.',
  'profile.notif.empty.title': 'Hakuna arifa',
  'profile.notif.empty.body': 'Tahadhari za hali ya hewa, masoko na kazi zako zitaonekana hapa.',
  'profile.notif.error.title': 'Imeshindwa kupakia arifa',
  'profile.notif.error.body': 'Angalia mtandao wako kisha ujaribu tena.',
  'profile.notif.signedOut.title': 'Ingia ili kuona arifa',
  'profile.notif.signedOut.body': 'Arifa zimeunganishwa na akaunti yako.',
  'profile.notif.unavailable.title': 'Arifa hazipatikani',
  'profile.notif.unavailable.body': 'Toleo hili halijaunganishwa na seva, kwa hiyo hakuna arifa.',
  'profile.notif.mode.realtime': 'Arifa mpya zinaonekana zenyewe.',
  'profile.notif.mode.polling':
    'Tunaangalia arifa mpya kila dakika. Vuta chini ili kuangalia sasa.',
  'profile.notif.type.weather': 'Hali ya hewa',
  'profile.notif.type.market': 'Soko',
  'profile.notif.type.task': 'Kazi',
  'profile.notif.type.insight': 'Ushauri',
  'profile.notif.type.other': 'Taarifa',
  'profile.notif.a11y.unread': 'Haijasomwa',
  'profile.notif.a11y.markReadHint': 'Huweka arifa hii kama imesomwa',
  'profile.notif.a11y.delete': 'Futa arifa: {title}',

  // ── Offline queue ──────────────────────────────────────────────────────────
  'profile.queue.title': 'Mabadiliko ya nje ya mtandao',
  'profile.queue.subtitle': 'Yanasubiri {pending} · Yameshindwa {failed}',
  'profile.queue.offlineBanner':
    'Huna mtandao. Mabadiliko haya yako salama kwenye simu hii na yatasawazishwa ukiunganishwa tena.',
  'profile.queue.lastSynced': 'Ilisawazishwa mwisho {time}',
  'profile.queue.neverSynced': 'Bado hakuna kilichosawazishwa kutoka simu hii.',
  'profile.queue.empty.title': 'Mabadiliko yote yamehifadhiwa',
  'profile.queue.empty.body':
    'Hakuna kinachosubiri kwenye simu hii. Kila kitu kimefika kwenye akaunti yako.',
  'profile.queue.syncNow': 'Sawazisha sasa',
  'profile.queue.syncing': 'Inasawazisha…',
  'profile.queue.retryFailed': 'Jaribu tena yaliyoshindwa ({count})',
  'profile.queue.section.failed': 'Hayakusawazishwa',
  'profile.queue.section.pending': 'Yanasubiri kusawazishwa',
  'profile.queue.failedHelp':
    'Mabadiliko haya yalisimama baada ya makosa ya mara kwa mara. Yajaribu tena, au yatupe yale usiyoyahitaji tena.',
  'profile.queue.status.pending': 'Linasubiri',
  'profile.queue.status.failed': 'Limeshindwa',
  'profile.queue.saved': 'Lilihifadhiwa {time}',
  'profile.queue.attempts': 'Majaribio {count} kati ya {max}',
  'profile.queue.op.insert': 'Jipya',
  'profile.queue.op.update': 'Marekebisho',
  'profile.queue.op.delete': 'Kufuta',
  'profile.queue.table.tasks': 'Kazi',
  'profile.queue.table.farms': 'Shamba',
  'profile.queue.table.plots': 'Kipande cha shamba',
  'profile.queue.table.finance': 'Rekodi ya fedha',
  'profile.queue.table.payments': 'Rekodi ya malipo',
  'profile.queue.table.livestock': 'Rekodi ya mifugo',
  'profile.queue.table.inventory': 'Rekodi ya stoo',
  'profile.queue.table.market': 'Tangazo la soko',
  'profile.queue.table.community': 'Chapisho la kikundi',
  'profile.queue.table.consultations': 'Ombi la ushauri',
  'profile.queue.table.devices': 'Rekodi ya kifaa',
  'profile.queue.table.insurance': 'Rekodi ya bima',
  'profile.queue.table.other': 'Rekodi',
  'profile.queue.reason.unsupported':
    'Toleo hili la programu haliwezi kutuma badiliko hili. Sasisha programu.',
  'profile.queue.reason.invalid':
    'Seva imekataa badiliko hili kwa sababu baadhi ya taarifa si sahihi.',
  'profile.queue.reason.missing':
    'Rekodi ambayo badiliko hili linahusu haipo tena kwenye akaunti yako.',
  'profile.queue.reason.permission':
    'Akaunti yako hairuhusiwi kufanya badiliko hili. Jaribu kuingia tena.',
  'profile.queue.reason.conflict':
    'Badiliko hili linagongana na taarifa zilizokwisha hifadhiwa (kwa mfano, nakala).',
  'profile.queue.reason.network': 'Imeshindwa kufikia seva. Litajaribiwa tena.',
  'profile.queue.discard.title': 'Tupa badiliko hili?',
  'profile.queue.discard.body':
    'Halijafika kwenye akaunti yako. Ukilitupa, litafutwa kwenye simu hii na haliwezi kurejeshwa.',
  'profile.queue.discard.confirm': 'Tupa',
  'profile.queue.discard.a11y': 'Tupa badiliko: {item}',
  'profile.queue.msg.offline': 'Huna mtandao. Unganisha intaneti ili kusawazisha.',
  'profile.queue.msg.noSession': 'Ingia tena ili kusawazisha mabadiliko haya.',
  'profile.queue.msg.noBackend':
    'Toleo hili halijaunganishwa na seva, kwa hiyo mabadiliko hayawezi kusawazishwa.',
  'profile.queue.msg.synced': 'Yamehifadhiwa kwenye akaunti yako: {count}',
  'profile.queue.msg.partial': 'Yamehifadhiwa {synced}. Bado yako kwenye simu hii: {left}.',
  'profile.queue.msg.retrying': 'Yanajaribiwa tena: {count}',
  'profile.queue.msg.discarded': 'Badiliko limetupwa.',

  // ── Edit profile ───────────────────────────────────────────────────────────
  'profile.edit.title': 'Hariri wasifu wa shamba',
  'profile.edit.sub': 'Mabadiliko huboresha mapendekezo ya AI mara moja',
  'profile.edit.name': 'Jina kamili',
  'profile.edit.namePh': 'mf. Amina Juma',
  'profile.edit.nameErr': 'Jina lazima liwe na herufi 2 au zaidi',
  'profile.edit.nameHint': 'Weka jina lako kamili la herufi mbili au zaidi',
  'profile.edit.role': 'Wajibu',
  'profile.edit.region': 'Mkoa',
  'profile.edit.regionErr': 'Chagua mkoa wako',
  'profile.edit.crops': 'Mazao makuu (chagua hadi {max})',
  'profile.edit.cropsErr': 'Chagua angalau zao moja',
  'profile.edit.cropsMax': 'Mazao {max} yamechaguliwa — ndiyo kiwango cha juu',
  'profile.edit.size': 'Ukubwa wa shamba (ekari)',
  'profile.edit.sizeHint': 'Weka ukubwa wa shamba lako kwa ekari',
  'profile.edit.activity': 'Shughuli kuu',
  'profile.edit.activity.crops': 'Mazao',
  'profile.edit.activity.livestock': 'Mifugo',
  'profile.edit.activity.mixed': 'Mchanganyiko',
  'profile.edit.livestock': 'Una mifugo?',
  'profile.edit.irrigation': 'Una umwagiliaji?',
  'profile.edit.language': 'Lugha ya programu',
  'profile.edit.appearance': 'Mandhari',
  'profile.edit.theme.system': 'Mfumo',
  'profile.edit.theme.light': 'Mwanga',
  'profile.edit.theme.dark': 'Giza',
  'profile.edit.save': 'Hifadhi mabadiliko',
  'profile.edit.unsaved': 'Mabadiliko hayajahifadhiwa',
  'profile.edit.unsavedHint': 'Una mabadiliko ambayo hayajahifadhiwa',
  'profile.edit.discard.title': 'Toka bila kuhifadhi?',
  'profile.edit.discard.body': 'Mabadiliko yako hayatahifadhiwa.',
  'profile.edit.discard.keep': 'Endelea kuhariri',
  'profile.edit.discard.confirm': 'Toka',
  'profile.edit.saved.title': 'Wasifu umehifadhiwa',
  'profile.edit.saved.body': 'Mapendekezo ya AI yatatumia wasifu wako mpya.',
  'profile.edit.syncFailed.title': 'Usawazishaji umeshindikana',
  'profile.edit.syncFailed.body':
    'Wasifu umehifadhiwa kwenye simu hii lakini haujasawazishwa mtandaoni.',

  // ── Verification (KYC) ─────────────────────────────────────────────────────
  'profile.verify.step': 'Hatua {step} kati ya {total}',
  'profile.verify.intro.title': 'Hakiki utambulisho wako',
  'profile.verify.intro.body':
    'Huduma za fedha kama pochi ya ushirika na mikataba zinahitaji utambulisho uliohakikiwa. Mkaguzi hukagua taarifa unazotuma.',
  'profile.verify.intro.needTitle': 'Utakachohitaji',
  'profile.verify.intro.needId': 'Namba yako ya NIDA au namba ya pasipoti',
  'profile.verify.intro.needBusiness':
    'Jina la biashara, TIN na namba ya usajili wa BRELA (kama una biashara tu)',
  'profile.verify.intro.review':
    'Mtu hukagua ombi lako. Unaweza kuangalia hali yake kwenye Wasifu wakati wowote.',
  'profile.verify.intro.consent':
    'Nakubali Kilimo AI ichakate taarifa hizi ili kuhakiki utambulisho wangu, kama ilivyoelezwa kwenye sera ya faragha.',
  'profile.verify.intro.privacyLink': 'Soma sera ya faragha',
  'profile.verify.intro.start': 'Anza uhakiki',
  'profile.verify.personal.title': 'Taarifa binafsi',
  'profile.verify.personal.body':
    'Weka namba yako ya NIDA (tarakimu 20) au namba ya pasipoti, kama ilivyo kwenye hati.',
  'profile.verify.personal.idLabel': 'Namba ya NIDA au pasipoti',
  'profile.verify.personal.idHint': 'Vistari na nafasi vinakubalika',
  'profile.verify.personal.idError':
    'Weka namba ya NIDA ya tarakimu 20 au namba ya pasipoti ya herufi 6–12',
  'profile.verify.personal.continue': 'Endelea',
  'profile.verify.business.title': 'Taarifa za biashara',
  'profile.verify.business.body':
    'Jaza hizi tu kama unalima au kufanya biashara kama biashara iliyosajiliwa. Ziache wazi ili kuhakikiwa kama mtu binafsi.',
  'profile.verify.business.nameLabel': 'Jina la biashara (si lazima)',
  'profile.verify.business.tinLabel': 'TIN (si lazima)',
  'profile.verify.business.tinHint': 'Tarakimu 9, mf. 123-456-789',
  'profile.verify.business.tinError': 'TIN ina tarakimu 9',
  'profile.verify.business.regLabel': 'Namba ya usajili wa BRELA (si lazima)',
  'profile.verify.business.missingId': 'Namba yako ya utambulisho haipo. Rudi nyuma uiweke kwanza.',
  'profile.verify.business.goBack': 'Weka namba ya utambulisho',
  'profile.verify.business.submit': 'Tuma kwa ukaguzi',
  'profile.verify.business.submitting': 'Inatuma…',
  'profile.verify.error.notConfigured':
    'Toleo hili halijaunganishwa na seva, kwa hiyo uhakiki hauwezi kutumwa.',
  'profile.verify.error.offline':
    'Huna mtandao. Unganisha intaneti ili kutuma. Hakuna kilichotumwa.',
  'profile.verify.error.signedOut': 'Ingia kwenye akaunti yako ili kuhakiki utambulisho wako.',
  'profile.verify.error.server': 'Ombi lako halikutumwa. Tafadhali jaribu tena.',
  'profile.verify.status.title': 'Hali ya uhakiki',
  'profile.verify.status.unavailable.title': 'Uhakiki haupatikani',
  'profile.verify.status.signedOut.title': 'Hujaingia',
  'profile.verify.status.error.title': 'Imeshindwa kupakia hali yako',
  'profile.verify.status.none.title': 'Bado hakuna ombi',
  'profile.verify.status.none.body': 'Hujatuma taarifa za utambulisho kwa ukaguzi.',
  'profile.verify.status.pending.title': 'Inakaguliwa',
  'profile.verify.status.pending.body':
    'Taarifa zako zimepokelewa na zinasubiri mkaguzi. Vuta chini ili kuangalia kama kuna jipya.',
  'profile.verify.status.verified.title': 'Umethibitishwa',
  'profile.verify.status.verified.body': 'Utambulisho wako umethibitishwa.',
  'profile.verify.status.rejected.title': 'Haikukubaliwa',
  'profile.verify.status.rejected.body': 'Mkaguzi hakuweza kukubali ombi hili.',
  'profile.verify.status.reviewerNote': 'Maelezo ya mkaguzi: {note}',
  'profile.verify.status.resubmit': 'Tuma taarifa mpya',
  'profile.verify.status.submitted': 'Lilitumwa {time}',
  'profile.verify.status.typePersonal': 'Mtu binafsi',
  'profile.verify.status.typeBusiness': 'Biashara',

  // ── Wallet admin ───────────────────────────────────────────────────────────
  'profile.walletAdmin.title': 'Usimamizi wa pochi',
  'profile.walletAdmin.denied.title': 'Haipatikani kwa wajibu wako',
  'profile.walletAdmin.denied.body':
    'Usimamizi wa pochi ni kwa viongozi wa ushirika na wasimamizi wa kibiashara tu.',
  'profile.walletAdmin.unavailable.title': 'Bado haipatikani',
  'profile.walletAdmin.unavailable.body':
    'Kusimamia salio la wanachama, kuidhinisha malipo na leja ya M-Pesa ya ushirika kunahitaji huduma ya pochi ambayo Kilimo AI bado haina.',
  'profile.walletAdmin.unavailable.caption':
    'Hakuna kinachoonyeshwa hapa hadi kitoke kwenye rekodi halisi.',
  'profile.walletAdmin.unavailable.finance': 'Fungua rekodi zangu za fedha',

  // ── Legal ──────────────────────────────────────────────────────────────────
  'profile.legal.updated': 'Ilisasishwa: 25 Mei 2026 · Inaanza kutumika: 25 Mei 2026',
  'profile.legal.translationNotice':
    'Hii ni tafsiri ya Kiswahili. Ikitofautiana na toleo la Kiingereza, toleo la Kiingereza ndilo litakalotumika.',

  'profile.legal.privacy.title': 'Sera ya faragha',
  'profile.legal.privacy.intro':
    'KILIMO AI ("sisi") inaendeshwa na Kilimo AI Ltd., kampuni iliyosajiliwa Tanzania. Sera hii inaeleza jinsi tunavyokusanya, kutumia, kuhifadhi na kushiriki taarifa zako binafsi unapotumia programu ya simu ya KILIMO AI ("Programu"). Kwa kutumia Programu, unakubali utaratibu ulioelezwa hapa chini.',
  'profile.legal.privacy.s1.title': 'Anayewajibika kwa taarifa zako',
  'profile.legal.privacy.s1.body':
    'Kilimo AI Ltd., Dar es Salaam, Tanzania, ndiye mdhibiti wa taarifa zako binafsi. Mawasiliano: privacy@kilimo.ai.',
  'profile.legal.privacy.s2.title': 'Taarifa tunazokusanya',
  'profile.legal.privacy.s2.body':
    'a) Akaunti na utambulisho: jina lako, namba ya simu na Agro ID. Ukiomba uhakiki wa utambulisho, namba yako ya NIDA au pasipoti na, kwa biashara, jina la biashara, TIN na namba ya BRELA.\nb) Wasifu wa shamba: mkoa, wilaya, ukubwa wa shamba, mazao makuu, mifugo na umwagiliaji.\nc) Mahali: mkoa au wilaya kwa ajili ya hali ya hewa na bei. GPS hutumika tu kwenye Ramani ya Shamba, na tu wakati Programu iko wazi.\nd) Shughuli za shamba: picha za mazao na matokeo ya utambuzi wa AI, kazi, matangazo ya soko, mikataba na rekodi za mifugo.\ne) Sauti: rekodi unazofanya kwa kipengele cha sauti cha Sankofa AI, hutumika tu kuandika ulichosema.\nf) Fedha: rekodi unazoweka na namba ya pesa kwa simu unayochagua kuunganisha. Hatuhifadhi kamwe PIN yako ya M-Pesa.\ng) Kifaa na uchunguzi: aina ya kifaa, mfumo wa uendeshaji na toleo la programu. Pale ripoti za hitilafu zimewashwa, taarifa za hitilafu zisizokutambulisha (kupitia Sentry). Hatutumii uchambuzi wa matangazo au wa tabia.',
  'profile.legal.privacy.s3.title': 'Jinsi tunavyotumia taarifa zako',
  'profile.legal.privacy.s3.body':
    'Kutengeneza na kusimamia akaunti yako ya Agro ID; kutoa utambuzi wa mazao kwa AI, ushauri wa kilimo na taarifa za soko; kuonyesha hali ya hewa ya mkoa wako; kurekodi malipo na shughuli za ushirika; kutuma arifa ndani ya programu na, kwa ridhaa yako, tahadhari kwa SMS; kuhakiki utambulisho unapoomba; kuboresha AI yetu kwa kutumia taarifa za shamba zilizojumlishwa zisizokutambulisha; kutimiza wajibu wetu chini ya sheria za Tanzania; na kuzuia udanganyifu na kulinda usalama wa jukwaa.',
  'profile.legal.privacy.s4.title': 'Msingi wa kisheria wa kuchakata',
  'profile.legal.privacy.s4.body':
    'Mkataba: kutoa huduma ulizojisajili kwazo. Maslahi halali: kuboresha Programu, kugundua udanganyifu na kuilinda. Ridhaa: kwa tahadhari za SMS, kurekodi sauti, matumizi ya kamera na uhakiki wa utambulisho — unaweza kuondoa ridhaa wakati wowote. Wajibu wa kisheria: kutimiza matakwa ya sheria za Tanzania.',
  'profile.legal.privacy.s5.title': 'Huduma za wahusika wengine',
  'profile.legal.privacy.s5.body':
    "OpenAI (Marekani): picha za mazao na ujumbe wa mazungumzo hutumwa kwa uchambuzi wa AI; hatutumi jina lako au namba ya simu pamoja nazo. Supabase (Marekani/Umoja wa Ulaya): hifadhidata yetu na mtoa huduma wa kuingia. Africa's Talking (Kenya): hutuma tahadhari za SMS zikiwashwa. Watoa huduma wa pesa kwa simu: huchakata malipo unayoanzisha. OpenWeatherMap (Marekani): hali ya hewa ya mkoa wako. Hatuuzi taarifa zako binafsi.",
  'profile.legal.privacy.s6.title': 'Kamera, kipaza sauti na mahali',
  'profile.legal.privacy.s6.body':
    'Kamera na maktaba ya picha: kutambua matatizo kwenye picha za mazao. Kipaza sauti: kwa maswali ya sauti kwa Sankofa AI; sauti hutumika tu kuandika maneno. Mahali: kwa Ramani ya Shamba na hali ya hewa sahihi; ukikataa, hali ya hewa ya kiwango cha mkoa bado inafanya kazi. Unaweza kuondoa ruhusa yoyote kwenye mipangilio ya simu yako.',
  'profile.legal.privacy.s7.title': 'Muda tunaohifadhi taarifa',
  'profile.legal.privacy.s7.body':
    'Taarifa za akaunti: muda wote akaunti yako iko hai, na hadi siku 90 baada ya kuomba kuifuta. Picha za mazao: hazihifadhiwi isipokuwa ukihifadhi matokeo. Rekodi za sauti: hufutwa baada ya kuandikwa. Rekodi za shughuli za shamba: hadi miaka 3, kwa historia ya mavuno. Rekodi za fedha: miaka 7, kama kanuni za fedha za Tanzania zinavyotaka. Taarifa za hitilafu: hadi siku 90 kwa Sentry.',
  'profile.legal.privacy.s8.title': 'Haki zako',
  'profile.legal.privacy.s8.body':
    'Unaweza kuomba kuona, kusahihisha au kufuta taarifa zako, kupata taarifa za shamba lako kwa muundo unaosomeka na kompyuta (CSV/JSON), kupinga uchakataji unaotegemea maslahi halali, na kuondoa ridhaa wakati wowote. Tuma barua pepe kwa privacy@kilimo.ai; tutajibu ndani ya siku 30. Unaweza kufuta akaunti yako mwenyewe kwenye Wasifu → Futa akaunti.',
  'profile.legal.privacy.s9.title': 'Usalama',
  'profile.legal.privacy.s9.body':
    'Taarifa kati ya Programu na seva zetu husimbwa zikiwa safarini (TLS). Tokeni za kuingia huhifadhiwa kwenye hifadhi salama ya simu yako. Agro ID ni vitambulisho vya nasibu. Upatikanaji wa taarifa za uzalishaji ni kwa wafanyakazi walioidhinishwa tu. Uvunjaji wa usalama ukiathiri haki zako, tutakujulisha ndani ya saa 72 kama sheria inavyotaka.',
  'profile.legal.privacy.s10.title': 'Watoto',
  'profile.legal.privacy.s10.body':
    'KILIMO AI haikusudiwi kwa watoto walio chini ya miaka 16 na hatukusanyi taarifa zao kwa kujua. Ukiamini mtoto amejisajili, wasiliana na privacy@kilimo.ai nasi tutafuta akaunti hiyo.',
  'profile.legal.privacy.s11.title': 'Uhamisho nje ya Tanzania',
  'profile.legal.privacy.s11.body':
    'Taarifa zako zinaweza kuchakatwa nje ya Tanzania, ikiwa ni pamoja na Marekani na Umoja wa Ulaya, wanakofanyia kazi watoa huduma wetu. Tunatumia kinga zinazofaa, kama Vifungu vya Kawaida vya Mkataba, inapohitajika.',
  'profile.legal.privacy.s12.title': 'Vidakuzi na uchunguzi wa hitilafu',
  'profile.legal.privacy.s12.body':
    'Programu ya simu haitumii vidakuzi vya kivinjari wala uchambuzi wa matangazo. Pale ripoti za hitilafu zimewashwa, taarifa za hitilafu zisizokutambulisha hukusanywa ili kurekebisha matatizo tu.',
  'profile.legal.privacy.s13.title': 'Tahadhari za SMS',
  'profile.legal.privacy.s13.body':
    'Ukiwasha tahadhari za SMS, tunatuma tahadhari muhimu za shamba (kwa mfano magonjwa au hali mbaya ya hewa) kwenye namba yako ya simu. Ili kusimamisha SMS, wasiliana na privacy@kilimo.ai. Gharama za kawaida za ujumbe za mtandao wako zinaweza kutozwa.',
  'profile.legal.privacy.s14.title': 'Ushauri wa AI',
  'profile.legal.privacy.s14.body':
    'Utambuzi wa mazao, utabiri wa soko na ushauri wa kilimo hutoka kwenye mifumo ya AI na ni kwa taarifa tu. Haviwezi kuchukua nafasi ya mtaalamu wa kilimo aliyehitimu. Hatuwajibiki kwa maamuzi yanayotegemea mapendekezo ya AI pekee.',
  'profile.legal.privacy.s15.title': 'Mabadiliko na malalamiko',
  'profile.legal.privacy.s15.body':
    'Tutakujulisha ndani ya Programu kuhusu mabadiliko makubwa na kusasisha tarehe iliyo juu. Kwa maswali au kutumia haki zako, tuma barua pepe kwa privacy@kilimo.ai. Usiporidhika na jibu letu, unaweza kulalamika kwa Tume ya Ulinzi wa Taarifa Binafsi ya Tanzania au mamlaka nyingine husika.',

  'profile.legal.terms.title': 'Vigezo na masharti',
  'profile.legal.terms.intro':
    'Masharti haya ni makubaliano ya kisheria kati yako na Kilimo AI Ltd. ("KILIMO AI", "sisi") kuhusu matumizi yako ya programu ya simu ya KILIMO AI ("Programu"). Kwa kujisajili au kutumia kipengele chochote cha Programu, unathibitisha kuwa umesoma, umeelewa na unakubali Masharti haya.',
  'profile.legal.terms.s1.title': 'Kukubali',
  'profile.legal.terms.s1.body':
    'Kwa kutengeneza Agro ID au kutumia Programu unakubali Masharti haya na Sera yetu ya Faragha. Usipokubali, usitumie Programu. Kuendelea kuitumia baada ya kukujulisha kuhusu mabadiliko kunamaanisha umeyakubali.',
  'profile.legal.terms.s2.title': 'Wanaostahili',
  'profile.legal.terms.s2.body':
    'Lazima uwe na umri wa miaka 18 au zaidi. Huduma za fedha zinahitaji utambulisho uliohakikiwa. Akaunti za vyama vya ushirika au biashara za kilimo lazima zifunguliwe na mwakilishi aliyeidhinishwa.',
  'profile.legal.terms.s3.title': 'Huduma zetu',
  'profile.legal.terms.s3.body':
    'Ushauri wa kilimo wa Sankofa AI kwa Kiswahili na Kiingereza; utambuzi wa mazao kwa AI kutoka picha; taarifa za bei za soko; rekodi za mikataba, kazi, stoo na mifugo; kitambulisho cha kilimo cha Agro ID; rekodi za malipo na muunganiko wa pesa kwa simu; na taarifa za hali ya hewa. Upatikanaji unaweza kutegemea kifurushi chako na mahali ulipo.',
  'profile.legal.terms.s4.title': 'Akaunti yako na Agro ID',
  'profile.legal.terms.s4.body':
    'Weka siri taarifa zako za kuingia na toa taarifa sahihi. Unawajibika kwa shughuli zote kwenye akaunti yako. Tujulishe kupitia support@kilimo.ai ukishuku mtu ameingia bila ruhusa. Tunaweza kusimamisha akaunti zinazotoa taarifa za uongo au kuvunja Masharti haya.',
  'profile.legal.terms.s5.title': 'Matumizi yanayoruhusiwa',
  'profile.legal.terms.s5.body':
    'Tumia Programu kwa usimamizi halali wa shamba na ushauri tu, kwa kufuata sheria za Tanzania. Chukulia matokeo ya AI kama ushauri, si ushauri wa kitaalamu wa kilimo au wa kisheria, na heshimu hakimiliki za KILIMO AI na wengine.',
  'profile.legal.terms.s6.title': 'Matumizi yasiyoruhusiwa',
  'profile.legal.terms.s6.body':
    'Usitume taarifa za uongo au za udanganyifu; usifungue msimbo wa Programu; usitumie roboti au zana za kuvuna taarifa; usipakie maudhui haramu au yanayovunja haki za wengine; usikwepe mipaka ya vifurushi au udhibiti wa ufikiaji; usichezee bei za soko au kueneza taarifa za uongo za soko; usishiriki taarifa zako za kuingia; wala usidhuru seva au mtandao wetu.',
  'profile.legal.terms.s7.title': 'Tahadhari kuhusu AI na ukomo wa dhima',
  'profile.legal.terms.s7.body':
    'Utambuzi, utabiri, makadirio ya soko na ushauri wa AI ni kwa taarifa tu na unaweza kuwa si sahihi au haujakamilika. Hakikisha maamuzi muhimu ya matibabu na mtaalamu wa kilimo aliyehitimu. Taarifa za soko hutoka kwa wahusika wengine na zinaweza kuchelewa. KILIMO AI haiwajibiki kwa hasara za mazao, fedha au nyingine zinazotokana na kutegemea matokeo ya AI. Kwa kiwango kinachoruhusiwa na sheria, dhima yetu yote ni kiasi ulichotulipa katika miezi 12 kabla ya dai.',
  'profile.legal.terms.s8.title': 'Vifurushi na malipo',
  'profile.legal.terms.s8.body':
    'KILIMO AI inaweza kutoa vifurushi vya Bure, Premium na Ushirika. Vifurushi vya kulipia hutozwa kwa bei zinazoonyeshwa kwenye Programu, kupitia njia za malipo zinazokubalika, na hujirudia isipokuwa vikisitishwa angalau saa 24 kabla ya kujirudia. Vipindi visivyokamilika havirudishiwi fedha isipokuwa sheria za Tanzania zikitaka. Tutatoa taarifa ya siku 30 kabla ya kubadilisha bei.',
  'profile.legal.terms.s9.title': 'Hakimiliki',
  'profile.legal.terms.s9.body':
    'Programu, programu-tumizi zake, mifumo ya AI, alama za biashara na muundo wake ni mali ya Kilimo AI Ltd. au watoa leseni wake. Unapewa leseni yenye mipaka, isiyo ya kipekee na isiyohamishika ya kuitumia. Taarifa za shamba unazoweka zinabaki kuwa zako; unaturuhusu kuzitumia zikiwa zimejumlishwa na bila kukutambulisha ili kuboresha AI yetu.',
  'profile.legal.terms.s10.title': 'Huduma za wahusika wengine',
  'profile.legal.terms.s10.body':
    "Programu hutumia huduma za wahusika wengine zikiwemo OpenAI, Supabase, Africa's Talking, watoa huduma wa pesa kwa simu na OpenWeatherMap. Masharti yao yanatumika, na hatuwajibiki kwa upatikanaji au mwenendo wao.",
  'profile.legal.terms.s11.title': 'Taarifa na faragha',
  'profile.legal.terms.s11.body':
    'Sera yetu ya Faragha ni sehemu ya Masharti haya. Kwa kutumia Programu unakubali taarifa zako zitumike kama inavyoeleza.',
  'profile.legal.terms.s12.title': 'Upatikanaji na mabadiliko ya huduma',
  'profile.legal.terms.s12.body':
    'Hatuahidi kwamba Programu itapatikana wakati wote au bila hitilafu. Tunaweza kubadilisha, kusimamisha au kuacha vipengele kwa taarifa ya kutosha na tutajitahidi kutangaza matengenezo yaliyopangwa. Hatuwajibiki kwa kukatika kwa huduma kulikosababishwa na mambo yaliyo nje ya uwezo wetu.',
  'profile.legal.terms.s13.title': 'Kufunga akaunti yako',
  'profile.legal.terms.s13.body':
    'Unaweza kufuta akaunti yako wakati wowote kwenye Wasifu → Futa akaunti. Tunaweza kusimamisha au kufunga akaunti zinazovunja Masharti haya, kufanya udanganyifu au kuhatarisha usalama. Rekodi za fedha huhifadhiwa kwa miaka 7 kama sheria inavyotaka. Vifungu vya 7, 9, 14 na 15 vinaendelea kutumika baada ya kufunga akaunti.',
  'profile.legal.terms.s14.title': 'Migogoro',
  'profile.legal.terms.s14.body':
    'Kwanza tutajaribu kusuluhisha mgogoro wowote kwa nia njema. Ikishindikana ndani ya siku 30, utapelekwa kwenye usuluhishi chini ya kanuni za Taasisi ya Wasuluhishi Tanzania, kisha kwenye usuluhishi wa mwisho (arbitration) Dar es Salaam chini ya Kanuni za Usuluhishi za UNCITRAL. Upande wowote bado unaweza kuomba nafuu ya haraka kutoka mahakama yenye mamlaka.',
  'profile.legal.terms.s15.title': 'Sheria inayotumika',
  'profile.legal.terms.s15.body':
    'Masharti haya yanaongozwa na sheria za Jamhuri ya Muungano wa Tanzania. Mahakama za Dar es Salaam zina mamlaka juu ya mambo yasiyo chini ya usuluhishi.',
  'profile.legal.terms.s16.title': 'Hakuna dhamana',
  'profile.legal.terms.s16.body':
    'Kwa kiwango kinachoruhusiwa na sheria, Programu inatolewa "kama ilivyo" na "kadiri inavyopatikana", bila dhamana ya aina yoyote, ikiwa ni pamoja na ufaafu wa kuuzika, kufaa kwa kusudi fulani na kutokiuka haki za wengine. Hatuahidi kwamba itakuwa bila hitilafu, salama au bila kukatika.',
  'profile.legal.terms.s17.title': 'Mabadiliko na mawasiliano',
  'profile.legal.terms.s17.body':
    'Tutatoa taarifa ya angalau siku 14 ndani ya Programu kuhusu mabadiliko makubwa. Kuendelea kutumia Programu baada ya kuanza kutumika kunamaanisha umeyakubali. Maswali: legal@kilimo.ai, Kilimo AI Ltd., Dar es Salaam, Tanzania.',
  'profile.agroId.title': 'Agro ID',
  'profile.agroId.offline': 'Huna mtandao. Unaona taarifa zilizopakiwa mwisho.',
  'profile.agroId.qr.open': 'Onyesha QR ya uthibitisho',
  'profile.agroId.qr.unavailable':
    'Uthibitisho haupatikani hadi programu iunganishwe na seva ya Kilimo.',
  'profile.agroId.qr.title': 'QR ya uthibitisho',
  'profile.agroId.qr.a11y': 'Msimbo wa QR unaothibitisha Agro ID hii',
  'profile.agroId.qr.body':
    'Benki, mnunuzi au chama cha ushirika anaweza kuchanganua msimbo huu kuthibitisha kuwa Agro ID yako ipo na kuona muhtasari wa kumbukumbu zako: idadi ya maingizo, tangu lini, na kiwango cha mapato halisi. Haionyeshi jina lako, simu wala miamala moja moja. Maingizo yako umeyaweka mwenyewe.',
  'profile.agroId.credit.title': 'Makadirio ya utayari wa mkopo',
  'profile.agroId.credit.a11y': 'Alama inayokadiriwa {score}, {band}',
  'profile.agroId.credit.range':
    'Kipimo 300–850, kimekokotolewa kwenye simu hii kutokana na kumbukumbu zako.',
  'profile.agroId.credit.empty':
    'Weka mapato na matumizi yako ili kupata makadirio. Yanakokotolewa tu kutokana na unachoweka.',
  'profile.agroId.credit.disclaimer':
    'Ni makadirio kutokana na kumbukumbu ulizoweka mwenyewe, si uamuzi wa mkopeshaji wala ushauri wa kifedha.',
  'profile.agroId.ledger.title': 'Mapato na matumizi',
  'profile.agroId.ledger.income': 'Mapato',
  'profile.agroId.ledger.expense': 'Matumizi',
  'profile.agroId.ledger.net': 'Halisi',
  'profile.agroId.ledger.recent': 'Maingizo ya karibuni',
  'profile.agroId.ledger.empty': 'Bado hakuna maingizo. Yaongeze kwenye skrini ya Fedha.',
  'profile.agroId.ledger.open': 'Fungua daftari la Fedha',
  'profile.agroId.export.button': 'Hamisha Faida na Hasara kama PDF',
  'profile.agroId.export.period': '{from} – {to}',
  'profile.agroId.export.failed': 'Imeshindikana kutengeneza PDF. Tafadhali jaribu tena.',
  'profile.more.vra': "Mpango wa pembejeo",
  'profile.more.vra.sub': "Kokotoa mbegu na mbolea kwa kipande",
};
