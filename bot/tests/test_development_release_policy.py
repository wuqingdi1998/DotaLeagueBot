import importlib.util
from pathlib import Path
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "development_release_policy", ROOT / "scripts/development-release-policy.py"
)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


@pytest.mark.parametrize("path", [
    "site/app/autobattler/page.tsx", "site/app/styles/autobattler.css",
    "bot/database/migrations/development/0194_autobattler.sql",
    "docs/heroes-compendium-mla-visual-reference.md",
])
def test_game_code_assets_and_migrations_are_protected(path):
    assert MODULE.is_protected_path(path)


def test_regular_site_updates_do_not_block_development_refresh():
    assert not MODULE.is_protected_path("site/app/tournaments/teams.tsx")


def test_comparison_preserves_game_work_even_after_main_was_merged(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)

    def git(*args):
        return subprocess.check_output(["git", *args], text=True).strip()

    git("init", "-b", "main")
    git("config", "user.email", "test@example.test")
    git("config", "user.name", "Test")
    (tmp_path / "site.txt").write_text("site", encoding="utf-8")
    git("add", ".")
    git("commit", "-m", "site")
    git("checkout", "-b", "development")
    (tmp_path / "autobattler.ts").write_text("game", encoding="utf-8")
    git("add", ".")
    git("commit", "-m", "game")
    assert MODULE.should_preserve_development("main", "development")
    assert not MODULE.should_preserve_development("main", "main")


def test_main_cannot_replace_protected_development_program_or_data():
    workflow = (ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    development = workflow.split("\n  development:", 1)[1]
    for step in ["Record development release", "Deploy isolated test site", "Verify development site externally", "Align development source with verified production"]:
        block = development.split(f"- name: {step}", 1)[1].split("\n      - ", 1)[0]
        assert "steps.development_policy.outputs.preserve != 'true'" in block
