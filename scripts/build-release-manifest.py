"""Record exact source revisions and readable pending changes before image creation."""

import json
from pathlib import Path
import subprocess


def git(*arguments: str) -> str:
    return subprocess.check_output(["git", *arguments], text=True, encoding="utf-8").strip()


def main() -> None:
    revision = git("rev-parse", "HEAD")
    baseline = git("merge-base", "HEAD", "origin/main")
    revisions = git("rev-list", "--first-parent", f"{baseline}..HEAD").splitlines()
    changes = [
        {
            "revision": change,
            "title": git("show", "-s", "--format=%s", change),
            "createdAt": git("show", "-s", "--format=%cI", change),
        }
        for change in revisions
    ]
    target = Path(__file__).resolve().parents[1] / "site/lib/development/release-manifest.json"
    target.write_text(
        json.dumps({"revision": revision, "baselineRevision": baseline, "changes": changes}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Prepared release {revision[:8]} with {len(changes)} unpublished changes")


if __name__ == "__main__":
    main()
