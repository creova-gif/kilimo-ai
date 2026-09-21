/**
 * Keychain-backed storage adapter for the Supabase auth session.
 *
 * expo-secure-store values are limited to roughly 2 KB and a Supabase session
 * (access + refresh token + user) is larger, so the value is split into chunks:
 *   <key>.n        number of chunks
 *   <key>.0 … .n-1 the chunks
 * Shrinking a value removes the stale chunks so old token material never lingers.
 *
 * The backing store is injected so this is unit-testable; the app passes
 * expo-secure-store (iOS Keychain / Android Keystore), or localStorage on web.
 */
export interface KeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface AuthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const CHUNK_SIZE = 1800;

export function createChunkedStorage(store: KeyValueStore, chunkSize = CHUNK_SIZE): AuthStorage {
  const countKey = (k: string) => `${k}.n`;
  const chunkKey = (k: string, i: number) => `${k}.${i}`;

  async function readCount(key: string): Promise<number> {
    const raw = await store.getItemAsync(countKey(key));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  async function clear(key: string) {
    const n = await readCount(key);
    for (let i = 0; i < n; i++) await store.deleteItemAsync(chunkKey(key, i));
    await store.deleteItemAsync(countKey(key));
  }

  return {
    async getItem(key) {
      const n = await readCount(key);
      if (n === 0) return null;
      let out = '';
      for (let i = 0; i < n; i++) {
        const part = await store.getItemAsync(chunkKey(key, i));
        if (part == null) return null; // torn write → treat as no session
        out += part;
      }
      return out;
    },
    async setItem(key, value) {
      await clear(key); // remove any previous, possibly longer, value first
      const chunks: string[] = [];
      for (let i = 0; i < value.length; i += chunkSize) chunks.push(value.slice(i, i + chunkSize));
      for (let i = 0; i < chunks.length; i++) await store.setItemAsync(chunkKey(key, i), chunks[i]);
      await store.setItemAsync(countKey(key), String(chunks.length));
    },
    async removeItem(key) {
      await clear(key);
    },
  };
}
