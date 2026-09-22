// KILIMO AI — pure retrieval helpers shared by the rag-chat edge function,
// scripts/embed-knowledge.ts and the Jest suite.
//
// Deliberately dependency-free (no Deno / npm imports) so the exact same code
// runs in Deno, Node and Jest.

/** Embedding model + dimension. MUST match knowledge_base.embedding vector(768). */
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 768;
/** Cosine-similarity floor for match_knowledge (text-embedding-3 scores run low). */
export const VECTOR_MATCH_THRESHOLD = 0.3;
export const DEFAULT_MATCH_COUNT = 3;
export const MAX_QUERY_LENGTH = 2000;

export type RetrievalMethod = 'vector' | 'fulltext' | 'keyword' | 'none';

export interface KnowledgeRow {
  id?: string;
  title: string;
  content: string;
  category: string;
}

export interface RankedPassage extends KnowledgeRow {
  score: number;
}

/** Text that is embedded for a knowledge_base row (the script and any re-embed use this). */
export function embeddingInput(row: KnowledgeRow): string {
  return `${row.title}\n${row.category.replace(/_/g, ' ')}\n${row.content}`;
}

/**
 * Swahili → English farming vocabulary. The seeded knowledge base is written in
 * English, so a Swahili question ("viwavi jeshi kwenye mahindi") is expanded
 * with the English terms it means before searching. This is query expansion
 * only — it never adds content to an answer.
 */
const SW_EN: Record<string, string[]> = {
  mahindi: ['maize'],
  mhindi: ['maize'],
  nyanya: ['tomato'],
  viazi: ['potato'],
  mpunga: ['rice'],
  mchele: ['rice'],
  maharage: ['beans'],
  viwavi: ['armyworm', 'caterpillar'],
  jeshi: ['armyworm'],
  wadudu: ['pest', 'insect'],
  ugonjwa: ['disease'],
  magonjwa: ['disease'],
  kutu: ['rust'],
  ukungu: ['blight', 'mould'],
  madoa: ['spots'],
  majani: ['leaves'],
  mbolea: ['fertiliser', 'fertilizer'],
  samadi: ['manure'],
  udongo: ['soil'],
  umwagiliaji: ['irrigation', 'water'],
  kumwagilia: ['irrigation', 'water'],
  maji: ['water'],
  ukame: ['dry', 'drought'],
  kiangazi: ['dry'],
  mvua: ['rain'],
  mafuriko: ['rain', 'waterlogging'],
  hali: ['weather'],
  hewa: ['weather'],
  soko: ['market'],
  masoko: ['market'],
  bei: ['price', 'prices'],
  kuuza: ['sell', 'sales'],
  mavuno: ['harvest'],
  kuvuna: ['harvest'],
  kuhifadhi: ['storage', 'store'],
  hifadhi: ['storage'],
  ghala: ['storage', 'silo'],
  nafaka: ['grain'],
  kupanda: ['planting'],
  panda: ['planting'],
  dawa: ['insecticide', 'fungicide'],
  kuvu: ['fungicide', 'mould'],
  sumukuvu: ['aflatoxin'],
};

const STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'what',
  'how',
  'why',
  'when',
  'which',
  'who',
  'does',
  'should',
  'can',
  'my',
  'your',
  'our',
  'this',
  'that',
  'there',
  'are',
  'was',
  'you',
  'have',
  'has',
  'about',
  'from',
  'into',
  'will',
  'would',
  'could',
  'please',
  'tell',
  'give',
  'need',
  'na',
  'ya',
  'wa',
  'za',
  'kwa',
  'la',
  'cha',
  'vya',
  'ni',
  'je',
  'nini',
  'gani',
  'vipi',
  'kuhusu',
  'yangu',
  'wangu',
  'changu',
  'kwenye',
  'katika',
  'nina',
  'naomba',
  'tafadhali',
  'jinsi',
  'sana',
]);

/** Lower-case word tokens, 3+ chars, stop words removed, de-duplicated (order kept). */
export function tokenize(text: string): string[] {
  const out: string[] = [];
  for (const raw of String(text ?? '')
    .toLowerCase()
    .split(/[^a-z0-9À-ɏ]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    if (!out.includes(raw)) out.push(raw);
  }
  return out;
}

/** Very light English stemmer — enough for "leaves/leaf", "fertilisers", "planting". */
export function stem(word: string): string {
  let w = word;
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ies')) w = w.slice(0, -3) + 'y';
  else if (w.length > 4 && w.endsWith('ves')) w = w.slice(0, -3) + 'f';
  else if (w.length > 3 && w.endsWith('es') && !w.endsWith('ses')) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

/** Query terms plus English equivalents of any known Swahili farming words. */
export function expandQuery(query: string): string[] {
  const terms = tokenize(query);
  const out = [...terms];
  for (const t of terms) for (const e of SW_EN[t] ?? []) if (!out.includes(e)) out.push(e);
  return out;
}

/** Query string handed to search_knowledge() (the expansion appended to the original). */
export function fullTextQuery(query: string): string {
  return expandQuery(query).join(' ');
}

/**
 * Last-resort in-process ranking, used only if the search_knowledge() RPC is
 * unavailable (e.g. its migration has not been applied yet). Weighted term
 * overlap: title ×3, category ×2, content ×1, each query term counted once per
 * field. Rows with no overlap are dropped — nothing irrelevant is returned.
 */
export function rankPassages(
  query: string,
  rows: KnowledgeRow[],
  limit = DEFAULT_MATCH_COUNT
): RankedPassage[] {
  const terms = [...new Set(expandQuery(query).map(stem))];
  if (!terms.length) return [];
  const fieldStems = (s: string) => new Set(tokenize(s.replace(/_/g, ' ')).map(stem));

  const scored = rows.map((row) => {
    const title = fieldStems(row.title);
    const category = fieldStems(row.category);
    const content = fieldStems(row.content);
    let score = 0;
    for (const t of terms) {
      if (title.has(t)) score += 3;
      if (category.has(t)) score += 2;
      if (content.has(t)) score += 1;
    }
    return { ...row, score };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, limit));
}

/** Grounded system prompt for the LLM. Only used when a provider key is configured. */
export function groundedSystemPrompt(passages: KnowledgeRow[], lang: 'en' | 'sw'): string {
  const numbered = passages
    .map((p, i) => `[${i + 1}] ${p.title} (${p.category})\n${p.content}`)
    .join('\n\n');
  const language = lang === 'sw' ? 'Swahili (Kiswahili)' : 'English';
  return [
    'You are Sankofa AI, the agronomy assistant in the Kilimo app for East African smallholder farmers.',
    'Answer ONLY from the numbered Kilimo knowledge base passages below. If they do not answer the question, say so plainly and suggest asking a local extension officer.',
    'Never invent prices, weather forecasts, yields, statistics or pesticide dosages. Cite passages as [1], [2].',
    `Reply in ${language}, in 2-5 short, practical sentences.`,
    '',
    'Kilimo knowledge base passages:',
    numbered,
  ].join('\n');
}

/** Trim a passage for the source list (whole words, ellipsis). */
export function excerpt(content: string, max = 280): string {
  const clean = String(content ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max).trim()}…`;
}
