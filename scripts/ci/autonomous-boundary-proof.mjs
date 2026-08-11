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
import process from "node:process";
import path from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createVerificationSyncEngine } from "./verification-sync-engine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const timeoutMs = Number(process.env.SMOKE_TIMEOUT_MS ?? 90000);
const runtimeDir = path.resolve(projectRoot, "..", "runtime");
const manifestPath = path.join(runtimeDir, "hyperai-autonomous-runtime.json");
const proofPath = path.join(runtimeDir, "hyperai-autonomous-boundary-proof.json");
const verificationSync = createVerificationSyncEngine({
  projectRoot,
  runtimeDir,
  source: "autonomous-boundary-proof",
});

function runJsonCommand(args) {
  const output = execFileSync(process.execPath, args, {
    cwd: projectRoot,
    encoding: "utf8",
    windowsHide: true,
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

function runBrowserSmoke(backendUrl, frontendUrl) {
  execFileSync(
    process.execPath,
    ["scripts/ci/browser-agent-smoke.mjs"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      windowsHide: true,
      stdio: "inherit",
      env: {
        ...process.env,
        BACKEND_URL: backendUrl,
        FRONTEND_URL: frontendUrl,
        HYPERAI_SKIP_AUTONOMOUS_BOOTSTRAP: "true",
        SMOKE_TIMEOUT_MS: String(timeoutMs),
      },
    },
  );
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function waitForCondition(label, predicate) {
  const startedAt = Date.now();
  let lastError = "condition not met";

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const value = await predicate();
      if (value) {
        return value;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${label} did not stabilize within ${timeoutMs}ms: ${lastError}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readPolicyManifest() {
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    return manifest.policy || null;
  } catch {
    return null;
  }
}

function writeProofArtifact(payload) {
  mkdirSync(runtimeDir, { recursive: true });
  writeFileSync(proofPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function verifyBrowserShell({ frontendUrl }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let autoSync = null;

  try {
    autoSync = await verificationSync.verifyPageContract({
      surface: "autonomy-control-plane",
      page,
      frontendUrl,
      route: "/symphony-control",
      expectedMarkers: ["Autonomy Control Plane", "Boundary State", "Autonomous Policy Authority"],
      storageKeys: ["hyperai_autonomy_boundary_snapshot"],
      selectors: [
        {
          label: "autonomy-heading",
          strategies: [
            { type: "role", role: "heading", options: { name: "Autonomy Control Plane" } },
            { type: "text", text: "Autonomy Control Plane", options: { exact: true } },
          ],
        },
        {
          label: "boundary-state",
          strategies: [
            { type: "role", role: "heading", options: { name: "Boundary State", exact: true } },
            { type: "text", text: "Boundary State", options: { exact: true } },
          ],
        },
        {
          label: "policy-authority",
          strategies: [
            { type: "text", text: "Autonomous Policy Authority", options: { exact: true } },
            { type: "text", text: "Policy Authority", options: { exact: false } },
          ],
        },
      ],
      timeoutMs,
    });

    const autonomyUrl = new URL("/symphony-control", frontendUrl).toString();
    await page.goto(autonomyUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    await page.locator("body").waitFor({ state: "visible", timeout: timeoutMs });
    await page.getByRole("heading", { name: "Autonomy Control Plane" }).waitFor({ timeout: timeoutMs });
    await page.getByText("Boundary State", { exact: true }).waitFor({ timeout: timeoutMs });
    await page.getByText("Autonomous Policy Authority", { exact: true }).waitFor({ timeout: timeoutMs });

    const shellState = await page.evaluate(() => {
      const raw = window.localStorage.getItem("hyperai_autonomy_boundary_snapshot");
      return raw ? JSON.parse(raw) : null;
    });

    assert(shellState, "Browser shell did not persist an autonomy boundary snapshot.");
    assert(shellState.state === "autonomous", `Browser shell boundary snapshot drifted to ${shellState.state}.`);

    return {
      shellBoundaryState: shellState.state,
      shellRecoveryAction: shellState.recoveryAction ?? null,
      shellRecoveryAttempts: shellState.recoveryAttempts ?? null,
      autoSync,
    };
  } finally {
    await browser.close();
  }
}

async function main() {
  const ensureResult = runJsonCommand(["scripts/runtime/ensure-autonomous-runtime.mjs"]);
  const manifest = ensureResult?.manifest ?? {
    mode: ensureResult?.action === "reuse_managed_runtime" ? "isolated-runtime" : "default-runtime",
    backendUrl: ensureResult?.runtime?.backendAuthority?.url,
    frontendUrl: ensureResult?.runtime?.frontendAuthority?.url,
    backendPort: ensureResult?.runtime?.backendAuthority?.port,
    frontendPort: ensureResult?.runtime?.frontendAuthority?.port,
    status: ensureResult?.runtime?.usable ? "ready" : "unusable",
    managed: ensureResult?.action === "reuse_managed_runtime",
    classification: ensureResult?.runtime?.classification,
    boundaryState: ensureResult?.runtime?.boundaryState,
    autonomousCoreReady: ensureResult?.runtime?.autonomousCoreReady,
    operatorAttentionRequired: ensureResult?.runtime?.operatorAttentionRequired,
    selected_action: ensureResult?.action,
    runtime_strategy: ensureResult?.action === "reuse_managed_runtime" ? "managed_runtime_active" : "default_runtime_active",
  };

  assert(manifest, "runtime:autonomous:ensure did not return a usable manifest payload.");
  assert(manifest.status === "ready", `runtime:autonomous:ensure did not end ready: ${manifest.status ?? "unknown"}.`);
  assert(manifest.boundaryState === "autonomous", `Manifest boundaryState drifted to ${manifest.boundaryState}.`);
  assert(manifest.autonomousCoreReady === true, "Manifest does not report autonomousCoreReady=true.");
  assert(manifest.operatorAttentionRequired === false, "Manifest still requires operator relay.");
  assert(
    ["reuse_default_runtime", "reuse_managed_runtime"].includes(manifest.selected_action),
    `Manifest selected_action drifted to ${manifest.selected_action}.`,
  );
  assert(
    ["default_runtime_active", "managed_runtime_active"].includes(manifest.runtime_strategy),
    `Manifest runtime_strategy drifted to ${manifest.runtime_strategy}.`,
  );

  const backendUrl = manifest.backendUrl;
  const frontendUrl = manifest.frontendUrl;
  assert(backendUrl && frontendUrl, "Runtime ensure result did not expose backend/frontend authority URLs.");
  const autoSyncRuntime = await verificationSync.observeRuntime("autonomous-boundary-runtime", {
    backendUrl,
    frontendUrl,
  });

  const policyManifest = readPolicyManifest();
  assert(policyManifest, "Policy manifest did not materialize after runtime bootstrap.");
  const policyBoundary = policyManifest.boundary_state ?? policyManifest.haios_state;
  assert(policyBoundary === "autonomous", `Manifest policy reports boundary ${policyBoundary}.`);
  assert(
    policyManifest.selected_action === manifest.selected_action,
    `Manifest policy action ${policyManifest.selected_action} did not match runtime manifest action ${manifest.selected_action}.`,
  );
  console.log(
    `Persisted policy classification: ${policyBoundary} (action=${policyManifest.selected_action}).`
  );

  const capabilities = await waitForCondition("runtime capabilities", async () => {
    const payload = await fetchJson(`${backendUrl}/api/runtime/capabilities`);
    return payload.boundary_state === "autonomous" &&
      payload.autonomous_core_ready === true &&
      payload.requires_operator_relay === false &&
      ["reuse_default_runtime", "reuse_managed_runtime"].includes(payload.selected_action)
      ? payload
      : null;
  });
  const runtimeState = await waitForCondition("runtime state", async () => {
    const payload = await fetchJson(`${backendUrl}/api/runtime/state`);
    return payload.classification === "Autonomous" ? payload : null;
  });
  const autonomyPolicy = await waitForCondition("autonomy policy", async () => {
    const payload = await fetchJson(`${backendUrl}/api/autonomy/policy`);
    return ["reuse_default_runtime", "reuse_managed_runtime"].includes(payload?.selected_action) &&
      ["default_runtime_active", "managed_runtime_active"].includes(payload?.runtime_strategy)
      ? payload
      : null;
  });
  const autonomyStatus = await waitForCondition("autonomy status", async () => {
    const payload = await fetchJson(`${backendUrl}/api/autonomy/status`);
    return payload?.active === true && payload?.mode === "autonomous" ? payload : null;
  });
  const symphonyStatus = await waitForCondition("symphony status", async () => {
    const payload = await fetchJson(`${backendUrl}/api/symphony/status`);
    return payload?.status === "active" ? payload : null;
  });

  assert(
    Array.isArray(capabilities.core_boundary) &&
      capabilities.core_boundary.join(",") === "dashboard,symphony,runtime,autonomy",
    `Capabilities core_boundary drifted to ${JSON.stringify(capabilities.core_boundary)}.`,
  );
  assert(Array.isArray(capabilities.non_core_lanes), "Capabilities non_core_lanes payload is missing.");
  assert(Array.isArray(capabilities.degraded_lanes), "Capabilities degraded_lanes payload is missing.");
  const browser = await verifyBrowserShell({ frontendUrl });
  runBrowserSmoke(backendUrl, frontendUrl);
  const proofPayload = {
    status: "ok",
    checked_at: new Date().toISOString(),
    proof_contract: "autonomous-boundary-proof-v1",
    proof_source: "scripts/ci/autonomous-boundary-proof.mjs",
    backend_url: backendUrl,
    frontend_url: frontendUrl,
    authority_mode: manifest.managed ? "managed" : "default",
    boundary_state: capabilities.boundary_state,
    selected_action: capabilities.selected_action,
    requires_operator_relay: capabilities.requires_operator_relay,
    runtime_strategy: autonomyPolicy.runtime_strategy,
    manifest_mode: manifest.mode,
    manifest_reason: manifest.reason ?? null,
    policy_boundary_state: policyBoundary,
    policy_action: policyManifest.selected_action,
    symphony_status: symphonyStatus.status,
    autonomy_mode: autonomyStatus.mode,
    shell_boundary_state: browser.shellBoundaryState,
    shell_recovery_action: browser.shellRecoveryAction,
    shell_recovery_attempts: browser.shellRecoveryAttempts,
    auto_sync_status: browser.autoSync?.status ?? autoSyncRuntime.status,
    auto_sync_drift_detected: Boolean(browser.autoSync?.drift_detected || autoSyncRuntime.drift_detected),
    auto_sync_drift_unresolved: Boolean(browser.autoSync?.drift_unresolved || autoSyncRuntime.drift_unresolved),
  };
  writeProofArtifact(proofPayload);

  console.log(
    JSON.stringify(proofPayload, null, 2),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
