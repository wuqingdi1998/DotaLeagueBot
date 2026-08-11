import type { PoolClient } from "pg";

type DatabaseClockRow = {
  server_now: Date;
};

export async function databaseNow(client: PoolClient): Promise<Date> {
  const result = await client.query<DatabaseClockRow>(
    "SELECT NOW() AS server_now",
  );
  const serverNow = result.rows[0]?.server_now;
  if (!serverNow) throw new Error("Database clock is unavailable");
  return serverNow;
}
