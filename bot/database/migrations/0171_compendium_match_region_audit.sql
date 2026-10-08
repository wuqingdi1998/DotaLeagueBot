CREATE TABLE match_region_audits (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    match_id BIGINT NOT NULL CHECK (match_id > 0),
    player_name TEXT NOT NULL,
    dota_id TEXT,
    clan_mates JSONB NOT NULL DEFAULT '[]',
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'stockholm', 'sent')),
    attempts INT NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    match_details JSONB,
    discord_message_id BIGINT,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    UNIQUE (player_id, match_id)
);

CREATE INDEX match_region_audits_due_idx
    ON match_region_audits (next_attempt_at, id) WHERE status = 'pending';

CREATE FUNCTION queue_compendium_match_region_audit(
    target_player_id BIGINT, target_match_id BIGINT, audit_source TEXT
) RETURNS VOID LANGUAGE sql AS $$
    INSERT INTO match_region_audits
        (player_id, match_id, player_name, dota_id, clan_mates, source)
    SELECT player.discord_id, target_match_id, COALESCE(player.ingame_name, player.discord_id::text),
           player.steam_id32::text, COALESCE((
               SELECT jsonb_agg(jsonb_build_object(
                   'player_id', mate.player_id::text,
                   'dota_id', mate_player.steam_id32::text,
                   'name', mate_player.ingame_name
               ))
               FROM october_compendium_clan_members member
               JOIN october_compendium_clan_members mate
                 ON mate.clan_id = member.clan_id AND mate.player_id <> member.player_id
               JOIN players mate_player ON mate_player.discord_id = mate.player_id
               WHERE member.player_id = target_player_id
           ), '[]'::jsonb), audit_source
    FROM players player
    WHERE player.discord_id = target_player_id AND target_match_id > 0
    ON CONFLICT (player_id, match_id) DO NOTHING;
$$;

CREATE FUNCTION audit_credited_compendium_match() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    PERFORM queue_compendium_match_region_audit(
        NEW.player_id, NEW.matched_match_id, TG_TABLE_NAME
    );
    RETURN NEW;
END;
$$;

DO $$
DECLARE source_table TEXT;
BEGIN
    FOREACH source_table IN ARRAY ARRAY[
        'compendium_user_quest_completions',
        'compendium_rune_challenge_completions',
        'october_compendium_rune_challenge_completions',
        'october_compendium_clan_outing_completions',
        'compendium_star_race_quest_wins',
        'compendium_star_race_quest_progress_wins'
    ] LOOP
        EXECUTE format(
            'CREATE TRIGGER compendium_match_region_audit AFTER INSERT OR UPDATE OF matched_match_id ON %I '
            'FOR EACH ROW EXECUTE FUNCTION audit_credited_compendium_match()', source_table
        );
    END LOOP;
END;
$$;

CREATE TRIGGER match_region_audits_wakeup
    AFTER INSERT ON match_region_audits
    FOR EACH STATEMENT EXECUTE FUNCTION notify_bot_scheduled_events();
