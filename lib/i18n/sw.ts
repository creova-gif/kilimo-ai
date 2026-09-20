import type { TranslationKey } from './en';

/** Swahili resources. Must define every key in en.ts (checked by the parity test). */
export const sw: Record<TranslationKey, string> = {
  'common.continue': 'Endelea',
  'common.back': 'Rudi',
  'common.cancel': 'Ghairi',
  'common.save': 'Hifadhi',
  'common.retry': 'Jaribu tena',
  'common.close': 'Funga',
  'common.done': 'Imekamilika',
  'common.seeAll': 'Ona zote',

  'state.loading': 'Inapakia…',
  'state.empty.title': 'Hakuna kitu hapa bado',
  'state.error.title': 'Kuna hitilafu',
  'state.error.body': 'Hatukuweza kupakia hii. Angalia mtandao wako kisha ujaribu tena.',
  'state.offline.banner': 'Uko nje ya mtandao. Mabadiliko yatasawazishwa ukiunganishwa tena.',
  'state.offline.lastSynced': 'Imesawazishwa mara ya mwisho {time}',
  'state.stale': 'Data hii inaweza kuwa imepitwa na wakati',
  'state.unavailable.title': 'Huduma haipatikani',
  'state.unavailable.body': 'Kipengele hiki hakipatikani kwa sasa. Tafadhali jaribu tena baadaye.',

  'auth.notConfigured': 'Huduma ya kuingia haipatikani: programu hii haijaunganishwa na seva.',
  'auth.invalidCode': 'Msimbo huo si sahihi au umeisha muda.',
  'auth.rateLimited': 'Majaribio mengi mno. Subiri kidogo kisha ujaribu tena.',
  'auth.network': 'Hakuna mtandao. Angalia intaneti yako kisha ujaribu tena.',

  'permission.camera.title': 'Ruhusa ya kamera inahitajika',
  'permission.camera.body': 'Ruhusu kamera ili kuchanganua mazao yako kubaini matatizo.',
  'permission.location.title': 'Ruhusa ya eneo inahitajika',
  'permission.location.body': 'Ruhusu eneo ili kuonyesha hali ya hewa na ramani ya shamba lako.',
  'permission.notifications.title': 'Arifa zimezimwa',
  'permission.notifications.body': 'Washa arifa ili upokee tahadhari kuhusu shamba lako.',
  'permission.openSettings': 'Fungua mipangilio',

  'ai.unavailable': 'Uchunguzi wa AI haupatikani kwa sasa.',
  'ai.lowConfidence': 'Uhakika mdogo. Piga picha upya au muulize afisa ugani.',
  'ai.blurry': 'Picha imefifia. Shikilia kwa utulivu kisha upige upya.',
  'ai.noPlant': 'Hakuna mmea uliobainika. Onyesha jani lililoathirika kisha ujaribu tena.',
  'ai.unsupportedCrop': 'Zao hili halijaungwa mkono bado.',
};
