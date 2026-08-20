CREATE TABLE IF NOT EXISTS compendium_arcana_replay_results (
  match_id BIGINT PRIMARY KEY,
  wearables JSONB NOT NULL,
  parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT compendium_arcana_replay_results_wearables_array
    CHECK (jsonb_typeof(wearables) = 'array')
);

COMMENT ON TABLE compendium_arcana_replay_results IS
  'Small extracted wearable list; replay files are streamed and never stored.';
