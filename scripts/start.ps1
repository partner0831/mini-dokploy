$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $Root

$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path $dockerBin) {
  $env:PATH = "$dockerBin;$env:PATH"
}

if (-not (docker info 2>$null)) {
  Write-Error "Docker is not running."
}

$swarm = docker info 2>$null | Select-String "Swarm: active"
if (-not $swarm) {
  Write-Host "Initializing Docker Swarm..."
  docker swarm init 2>$null | Out-Null
}

Write-Host "Building Mini-Dokploy image..."
docker build -t minidokploy/app:latest .

if (-not $env:BETTER_AUTH_SECRET) {
  $env:BETTER_AUTH_SECRET = "dev-" + [guid]::NewGuid().ToString("N")
  Write-Host "Generated BETTER_AUTH_SECRET for this session."
}

Write-Host "Deploying stack..."
docker stack deploy -c docker-stack.yml minidokploy

Write-Host ""
Write-Host "Mini-Dokploy is starting."
Write-Host "  Dashboard:  http://minidokploy.127.0.0.1.sslip.io"
Write-Host "  Traefik UI: http://127.0.0.1:8080"
Write-Host ""
Write-Host "Tail logs: docker service logs -f minidokploy_app"
