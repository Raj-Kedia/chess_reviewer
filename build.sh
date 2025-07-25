#!/usr/bin/env bash
# exit on error
set -o errexit

# Install Python dependencies
pip install -r requirements.txt


# Collect static files
python manage.py collectstatic --no-input 

echo "✅ Static files collected successfully"

# Run migrations
python manage.py makemigrations --verbosity 2
echo "✅ Migrations created successfully"
timeout 60s python manage.py migrate --verbosity 2 --no-input
# Test DB connection
python manage.py showmigrations
echo "✅ Migrations applied successfully"
# chmod +x /static/stockfish/stockfish-ubuntu-x86-64-avx2
# chmod +x /staticfiles/stockfish/stockfish-ubuntu-x86-64-avx2
echo "✅ Build script completed successfully"
