ALTER TABLE season_match_participants
    ADD COLUMN IF NOT EXISTS tier_snapshot SMALLINT
        CHECK (tier_snapshot BETWEEN 0 AND 20);

DO $migration$
DECLARE
    missing_tiers TEXT;
BEGIN
    CREATE TEMP TABLE season8_tier_source ON COMMIT DROP AS
    SELECT DISTINCT
        round_data.r AS round_number,
        BTRIM(player_data.value->>0) AS nickname,
        (player_data.value->>1)::SMALLINT AS tier
    FROM jsonb_to_recordset($tiers$
    [
      {"r":1,"p":[["Ame's bastard",10],["Fayde",10],["gogogo",10],["Gary",10],["Wuqing",9],["lavchik",9],["InWalker",9],["Yontlone",9],[".flowerZ",8],["Yasama",8],["Shima~",8],["Zol",8],["Gavr",8],["Yozhik",8],["eosom",8],["ls~",7],["hohlokit",7],["fxreveryoungg",7],["zobaa",7],["evo",7],["10gu",7],["GOLDEN PAPI",6],["SKYRIS",6],["escap1st",6],["N4ZE",6],["Pancake",5],["cy119",5],["shu",5],["cYc.Lon3",5],["frokeng",4],["Katakan",8],["greencat",10]]},
      {"r":2,"p":[["Fayde",10],["greencat",10],["Ame's Bastard",10],["cherepashka",10],["iloveiran",10],["Wuqing",9],["Yasama",8],["vhskraaq",8],[".flowerZ",8],["lavchik",8],["Gavr",8],["Shima~",8],["zobaa",7],["evo",7],["fxreveryoungg",7],["hohlokit",7],["Linkovatel",7],["10gu",7],["Inmortal",7],["ls~",7],["Yozhik",7],["AlaStoR",6],["GOLDEN PAPI",6],["cy119",5],["ДЕД_ЕСЕНИН",5],["lotain",5],["dravzen",5],["cYc.Lon3",5],["Pancake",5],["frokeng",4]]},
      {"r":3,"p":[["Leeroy",8],[".flowerZ",8],["dravzen",5],["Pancake",5],["cy119",5],["Gavr",8],["Ar4ud1ksss",7],["hvru",6],["N4ZE",6],["frokeng",4],["lavchik",9],["Inmortal",7],["ls~",7],["lotain",5],["ДЕД_ЕСЕНИН",5],["Wuqing",9],["10gu",7],["evo",7],["MirrorShard",5],["cYc.Lon3",5],["Fayde",10],["Gary",10],["Ame's bastard",10],["Shima~",8],["zobaa",7],["Son1c",10],["greencat",10],["cherepashka",10],["Zol",9],["fxreveryoungg",7],["Yasama",8],["kretoy",6],["IUPAK9",6]]},
      {"r":4,"p":[["Ame's bastard",10],["Fayde",10],["Son1c",10],["Gary",10],["iloveiran",10],["greencat",10],["lavchik",9],["chep",9],["Wuqing",9],["Zol",9],["fxreveryoungg",8],["Leeroy",8],["Yasama",8],[".flowerZ",8],["Shima~",8],["Gavr",8],["hohlokit",7],["Inmortal",7],["zobaa",7],["ls~",7],["10gu",7],["Katakan",7],["IUPAK9",6],["nayк_cмepmu_228",6],["ДЕД_ЕСЕНИН",6],["dravzen",5],["Pancake",5],["cYc.Lon3",5],["MirrorShard",5],["cy119",5],["frokeng",4],["Ar4ud1ksss",7]]},
      {"r":5,"p":[["Ame's bastard",10],["greencat",10],["iloveiran",10],["lavchik",9],[".flowerZ",8],["fxreveryoungg",8],["Shima~",8],["Gavr",8],["vhskraaq",8],["Katakan",7],["evo",7],["ls~",7],["zobaa",7],["IUPAK9",6],["nayк_cмepmu_228",6],["sobriety",6],["dravzen",5],["Pancake",5],["cYc.Lon3",5],["MirrorShard",5],["frokeng",4],["кошmurr",4],["Linkovatel",7]]},
      {"r":6,"p":[["Ame's bastard",10],["greencat",10],["Bot Fergus",10],["lavchik",9],["chep",9],["Wuqing",9],["Zol",9],["Shima~",8],[".flowerZ",8],["Gavr",8],["zobaa",7],["Linkovatel",7],["evo",7],["IUPAK9",6],["N4ZE",6],["nayк_cмepmu_228",6],["ДЕД_ЕСЕНИН",6],["cYc.Lon3",5],["MirrorShard",5],["cy119",5],["frokeng",4],["Yasama",8],["GOLDEN POPI",6],["dravzen",5]]},
      {"r":7,"p":[["Ame's bastard",10],["Son1c",10],["greencat",10],["lavchik",9],["chep",9],["Wuqing",9],["Zol",9],["Yasama",8],[".flowerZ",8],["Shima~",8],["zobaa",8],["Gavr",8],["Pancake",6],["IUPAK9",6],["nayк_cмepmu_228",6],["hvru",6],["ДЕД_ЕСЕНИН",6],["MirrorShard",6],["cYc.Lon3",5],["cy119",5],["frokeng",4]]},
      {"r":8,"p":[["Ame's bastard",10],["Fayde",10],["greencat",10],["lavchik",9],["Drksp1ce",8],["Yasama",8],["Shima~",8],[".flowerZ",8],["eosom",8],["Katakan",8],["Helqnux",7],["10gu",7],["GOLDEN PAPI",6],["Pancake",6],["IUPAK9",6],["nayк_cмepmu_228",6],["ДЕД_ЕСЕНИН",6],["MirrorShard",6],["dravzen",6],["cYc.Lon3",5],["frokeng",4],["N4ZE",6],["Son1c",10]]},
      {"r":9,"p":[["greencat",10],["Fayde",10],["reality",10],["lavchik",9],["Zol",9],["Leeroy",8],["Drksp1ce",8],["Shima~",8],["Gavr",8],["SKYRIS",7],[".Purvs",6],["nayк_cмepmu_228",6],["Pancake",6],["Puckетик",6],["IUPAK9",6],["dravzen",6],["MirrorShard",6],["ДЕД_ЕСЕНИН",6],["lAf",5],["umbrella",5],["cYc.Lon3",5],["frokeng",4]]},
      {"r":10,"p":[["Fayde",10],["Ame's bastard",10],["greencat",10],["lavchik",9],["Wuqing",9],["Zol",9],["eosom",8],["Drksp1ce",8],["Shima~",8],["Gavr",8],["Helqnux",7],["GOLDEN PAPI",6],["Pancake",6],[".Purvs",6],["IUPAK9",6],["MirrorShard",6],["ДЕД_ЕСЕНИН",6],["cYc.Lon3",5],["nayк_cмepmu_228",5],["umbrella",4],["frokeng",4]]},
      {"r":11,"p":[["Fayde",10],["Ame's bastard",10],["greencat",10],["lavchik",9],["Wuqing",9],["Makeme",8],["Drksp1ce",8],["Shima~",8],["MMR NE ZHALKO",8],["Gavr",8],["Linkovatel",7],["Felix_Anthony",6],["GOLDEN PAPI",6],["Pancake",6],[".Purvs",6],["dravzen",6],["ДЕД_ЕСЕНИН",6],["cYc.Lon3",5],["umbrella",4],["frokeng",4]]},
      {"r":12,"p":[["Fayde",10],["Ame's bastard",10],["Son1c",10],["Kesanka",10],["iloveiran",10],["greencat",10],["lavchik",9],["Wuqing",9],["Leeroy",8],["Drksp1ce",8],[".flowerZ",8],["Shima~",8],["MMR NE ZHALKO",8],["Glamdring",8],["Gavr",8],["10gu",7],["Dale Cooper",7],["Linkovatel",7],["ls~",7],["Felix_Anthony",6],["GOLDEN PAPI",6],["Pancake",6],[".Purvs",6],["dravzen",6],["cy119",5],["ДЕД_ЕСЕНИН",6],["leo_sokolov",5],["umbrella",5],["cYc.Lon3",5],["frokeng",4]]},
      {"r":13,"p":[["Fayde",10],["Ame's bastard",10],["Son1c",10],["greencat",10],["iloveiran",10],["Wuqing",9],["lavchik",9],[".flowerZ",8],["Gavr",8],["Drksp1ce",8],["Glamdring",8],["Shima~",8],["confuse",8],["MMR NE ZHALKO",8],["Makeme",8],["Helqnux",7],["Linkovatel",7],["ls~",7],["sobriety",7],["ДЕД_ЕСЕНИН",6],["dravzen",6],["GOLDEN PAPI",6],["N4ZE",6],["Felix_Anthony",6],["hvru",6],["Pancake",5],["umbrella",5],["cYc.Lon3",5],["cy119",5],["frokeng",4],["lAf",5]]},
      {"r":14,"p":[["Fayde",10],["Ame's bastard",10],["Son1c",10],["greencat",10],[".flowerZ",8],["Gavr",8],["Drksp1ce",8],["Glamdring",8],["Shima~",8],["Makeme",8],["Helqnux",7],["Linkovatel",7],["dravzen",6],["ДЕД_ЕСЕНИН",6],["MirrorShard",6],["cYc.Lon3",5],["cy119",5],["Pancake",5],["umbrella",5],["frokeng",4]]},
      {"r":15,"p":[["Ame's bastard",10],["greencat",10],["Fayde",10],["Son1c",10],["lavchik",9],["Zol",9],["Wuqing",9],["Shima~",8],["Gavr",8],[".flowerZ",8],["Drksp1ce",8],["Linkovatel",7],["zobaa",7],["dravzen",6],["ДЕД_ЕСЕНИН",6],["MirrorShard",6],["cYc.Lon3",5],["Pancake",5],["umbrella",5],["frokeng",4]]}
    ]
    $tiers$::jsonb) AS round_data(r INT, p JSONB)
    CROSS JOIN LATERAL jsonb_array_elements(round_data.p)
        AS player_data(value);

    UPDATE season_match_participants AS participant
    SET tier_snapshot = tier_source.tier
    FROM season_matches match
    JOIN season_lobbies lobby ON lobby.id = match.lobby_id
    JOIN season_rounds round ON round.id = lobby.round_id
    JOIN tournaments tournament ON tournament.id = round.tournament_id
    JOIN season8_tier_source tier_source
      ON tier_source.round_number = round.round_number
    WHERE participant.match_id = match.id
      AND tournament.slug = 'league-season-8'
      AND LOWER(BTRIM(participant.nickname_snapshot)) =
          LOWER(tier_source.nickname);

    SELECT STRING_AGG(
        'Тур ' || round.round_number || ': ' ||
        COALESCE(participant.nickname_snapshot, participant.player_id::TEXT),
        ', '
        ORDER BY round.round_number, participant.nickname_snapshot
    )
    INTO missing_tiers
    FROM season_match_participants participant
    JOIN season_matches match ON match.id = participant.match_id
    JOIN season_lobbies lobby ON lobby.id = match.lobby_id
    JOIN season_rounds round ON round.id = lobby.round_id
    JOIN tournaments tournament ON tournament.id = round.tournament_id
    WHERE tournament.slug = 'league-season-8'
      AND participant.tier_snapshot IS NULL;

    IF missing_tiers IS NOT NULL THEN
        RAISE EXCEPTION
            'Не найдены исторические тиры игроков сезона 8: %',
            missing_tiers;
    END IF;
END
$migration$;
