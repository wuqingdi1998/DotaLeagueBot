UPDATE players
SET tier_status = 'current',
    last_updated = NOW()
WHERE LOWER(ingame_name) = 'son1c'
  AND is_archived = FALSE;
