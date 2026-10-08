ALTER TABLE match_region_audits DROP CONSTRAINT match_region_audits_status_check;

UPDATE match_region_audits SET status = 'allowed' WHERE status = 'stockholm';

ALTER TABLE match_region_audits ADD CONSTRAINT match_region_audits_status_check
    CHECK (status IN ('pending', 'allowed', 'sent'));
