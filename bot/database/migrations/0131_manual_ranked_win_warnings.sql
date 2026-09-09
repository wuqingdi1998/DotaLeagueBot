DELETE FROM season_ranked_win_reminder_catch_ups;
DELETE FROM season_ranked_win_reminder_settings;

UPDATE notification_outbox
SET status = 'cancelled',
    last_error = NULL
WHERE status = 'pending'
  AND event_type IN (
    'season_ranked_wins_registration_reminder',
    'season_ranked_wins_48_hour_reminder',
    'season_ranked_wins_first_round_catch_up'
  );
