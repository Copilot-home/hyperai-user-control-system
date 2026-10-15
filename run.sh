#!/usr/bin/env sh
set -eu

COMPOSE_FILE="docker/docker-compose.yml"
BACKEND_URL="http://127.0.0.1:5000/api/health"
FRONTEND_URL="http://127.0.0.1:4173"
TIMEOUT_SECONDS="120"

fail() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

have() {
  command -v "$1" >/dev/null 2>&1
}

http_ok() {
  url="$1"
  if have curl; then
    curl --fail --silent --show-error --max-time 5 "$url" >/dev/null 2>&1
    return $?
  fi
  if have wget; then
    wget --quiet --timeout=5 --spider "$url" >/dev/null 2>&1
    return $?
  fi
  return 2
}

wait_for_url() {
  label="$1"
  url="$2"
  elapsed=0
  while [ "$elapsed" -lt "$TIMEOUT_SECONDS" ]; do
    if http_ok "$url"; then
      printf '%s\n' "$label ready: $url"
      return 0
    fi
    status=$?
    if [ "$status" -eq 2 ]; then
      fail "curl or wget is required for health verification."
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

have docker || fail "Docker is not installed or is not available on PATH. Install Docker Desktop/Engine and retry."
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is required."
[ -f "$COMPOSE_FILE" ] || fail "Missing canonical compose file: $COMPOSE_FILE"

docker compose -f "$COMPOSE_FILE" config >/dev/null || fail "Docker Compose configuration is invalid."

printf '%s\n' "Building HyperAI containers..."
docker compose -f "$COMPOSE_FILE" build

printf '%s\n' "Starting HyperAI..."
docker compose -f "$COMPOSE_FILE" up -d

if ! wait_for_url "Backend" "$BACKEND_URL"; then
  docker compose -f "$COMPOSE_FILE" ps >&2 || true
  docker compose -f "$COMPOSE_FILE" logs --tail=120 backend >&2 || true
  fail "Backend did not become healthy within ${TIMEOUT_SECONDS}s."
fi

if ! wait_for_url "Frontend" "$FRONTEND_URL"; then
  docker compose -f "$COMPOSE_FILE" ps >&2 || true
  docker compose -f "$COMPOSE_FILE" logs --tail=120 frontend >&2 || true
  fail "Frontend did not become healthy within ${TIMEOUT_SECONDS}s."
fi

printf '\nHyperAI is running.\n'
printf 'UI:      %s\n' "$FRONTEND_URL"
printf 'Backend: %s\n' "http://127.0.0.1:5000"
printf 'Health:  %s\n' "$BACKEND_URL"
printf '\nStop with: docker compose -f %s down\n' "$COMPOSE_FILE"
