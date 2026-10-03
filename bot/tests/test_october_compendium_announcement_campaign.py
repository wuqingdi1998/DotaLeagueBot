from pathlib import Path


ROOT = Path(__file__).parents[2]
MIGRATION = (
    ROOT
    / "bot"
    / "database"
    / "migrations"
    / "0162_schedule_october_compendium_announcement.sql"
).read_text(encoding="utf-8")
SERVICE = (
    ROOT
    / "bot"
    / "services"
    / "october_compendium_announcement_campaign.py"
).read_text(encoding="utf-8")
COG = (
    ROOT / "bot" / "cogs" / "october_compendium_announcement.py"
).read_text(encoding="utf-8")
DEPLOYMENT = (
    ROOT / ".github" / "workflows" / "deploy.yml"
).read_text(encoding="utf-8")


def test_campaign_is_scheduled_for_the_public_launch() -> None:
    assert "2026-10-03 22:30:00+03" in MIGRATION
    assert "october-compendium-launch" in MIGRATION


def test_campaign_is_durable_and_excludes_bots_and_massovka() -> None:
    assert "is_compendium_announcement_recipient(member)" in SERVICE
    assert "member.bot" in SERVICE
    assert "ON CONFLICT (campaign_id, discord_id) DO NOTHING" in SERVICE
    assert "discord_message_id" in SERVICE
    assert "register_scheduled_job(bot, cog)" in COG
    assert "october_compendium_announcement_campaigns" in DEPLOYMENT
