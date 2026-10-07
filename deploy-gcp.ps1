param (
    [string]$ProjectId,
    [string]$Region = "us-central1",
    [string]$ServiceName = "chess-reviewer"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Chess Reviewer - Google Cloud Run Deploy" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Refresh PATH if gcloud is not yet active in current session
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","User") + ";" + [System.Environment]::GetEnvironmentVariable("Path","Machine")
    if (Test-Path "D:\google cloud\google-cloud-sdk\bin") {
        $env:Path += ";D:\google cloud\google-cloud-sdk\bin"
    }
}

# Check if gcloud CLI is installed
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Google Cloud CLI (gcloud) is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Google Cloud SDK from:" -ForegroundColor Yellow
    Write-Host "https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
    Write-Host "`nAlternatively, you can deploy directly using Google Cloud Shell in your browser!" -ForegroundColor Green
    exit 1
}

# 2. Check GCP Project ID
if (-not $ProjectId) {
    $currentProject = (gcloud config get-value project 2>$null)
    if ($currentProject -and $currentProject -ne "(unset)") {
        $ProjectId = $currentProject
        Write-Host "Using currently configured GCP Project: $ProjectId" -ForegroundColor Green
    } else {
        $ProjectId = Read-Host "Enter your Google Cloud Project ID"
    }
}

if (-not $ProjectId) {
    Write-Host "ERROR: Project ID is required." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/4] Setting active GCP project to $ProjectId..." -ForegroundColor Yellow
gcloud config set project $ProjectId

Write-Host "`n[2/4] Enabling required Google Cloud APIs (Cloud Run, Cloud Build, Artifact Registry)..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

Write-Host "`n[3/4] Deploying $ServiceName to Cloud Run in region $Region..." -ForegroundColor Yellow
Write-Host "This will build the container using Cloud Build and deploy it serverlessly..." -ForegroundColor Gray

gcloud run deploy $ServiceName `
    --source . `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --memory 1Gi `
    --cpu 1 `
    --timeout 300 `
    --set-env-vars "DEBUG=False,ALLOWED_HOSTS=*"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[4/4] Deployment SUCCESSFUL!" -ForegroundColor Green
    $serviceUrl = (gcloud run services describe $ServiceName --platform managed --region $Region --format "value(status.url)")
    Write-Host "==========================================" -ForegroundColor Cyan
    Write-Host "Your application is live at:" -ForegroundColor Green
    Write-Host $serviceUrl -ForegroundColor Cyan
    Write-Host "==========================================" -ForegroundColor Cyan
} else {
    Write-Host "`nDeployment failed. Check the error output above." -ForegroundColor Red
}
