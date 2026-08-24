DO $migration$
DECLARE
    target_player_id BIGINT;
BEGIN
    SELECT player.discord_id
    INTO target_player_id
    FROM players player
    WHERE player.steam_id32 = 301109815
      AND player.is_archived = FALSE;

    IF target_player_id IS NULL THEN
        RAISE EXCEPTION 'Active frokeng profile with Dota ID 301109815 was not found';
    END IF;

    WITH identity_players AS (
        SELECT related.player_id
        FROM player_identity_members own_member
        JOIN player_identity_members related
          ON related.identity_id = own_member.identity_id
        WHERE own_member.player_id = target_player_id
        UNION
        SELECT target_player_id
    )
    DELETE FROM player_profile_badges badge
    USING identity_players identity_player
    WHERE badge.player_id = identity_player.player_id
      AND badge.source_event = 'the-international-2026-compendium';

    PERFORM grant_ti_2026_profile_badges(target_player_id);
END
$migration$;
