from pathlib import Path


ROOT = Path(__file__).parents[1]
MIGRATION = (
    ROOT / "database" / "migrations" / "0037_titan_checkup.sql"
).read_text(encoding="utf-8")
COG = (ROOT / "cogs" / "titan_checkup.py").read_text(encoding="utf-8")
SERVICE = (ROOT / "services" / "titan_checkup_service.py").read_text(
    encoding="utf-8"
)
VIEW = (ROOT / "cogs" / "ui" / "titan_checkup.py").read_text(encoding="utf-8")
PROFILE = (ROOT / "cogs" / "profile.py").read_text(encoding="utf-8")
REGISTRATION = (ROOT / "services" / "player_registration.py").read_text(
    encoding="utf-8"
)


def test_tier_status_and_checkup_requests_are_persistent() -> None:
    assert "ADD COLUMN IF NOT EXISTS tier_status" in MIGRATION
    assert "'current', 'outdated', 'inactive'" in MIGRATION
    assert "CREATE TABLE IF NOT EXISTS titan_checkup_requests" in MIGRATION
    assert "expires_at" in MIGRATION
    assert "dm_message_id" in MIGRATION


def test_titan_commands_are_restricted_and_hidden_by_default() -> None:
    assert "FROKENG_DISCORD_ID = 311247030422863882" in COG
    assert COG.count("@app_commands.default_permissions()") == 2
    assert 'name="titan_checkup"' in COG
    assert 'name="inactive_off"' in COG
    assert "interaction.user.id != FROKENG_DISCORD_ID" in COG
    assert "inactive_player_choices" in COG


def test_checkup_targets_titans_and_preserves_inactive_opt_outs() -> None:
    assert "effective_tier >= 8" in SERVICE
    assert "tier_status <> 'inactive'" in SERVICE
    assert "tier_status = 'outdated'" in SERVICE
    assert "tier_status = 'inactive'" in SERVICE
    assert "tier_status = 'current'" in SERVICE


def test_ready_flow_accepts_only_images_for_five_minutes() -> None:
    assert 'label="Готов"' in VIEW
    assert 'label="Позже"' in VIEW
    assert 'label="Инактив"' in VIEW
    assert "CHECKUP_TIMEOUT_SECONDS = 300" in COG
    assert "attachment.content_type" in COG
    assert "content_type.startswith(\"image/\")" in COG
    assert "1533127829066092715" in COG


def test_ignored_checkup_becomes_later_after_twenty_four_hours() -> None:
    assert "CHECKUP_RESPONSE_TIMEOUT_SECONDS = 24 * 60 * 60" in COG
    assert 'IGNORED_MESSAGE = "Актуализация не пройдена!"' in COG
    assert "requests_awaiting_response" in SERVICE
    assert "expire_ignored_request" in SERVICE
    assert "request.status = 'sent'" in SERVICE
    assert "SET status = 'later'" in SERVICE


def test_new_titan_receives_the_same_checkup_without_bulk_delivery() -> None:
    assert "initial_registration_tier_status(rank_tier)" in REGISTRATION
    assert 'if new_p.tier_status == "outdated":' in PROFILE
    assert "send_checkup_to_player" in PROFILE
    assert "recipients()" not in PROFILE
    assert "if await self.send_checkup_to_player(recipient)" in COG
    assert "CHECKUP_MESSAGE, view=TitanCheckupView()" in COG
