-- Generated fixture: relevant development schema, captured 2026-11-08.

CREATE TABLE public.players (
    discord_id bigint NOT NULL,
    steam_id32 bigint NOT NULL,
    ingame_name character varying NOT NULL,
    real_name character varying,
    positions character varying,
    avatar_url character varying,
    rank_tier integer,
    internal_rating integer,
    last_updated timestamp with time zone DEFAULT now(),
    team_id integer,
    last_season_update integer,
    nick_changes_used integer,
    role_changes_used integer,
    last_role_change_at timestamp with time zone,
    seasonal_free_reg_used integer DEFAULT 0,
    last_seasonal_season_update integer DEFAULT 0,
    is_archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    archived_by bigint,
    tier_status character varying(12) DEFAULT 'current'::character varying NOT NULL,
    archived_steam_id32 bigint,
    profile_change_policy_version integer DEFAULT 0 NOT NULL,
    CONSTRAINT players_tier_status_valid CHECK (((tier_status)::text = ANY (ARRAY[('current'::character varying)::text, ('outdated'::character varying)::text, ('inactive'::character varying)::text])))
);

CREATE TABLE public.player_identities (
    id bigint NOT NULL,
    primary_nickname character varying(100) NOT NULL,
    registered_player_id bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.player_identity_members (
    identity_id bigint NOT NULL,
    player_id bigint NOT NULL,
    nickname_snapshot character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.player_nickname_history (
    id bigint NOT NULL,
    player_id bigint NOT NULL,
    nickname character varying(100) NOT NULL,
    nickname_key character varying(100) GENERATED ALWAYS AS (lower(btrim((nickname)::text))) STORED,
    first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.season_lobbies (
    id bigint NOT NULL,
    round_id bigint NOT NULL,
    name character varying(160) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    scheduled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT season_lobbies_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('scheduled'::character varying)::text, ('live'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);

CREATE TABLE public.season_match_games (
    id bigint NOT NULL,
    match_id bigint NOT NULL,
    game_number smallint NOT NULL,
    dota_match_id character varying(32),
    winner_side character varying(8),
    duration_seconds integer,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT season_match_games_dota_match_id_check CHECK (((dota_match_id IS NULL) OR ((dota_match_id)::text ~ '^[0-9]{1,32}$'::text))),
    CONSTRAINT season_match_games_duration_seconds_check CHECK (((duration_seconds IS NULL) OR (duration_seconds >= 0))),
    CONSTRAINT season_match_games_game_number_check CHECK (((game_number >= 1) AND (game_number <= 20))),
    CONSTRAINT season_match_games_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT season_match_games_winner_side_check CHECK (((winner_side)::text = ANY (ARRAY[('a'::character varying)::text, ('draw'::character varying)::text, ('b'::character varying)::text])))
);

CREATE TABLE public.season_match_participants (
    match_id bigint NOT NULL,
    player_id bigint NOT NULL,
    team_side character(1) NOT NULL,
    is_captain boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    nickname_snapshot character varying(100),
    tier_snapshot smallint,
    slot_number smallint,
    CONSTRAINT season_match_participants_slot_number_check CHECK (((slot_number >= 1) AND (slot_number <= 5))),
    CONSTRAINT season_match_participants_team_side_check CHECK ((team_side = ANY (ARRAY['a'::bpchar, 'b'::bpchar]))),
    CONSTRAINT season_match_participants_tier_snapshot_check CHECK (((tier_snapshot >= 0) AND (tier_snapshot <= 20)))
);

CREATE TABLE public.season_match_substitutions (
    id bigint NOT NULL,
    match_id bigint NOT NULL,
    game_id bigint,
    outgoing_player_id bigint NOT NULL,
    incoming_player_id bigint NOT NULL,
    team_side character(1) NOT NULL,
    technical_loss boolean DEFAULT true NOT NULL,
    note character varying(240),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    penalty_event_id bigint,
    penalty_fire_count smallint DEFAULT 0 NOT NULL,
    CONSTRAINT season_match_substitutions_check CHECK ((outgoing_player_id <> incoming_player_id)),
    CONSTRAINT season_match_substitutions_penalty_fire_count_check CHECK (((penalty_fire_count >= 0) AND (penalty_fire_count <= 100))),
    CONSTRAINT season_match_substitutions_team_side_check CHECK ((team_side = ANY (ARRAY['a'::bpchar, 'b'::bpchar])))
);

CREATE TABLE public.season_matches (
    id bigint NOT NULL,
    lobby_id bigint NOT NULL,
    scheduled_at timestamp with time zone,
    team_a_name character varying(120) DEFAULT 'Команда A'::character varying NOT NULL,
    team_b_name character varying(120) DEFAULT 'Команда B'::character varying NOT NULL,
    best_of smallint DEFAULT 2 NOT NULL,
    team_a_score smallint,
    team_b_score smallint,
    result character varying(16),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    host_player_id bigint,
    dota_lobby_password character varying(4),
    host_role_expires_at timestamp with time zone,
    CONSTRAINT season_matches_best_of_check CHECK ((best_of = ANY (ARRAY[1, 2, 3, 5]))),
    CONSTRAINT season_matches_check CHECK (((result IS NULL) OR ((team_a_score IS NOT NULL) AND (team_b_score IS NOT NULL) AND ((((result)::text = 'draw'::text) AND (team_a_score = team_b_score)) OR (((result)::text = 'team_a'::text) AND (team_a_score > team_b_score)) OR (((result)::text = 'team_b'::text) AND (team_b_score > team_a_score)))))),
    CONSTRAINT season_matches_check1 CHECK ((((status)::text <> 'completed'::text) OR ((result IS NOT NULL) AND (team_a_score IS NOT NULL) AND (team_b_score IS NOT NULL)))),
    CONSTRAINT season_matches_dota_lobby_password_check CHECK (((dota_lobby_password)::text ~ '^[0-9]{4}$'::text)),
    CONSTRAINT season_matches_result_check CHECK (((result)::text = ANY (ARRAY[('team_a'::character varying)::text, ('draw'::character varying)::text, ('team_b'::character varying)::text]))),
    CONSTRAINT season_matches_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('published'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT season_matches_team_a_score_check CHECK ((team_a_score >= 0)),
    CONSTRAINT season_matches_team_b_score_check CHECK ((team_b_score >= 0))
);

CREATE TABLE public.season_participants (
    tournament_id bigint NOT NULL,
    player_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    standings_section character varying(16) DEFAULT 'active'::character varying NOT NULL,
    inactive_reason character varying(240),
    nickname_snapshot character varying(100),
    rank_snapshot smallint,
    standings_snapshot jsonb,
    CONSTRAINT season_participants_rank_snapshot_check CHECK (((rank_snapshot >= 1) AND (rank_snapshot <= 500))),
    CONSTRAINT season_participants_standings_section_check CHECK (((standings_section)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text]))),
    CONSTRAINT season_participants_standings_snapshot_check CHECK (((standings_snapshot IS NULL) OR (jsonb_typeof(standings_snapshot) = 'object'::text)))
);

CREATE TABLE public.season_rounds (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    round_number smallint NOT NULL,
    name character varying(160),
    status character varying(20) DEFAULT 'planned'::character varying NOT NULL,
    scheduled_at timestamp with time zone,
    is_visible boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    round_kind character varying(16) DEFAULT 'regular'::character varying NOT NULL,
    lobby_configuration_status character varying(16) DEFAULT 'none'::character varying NOT NULL,
    discord_channel_id bigint,
    CONSTRAINT season_rounds_lobby_configuration_status_check CHECK (((lobby_configuration_status)::text = ANY (ARRAY[('none'::character varying)::text, ('editing'::character varying)::text, ('locked'::character varying)::text, ('published'::character varying)::text]))),
    CONSTRAINT season_rounds_round_kind_check CHECK (((round_kind)::text = ANY (ARRAY[('regular'::character varying)::text, ('finals'::character varying)::text]))),
    CONSTRAINT season_rounds_round_number_check CHECK (((round_number >= 1) AND (round_number <= 101))),
    CONSTRAINT season_rounds_status_check CHECK (((status)::text = ANY (ARRAY[('planned'::character varying)::text, ('active'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])))
);

CREATE TABLE public.tournament_group_teams (
    group_id bigint NOT NULL,
    application_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.tournament_groups (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    name character varying(80) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    explanation text,
    team_capacity smallint DEFAULT 4 NOT NULL,
    advance_to_playoff smallint DEFAULT 2 NOT NULL,
    advance_to_upper smallint DEFAULT 1 NOT NULL,
    advance_to_lower smallint DEFAULT 1 NOT NULL,
    CONSTRAINT tournament_groups_advance_to_lower_check CHECK (((advance_to_lower >= 0) AND (advance_to_lower <= 8))),
    CONSTRAINT tournament_groups_advance_to_playoff_check CHECK (((advance_to_playoff >= 0) AND (advance_to_playoff <= 8))),
    CONSTRAINT tournament_groups_advance_to_upper_check CHECK (((advance_to_upper >= 0) AND (advance_to_upper <= 8))),
    CONSTRAINT tournament_groups_team_capacity_check CHECK (((team_capacity >= 3) AND (team_capacity <= 8)))
);

CREATE TABLE public.tournament_matches (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    group_id bigint,
    scheduled_at timestamp with time zone,
    stage character varying(100) NOT NULL,
    team_a_application_id bigint,
    team_b_application_id bigint,
    team_a_placeholder character varying(100),
    team_b_placeholder character varying(100),
    team_a_score smallint,
    team_b_score smallint,
    best_of smallint NOT NULL,
    status character varying(20) DEFAULT 'scheduled'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    result_type character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    team_a_result_label character varying(20),
    team_b_result_label character varying(20),
    decision_note text,
    bracket_round smallint,
    bracket_side character varying(20),
    bracket_slot smallint,
    winner_to_match_id bigint,
    winner_to_slot character(1),
    loser_to_match_id bigint,
    loser_to_slot character(1),
    bracket_grid_column smallint,
    bracket_grid_row smallint,
    eliminated_team_application_id bigint,
    stage_detail character varying(100),
    CONSTRAINT tournament_matches_best_of_check CHECK ((best_of = ANY (ARRAY[1, 2, 3, 5]))),
    CONSTRAINT tournament_matches_bracket_grid_column_check CHECK (((bracket_grid_column >= 0) AND (bracket_grid_column <= 100))),
    CONSTRAINT tournament_matches_bracket_grid_row_check CHECK (((bracket_grid_row >= 0) AND (bracket_grid_row <= 100))),
    CONSTRAINT tournament_matches_bracket_side_check CHECK (((bracket_side)::text = ANY (ARRAY[('group'::character varying)::text, ('upper'::character varying)::text, ('lower'::character varying)::text, ('grand_final'::character varying)::text]))),
    CONSTRAINT tournament_matches_check CHECK (((team_a_application_id IS NOT NULL) OR (team_a_placeholder IS NOT NULL))),
    CONSTRAINT tournament_matches_check1 CHECK (((team_b_application_id IS NOT NULL) OR (team_b_placeholder IS NOT NULL))),
    CONSTRAINT tournament_matches_loser_to_slot_check CHECK ((loser_to_slot = ANY (ARRAY['a'::bpchar, 'b'::bpchar]))),
    CONSTRAINT tournament_matches_result_type_check CHECK (((result_type)::text = ANY (ARRAY[('normal'::character varying)::text, ('technical'::character varying)::text, ('forfeit'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT tournament_matches_status_check CHECK (((status)::text = ANY (ARRAY[('scheduled'::character varying)::text, ('ready'::character varying)::text, ('live'::character varying)::text, ('finished'::character varying)::text, ('cancelled'::character varying)::text]))),
    CONSTRAINT tournament_matches_winner_to_slot_check CHECK ((winner_to_slot = ANY (ARRAY['a'::bpchar, 'b'::bpchar])))
);

CREATE TABLE public.tournament_prizes (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    placement smallint NOT NULL,
    application_id bigint,
    team_name_snapshot character varying(100),
    prize_text text,
    CONSTRAINT tournament_prizes_placement_check CHECK (((placement >= 1) AND (placement <= 64)))
);

CREATE TABLE public.tournament_roster_snapshots (
    id bigint NOT NULL,
    application_id bigint NOT NULL,
    player_id bigint,
    nickname_snapshot character varying(100) NOT NULL,
    role character varying(24) NOT NULL,
    tier_snapshot smallint,
    is_captain boolean DEFAULT false NOT NULL,
    sort_order smallint DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tournament_roster_snapshots_role_check CHECK (((role)::text = ANY (ARRAY[('safe_lane'::character varying)::text, ('mid_lane'::character varying)::text, ('off_lane'::character varying)::text, ('soft_support'::character varying)::text, ('hard_support'::character varying)::text, ('coach'::character varying)::text]))),
    CONSTRAINT tournament_roster_snapshots_tier_snapshot_check CHECK (((tier_snapshot >= 0) AND (tier_snapshot <= 20)))
);

CREATE TABLE public.tournament_rules (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    rule_text text NOT NULL
);

CREATE TABLE public.tournament_schedule_days (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    day_date date NOT NULL,
    title character varying(100),
    sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE public.tournament_schedule_entries (
    id bigint NOT NULL,
    day_id bigint NOT NULL,
    start_time time without time zone NOT NULL,
    stage_name character varying(160) NOT NULL,
    match_count smallint NOT NULL,
    series_format character varying(40) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT tournament_schedule_entries_match_count_check CHECK (((match_count >= 1) AND (match_count <= 64)))
);

CREATE TABLE public.tournament_team_applications (
    id bigint NOT NULL,
    tournament_id bigint NOT NULL,
    team_name character varying(80) NOT NULL,
    tag character varying(5) NOT NULL,
    captain_discord_id bigint,
    contact character varying(100) NOT NULL,
    logo_key character varying(80) NOT NULL,
    status character varying(24) DEFAULT 'awaiting_members'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    selection_method character varying(80) DEFAULT 'Регистрация'::character varying NOT NULL,
    captain_name_snapshot character varying(100),
    team_tier_total_snapshot smallint,
    CONSTRAINT tournament_team_applications_status_check CHECK (((status)::text = ANY (ARRAY[('awaiting_members'::character varying)::text, ('pending'::character varying)::text, ('approved'::character varying)::text, ('declined'::character varying)::text, ('withdrawn'::character varying)::text]))),
    CONSTRAINT tournament_team_applications_team_tier_total_snapshot_check CHECK (((team_tier_total_snapshot >= 0) AND (team_tier_total_snapshot <= 100)))
);

CREATE TABLE public.tournament_team_members (
    application_id bigint NOT NULL,
    player_id bigint NOT NULL,
    role character varying(24) NOT NULL,
    is_captain boolean DEFAULT false NOT NULL,
    invitation_status character varying(16) DEFAULT 'invited'::character varying NOT NULL,
    responded_at timestamp with time zone,
    nickname_snapshot character varying(100) NOT NULL,
    tier_snapshot smallint,
    CONSTRAINT tournament_team_members_invitation_status_check CHECK (((invitation_status)::text = ANY (ARRAY[('invited'::character varying)::text, ('accepted'::character varying)::text, ('declined'::character varying)::text]))),
    CONSTRAINT tournament_team_members_role_check CHECK (((role)::text = ANY (ARRAY[('safe_lane'::character varying)::text, ('mid_lane'::character varying)::text, ('off_lane'::character varying)::text, ('soft_support'::character varying)::text, ('hard_support'::character varying)::text]))),
    CONSTRAINT tournament_team_members_tier_snapshot_check CHECK (((tier_snapshot >= 0) AND (tier_snapshot <= 12)))
);

CREATE TABLE public.tournament_team_results (
    application_id bigint NOT NULL,
    placement smallint,
    result_label character varying(120),
    updated_by bigint,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tournament_team_results_check CHECK (((placement IS NOT NULL) OR (NULLIF(btrim((result_label)::text), ''::text) IS NOT NULL))),
    CONSTRAINT tournament_team_results_placement_check CHECK (((placement >= 1) AND (placement <= 64)))
);

CREATE TABLE public.tournaments (
    id bigint NOT NULL,
    slug character varying(120) NOT NULL,
    name character varying(160) NOT NULL,
    eyebrow character varying(200) NOT NULL,
    headline character varying(200) NOT NULL,
    headline_accent character varying(200) NOT NULL,
    description text NOT NULL,
    about text NOT NULL,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone NOT NULL,
    registration_deadline timestamp with time zone NOT NULL,
    status_label character varying(100) NOT NULL,
    format character varying(100) NOT NULL,
    team_size smallint NOT NULL,
    max_teams smallint NOT NULL,
    region character varying(100) NOT NULL,
    server character varying(100) NOT NULL,
    check_in_minutes smallint NOT NULL,
    group_format character varying(200) NOT NULL,
    playoff_format character varying(200) NOT NULL,
    final_format character varying(200) NOT NULL,
    discord_url text NOT NULL,
    status character varying(24) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    playoff_type character varying(24) DEFAULT 'double_elimination'::character varying NOT NULL,
    tournament_type character varying(16) DEFAULT 'ordinary'::character varying NOT NULL,
    season_round_count smallint DEFAULT 0 NOT NULL,
    season_activity_points_note text,
    max_team_tier smallint,
    show_tiers boolean DEFAULT false NOT NULL,
    ordinary_match_rooms_enabled boolean DEFAULT true NOT NULL,
    registration_starts_at timestamp with time zone,
    playoff_starts_on date,
    CONSTRAINT tournament_dates_valid CHECK (((registration_deadline <= start_at) AND (start_at < end_at))),
    CONSTRAINT tournaments_check_in_minutes_check CHECK (((check_in_minutes >= 5) AND (check_in_minutes <= 180))),
    CONSTRAINT tournaments_max_team_tier_check CHECK (((max_team_tier >= 1) AND (max_team_tier <= 100))),
    CONSTRAINT tournaments_max_teams_check CHECK (((max_teams >= 2) AND (max_teams <= 64))),
    CONSTRAINT tournaments_playoff_type_check CHECK (((playoff_type)::text = ANY (ARRAY[('single_elimination'::character varying)::text, ('double_elimination'::character varying)::text]))),
    CONSTRAINT tournaments_registration_start_before_deadline_check CHECK (((registration_starts_at IS NULL) OR (registration_starts_at < registration_deadline))),
    CONSTRAINT tournaments_season_round_count_by_type_check CHECK (((((tournament_type)::text = ANY (ARRAY[('ordinary'::character varying)::text, ('seasonal_cup'::character varying)::text])) AND (season_round_count = 0)) OR (((tournament_type)::text = 'seasonal'::text) AND ((season_round_count >= 1) AND (season_round_count <= 100))))),
    CONSTRAINT tournaments_season_round_count_check CHECK (((season_round_count >= 0) AND (season_round_count <= 100))),
    CONSTRAINT tournaments_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('planned'::character varying)::text, ('registration'::character varying)::text, ('active'::character varying)::text, ('finished'::character varying)::text, ('archived'::character varying)::text]))),
    CONSTRAINT tournaments_team_size_check CHECK (((team_size >= 1) AND (team_size <= 10))),
    CONSTRAINT tournaments_tournament_type_check CHECK (((tournament_type)::text = ANY (ARRAY[('ordinary'::character varying)::text, ('seasonal'::character varying)::text, ('seasonal_cup'::character varying)::text])))
);

CREATE SEQUENCE public.archived_player_steam_id_seq
    START WITH -9223372036854775807
    INCREMENT BY 1
    MINVALUE -9223372036854775807
    MAXVALUE -1
    CACHE 1;

CREATE SEQUENCE public.player_identities_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.player_nickname_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.season_lobbies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.season_match_games_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.season_match_substitutions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.season_matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.season_rounds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_matches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_prizes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_roster_snapshots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_rules_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_schedule_days_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_schedule_entries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournament_team_applications_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

CREATE SEQUENCE public.tournaments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.player_identities ALTER COLUMN id SET DEFAULT nextval('public.player_identities_id_seq'::regclass);

ALTER TABLE ONLY public.player_nickname_history ALTER COLUMN id SET DEFAULT nextval('public.player_nickname_history_id_seq'::regclass);

ALTER TABLE ONLY public.season_lobbies ALTER COLUMN id SET DEFAULT nextval('public.season_lobbies_id_seq'::regclass);

ALTER TABLE ONLY public.season_match_games ALTER COLUMN id SET DEFAULT nextval('public.season_match_games_id_seq'::regclass);

ALTER TABLE ONLY public.season_match_substitutions ALTER COLUMN id SET DEFAULT nextval('public.season_match_substitutions_id_seq'::regclass);

ALTER TABLE ONLY public.season_matches ALTER COLUMN id SET DEFAULT nextval('public.season_matches_id_seq'::regclass);

ALTER TABLE ONLY public.season_rounds ALTER COLUMN id SET DEFAULT nextval('public.season_rounds_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_groups ALTER COLUMN id SET DEFAULT nextval('public.tournament_groups_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_matches ALTER COLUMN id SET DEFAULT nextval('public.tournament_matches_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_prizes ALTER COLUMN id SET DEFAULT nextval('public.tournament_prizes_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_roster_snapshots ALTER COLUMN id SET DEFAULT nextval('public.tournament_roster_snapshots_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_rules ALTER COLUMN id SET DEFAULT nextval('public.tournament_rules_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_schedule_days ALTER COLUMN id SET DEFAULT nextval('public.tournament_schedule_days_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_schedule_entries ALTER COLUMN id SET DEFAULT nextval('public.tournament_schedule_entries_id_seq'::regclass);

ALTER TABLE ONLY public.tournament_team_applications ALTER COLUMN id SET DEFAULT nextval('public.tournament_team_applications_id_seq'::regclass);

ALTER TABLE ONLY public.tournaments ALTER COLUMN id SET DEFAULT nextval('public.tournaments_id_seq'::regclass);

ALTER TABLE ONLY public.player_identities
    ADD CONSTRAINT player_identities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.player_identities
    ADD CONSTRAINT player_identities_registered_player_id_key UNIQUE (registered_player_id);

ALTER TABLE ONLY public.player_identity_members
    ADD CONSTRAINT player_identity_members_pkey PRIMARY KEY (player_id);

ALTER TABLE ONLY public.player_nickname_history
    ADD CONSTRAINT player_nickname_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.player_nickname_history
    ADD CONSTRAINT player_nickname_history_player_id_nickname_key_key UNIQUE (player_id, nickname_key);

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (discord_id);

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_steam_id32_key UNIQUE (steam_id32);

ALTER TABLE ONLY public.season_lobbies
    ADD CONSTRAINT season_lobbies_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.season_lobbies
    ADD CONSTRAINT season_lobbies_round_id_sort_order_key UNIQUE (round_id, sort_order);

ALTER TABLE ONLY public.season_match_games
    ADD CONSTRAINT season_match_games_match_id_game_number_key UNIQUE (match_id, game_number);

ALTER TABLE ONLY public.season_match_games
    ADD CONSTRAINT season_match_games_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.season_match_participants
    ADD CONSTRAINT season_match_participants_pkey PRIMARY KEY (match_id, player_id);

ALTER TABLE ONLY public.season_match_substitutions
    ADD CONSTRAINT season_match_substitutions_match_id_game_id_outgoing_player_key UNIQUE (match_id, game_id, outgoing_player_id, incoming_player_id);

ALTER TABLE ONLY public.season_match_substitutions
    ADD CONSTRAINT season_match_substitutions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.season_matches
    ADD CONSTRAINT season_matches_lobby_id_sort_order_key UNIQUE (lobby_id, sort_order);

ALTER TABLE ONLY public.season_matches
    ADD CONSTRAINT season_matches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.season_participants
    ADD CONSTRAINT season_participants_pkey PRIMARY KEY (tournament_id, player_id);

ALTER TABLE ONLY public.season_rounds
    ADD CONSTRAINT season_rounds_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.season_rounds
    ADD CONSTRAINT season_rounds_tournament_id_round_number_key UNIQUE (tournament_id, round_number);

ALTER TABLE ONLY public.tournament_group_teams
    ADD CONSTRAINT tournament_group_teams_application_id_key UNIQUE (application_id);

ALTER TABLE ONLY public.tournament_group_teams
    ADD CONSTRAINT tournament_group_teams_pkey PRIMARY KEY (group_id, application_id);

ALTER TABLE ONLY public.tournament_groups
    ADD CONSTRAINT tournament_groups_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_prizes
    ADD CONSTRAINT tournament_prizes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_prizes
    ADD CONSTRAINT tournament_prizes_tournament_id_placement_key UNIQUE (tournament_id, placement);

ALTER TABLE ONLY public.tournament_roster_snapshots
    ADD CONSTRAINT tournament_roster_snapshots_application_id_role_key UNIQUE (application_id, role);

ALTER TABLE ONLY public.tournament_roster_snapshots
    ADD CONSTRAINT tournament_roster_snapshots_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_rules
    ADD CONSTRAINT tournament_rules_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_rules
    ADD CONSTRAINT tournament_rules_tournament_id_sort_order_key UNIQUE (tournament_id, sort_order);

ALTER TABLE ONLY public.tournament_schedule_days
    ADD CONSTRAINT tournament_schedule_days_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_schedule_days
    ADD CONSTRAINT tournament_schedule_days_tournament_id_sort_order_key UNIQUE (tournament_id, sort_order);

ALTER TABLE ONLY public.tournament_schedule_entries
    ADD CONSTRAINT tournament_schedule_entries_day_id_sort_order_key UNIQUE (day_id, sort_order);

ALTER TABLE ONLY public.tournament_schedule_entries
    ADD CONSTRAINT tournament_schedule_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_team_applications
    ADD CONSTRAINT tournament_team_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournament_team_applications
    ADD CONSTRAINT tournament_team_applications_tournament_id_tag_key UNIQUE (tournament_id, tag);

ALTER TABLE ONLY public.tournament_team_applications
    ADD CONSTRAINT tournament_team_applications_tournament_id_team_name_key UNIQUE (tournament_id, team_name);

ALTER TABLE ONLY public.tournament_team_members
    ADD CONSTRAINT tournament_team_members_application_id_role_key UNIQUE (application_id, role);

ALTER TABLE ONLY public.tournament_team_members
    ADD CONSTRAINT tournament_team_members_pkey PRIMARY KEY (application_id, player_id);

ALTER TABLE ONLY public.tournament_team_results
    ADD CONSTRAINT tournament_team_results_pkey PRIMARY KEY (application_id);

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_slug_key UNIQUE (slug);

ALTER TABLE ONLY public.player_identities
    ADD CONSTRAINT player_identities_registered_player_id_fkey FOREIGN KEY (registered_player_id) REFERENCES public.players(discord_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.player_identity_members
    ADD CONSTRAINT player_identity_members_identity_id_fkey FOREIGN KEY (identity_id) REFERENCES public.player_identities(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.player_identity_members
    ADD CONSTRAINT player_identity_members_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(discord_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.player_nickname_history
    ADD CONSTRAINT player_nickname_history_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(discord_id) ON DELETE CASCADE;

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_archived_by_fkey FOREIGN KEY (archived_by) REFERENCES public.players(discord_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.season_lobbies
    ADD CONSTRAINT season_lobbies_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.season_rounds(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.season_match_games
    ADD CONSTRAINT season_match_games_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.season_matches(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.season_match_participants
    ADD CONSTRAINT season_match_participants_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.season_matches(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.season_match_participants
    ADD CONSTRAINT season_match_participants_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(discord_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.season_match_substitutions
    ADD CONSTRAINT season_match_substitutions_game_id_fkey FOREIGN KEY (game_id) REFERENCES public.season_match_games(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.season_match_substitutions
    ADD CONSTRAINT season_match_substitutions_incoming_player_id_fkey FOREIGN KEY (incoming_player_id) REFERENCES public.players(discord_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.season_match_substitutions
    ADD CONSTRAINT season_match_substitutions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.season_matches(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.season_match_substitutions
    ADD CONSTRAINT season_match_substitutions_outgoing_player_id_fkey FOREIGN KEY (outgoing_player_id) REFERENCES public.players(discord_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.season_matches
    ADD CONSTRAINT season_matches_host_player_id_fkey FOREIGN KEY (host_player_id) REFERENCES public.players(discord_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.season_matches
    ADD CONSTRAINT season_matches_lobby_id_fkey FOREIGN KEY (lobby_id) REFERENCES public.season_lobbies(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.season_participants
    ADD CONSTRAINT season_participants_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(discord_id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.season_participants
    ADD CONSTRAINT season_participants_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.season_rounds
    ADD CONSTRAINT season_rounds_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_group_teams
    ADD CONSTRAINT tournament_group_teams_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tournament_team_applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_group_teams
    ADD CONSTRAINT tournament_group_teams_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.tournament_groups(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_groups
    ADD CONSTRAINT tournament_groups_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_eliminated_team_application_id_fkey FOREIGN KEY (eliminated_team_application_id) REFERENCES public.tournament_team_applications(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.tournament_groups(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_loser_to_match_id_fkey FOREIGN KEY (loser_to_match_id) REFERENCES public.tournament_matches(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_team_a_application_id_fkey FOREIGN KEY (team_a_application_id) REFERENCES public.tournament_team_applications(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_team_b_application_id_fkey FOREIGN KEY (team_b_application_id) REFERENCES public.tournament_team_applications(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_matches
    ADD CONSTRAINT tournament_matches_winner_to_match_id_fkey FOREIGN KEY (winner_to_match_id) REFERENCES public.tournament_matches(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_prizes
    ADD CONSTRAINT tournament_prizes_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tournament_team_applications(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_prizes
    ADD CONSTRAINT tournament_prizes_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_roster_snapshots
    ADD CONSTRAINT tournament_roster_snapshots_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tournament_team_applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_roster_snapshots
    ADD CONSTRAINT tournament_roster_snapshots_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(discord_id) ON DELETE SET NULL;

ALTER TABLE ONLY public.tournament_rules
    ADD CONSTRAINT tournament_rules_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_schedule_days
    ADD CONSTRAINT tournament_schedule_days_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_schedule_entries
    ADD CONSTRAINT tournament_schedule_entries_day_id_fkey FOREIGN KEY (day_id) REFERENCES public.tournament_schedule_days(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_team_applications
    ADD CONSTRAINT tournament_team_applications_captain_discord_id_fkey FOREIGN KEY (captain_discord_id) REFERENCES public.players(discord_id);

ALTER TABLE ONLY public.tournament_team_applications
    ADD CONSTRAINT tournament_team_applications_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_team_members
    ADD CONSTRAINT tournament_team_members_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tournament_team_applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_team_members
    ADD CONSTRAINT tournament_team_members_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(discord_id);

ALTER TABLE ONLY public.tournament_team_results
    ADD CONSTRAINT tournament_team_results_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.tournament_team_applications(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.tournament_team_results
    ADD CONSTRAINT tournament_team_results_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.players(discord_id) ON DELETE SET NULL;

CREATE FUNCTION public.create_player_identity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    identity_id_value BIGINT;
BEGIN
    INSERT INTO player_identities(primary_nickname, registered_player_id)
    VALUES (
        NEW.ingame_name,
        CASE WHEN NEW.is_archived THEN NULL ELSE NEW.discord_id END
    )
    RETURNING id INTO identity_id_value;

    INSERT INTO player_identity_members(
        identity_id,
        player_id,
        nickname_snapshot
    )
    VALUES (identity_id_value, NEW.discord_id, NEW.ingame_name);
    RETURN NEW;
END
$$;

CREATE TRIGGER players_create_identity_trigger AFTER INSERT ON public.players FOR EACH ROW EXECUTE FUNCTION public.create_player_identity();

CREATE UNIQUE INDEX season_match_participants_slot_idx ON public.season_match_participants USING btree (match_id, team_side, slot_number) WHERE (slot_number IS NOT NULL);

CREATE UNIQUE INDEX season_match_substitutions_match_level_idx ON public.season_match_substitutions USING btree (match_id, outgoing_player_id, incoming_player_id) WHERE (game_id IS NULL);

CREATE UNIQUE INDEX season_rounds_discord_channel_unique ON public.season_rounds USING btree (discord_channel_id) WHERE (discord_channel_id IS NOT NULL);

CREATE UNIQUE INDEX season_rounds_one_finals_idx ON public.season_rounds USING btree (tournament_id) WHERE ((round_kind)::text = 'finals'::text);

CREATE UNIQUE INDEX tournament_groups_nonempty_name_key ON public.tournament_groups USING btree (tournament_id, name) WHERE (btrim((name)::text) <> ''::text);

CREATE TABLE public.tournament_audit_log (
    id bigint NOT NULL,
    tournament_id bigint,
    actor_discord_id bigint,
    action character varying(100) NOT NULL,
    entity_type character varying(80) NOT NULL,
    entity_id character varying(80),
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE SEQUENCE public.tournament_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE ONLY public.tournament_audit_log ALTER COLUMN id SET DEFAULT nextval('public.tournament_audit_log_id_seq'::regclass);
