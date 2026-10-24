import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../bot/database/migrations/0187_round_nine_announcement_after_round_eight_results.sql",
    import.meta.url,
  ),
  "utf8",
);
const resultsKey = "season-round-results-tournament-42-round-8";
const schedulerSource = readFileSync(
  new URL("../../bot/cogs/channel_announcements.py", import.meta.url),
  "utf8",
);
const nextDueQuery = schedulerSource.match(
  /SELECT MIN\(due_at\)[\s\S]*?\) scheduled/,
)![0];
const registrationKeys = [
  "season9-registration-round-9-boosty",
  "season9-registration-round-9-public",
];
let db: PGlite;

async function readyKeys() {
  const result = await db.query<{ dedupe_key: string }>(
    `SELECT dedupe_key FROM channel_announcement_outbox
     WHERE status = 'pending' AND available_at <= NOW()
     ORDER BY dedupe_key`,
  );
  return result.rows.map((row) => row.dedupe_key);
}

async function addResults(status: string) {
  await db.query(
    `INSERT INTO channel_announcement_outbox (dedupe_key, status)
     VALUES ($1, $2)`,
    [resultsKey, status],
  );
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE channel_announcement_edits (available_at TIMESTAMPTZ, attempts INTEGER);
    CREATE TABLE tournaments (id BIGINT PRIMARY KEY, slug TEXT);
    INSERT INTO tournaments VALUES (42, 'league-season-9');
    CREATE TABLE channel_announcement_outbox (
      dedupe_key TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      report_status TEXT NOT NULL DEFAULT 'not_required',
      report_available_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    INSERT INTO channel_announcement_outbox (dedupe_key, available_at) VALUES
      ('season9-registration-round-9-boosty', NOW() - INTERVAL '1 day'),
      ('season9-registration-round-9-public', NOW() + INTERVAL '4 days'),
      ('season9-registration-round-10-public', NOW() - INTERVAL '1 day');
  `);
});

afterEach(async () => {
  await db.close();
});

describe("round nine announcements wait for the published round eight results", () => {
  it("lets the scheduler sleep when only held announcements remain", async () => {
    await db.exec(migration);
    await db.exec(`DELETE FROM channel_announcement_outbox
      WHERE dedupe_key = 'season9-registration-round-10-public'`);
    const next = await db.query<{ min: string | null }>(nextDueQuery);
    expect(next.rows[0].min).toBeNull();
  });

  it("holds both audiences even when their original dates have passed", async () => {
    await db.exec(migration);
    expect(await readyKeys()).toEqual(["season9-registration-round-10-public"]);
    await db.exec(`UPDATE channel_announcement_outbox SET available_at = NOW()
      WHERE dedupe_key LIKE 'season9-registration-round-9-%'`);
    expect(await readyKeys()).toEqual(["season9-registration-round-10-public"]);
  });

  it("does not release registrations for queued or failed result posts", async () => {
    await db.exec(migration);
    await addResults("pending");
    expect(await readyKeys()).not.toContain(registrationKeys[0]);
    await db.query(
      "UPDATE channel_announcement_outbox SET status = 'failed' WHERE dedupe_key = $1",
      [resultsKey],
    );
    expect(await readyKeys()).toEqual(["season9-registration-round-10-public"]);
  });

  it("releases both immediately after successful delivery, overriding future dates", async () => {
    await db.exec(migration);
    await addResults("pending");
    await db.query(
      "UPDATE channel_announcement_outbox SET status = 'sent' WHERE dedupe_key = $1",
      [resultsKey],
    );
    expect(await readyKeys()).toEqual([
      "season9-registration-round-10-public",
      ...registrationKeys,
    ]);
  });

  it("ignores previews and results for other rounds or tournaments", async () => {
    await db.exec(migration);
    await db.exec(`INSERT INTO channel_announcement_outbox (dedupe_key, status)
      VALUES ('season9-results-preview-round-8', 'pending'),
             ('season-round-results-tournament-42-round-7', 'pending'),
             ('season-round-results-tournament-99-round-8', 'pending');
      UPDATE channel_announcement_outbox SET status = 'sent'
      WHERE dedupe_key LIKE '%results%'`);
    expect(await readyKeys()).toEqual(["season9-registration-round-10-public"]);
  });

  it("releases pending registrations if results were already delivered", async () => {
    await addResults("sent");
    await db.exec(migration);
    expect(await readyKeys()).toEqual([
      "season9-registration-round-10-public",
      ...registrationKeys,
    ]);
  });

  it("preserves sent announcements and does not reset retry dates on repeated updates", async () => {
    await db.query(
      "UPDATE channel_announcement_outbox SET status = 'sent' WHERE dedupe_key = $1",
      [registrationKeys[0]],
    );
    await db.exec(migration);
    await addResults("pending");
    await db.query(
      "UPDATE channel_announcement_outbox SET status = 'sent' WHERE dedupe_key = $1",
      [resultsKey],
    );
    expect(await readyKeys()).toContain(registrationKeys[1]);
    expect(await readyKeys()).not.toContain(registrationKeys[0]);
    await db.query(
      `UPDATE channel_announcement_outbox SET available_at = NOW() + INTERVAL '5 minutes'
       WHERE dedupe_key = $1`,
      [registrationKeys[1]],
    );
    await db.query(
      "UPDATE channel_announcement_outbox SET status = 'sent' WHERE dedupe_key = $1",
      [resultsKey],
    );
    expect(await readyKeys()).not.toContain(registrationKeys[1]);
  });
});
