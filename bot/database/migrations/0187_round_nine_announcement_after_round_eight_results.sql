CREATE TABLE channel_announcement_dependencies (
    dependent_key TEXT PRIMARY KEY
        REFERENCES channel_announcement_outbox(dedupe_key) ON DELETE CASCADE,
    prerequisite_key TEXT NOT NULL,
    CHECK (dependent_key <> prerequisite_key)
);

CREATE FUNCTION hold_dependent_channel_announcement()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NEW.status = 'pending' AND EXISTS (
        SELECT 1
        FROM channel_announcement_dependencies dependency
        WHERE dependency.dependent_key = NEW.dedupe_key
          AND NOT EXISTS (
              SELECT 1 FROM channel_announcement_outbox prerequisite
              WHERE prerequisite.dedupe_key = dependency.prerequisite_key
                AND prerequisite.status = 'sent'
          )
    ) THEN
        NEW.available_at := 'infinity'::TIMESTAMPTZ;
    END IF;
    RETURN NEW;
END
$function$;

CREATE TRIGGER hold_dependent_channel_announcement
BEFORE INSERT OR UPDATE ON channel_announcement_outbox
FOR EACH ROW EXECUTE FUNCTION hold_dependent_channel_announcement();

CREATE FUNCTION release_dependent_channel_announcements()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE channel_announcement_outbox announcement
    SET available_at = NOW()
    FROM channel_announcement_dependencies dependency
    WHERE dependency.prerequisite_key = NEW.dedupe_key
      AND announcement.dedupe_key = dependency.dependent_key
      AND announcement.status = 'pending';
    RETURN NEW;
END
$function$;

CREATE TRIGGER release_dependent_channel_announcements
AFTER UPDATE OF status ON channel_announcement_outbox
FOR EACH ROW
WHEN (NEW.status = 'sent' AND OLD.status IS DISTINCT FROM 'sent')
EXECUTE FUNCTION release_dependent_channel_announcements();

INSERT INTO channel_announcement_dependencies (dependent_key, prerequisite_key)
SELECT announcement.dedupe_key,
       format('season-round-results-tournament-%s-round-8', tournament.id)
FROM channel_announcement_outbox announcement
CROSS JOIN tournaments tournament
WHERE tournament.slug = 'league-season-9'
  AND announcement.dedupe_key IN (
      'season9-registration-round-9-boosty',
      'season9-registration-round-9-public'
  );

-- Reconcile existing jobs too, including results published before this update.
UPDATE channel_announcement_outbox announcement
SET available_at = NOW()
FROM channel_announcement_dependencies dependency
WHERE announcement.dedupe_key = dependency.dependent_key
  AND announcement.status = 'pending';
