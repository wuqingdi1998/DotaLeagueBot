CREATE TABLE october_compendium_verification_requests (
    id BIGSERIAL PRIMARY KEY,
    player_id BIGINT NOT NULL REFERENCES players(discord_id) ON DELETE CASCADE,
    moscow_date DATE NOT NULL CHECK (moscow_date BETWEEN DATE '2026-10-05' AND DATE '2026-10-25'),
    challenge_kind TEXT NOT NULL CHECK (challenge_kind IN ('daily', 'rune', 'clan_outing', 'star_race')),
    quest_key TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'exhausted')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_attempt_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '2 minutes',
    attempts INT NOT NULL DEFAULT 0,
    manual_attempts INT NOT NULL DEFAULT 0,
    last_error TEXT,
    lease_token TEXT,
    lease_until TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    notified_at TIMESTAMPTZ,
    notification_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notification_error TEXT,
    discord_message_id BIGINT,
    UNIQUE (player_id, moscow_date, challenge_kind, quest_key)
);
CREATE INDEX october_verification_due ON october_compendium_verification_requests(next_attempt_at)
    WHERE status = 'pending';
CREATE INDEX october_verification_notification ON october_compendium_verification_requests(notification_retry_at)
    WHERE status = 'exhausted' AND notified_at IS NULL;

CREATE FUNCTION wake_compendium_verification_scheduler() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM pg_notify('bot_scheduled_events', 'compendium_verification');
    RETURN NEW;
END;
$$;
CREATE TRIGGER wake_compendium_verification_scheduler AFTER INSERT OR UPDATE
ON october_compendium_verification_requests FOR EACH STATEMENT
EXECUTE FUNCTION wake_compendium_verification_scheduler();

-- Every award path, including an organizer's manual award, cancels the same request atomically.
CREATE FUNCTION finish_compendium_verification_request() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    kind TEXT;
    day DATE;
    key TEXT;
BEGIN
    IF TG_TABLE_NAME = 'compendium_user_quest_completions' THEN
        kind := 'daily'; key := NEW.daily_quest_id::text;
        SELECT quest_set.moscow_date INTO day FROM compendium_daily_quests quest
        JOIN compendium_daily_quest_sets quest_set ON quest_set.id = quest.quest_set_id
        WHERE quest.id = NEW.daily_quest_id;
    ELSE
        day := NEW.moscow_date; key := day::text;
        kind := CASE TG_TABLE_NAME WHEN 'october_compendium_rune_challenge_completions' THEN 'rune'
            WHEN 'october_compendium_clan_outing_completions' THEN 'clan_outing' ELSE 'star_race' END;
    END IF;
    UPDATE october_compendium_verification_requests SET status = 'completed', finished_at = NOW(),
        next_attempt_at = NULL, lease_until = NULL, lease_token = NULL, last_error = NULL
    WHERE player_id = NEW.player_id AND moscow_date = day AND challenge_kind = kind AND quest_key = key
        AND status <> 'completed';
    RETURN NEW;
END;
$$;
CREATE TRIGGER finish_daily_verification AFTER INSERT ON compendium_user_quest_completions
FOR EACH ROW EXECUTE FUNCTION finish_compendium_verification_request();
CREATE TRIGGER finish_rune_verification AFTER INSERT ON october_compendium_rune_challenge_completions
FOR EACH ROW EXECUTE FUNCTION finish_compendium_verification_request();
CREATE TRIGGER finish_outing_verification AFTER INSERT ON october_compendium_clan_outing_completions
FOR EACH ROW EXECUTE FUNCTION finish_compendium_verification_request();
CREATE TRIGGER finish_race_verification AFTER INSERT ON compendium_star_race_quest_completions
FOR EACH ROW EXECUTE FUNCTION finish_compendium_verification_request();
