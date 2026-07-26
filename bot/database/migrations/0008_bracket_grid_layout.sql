ALTER TABLE tournament_matches
    ADD COLUMN IF NOT EXISTS bracket_grid_column SMALLINT
        CHECK (bracket_grid_column BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS bracket_grid_row SMALLINT
        CHECK (bracket_grid_row BETWEEN 0 AND 100);

UPDATE tournament_matches match
SET bracket_grid_column = 19,
    bracket_grid_row = 8
FROM tournaments tournament
WHERE match.tournament_id = tournament.id
  AND tournament.slug = 'cd-fastcup-5'
  AND match.bracket_side = 'lower'
  AND match.bracket_round = 2
  AND match.bracket_slot = 1;
