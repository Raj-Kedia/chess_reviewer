#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --no-input 
chmod +x /static/stockfish/stockfish-ubuntu-x86-64-avx2
chmod +x /staticfiles/stockfish/stockfish-ubuntu-x86-64-avx2
