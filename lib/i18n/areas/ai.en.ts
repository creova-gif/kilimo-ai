/** English strings: AI assistant, scan, voice, training hub, video hub, agro-id. Keys are `ai.<name>`. Mirror every key in ai.sw.ts. */
export const enAi = {
  // ── Ask AI tab ────────────────────────────────────────────────────────────
  'ai.chat.title': 'Ask Kilimo AI',
  'ai.chat.subtitle': 'Answers from the Kilimo knowledge base',
  'ai.chat.intro.title': 'Grounded in real guidance',
  'ai.chat.intro.body':
    'Ask about pests, crop diseases, fertiliser, watering, storage or selling. Every answer shows the knowledge base articles it comes from. For your exact farm, always confirm with an extension officer.',
  'ai.chat.suggest.title': 'Try asking',
  'ai.chat.suggest.hint': 'Asks this question',
  'ai.chat.suggest.armyworm': 'How do I control fall armyworm in maize?',
  'ai.chat.suggest.fertiliser': 'What fertiliser should I use for maize?',
  'ai.chat.suggest.storage': 'How do I store grain safely?',
  'ai.chat.suggest.dryspell': 'What should I do during a dry spell?',
  'ai.chat.suggest.blight': 'How do I manage early blight on tomatoes?',
  'ai.chat.suggest.market': 'When is the best time to sell my harvest?',
  'ai.chat.scan': 'Check a crop photo',
  'ai.chat.voice': 'Ask by voice',
  'ai.chat.placeholder': 'Type your farming question',
  'ai.chat.send': 'Ask',
  'ai.chat.tooLong': 'Please shorten your question (2,000 characters at most).',
  'ai.chat.searching': 'Searching the knowledge base…',
  'ai.chat.youAsked': 'You asked: {text}',
  'ai.chat.offline': 'You are offline. Connect to the internet to ask a question.',

  // ── Answers ───────────────────────────────────────────────────────────────
  'ai.answer.kbIntro': 'Here is what the Kilimo knowledge base says:',
  'ai.answer.kbNoLlm':
    'These are the most relevant articles, shown as written. Written AI answers are not switched on yet.',
  'ai.answer.llmFailed':
    'The AI writer could not respond just now, so the matching articles are shown as written.',
  'ai.answer.generatedNote': 'Written by AI using only the articles below.',
  'ai.answer.sources': 'Sources ({count})',
  'ai.answer.noMatch.title': 'No matching guidance found',
  'ai.answer.noMatch.body':
    'The Kilimo knowledge base has nothing on this yet. Try other words (for example the crop and the problem you see), or ask your local extension officer.',
  'ai.answer.disclaimer':
    'General guidance, not a diagnosis of your farm. Check chemical rates with an extension officer.',
  'ai.source.a11y': 'Source {n}: {title}, category {category}',

  // ── Knowledge base categories ─────────────────────────────────────────────
  'ai.category.crop_disease': 'Crop pests & diseases',
  'ai.category.fertiliser': 'Fertiliser',
  'ai.category.irrigation': 'Irrigation',
  'ai.category.post_harvest': 'Post-harvest',
  'ai.category.weather_pattern': 'Weather',
  'ai.category.market_info': 'Markets',

  // ── Errors (shared) ───────────────────────────────────────────────────────
  'ai.err.notConfigured.title': 'Kilimo AI is not connected',
  'ai.err.notConfigured.body':
    'This build of the app is not connected to the Kilimo server, so questions cannot be answered.',
  'ai.err.unauthorized.title': 'Please sign in',
  'ai.err.unauthorized.body': 'Sign in to your account to ask Kilimo AI.',
  'ai.err.unavailable.title': 'Kilimo AI is unavailable',
  'ai.err.unavailable.body':
    'The answer service is not available right now. Please try again later.',
  'ai.err.network.title': 'No connection',
  'ai.err.network.body': 'We could not reach the server. Check your internet and try again.',
  'ai.err.invalid.title': 'Question not sent',
  'ai.err.invalid.body': 'Please type a question of up to 2,000 characters.',
  'ai.err.server.title': 'Something went wrong',
  'ai.err.server.body': 'We could not get an answer. Please try again.',

  // ── Crop photo check (scan) ───────────────────────────────────────────────
  'ai.scan.title': 'Check a crop photo',
  'ai.scan.intro.title': 'AI photo check',
  'ai.scan.intro.body':
    'Take a clear photo of the affected leaf, stem or fruit. The AI suggests what the problem might be — always confirm with an extension officer before treating.',
  'ai.scan.tips.title': 'For a useful photo',
  'ai.scan.tips.1': 'Use daylight and avoid the camera flash.',
  'ai.scan.tips.2': 'Hold the phone 15–30 cm from the affected part.',
  'ai.scan.tips.3': 'Keep still so the photo is sharp.',
  'ai.scan.takePhoto': 'Take photo',
  'ai.scan.gallery': 'Choose from gallery',
  'ai.scan.analyzing': 'Checking the photo…',
  'ai.scan.photoA11y': 'Your crop photo',
  'ai.scan.offline': 'You are offline. Photo checks need an internet connection.',
  'ai.scan.unavailable.title': 'Photo diagnosis is unavailable',
  'ai.scan.unavailable.body':
    'No image model is set up on the Kilimo server yet, so we cannot check photos. We will not guess. You can still look up symptoms in the knowledge base or ask your extension officer.',
  'ai.scan.askKb': 'Ask the knowledge base',
  'ai.scan.again': 'Check another photo',
  'ai.scan.result.overline': 'AI suggestion',
  'ai.scan.result.crop': 'Crop: {crop}',
  'ai.scan.result.actions': 'Suggested next steps',
  'ai.scan.severity.low': 'Severity: low',
  'ai.scan.severity.medium': 'Severity: medium',
  'ai.scan.severity.high': 'Severity: high',
  'ai.scan.severity.critical': 'Severity: critical',
  'ai.scan.confidence.low': 'AI confidence: low',
  'ai.scan.confidence.medium': 'AI confidence: medium',
  'ai.scan.confidence.high': 'AI confidence: high',
  'ai.scan.poorPhoto': 'The photo quality is poor, so this suggestion is less reliable.',
  'ai.scan.incomplete.title': 'No clear result',
  'ai.scan.incomplete.body':
    'The AI could not name a problem from this photo. Take a closer, sharper photo in daylight, or ask an extension officer.',
  'ai.scan.expert.title': 'Talk to an expert',
  'ai.scan.expert.body':
    'This may be serious or uncertain. Please show the plant to an extension officer before you spray or remove crops.',
  'ai.scan.disclaimer': 'This is an AI suggestion from one photo, not a confirmed diagnosis.',
  'ai.scan.task.add': 'Add a follow-up task',
  'ai.scan.task.saved': 'Follow-up task added',
  'ai.scan.task.failed': 'Could not add the task — try again',
  'ai.scan.task.title': 'Check crop: {disease}',
  'ai.scan.err.title': 'Photo not checked',
  'ai.scan.err.permission': 'Allow camera or photo access in your phone settings, then try again.',
  'ai.scan.err.photo': 'This photo could not be used. Try a smaller or different photo.',
  'ai.scan.err.signIn': 'Sign in to your account to check photos.',
  'ai.scan.err.network': 'No connection. Check your internet and try again.',
  'ai.scan.err.offline': 'You are offline. Connect to the internet to check a photo.',
  'ai.scan.err.server': 'The photo check failed. Please try again.',

  // ── Voice ─────────────────────────────────────────────────────────────────
  'ai.voice.title': 'Ask by voice',
  'ai.voice.intro.title': 'Speak your question',
  'ai.voice.intro.body':
    'Tap the button, ask your question, then tap again to stop. Answers come from the Kilimo knowledge base.',
  'ai.voice.start': 'Start recording',
  'ai.voice.stop': 'Stop and ask',
  'ai.voice.wait': 'Please wait…',
  'ai.voice.micHint': 'Records your question with the microphone',
  'ai.voice.listening': 'Listening… tap "Stop and ask" when you finish.',
  'ai.voice.transcribing': 'Turning your voice into text…',
  'ai.voice.quick': 'Or tap a question',
  'ai.voice.youAsked': 'You asked: {text}',
  'ai.voice.err.permission': 'Allow microphone access in your phone settings to ask by voice.',
  'ai.voice.err.mic': 'The microphone could not start. Please try again.',
  'ai.voice.err.empty': 'We did not catch that. Please try again.',
  'ai.voice.err.tooLong': 'The recording is too long. Please ask a shorter question.',
  'ai.voice.err.sttUnavailable':
    'Voice-to-text is not set up on the Kilimo server yet. Tap one of the questions below or type in Ask AI instead.',
  'ai.voice.err.network': 'No connection. Check your internet and try again.',
  'ai.voice.err.signIn': 'Sign in to your account to ask by voice.',
  'ai.voice.err.server': 'Your recording could not be processed. Please try again.',

  // ── AI admin ──────────────────────────────────────────────────────────────
  'ai.admin.title': 'AI knowledge base',
  'ai.admin.denied.title': 'Admins only',
  'ai.admin.denied.body': 'This page is only available to Kilimo administrators.',
  'ai.admin.error.title': 'Could not load the status',
  'ai.admin.status.title': 'Current status',
  'ai.admin.status.documents': 'Articles',
  'ai.admin.status.embedded': 'Articles with embeddings',
  'ai.admin.status.embeddedValue': '{n} of {total}',
  'ai.admin.status.llm': 'AI writer (provider key)',
  'ai.admin.status.retrieval': 'Search method in use',
  'ai.admin.yes': 'Configured',
  'ai.admin.no': 'Not configured',
  'ai.admin.retrieval.vector': 'Meaning search (embeddings)',
  'ai.admin.retrieval.fulltext': 'Word search (full-text)',
  'ai.admin.retrieval.keyword': 'Basic keyword match',
  'ai.admin.answers.generated': 'Farmers get a short AI-written answer plus the source articles.',
  'ai.admin.answers.passages':
    'Farmers get the matching articles as written, with no AI-written text.',
  'ai.admin.howto.title': 'How to improve answers',
  'ai.admin.howto.key':
    'Set the OPENAI_API_KEY secret on the rag-chat and openai-proxy edge functions to switch on written answers, photo checks and voice-to-text.',
  'ai.admin.howto.embed':
    'After the key is set, run scripts/embed-knowledge.ts once to add embeddings for meaning-based search.',
  'ai.admin.howto.migration':
    'Full-text search is not installed. Apply the knowledge_search database migration.',
  'ai.admin.howto.add':
    'Articles are added by the Kilimo team through a reviewed database migration, never from the app.',
  'ai.admin.articles': 'Articles ({count})',
  'ai.admin.articles.empty': 'The knowledge base has no articles yet.',

  // ── Training hub ──────────────────────────────────────────────────────────
  'ai.train.title': 'Learn to use Sankofa AI',
  'ai.train.intro.title': 'Five short lessons',
  'ai.train.intro.body':
    'Learn how to ask good questions, take useful photos and know when to call an expert. Each lesson ends with one question.',
  'ai.train.progress': '{done} of {total} lessons completed',
  'ai.train.completed': 'Done',
  'ai.train.notStarted': 'Not done yet',
  'ai.train.lesson': 'Lesson',
  'ai.train.check': 'Check answer',
  'ai.train.correct': 'Correct! Lesson completed.',
  'ai.train.wrong': 'Not quite. Read the lesson again and try another answer.',
  'ai.train.next': 'Next lesson',
  'ai.train.backToList': 'Back to lessons',
  'ai.train.done.title': 'All lessons completed',
  'ai.train.done.body':
    'Well done. This is an in-app learning milestone, not an official certificate.',
  'ai.train.m1.title': '1. Start with the crop and the problem',
  'ai.train.m1.subtitle': 'Give the AI what it needs',
  'ai.train.m1.lesson':
    'Kilimo AI searches its knowledge base using the words in your question. Name the crop and describe what you see — for example "yellow spots on maize leaves" — rather than only saying "my plants are sick".',
  'ai.train.m1.q': 'Which question will get the most useful answer?',
  'ai.train.m1.o1': 'A) "I have a problem with my plant."',
  'ai.train.m1.o2':
    'B) "My maize leaves have ragged holes and there is sawdust-like dirt in the funnel."',
  'ai.train.m1.o3': 'C) "Help me quickly!"',
  'ai.train.m2.title': '2. Ask one clear question',
  'ai.train.m2.subtitle': 'Specific details, one topic at a time',
  'ai.train.m2.lesson':
    "Ask about one topic at a time and add useful details: the plant's age, recent weather and what you have already tried. Specific questions match the right articles; very general questions match nothing.",
  'ai.train.m2.q': 'What details help Kilimo AI most?',
  'ai.train.m2.o1': 'A) The crop, its age and what you have seen or tried',
  'ai.train.m2.o2': 'B) Only the price of fertiliser',
  'ai.train.m2.o3': 'C) "Why is farming hard?"',
  'ai.train.m3.title': '3. Take a useful crop photo',
  'ai.train.m3.subtitle': 'Rules for a clear photo',
  'ai.train.m3.lesson':
    'Photo checks fail when photos are dark or blurry. Take photos in daylight, 15–30 cm from the plant, focused on the affected leaf, stem or fruit, and hold the phone still.',
  'ai.train.m3.q': 'Which is the right way to take a photo for the AI?',
  'ai.train.m3.o1': 'A) The whole field from far away in the evening',
  'ai.train.m3.o2': 'B) At night using the camera flash',
  'ai.train.m3.o3': 'C) Close (15–30 cm), in daylight, focused on the affected part and held still',
  'ai.train.m4.title': '4. Check confidence and sources',
  'ai.train.m4.subtitle': 'Know when the AI is unsure',
  'ai.train.m4.lesson':
    'Every photo check shows how confident the AI is (low, medium or high), and every answer lists the articles it comes from. If confidence is low or no article matches, do not act on it — take a better photo, read the sources, or ask an extension officer.',
  'ai.train.m4.q': 'What should you do when the AI says its confidence is low?',
  'ai.train.m4.o1': 'A) Spray the crop anyway',
  'ai.train.m4.o2': 'B) Take a better photo in good light or ask an extension officer',
  'ai.train.m4.o3': 'C) Stop farming that crop',
  'ai.train.m5.title': '5. Know when to call an expert',
  'ai.train.m5.subtitle': 'AI limits and chemical safety',
  'ai.train.m5.lesson':
    'Kilimo AI does not give exact chemical doses, because a wrong dose can destroy crops or harm people and animals. It can name the type of product, but always confirm the product and rate with an extension officer, and read the label.',
  'ai.train.m5.q': 'Why does Kilimo AI not give exact pesticide doses?',
  'ai.train.m5.o1':
    'A) A wrong dose can kill crops or harm health, so it must be confirmed by an extension officer',
  'ai.train.m5.o2': 'B) The AI does not know any farm chemicals',
  'ai.train.m5.o3': 'C) Because chemicals are free',

  // ── Video hub ─────────────────────────────────────────────────────────────
  'ai.video.title': 'Training videos',
  'ai.video.empty.title': 'No verified videos yet',
  'ai.video.empty.body':
    'We only list videos that have been checked by the Kilimo team, and none have been added yet. Meanwhile, the knowledge base and the AI lessons are available.',
  'ai.video.askKb': 'Ask the knowledge base',
  'ai.video.lessons': 'Open AI lessons',
  'ai.video.note': 'Videos will appear here once a verified catalogue is published.',
} as const;
