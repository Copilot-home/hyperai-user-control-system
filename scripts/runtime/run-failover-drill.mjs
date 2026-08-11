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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { inspectRuntimeAuthority } from "./inspect-runtime-authority.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const workspaceRoot = path.resolve(projectRoot, "..");
const runtimeDir = path.join(workspaceRoot, "runtime");
const manifestPath = path.join(runtimeDir, "hyperai-autonomous-runtime.json");
const proofPath = path.join(runtimeDir, "hyperai-autonomous-boundary-proof.json");
const drillArtifactPath = path.join(runtimeDir, "hyperai-failover-drill.json");
const defaultBackendPort = Number(process.env.HYPERAI_DEFAULT_BACKEND_PORT ?? 5000);
const defaultFrontendPort = Number(process.env.HYPERAI_DEFAULT_FRONTEND_PORT ?? 4173);

function readJsonFile(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, payload) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function runJsonCommand(args, env = {}) {
  const output = execFileSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
    env: { ...process.env, ...env },
  });
  let cursor = output.length;

  while (cursor > 0) {
    const start = output.lastIndexOf("{", cursor);
    if (start === -1) {
      break;
    }

    const candidate = output.slice(start).trim();
    if (!candidate) {
      cursor = start - 1;
      continue;
    }

    try {
      return JSON.parse(candidate);
    } catch {
      cursor = start - 1;
    }
  }

  throw new Error(`No JSON payload found in command output.\n${output.trim()}`);
}

function runCommand(args, env = {}) {
  execFileSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

async function waitForPortFree(port, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const runtime = await inspectRuntimeAuthority({
      backendPort: defaultBackendPort,
      frontendPort: defaultFrontendPort,
    });
    const occupied = port === defaultBackendPort
      ? Boolean(runtime.backendAuthority?.process?.pid)
      : Boolean(runtime.frontendAuthority?.process?.pid);
    if (!occupied) {
      return;
    }
    await sleep(250);
  }

  throw new Error(`Port ${port} did not clear within ${timeoutMs}ms.`);
}

function spawnPortBlocker(port, label) {
  const child = spawn(
    process.execPath,
    [
      "-e",
      [
        "const { createServer } = require('node:net');",
        `const server = createServer((socket) => socket.end('${label}'));`,
        "server.listen(process.argv[1], '127.0.0.1');",
        "setInterval(() => {}, 1 << 30);",
      ].join(" "),
      String(port),
    ],
    {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  child.unref();
  return child.pid;
}

function updateBlockedMemory(summary, nextAction) {
  execFileSync(
    "python",
    [
      "tools/update_memory.py",
      "--focus",
      "HyperAI runtime failover drill",
      "--summary",
      summary,
      "--blocker",
      "blocked by runtime safety",
      "--next",
      nextAction,
    ],
    {
      cwd: workspaceRoot,
      stdio: "inherit",
      windowsHide: true,
    },
  );
}

function buildSnapshot({ label, ensureResult, runtime, proof, manifest }) {
  return {
    label,
    checked_at: new Date().toISOString(),
    selected_action: ensureResult?.action ?? manifest?.selected_action ?? null,
    boundary_state: runtime?.boundaryState ?? manifest?.boundaryState ?? null,
    authority_mode: manifest?.managed ? "managed" : "default",
    backend_url: manifest?.backendUrl ?? runtime?.backendAuthority?.url ?? null,
    frontend_url: manifest?.frontendUrl ?? runtime?.frontendAuthority?.url ?? null,
    requires_operator_relay: runtime ? !runtime.autonomousCoreReady : null,
    runtime_strategy: manifest?.runtime_strategy ?? null,
    proof_selected_action: proof?.selected_action ?? null,
  };
}

async function main() {
  const artifact = {
    status: "started",
    checked_at: new Date().toISOString(),
    drill_contract: "hyperai-failover-drill-v1",
    default_authority_ports: [defaultBackendPort, defaultFrontendPort],
    operator_relay_avoided: true,
    canonical_authority_restored: false,
    branch_b_allowed: false,
    abort_reason: null,
    snapshots: {},
  };
  const blockerPids = [];

  try {
    const preflightEnsure = runJsonCommand(["scripts/runtime/ensure-autonomous-runtime.mjs"]);
    const preflightManifest = readJsonFile(manifestPath);
    const preflightProof = readJsonFile(proofPath);
    const preflightRuntime = await inspectRuntimeAuthority({
      backendPort: defaultBackendPort,
      frontendPort: defaultFrontendPort,
    });

    artifact.snapshots.pre_drill = buildSnapshot({
      label: "pre_drill",
      ensureResult: preflightEnsure,
      runtime: preflightRuntime,
      proof: preflightProof,
      manifest: preflightManifest,
    });

    if (preflightEnsure?.action !== "reuse_default_runtime" || !preflightRuntime?.usable) {
      throw new Error("Default authority was not autonomous-ready before the failover drill.");
    }

    const backendPid = preflightRuntime.backendAuthority?.process?.pid;
    const frontendPid = preflightRuntime.frontendAuthority?.process?.pid;
    if (!backendPid || !frontendPid) {
      throw new Error("Could not resolve default authority PIDs for the failover drill.");
    }

    killProcessTree(backendPid);
    killProcessTree(frontendPid);
    await waitForPortFree(defaultBackendPort);
    await waitForPortFree(defaultFrontendPort);

    blockerPids.push(spawnPortBlocker(defaultBackendPort, "hyperai-failover-backend-blocker"));
    blockerPids.push(spawnPortBlocker(defaultFrontendPort, "hyperai-failover-frontend-blocker"));
    await sleep(750);

    const duringManifest = runJsonCommand(
      ["scripts/runtime/start-autonomous-runtime.mjs"],
      { HYPERAI_DRILL_SKIP_BROWSER_SMOKE: "true" },
    );
    const duringRuntime = await inspectRuntimeAuthority({
      backendPort: Number(duringManifest.backendPort),
      frontendPort: Number(duringManifest.frontendPort),
    });
    artifact.snapshots.during_drill = buildSnapshot({
      label: "during_drill",
      ensureResult: { action: duringManifest.selected_action },
      runtime: duringRuntime,
      proof: preflightProof,
      manifest: duringManifest,
    });

    if (!duringManifest.managed || duringManifest.selected_action !== "start_managed_runtime") {
      throw new Error("Managed fallback did not activate during the failover drill.");
    }

    if (!duringManifest.recoveryFailure) {
      throw new Error("Managed fallback was activated without recording the default recovery failure.");
    }

    for (const blockerPid of blockerPids.splice(0)) {
      killProcessTree(blockerPid);
    }
    await sleep(750);

    runCommand(["scripts/runtime/stop-autonomous-runtime.mjs"]);
    const restoredManifest = runJsonCommand(["scripts/runtime/start-autonomous-runtime.mjs"]);
    const postEnsure = runJsonCommand(["scripts/runtime/ensure-autonomous-runtime.mjs"]);
    const postRuntime = await inspectRuntimeAuthority({
      backendPort: defaultBackendPort,
      frontendPort: defaultFrontendPort,
    });
    artifact.snapshots.post_drill = buildSnapshot({
      label: "post_drill",
      ensureResult: postEnsure,
      runtime: postRuntime,
      proof: readJsonFile(proofPath),
      manifest: restoredManifest,
    });

    artifact.canonical_authority_restored =
      postEnsure?.action === "reuse_default_runtime" &&
      postRuntime?.usable === true &&
      restoredManifest?.managed === false;
    artifact.branch_b_allowed = artifact.canonical_authority_restored;
    artifact.status = artifact.canonical_authority_restored ? "ok" : "aborted";

    if (!artifact.canonical_authority_restored) {
      artifact.abort_reason = "Default authority did not recover cleanly after the failover drill.";
      updateBlockedMemory(
        "Failover drill reached managed fallback but did not restore the default 5000/4173 authority cleanly.",
        "Restore the default runtime authority and rerun the failover drill before any Figma Code Connect work.",
      );
      process.exitCode = 1;
    }
  } catch (error) {
    artifact.status = "aborted";
    artifact.abort_reason = error instanceof Error ? error.message : String(error);
    artifact.branch_b_allowed = false;
    artifact.canonical_authority_restored = false;
    updateBlockedMemory(
      `Failover drill aborted: ${artifact.abort_reason}`,
      "Restore the default runtime authority and rerun the failover drill before any Figma Code Connect work.",
    );
    process.exitCode = 1;
  } finally {
    for (const blockerPid of blockerPids) {
      killProcessTree(blockerPid);
    }
    artifact.operator_relay_avoided = true;
    writeJsonFile(drillArtifactPath, artifact);
    console.log(JSON.stringify(artifact, null, 2));
  }
}

await main();
