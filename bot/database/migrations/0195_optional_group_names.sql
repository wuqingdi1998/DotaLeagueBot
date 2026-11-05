-- Empty names hide group headings; several unnamed groups may coexist.
ALTER TABLE tournament_groups
  DROP CONSTRAINT IF EXISTS tournament_groups_tournament_id_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS tournament_groups_nonempty_name_key
  ON tournament_groups(tournament_id, name)
  WHERE btrim(name) <> '';
