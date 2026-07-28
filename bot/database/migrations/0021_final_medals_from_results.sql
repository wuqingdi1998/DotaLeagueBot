UPDATE season_finalists
SET medal = NULL
WHERE medal IS NOT NULL;

CREATE UNIQUE INDEX season_finalists_seed_unique_idx
    ON season_finalists(tournament_id, seed)
    WHERE seed IS NOT NULL;
