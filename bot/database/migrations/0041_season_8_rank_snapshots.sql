WITH season8_ranks(rank_snapshot, nickname) AS (
  VALUES
    (1, 'cYc.Lon3'),
    (2, 'Shima~'),
    (3, 'dravzen'),
    (4, 'ДЕД_ЕСЕНИН'),
    (5, 'Ame''s bastard'),
    (6, 'Gavr'),
    (7, 'greencat'),
    (8, 'Fayde'),
    (9, 'Pancake'),
    (10, 'lavchik'),
    (11, 'frokeng'),
    (12, '.flowerZ'),
    (13, 'ls~'),
    (14, 'Linkovatel'),
    (15, 'Zol'),
    (16, 'zobaa'),
    (17, 'Drksp1ce'),
    (18, 'umbrella'),
    (19, 'Son1c'),
    (20, 'nayк_cмepmu_228'),
    (21, 'Wuqing'),
    (22, '.Purvs'),
    (23, 'iloveiran'),
    (24, 'MirrorShard'),
    (25, 'Glamdring'),
    (26, 'N4ZE'),
    (27, 'GOLDEN PAPI'),
    (28, 'Makeme'),
    (29, 'Helqnux'),
    (30, 'evo'),
    (31, 'sobriety'),
    (32, 'Leeroy'),
    (33, 'chep'),
    (34, 'Felix_Anthony'),
    (35, 'hvru'),
    (36, '10gu'),
    (37, 'cy119'),
    (38, 'SKYRIS'),
    (39, 'Katakan'),
    (40, 'MMR NE ZHALKO'),
    (41, 'confuse'),
    (42, 'Dale Cooper'),
    (43, 'Yasama'),
    (44, 'Kesanka'),
    (45, 'lAf'),
    (46, 'leo_sokolov'),
    (47, 'reality')
)
UPDATE season_participants AS participant
SET rank_snapshot = source.rank_snapshot
FROM tournaments AS tournament, season8_ranks AS source
WHERE participant.tournament_id = tournament.id
  AND tournament.slug = 'league-season-8'
  AND participant.standings_section = 'active'
  AND LOWER(BTRIM(participant.nickname_snapshot)) =
      LOWER(BTRIM(source.nickname));

DO $check$
DECLARE
    missing_places TEXT;
BEGIN
    SELECT STRING_AGG(
        tournament.slug || ': ' || participant.nickname_snapshot,
        ', '
        ORDER BY tournament.slug, participant.nickname_snapshot
    )
    INTO missing_places
    FROM season_participants AS participant
    JOIN tournaments AS tournament
      ON tournament.id = participant.tournament_id
    WHERE tournament.tournament_type = 'seasonal'
      AND tournament.status IN ('finished', 'archived')
      AND participant.standings_section = 'active'
      AND participant.rank_snapshot IS NULL;

    IF missing_places IS NOT NULL THEN
        RAISE EXCEPTION
            'Не сохранены итоговые места сезонных турниров: %',
            missing_places;
    END IF;
END
$check$;
