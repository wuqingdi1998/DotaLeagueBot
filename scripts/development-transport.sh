#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_HOST:?Deployment host is required}"
: "${DEPLOY_USER:?Deployment user is required}"
: "${DEPLOY_SSH_KEY:?Deployment key is required}"
: "${DEPLOY_HOST_KEY:?Trusted deployment host key is required}"
port="${DEPLOY_PORT:-22}"
key_file=$(mktemp)
known_hosts_file=$(mktemp)
trap 'rm -f -- "$key_file" "$known_hosts_file"' EXIT
chmod 600 "$key_file" "$known_hosts_file"
printf '%s\n' "$DEPLOY_SSH_KEY" | tr -d '\r' > "$key_file"
printf 'lsesports-deploy %s\n' "$DEPLOY_HOST_KEY" > "$known_hosts_file"
options=(-i "$key_file" -o BatchMode=yes -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$known_hosts_file" -o HostKeyAlias=lsesports-deploy
  -o ConnectTimeout=30 -o ServerAliveInterval=30 -o ServerAliveCountMax=6)
destination="$DEPLOY_USER@$DEPLOY_HOST"

retry_transfer() {
  for attempt in 1 2 3; do
    if "$@"; then return 0; fi
    if [ "$attempt" = 3 ]; then return 1; fi
    sleep 5
  done
}

case "${1:-}" in
  transfer)
    [[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ ]] || { echo "Invalid release revision" >&2; exit 2; }
    artifact=development-images.tar.gz
    target="/tmp/dotaleaguebot-dev-$GITHUB_SHA"
    if [ "${DEPLOY_ENVIRONMENT:-development}" = production ]; then
      artifact=deployment-images.tar.gz
      target="/tmp/dotaleaguebot-$GITHUB_SHA"
    fi
    test -s "$artifact"
    retry_transfer ssh "${options[@]}" -p "$port" -- "$destination" "mkdir -p -- '$target'"
    retry_transfer scp "${options[@]}" -P "$port" -- "$artifact" "$destination:$target/"
    ;;
  deploy)
    # Docker commands may read stdin; capture the complete program before running it.
    ssh "${options[@]}" -p "$port" -- "$destination" \
      'deployment_script=$(cat); exec bash -e -c "$deployment_script" </dev/null'
    ;;
  *) echo "Expected transfer or deploy" >&2; exit 2 ;;
esac
