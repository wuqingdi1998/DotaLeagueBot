CREATE TABLE IF NOT EXISTS season_lobby_team_name_settings (
    tournament_id BIGINT NOT NULL
        REFERENCES tournaments(id) ON DELETE CASCADE,
    lobby_name VARCHAR(160) NOT NULL,
    team_a_name VARCHAR(120) NOT NULL,
    team_b_name VARCHAR(120) NOT NULL,
    PRIMARY KEY (tournament_id, lobby_name)
);

INSERT INTO season_lobby_team_name_settings (
    tournament_id,
    lobby_name,
    team_a_name,
    team_b_name
)
SELECT tournament.id, names.lobby_name, names.team_a_name, names.team_b_name
FROM tournaments tournament
CROSS JOIN (VALUES
    ('Верхнее лобби', 'Викинги', 'Самураи'),
    ('Среднее лобби', 'Монголы', 'Ацтеки'),
    ('Нижнее лобби', 'Крестоносцы', 'Спартанцы')
) AS names(lobby_name, team_a_name, team_b_name)
WHERE tournament.slug = 'league-season-9'
ON CONFLICT (tournament_id, lobby_name) DO UPDATE
SET team_a_name = EXCLUDED.team_a_name,
    team_b_name = EXCLUDED.team_b_name;

UPDATE season_matches match
SET team_a_name = settings.team_a_name,
    team_b_name = settings.team_b_name,
    updated_at = NOW()
FROM season_lobbies lobby
JOIN season_rounds round ON round.id = lobby.round_id
JOIN season_lobby_team_name_settings settings
    ON settings.tournament_id = round.tournament_id
   AND settings.lobby_name = lobby.name
WHERE match.lobby_id = lobby.id
  AND round.round_kind = 'regular'
  AND (
      match.team_a_name IS DISTINCT FROM settings.team_a_name
      OR match.team_b_name IS DISTINCT FROM settings.team_b_name
  );
