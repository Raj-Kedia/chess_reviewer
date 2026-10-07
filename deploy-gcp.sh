#!/usr/bin/env bash
set -e

SERVICE_NAME="chess-reviewer"
REGION="${REGION:-us-central1}"

echo "=========================================="
echo "  Chess Reviewer - Google Cloud Run Deploy"
echo "=========================================="

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "ERROR: gcloud CLI is not installed."
    echo "Visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
PROJECT_ID="${1:-$(gcloud config get-value project 2>/dev/null)}"
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" = "(unset)" ]; then
    read -p "Enter your Google Cloud Project ID: " PROJECT_ID
fi

if [ -z "$PROJECT_ID" ]; then
    echo "ERROR: Project ID is required."
    exit 1
fi

echo "[1/4] Setting project to $PROJECT_ID..."
gcloud config set project "$PROJECT_ID"

echo "[2/4] Enabling Cloud Run, Cloud Build, and Artifact Registry APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

echo "[3/4] Deploying $SERVICE_NAME to Google Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --source . \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --memory 1Gi \
    --cpu 1 \
    --timeout 300 \
    --set-env-vars "DEBUG=False,ALLOWED_HOSTS=*"

echo "[4/4] Deployment SUCCESSFUL!"
SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" --platform managed --region "$REGION" --format "value(status.url)")
echo "=========================================="
echo "Your application is live at: $SERVICE_URL"
echo "=========================================="
