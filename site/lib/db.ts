import {
  Pool,
  type PoolClient,
  type PoolConfig,
  type QueryResultRow,
} from "pg";

declare global {
  var __linkensSpherePool: Pool | undefined;
}

function databaseConfig(): PoolConfig {
  if (process.env.DATABASE_URL) {
    return { connectionString: process.env.DATABASE_URL };
  }
  const required = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"] as const;
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing database settings: ${missing.join(", ")}`);
  }
  return {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    host: process.env.POSTGRES_HOST ?? "localhost",
    port: Number(process.env.POSTGRES_PORT ?? 5432),
  };
}

function getPool(): Pool {
  if (!globalThis.__linkensSpherePool) {
    globalThis.__linkensSpherePool = new Pool({
      ...databaseConfig(),
      max: Number(process.env.DATABASE_POOL_SIZE ?? 10),
      idleTimeoutMillis: 30_000,
    });
  }
  return globalThis.__linkensSpherePool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, [...values]);
  return result.rows;
}

export async function one<T extends QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, values);
  return rows[0] ?? null;
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await callback(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
