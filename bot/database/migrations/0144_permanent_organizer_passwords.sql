CREATE TABLE IF NOT EXISTS organizer_passwords (
    id BIGSERIAL PRIMARY KEY,
    password_hash VARCHAR(256) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO organizer_passwords(password_hash)
VALUES (
    'scrypt$1c0265c2f0c4109a0e013c71f8cf102d$21dcf31b94e4b7dca79c4a9b7c45c73d7f162d2e44ad5132c0b14befe3ccb1b58d7e8ff2a208982aa1766932b51cbe6edfaf77b68e0e618521c016d4b20fe7dc'
)
ON CONFLICT (password_hash) DO NOTHING;
