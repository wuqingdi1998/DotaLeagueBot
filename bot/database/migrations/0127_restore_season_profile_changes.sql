-- One-time season allowance restoration, including changes spent after the deadline.
-- Mark the current policy as applied so the next change cannot reset counters again.
UPDATE players
SET nick_changes_used = 0,
    role_changes_used = 0,
    last_role_change_at = NULL,
    profile_change_policy_version = 1;
