# Mini-Dokploy

A small Dokploy-style deployment panel: paste a Git URL, pick a Dockerfile, and get a Docker Swarm service behind Traefik on a generated `sslip.io` subdomain.

## Setup

**Prerequisites:** Docker Desktop (or Engine) with Swarm support, Git, and ports 80 / 8080 free.

### One command

```bash
# macOS / Linux
./scripts/start.sh

# Windows (PowerShell)
./scripts/start.ps1

# or cross-platform via npm (after npm install)
npm run stack:up
```

This will:

1. Initialize Docker Swarm (if needed)
2. Build the `minidokploy/app` image
3. Deploy the stack (`traefik` + `app`) via `docker stack deploy`

Open the dashboard at **http://minidokploy.127.0.0.1.sslip.io** — no hosts file required.

Traefik's dashboard lives at **http://127.0.0.1:8080**.

### Local development (without Swarm)

```bash
npm install
cp .env.example .env.local
npm run db:migrate
npm run dev
```

Dev mode runs on `http://localhost:3000`. Docker orchestration still needs a Swarm manager and Traefik network for real deploys.

### Try a deployment

1. Sign up / sign in (auth is on by default).
2. Create a deployment:
   - **Repo:** any public Git URL
   - **Dockerfile path:** e.g. `Dockerfile`
   - **Exposed port:** container port Traefik should route to (e.g. `80` for nginx)
3. Watch build logs in the UI.
4. When status is `running`, open the generated `https?://{slug}.127.0.0.1.sslip.io` link.

The `examples/hello-world` folder is a minimal nginx site you can push to GitHub and deploy.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Browser   │────▶│ Traefik (Swarm)  │────▶│ User app services   │
│  Next.js UI │     │  Docker labels   │     │  (one per deploy)   │
└──────┬──────┘     └────────▲─────────┘     └─────────────────────┘
       │ tRPC / WS           │
       ▼                     │ same overlay network
┌──────────────────┐         │
│ Mini-Dokploy app │─────────┘
│  clone → build   │
│  create service  │
└────────┬─────────┘
         │ SQLite (Drizzle)
         ▼
   deployment state
```

**Stack components**

| Piece | Role |
|-------|------|
| `docker-stack.yml` | Traefik + Mini-Dokploy as Swarm services |
| `server.ts` | Custom Next.js server with WebSocket log streaming |
| tRPC | Type-safe API for list / create / redeploy / remove |
| Dockerode + `docker build` | Clone repos, build images, manage Swarm services |
| Traefik labels | Auto-generated per deployment; custom labels merged on top |
| BetterAuth + SQLite | Multi-tenant ownership of deployments |

**Deploy flow**

1. User submits form → row inserted in SQLite (`pending`).
2. Background job clones the repo into `/app/builds/{id}`.
3. `docker build` tags `minidokploy/{slug}:latest`.
4. A new Swarm service is created with Traefik routing labels.
5. Status moves to `running`; logs stream over `/api/ws/logs`.

Redeploy rebuilds the image and updates the service. Remove tears down the service and deletes local build artifacts.

## Tradeoffs & what I'd build next

**Choices made**

- **Docker Swarm over raw `docker run` / Compose** — matches the brief; gives service primitives, rolling updates, and label-based routing in one model. Tradeoff: Swarm is fading vs Kubernetes, but it's perfect for a local single-node demo.
- **SQLite** — zero ops for a take-home. Fine until horizontal scaling or concurrent writes become real.
- **Fire-and-forget jobs** — deploy runs in-process. Simple, but a crash mid-build leaves you reconciling state manually. Production would use a queue (Redis, BullMQ) and idempotent workers.
- **Build on the app node** — easy wiring through the mounted Docker socket. Doesn't scale; remote builders (BuildKit, Depot) would be next.
- **sslip.io** — brilliant for local demos. Production needs real DNS + TLS (Let's Encrypt via Traefik is already half-wired).

**Next steps**

- Job queue with retry/backoff and stale-job recovery
- HTTPS via Traefik ACME resolver
- Git deploy keys / private repo support
- Per-deployment resource limits and health checks
- Audit log + RBAC beyond single-user ownership
- Multi-node Swarm or k8s migration path

## How I used AI tools (and where I didn't)

**Used AI for**

- Bootstrapping repetitive glue (Drizzle schema shape, tRPC router skeleton, Docker stack YAML starter)
- README structure and tradeoff articulation
- CSS layout tokens — faster than hand-tuning spacing from scratch

**Didn't delegate to AI**

- Core orchestration flow (clone → build → Swarm service → Traefik labels) — sketched by hand first because the failure modes matter
- Network naming in Swarm (`minidokploy_traefik-public`) and service update versioning — debugged against real Docker behavior
- Auth tenancy rules (who can redeploy whose app) — kept intentionally boring and explicit
- WebSocket log fan-out — small enough to write directly; a generated version would've been harder to reason about

**Judgment calls**

AI is great for speed on boilerplate; it's a liability for subtle distributed systems details. I used it to move faster on scaffolding, then rewrote the paths that touch Docker and state transitions myself.

## License
