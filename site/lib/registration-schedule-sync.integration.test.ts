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

it("postpones only remaining season-nine rounds and finals, preserving registrations and sent announcements", async () => {
  await db.exec(`
    ALTER TABLE season_rounds ADD COLUMN status TEXT DEFAULT 'planned',
      ADD COLUMN is_visible BOOLEAN DEFAULT FALSE, ADD COLUMN updated_at TIMESTAMPTZ;
    INSERT INTO season_rounds (id,tournament_id,round_number,round_kind,scheduled_at,status) VALUES
      (11,21,11,'regular','2026-11-06 22:00+03','completed'),
      (12,21,12,'regular','2026-11-15 21:00+03','planned'),
      (13,21,13,'regular','2026-11-20 22:00+03','planned'),
      (14,21,14,'regular','2026-11-29 21:00+03','planned'),
      (15,21,15,'finals',NULL,'planned'),
      (112,22,12,'regular','2026-11-15 21:00+03','planned');
    CREATE TABLE season_round_registrations (round_id BIGINT, player_id BIGINT);
    INSERT INTO season_round_registrations VALUES (12,123);
    INSERT INTO channel_announcement_outbox VALUES
      (12,'season9-registration-round-12-public','15.11.2026 (Воскресенье) 21:00','sent',456,'2026-11-11 21:00+03'),
      (13,'season9-registration-round-13-boosty','20.11.2026 (Пятница) 22:00','pending',NULL,NOW()),
      (14,'season9-registration-round-14-public','29.11.2026 (Воскресенье) 21:00','pending',NULL,NOW());
  `);
  const postpone = readFileSync(new URL("../../bot/database/migrations/0202_postpone_remaining_season_nine_rounds.sql", import.meta.url), "utf8");
  await db.exec(postpone);
  const schedule = await db.query(`SELECT id, to_char(scheduled_at AT TIME ZONE 'Europe/Moscow','YYYY-MM-DD HH24:MI') AS date,
    is_visible FROM season_rounds WHERE id IN (11,12,13,14,15,112) ORDER BY id`);
  expect(schedule.rows).toEqual([
    {id:11,date:"2026-11-06 22:00",is_visible:false},
    {id:12,date:"2026-11-20 22:00",is_visible:true},
    {id:13,date:"2026-11-29 21:00",is_visible:true},
    {id:14,date:"2026-12-04 22:00",is_visible:true},
    {id:15,date:"2026-12-13 21:00",is_visible:true},
    {id:112,date:"2026-11-15 21:00",is_visible:false},
  ]);
  const announcements = await db.query(`SELECT id, content, status, discord_message_id,
    to_char(available_at AT TIME ZONE 'Europe/Moscow','YYYY-MM-DD HH24:MI') AS date
    FROM channel_announcement_outbox WHERE id IN (12,13,14) ORDER BY id`);
  expect(announcements.rows).toEqual([
    {id:12,content:"20.11.2026 (Пятница) 22:00",status:"sent",discord_message_id:456,date:"2026-11-11 21:00"},
    {id:13,content:"29.11.2026 (Воскресенье) 21:00",status:"pending",discord_message_id:null,date:"2026-11-24 21:00"},
    {id:14,content:"04.12.2026 (Пятница) 22:00",status:"pending",discord_message_id:null,date:"2026-11-30 22:00"},
  ]);
  expect((await db.query("SELECT * FROM season_round_registrations")).rows).toEqual([{round_id:12,player_id:123}]);
  expect((await db.query("SELECT announcement_id FROM channel_announcement_edits WHERE announcement_id=12")).rows).toEqual([{announcement_id:12}]);
  await db.exec(postpone);
  expect((await db.query("SELECT * FROM channel_announcement_edits WHERE announcement_id=12")).rows).toHaveLength(1);
});
