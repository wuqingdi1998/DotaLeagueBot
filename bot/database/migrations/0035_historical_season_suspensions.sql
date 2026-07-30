DO $$
DECLARE
    updated_participants INTEGER;
BEGIN
    CREATE TEMP TABLE historical_season_suspension_source (
        season INTEGER NOT NULL,
        nickname TEXT NOT NULL,
        rounds JSONB NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO historical_season_suspension_source (season, nickname, rounds)
    SELECT source.season, source.nickname, source.rounds
    FROM jsonb_to_recordset($suspensions$
[
  {"season":4,"nickname":"kuindzhi","rounds":[13]},
  {"season":4,"nickname":"Wuqing","rounds":[5]},
  {"season":4,"nickname":"holiC","rounds":[11]},
  {"season":4,"nickname":"Zele","rounds":[13]},
  {"season":4,"nickname":"Yoma","rounds":[7,10]},
  {"season":4,"nickname":"thundergod","rounds":[2]},
  {"season":5,"nickname":"GOLDEN POPI","rounds":[5]},
  {"season":5,"nickname":"rMuffin","rounds":[4]},
  {"season":5,"nickname":"ПОДПИВАС","rounds":[7]},
  {"season":5,"nickname":"foxes","rounds":[12,14]},
  {"season":5,"nickname":"iFlopz!","rounds":[4,9]},
  {"season":5,"nickname":"wispiq","rounds":[9,10]},
  {"season":5,"nickname":"lotain","rounds":[5,7,9,13,14]},
  {"season":6,"nickname":"serenity","rounds":[10]},
  {"season":6,"nickname":"Bel1eve","rounds":[8]},
  {"season":6,"nickname":"reality","rounds":[7]},
  {"season":6,"nickname":"Leshy","rounds":[4,8]},
  {"season":6,"nickname":"sarasa~","rounds":[5]},
  {"season":6,"nickname":"Raven","rounds":[12]},
  {"season":6,"nickname":"vhskraaq","rounds":[11]},
  {"season":6,"nickname":"bananza","rounds":[8]},
  {"season":6,"nickname":"143","rounds":[8]},
  {"season":6,"nickname":"Yontlone","rounds":[8]},
  {"season":7,"nickname":"Ame's Bastard","rounds":[8]},
  {"season":7,"nickname":"143","rounds":[9]},
  {"season":7,"nickname":"iFlopz!","rounds":[3]},
  {"season":7,"nickname":"hvru","rounds":[3,7]},
  {"season":7,"nickname":"vhskraaq","rounds":[3]},
  {"season":7,"nickname":"escapist","rounds":[3,5]},
  {"season":7,"nickname":"Skittles","rounds":[3]}
]
$suspensions$::jsonb) AS source(
        season INTEGER,
        nickname TEXT,
        rounds JSONB
    );

    UPDATE season_participants participant
    SET standings_snapshot = jsonb_set(
            COALESCE(participant.standings_snapshot, '{}'::jsonb),
            '{suspendedRoundNumbers}',
            source.rounds,
            TRUE
        ),
        updated_at = NOW()
    FROM historical_season_suspension_source source
    JOIN tournaments tournament
      ON tournament.slug = 'league-season-' || source.season::TEXT
    WHERE participant.tournament_id = tournament.id
      AND (
          LOWER(BTRIM(participant.nickname_snapshot)) =
              LOWER(BTRIM(source.nickname))
          OR (
              source.season = 5
              AND source.nickname = 'ПОДПИВАС'
              AND participant.player_id = (
                  SELECT player.discord_id
                  FROM players player
                  WHERE player.steam_id32 = '166568345'
              )
          )
      );

    GET DIAGNOSTICS updated_participants = ROW_COUNT;
    IF updated_participants <> 30 THEN
        RAISE EXCEPTION
            'Expected 30 historical suspension participants, updated %',
            updated_participants;
    END IF;
END $$;
