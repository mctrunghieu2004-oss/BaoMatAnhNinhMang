#!/bin/sh
set -e
FILE="$1"
docker compose stop app
docker compose cp "$FILE" db:/tmp/restore.dump
docker compose exec -T db pg_restore -U postgres -d securegrade --clean --if-exists /tmp/restore.dump
docker compose start app
echo "Restored from $FILE"
