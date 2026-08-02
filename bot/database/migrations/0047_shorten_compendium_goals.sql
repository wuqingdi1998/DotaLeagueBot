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
            ('ti-2026-silver'::varchar, 30),
            ('ti-2026-gold'::varchar, 60)
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

SELECT grant_ti_2026_profile_badges(discord_id)
FROM players;
