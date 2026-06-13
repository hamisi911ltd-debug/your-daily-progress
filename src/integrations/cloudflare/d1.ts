// Cloudflare D1 REST API client
// https://developers.cloudflare.com/d1/platform/client-api/

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

function cfg() {
  const accountId = process.env.CF_ACCOUNT_ID;
  const databaseId = process.env.CF_D1_DATABASE_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !databaseId || !apiToken) {
    throw new Error(
      "Cloudflare D1 not configured. Set CF_ACCOUNT_ID, CF_D1_DATABASE_ID, CF_API_TOKEN in .env"
    );
  }
  return { accountId, databaseId, apiToken };
}

async function d1Query<T extends D1Row = D1Row>(
  sql: string,
  params?: unknown[]
): Promise<D1QueryResult<T>> {
  const { accountId, databaseId, apiToken } = cfg();
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params: params ?? [] }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 HTTP ${res.status}: ${text}`);
  }

  const json = (await res.json()) as D1ApiResponse<T>;
  if (!json.success) {
    throw new Error(`D1 error: ${JSON.stringify(json.errors)}`);
  }
  return json.result[0];
}

export async function d1One<T extends D1Row = D1Row>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const result = await d1Query<T>(sql, params);
  return (result.results[0] as T) ?? null;
}

export async function d1All<T extends D1Row = D1Row>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await d1Query<T>(sql, params);
  return result.results as T[];
}

export async function d1Run(sql: string, params?: unknown[]): Promise<number> {
  const result = await d1Query(sql, params);
  return result.meta.changes;
}
