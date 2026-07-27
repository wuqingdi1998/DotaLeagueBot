WITH historical_aliases(historical_nickname, current_nickname) AS (
    VALUES
        ('4ubrik', 'zhelezo'),
        ('bananza', 'zhelezo'),
        ('Raven', 'Ame''s Bastard'),
        ('Wasd', 'Yozhik'),
        ('iFlopz!', 'Sanraizu'),
        ('serenity', 'slither.io'),
        ('zvёzдочка', 'slither.io'),
        ('GOLDEN POPI', 'GOLDEN PAPI'),
        ('cusdvaqe', 'confuse'),
        ('.flowers', '.flowerZ')
)
UPDATE tournament_roster_snapshots AS snapshot
SET player_id = (
        SELECT player.discord_id
        FROM players AS player
        WHERE LOWER(BTRIM(player.ingame_name)) =
              LOWER(BTRIM(historical_aliases.current_nickname))
        ORDER BY player.discord_id
        LIMIT 1
    ),
    updated_at = NOW()
FROM tournament_team_applications AS application,
     tournaments AS tournament,
     historical_aliases
WHERE application.id = snapshot.application_id
  AND tournament.id = application.tournament_id
  AND tournament.slug IN (
      'cd-fastcup-1',
      'cd-fastcup-2',
      'cd-fastcup-3',
      'cd-fastcup-4',
      'cd-fastcup-6'
  )
  AND LOWER(BTRIM(snapshot.nickname_snapshot)) =
      LOWER(BTRIM(historical_aliases.historical_nickname))
  AND EXISTS (
      SELECT 1
      FROM players AS player
      WHERE LOWER(BTRIM(player.ingame_name)) =
            LOWER(BTRIM(historical_aliases.current_nickname))
  );
