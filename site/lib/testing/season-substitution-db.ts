import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PoolClient } from "pg";

/** Isolated PostgreSQL engine: no production connection or credentials. */
export async function substitutionTestDatabase() {
  const db = new PGlite();
  await db.exec(`
    CREATE TABLE players (
      discord_id bigint PRIMARY KEY, steam_id32 bigint, ingame_name text,
      internal_rating integer, rank_tier integer, is_archived boolean DEFAULT false,
      avatar_url text, real_name text, positions text
    );
    CREATE TABLE tournaments (id bigint PRIMARY KEY, slug text, tournament_type text);
    CREATE TABLE season_rounds (id bigint PRIMARY KEY, tournament_id bigint,
      round_number integer, is_visible boolean, round_kind text, lobby_configuration_status text);
    CREATE TABLE season_lobbies (id bigint PRIMARY KEY, round_id bigint, name text,
      status text, updated_at timestamptz);
    CREATE TABLE season_matches (id bigint PRIMARY KEY, lobby_id bigint, best_of integer,
      status text, host_player_id bigint, team_a_name text, team_b_name text,
      team_a_score integer, team_b_score integer, result text, updated_at timestamptz);
    CREATE TABLE season_match_participants (match_id bigint, player_id bigint,
      team_side char(1), slot_number integer, tier_snapshot integer, is_captain boolean,
      nickname_snapshot text, PRIMARY KEY (match_id, player_id));
    CREATE TABLE season_participants (tournament_id bigint, player_id bigint,
      PRIMARY KEY (tournament_id, player_id));
    CREATE TABLE season_match_games (id bigserial PRIMARY KEY, match_id bigint,
      game_number integer, dota_match_id varchar(32), winner_side char(1), status text,
      updated_at timestamptz, UNIQUE(match_id, game_number));
    CREATE TABLE season_penalty_events (id bigserial PRIMARY KEY, tournament_id bigint,
      player_id bigint, round_id bigint, fire_count integer, note text, updated_at timestamptz,
      UNIQUE(tournament_id, player_id, round_id));
    CREATE TABLE season_match_substitutions (id bigserial PRIMARY KEY, match_id bigint,
      game_id bigint REFERENCES season_match_games(id), outgoing_player_id bigint,
      incoming_player_id bigint, team_side char(1), technical_loss boolean, note text,
      penalty_event_id bigint, penalty_fire_count integer, updated_at timestamptz);
    CREATE TABLE season_match_rooms (match_id bigint PRIMARY KEY, status text,
      team_a_captain_id bigint, team_b_captain_id bigint, is_force_started boolean DEFAULT false,
      updated_at timestamptz);
    CREATE TABLE season_match_room_presence (match_id bigint, player_id bigint,
      heartbeat_at timestamptz DEFAULT now(), PRIMARY KEY(match_id, player_id));
    CREATE TABLE season_match_room_messages (id bigserial PRIMARY KEY, match_id bigint,
      player_id bigint, message text, created_at timestamptz);
    CREATE TABLE season_match_captain_votes (match_id bigint, voter_player_id bigint,
      candidate_player_id bigint);
    CREATE TABLE player_identity_members (player_id bigint, identity_id bigint);
    CREATE TABLE player_identities (id bigint, registered_player_id bigint);
    CREATE TABLE draft_series (id bigserial PRIMARY KEY, season_match_id bigint,
      player1_id bigint, player2_id bigint, current_map integer DEFAULT 1,
      status text DEFAULT 'MAP_COMPLETE', format text DEFAULT 'BO2',
      is_lobby_preview boolean DEFAULT false,
      map1_coin_toss_winner_id bigint, player1_dismissed_at timestamptz,
      player2_dismissed_at timestamptz, end_requested_by bigint, end_requested_at timestamptz,
      player1_ready_for_next_map boolean DEFAULT false,
      player2_ready_for_next_map boolean DEFAULT false, updated_at timestamptz DEFAULT now());
    CREATE TABLE draft_maps (id bigserial PRIMARY KEY, series_id bigint, map_number integer,
      status text DEFAULT 'CHOOSING', coin_toss_winner_id bigint, coin_toss_segment integer,
      first_chooser_id bigint, radiant_player_id bigint, first_pick_player_id bigint,
      current_step integer DEFAULT 0, version integer DEFAULT 0, first_choice text,
      step_started_at timestamptz, player1_reserve_seconds float8 DEFAULT 0,
      player2_reserve_seconds float8 DEFAULT 0, preview_hero_id integer);
    CREATE TABLE draft_actions (map_id bigint, actor_id bigint, hero_id integer, action_type text);
    CREATE TABLE draft_hero_suggestions (map_id bigint, player_id bigint, hero_id integer,
      created_at timestamptz DEFAULT now());
    CREATE TABLE draft_presence (player_id bigint);
    CREATE TABLE tournament_audit_log (tournament_id bigint, actor_discord_id bigint,
      action text, entity_type text, entity_id text, details jsonb);
  `);
  await db.exec(readFileSync(new URL(
    "../../../bot/database/migrations/0124_season_second_map_substitutions.sql", import.meta.url,
  ), "utf8"));
  return db;
}

export async function seedSubstitutionMatch(db: PGlite) {
  await db.exec(`
    TRUNCATE players, tournaments, season_rounds, season_lobbies, season_matches,
      season_match_participants, season_participants, season_match_games,
      season_penalty_events, season_match_substitutions, season_match_rooms,
      season_match_room_presence, season_match_room_messages, season_match_captain_votes,
      draft_series, draft_maps, draft_actions, draft_presence, draft_hero_suggestions,
      tournament_audit_log RESTART IDENTITY CASCADE;
    INSERT INTO players (discord_id, steam_id32, ingame_name, internal_rating)
      SELECT id, id + 100, 'Player ' || id, 6 FROM generate_series(10001, 10012) AS id;
    INSERT INTO tournaments VALUES (40, 'test-season', 'seasonal');
    INSERT INTO season_rounds VALUES (30, 40, 1, true, 'regular', 'published');
    INSERT INTO season_lobbies (id, round_id, name) VALUES (20, 30, 'Нижнее лобби');
    INSERT INTO season_matches (id, lobby_id, best_of, status, host_player_id, team_a_name, team_b_name)
      VALUES (10, 20, 2, 'draft', 10001, 'A', 'B');
    INSERT INTO season_match_participants
      SELECT 10, id, CASE WHEN id < 10006 THEN 'a' ELSE 'b' END,
        (id - 10001) % 5 + 1, 6, id IN (10001, 10006), 'Player ' || id
      FROM generate_series(10001, 10010) AS id;
    INSERT INTO season_match_rooms (match_id, status, team_a_captain_id, team_b_captain_id)
      VALUES (10, 'playing', 10001, 10006);
    INSERT INTO draft_series (season_match_id, player1_id, player2_id, map1_coin_toss_winner_id)
      VALUES (10, 10001, 10006, 10001);
    INSERT INTO draft_maps (series_id, map_number, status, first_chooser_id, coin_toss_winner_id)
      VALUES (1, 1, 'COMPLETE', 10001, 10001);
  `);
}

export function testTransaction(db: PGlite) {
  return async <T>(callback: (client: PoolClient) => Promise<T>) => db.transaction(async (tx) => {
    const client = {
      query: async (sql: string, values?: unknown[]) => {
        const result = await tx.query(sql, values);
        return { rows: result.rows, rowCount: result.affectedRows || result.rows.length };
      },
    } as PoolClient;
    return callback(client);
  });
}
