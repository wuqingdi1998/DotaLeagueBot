ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS ordinary_match_rooms_enabled BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE tournaments
SET ordinary_match_rooms_enabled = TRUE, updated_at = NOW()
WHERE slug = 'cd-fastcup-7' AND tournament_type = 'ordinary';

ALTER TABLE tournaments
  ALTER COLUMN ordinary_match_rooms_enabled SET DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS ordinary_match_rooms (
  match_id BIGINT PRIMARY KEY REFERENCES tournament_matches(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disputed', 'completed')),
  current_game_number SMALLINT NOT NULL DEFAULT 1 CHECK (current_game_number BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ordinary_match_room_messages (
  id BIGSERIAL PRIMARY KEY,
  match_id BIGINT NOT NULL REFERENCES ordinary_match_rooms(match_id) ON DELETE CASCADE,
  player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ordinary_match_room_messages_idx
  ON ordinary_match_room_messages(match_id, id DESC);

CREATE TABLE IF NOT EXISTS ordinary_match_game_reports (
  match_id BIGINT NOT NULL REFERENCES ordinary_match_rooms(match_id) ON DELETE CASCADE,
  game_number SMALLINT NOT NULL CHECK (game_number BETWEEN 1 AND 5),
  captain_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
  dota_match_id VARCHAR(20) NOT NULL,
  winner_side CHAR(1) NOT NULL CHECK (winner_side IN ('a', 'b')),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, game_number, captain_id)
);

CREATE TABLE IF NOT EXISTS ordinary_match_games (
  match_id BIGINT NOT NULL REFERENCES ordinary_match_rooms(match_id) ON DELETE CASCADE,
  game_number SMALLINT NOT NULL CHECK (game_number BETWEEN 1 AND 5),
  dota_match_id VARCHAR(20) NOT NULL,
  winner_side CHAR(1) NOT NULL CHECK (winner_side IN ('a', 'b')),
  resolution_method VARCHAR(16) NOT NULL
    CHECK (resolution_method IN ('consensus', 'organizer')),
  resolved_by BIGINT REFERENCES players(discord_id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (match_id, game_number),
  UNIQUE (dota_match_id)
);
