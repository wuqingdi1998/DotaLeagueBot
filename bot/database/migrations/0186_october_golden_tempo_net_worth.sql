DO $$
DECLARE
  replacement JSONB := '{"title":"Золотой темп","description":"Наберите суммарно 60 000 ценности в победных рейтинговых или обычных All Pick матчах за день.","requirement":{"kind":"cumulative-net-worth","target":60000},"dateKey":"2026-10-24","weekday":"Суббота","dateLabel":"24 октября","rewardStars":4}'::jsonb;
BEGIN
  IF EXISTS (
    SELECT 1 FROM compendium_star_race_quest_completions completion
    JOIN october_compendium_final_race_paths path ON path.player_id = completion.player_id
    WHERE completion.moscow_date = DATE '2026-10-24' AND path.path = 'core'
  ) OR EXISTS (
    SELECT 1 FROM compendium_star_race_quest_progress progress
    JOIN october_compendium_final_race_paths path ON path.player_id = progress.player_id
    WHERE progress.moscow_date = DATE '2026-10-24' AND path.path = 'core' AND progress.progress_amount > 0
  ) THEN
    RAISE EXCEPTION 'Golden tempo already has core results; preserve and reconcile them before changing its condition';
  END IF;

  UPDATE october_compendium_race_week_definitions
  SET definition = jsonb_set(jsonb_set(definition, '{questPaths,core,5}', replacement), '{quests,5}', replacement)
  WHERE week_id = DATE '2026-10-19';

  UPDATE october_compendium_challenge_days
  SET race_definition = jsonb_set(race_definition, '{paths,core}', replacement)
  WHERE moscow_date = DATE '2026-10-24';

  UPDATE october_compendium_verification_requests request
  SET snapshot = jsonb_set(request.snapshot, '{requirement}', replacement->'requirement')
  FROM october_compendium_final_race_paths path
  WHERE request.player_id = path.player_id AND path.path = 'core'
    AND request.challenge_kind = 'star_race' AND request.moscow_date = DATE '2026-10-24'
    AND request.status IN ('pending', 'exhausted');
END;
$$;
