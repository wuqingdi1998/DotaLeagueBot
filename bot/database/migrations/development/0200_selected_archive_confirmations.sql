-- Уточнения владельца для шести турниров, перенесённых только на dev.
UPDATE tournaments
SET registration_starts_at = NULL, registration_deadline = NULL,
    check_in_minutes = NULL, show_start_in_overview = FALSE, updated_at = NOW()
WHERE slug IN ('sd-fastcup-1', 'ls-draft-1', 'ls-item-draft',
               'ls-call-to-arms-2026', 'ls-pre-season-bash', 'ls-15k-showdown');

UPDATE tournament_prizes prize
SET prize_text = CASE prize.placement WHEN 1 THEN '3500₽' WHEN 2 THEN '1500₽' END
FROM tournaments tournament
WHERE prize.tournament_id = tournament.id AND tournament.slug = 'ls-item-draft'
  AND prize.placement IN (1, 2);

DO $confirmation$
DECLARE
    source_identity BIGINT;
    target_identity BIGINT;
    target_player BIGINT;
BEGIN
    SELECT member.identity_id INTO source_identity
    FROM tournament_roster_snapshots snapshot
    JOIN tournament_team_applications application ON application.id = snapshot.application_id
    JOIN tournaments tournament ON tournament.id = application.tournament_id
    JOIN player_identity_members member ON member.player_id = snapshot.player_id
    WHERE tournament.slug = 'ls-pre-season-bash' AND snapshot.nickname_snapshot = '!Flopz!';

    SELECT member.identity_id, player.discord_id INTO STRICT target_identity, target_player
    FROM players player
    JOIN player_identity_members member ON member.player_id = player.discord_id
    WHERE LOWER(player.ingame_name) = 'sanraizu' AND player.is_archived = FALSE;

    IF source_identity IS NULL THEN RAISE EXCEPTION 'Historical !Flopz! roster not found'; END IF;
    IF source_identity <> target_identity THEN
        IF EXISTS (SELECT 1 FROM player_identities WHERE id = source_identity
                   AND registered_player_id IS NOT NULL) THEN
            RAISE EXCEPTION '!Flopz! already belongs to a different registered identity';
        END IF;
        UPDATE player_identity_members SET identity_id = target_identity WHERE identity_id = source_identity;
        DELETE FROM player_identities WHERE id = source_identity;
        INSERT INTO tournament_audit_log(action, entity_type, entity_id, details)
        VALUES ('archive_identity_link', 'player_identity', target_identity::TEXT,
                jsonb_build_object('archiveIdentityId', source_identity::TEXT,
                                   'playerId', target_player::TEXT,
                                   'nickname', 'Sanraizu', 'reason', 'Подтверждено владельцем'));
    END IF;
END
$confirmation$;
