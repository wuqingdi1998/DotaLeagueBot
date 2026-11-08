import os
from pathlib import Path
import shutil
import subprocess


SCRIPT = Path(__file__).resolve().parents[2] / "scripts/development-transport.sh"
REVISION = "a" * 40
MOCKS = r"""
set -euo pipefail
ssh() {
  printf '%s\n' ssh "$@" >> "$TRANSPORT_CALL_LOG"
  local previous='' argument
  for argument in "$@"; do
    if [ "$previous" = '-i' ]; then
      test "$(cat "$argument")" = 'test-private-key' || return 1
      if [[ "$OSTYPE" == linux* ]]; then test "$(stat -c %a "$argument")" = 600 || return 1; fi
      printf '%s\n' "$argument" >> "$TRANSPORT_KEY_PATHS"
    fi
    case "$argument" in
      UserKnownHostsFile=*)
        local known="${argument#UserKnownHostsFile=}"
        grep -Fxq "lsesports-deploy $DEPLOY_HOST_KEY" "$known" || return 1
        if [[ "$OSTYPE" == linux* ]]; then test "$(stat -c %a "$known")" = 600 || return 1; fi
        printf '%s\n' "$known" >> "$TRANSPORT_KEY_PATHS"
        ;;
    esac
    previous="$argument"
  done
  if [ "${!#}" = 'bash -se' ]; then cat > "$TRANSPORT_REMOTE_INPUT"; fi
}
scp() {
  printf '%s\n' scp "$@" >> "$TRANSPORT_CALL_LOG"
  if [ "${TRANSPORT_FAIL_COPY:-0}" = 1 ]; then return 1; fi
}
sleep() { :; }
export -f ssh scp sleep
bash "$TRANSPORT_SCRIPT" "$TRANSPORT_MODE"
while IFS= read -r temporary; do test ! -e "$temporary"; done < "$TRANSPORT_KEY_PATHS"
"""


def run_transport(tmp_path: Path, mode: str, **overrides: str) -> subprocess.CompletedProcess[str]:
    git_bash = Path("C:/Program Files/Git/bin/bash.exe")
    bash = str(git_bash) if os.name == "nt" and git_bash.is_file() else shutil.which("bash")
    assert bash, "Bash is required to test the deployment transport"
    env = {
        **os.environ,
        "DEPLOY_HOST": "example.invalid", "DEPLOY_USER": "deploy", "DEPLOY_PORT": "2222",
        "DEPLOY_SSH_KEY": "test-private-key\r\n", "DEPLOY_HOST_KEY": "ssh-ed25519 test-public-key",
        "GITHUB_SHA": REVISION, "TRANSPORT_SCRIPT": SCRIPT.as_posix(), "TRANSPORT_MODE": mode,
        "TRANSPORT_CALL_LOG": (tmp_path / "calls").as_posix(),
        "TRANSPORT_KEY_PATHS": (tmp_path / "key-paths").as_posix(),
        "TRANSPORT_REMOTE_INPUT": (tmp_path / "remote-input").as_posix(),
        **overrides,
    }
    (tmp_path / "development-images.tar.gz").write_bytes(b"verified images")
    wrapper = tmp_path / "transport-test.sh"
    wrapper.write_text(MOCKS, encoding="utf-8", newline="\n")
    return subprocess.run(
        [bash, str(wrapper)], cwd=tmp_path, env=env, text=True,
        input='echo "$KEEP_LITERAL"\n', capture_output=True, check=False,
    )


def test_transfer_pins_the_host_and_cleans_private_credentials(tmp_path):
    result = run_transport(tmp_path, "transfer")
    assert result.returncode == 0, result.stderr
    calls = (tmp_path / "calls").read_text(encoding="utf-8")
    assert "StrictHostKeyChecking=yes" in calls
    assert "HostKeyAlias=lsesports-deploy" in calls
    assert "-p\n2222\n" in calls and "-P\n2222\n" in calls
    assert f"deploy@example.invalid:/tmp/dotaleaguebot-dev-{REVISION}/" in calls
    assert "test-private-key" not in calls


def test_deploy_passes_the_script_unchanged_and_cleans_credentials(tmp_path):
    result = run_transport(tmp_path, "deploy")
    assert result.returncode == 0, result.stderr
    assert (tmp_path / "remote-input").read_text(encoding="utf-8") == 'echo "$KEEP_LITERAL"\n'
    assert "bash -se" in (tmp_path / "calls").read_text(encoding="utf-8")


def test_transfer_refuses_an_invalid_revision_before_connecting(tmp_path):
    result = run_transport(tmp_path, "transfer", GITHUB_SHA="bad; touch injected")
    assert result.returncode != 0
    assert not (tmp_path / "calls").exists()
    assert not (tmp_path / "injected").exists()


def test_transfer_requires_a_trusted_host_key(tmp_path):
    result = run_transport(tmp_path, "transfer", DEPLOY_HOST_KEY="")
    assert result.returncode != 0
    assert not (tmp_path / "calls").exists()


def test_failed_transfer_stops_after_three_attempts(tmp_path):
    result = run_transport(tmp_path, "transfer", TRANSPORT_FAIL_COPY="1")
    assert result.returncode != 0
    assert (tmp_path / "calls").read_text(encoding="utf-8").splitlines().count("scp") == 3


def test_production_transfer_uses_the_production_archive_and_target(tmp_path):
    (tmp_path / "deployment-images.tar.gz").write_bytes(b"production images")
    result = run_transport(tmp_path, "transfer", DEPLOY_ENVIRONMENT="production")
    assert result.returncode == 0, result.stderr
    calls = (tmp_path / "calls").read_text(encoding="utf-8")
    assert f"deploy@example.invalid:/tmp/dotaleaguebot-{REVISION}/" in calls
    assert "deployment-images.tar.gz" in calls
    assert "development-images.tar.gz" not in calls
