UPDATE compendium_user_quest_rerolls reroll
SET daily_quest_id = legacy_quest.id
FROM compendium_daily_quests personal_quest
JOIN compendium_daily_quest_sets quest_set
  ON quest_set.id = personal_quest.quest_set_id
JOIN compendium_daily_quests legacy_quest
  ON legacy_quest.quest_set_id = personal_quest.quest_set_id
 AND legacy_quest.player_id IS NULL
 AND legacy_quest.position = personal_quest.position
WHERE reroll.daily_quest_id = personal_quest.id
  AND personal_quest.player_id IS NOT NULL
  AND quest_set.moscow_date =
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
  AND NOT EXISTS (
    SELECT 1
    FROM compendium_user_quest_completions completion
    WHERE completion.daily_quest_id = personal_quest.id
  );

DELETE FROM compendium_daily_quests personal_quest
USING compendium_daily_quest_sets quest_set
WHERE quest_set.id = personal_quest.quest_set_id
  AND personal_quest.player_id IS NOT NULL
  AND quest_set.moscow_date =
    (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date
  AND NOT EXISTS (
    SELECT 1
    FROM compendium_user_quest_completions completion
    WHERE completion.daily_quest_id = personal_quest.id
  );
