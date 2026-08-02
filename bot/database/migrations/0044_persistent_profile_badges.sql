CREATE TABLE IF NOT EXISTS player_profile_badges (
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    badge_key VARCHAR(80) NOT NULL,
    source_event VARCHAR(120) NOT NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (player_id, badge_key)
);

CREATE INDEX IF NOT EXISTS player_profile_badges_player_idx
    ON player_profile_badges(player_id, awarded_at DESC);

CREATE OR REPLACE FUNCTION grant_ti_2026_profile_badges(target_player_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
AS $function$
DECLARE
    combined_stars INTEGER;
BEGIN
    WITH identity_players AS (
        SELECT related.player_id
        FROM player_identity_members own_member
        JOIN player_identity_members related
          ON related.identity_id = own_member.identity_id
        WHERE own_member.player_id = target_player_id
        UNION
        SELECT target_player_id
    )
    SELECT COALESCE(SUM(star_total.total_stars), 0)::int
    INTO combined_stars
    FROM identity_players identity_player
    LEFT JOIN compendium_player_star_totals star_total
      ON star_total.player_id = identity_player.player_id;

    WITH identity_players AS (
        SELECT related.player_id
        FROM player_identity_members own_member
        JOIN player_identity_members related
          ON related.identity_id = own_member.identity_id
        WHERE own_member.player_id = target_player_id
        UNION
        SELECT target_player_id
    ), earned_badges(badge_key, required_stars) AS (
        VALUES
            ('ti-2026-bronze'::varchar, 10),
            ('ti-2026-silver'::varchar, 40),
            ('ti-2026-gold'::varchar, 75)
    )
    INSERT INTO player_profile_badges(player_id, badge_key, source_event)
    SELECT
        identity_player.player_id,
        earned_badge.badge_key,
        'the-international-2026-compendium'
    FROM identity_players identity_player
    CROSS JOIN earned_badges earned_badge
    WHERE combined_stars >= earned_badge.required_stars
    ON CONFLICT (player_id, badge_key) DO NOTHING;
END
$function$;

CREATE OR REPLACE FUNCTION grant_ti_2026_profile_badges_after_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM grant_ti_2026_profile_badges(NEW.player_id);
    RETURN NEW;
END
$function$;

DROP TRIGGER IF EXISTS compendium_completion_profile_badges_trigger
    ON compendium_user_quest_completions;
CREATE TRIGGER compendium_completion_profile_badges_trigger
AFTER INSERT OR UPDATE OF reward_amount ON compendium_user_quest_completions
FOR EACH ROW
EXECUTE FUNCTION grant_ti_2026_profile_badges_after_change();

DROP TRIGGER IF EXISTS compendium_adjustment_profile_badges_trigger
    ON compendium_admin_star_adjustments;
CREATE TRIGGER compendium_adjustment_profile_badges_trigger
AFTER INSERT OR UPDATE OF amount ON compendium_admin_star_adjustments
FOR EACH ROW
EXECUTE FUNCTION grant_ti_2026_profile_badges_after_change();

DROP TRIGGER IF EXISTS identity_member_profile_badges_trigger
    ON player_identity_members;
CREATE TRIGGER identity_member_profile_badges_trigger
AFTER INSERT ON player_identity_members
FOR EACH ROW
EXECUTE FUNCTION grant_ti_2026_profile_badges_after_change();

WITH badge_events AS (
    SELECT
        member.identity_id,
        completion.completed_at AS happened_at,
        1 AS event_kind,
        completion.id AS event_id,
        completion.reward_amount AS amount
    FROM compendium_user_quest_completions completion
    JOIN player_identity_members member
      ON member.player_id = completion.player_id
    UNION ALL
    SELECT
        member.identity_id,
        adjustment.created_at,
        2,
        adjustment.id,
        adjustment.amount
    FROM compendium_admin_star_adjustments adjustment
    JOIN player_identity_members member
      ON member.player_id = adjustment.player_id
), running_totals AS (
    SELECT
        identity_id,
        SUM(amount) OVER (
            PARTITION BY identity_id
            ORDER BY happened_at, event_kind, event_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS running_stars
    FROM badge_events
), peak_totals AS (
    SELECT identity_id, GREATEST(0, MAX(running_stars)) AS peak_stars
    FROM running_totals
    GROUP BY identity_id
), earned_badges(badge_key, required_stars) AS (
    VALUES
        ('ti-2026-bronze'::varchar, 10),
        ('ti-2026-silver'::varchar, 40),
        ('ti-2026-gold'::varchar, 75)
)
INSERT INTO player_profile_badges(player_id, badge_key, source_event)
SELECT
    member.player_id,
    earned_badge.badge_key,
    'the-international-2026-compendium'
FROM peak_totals peak
JOIN player_identity_members member
  ON member.identity_id = peak.identity_id
CROSS JOIN earned_badges earned_badge
WHERE peak.peak_stars >= earned_badge.required_stars
ON CONFLICT (player_id, badge_key) DO NOTHING;
