// Cloudflare D1 client with three-tier fallback:
// 1. Production Workers: native D1 binding via request context (env.DB)
// 2. Local dev with credentials: D1 REST API
// 3. Local dev without credentials: node:sqlite built-in (Node 24)

export type D1Row = Record<string, string | number | boolean | null>;

interface D1Meta {
  duration: number;
  last_row_id: number | null;
  changes: number;
  changed_db: boolean;
  rows_read: number;
  rows_written: number;
}

interface D1QueryResult<T extends D1Row> {
  results: T[];
  meta: D1Meta;
  success: boolean;
}

interface D1ApiResponse<T extends D1Row> {
  result: D1QueryResult<T>[];
  success: boolean;
  errors: Array<{ code: number; message: string }>;
}

const EMPTY_META: D1Meta = { duration: 0, last_row_id: null, changes: 0, changed_db: false, rows_read: 0, rows_written: 0 };

function restCfg() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const databaseId = process.env.CF_D1_DATABASE_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) return null;
  return { accountId, databaseId, apiToken };
}

// Try to get the native D1 binding from the Cloudflare Worker request context
async function nativeD1Query<T extends D1Row>(sql: string, params?: unknown[]): Promise<D1QueryResult<T> | null> {
  try {
    const h3 = await import("h3");
    const event = h3.getEvent();
    const db = (event?.context as any)?.cloudflare?.env?.DB;
    if (!db || typeof db.prepare !== "function") return null;

    const upper = sql.trim().toUpperCase();
    if (upper.startsWith("SELECT") || upper.startsWith("WITH")) {
      const stmt = db.prepare(sql);
      const bound = params?.length ? stmt.bind(...params) : stmt;
      const result = await bound.all();
      return { results: result.results as T[], meta: { ...EMPTY_META, rows_read: result.results.length }, success: true };
    }
    const stmt = db.prepare(sql);
    const bound = params?.length ? stmt.bind(...params) : stmt;
    const result = await bound.run();
    return {
      results: [] as T[],
      meta: { ...EMPTY_META, changes: result.meta?.changes ?? 0, last_row_id: result.meta?.last_row_id ?? null, changed_db: true },
      success: true,
    };
  } catch {
    return null;
  }
}

async function restApiQuery<T extends D1Row>(sql: string, params?: unknown[]): Promise<D1QueryResult<T>> {
  const config = restCfg()!;
  const { accountId, databaseId, apiToken } = config;
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params: params ?? [] }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 HTTP ${res.status}: ${text}`);
  }
  const json = (await res.json()) as D1ApiResponse<T>;
  if (!json.success) throw new Error(`D1 error: ${JSON.stringify(json.errors)}`);
  return json.result[0];
}

let cachedLocalDb: import("node:sqlite").DatabaseSync | null = null;

async function getLocalDb() {
  if (cachedLocalDb) return cachedLocalDb;
  const { DatabaseSync } = await import("node:sqlite");
  const { mkdirSync, existsSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dir = join(process.cwd(), ".dev-data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  cachedLocalDb = new DatabaseSync(join(dir, "creatorconnect.db"));
  return cachedLocalDb;
}

async function localSqliteQuery<T extends D1Row>(sql: string, params?: unknown[]): Promise<D1QueryResult<T>> {
  const db = await getLocalDb();
  const upper = sql.trim().toUpperCase();
  const stmt = db.prepare(sql);
  if (upper.startsWith("SELECT") || upper.startsWith("WITH")) {
    const results = stmt.all(...(params ?? [])) as unknown as T[];
    return { results, meta: { ...EMPTY_META, rows_read: results.length }, success: true };
  }
  const info = stmt.run(...(params ?? [])) as unknown as { changes: number; lastInsertRowid: number };
  return {
    results: [] as T[],
    meta: { ...EMPTY_META, changes: info.changes ?? 0, last_row_id: info.lastInsertRowid ?? null, changed_db: true },
    success: true,
  };
}

async function d1Query<T extends D1Row = D1Row>(sql: string, params?: unknown[]): Promise<D1QueryResult<T>> {
  // 1. Production Workers: use native D1 binding
  const native = await nativeD1Query<T>(sql, params);
  if (native) return native;

  // 2. Local dev with CF credentials: use REST API
  if (restCfg()) return restApiQuery<T>(sql, params);

  // 3. Local dev without credentials: use node:sqlite
  try {
    return await localSqliteQuery<T>(sql, params);
  } catch {
    return { results: [] as T[], meta: EMPTY_META, success: true };
  }
}

export async function d1One<T extends D1Row = D1Row>(sql: string, params?: unknown[]): Promise<T | null> {
  const result = await d1Query<T>(sql, params);
  return (result.results[0] as T) ?? null;
}

export async function d1All<T extends D1Row = D1Row>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await d1Query<T>(sql, params);
  return result.results as T[];
}

export async function d1Run(sql: string, params?: unknown[]): Promise<number> {
  const result = await d1Query(sql, params);
  return result.meta.changes;
}
