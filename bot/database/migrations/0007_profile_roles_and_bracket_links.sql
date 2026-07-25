CREATE TABLE IF NOT EXISTS player_discord_roles (
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL,
    role_name VARCHAR(120) NOT NULL,
    role_color INTEGER NOT NULL DEFAULT 0,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, role_id)
);
CREATE INDEX IF NOT EXISTS player_discord_roles_name_idx
    ON player_discord_roles(role_name, player_id);

CREATE TABLE IF NOT EXISTS player_profile_preferences (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    background_key VARCHAR(32) NOT NULL DEFAULT 'default'
        CHECK (
            background_key IN (
                'default',
                'regeneration',
                'haste',
                'invisibility',
                'arcane',
                'illusion',
                'damage'
            )
        ),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tournament_prizes
    ALTER COLUMN prize_text TYPE TEXT;

ALTER TABLE tournament_matches
    ADD COLUMN IF NOT EXISTS winner_to_match_id BIGINT
        REFERENCES tournament_matches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS winner_to_slot CHAR(1)
        CHECK (winner_to_slot IN ('a', 'b')),
    ADD COLUMN IF NOT EXISTS loser_to_match_id BIGINT
        REFERENCES tournament_matches(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS loser_to_slot CHAR(1)
        CHECK (loser_to_slot IN ('a', 'b'));

DO $$
DECLARE
    tournament_id_value BIGINT;
    upper_match_id BIGINT;
    lower_first_match_id BIGINT;
    lower_final_match_id BIGINT;
    grand_final_match_id BIGINT;
BEGIN
    SELECT id INTO tournament_id_value
    FROM tournaments
    WHERE slug = 'cd-fastcup-5';

    IF tournament_id_value IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO upper_match_id
    FROM tournament_matches
    WHERE tournament_id = tournament_id_value
      AND bracket_side = 'upper'
      AND bracket_round = 1
      AND bracket_slot = 1;

    SELECT id INTO lower_first_match_id
    FROM tournament_matches
    WHERE tournament_id = tournament_id_value
      AND bracket_side = 'lower'
      AND bracket_round = 1
      AND bracket_slot = 1;

    SELECT id INTO lower_final_match_id
    FROM tournament_matches
    WHERE tournament_id = tournament_id_value
      AND bracket_side = 'lower'
      AND bracket_round = 2
      AND bracket_slot = 1;

    SELECT id INTO grand_final_match_id
    FROM tournament_matches
    WHERE tournament_id = tournament_id_value
      AND bracket_side = 'grand_final'
      AND bracket_round = 3
      AND bracket_slot = 1;

    UPDATE tournament_matches
    SET winner_to_match_id = grand_final_match_id,
        winner_to_slot = 'a',
        loser_to_match_id = lower_final_match_id,
        loser_to_slot = 'a'
    WHERE id = upper_match_id;

    UPDATE tournament_matches
    SET winner_to_match_id = lower_final_match_id,
        winner_to_slot = 'b'
    WHERE id = lower_first_match_id;

    UPDATE tournament_matches
    SET winner_to_match_id = grand_final_match_id,
        winner_to_slot = 'b'
    WHERE id = lower_final_match_id;
END $$;
