CREATE TABLE IF NOT EXISTS temporary_organizer_passwords (
    id BIGSERIAL PRIMARY KEY,
    password_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (password_hash, expires_at)
);

CREATE INDEX IF NOT EXISTS temporary_organizer_passwords_active_idx
    ON temporary_organizer_passwords(expires_at);

INSERT INTO temporary_organizer_passwords(password_hash, expires_at)
VALUES (
    'e348d8d0564992652cc3e8e5ae7dbcbed9ecdea4db96c573d8b2087643ee2569',
    '2026-07-31 20:00:00+03'::timestamptz
)
ON CONFLICT (password_hash, expires_at) DO NOTHING;
