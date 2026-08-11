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

import { existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const manifestPath = path.resolve(projectRoot, "..", "runtime", "hyperai-autonomous-runtime.json");
const fallbackBackendStart = Number(process.env.HYPERAI_FALLBACK_BACKEND_PORT ?? 5001);
const fallbackFrontendStart = Number(process.env.HYPERAI_FALLBACK_FRONTEND_PORT ?? 4177);

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

function cleanupManagedIsolatedProcesses() {
  const backendWindowEnd = fallbackBackendStart + 50;
  const frontendWindowEnd = fallbackFrontendStart + 50;
  const candidates = readJsonPowerShell(`
$connections = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue
$processes = Get-CimInstance Win32_Process
$rows = foreach ($proc in $processes) {
  $conn = $connections | Where-Object { $_.OwningProcess -eq $proc.ProcessId } | Select-Object -First 1
  [pscustomobject]@{
    pid = $proc.ProcessId
    localPort = if ($conn) { [int]$conn.LocalPort } else { 0 }
    commandLine = $proc.CommandLine
  }
}
$rows | ConvertTo-Json -Compress
`);

  const rows = Array.isArray(candidates) ? candidates : candidates ? [candidates] : [];
  const isolated = rows.filter((row) => {
    const commandLine = String(row.commandLine || "");
    const localPort = Number(row.localPort || 0);
    const isIsolatedBackend =
      commandLine.includes("backend/server.js") &&
      localPort >= fallbackBackendStart &&
      localPort < backendWindowEnd;
    const isIsolatedFrontend =
      commandLine.includes("static-spa-server.mjs") &&
      commandLine.includes("dist-isolated") &&
      localPort >= fallbackFrontendStart &&
      localPort < frontendWindowEnd;
    const isLauncher = commandLine.includes("start-autonomous-runtime.mjs");
    return isIsolatedBackend || isIsolatedFrontend || isLauncher;
  });

  for (const row of isolated) {
    if (row?.pid) {
      try {
        execFileSync("taskkill", ["/PID", String(row.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      } catch {
        // Best effort only.
      }
    }
  }

  return isolated.length;
}

const cleanedCount = cleanupManagedIsolatedProcesses();

if (!existsSync(manifestPath)) {
  console.log(`No autonomous runtime manifest found. Cleaned ${cleanedCount} managed listener(s).`);
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

if (manifest.managed) {
  for (const pid of [manifest.backendPid, manifest.frontendPid]) {
    if (pid) {
      try {
        execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      } catch {
        // Best effort only. The process may already be gone.
      }
    }
  }
}

unlinkSync(manifestPath);
console.log(`Autonomous runtime manifest cleared. Cleaned ${cleanedCount} managed listener(s).`);
