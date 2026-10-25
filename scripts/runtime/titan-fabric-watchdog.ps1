# ------------------------------------------------------------------------------
# AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
# SYSTEM: HyperAI Phoenix - Unified Orchestrator
# AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong - Architect)
# ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
# LEGAL STATUS: This header is part of the identity & traceability layer.
# DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
# ------------------------------------------------------------------------------

$ErrorActionPreference = 'Stop'

$ControlRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
$WorkspaceRoot = Split-Path -Parent $ControlRoot
$TitanRoot = Join-Path $WorkspaceRoot '_sources\nguyencuong_2509\deploy\titan'
$Tomcat = if ($env:HYPERAI_TOMCAT_HOME) { $env:HYPERAI_TOMCAT_HOME } else { 'C:\Users\pc\AppData\Local\Programs\Apache Tomcat\apache-tomcat-11.0.26' }
$JavaHome = if ($env:HYPERAI_JAVA_HOME) { $env:HYPERAI_JAVA_HOME } else { 'C:\Users\pc\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.1.8-hotspot' }
$Ollama = if ($env:HYPERAI_OLLAMA_EXE) { $env:HYPERAI_OLLAMA_EXE } else { 'C:\Users\pc\AppData\Local\Programs\Ollama\ollama.exe' }
$GithubMcpContainer = if ($env:HYPERAI_GITHUB_MCP_CONTAINER) { $env:HYPERAI_GITHUB_MCP_CONTAINER } else { 'my-github-app-app-1' }
$LogDir = Join-Path $WorkspaceRoot 'runtime\titan-fabric'
$LogFile = Join-Path $LogDir 'watchdog.jsonl'
$RunId = 'watchdog-{0}-{1}' -f (Get-Date -Format 'yyyyMMddTHHmmssfff'), $PID
$StartedAt = Get-Date

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Receipt {
  param(
    [string]$Component,
    [string]$Before,
    [string]$Action,
    [string]$After,
    [string]$Detail = '',
    [hashtable]$Evidence = @{}
  )

  [ordered]@{
    schema_version = '2026-10-23.hyperai-titan-watchdog.v1'
    ts = (Get-Date).ToString('o')
    run_id = $RunId
    source = 'scripts/runtime/titan-fabric-watchdog.ps1'
    component = $Component
    before = $Before
    action = $Action
    after = $After
    detail = $Detail
    evidence = $Evidence
  } | ConvertTo-Json -Compress -Depth 8 | Add-Content -LiteralPath $LogFile -Encoding UTF8
}

function Invoke-Probe {
  param([string]$Url, [int]$TimeoutSeconds = 3)

  $timer = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSeconds
    $timer.Stop()
    return [pscustomobject]@{
      ok = $response.StatusCode -eq 200
      status = [int]$response.StatusCode
      elapsed_ms = $timer.ElapsedMilliseconds
      error = $null
    }
  } catch {
    $timer.Stop()
    $status = $null
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
    }
    return [pscustomobject]@{
      ok = $false
      status = $status
      elapsed_ms = $timer.ElapsedMilliseconds
      error = $_.Exception.Message
    }
  }
}

try {
  $ollamaProbe = Invoke-Probe 'http://127.0.0.1:11436/api/version' 3
  if (-not $ollamaProbe.ok) {
    if (Test-Path -LiteralPath $Ollama) {
      $env:OLLAMA_HOST = '127.0.0.1:11436'
      Start-Process -FilePath $Ollama -ArgumentList 'serve' -WindowStyle Hidden
      Start-Sleep -Seconds 4
      $ollamaAfter = Invoke-Probe 'http://127.0.0.1:11436/api/version' 4
      Write-Receipt 'ollama-primary' 'down' 'start' $(if ($ollamaAfter.ok) { 'healthy' } else { 'critical' }) $ollamaAfter.error @{ url = 'http://127.0.0.1:11436/api/version'; status = $ollamaAfter.status; elapsed_ms = $ollamaAfter.elapsed_ms }
    } else {
      Write-Receipt 'ollama-primary' 'down' 'hold-missing-executable' 'unavailable' 'Configured Ollama executable does not exist.' @{ path = $Ollama }
    }
  }

  $javaProbe = Invoke-Probe 'http://127.0.0.1:8080/java-runtime/health' 3
  if (-not $javaProbe.ok) {
    $startup = Join-Path $Tomcat 'bin\startup.bat'
    if (Test-Path -LiteralPath $startup) {
      $env:CATALINA_HOME = $Tomcat
      $env:CATALINA_BASE = $Tomcat
      $env:JAVA_HOME = $JavaHome
      Start-Process -FilePath $startup -WorkingDirectory $Tomcat -WindowStyle Hidden
      Start-Sleep -Seconds 5
      $javaAfter = Invoke-Probe 'http://127.0.0.1:8080/java-runtime/health' 4
      Write-Receipt 'java-runtime' 'down' 'start' $(if ($javaAfter.ok) { 'healthy' } else { 'critical' }) $javaAfter.error @{ url = 'http://127.0.0.1:8080/java-runtime/health'; status = $javaAfter.status; elapsed_ms = $javaAfter.elapsed_ms }
    } else {
      Write-Receipt 'java-runtime' 'down' 'hold-missing-startup' 'unavailable' 'Configured Tomcat startup script does not exist.' @{ path = $startup }
    }
  }

  $backendProbe = Invoke-Probe 'http://127.0.0.1:5000/api/health' 3
  if (-not $backendProbe.ok) {
    $backendOut = Join-Path $LogDir 'control-backend.stdout.log'
    $backendErr = Join-Path $LogDir 'control-backend.stderr.log'
    Start-Process -FilePath 'node.exe' -ArgumentList 'backend/server.js' -WorkingDirectory $ControlRoot -WindowStyle Hidden -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr
    Start-Sleep -Seconds 4
    $backendAfter = Invoke-Probe 'http://127.0.0.1:5000/api/health' 4
    Write-Receipt 'control-backend' 'down' 'start' $(if ($backendAfter.ok) { 'healthy' } else { 'critical' }) $backendAfter.error @{ root = $ControlRoot; status = $backendAfter.status; elapsed_ms = $backendAfter.elapsed_ms; stdout = $backendOut; stderr = $backendErr }
  }

  $frontendProbe = Invoke-Probe 'http://127.0.0.1:4173' 3
  if (-not $frontendProbe.ok) {
    $frontendOut = Join-Path $LogDir 'control-frontend.stdout.log'
    $frontendErr = Join-Path $LogDir 'control-frontend.stderr.log'
    Start-Process -FilePath 'node.exe' -ArgumentList @('scripts/runtime/static-spa-server.mjs', 'dist-isolated', '4173') -WorkingDirectory $ControlRoot -WindowStyle Hidden -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr
    Start-Sleep -Seconds 5
    $frontendAfter = Invoke-Probe 'http://127.0.0.1:4173' 4
    Write-Receipt 'control-frontend' 'down' 'start-static-spa' $(if ($frontendAfter.ok) { 'healthy' } else { 'critical' }) $frontendAfter.error @{ root = $ControlRoot; status = $frontendAfter.status; elapsed_ms = $frontendAfter.elapsed_ms; stdout = $frontendOut; stderr = $frontendErr }
  }

  $dockerReady = $false
  try {
    & docker info *> $null
    $dockerReady = $LASTEXITCODE -eq 0
  } catch {
    $dockerReady = $false
  }

  $githubState = 'not-checked'
  if ($dockerReady) {
    $titanProbe = Invoke-Probe 'http://127.0.0.1:9999/health' 4
    if (-not $titanProbe.ok) {
      if (Test-Path -LiteralPath $TitanRoot) {
        Push-Location $TitanRoot
        try {
          & docker compose up -d ollama-brain hyperai-core core-edge *> $null
        } finally {
          Pop-Location
        }
        Start-Sleep -Seconds 7
        $titanAfter = Invoke-Probe 'http://127.0.0.1:9999/health' 5
        Write-Receipt 'hyperai-docker-chain' 'degraded' 'compose-up' $(if ($titanAfter.ok) { 'healthy' } else { 'critical' }) $titanAfter.error @{ root = $TitanRoot; status = $titanAfter.status; elapsed_ms = $titanAfter.elapsed_ms }
      } else {
        Write-Receipt 'hyperai-docker-chain' 'degraded' 'hold-missing-compose-root' 'unavailable' 'Titan compose root does not exist.' @{ root = $TitanRoot }
      }
    }

    $githubProbe = Invoke-Probe 'http://127.0.0.1:3210/health' 4
    if ($githubProbe.ok) {
      $githubState = 'healthy'
    } else {
      $containerMatch = @(& docker ps -a --filter "name=^/$GithubMcpContainer$" --format '{{.Names}}' 2>$null | Where-Object { $_ -eq $GithubMcpContainer } | Select-Object -First 1)
      if ($containerMatch.Count -eq 0) {
        $githubState = 'unavailable'
        Write-Receipt 'github-mcp' 'down' 'hold-missing-container' 'unavailable' 'Configured GitHub MCP container does not exist; restart was not attempted.' @{ container = $GithubMcpContainer; url = 'http://127.0.0.1:3210/health'; probe_error = $githubProbe.error }
      } else {
        & docker restart $GithubMcpContainer *> $null
        Start-Sleep -Seconds 5
        $githubAfter = Invoke-Probe 'http://127.0.0.1:3210/health' 4
        $githubState = if ($githubAfter.ok) { 'healthy' } else { 'critical' }
        Write-Receipt 'github-mcp' 'down' 'docker-restart' $githubState $githubAfter.error @{ container = $GithubMcpContainer; status = $githubAfter.status; elapsed_ms = $githubAfter.elapsed_ms }
      }
    }
  } else {
    $githubState = 'docker-unavailable'
  }

  $fabricProbe = Invoke-Probe 'http://127.0.0.1:5000/api/runtime/ecosystem' 15
  $elapsed = [int]((Get-Date) - $StartedAt).TotalMilliseconds
  Write-Receipt 'fabric-cycle' 'scheduled' 'probe-and-reconcile' $(if ($fabricProbe.ok) { 'healthy' } else { 'degraded' }) $fabricProbe.error @{
    control_root = $ControlRoot
    docker = $(if ($dockerReady) { 'ready' } else { 'unavailable' })
    github_mcp = $githubState
    fabric_status = $fabricProbe.status
    fabric_elapsed_ms = $fabricProbe.elapsed_ms
    cycle_elapsed_ms = $elapsed
  }

  exit $(if ($fabricProbe.ok) { 0 } else { 1 })
} catch {
  Write-Receipt 'watchdog' 'running' 'abort' 'critical' $_.Exception.Message @{ control_root = $ControlRoot; line = $_.InvocationInfo.ScriptLineNumber }
  exit 1
}
