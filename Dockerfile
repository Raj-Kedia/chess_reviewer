# Use official lightweight Python image
FROM python:3.11-slim

# Prevent Python from buffering stdout/stderr and add /usr/games to PATH for Stockfish
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    PATH="/usr/games:${PATH}"

# Install system dependencies including Stockfish engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python packages
COPY requirements.txt /app/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . /app/

# Make entrypoint and any bundled Stockfish binaries executable
RUN chmod +x /app/entrypoint.sh && \
    if [ -f /app/static/stockfish/stockfish-ubuntu-x86-64-avx2 ]; then \
        chmod +x /app/static/stockfish/stockfish-ubuntu-x86-64-avx2; \
    fi

# Run database migrations and collect static files with WhiteNoise during build
RUN python manage.py migrate --noinput && \
    python manage.py collectstatic --noinput

EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]

CMD ["gunicorn"]
