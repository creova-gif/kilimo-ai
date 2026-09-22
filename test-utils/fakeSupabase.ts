/**
 * In-memory stand-in for the slice of supabase-js the offline queue uses:
 * auth.getSession, from().upsert/insert/update().eq().select()/delete().eq().
 * Failures are injectable per call via `client.failWith`.
 */
export interface FakeCall {
  table: string;
  op: 'upsert' | 'insert' | 'update' | 'delete';
  arg?: any;
  match?: Record<string, any>;
}

export type Failure = { code?: string; message?: string; status?: number } | 'throw' | null;

export interface FakeClient {
  tables: Record<string, any[]>;
  calls: FakeCall[];
  /** Called for every request; return an error object, 'throw' (network failure) or null. */
  failWith: (call: FakeCall) => Failure;
  /** Simulate "the request landed but the response was lost": apply the write, then fail. */
  loseResponse: boolean;
  from(table: string): any;
  auth: { getSession: jest.Mock };
  rows(table: string): any[];
}

export function createFakeSupabase(userId: string | null = 'user-1'): FakeClient {
  const client: FakeClient = {
    tables: {},
    calls: [],
    failWith: () => null,
    loseResponse: false,
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: userId ? { user: { id: userId } } : null },
      })),
    },
    rows(table) {
      return (client.tables[table] ??= []);
    },
    from(table: string) {
      const rows = () => client.rows(table);
      const settle = <T>(call: FakeCall, apply: () => T, ok: (r: T) => any) => {
        client.calls.push(call);
        const f = client.failWith(call);
        if (client.loseResponse) {
          apply();
          return Promise.reject(new TypeError('Network request failed'));
        }
        if (f === 'throw') return Promise.reject(new TypeError('Network request failed'));
        if (f) return Promise.resolve({ data: null, error: f });
        return Promise.resolve(ok(apply()));
      };
      return {
        upsert: (row: any, o: { onConflict?: string; ignoreDuplicates?: boolean } = {}) =>
          settle(
            { table, op: 'upsert', arg: row },
            () => {
              const key = o.onConflict ?? 'id';
              const hit = rows().find((r) => r[key] === row[key]);
              if (!hit) rows().push({ ...row });
              else if (!o.ignoreDuplicates) Object.assign(hit, row);
            },
            () => ({ error: null })
          ),
        insert: (row: any) =>
          settle(
            { table, op: 'insert', arg: row },
            () => rows().push({ ...row }),
            () => ({ error: null })
          ),
        update: (values: any) => {
          const match: Record<string, any> = {};
          const q: any = {
            eq(k: string, v: any) {
              match[k] = v;
              return q;
            },
            select: () =>
              settle(
                { table, op: 'update', arg: values, match },
                () => {
                  const hit = rows().filter((r) => Object.entries(match).every(([k, v]) => r[k] === v));
                  hit.forEach((r) => Object.assign(r, values));
                  return hit;
                },
                (hit) => ({ data: hit.map((r) => ({ id: r.id })), error: null })
              ),
          };
          return q;
        },
        delete: () => {
          const match: Record<string, any> = {};
          const q: any = {
            eq(k: string, v: any) {
              match[k] = v;
              return q;
            },
            then: (res: any, rej: any) =>
              settle(
                { table, op: 'delete', match },
                () => {
                  client.tables[table] = rows().filter(
                    (r) => !Object.entries(match).every(([k, v]) => r[k] === v)
                  );
                },
                () => ({ error: null })
              ).then(res, rej),
          };
          return q;
        },
      };
    },
  };
  return client;
}
