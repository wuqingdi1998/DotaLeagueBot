CREATE TABLE IF NOT EXISTS temporary_subscription_roles (
    guild_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    granted_by BIGINT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (guild_id, member_id, role_id)
);

CREATE INDEX IF NOT EXISTS temporary_subscription_roles_expiry_idx
    ON temporary_subscription_roles (expires_at, guild_id, member_id, role_id);

DROP TRIGGER IF EXISTS temporary_subscription_role_scheduler_wakeup
    ON temporary_subscription_roles;
CREATE TRIGGER temporary_subscription_role_scheduler_wakeup
AFTER INSERT OR UPDATE OR DELETE ON temporary_subscription_roles
FOR EACH ROW EXECUTE FUNCTION notify_bot_scheduled_events();
