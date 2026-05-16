#!/bin/sh
set -e

echo "→ running database migrations..."
node src/scripts/migrate.js

echo "→ starting application..."
exec "$@"
