ALTER TABLE tournaments
    ADD COLUMN IF NOT EXISTS playoff_type VARCHAR(24) NOT NULL
        DEFAULT 'double_elimination'
        CHECK (playoff_type IN ('single_elimination', 'double_elimination'));

ALTER TABLE tournament_groups
    ADD COLUMN IF NOT EXISTS explanation TEXT,
    ADD COLUMN IF NOT EXISTS team_capacity SMALLINT NOT NULL DEFAULT 4
        CHECK (team_capacity BETWEEN 3 AND 8),
    ADD COLUMN IF NOT EXISTS advance_to_playoff SMALLINT NOT NULL DEFAULT 2
        CHECK (advance_to_playoff BETWEEN 0 AND 8),
    ADD COLUMN IF NOT EXISTS advance_to_upper SMALLINT NOT NULL DEFAULT 1
        CHECK (advance_to_upper BETWEEN 0 AND 8),
    ADD COLUMN IF NOT EXISTS advance_to_lower SMALLINT NOT NULL DEFAULT 1
        CHECK (advance_to_lower BETWEEN 0 AND 8);

UPDATE tournaments
SET playoff_type = CASE
    WHEN LOWER(playoff_format) LIKE '%single%' THEN 'single_elimination'
    ELSE 'double_elimination'
END;

UPDATE tournament_groups tournament_group
SET team_capacity = LEAST(
    8,
    GREATEST(
        3,
        (
            SELECT COUNT(*)::smallint
            FROM tournament_group_teams group_team
            WHERE group_team.group_id = tournament_group.id
        )
    )
);

UPDATE tournament_groups tournament_group
SET explanation =
    'Итоговое распределение команд в группе установлено после проведения переигровки согласно правилам.'
FROM tournaments tournament
WHERE tournament_group.tournament_id = tournament.id
  AND tournament.slug = 'cd-fastcup-5'
  AND tournament_group.name = 'Группа A';
