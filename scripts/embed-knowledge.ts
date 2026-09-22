/**
 * KILIMO AI — fill knowledge_base.embedding once a provider key exists.
 *
 * Reads every public.knowledge_base row whose `embedding` is NULL (or every row
 * with --all), embeds `title + category + content` with the SAME model and
 * dimension rag-chat uses for queries (supabase/functions/rag-chat/retrieval.ts:
 * text-embedding-3-small @ 768 dims, matching the vector(768) column), and
 * writes the vectors back with the service-role key. It never inserts or edits
 * article text.
 *
 * Usage (from the repo root; nothing here runs automatically):
 *   SUPABASE_URL=http://127.0.0.1:54321 \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   OPENAI_API_KEY=sk-... \
 *   npx tsx scripts/embed-knowledge.ts            # only rows missing an embedding
 *   npx tsx scripts/embed-knowledge.ts --all      # re-embed every row (after a model change)
 *   npx tsx scripts/embed-knowledge.ts --dry-run  # list what would be embedded
 */
import { createClient } from '@supabase/supabase-js';
import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  embeddingInput,
} from '../supabase/functions/rag-chat/retrieval';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const all = process.argv.includes('--all');
const dryRun = process.argv.includes('--dry-run');

function fail(msg: string): never {
  console.error(`embed-knowledge: ${msg}`);
  process.exit(1);
}

async function embed(inputs: string[]): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: inputs,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 300)}`);
  const data = JSON.parse(text).data as { index: number; embedding: number[] }[];
  return data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function main() {
  if (!url) fail('set SUPABASE_URL');
  if (!serviceKey)
    fail('set SUPABASE_SERVICE_ROLE_KEY (knowledge_base is not readable with the anon key)');
  if (!openaiKey && !dryRun) fail('set OPENAI_API_KEY');

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let q = supabase.from('knowledge_base').select('id, title, content, category').order('title');
  if (!all) q = q.is('embedding', null);
  const { data: rows, error } = await q;
  if (error) fail(`could not read knowledge_base: ${error.message}`);
  if (!rows?.length) {
    console.log('Nothing to embed — every row already has an embedding.');
    return;
  }
  console.log(
    `${rows.length} row(s) to embed with ${EMBEDDING_MODEL} (${EMBEDDING_DIMENSIONS} dims).`
  );
  if (dryRun) {
    rows.forEach((r) => console.log(` - ${r.title}`));
    return;
  }

  let done = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const vectors = await embed(batch.map(embeddingInput));
    for (let j = 0; j < batch.length; j++) {
      if (vectors[j]?.length !== EMBEDDING_DIMENSIONS) {
        fail(`unexpected embedding size ${vectors[j]?.length} for "${batch[j].title}"`);
      }
      const { error: upErr } = await supabase
        .from('knowledge_base')
        .update({ embedding: JSON.stringify(vectors[j]), updated_at: new Date().toISOString() })
        .eq('id', batch[j].id);
      if (upErr) fail(`update failed for "${batch[j].title}": ${upErr.message}`);
      done++;
      console.log(`  ✓ ${batch[j].title}`);
    }
  }
  console.log(`Embedded ${done} row(s). rag-chat now uses vector search first.`);
}

main().catch((e) => fail(String(e?.message ?? e)));
