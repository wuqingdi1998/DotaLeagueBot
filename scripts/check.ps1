$ErrorActionPreference = "Stop"
$Python = (Resolve-Path "$PSScriptRoot\..\.venv\Scripts\python.exe").Path

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,

        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$ArgumentList
    )

    & $FilePath @ArgumentList
    if ($LASTEXITCODE -ne 0) {
        throw "Command '$FilePath $($ArgumentList -join ' ')' failed with exit code $LASTEXITCODE."
    }
}

Push-Location "$PSScriptRoot\..\bot"
try {
    Invoke-CheckedCommand $Python -m ruff check .
    Invoke-CheckedCommand $Python -m pip_audit -r requirements.txt
    Invoke-CheckedCommand $Python -m compileall -q .
    Invoke-CheckedCommand $Python -m mypy database/core.py database/migrate.py cogs/channel_announcements.py cogs/website_bridge.py cogs/fearless_draft_deadlines.py cogs/season_lobby_deadlines.py cogs/season_lobby_notifications.py cogs/season_nine_outreach.py cogs/titan_checkup.py services/durable_scheduler.py services/season_round_channel_sync.py services/season_lobby_notifications.py services/season_nine_outreach.py services/titan_checkup_service.py utils/website_notifications.py
    Invoke-CheckedCommand $Python -m pytest --cov=. --cov-report=term-missing
}
finally {
    Pop-Location
}

Push-Location "$PSScriptRoot\..\site"
try {
    Invoke-CheckedCommand npm run lint
    Invoke-CheckedCommand npm run typecheck
    Invoke-CheckedCommand npm run test
    Invoke-CheckedCommand npm run build
}
finally {
    Pop-Location
}

Invoke-CheckedCommand docker compose config --quiet --no-env-resolution
