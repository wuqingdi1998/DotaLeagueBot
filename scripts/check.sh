#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="$ROOT/.venv/bin/python"

cd "$ROOT/bot"
"$PYTHON" -m ruff check .
"$PYTHON" -m pip_audit -r requirements.txt
"$PYTHON" -m compileall -q .
"$PYTHON" -m mypy database/core.py database/migrate.py cogs/channel_announcements.py cogs/ordinary_tournament_team_channels.py cogs/subscription_admin.py cogs/website_bridge.py cogs/fearless_draft_deadlines.py cogs/season_lobby_deadlines.py cogs/season_lobby_notifications.py cogs/season_nine_outreach.py cogs/titan_checkup.py services/durable_scheduler.py services/ordinary_tournament_team_channels.py services/ordinary_tournament_team_channel_sync.py services/season_round_channel_sync.py services/season_lobby_notifications.py services/season_nine_outreach.py services/subscription_role_grants.py services/titan_checkup_service.py utils/website_notifications.py
"$PYTHON" -m pytest --cov=. --cov-report=term-missing

cd ../site
npm run lint
npm run typecheck
npm run test
npm run build

cd ..
docker compose config --quiet
