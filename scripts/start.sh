#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running."
  exit 1
fi

if ! docker info 2>/dev/null | grep -q "Swarm: active"; then
  echo "Initializing Docker Swarm..."
  docker swarm init || true
fi

echo "Building Mini-Dokploy image..."
docker build -t minidokploy/app:latest .

if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  export BETTER_AUTH_SECRET="dev-$(openssl rand -hex 16 2>/dev/null || date +%s)"
  echo "Generated BETTER_AUTH_SECRET for this session."
fi

echo "Deploying stack..."
docker stack deploy -c docker-stack.yml minidokploy

echo ""
echo "Mini-Dokploy is starting."
echo "  Dashboard:  http://minidokploy.127.0.0.1.sslip.io"
echo "  Traefik UI: http://127.0.0.1:8080"
echo ""
echo "Tail logs: docker service logs -f minidokploy_app"
