-- No game objects are created when the shared migration runner targets production.
DO $$ BEGIN
IF current_database() = 'linkens_development' THEN
  CREATE TABLE IF NOT EXISTS autobattler_profiles (
    user_id TEXT PRIMARY KEY,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK ((state->>'tickets')::integer >= 0)
  );
  CREATE TABLE IF NOT EXISTS autobattler_operations (
    user_id TEXT NOT NULL REFERENCES autobattler_profiles(user_id) ON DELETE CASCADE,
    operation_id UUID NOT NULL,
    action TEXT NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(user_id, operation_id)
  );
  CREATE INDEX IF NOT EXISTS autobattler_operations_history ON autobattler_operations(user_id, created_at DESC);
END IF;
END $$;
