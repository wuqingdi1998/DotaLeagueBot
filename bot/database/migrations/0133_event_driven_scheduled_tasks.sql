CREATE OR REPLACE FUNCTION notify_bot_scheduled_events()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM pg_notify('bot_scheduled_events', TG_TABLE_NAME);
    RETURN COALESCE(NEW, OLD);
END
$function$;

DROP TRIGGER IF EXISTS notification_outbox_scheduler_wakeup
    ON notification_outbox;
CREATE TRIGGER notification_outbox_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON notification_outbox
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS channel_announcement_scheduler_wakeup
    ON channel_announcement_outbox;
CREATE TRIGGER channel_announcement_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON channel_announcement_outbox
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS season_lobby_notification_scheduler_wakeup
    ON season_lobby_notification_outbox;
CREATE TRIGGER season_lobby_notification_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_lobby_notification_outbox
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS direct_message_campaign_scheduler_wakeup
    ON direct_message_campaigns;
CREATE TRIGGER direct_message_campaign_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON direct_message_campaigns
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS direct_message_recipient_scheduler_wakeup
    ON direct_message_campaign_recipients;
CREATE TRIGGER direct_message_recipient_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON direct_message_campaign_recipients
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS titan_checkup_scheduler_wakeup
    ON titan_checkup_requests;
CREATE TRIGGER titan_checkup_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON titan_checkup_requests
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS season_round_scheduler_wakeup ON season_rounds;
CREATE TRIGGER season_round_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_rounds
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS season_registration_scheduler_wakeup
    ON season_round_registrations;
CREATE TRIGGER season_registration_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_round_registrations
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS season_checkin_scheduler_wakeup
    ON season_round_checkins;
CREATE TRIGGER season_checkin_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_round_checkins
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS tournament_application_scheduler_wakeup
    ON tournament_team_applications;
CREATE TRIGGER tournament_application_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON tournament_team_applications
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS tournament_match_scheduler_wakeup
    ON tournament_matches;
CREATE TRIGGER tournament_match_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON tournament_matches
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS tournament_scheduler_wakeup ON tournaments;
CREATE TRIGGER tournament_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON tournaments
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS season_lobby_scheduler_wakeup ON season_lobbies;
CREATE TRIGGER season_lobby_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_lobbies
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS tournament_organizer_scheduler_wakeup
    ON tournament_organizers;
CREATE TRIGGER tournament_organizer_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON tournament_organizers
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS season_match_room_scheduler_wakeup
    ON season_match_rooms;
CREATE TRIGGER season_match_room_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON season_match_rooms
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS draft_series_scheduler_wakeup ON draft_series;
CREATE TRIGGER draft_series_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON draft_series
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS draft_map_scheduler_wakeup ON draft_maps;
CREATE TRIGGER draft_map_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON draft_maps
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();

DROP TRIGGER IF EXISTS draft_invitation_scheduler_wakeup
    ON draft_invitations;
CREATE TRIGGER draft_invitation_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON draft_invitations
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();
