CREATE TABLE channel_announcement_edits (
    announcement_id BIGINT PRIMARY KEY REFERENCES channel_announcement_outbox(id) ON DELETE CASCADE,
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempts INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);
CREATE TRIGGER channel_announcement_edits_wakeup
AFTER INSERT OR UPDATE OR DELETE ON channel_announcement_edits
FOR EACH STATEMENT EXECUTE FUNCTION notify_bot_scheduled_events();

CREATE FUNCTION scheduled_registration_content(announcement_key TEXT, original_content TEXT)
RETURNS TEXT LANGUAGE sql STABLE AS $function$
    SELECT COALESCE((
        SELECT regexp_replace(original_content,
            '[0-9]{2}\.[0-9]{2}\.[0-9]{4} \([^)]*\) [0-9]{2}:[0-9]{2}',
            to_char(round.scheduled_at AT TIME ZONE 'Europe/Moscow', 'DD.MM.YYYY')
            || ' (' || (ARRAY['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'])
                [EXTRACT(ISODOW FROM round.scheduled_at AT TIME ZONE 'Europe/Moscow')::INTEGER]
            || ') ' || to_char(round.scheduled_at AT TIME ZONE 'Europe/Moscow', 'HH24:MI'))
        FROM season_rounds round JOIN tournaments tournament ON tournament.id = round.tournament_id
        WHERE tournament.slug = 'league-season-9' AND round.round_kind = 'regular'
          AND round.scheduled_at IS NOT NULL
          AND announcement_key IN (
              format('season9-registration-round-%s-boosty', round.round_number),
              format('season9-registration-round-%s-public', round.round_number))
    ), original_content)
$function$;

CREATE FUNCTION normalize_registration_announcement() RETURNS TRIGGER LANGUAGE plpgsql AS $function$
BEGIN
    NEW.content := scheduled_registration_content(NEW.dedupe_key, NEW.content);
    RETURN NEW;
END
$function$;
CREATE TRIGGER normalize_registration_announcement
BEFORE INSERT OR UPDATE OF content ON channel_announcement_outbox
FOR EACH ROW EXECUTE FUNCTION normalize_registration_announcement();

CREATE FUNCTION queue_changed_channel_announcement() RETURNS TRIGGER LANGUAGE plpgsql AS $function$
BEGIN
    IF NEW.status = 'sent' AND NEW.discord_message_id IS NOT NULL
       AND NEW.content IS DISTINCT FROM OLD.content THEN
        INSERT INTO channel_announcement_edits (announcement_id) VALUES (NEW.id)
        ON CONFLICT (announcement_id) DO UPDATE SET available_at = NOW(), attempts = 0, last_error = NULL;
    END IF;
    RETURN NEW;
END
$function$;
CREATE TRIGGER queue_changed_channel_announcement
AFTER UPDATE OF content ON channel_announcement_outbox
FOR EACH ROW EXECUTE FUNCTION queue_changed_channel_announcement();

CREATE FUNCTION sync_registration_round_schedule(round_id BIGINT) RETURNS VOID LANGUAGE sql AS $function$
    UPDATE channel_announcement_outbox announcement
    SET content = scheduled_registration_content(announcement.dedupe_key, announcement.content),
        available_at = CASE WHEN announcement.status = 'pending'
            THEN round.scheduled_at - CASE WHEN announcement.dedupe_key LIKE '%-boosty'
                THEN INTERVAL '5 days' ELSE INTERVAL '4 days' END
            ELSE announcement.available_at END
    FROM season_rounds round JOIN tournaments tournament ON tournament.id = round.tournament_id
    WHERE round.id = round_id AND tournament.slug = 'league-season-9'
      AND round.round_kind = 'regular' AND round.scheduled_at IS NOT NULL
      AND announcement.status IN ('pending','sent')
      AND announcement.dedupe_key IN (
          format('season9-registration-round-%s-boosty', round.round_number),
          format('season9-registration-round-%s-public', round.round_number))
$function$;
CREATE FUNCTION sync_changed_registration_schedule() RETURNS TRIGGER LANGUAGE plpgsql AS $function$
BEGIN
    PERFORM sync_registration_round_schedule(NEW.id);
    RETURN NEW;
END
$function$;
CREATE TRIGGER sync_changed_registration_schedule
AFTER UPDATE OF scheduled_at ON season_rounds
FOR EACH ROW WHEN (NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at)
EXECUTE FUNCTION sync_changed_registration_schedule();

SELECT sync_registration_round_schedule(round.id)
FROM season_rounds round JOIN tournaments tournament ON tournament.id = round.tournament_id
WHERE tournament.slug = 'league-season-9' AND round.round_number BETWEEN 9 AND 14
  AND round.round_kind = 'regular';
