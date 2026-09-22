import type { enAi } from './ai.en';

/** Swahili strings: AI assistant, scan, voice, training hub, video hub, agro-id. Must define exactly the keys in ai.en.ts. */
export const swAi: Record<keyof typeof enAi, string> = {
  // ── Uliza AI ──────────────────────────────────────────────────────────────
  'ai.chat.title': 'Uliza Kilimo AI',
  'ai.chat.subtitle': 'Majibu kutoka hazina ya maarifa ya Kilimo',
  'ai.chat.intro.title': 'Imejengwa juu ya ushauri halisi',
  'ai.chat.intro.body':
    'Uliza kuhusu wadudu, magonjwa ya mazao, mbolea, umwagiliaji, uhifadhi au uuzaji. Kila jibu linaonyesha makala za hazina ya maarifa lilikotoka. Kwa shamba lako hasa, thibitisha kila mara na afisa ugani.',
  'ai.chat.suggest.title': 'Jaribu kuuliza',
  'ai.chat.suggest.hint': 'Inauliza swali hili',
  'ai.chat.suggest.armyworm': 'Ninawezaje kudhibiti viwavi jeshi kwenye mahindi?',
  'ai.chat.suggest.fertiliser': 'Nitumie mbolea gani kwa mahindi?',
  'ai.chat.suggest.storage': 'Ninawezaje kuhifadhi nafaka kwa usalama?',
  'ai.chat.suggest.dryspell': 'Nifanye nini wakati wa ukame?',
  'ai.chat.suggest.blight': 'Ninawezaje kudhibiti ukungu wa mapema kwenye nyanya?',
  'ai.chat.suggest.market': 'Ni wakati gani bora wa kuuza mavuno yangu?',
  'ai.chat.scan': 'Kagua picha ya zao',
  'ai.chat.voice': 'Uliza kwa sauti',
  'ai.chat.placeholder': 'Andika swali lako la kilimo',
  'ai.chat.send': 'Uliza',
  'ai.chat.tooLong': 'Tafadhali fupisha swali lako (herufi 2,000 zaidi).',
  'ai.chat.searching': 'Inatafuta kwenye hazina ya maarifa…',
  'ai.chat.youAsked': 'Uliuliza: {text}',
  'ai.chat.offline': 'Huna mtandao. Unganisha intaneti ili kuuliza swali.',

  // ── Majibu ────────────────────────────────────────────────────────────────
  'ai.answer.kbIntro': 'Hiki ndicho hazina ya maarifa ya Kilimo inasema:',
  'ai.answer.kbNoLlm':
    'Hizi ndizo makala zinazohusiana zaidi, kama zilivyoandikwa. Majibu yanayoandikwa na AI bado hayajawashwa.',
  'ai.answer.llmFailed':
    'Mwandishi wa AI hakuweza kujibu sasa hivi, kwa hiyo makala zinazolingana zinaonyeshwa kama zilivyoandikwa.',
  'ai.answer.generatedNote': 'Limeandikwa na AI kwa kutumia makala zilizo hapa chini pekee.',
  'ai.answer.sources': 'Vyanzo ({count})',
  'ai.answer.noMatch.title': 'Hakuna ushauri unaolingana',
  'ai.answer.noMatch.body':
    'Hazina ya maarifa ya Kilimo bado haina taarifa kuhusu hili. Jaribu maneno mengine (kwa mfano jina la zao na tatizo unaloliona), au muulize afisa ugani wa eneo lako.',
  'ai.answer.disclaimer':
    'Huu ni ushauri wa jumla, si utambuzi wa shamba lako. Thibitisha vipimo vya dawa na afisa ugani.',
  'ai.source.a11y': 'Chanzo {n}: {title}, kundi {category}',

  // ── Makundi ya hazina ya maarifa ──────────────────────────────────────────
  'ai.category.crop_disease': 'Wadudu na magonjwa ya mazao',
  'ai.category.fertiliser': 'Mbolea',
  'ai.category.irrigation': 'Umwagiliaji',
  'ai.category.post_harvest': 'Baada ya mavuno',
  'ai.category.weather_pattern': 'Hali ya hewa',
  'ai.category.market_info': 'Masoko',

  // ── Hitilafu ──────────────────────────────────────────────────────────────
  'ai.err.notConfigured.title': 'Kilimo AI haijaunganishwa',
  'ai.err.notConfigured.body':
    'Toleo hili la programu halijaunganishwa na seva ya Kilimo, kwa hiyo maswali hayawezi kujibiwa.',
  'ai.err.unauthorized.title': 'Tafadhali ingia',
  'ai.err.unauthorized.body': 'Ingia kwenye akaunti yako ili kuuliza Kilimo AI.',
  'ai.err.unavailable.title': 'Kilimo AI haipatikani',
  'ai.err.unavailable.body':
    'Huduma ya majibu haipatikani kwa sasa. Tafadhali jaribu tena baadaye.',
  'ai.err.network.title': 'Hakuna muunganisho',
  'ai.err.network.body': 'Hatukuweza kufikia seva. Angalia intaneti yako kisha ujaribu tena.',
  'ai.err.invalid.title': 'Swali halikutumwa',
  'ai.err.invalid.body': 'Tafadhali andika swali lisilozidi herufi 2,000.',
  'ai.err.server.title': 'Kuna hitilafu',
  'ai.err.server.body': 'Hatukuweza kupata jibu. Tafadhali jaribu tena.',

  // ── Ukaguzi wa picha ya zao ───────────────────────────────────────────────
  'ai.scan.title': 'Kagua picha ya zao',
  'ai.scan.intro.title': 'Ukaguzi wa picha kwa AI',
  'ai.scan.intro.body':
    'Piga picha wazi ya jani, shina au tunda lililoathirika. AI inapendekeza tatizo linaloweza kuwa — thibitisha kila mara na afisa ugani kabla ya kutibu.',
  'ai.scan.tips.title': 'Ili picha isaidie',
  'ai.scan.tips.1': 'Tumia mwanga wa mchana na usitumie flash ya kamera.',
  'ai.scan.tips.2': 'Shika simu sentimita 15–30 kutoka sehemu iliyoathirika.',
  'ai.scan.tips.3': 'Tulia ili picha iwe wazi.',
  'ai.scan.takePhoto': 'Piga picha',
  'ai.scan.gallery': 'Chagua kutoka picha zako',
  'ai.scan.analyzing': 'Inakagua picha…',
  'ai.scan.photoA11y': 'Picha ya zao lako',
  'ai.scan.offline': 'Huna mtandao. Ukaguzi wa picha unahitaji intaneti.',
  'ai.scan.unavailable.title': 'Utambuzi wa picha haupatikani',
  'ai.scan.unavailable.body':
    'Seva ya Kilimo bado haina mfumo wa kutambua picha, kwa hiyo hatuwezi kukagua picha. Hatutabahatisha. Bado unaweza kutafuta dalili kwenye hazina ya maarifa au kumuuliza afisa ugani.',
  'ai.scan.askKb': 'Uliza hazina ya maarifa',
  'ai.scan.again': 'Kagua picha nyingine',
  'ai.scan.result.overline': 'Pendekezo la AI',
  'ai.scan.result.crop': 'Zao: {crop}',
  'ai.scan.result.actions': 'Hatua zinazopendekezwa',
  'ai.scan.severity.low': 'Ukali: mdogo',
  'ai.scan.severity.medium': 'Ukali: wastani',
  'ai.scan.severity.high': 'Ukali: mkubwa',
  'ai.scan.severity.critical': 'Ukali: hatari sana',
  'ai.scan.confidence.low': 'Uhakika wa AI: mdogo',
  'ai.scan.confidence.medium': 'Uhakika wa AI: wastani',
  'ai.scan.confidence.high': 'Uhakika wa AI: mkubwa',
  'ai.scan.poorPhoto': 'Ubora wa picha ni hafifu, kwa hiyo pendekezo hili halitegemeki sana.',
  'ai.scan.incomplete.title': 'Hakuna matokeo ya wazi',
  'ai.scan.incomplete.body':
    'AI haikuweza kutaja tatizo kutoka kwenye picha hii. Piga picha ya karibu zaidi na iliyo wazi mchana, au muulize afisa ugani.',
  'ai.scan.expert.title': 'Ongea na mtaalamu',
  'ai.scan.expert.body':
    "Hili linaweza kuwa jambo zito au lisilo na uhakika. Tafadhali mwonyeshe afisa ugani mmea kabla ya kunyunyizia dawa au kung'oa mazao.",
  'ai.scan.disclaimer': 'Hili ni pendekezo la AI kutoka picha moja, si utambuzi uliothibitishwa.',
  'ai.scan.task.add': 'Ongeza kazi ya ufuatiliaji',
  'ai.scan.task.saved': 'Kazi ya ufuatiliaji imeongezwa',
  'ai.scan.task.failed': 'Imeshindikana kuongeza kazi — jaribu tena',
  'ai.scan.task.title': 'Kagua zao: {disease}',
  'ai.scan.err.title': 'Picha haikukaguliwa',
  'ai.scan.err.permission':
    'Ruhusu kamera au picha kwenye mipangilio ya simu yako, kisha ujaribu tena.',
  'ai.scan.err.photo': 'Picha hii haikuweza kutumika. Jaribu picha ndogo zaidi au nyingine.',
  'ai.scan.err.signIn': 'Ingia kwenye akaunti yako ili kukagua picha.',
  'ai.scan.err.network': 'Hakuna muunganisho. Angalia intaneti yako kisha ujaribu tena.',
  'ai.scan.err.offline': 'Huna mtandao. Unganisha intaneti ili kukagua picha.',
  'ai.scan.err.server': 'Ukaguzi wa picha umeshindikana. Tafadhali jaribu tena.',

  // ── Sauti ─────────────────────────────────────────────────────────────────
  'ai.voice.title': 'Uliza kwa sauti',
  'ai.voice.intro.title': 'Sema swali lako',
  'ai.voice.intro.body':
    'Bonyeza kitufe, uliza swali lako, kisha bonyeza tena kusimamisha. Majibu yanatoka kwenye hazina ya maarifa ya Kilimo.',
  'ai.voice.start': 'Anza kurekodi',
  'ai.voice.stop': 'Simamisha na uliza',
  'ai.voice.wait': 'Tafadhali subiri…',
  'ai.voice.micHint': 'Inarekodi swali lako kwa kipaza sauti',
  'ai.voice.listening': 'Inasikiliza… bonyeza "Simamisha na uliza" ukimaliza.',
  'ai.voice.transcribing': 'Inageuza sauti yako kuwa maandishi…',
  'ai.voice.quick': 'Au bonyeza swali',
  'ai.voice.youAsked': 'Uliuliza: {text}',
  'ai.voice.err.permission':
    'Ruhusu kipaza sauti kwenye mipangilio ya simu yako ili kuuliza kwa sauti.',
  'ai.voice.err.mic': 'Kipaza sauti hakikuweza kuanza. Tafadhali jaribu tena.',
  'ai.voice.err.empty': 'Hatukukusikia vizuri. Tafadhali jaribu tena.',
  'ai.voice.err.tooLong': 'Rekodi ni ndefu mno. Tafadhali uliza swali fupi zaidi.',
  'ai.voice.err.sttUnavailable':
    'Kugeuza sauti kuwa maandishi bado hakujawekwa kwenye seva ya Kilimo. Bonyeza moja ya maswali hapa chini au uandike kwenye Uliza AI.',
  'ai.voice.err.network': 'Hakuna muunganisho. Angalia intaneti yako kisha ujaribu tena.',
  'ai.voice.err.signIn': 'Ingia kwenye akaunti yako ili kuuliza kwa sauti.',
  'ai.voice.err.server': 'Rekodi yako haikuweza kuchakatwa. Tafadhali jaribu tena.',

  // ── Msimamizi wa AI ───────────────────────────────────────────────────────
  'ai.admin.title': 'Hazina ya maarifa ya AI',
  'ai.admin.denied.title': 'Kwa wasimamizi pekee',
  'ai.admin.denied.body': 'Ukurasa huu unapatikana kwa wasimamizi wa Kilimo pekee.',
  'ai.admin.error.title': 'Imeshindikana kupakia hali',
  'ai.admin.status.title': 'Hali ya sasa',
  'ai.admin.status.documents': 'Makala',
  'ai.admin.status.embedded': 'Makala zenye embeddings',
  'ai.admin.status.embeddedValue': '{n} kati ya {total}',
  'ai.admin.status.llm': 'Mwandishi wa AI (ufunguo wa mtoa huduma)',
  'ai.admin.status.retrieval': 'Njia ya utafutaji inayotumika',
  'ai.admin.yes': 'Imewekwa',
  'ai.admin.no': 'Haijawekwa',
  'ai.admin.retrieval.vector': 'Utafutaji wa maana (embeddings)',
  'ai.admin.retrieval.fulltext': 'Utafutaji wa maneno (full-text)',
  'ai.admin.retrieval.keyword': 'Ulinganishaji wa maneno ya msingi',
  'ai.admin.answers.generated':
    'Wakulima wanapata jibu fupi lililoandikwa na AI pamoja na makala za vyanzo.',
  'ai.admin.answers.passages':
    'Wakulima wanapata makala zinazolingana kama zilivyoandikwa, bila maandishi ya AI.',
  'ai.admin.howto.title': 'Jinsi ya kuboresha majibu',
  'ai.admin.howto.key':
    'Weka siri ya OPENAI_API_KEY kwenye edge functions za rag-chat na openai-proxy ili kuwasha majibu yanayoandikwa, ukaguzi wa picha na kugeuza sauti kuwa maandishi.',
  'ai.admin.howto.embed':
    'Baada ya kuweka ufunguo, endesha scripts/embed-knowledge.ts mara moja ili kuongeza embeddings kwa utafutaji wa maana.',
  'ai.admin.howto.migration':
    'Utafutaji wa maneno haujasakinishwa. Tumia migration ya hifadhidata ya knowledge_search.',
  'ai.admin.howto.add':
    'Makala huongezwa na timu ya Kilimo kupitia migration ya hifadhidata iliyokaguliwa, kamwe si kutoka kwenye programu.',
  'ai.admin.articles': 'Makala ({count})',
  'ai.admin.articles.empty': 'Hazina ya maarifa bado haina makala.',

  // ── Mafunzo ───────────────────────────────────────────────────────────────
  'ai.train.title': 'Jifunze kutumia Sankofa AI',
  'ai.train.intro.title': 'Masomo matano mafupi',
  'ai.train.intro.body':
    'Jifunze jinsi ya kuuliza maswali mazuri, kupiga picha zinazosaidia na kujua wakati wa kumwita mtaalamu. Kila somo linaishia na swali moja.',
  'ai.train.progress': 'Masomo {done} kati ya {total} yamekamilika',
  'ai.train.completed': 'Limekamilika',
  'ai.train.notStarted': 'Bado halijakamilika',
  'ai.train.lesson': 'Somo',
  'ai.train.check': 'Kagua jibu',
  'ai.train.correct': 'Sahihi! Somo limekamilika.',
  'ai.train.wrong': 'Si sahihi bado. Soma somo tena kisha jaribu jibu jingine.',
  'ai.train.next': 'Somo linalofuata',
  'ai.train.backToList': 'Rudi kwenye masomo',
  'ai.train.done.title': 'Masomo yote yamekamilika',
  'ai.train.done.body': 'Hongera. Hii ni hatua ya kujifunza ndani ya programu, si cheti rasmi.',
  'ai.train.m1.title': '1. Anza na zao na tatizo',
  'ai.train.m1.subtitle': 'Ipe AI inachohitaji',
  'ai.train.m1.lesson':
    'Kilimo AI hutafuta kwenye hazina yake ya maarifa kwa kutumia maneno ya swali lako. Taja zao na eleza unachokiona — kwa mfano "madoa ya njano kwenye majani ya mahindi" — badala ya kusema tu "mimea yangu inaumwa".',
  'ai.train.m1.q': 'Swali lipi litapata jibu linalosaidia zaidi?',
  'ai.train.m1.o1': 'A) "Nina shida na mmea wangu."',
  'ai.train.m1.o2':
    'B) "Majani ya mahindi yangu yana matundu yaliyochanika na kuna uchafu kama unga wa mbao kwenye moyo wa mmea."',
  'ai.train.m1.o3': 'C) "Nisaidie haraka!"',
  'ai.train.m2.title': '2. Uliza swali moja lililo wazi',
  'ai.train.m2.subtitle': 'Maelezo mahususi, mada moja kwa wakati',
  'ai.train.m2.lesson':
    'Uliza kuhusu mada moja kwa wakati mmoja na ongeza maelezo yanayosaidia: umri wa mmea, hali ya hewa ya hivi karibuni na ulichokwisha jaribu. Maswali mahususi hulingana na makala sahihi; maswali ya jumla sana hayalingani na chochote.',
  'ai.train.m2.q': 'Maelezo gani yanaisaidia Kilimo AI zaidi?',
  'ai.train.m2.o1': 'A) Zao, umri wake na ulichokiona au kujaribu',
  'ai.train.m2.o2': 'B) Bei ya mbolea pekee',
  'ai.train.m2.o3': 'C) "Kwa nini kilimo ni kigumu?"',
  'ai.train.m3.title': '3. Piga picha ya zao inayosaidia',
  'ai.train.m3.subtitle': 'Kanuni za picha iliyo wazi',
  'ai.train.m3.lesson':
    'Ukaguzi wa picha hushindwa picha zikiwa na giza au zisizo wazi. Piga picha mchana, sentimita 15–30 kutoka kwenye mmea, ukilenga jani, shina au tunda lililoathirika, na ushike simu bila kutikisa.',
  'ai.train.m3.q': 'Ipi ni njia sahihi ya kupiga picha kwa ajili ya AI?',
  'ai.train.m3.o1': 'A) Shamba zima kutoka mbali wakati wa jioni',
  'ai.train.m3.o2': 'B) Usiku ukitumia flash ya kamera',
  'ai.train.m3.o3': 'C) Karibu (sm 15–30), mchana, ukilenga sehemu iliyoathirika na bila kutikisa',
  'ai.train.m4.title': '4. Angalia uhakika na vyanzo',
  'ai.train.m4.subtitle': 'Jua wakati AI haina uhakika',
  'ai.train.m4.lesson':
    'Kila ukaguzi wa picha unaonyesha uhakika wa AI (mdogo, wastani au mkubwa), na kila jibu linaorodhesha makala lilikotoka. Uhakika ukiwa mdogo au hakuna makala inayolingana, usichukue hatua kwa msingi huo — piga picha bora zaidi, soma vyanzo, au muulize afisa ugani.',
  'ai.train.m4.q': 'Ufanye nini AI ikisema uhakika wake ni mdogo?',
  'ai.train.m4.o1': 'A) Nyunyizia dawa zao hata hivyo',
  'ai.train.m4.o2': 'B) Piga picha bora zaidi kwenye mwanga mzuri au muulize afisa ugani',
  'ai.train.m4.o3': 'C) Acha kulima zao hilo',
  'ai.train.m5.title': '5. Jua wakati wa kumwita mtaalamu',
  'ai.train.m5.subtitle': 'Mipaka ya AI na usalama wa kemikali',
  'ai.train.m5.lesson':
    'Kilimo AI haitoi vipimo kamili vya dawa za kemikali, kwa sababu kipimo kisicho sahihi kinaweza kuharibu mazao au kudhuru watu na wanyama. Inaweza kutaja aina ya dawa, lakini thibitisha kila mara dawa na kipimo na afisa ugani, na soma lebo.',
  'ai.train.m5.q': 'Kwa nini Kilimo AI haitoi vipimo kamili vya viuatilifu?',
  'ai.train.m5.o1':
    'A) Kipimo kisicho sahihi kinaweza kuua mazao au kudhuru afya, kwa hiyo lazima kithibitishwe na afisa ugani',
  'ai.train.m5.o2': 'B) AI haijui dawa zozote za kilimo',
  'ai.train.m5.o3': 'C) Kwa sababu dawa ni za bure',

  // ── Video ─────────────────────────────────────────────────────────────────
  'ai.video.title': 'Video za mafunzo',
  'ai.video.empty.title': 'Bado hakuna video zilizothibitishwa',
  'ai.video.empty.body':
    'Tunaorodhesha tu video zilizokaguliwa na timu ya Kilimo, na bado hakuna iliyoongezwa. Kwa sasa, hazina ya maarifa na masomo ya AI yanapatikana.',
  'ai.video.askKb': 'Uliza hazina ya maarifa',
  'ai.video.lessons': 'Fungua masomo ya AI',
  'ai.video.note': 'Video zitaonekana hapa orodha iliyothibitishwa itakapochapishwa.',
};
