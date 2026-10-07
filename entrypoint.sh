#!/bin/sh
set -e

# Fast migration check on container start
python manage.py migrate --noinput

PORT="${PORT:-8080}"

# Start Gunicorn web server with access and error logs to stdout/stderr
if [ -z "$1" ] || [ "$1" = "gunicorn" ]; then
    echo "Starting Gunicorn server on 0.0.0.0:${PORT}..."
    exec gunicorn chess_reviewer.wsgi:application \
        --bind "0.0.0.0:${PORT}" \
        --workers 1 \
        --threads 4 \
        --timeout 300 \
        --access-logfile - \
        --error-logfile -
fi

exec "$@"
