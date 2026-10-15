# HyperAI User Control System — End-User Release

This package boots the verified core HyperAI browser shell and Node backend. Optional workstation/cloud integrations remain optional; no external account or secret is required for the basic local UI and health surface.

## 1. Requirement

Install Docker Desktop (Windows/macOS) or Docker Engine with Docker Compose v2 (Linux). Allocate enough Docker resources for two Node 20 containers.

## 2. One-click start

### Windows

Double-click `start.bat`, or run:

```bat
start.bat
```

### macOS / Linux

From the extracted package directory:

```sh
chmod +x run.sh && ./run.sh
```

The launcher validates Docker/Compose, validates the canonical `docker/docker-compose.yml`, builds the containers, starts them, and waits for real HTTP health readback. A failed health check returns a non-zero exit code and prints recent container logs.

## 3. Access

After the launcher reports success:

- UI: `http://localhost:4173`
- Backend: `http://localhost:5000`
- Health: `http://localhost:5000/api/health`

There is no default password seeded by this release. Optional provider/database/Telegram credentials are supplied by the operator only when those integrations are deliberately enabled.

## Stop

```sh
docker compose -f docker/docker-compose.yml down
```

The same command works in Windows Command Prompt/PowerShell.

## Rebuild after source/config changes

Run the one-click launcher again. It calls `docker compose build` before startup.

## Reset containers

```sh
docker compose -f docker/docker-compose.yml down --remove-orphans
```

This base release intentionally does not mount the developer workstation's `../runtime` directory. That directory contains orchestration/evidence state outside the distributable application's ownership boundary.

## Optional environment configuration

Copy `.env.example` to `.env` only when an optional integration needs configuration. Never put a real `.env` or credential file into a release ZIP or source-control commit.

The core Docker topology uses backend port 5000 and frontend port 4173. Optional PostgreSQL, NotebookLM, Telegram, provider and managed-runtime variables are documented in `.env.example`.

## Troubleshooting

### Docker not found

Start/install Docker and verify `docker compose version` succeeds, then rerun the launcher.

### Port 5000 or 4173 is already occupied

Stop the existing listener/container intentionally before starting this package. Do not kill an unknown process automatically; the HyperAI runtime contract treats an existing listener as evidence that must be identified before replacement.

### Backend or frontend health timeout

Inspect:

```sh
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs --tail=200 backend
docker compose -f docker/docker-compose.yml logs --tail=200 frontend
```

The launchers already print a shorter log tail on failure.

## Verification contract

A distributable build is accepted only when the release contract and repository hard gates execute successfully on a clean build surface. Documentation alone is not proof of runtime health.
