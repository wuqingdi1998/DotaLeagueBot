#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_DIR=/root/DotaLeagueBot
test "$PWD" = /root/DotaLeagueBotDev
test -f "$PRODUCTION_DIR/.env"
revision="$(git rev-parse HEAD)"

python3 scripts/prepare-development-env.py --production-dir "$PRODUCTION_DIR" --revision "$revision"
compose() { docker compose -f docker-compose.development.yml "$@"; }
compose config --quiet
docker network inspect dotaleaguebot-development >/dev/null
install -d -m 0775 -o 1001 -g 1001 development/uploads
compose up -d --wait db

if [ ! -f development/initialized ]; then
  # Take a consistent read-only snapshot; never connect a test service to live data.
  docker compose --project-directory "$PRODUCTION_DIR" exec -T db sh -c \
    'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" --format=custom --no-owner --no-acl' > development/initial.dump
  compose exec -T db sh -c \
    'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl --exit-on-error --single-transaction' < development/initial.dump
  compose exec -T db sh -c \
    'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "TRUNCATE web_sessions, web_organizer_sessions, temporary_organizer_passwords, web_organizer_login_attempts;"'
  cp -a "$PRODUCTION_DIR/uploads_data/." development/uploads/
  chown -R 1001:1001 development/uploads
  rm development/initial.dump
  touch development/initialized
fi

compose stop site
compose run --rm migrate
compose up -d --no-deps --wait site
compose exec -T site node -e \
  "fetch('http://127.0.0.1:3000/api/version').then(async r=>{const v=await r.json();if(v.revision!=='$revision')process.exit(1)})"
compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c "SELECT current_database(), COUNT(*) AS players FROM players;"'
echo "Development site is healthy at revision $revision"
