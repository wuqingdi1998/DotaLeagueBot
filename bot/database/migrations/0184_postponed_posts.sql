CREATE TABLE postponed_posts (
    id TEXT PRIMARY KEY,
    guild_id BIGINT NOT NULL,
    channel_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'cancelled', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX postponed_posts_pending_due ON postponed_posts (scheduled_at)
    WHERE status = 'pending';

CREATE TRIGGER postponed_posts_notify
AFTER INSERT OR UPDATE OR DELETE ON postponed_posts
FOR EACH STATEMENT EXECUTE FUNCTION notify_bot_scheduled_events();
