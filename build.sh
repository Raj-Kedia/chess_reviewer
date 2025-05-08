#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input 
chmod +x /opt/render/project/src/static/stockfish/static/stockfish/stockfish-windows-x86-64-avx2.exe
