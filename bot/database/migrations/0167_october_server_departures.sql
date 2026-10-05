CREATE TABLE october_compendium_server_membership (
    player_id BIGINT PRIMARY KEY REFERENCES players(discord_id) ON DELETE CASCADE,
    is_present BOOLEAN NOT NULL,
    stars_reset_at TIMESTAMPTZ,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION october_clan_player_is_eligible(target_player_id BIGINT)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1 FROM players player
        WHERE player.discord_id = target_player_id
          AND player.is_archived = FALSE
          AND player.tier_status <> 'inactive'
          AND NOT EXISTS (
              SELECT 1 FROM player_discord_roles role
              WHERE role.player_id = player.discord_id
                AND LOWER(BTRIM(role.role_name)) = LOWER('Массовка')
          )
          AND NOT EXISTS (
              SELECT 1 FROM october_compendium_server_membership presence
              WHERE presence.player_id = player.discord_id
                AND presence.is_present = FALSE
          )
    );
$$;

-- A reset cutoff removes stars from every total without destroying award history.
-- Keeping the cutoff after rejoining prevents old stars from returning.
CREATE OR REPLACE FUNCTION compendium_stars_count_for_player(
    target_player_id BIGINT, event_earned_at TIMESTAMPTZ
)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT NOT EXISTS (
        SELECT 1 FROM october_compendium_server_membership presence
        WHERE presence.player_id = target_player_id
          AND (presence.is_present = FALSE OR event_earned_at <= presence.stars_reset_at)
    );
$$;

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
    SELECT player_id, reward_amount::int, completed_at FROM compendium_star_race_quest_completions
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at
    FROM october_compendium_clan_outing_completions
) event
WHERE compendium_stars_count_for_player(event.player_id, event.earned_at);

CREATE OR REPLACE VIEW compendium_star_race_events AS
SELECT event.player_id, event.amount, event.earned_at
FROM (
    SELECT completion.player_id, completion.reward_amount::int AS amount,
        completion.completed_at AS earned_at
    FROM compendium_user_quest_completions completion
    JOIN compendium_daily_quests quest ON quest.id = completion.daily_quest_id
    WHERE quest.position <> 4
    UNION ALL
    SELECT player_id, amount::int, created_at
    FROM compendium_admin_star_adjustments WHERE is_star_race_eligible = TRUE
    UNION ALL
    SELECT player_id, reward_amount::int, awarded_at FROM compendium_prediction_rewards
    UNION ALL
    SELECT player_id, reward_amount::int, completed_at FROM compendium_star_race_quest_completions
) event
WHERE compendium_stars_count_for_player(event.player_id, event.earned_at);

CREATE OR REPLACE FUNCTION remove_departed_october_clan_player()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.is_present = FALSE THEN
        WITH removed AS (
            DELETE FROM october_compendium_clan_members member
            WHERE member.player_id = NEW.player_id
            RETURNING member.*
        )
        INSERT INTO october_compendium_removed_clan_members (player_id, membership)
        SELECT removed.player_id, to_jsonb(removed) FROM removed;
        DELETE FROM october_compendium_clan_reservations WHERE player_id = NEW.player_id;
        DELETE FROM october_compendium_clan_assignment_drafts WHERE player_id = NEW.player_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER october_server_departure_cleanup
AFTER INSERT OR UPDATE ON october_compendium_server_membership
FOR EACH ROW EXECUTE FUNCTION remove_departed_october_clan_player();
