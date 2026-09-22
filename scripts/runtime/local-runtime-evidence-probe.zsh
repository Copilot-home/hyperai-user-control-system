#!/bin/zsh
set -u
set -o pipefail

echo '===== 1. LOCAL RUNTIME HEALTH ====='
for u in \
  http://127.0.0.1:5000/api/health \
  http://127.0.0.1:8010/health \
  http://127.0.0.1:8010/v1/models
do
  echo "--- $u"
  curl -sS --max-time 5 -i "$u" 2>&1 | head -40 || true
done

echo
echo '===== 2. CLOUDFLARED ====='
pgrep -af cloudflared 2>/dev/null || true
command -v cloudflared >/dev/null 2>&1 && cloudflared --version 2>/dev/null || true

echo
echo '===== 3. ENVIRONMENT NAMES ONLY ====='
for v in HYPERAI_UPSTREAM_URL JEV_WORKER_URL JEV_WORKER_ATTESTATION_URL DATABASE_URL PGHOST PGPORT PGDATABASE
do
  if [[ -n "${(P)v-}" ]]; then
    echo "$v=SET"
  else
    echo "$v=UNSET"
  fi
done

echo
echo '===== 4. JEV WORKER PROCESS / FILE SURFACE ====='
pgrep -af 'jev|browser-use|browser_harness' 2>/dev/null || true
find "$HOME" -maxdepth 5 \
  \( -path '*/jev-worker*' -o -path '*/jev_ultrafast*' -o -path '*/jev-ultrafast*' \) \
  -print 2>/dev/null | head -100

echo
echo '===== 5. HISTORICAL PRIVATE KEY SURFACE ====='
find "$HOME" \
  \( -name 'private_key.pem' -o -name '*.pem' \) \
  -print 2>/dev/null | head -100

echo
echo '===== 6. REPOSITORY STATE ====='
REPO="$HOME/07_PROJECTS_AND_MICROSERVICES/hyperai-user-control-system"
if [[ -d "$REPO/.git" ]]; then
  cd "$REPO"
  git status --short --branch
  echo "HEAD=$(git rev-parse HEAD)"
  git log -8 --oneline --decorate
else
  echo "REPO_NOT_FOUND=$REPO"
fi

echo
echo '===== 7. END ====='
