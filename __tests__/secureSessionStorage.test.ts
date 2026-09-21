import { createChunkedStorage, type KeyValueStore } from '../lib/secureSessionStorage';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async getItemAsync(k) {
      return data.has(k) ? (data.get(k) as string) : null;
    },
    async setItemAsync(k, v) {
      data.set(k, v);
    },
    async deleteItemAsync(k) {
      data.delete(k);
    },
  };
}

describe('createChunkedStorage', () => {
  it('round-trips a small value', async () => {
    const s = createChunkedStorage(memoryStore(), 10);
    await s.setItem('k', 'hello');
    expect(await s.getItem('k')).toBe('hello');
  });

  it('round-trips a value larger than the chunk size, exactly', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store, 7);
    const value = JSON.stringify({ access_token: 'a'.repeat(60), refresh_token: 'b'.repeat(40) });
    await s.setItem('sess', value);
    expect(await s.getItem('sess')).toBe(value);
    // every stored chunk respects the limit
    for (const [k, v] of store.data) if (!k.endsWith('.n')) expect(v.length).toBeLessThanOrEqual(7);
  });

  it('returns null for a missing key', async () => {
    expect(await createChunkedStorage(memoryStore()).getItem('nope')).toBeNull();
  });

  it('removes every chunk on removeItem', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store, 4);
    await s.setItem('k', 'x'.repeat(50));
    await s.removeItem('k');
    expect(store.data.size).toBe(0);
    expect(await s.getItem('k')).toBeNull();
  });

  it('drops stale chunks when overwritten with a shorter value', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store, 4);
    await s.setItem('k', 'x'.repeat(40)); // 10 chunks
    await s.setItem('k', 'short'); // 2 chunks
    expect(await s.getItem('k')).toBe('short');
    expect([...store.data.keys()].filter((k) => k.startsWith('k.')).length).toBe(3); // 2 chunks + count
  });

  it('treats a torn write (missing chunk) as no session, never partial data', async () => {
    const store = memoryStore();
    const s = createChunkedStorage(store, 4);
    await s.setItem('k', 'abcdefghijkl');
    store.data.delete('k.1');
    expect(await s.getItem('k')).toBeNull();
  });
});
