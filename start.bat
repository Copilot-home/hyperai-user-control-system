@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "COMPOSE_FILE=docker\docker-compose.yml"
set "BACKEND_URL=http://127.0.0.1:5000/api/health"
set "FRONTEND_URL=http://127.0.0.1:4173"
set "TIMEOUT_SECONDS=120"

where docker >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker is not installed or is not available on PATH.
  exit /b 1
)

docker compose version >nul 2>&1
if errorlevel 1 (
  echo ERROR: Docker Compose v2 is required.
  exit /b 1
)

if not exist "%COMPOSE_FILE%" (
  echo ERROR: Missing canonical compose file: %COMPOSE_FILE%
  exit /b 1
)

docker compose -f "%COMPOSE_FILE%" config >nul
if errorlevel 1 (
  echo ERROR: Docker Compose configuration is invalid.
  exit /b 1
)

echo Building HyperAI containers...
docker compose -f "%COMPOSE_FILE%" build
if errorlevel 1 exit /b 1

echo Starting HyperAI...
docker compose -f "%COMPOSE_FILE%" up -d
if errorlevel 1 exit /b 1

call :wait_url "Backend" "%BACKEND_URL%"
if errorlevel 1 (
  docker compose -f "%COMPOSE_FILE%" ps
  docker compose -f "%COMPOSE_FILE%" logs --tail=120 backend
  echo ERROR: Backend did not become healthy within %TIMEOUT_SECONDS% seconds.
  exit /b 1
)

call :wait_url "Frontend" "%FRONTEND_URL%"
if errorlevel 1 (
  docker compose -f "%COMPOSE_FILE%" ps
  docker compose -f "%COMPOSE_FILE%" logs --tail=120 frontend
  echo ERROR: Frontend did not become healthy within %TIMEOUT_SECONDS% seconds.
  exit /b 1
)

echo.
echo HyperAI is running.
echo UI:      %FRONTEND_URL%
echo Backend: http://127.0.0.1:5000
echo Health:  %BACKEND_URL%
echo.
echo Stop with: docker compose -f %COMPOSE_FILE% down
exit /b 0

:wait_url
set "LABEL=%~1"
set "URL=%~2"
set /a ELAPSED=0

:wait_loop
powershell -NoProfile -NonInteractive -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 5; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  echo %LABEL% ready: %URL%
  exit /b 0
)

if !ELAPSED! GEQ %TIMEOUT_SECONDS% exit /b 1
powershell -NoProfile -NonInteractive -Command "Start-Sleep -Seconds 2" >nul 2>&1
set /a ELAPSED+=2
goto wait_loop
