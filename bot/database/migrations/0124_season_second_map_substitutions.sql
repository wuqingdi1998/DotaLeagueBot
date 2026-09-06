CREATE OR REPLACE VIEW season_match_room_players AS
WITH latest_match_substitution AS (
    SELECT DISTINCT ON (substitution.match_id, substitution.outgoing_player_id)
        substitution.match_id,
        substitution.outgoing_player_id,
        substitution.incoming_player_id
    FROM season_match_substitutions substitution
    LEFT JOIN season_match_games game ON game.id = substitution.game_id
    WHERE substitution.game_id IS NULL
       OR (game.game_number = 2 AND (
           game.status = 'completed'
           OR EXISTS (
               SELECT 1 FROM season_match_games first_game
               WHERE first_game.match_id = substitution.match_id
                 AND first_game.game_number = 1
                 AND first_game.status = 'completed'
                 AND first_game.dota_match_id IS NOT NULL
                 AND first_game.winner_side IN ('a', 'b')
           )
       ))
    ORDER BY substitution.match_id, substitution.outgoing_player_id,
        substitution.id DESC
)
SELECT participant.match_id,
    COALESCE(substitution.incoming_player_id, participant.player_id) AS player_id,
    participant.player_id AS source_player_id,
    participant.team_side,
    CASE
        WHEN substitution.incoming_player_id IS NULL
            THEN participant.tier_snapshot
        ELSE COALESCE(
            NULLIF(incoming_player.internal_rating, 0),
            CASE
                WHEN incoming_player.rank_tier >= 10
                    THEN incoming_player.rank_tier / 10
                WHEN incoming_player.rank_tier > 0
                    THEN incoming_player.rank_tier
                ELSE NULL
            END
        )
    END AS tier_snapshot,
    participant.slot_number
FROM season_match_participants participant
LEFT JOIN latest_match_substitution substitution
    ON substitution.match_id = participant.match_id
   AND substitution.outgoing_player_id = participant.player_id
LEFT JOIN players incoming_player
    ON incoming_player.discord_id = substitution.incoming_player_id;
