CREATE TABLE cup_constructor_boards (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    board JSONB NOT NULL CHECK (jsonb_typeof(board) = 'object'),
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
