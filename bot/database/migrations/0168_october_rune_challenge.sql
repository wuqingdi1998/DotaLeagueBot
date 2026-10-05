CREATE TABLE october_compendium_rune_challenge_selections (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    selected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE october_compendium_rune_challenge_completions (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL CHECK (moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25'),
    hero_id SMALLINT NOT NULL CHECK (hero_id > 0),
    matched_match_id BIGINT NOT NULL CHECK (matched_match_id > 0),
    reward_amount SMALLINT NOT NULL CHECK (reward_amount IN (1, 2)),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (player_id, moscow_date),
    UNIQUE (player_id, matched_match_id)
);

CREATE INDEX october_rune_challenge_completion_player_idx
    ON october_compendium_rune_challenge_completions(player_id, completed_at DESC);

-- The new event starts with no selected heroes. Archived TI choices stay frozen.
CREATE OR REPLACE VIEW compendium_star_events AS
SELECT event.player_id, event.amount, event.earned_at
FROM (
    SELECT player_id, reward_amount::int AS amount, completed_at AS earned_at
    FROM compendium_user_quest_completions
    UNION ALL
    SELECT player_id, amount::int, created_at FROM compendium_admin_star_adjustments
    UNION ALL
    SELECT player_id, reward_amount::int, awarded_at FROM compendium_prediction_rewards
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at FROM compendium_rune_challenge_completions
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at FROM october_compendium_rune_challenge_completions
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at FROM compendium_star_race_quest_completions
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at FROM october_compendium_clan_outing_completions
) event
WHERE compendium_stars_count_for_player(event.player_id, event.earned_at);

CREATE OR REPLACE FUNCTION apply_october_rune_clan_points()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        UPDATE october_compendium_clan_members
        SET total_points = GREATEST(0, total_points - OLD.reward_amount)
        WHERE player_id = OLD.player_id;
    END IF;
    IF TG_OP <> 'DELETE' THEN
        UPDATE october_compendium_clan_members
        SET total_points = total_points + NEW.reward_amount
        WHERE player_id = NEW.player_id;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER october_rune_clan_points
AFTER INSERT OR UPDATE OR DELETE ON october_compendium_rune_challenge_completions
FOR EACH ROW EXECUTE FUNCTION apply_october_rune_clan_points();
