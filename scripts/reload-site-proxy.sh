#!/usr/bin/env bash
set -euo pipefail

# Read from stdin: Git replaces the file inode, so an existing single-file
# bind mount can still point at an older Caddyfile after a pull.
docker compose exec -T proxy caddy reload \
  --config /dev/stdin --adapter caddyfile < Caddyfile

docker compose exec -T proxy wget -qO- http://127.0.0.1:2019/config/ |
  python3 -c '
import json, sys

def handlers(value):
    if isinstance(value, dict):
        if value.get("handler") == "reverse_proxy":
            yield value
        for child in value.values():
            yield from handlers(child)
    elif isinstance(value, list):
        for child in value:
            yield from handlers(child)

proxies = list(handlers(json.load(sys.stdin)))
assert proxies, "No active reverse proxy configuration"
for proxy in proxies:
    policy = proxy.get("load_balancing", {})
    assert policy.get("try_duration") == 30000000000, "Proxy retry window was not applied"
    assert policy.get("retry_match") == [{"method": ["GET", "HEAD"]}], "Unsafe retry methods"
print("Active proxy configuration verified")
'
