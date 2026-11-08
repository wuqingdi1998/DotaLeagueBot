"""Record exact source revisions and readable pending changes before image creation."""

import json
from pathlib import Path
import re
import subprocess


def git(*arguments: str) -> str:
    return subprocess.check_output(["git", *arguments], text=True, encoding="utf-8").strip()


def published_source_revisions() -> set[str]:
    """Recognize selective releases while game history remains only on dev."""
    messages = git("log", "origin/main", "--format=%B")
    revisions = set(re.findall(
        r"^\(cherry picked from commit ([0-9a-f]{40})\)$", messages, re.MULTILINE,
    ))
    revisions.update(
        line[2:] for line in git("cherry", "origin/main", "HEAD").splitlines()
        if line.startswith("- ")
    )
    return revisions


def main() -> None:
    revision = git("rev-parse", "HEAD")
    baseline = git("merge-base", "HEAD", "origin/main")
    revisions = git("rev-list", "--first-parent", f"{baseline}..HEAD").splitlines()
    published = published_source_revisions()
    changes = [
        {
            "revision": change,
            "title": git("show", "-s", "--format=%s", change),
            "createdAt": git("show", "-s", "--format=%cI", change),
        }
        for change in revisions
        if change not in published
    ]
    target = Path(__file__).resolve().parents[1] / "site/lib/development/release-manifest.json"
    target.write_text(
        json.dumps({"revision": revision, "baselineRevision": baseline, "changes": changes}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Prepared release {revision[:8]} with {len(changes)} unpublished changes")


if __name__ == "__main__":
    main()
