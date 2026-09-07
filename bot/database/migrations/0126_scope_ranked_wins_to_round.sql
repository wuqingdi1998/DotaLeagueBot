ALTER TABLE season_ranked_win_checks
    ADD COLUMN round_id BIGINT;

UPDATE season_ranked_win_checks AS ranked_wins
SET round_id = (
    SELECT COALESCE(
        (
            SELECT registration.round_id
            FROM tournament_audit_log AS audit
            JOIN season_round_registrations AS registration
                ON registration.round_id = (audit.details->>'roundId')::BIGINT
               AND registration.player_id = ranked_wins.player_id
            WHERE audit.entity_type = 'season_ranked_wins'
              AND audit.entity_id = ranked_wins.player_id::TEXT
              AND audit.details->>'roundId' ~ '^[0-9]+$'
              AND (audit.details->>'checkedAt')::TIMESTAMPTZ
                    = ranked_wins.checked_at
            ORDER BY audit.created_at DESC
            LIMIT 1
        ),
        (
            SELECT registration.round_id
            FROM season_round_registrations AS registration
            WHERE registration.player_id = ranked_wins.player_id
            ORDER BY
                (registration.created_at <= ranked_wins.checked_at) DESC,
                CASE
                    WHEN registration.created_at <= ranked_wins.checked_at
                        THEN registration.created_at
                END DESC,
                registration.created_at ASC
            LIMIT 1
        )
    )
);

DELETE FROM season_ranked_win_checks
WHERE round_id IS NULL;

ALTER TABLE season_ranked_win_checks
    ALTER COLUMN round_id SET NOT NULL,
    DROP CONSTRAINT season_ranked_win_checks_pkey,
    ADD CONSTRAINT season_ranked_win_checks_pkey
        PRIMARY KEY (round_id, player_id),
    ADD CONSTRAINT season_ranked_win_checks_round_id_fkey
        FOREIGN KEY (round_id) REFERENCES season_rounds(id) ON DELETE CASCADE;

CREATE INDEX season_ranked_win_checks_player_idx
    ON season_ranked_win_checks(player_id);
