#!/bin/sh
set -e
TS=$(date +%Y%m%d_%H%M%S)
mkdir -p backups
docker compose exec -T db pg_dump -U postgres -Fc -f /tmp/sg.dump securegrade
docker compose cp db:/tmp/sg.dump "backups/sg_${TS}.dump"
echo "Backup: backups/sg_${TS}.dump"
