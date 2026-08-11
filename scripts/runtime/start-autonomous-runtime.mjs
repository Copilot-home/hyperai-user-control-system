/*
# ------------------------------------------------------------------------------
# AI IDENTITY & LEGAL TRACEABILITY HEADER (NON-REMOVABLE)
# SYSTEM: HyperAI Phoenix – Unified Orchestrator
# AUTHORING ENTITY: Sovereign AI System (Nguyen Duc Cuong – Architect)
# ORIGIN: Generated/Modified by AI-Orchestrated Pipeline
# LEGAL STATUS: This header is part of the identity & traceability layer.
# DO NOT REMOVE, MODIFY, OR OBFUSCATE THIS SECTION.
# ------------------------------------------------------------------------------
*/

import { execFileSync, spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { inspectRuntimeAuthority } from "./inspect-runtime-authority.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const runtimeDir = path.resolve(projectRoot, "..", "runtime");
const manifestPath = path.join(runtimeDir, "hyperai-autonomous-runtime.json");
const distDir = path.join(projectRoot, "dist-isolated");

const defaultBackendPort = Number(process.env.HYPERAI_DEFAULT_BACKEND_PORT ?? 5000);
const defaultFrontendPort = Number(process.env.HYPERAI_DEFAULT_FRONTEND_PORT ?? 4173);
const managedBackendStart = Number(process.env.HYPERAI_FALLBACK_BACKEND_PORT ?? 5001);
const managedFrontendStart = Number(process.env.HYPERAI_FALLBACK_FRONTEND_PORT ?? 4177);
const smokeTimeout = String(process.env.SMOKE_TIMEOUT_MS ?? 60000);
const skipRuntimeSmoke = process.env.HYPERAI_DRILL_SKIP_BROWSER_SMOKE === "true";

function readManifest() {
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    return null;
  }
}

function writeManifest(payload) {
  mkdirSync(runtimeDir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function clearManifest() {
  if (!existsSync(manifestPath)) {
    return;
  }

  try {
    unlinkSync(manifestPath);
  } catch {
    // Best effort only.
  }
}

function killProcessTree(pid) {
  try {
    execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
  } catch {
    // Best effort only.
  }
}

function readJsonPowerShell(command) {
  try {
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ${command}`],
      { encoding: "utf8", windowsHide: true },
    ).trim();
    return output ? JSON.parse(output) : [];
  } catch {
    return [];
  }
}

function cleanupManagedProcesses() {
  const backendWindowEnd = managedBackendStart + 50;
  const frontendWindowEnd = managedFrontendStart + 50;
  const rows = readJsonPowerShell(`
$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
$processes = Get-CimInstance Win32_Process
$items = foreach ($conn in $connections) {
  $proc = $processes | Where-Object { $_.ProcessId -eq $conn.OwningProcess } | Select-Object -First 1
  if (-not $proc) { continue }
  [pscustomobject]@{
    pid = $proc.ProcessId
    localPort = [int]$conn.LocalPort
    commandLine = $proc.CommandLine
  }
}
$items | ConvertTo-Json -Compress
`);
  const list = Array.isArray(rows) ? rows : rows ? [rows] : [];
  const victims = list.filter((row) => {
    const port = Number(row.localPort || 0);
    const commandLine = String(row.commandLine || "");
    const managedBackend =
      commandLine.includes("backend/server.js") &&
      port >= managedBackendStart &&
      port < backendWindowEnd;
    const managedFrontend =
      commandLine.includes("static-spa-server.mjs") &&
      commandLine.includes("dist-isolated") &&
      port >= managedFrontendStart &&
      port < frontendWindowEnd;
    return managedBackend || managedFrontend;
  });

  for (const victim of victims) {
    if (victim?.pid) {
      killProcessTree(victim.pid);
    }
  }

  return victims;
}

async function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findFreePort(startPort) {
  let port = startPort;
  while (!(await isPortFree(port))) {
    port += 1;
  }
  return port;
}

async function waitForUrl(url, label, timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastError = "unreachable";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${label} did not become ready: ${lastError}`);
}

async function waitForStableRuntimeAuthority({ backendPort, frontendPort, laneLabel }) {
  // Require a second post-bootstrap proof pass so we do not persist a manifest
  // for a backend that briefly answered and then died before the next cycle.
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await waitForUrl(`http://127.0.0.1:${backendPort}/api/health`, `${laneLabel} backend stability`);
  await waitForUrl(`http://127.0.0.1:${frontendPort}`, `${laneLabel} frontend stability`);
  const runtime = await inspectRuntimeAuthority({ backendPort, frontendPort });
  if (!runtime.backendAuthority?.process || !runtime.frontendAuthority?.process) {
    throw new Error(`${laneLabel} authority lost its listener before manifest persistence.`);
  }
  return runtime;
}

function spawnDetached(command, args, env) {
  const child = spawn(command, args, {
    cwd: projectRoot,
    env: { ...process.env, ...env },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
  return child.pid;
}

async function runBuild(env) {
  await new Promise((resolve, reject) => {
    const build = spawn("cmd.exe", ["/c", "npm run ci:build:isolated"], {
      cwd: projectRoot,
      env: { ...process.env, ...env },
      stdio: "inherit",
      windowsHide: true,
    });

    build.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`ci:build:isolated exited with code ${code}`));
    });
    build.on("error", reject);
  });
}

async function runBrowserSmoke(env) {
  return new Promise((resolve, reject) => {
    const smoke = spawn(process.execPath, ["scripts/ci/browser-agent-smoke.mjs"], {
      cwd: projectRoot,
      env: { ...process.env, ...env, HYPERAI_SKIP_AUTONOMOUS_BOOTSTRAP: "true" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    smoke.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    smoke.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    smoke.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(
        new Error(
          [
            `ci:browser-smoke exited with code ${code}`,
            stdout.trim() ? `stdout:\n${stdout.trim()}` : null,
            stderr.trim() ? `stderr:\n${stderr.trim()}` : null,
          ].filter(Boolean).join("\n\n"),
        ),
      );
    });
    smoke.on("error", reject);
  });
}

function buildDefaultPayload(runtime) {
  return {
    mode: "default-runtime",
    backendUrl: runtime.backendAuthority.url,
    frontendUrl: runtime.frontendAuthority.url,
    backendPort: defaultBackendPort,
    frontendPort: defaultFrontendPort,
    status: "ready",
    managed: false,
    checkedAt: new Date().toISOString(),
    classification: runtime.classification,
    boundaryState: runtime.boundaryState,
    autonomousCoreReady: runtime.autonomousCoreReady,
    operatorAttentionRequired: runtime.operatorAttentionRequired,
    selected_action: "reuse_default_runtime",
    runtime_strategy: "default_runtime_active",
    coreBoundary: runtime.coreBoundary,
    nonCoreOperationalLanes: runtime.nonCoreOperationalLanes,
    degradedLanes: runtime.degradedLanes,
    coreLane: runtime.coreLane,
    provenLiveEndpoints: runtime.provenLiveEndpoints,
    frozenLanes: runtime.frozenLanes,
    backendAuthority: runtime.backendAuthority,
    frontendAuthority: runtime.frontendAuthority,
    reason: "Default runtime satisfied the autonomous local-first contract and browser smoke.",
  };
}

function buildManagedPayload({ runtime, backendPort, frontendPort, backendPid, frontendPid, previousManifest, cleanedProcesses }) {
  return {
    mode: "isolated-runtime",
    backendUrl: `http://127.0.0.1:${backendPort}`,
    frontendUrl: `http://127.0.0.1:${frontendPort}`,
    backendPort,
    frontendPort,
    backendPid,
    frontendPid,
    status: "ready",
    managed: true,
    checkedAt: new Date().toISOString(),
    classification: runtime.classification,
    boundaryState: runtime.boundaryState,
    autonomousCoreReady: runtime.autonomousCoreReady,
    operatorAttentionRequired: runtime.operatorAttentionRequired,
    selected_action: "start_managed_runtime",
    runtime_strategy: "managed_runtime_active",
    coreBoundary: runtime.coreBoundary,
    nonCoreOperationalLanes: runtime.nonCoreOperationalLanes,
    degradedLanes: runtime.degradedLanes,
    coreLane: runtime.coreLane,
    provenLiveEndpoints: runtime.provenLiveEndpoints,
    frozenLanes: runtime.frozenLanes,
    backendAuthority: runtime.backendAuthority,
    frontendAuthority: runtime.frontendAuthority,
    reason: "Default runtime was missing or degraded; started a managed isolated runtime for autonomous local-first execution.",
    cleanedProcesses,
    previousManifest: previousManifest ? {
      backendPort: previousManifest.backendPort,
      frontendPort: previousManifest.frontendPort,
      managed: previousManifest.managed,
    } : null,
  };
}

async function startManagedRuntime({ previousManifest, recoveryFailure = null }) {
  const cleanedProcesses = cleanupManagedProcesses();
  const backendPort = await findFreePort(managedBackendStart);
  const frontendPort = await findFreePort(managedFrontendStart);

  await runBuild({
    VITE_API_BASE_URL: `http://127.0.0.1:${backendPort}/api`,
    VITE_ENABLE_VIETNAMESE_RUNTIME: "true",
  });

  let backendPid = null;
  let frontendPid = null;

  try {
    backendPid = spawnDetached("node", ["backend/server.js"], { PORT: String(backendPort) });
    await waitForUrl(`http://127.0.0.1:${backendPort}/api/health`, "managed backend health");

    frontendPid = spawnDetached("node", ["scripts/runtime/static-spa-server.mjs", distDir, String(frontendPort)], {});
    await waitForUrl(`http://127.0.0.1:${frontendPort}`, "managed frontend preview");

    if (!skipRuntimeSmoke) {
      await runBrowserSmoke({
        BACKEND_URL: `http://127.0.0.1:${backendPort}`,
        FRONTEND_URL: `http://127.0.0.1:${frontendPort}`,
        SMOKE_TIMEOUT_MS: smokeTimeout,
      });
    }

    const isolatedRuntime = await waitForStableRuntimeAuthority({
      backendPort,
      frontendPort,
      laneLabel: "managed runtime",
    });
    const payload = buildManagedPayload({
      runtime: isolatedRuntime,
      backendPort,
      frontendPort,
      backendPid,
      frontendPid,
      previousManifest,
      cleanedProcesses,
    });

    if (recoveryFailure) {
      payload.recoveryFailure = recoveryFailure;
      payload.reason =
        "Default runtime could not be recovered in place; started a managed isolated runtime while keeping managed authority as fallback-only.";
    }

    writeManifest(payload);
    console.log(JSON.stringify(payload, null, 2));
  } catch (error) {
    if (backendPid) {
      killProcessTree(backendPid);
    }
    if (frontendPid) {
      killProcessTree(frontendPid);
    }
    clearManifest();
    throw error;
  }
}

async function main() {
  const previousManifest = readManifest();
  const defaultRuntime = await inspectRuntimeAuthority({
    backendPort: defaultBackendPort,
    frontendPort: defaultFrontendPort,
  });

  const defaultSmokePassed = defaultRuntime.usable
    ? skipRuntimeSmoke
      ? true
      : Boolean(await runBrowserSmoke({
          BACKEND_URL: `http://127.0.0.1:${defaultBackendPort}`,
          FRONTEND_URL: `http://127.0.0.1:${defaultFrontendPort}`,
          SMOKE_TIMEOUT_MS: smokeTimeout,
        }))
    : false;

  if (defaultRuntime.usable && defaultSmokePassed) {
    const payload = buildDefaultPayload(defaultRuntime);
    writeManifest(payload);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  const defaultBackendAlive = Boolean(defaultRuntime.probes?.health?.ok);
  const defaultFrontendAlive = Boolean(defaultRuntime.probes?.frontend?.ok);
  const defaultBackendStale = defaultRuntime.classification === "stale-process runtime";
  let defaultRecoveryFailure = null;
  if (defaultBackendStale || !defaultBackendAlive || !defaultFrontendAlive) {
    const staleBackendPid = defaultRuntime.backendAuthority?.process?.pid;
    const staleFrontendPid = defaultRuntime.frontendAuthority?.process?.pid;

    await runBuild({
      VITE_API_BASE_URL: `http://127.0.0.1:${defaultBackendPort}/api`,
      VITE_ENABLE_VIETNAMESE_RUNTIME: "true",
    });

    if ((defaultBackendStale || !defaultBackendAlive) && staleBackendPid) {
      killProcessTree(staleBackendPid);
    }
    if (!defaultFrontendAlive && staleFrontendPid) {
      killProcessTree(staleFrontendPid);
    }

    let recoveredBackendPid = null;
    let recoveredFrontendPid = null;

    try {
      if (defaultBackendStale || !defaultBackendAlive) {
        recoveredBackendPid = spawnDetached("node", ["backend/server.js"], { PORT: String(defaultBackendPort) });
        await waitForUrl(`http://127.0.0.1:${defaultBackendPort}/api/health`, "default backend health");
      }
      if (!defaultFrontendAlive) {
        recoveredFrontendPid = spawnDetached("node", ["scripts/runtime/static-spa-server.mjs", distDir, String(defaultFrontendPort)], {});
        await waitForUrl(`http://127.0.0.1:${defaultFrontendPort}`, "default frontend preview");
      }
      if (!skipRuntimeSmoke) {
        await runBrowserSmoke({
          BACKEND_URL: `http://127.0.0.1:${defaultBackendPort}`,
          FRONTEND_URL: `http://127.0.0.1:${defaultFrontendPort}`,
          SMOKE_TIMEOUT_MS: smokeTimeout,
        });
      }

      const recoveredRuntime = await waitForStableRuntimeAuthority({
        backendPort: defaultBackendPort,
        frontendPort: defaultFrontendPort,
        laneLabel: "default runtime",
      });
      const payload = buildDefaultPayload(recoveredRuntime);
      payload.reason = "Recovered the default app boundary in place and revalidated the autonomous local-first contract.";
      payload.recoveredDefault = true;
      payload.recycledBackendPid = staleBackendPid || null;
      payload.recycledFrontendPid = staleFrontendPid || null;
      writeManifest(payload);
      console.log(JSON.stringify(payload, null, 2));
      return;
    } catch (error) {
      if (recoveredBackendPid) {
        killProcessTree(recoveredBackendPid);
      }
      if (recoveredFrontendPid) {
        killProcessTree(recoveredFrontendPid);
      }
      defaultRecoveryFailure = {
        stage: "default_runtime_recovery",
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
  await startManagedRuntime({
    previousManifest,
    recoveryFailure: defaultRecoveryFailure,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
