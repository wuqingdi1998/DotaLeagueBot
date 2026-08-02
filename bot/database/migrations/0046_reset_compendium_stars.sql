-- The TI 2026 event owner requested a clean star restart on 2026-08-02.
-- Permanent profile badges are intentionally stored separately and remain earned.
DELETE FROM compendium_prediction_rewards;
DELETE FROM compendium_admin_star_adjustments;
DELETE FROM compendium_user_quest_completions;
