ALTER TABLE draft_presence DROP CONSTRAINT draft_presence_pkey;
ALTER TABLE draft_presence ADD PRIMARY KEY (series_id, player_id);
