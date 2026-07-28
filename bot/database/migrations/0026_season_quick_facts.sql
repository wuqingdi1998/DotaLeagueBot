CREATE TABLE IF NOT EXISTS tournament_season_facts (
    id BIGSERIAL PRIMARY KEY,
    tournament_id BIGINT NOT NULL
        REFERENCES tournaments(id) ON DELETE CASCADE,
    sort_order SMALLINT NOT NULL CHECK (sort_order BETWEEN 1 AND 9),
    value_text VARCHAR(40) NOT NULL CHECK (BTRIM(value_text) <> ''),
    label VARCHAR(120) NOT NULL CHECK (BTRIM(label) <> ''),
    UNIQUE (tournament_id, sort_order)
);

WITH seasonal_tournaments AS (
    SELECT
        tournament.id,
        tournament.season_round_count,
        COUNT(round.id) FILTER (
            WHERE round.round_kind = 'regular' AND round.is_visible = TRUE
        )::int AS published_round_count
    FROM tournaments tournament
    LEFT JOIN season_rounds round ON round.tournament_id = tournament.id
    WHERE tournament.tournament_type = 'seasonal'
    GROUP BY tournament.id
)
INSERT INTO tournament_season_facts (
    tournament_id,
    sort_order,
    value_text,
    label
)
SELECT
    id,
    1,
    season_round_count::text,
    'Всего туров в сезоне'
FROM seasonal_tournaments
UNION ALL
SELECT
    id,
    2,
    published_round_count::text,
    'Опубликовано организатором'
FROM seasonal_tournaments
ON CONFLICT (tournament_id, sort_order) DO NOTHING;

CREATE INDEX IF NOT EXISTS tournament_season_facts_order_idx
    ON tournament_season_facts(tournament_id, sort_order);
