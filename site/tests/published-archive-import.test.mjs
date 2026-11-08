import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../../bot/database/migrations/0201_publish_selected_archive_tournaments.sql');
it('publishes the reviewed archive and preserves existing dev edits', async () => {
  expect(migration).toContain(read('../../bot/database/migrations/development/0198_selected_archive_tournaments.sql') + read('../../bot/database/migrations/development/0200_selected_archive_confirmations.sql'));
  const db = new PGlite();
  try {
    await db.exec(read('./fixtures/selected-archive-schema.sql'));
    await db.exec(read('../../bot/database/migrations/0199_optional_tournament_timing.sql'));
    await db.exec(`CREATE TABLE schema_migrations(name TEXT PRIMARY KEY);
      INSERT INTO players(discord_id,steam_id32,ingame_name) VALUES(203058168408965120,1002,'Sanraizu');`);
    await db.exec(`BEGIN;${migration}COMMIT;`);
    expect((await db.query(`SELECT count(*)::int AS count FROM tournaments`)).rows).toEqual([{count:6}]);
    expect((await db.query(`SELECT count(*)::int AS count FROM tournament_roster_snapshots`)).rows).toEqual([{count:170}]);
    expect((await db.query(`SELECT count(*)::int AS matches,sum(team_a_score+team_b_score)::int AS maps FROM tournament_matches`)).rows).toEqual([{matches:72,maps:85}]);
    expect((await db.query(`SELECT count(*)::int AS count FROM tournaments WHERE registration_deadline IS NULL AND check_in_minutes IS NULL AND NOT show_start_in_overview`)).rows).toEqual([{count:6}]);
    expect((await db.query(`SELECT count(DISTINCT identity_id)::int AS count FROM player_identity_members WHERE player_id IN (SELECT player_id FROM tournament_roster_snapshots WHERE nickname_snapshot IN ('!Flopz!','Sanraizu'))`)).rows).toEqual([{count:1}]);
    await db.exec(`INSERT INTO schema_migrations VALUES('0198_selected_archive_tournaments.sql');
      UPDATE tournaments SET description='Owner dev edit';
      UPDATE tournament_prizes SET prize_text='Owner dev award';`);
    await db.exec(`BEGIN;${migration}COMMIT;`);
    expect((await db.query(`SELECT count(*)::int AS count FROM tournaments WHERE description='Owner dev edit'`)).rows).toEqual([{count:6}]);
    expect((await db.query(`SELECT count(*)::int AS count FROM tournament_prizes WHERE prize_text <> 'Owner dev award'`)).rows).toEqual([{count:0}]);
  } finally { await db.close(); }
}, 30000);
