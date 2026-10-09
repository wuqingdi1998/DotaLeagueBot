from types import SimpleNamespace

import pytest

from services.compendium_command_verification import verify_current_compendium_commands


def command_list():
    return [SimpleNamespace(name=name, description="Команда октябрьского компендиума",
                            options=[SimpleNamespace(name="reason", required=True)])
            for name in ["add_stars", "delete_stars", "compendium", "completestars"]]


def test_registered_current_commands_pass_verification():
    verify_current_compendium_commands(command_list())


def test_old_descriptions_and_missing_reason_fail_verification():
    commands = command_list()
    commands[0].description = "Выдать звёзды TI 2026"
    with pytest.raises(RuntimeError, match="outdated: add_stars"):
        verify_current_compendium_commands(commands)
    commands[0].description = "октябрь"
    commands[0].options = []
    with pytest.raises(RuntimeError, match="requires a reason: add_stars"):
        verify_current_compendium_commands(commands)
