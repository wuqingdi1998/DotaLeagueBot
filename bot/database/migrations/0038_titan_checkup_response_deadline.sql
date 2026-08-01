UPDATE titan_checkup_requests
SET expires_at = updated_at + INTERVAL '24 hours'
WHERE status = 'sent'
  AND expires_at IS NULL;
