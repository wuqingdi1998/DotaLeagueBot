import importlib.util
from pathlib import Path
import subprocess

import pytest

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "build_release_manifest", ROOT / "scripts/build-release-manifest.py"
)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


@pytest.mark.parametrize("mode", ["cherry-pick", "equivalent", "adapted"])
def test_selective_release_hides_published_feature_but_keeps_game_and_followup(
    tmp_path, monkeypatch, mode,
):
    monkeypatch.chdir(tmp_path)

    def git(*args):
        return subprocess.check_output(["git", *args], text=True).strip()

    def commit(name, filename, content):
        (tmp_path / filename).write_text(content, encoding="utf-8")
        git("add", ".")
        git("commit", "-m", name)
        return git("rev-parse", "HEAD")

    git("init", "-b", "main")
    git("config", "user.email", "test@example.test")
    git("config", "user.name", "Test")
    commit("base", "site.txt", "site")
    git("checkout", "-b", "development")
    game = commit("game", "autobattler.txt", "dev only")
    feature = commit("feature", "feature.txt", "published")
    followup = commit("followup", "feature.txt", "still only dev")
    git("checkout", "main")
    if mode == "cherry-pick":
        git("cherry-pick", "-x", feature)
    elif mode == "equivalent":
        commit("release", "feature.txt", "published")
    else:
        commit(
            f"adapted release\n\n(cherry picked from commit {feature})",
            "feature.txt", "published with production adaptation",
        )
    git("update-ref", "refs/remotes/origin/main", "HEAD")
    git("checkout", "development")
    published = MODULE.published_source_revisions()
    assert feature in published
    assert game not in published
    assert followup not in published
