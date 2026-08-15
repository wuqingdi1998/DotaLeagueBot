UPDATE tournaments
SET check_in_minutes = 60,
    updated_at = NOW()
WHERE slug = 'lserumsh'
  AND check_in_minutes <> 60;
