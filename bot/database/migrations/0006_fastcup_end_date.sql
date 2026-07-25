UPDATE tournaments
SET end_at = '2026-05-24 23:59:00+03',
    updated_at = NOW()
WHERE slug = 'cd-fastcup-5'
  AND end_at = '2026-05-25 00:30:00+03';

