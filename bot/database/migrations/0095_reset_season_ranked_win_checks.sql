-- Stored values are a derived cache. Earlier refreshes could save a partial
-- result when a provider returned wins without roles, so rebuild every value.
DELETE FROM season_ranked_win_checks;
