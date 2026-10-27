import os
from pathlib import Path
import re
import shutil
import subprocess

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SYNC_MARKER = "[OCTOBER CLANS] Roles synchronized for guild 123"


def bash_executable() -> str:
    if os.name == "nt":
        git = shutil.which("git")
        assert git, "Git Bash is required to verify deployment shell commands"
        for parent in Path(git).parents:
            candidate = parent / "bin" / "bash.exe"
            if candidate.is_file():
                return str(candidate)
    executable = shutil.which("bash")
    assert executable, "Bash is required to verify deployment shell commands"
    return executable


@pytest.mark.parametrize(
    ("marker", "reader_exit", "is_success"),
    [(SYNC_MARKER, 0, True), ("[OCTOBER CLANS] Roles removed for guild 123", 0, True),
     ("", 0, False), (SYNC_MARKER, 17, False), ("[OCTOBER CLANS] Roles removed for guild 123", 17, False)],
)
def test_clan_probe_reads_large_logs_and_preserves_failures(
    tmp_path: Path, marker: str, reader_exit: int, is_success: bool
) -> None:
    workflow = (PROJECT_ROOT / ".github/workflows/deploy.yml").read_text(encoding="utf-8")
    step = workflow.split("- name: Verify October clan eligibility and role removal", 1)[1]
    probe = re.search(r"if (docker compose logs[^\n]+\n\s+grep[^;]+); then", step)
    assert probe, "The clan synchronization log check must remain mandatory"
    log_path = tmp_path / "bot.log"
    log_path.write_text(
        (marker + "\n" if marker else "") + "Other bot event\n" * 100_000,
        encoding="utf-8",
    )
    script = """set -o pipefail
docker() {
  cat "$TASK_PROBE_LOG" || return $?
  return "$TASK_LOG_READER_STATUS"
}
""" + probe.group(1)
    result = subprocess.run(
        [bash_executable(), "-c", script],
        env={
            **os.environ,
            "TASK_PROBE_LOG": log_path.as_posix(),
            "TASK_LOG_READER_STATUS": str(reader_exit),
        },
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert (result.returncode == 0) is is_success, result.stderr
