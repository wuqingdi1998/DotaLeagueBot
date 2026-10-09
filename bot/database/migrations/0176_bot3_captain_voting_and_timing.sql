CREATE TABLE draft_bot3_lobbies (
    series_id BIGINT PRIMARY KEY REFERENCES draft_series(id) ON DELETE CASCADE,
    state JSONB NOT NULL
);

ALTER TABLE draft_maps
    ADD COLUMN bot_action_key TEXT,
    ADD COLUMN bot_action_due_at TIMESTAMPTZ;

CREATE FUNCTION notify_bot3_captain_schedule() RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('bot_scheduled_events', 'fearless_draft');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER draft_bot3_captain_schedule_changed
AFTER INSERT OR UPDATE ON draft_bot3_lobbies
FOR EACH ROW EXECUTE FUNCTION notify_bot3_captain_schedule();
