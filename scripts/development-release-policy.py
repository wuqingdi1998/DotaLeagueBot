"""Keep protected development work intact when production is released."""

import os
from pathlib import Path
import subprocess
import sys


def is_protected_path(path: str) -> bool:
    return "autobattler" in path.lower() or "heroes-compendium" in path.lower()


def should_preserve_development(production: str, development: str) -> bool:
    changed = subprocess.check_output(
        ["git", "diff", "--name-only", production, development, "--"], text=True
    )
    return any(is_protected_path(path) for path in changed.splitlines())


if __name__ == "__main__":
    should_preserve = sys.argv[1] == "refs/heads/main" and should_preserve_development(
        "HEAD", "origin/codex/dev"
    )
    output = f"preserve={'true' if should_preserve else 'false'}\n"
    if os.environ.get("GITHUB_OUTPUT"):
        with Path(os.environ["GITHUB_OUTPUT"]).open("a", encoding="utf-8") as stream:
            stream.write(output)
    print(output.strip())
