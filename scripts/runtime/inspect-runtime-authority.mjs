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

import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const backendServerPath = path.join(projectRoot, "backend", "server.js");
const CORE_BOUNDARY = ["dashboard", "symphony", "runtime", "autonomy"];

function readBackendFileTruth() {
  const stats = statSync(backendServerPath);
  return {
    path: backendServerPath,
    exists: existsSync(backendServerPath),
    modifiedAt: stats.mtime.toISOString(),
    size: stats.size,
  };
}

function runPowerShellJson(command) {
  try {
    const output = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-Command", `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; ${command}`],
      { encoding: "utf8", windowsHide: true },
    ).trim();
    return output ? JSON.parse(output) : null;
  } catch {
    return null;
  }
}

function getListeningProcess(port) {
  const command = `
$conn = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $conn) { return }
$proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)"
$creationDate = $null
if ($proc -and $proc.CreationDate) {
  $creationDate = $proc.CreationDate.ToString("o")
}
[pscustomobject]@{
  pid = if ($proc) { $proc.ProcessId } else { $conn.OwningProcess }
  commandLine = if ($proc) { $proc.CommandLine } else { $null }
  creationDate = $creationDate
  localPort = ${port}
} | ConvertTo-Json -Compress
`;
  return runPowerShellJson(command);
}

async function probeJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    return { ok: response.ok, status: response.status, body: parsed };
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

async function probeText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, body: text };
  } catch (error) {
    return { ok: false, status: null, error: error instanceof Error ? error.message : String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function inspectRuntimeAuthority({
  backendPort = 5000,
  frontendPort = 4173,
} = {}) {
  const backendUrl = `http://127.0.0.1:${backendPort}`;
  const frontendUrl = `http://127.0.0.1:${frontendPort}`;
  const backendFile = readBackendFileTruth();
  const backendProcess = getListeningProcess(backendPort);
  const frontendProcess = getListeningProcess(frontendPort);

  const health = await probeJson(`${backendUrl}/api/health`);
  const symphonyStatus = await probeJson(`${backendUrl}/api/symphony/status`);
  const autonomyStatus = await probeJson(`${backendUrl}/api/autonomy/status`);
  const vietnameseAnalyze = await probeJson(`${backendUrl}/api/vietnamese/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Xin chao HyperAI",
      analysis_type: "full",
      include_cultural_context: true,
      include_traditional_wisdom: true,
    }),
  });
  const empathyStatus = await probeJson(`${backendUrl}/api/empathy/status`);
  const notebooklmStatus = await probeJson(`${backendUrl}/api/notebooklm/status`);
  const userProbe = await probeJson(`${backendUrl}/api/users/runtime-probe`);
  const frontend = await probeText(frontendUrl);

  const provenLiveEndpoints = [];
  if (health.ok) provenLiveEndpoints.push("GET /api/health");
  if (symphonyStatus.ok) provenLiveEndpoints.push("GET /api/symphony/status");
  if (autonomyStatus.ok) provenLiveEndpoints.push("GET /api/autonomy/status");
  if (vietnameseAnalyze.ok) provenLiveEndpoints.push("POST /api/vietnamese/analyze");
  if (empathyStatus.ok) provenLiveEndpoints.push("GET /api/empathy/status");
  if (notebooklmStatus.ok) provenLiveEndpoints.push("GET /api/notebooklm/status");
  if (userProbe.ok) provenLiveEndpoints.push("GET /api/users/:id");

  const staleProcess =
    Boolean(backendProcess?.creationDate) &&
    new Date(backendProcess.creationDate).getTime() < new Date(backendFile.modifiedAt).getTime();

  const frontendLive = frontend.ok;
  const symphonyCoreLive = health.ok && symphonyStatus.ok;
  const autonomyCoreLive =
    autonomyStatus.ok &&
    typeof autonomyStatus.body === "object" &&
    autonomyStatus.body !== null &&
    autonomyStatus.body.active === true &&
    autonomyStatus.body.mode === "autonomous" &&
    autonomyStatus.body.heartbeat?.status === "healthy" &&
    "currentObjective" in autonomyStatus.body;
  const usable = frontendLive && symphonyCoreLive && autonomyCoreLive && !staleProcess;
  const classification = staleProcess
    ? "stale-process runtime"
    : usable
      ? "autonomous-core-ready"
      : frontendLive && symphonyCoreLive
        ? "operational-without-autonomy"
        : "degraded/local-only";
  const boundaryState = usable
    ? "autonomous"
    : frontendLive && symphonyCoreLive
      ? "operational"
      : health.ok || frontendLive || backendProcess || frontendProcess
        ? "recoverable"
        : "dormant";
  const safeRecoveryAvailable = staleProcess || !usable;
  const nonCoreOperationalLanes = [];
  if (empathyStatus.ok) nonCoreOperationalLanes.push("empathy");
  if (vietnameseAnalyze.ok) nonCoreOperationalLanes.push("vietnamese");
  if (notebooklmStatus.ok) nonCoreOperationalLanes.push("notebooklm");
  if (userProbe.ok) nonCoreOperationalLanes.push("users");
  const degradedLanes = ["chat"];
  if (staleProcess) degradedLanes.push("default-runtime");
  const routineDecisions = [
    staleProcess
      ? "Default runtime listener is stale; prefer managed or recycled authority."
      : "Default runtime listener is current enough for direct use.",
    usable
      ? "App boundary can handle routine backend/frontend routing without manual relay."
      : "App boundary still needs an authority bootstrap before claiming autonomous behavior.",
    autonomyCoreLive
      ? "Autonomy contract is present at the app boundary."
      : "Autonomy contract is missing or incomplete on the current listener.",
  ];

  return {
    inspectedAt: new Date().toISOString(),
    classification,
    boundaryState,
    autonomousCoreReady: usable,
    operatorAttentionRequired: !usable,
    usable,
    safeRecoveryAvailable,
    routineDecisions,
    coreBoundary: CORE_BOUNDARY,
    nonCoreOperationalLanes,
    degradedLanes,
    backendAuthority: {
      path: "backend/server.js",
      url: backendUrl,
      port: backendPort,
      process: backendProcess,
      file: backendFile,
    },
    frontendAuthority: {
      path: "src/main.tsx -> src/App.tsx",
      url: frontendUrl,
      port: frontendPort,
      process: frontendProcess,
    },
    coreLane: {
      dashboard: frontendLive,
      symphony: symphonyCoreLive,
      autonomy: autonomyCoreLive,
      chat: "degraded/local-only",
    },
    provenLiveEndpoints,
    frozenLanes: [
      "backend/server.ts",
      "websocket clients",
      !autonomyStatus.ok ? "autonomy" : null,
      !empathyStatus.ok ? "empathy" : null,
      !notebooklmStatus.ok ? "notebooklm" : null,
      !userProbe.ok ? "user" : null,
    ].filter(Boolean),
    probes: {
      health,
      symphonyStatus,
      autonomyStatus,
      vietnameseAnalyze,
      empathyStatus,
      notebooklmStatus,
      userProbe,
      frontend: {
        ok: frontend.ok,
        status: frontend.status,
        titleDetected: typeof frontend.body === "string" && frontend.body.includes("HyperAI User Control System"),
      },
    },
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (invokedPath && import.meta.url === invokedPath) {
  const payload = await inspectRuntimeAuthority({
    backendPort: Number(process.env.HYPERAI_DEFAULT_BACKEND_PORT ?? 5000),
    frontendPort: Number(process.env.HYPERAI_DEFAULT_FRONTEND_PORT ?? 4173),
  });
  console.log(JSON.stringify(payload, null, 2));
}
