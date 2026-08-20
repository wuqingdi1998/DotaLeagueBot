UPDATE compendium_star_race_arcana_checks
SET finished_at = NULL,
    has_arcana = NULL,
    check_after = NOW(),
    updated_at = NOW()
WHERE has_arcana = FALSE
  AND moscow_date >=
      ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date - 1)
  AND moscow_date <=
      (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Moscow')::date;
