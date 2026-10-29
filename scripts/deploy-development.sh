#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_DIR=/root/DotaLeagueBot
test "$PWD" = /root/DotaLeagueBotDev
test -f "$PRODUCTION_DIR/.env"
revision="$(git rev-parse HEAD)"
refresh_mode="${1:-preserve}"
case "$refresh_mode" in
  preserve|--refresh-from-production) ;;
  *) echo "Unknown development deployment mode" >&2; exit 1 ;;
esac

python3 scripts/prepare-development-env.py --production-dir "$PRODUCTION_DIR" --revision "$revision"
compose() { docker compose -f docker-compose.development.yml "$@"; }
compose config --quiet
docker network inspect dotaleaguebot-development >/dev/null
install -d -m 0775 -o 1001 -g 1001 development/uploads
compose up -d --wait db

if [ "$refresh_mode" = --refresh-from-production ] || [ ! -f development/initialized ]; then
  production_revision="$(git -C "$PRODUCTION_DIR" rev-parse HEAD)"
  if [ "$refresh_mode" = --refresh-from-production ]; then
    test "$production_revision" = "$revision"
  fi
  python3 scripts/refresh-development-data.py \
    --production-dir "$PRODUCTION_DIR" --production-revision "$production_revision"
  chown -R 1001:1001 development/uploads
  touch development/initialized
fi

compose stop development-site
compose run --rm migrate
compose up -d --no-deps --wait development-site
compose exec -T development-site node -e \
  "fetch('http://127.0.0.1:3000/api/version').then(async r=>{const v=await r.json();if(v.revision!=='$revision')process.exit(1)})"
compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT current_database(), COUNT(*) AS players FROM players;"'
echo "Development site is healthy at revision $revision"
docker image prune --force
