from unittest.mock import AsyncMock, MagicMock

import discord
import pytest

from services import compendium_match_audit as service
from services.compendium_match_audit_model import (
    AUDIT_CHANNEL_ID, audit_message, match_region, validated_match_details,
)


def details(cluster=181, region=8):
    return {"match_id": 9001, "cluster": cluster, "region": region, "players": [
        {"account_id": 101, "player_slot": 0},
        {"account_id": 202, "player_slot": 1},
        {"account_id": 303, "player_slot": 128},
        {"account_id": None, "player_slot": 129},
    ]}


def audit():
    return {"id": 1, "player_id": 100, "match_id": 9001,
            "player_name": "Игрок @everyone", "dota_id": "101", "attempts": 0,
            "source": "star_race_progress", "match_details": None,
            "clan_mates": [{"player_id": "200", "dota_id": "202", "name": "Союзник"},
                           {"player_id": "300", "dota_id": "303", "name": "Соперник"},
                           {"player_id": "400", "dota_id": "404", "name": "Отсутствует"}]}


@pytest.mark.parametrize("cluster", range(181, 189))
def test_stockholm_clusters(cluster):
    assert match_region(details(cluster)) == 8


def test_cluster_189_is_warsaw_even_if_region_field_disagrees():
    assert match_region(details(189, 8)) == 28
    assert match_region(details(131, 8)) == 3
    assert match_region(details(999, 9)) == 9
    assert match_region(details(999, 0)) is None


@pytest.mark.parametrize("payload", [None, {}, {"match_id": 7}, details(999, 0)])
def test_unknown_server_or_wrong_match_is_retried_not_silently_accepted(payload):
    with pytest.raises(ValueError):
        validated_match_details(payload, 9001)


def test_report_includes_player_server_link_and_clan_mates_on_both_sides():
    message = audit_message(audit(), details(189, 28)).to_dict()
    assert "Игрок" in message["description"]
    assert "https://www.opendota.com/matches/9001" in message["description"]
    assert "WARSAW" in message["description"]
    clan_text = message["fields"][0]["value"]
    assert "Союзник" in clan_text and "Radiant" in clan_text
    assert "Соперник" in clan_text and "Dire" in clan_text
    assert "Отсутствует" not in clan_text
    assert "скрытые аккаунты" in clan_text


class Session:
    def __init__(self, rows):
        self.rows = iter(rows)
        self.statements = []

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return None

    def begin(self):
        return self

    async def execute(self, statement, values=None):
        sql = str(statement)
        self.statements.append((sql, values))
        result = MagicMock()
        if "SELECT *" in sql:
            result.mappings.return_value.first.return_value = next(self.rows, None)
        return result


@pytest.mark.asyncio
@pytest.mark.parametrize("cluster,expected_status", [(181, "stockholm"), (189, "sent")])
async def test_worker_only_sends_non_stockholm_and_completes_audit(monkeypatch, cluster, expected_status):
    session = Session([audit()])
    monkeypatch.setattr(service, "audit_session", lambda: session)
    fetch = AsyncMock(return_value=details(cluster))
    monkeypatch.setattr(service, "fetch_match_details", fetch)
    bot = MagicMock()
    channel = MagicMock(spec=discord.TextChannel)
    channel.send = AsyncMock(return_value=MagicMock(id=123))
    bot.get_channel.return_value = channel
    await service.process_match_audits(bot)
    statuses = [values["status"] for _, values in session.statements if values and "status" in values]
    assert statuses == [expected_status]
    assert channel.send.await_count == (expected_status == "sent")
    if expected_status == "sent":
        bot.get_channel.assert_called_once_with(AUDIT_CHANNEL_ID)
        assert channel.send.call_args.kwargs["allowed_mentions"].everyone is False


@pytest.mark.asyncio
@pytest.mark.parametrize("failure", ["opendota", "discord"])
async def test_failed_checks_or_delivery_remain_queued_for_retry(monkeypatch, failure):
    session = Session([audit()])
    monkeypatch.setattr(service, "audit_session", lambda: session)
    fetch = AsyncMock(return_value=details(189))
    if failure == "opendota":
        fetch.side_effect = ValueError("region missing")
    monkeypatch.setattr(service, "fetch_match_details", fetch)
    bot = MagicMock()
    bot.get_channel.return_value = None
    bot.fetch_channel = AsyncMock(side_effect=RuntimeError("channel unavailable"))
    await service.process_match_audits(bot)
    assert any("next_attempt_at = NOW()" in sql for sql, _ in session.statements)
    assert not any(values and "status" in values for _, values in session.statements)
    assert any("match_details =" in sql for sql, _ in session.statements) == (failure == "discord")
