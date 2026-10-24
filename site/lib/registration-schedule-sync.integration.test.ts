import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it } from "vitest";

const migration = readFileSync(new URL("../../bot/database/migrations/0190_sync_season_registration_schedule.sql", import.meta.url), "utf8");
let db: PGlite;
beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE FUNCTION notify_bot_scheduled_events() RETURNS TRIGGER LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END $$;
    CREATE TABLE tournaments (id BIGINT PRIMARY KEY, slug TEXT);
    INSERT INTO tournaments VALUES (21, 'league-season-9'), (22, 'other');
    CREATE TABLE season_rounds (id BIGINT PRIMARY KEY, tournament_id BIGINT, round_number INTEGER, round_kind TEXT, scheduled_at TIMESTAMPTZ);
    INSERT INTO season_rounds VALUES
      (9,21,9,'regular','2026-10-25 21:00+03'), (10,21,10,'regular','2026-11-01 22:00+03'),
      (99,22,9,'regular','2026-12-01 21:00+03');
    CREATE TABLE channel_announcement_outbox (
      id BIGINT PRIMARY KEY, dedupe_key TEXT UNIQUE, content TEXT, status TEXT,
      discord_message_id BIGINT, available_at TIMESTAMPTZ);
    INSERT INTO channel_announcement_outbox VALUES
      (1,'season9-registration-round-9-public',E'@everyone\n01.11.2026 (Воскресенье) 21:00\nОткрыта регистрация','sent',123,NOW()),
      (2,'season9-registration-round-10-boosty',E'@everyone\n06.11.2026 (Пятница) 22:00\nОткрыта регистрация','pending',NULL,NOW()),
      (3,'unrelated', 'Do not change', 'sent',124,NOW());
  `);
  await db.exec(migration);
});
afterEach(async () => { await db.close(); });

it("corrects sent text through an edit queue and reschedules pending audiences", async () => {
  const rows = (await db.query<{id:number;content:string;status:string}>("SELECT * FROM channel_announcement_outbox ORDER BY id")).rows;
  expect(rows[0].content).toContain("25.10.2026 (Воскресенье) 21:00");
  expect(rows[0].status).toBe("sent");
  expect(rows[1].content).toContain("01.11.2026 (Воскресенье) 22:00");
  expect(rows[2].content).toBe("Do not change");
  expect((await db.query("SELECT announcement_id FROM channel_announcement_edits")).rows).toEqual([{announcement_id:1}]);
  expect((await db.query<{correct:boolean}>("SELECT available_at = TIMESTAMPTZ '2026-10-27 22:00+03' AS correct FROM channel_announcement_outbox WHERE id=2")).rows[0].correct).toBe(true);
});

it("follows later schedule changes without changing other tournaments or duplicating edits", async () => {
  await db.exec("UPDATE season_rounds SET scheduled_at='2026-10-26 20:30+03' WHERE id=9");
  expect((await db.query<{content:string}>("SELECT content FROM channel_announcement_outbox WHERE id=1")).rows[0].content).toContain("26.10.2026 (Понедельник) 20:30");
  await db.exec("SELECT sync_registration_round_schedule(9)");
  expect((await db.query("SELECT * FROM channel_announcement_edits")).rows).toHaveLength(1);
  await db.exec("UPDATE season_rounds SET scheduled_at='2026-10-27 20:30+03' WHERE id=99");
  expect((await db.query("SELECT * FROM channel_announcement_edits")).rows).toHaveLength(1);
});

it("normalizes newly prepared announcements using the current date", async () => {
  await db.exec(`INSERT INTO channel_announcement_outbox VALUES
    (4,'season9-registration-round-9-boosty','01.11.2026 (Воскресенье) 21:00','pending',NULL,NOW())`);
  expect((await db.query<{content:string}>("SELECT content FROM channel_announcement_outbox WHERE id=4")).rows[0].content).toBe("25.10.2026 (Воскресенье) 21:00");
});


it("preserves the round-eight-results dependency when rescheduling round nine", async () => {
  const dependency = readFileSync(new URL("../../bot/database/migrations/0187_round_nine_announcement_after_round_eight_results.sql", import.meta.url), "utf8");
  await db.exec(dependency);
  await db.exec("UPDATE channel_announcement_outbox SET status='pending' WHERE id=1");
  await db.exec("UPDATE season_rounds SET scheduled_at='2026-10-26 21:00+03' WHERE id=9");
  expect((await db.query<{held:boolean}>("SELECT available_at = 'infinity'::TIMESTAMPTZ AS held FROM channel_announcement_outbox WHERE id=1")).rows[0].held).toBe(true);
  await db.exec(`INSERT INTO channel_announcement_outbox VALUES
    (5,'season-round-results-tournament-21-round-8','results','pending',NULL,NOW());
    UPDATE channel_announcement_outbox SET status='sent' WHERE id=5;`);
  expect((await db.query<{ready:boolean}>("SELECT available_at <= NOW() AS ready FROM channel_announcement_outbox WHERE id=1")).rows[0].ready).toBe(true);
});
