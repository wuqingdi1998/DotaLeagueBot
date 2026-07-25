$ErrorActionPreference = "Stop"
$Python = (Resolve-Path "$PSScriptRoot\..\.venv\Scripts\python.exe").Path

Push-Location "$PSScriptRoot\..\bot"
try {
    & $Python -m ruff check .
    & $Python -m pip_audit -r requirements.txt
    & $Python -m compileall -q .
    & $Python -m mypy database/core.py database/migrate.py cogs/website_bridge.py utils/website_notifications.py
    & $Python -m pytest --cov=. --cov-report=term-missing
}
finally {
    Pop-Location
}

Push-Location "$PSScriptRoot\..\site"
try {
    npm run lint
    npm run typecheck
    npm run test
    npm run build
}
finally {
    Pop-Location
}

docker compose config --quiet
