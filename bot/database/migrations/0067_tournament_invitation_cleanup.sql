ALTER TABLE notification_outbox
    DROP CONSTRAINT IF EXISTS notification_outbox_status_check;

ALTER TABLE notification_outbox
    ADD COLUMN IF NOT EXISTS application_id BIGINT
        REFERENCES tournament_team_applications(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS discord_message_id BIGINT;

ALTER TABLE notification_outbox
    ADD CONSTRAINT notification_outbox_status_check
    CHECK (status IN (
        'pending', 'sent', 'failed', 'cancelled', 'delete_pending', 'deleted'
    ));

CREATE INDEX IF NOT EXISTS idx_notification_outbox_application
    ON notification_outbox(application_id, event_type, status);

WITH invitation_candidates AS (
    SELECT notification.id AS notification_id,
           application.id AS application_id,
           ROW_NUMBER() OVER (
               PARTITION BY notification.id
               ORDER BY ABS(EXTRACT(EPOCH FROM (
                   notification.created_at - application.created_at
               ))), application.id DESC
           ) AS candidate_order
    FROM notification_outbox notification
    JOIN tournament_team_members member
      ON member.player_id = notification.discord_id
     AND NOT member.is_captain
    JOIN tournament_team_applications application
      ON application.id = member.application_id
    WHERE notification.event_type = 'team_invitation'
      AND notification.application_id IS NULL
      AND notification.title = 'Приглашение в ' || application.team_name
      AND notification.created_at BETWEEN application.created_at - INTERVAL '1 minute'
          AND application.created_at + INTERVAL '10 minutes'
)
UPDATE notification_outbox notification
SET application_id = candidate.application_id
FROM invitation_candidates candidate
WHERE notification.id = candidate.notification_id
  AND candidate.candidate_order = 1;
