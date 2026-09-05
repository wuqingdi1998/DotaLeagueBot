#!/usr/bin/env bash
set -euo pipefail

expected_settings="10|4|10|2880|2026-09-05 13:00|2026-09-05 13:00|1"
actual_settings="$(docker compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -At -c \
  "SELECT settings.primary_role_wins_required
      || '\''|'\'' || settings.secondary_role_wins_required
      || '\''|'\'' || settings.registration_delay_minutes
      || '\''|'\'' || settings.round_lead_minutes
      || '\''|'\'' || to_char(
        settings.registration_reminders_start_at AT TIME ZONE '\''Europe/Moscow'\'',
        '\''YYYY-MM-DD HH24:MI'\''
      )
      || '\''|'\'' || to_char(
        settings.scheduled_reminders_start_at AT TIME ZONE '\''Europe/Moscow'\'',
        '\''YYYY-MM-DD HH24:MI'\''
      )
      || '\''|'\'' || COUNT(catch_up.round_id)
   FROM season_ranked_win_reminder_settings AS settings
   JOIN tournaments AS tournament ON tournament.id = settings.tournament_id
   LEFT JOIN season_rounds AS round
     ON round.tournament_id = tournament.id AND round.round_number = 1
   LEFT JOIN season_ranked_win_reminder_catch_ups AS catch_up
     ON catch_up.round_id = round.id
    AND catch_up.event_type = '\''season_ranked_wins_first_round_catch_up'\''
   WHERE tournament.slug = '\''league-season-9'\''
   GROUP BY settings.tournament_id"')"

if [ "$actual_settings" != "$expected_settings" ]; then
  echo "Season ranked-win reminder settings are invalid: $actual_settings" >&2
  exit 1
fi
echo "Season ranked-win reminders are configured"

catch_up_epoch="$(date -d '2026-09-05 10:00:00 UTC' +%s)"
while [ "$(date -u +%s)" -lt "$catch_up_epoch" ]; do
  sleep 30
done

for attempt in $(seq 1 120); do
  delivery="$(docker compose exec -T db sh -c \
    'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -At -c \
    "WITH expected AS (
       SELECT registration.player_id::bigint AS discord_id,
              round.id::bigint AS round_id
       FROM season_round_registrations AS registration
       JOIN season_rounds AS round ON round.id = registration.round_id
       JOIN tournaments AS tournament ON tournament.id = round.tournament_id
       JOIN season_ranked_win_reminder_settings AS settings
         ON settings.tournament_id = tournament.id
       JOIN season_ranked_win_reminder_catch_ups AS catch_up
         ON catch_up.round_id = round.id
        AND catch_up.event_type = '\''season_ranked_wins_first_round_catch_up'\''
       JOIN season_ranked_win_checks AS ranked_wins
         ON ranked_wins.player_id = registration.player_id
       WHERE tournament.slug = '\''league-season-9'\''
         AND registration.created_at <= catch_up.scheduled_at
         AND ranked_wins.checked_at >= catch_up.scheduled_at - INTERVAL '\''15 minutes'\''
         AND (
           ranked_wins.primary_wins < settings.primary_role_wins_required
           OR ranked_wins.secondary_wins < settings.secondary_role_wins_required
         )
     ), expected_delivery AS (
       SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE notification.id IS NULL)::int AS missing
       FROM expected
       LEFT JOIN notification_outbox AS notification
         ON notification.discord_id = expected.discord_id
        AND notification.season_round_id = expected.round_id
        AND notification.event_type =
              '\''season_ranked_wins_first_round_catch_up'\''
     ), delivered AS (
       SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = '\''sent'\'')::int AS sent,
              COUNT(*) FILTER (WHERE status = '\''failed'\'')::int AS failed,
              COUNT(*) FILTER (WHERE status = '\''pending'\'')::int AS pending
       FROM notification_outbox
       WHERE event_type = '\''season_ranked_wins_first_round_catch_up'\''
     )
     SELECT expected_delivery.total || '\''|'\'' || delivered.total || '\''|'\''
       || delivered.sent || '\''|'\'' || delivered.failed || '\''|'\''
       || delivered.pending || '\''|'\'' || expected_delivery.missing
     FROM expected_delivery CROSS JOIN delivered"')"
  IFS='|' read -r expected total sent failed pending missing <<< "$delivery"
  if [ "$expected" -gt 0 ] && [ "$total" -gt 0 ] && [ "$missing" -eq 0 ] && [ "$pending" -eq 0 ]; then
    echo "First-round catch-up delivered: $sent sent, $failed failed"
    exit 0
  fi
  sleep 5
done

echo "First-round catch-up did not finish: $delivery" >&2
docker compose logs --tail=200 bot
exit 1
