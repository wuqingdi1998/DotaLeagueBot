ALTER TABLE october_compendium_verification_requests
    DROP CONSTRAINT october_compendium_verification_requests_status_check;
ALTER TABLE october_compendium_verification_requests
    ADD CONSTRAINT october_compendium_verification_requests_status_check
    CHECK (status IN ('pending', 'completed', 'exhausted', 'cancelled'));
