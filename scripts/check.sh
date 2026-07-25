#!/usr/bin/env sh
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PYTHON="$ROOT/.venv/bin/python"

cd "$ROOT/bot"
"$PYTHON" -m ruff check .
"$PYTHON" -m pip_audit -r requirements.txt
"$PYTHON" -m compileall -q .
"$PYTHON" -m mypy database/core.py database/migrate.py cogs/website_bridge.py utils/website_notifications.py
"$PYTHON" -m pytest --cov=. --cov-report=term-missing

cd ../site
npm run lint
npm run typecheck
npm run test
npm run build

cd ..
docker compose config --quiet
