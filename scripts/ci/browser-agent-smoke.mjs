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

import process from "node:process";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { createVerificationSyncEngine } from "./verification-sync-engine.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const manifestPath = path.resolve(projectRoot, "..", "runtime", "hyperai-autonomous-runtime.json");
const runtimeDir = path.resolve(projectRoot, "..", "runtime");
const verificationSync = createVerificationSyncEngine({
  projectRoot,
  runtimeDir,
  source: "browser-agent-smoke",
});
const DEFAULT_RUNTIME_URLS = {
  backendUrl: "http://127.0.0.1:5000",
  frontendUrl: "http://127.0.0.1:4173",
  runtimeSource: "default",
};

function readManifestRuntimeUrls() {
  if (!existsSync(manifestPath)) {
    return null;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.backendUrl && manifest.frontendUrl) {
      return {
        backendUrl: manifest.backendUrl,
        frontendUrl: manifest.frontendUrl,
        runtimeSource: "manifest",
      };
    }
  } catch {
    // Ignore manifest parse issues and fall back to defaults.
  }

  return null;
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

function appendPolicyProofEvent(type, detail) {
  if (!existsSync(manifestPath)) {
    return;
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const policy = manifest.policy && typeof manifest.policy === "object" ? manifest.policy : {};
    const events = Array.isArray(policy.proof_events) ? policy.proof_events.slice(-5) : [];
    const nextEvent = {
      at: new Date().toISOString(),
      source: "browser-agent-smoke",
      type,
      detail,
    };
    events.push(nextEvent);
    manifest.policy = {
      ...policy,
      proof_events: events.slice(-6),
      fallback_triggered:
        type === "managed-bootstrap-failed" || type === "managed-runtime-discovered"
          ? true
          : policy.fallback_triggered ?? false,
    };
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } catch {
    // Keep smoke non-blocking when the manifest cannot be updated.
  }
}

function resolveRuntimeUrls() {
  if (process.env.BACKEND_URL && process.env.FRONTEND_URL) {
    return {
      backendUrl: process.env.BACKEND_URL,
      frontendUrl: process.env.FRONTEND_URL,
      runtimeSource: "env",
    };
  }

  const policyManifest = readPolicyManifest();
  if (policyManifest) {
    const manifestRuntime = readManifestRuntimeUrls();
    if (manifestRuntime) {
      console.log(
        `Autonomy policy reports boundary=${policyManifest.boundary_state ?? policyManifest.haios_state} selected action=${policyManifest.selected_action}`
      );
      return manifestRuntime;
    }
  }

  return DEFAULT_RUNTIME_URLS;
}

let runtimeUrls = resolveRuntimeUrls();
let BACKEND_URL = runtimeUrls.backendUrl;
let FRONTEND_URL = runtimeUrls.frontendUrl;
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 60000);

function applyRuntimeUrls(nextRuntimeUrls) {
  runtimeUrls = nextRuntimeUrls;
  BACKEND_URL = nextRuntimeUrls.backendUrl;
  FRONTEND_URL = nextRuntimeUrls.frontendUrl;
}

async function isReady(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function selectHealthyRuntime(...candidates) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const backendReady = await isReady(`${candidate.backendUrl}/api/health`);
    const frontendReady = await isReady(candidate.frontendUrl);
    if (backendReady && frontendReady) {
      return candidate;
    }
  }

  return null;
}

async function discoverManagedRuntime() {
  const backendCandidates = [5001, 5002, 5003, 5004, 5005, 5006];
  const frontendCandidates = [4177, 4178, 4179, 4180, 4181, 4182, 4183];

  for (const backendPort of backendCandidates) {
    if (!(await isReady(`http://127.0.0.1:${backendPort}/api/health`))) {
      continue;
    }

    for (const frontendPort of frontendCandidates) {
      if (!(await isReady(`http://127.0.0.1:${frontendPort}`))) {
        continue;
      }

      return {
        backendUrl: `http://127.0.0.1:${backendPort}`,
        frontendUrl: `http://127.0.0.1:${frontendPort}`,
        runtimeSource: "discovered",
      };
    }
  }

  return null;
}

async function ensureRuntimeReady() {
  if (process.env.HYPERAI_SKIP_AUTONOMOUS_BOOTSTRAP === "true") {
    return;
  }

  if (process.env.BACKEND_URL && process.env.FRONTEND_URL) {
    return;
  }

  const backendReady = await isReady(`${BACKEND_URL}/api/health`);
  const frontendReady = await isReady(FRONTEND_URL);

  if (backendReady && frontendReady) {
    appendPolicyProofEvent("smoke-reused-current-authority", "Browser smoke reused the current runtime authority without bootstrap.");
    return;
  }

  const manifestRuntime = readManifestRuntimeUrls();
  if (manifestRuntime) {
    const manifestBackendReady = await isReady(`${manifestRuntime.backendUrl}/api/health`);
    const manifestFrontendReady = await isReady(manifestRuntime.frontendUrl);
    if (manifestBackendReady && manifestFrontendReady) {
      applyRuntimeUrls(manifestRuntime);
      appendPolicyProofEvent("smoke-reused-manifest-authority", "Browser smoke adopted the persisted manifest authority.");
      return;
    }
  }

  const discoveredRuntime = await discoverManagedRuntime();
  if (discoveredRuntime) {
    applyRuntimeUrls(discoveredRuntime);
    appendPolicyProofEvent("managed-runtime-discovered", "Browser smoke discovered a healthy managed runtime and adopted it.");
    return;
  }

  try {
    execFileSync("node", [path.join(projectRoot, "scripts", "runtime", "start-autonomous-runtime.mjs")], {
      cwd: projectRoot,
      stdio: "ignore",
      windowsHide: true,
    });
  } catch (error) {
    console.warn("Managed runtime bootstrap failed; falling back to the current authority.", error);
    appendPolicyProofEvent(
      "managed-bootstrap-failed",
      "Managed runtime bootstrap failed during browser smoke; the boundary fell back to the current authority."
    );
    const fallbackRuntime = await discoverManagedRuntime();
    if (fallbackRuntime) {
      applyRuntimeUrls(fallbackRuntime);
      appendPolicyProofEvent("managed-runtime-discovered", "Browser smoke recovered by discovering a managed runtime after bootstrap failure.");
      return;
    }

    const retainedRuntime = await selectHealthyRuntime(
      runtimeUrls,
      manifestRuntime,
      DEFAULT_RUNTIME_URLS,
    );
    if (retainedRuntime) {
      applyRuntimeUrls(retainedRuntime);
      appendPolicyProofEvent("smoke-held-current-authority", "Browser smoke kept the last authority pair that still probes healthy after bootstrap failure.");
      return;
    }

    throw new Error("Browser smoke could not find a healthy backend/frontend authority pair after bootstrap failure.");
  }

  const resolvedRuntime = await selectHealthyRuntime(
    await discoverManagedRuntime(),
    readManifestRuntimeUrls(),
    runtimeUrls,
    DEFAULT_RUNTIME_URLS,
  );
  if (!resolvedRuntime) {
    throw new Error("Browser smoke bootstrap completed but no healthy backend/frontend authority pair became available.");
  }

  applyRuntimeUrls(resolvedRuntime);
  appendPolicyProofEvent("smoke-resolved-runtime-urls", `Browser smoke resolved runtime authority from ${runtimeUrls.runtimeSource}.`);
}

async function waitForUrl(url, label) {
    const started = Date.now();
    let lastError = "unreachable";

  while (Date.now() - started < TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(1000);
  }

    throw new Error(`${label} did not become ready: ${lastError}`);
}

async function fetchWithRetry(url, label, options = {}, maxAttempts = 3) {
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
        attempt += 1;
        try {
            const response = await fetch(url, options);
            return response;
        } catch (error) {
            lastError = error;
            await delay(500);
        }
    }

    throw new Error(`${label} failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function waitForSymphonyState(expectedStatus) {
    const started = Date.now();
    let lastStatus = "unknown";

    while (Date.now() - started < TIMEOUT_MS) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/symphony/status`);
            if (response.ok) {
                const payload = await response.json();
                lastStatus = payload.status ?? "unknown";
                if (lastStatus === expectedStatus) {
                    return payload;
                }
            }
        } catch (error) {
            lastStatus = error instanceof Error ? error.message : String(error);
        }

        await delay(500);
    }

    throw new Error(`Symphony did not reach ${expectedStatus}. Last observed state: ${lastStatus}`);
}

async function sendChatCommand(page, command) {
    const input = page.locator("textarea").first();
    const sendButton = page.getByRole("button", { name: "Route task" });

    await input.click();
    await input.fill(command);
    await delay(150);
    await sendButton.click();
}

async function verifyBackend() {
  const healthResponse = await waitForUrl(`${BACKEND_URL}/api/health`, "backend health");
  const health = await healthResponse.json();
  if (health.status !== "OK") {
    throw new Error(`Unexpected backend health payload: ${JSON.stringify(health)}`);
  }

  const symphonyResponse = await waitForUrl(`${BACKEND_URL}/api/symphony/status`, "symphony status");
  const symphony = await symphonyResponse.json();
  if (!("empathy_circulation" in symphony)) {
    throw new Error(`Missing symphony fields: ${JSON.stringify(symphony)}`);
  }
  const policyManifest = readPolicyManifest();
  if (policyManifest) {
    console.log(
      `Policy classification: ${policyManifest.boundary_state ?? policyManifest.haios_state} (action=${policyManifest.selected_action})`
    );
  }
  const restoreAutonomyAfterSmoke = Boolean(symphony.autonomy?.active || symphony.status === "active");

  const symphonyStartResponse = await fetchWithRetry(`${BACKEND_URL}/api/symphony/start`, "symphony start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
  if (!symphonyStartResponse.ok) {
    throw new Error(`Symphony start failed with ${symphonyStartResponse.status}`);
  }
  const startPayload = await symphonyStartResponse.json();
  if (startPayload.status !== "active") {
    throw new Error(`Unexpected symphony start payload: ${JSON.stringify(startPayload)}`);
  }

  const symphonyStopResponse = await fetchWithRetry(`${BACKEND_URL}/api/symphony/stop`, "symphony stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    });
  if (!symphonyStopResponse.ok) {
    throw new Error(`Symphony stop failed with ${symphonyStopResponse.status}`);
  }
  const stopPayload = await symphonyStopResponse.json();
  if (stopPayload.status !== "stopped") {
    throw new Error(`Unexpected symphony stop payload: ${JSON.stringify(stopPayload)}`);
  }

  if (restoreAutonomyAfterSmoke) {
    const restoreResponse = await fetchWithRetry(`${BACKEND_URL}/api/symphony/start`, "symphony restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!restoreResponse.ok) {
      throw new Error(`Symphony restore failed with ${restoreResponse.status}`);
    }
    const restorePayload = await restoreResponse.json();
    if (restorePayload.status !== "active") {
      throw new Error(`Unexpected symphony restore payload: ${JSON.stringify(restorePayload)}`);
    }
  }
}

async function verifyBrowser() {
  await waitForUrl(FRONTEND_URL, "frontend preview");
  const autoSyncRuntime = await verificationSync.observeRuntime("browser-smoke-runtime", {
    backendUrl: BACKEND_URL,
    frontendUrl: FRONTEND_URL,
  });
  const initialSymphonyResponse = await fetchWithRetry(`${BACKEND_URL}/api/symphony/status`, "initial symphony status");
  if (!initialSymphonyResponse.ok) {
    throw new Error(`Unable to read initial symphony status before browser verification: ${initialSymphonyResponse.status}`);
  }
  const initialSymphony = await initialSymphonyResponse.json();
  const restoreSymphonyAfterBrowser = Boolean(
    initialSymphony.autonomy?.active || initialSymphony.status === "active"
  );
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    const autoSyncHome = await verificationSync.verifyPageContract({
      surface: "browser-smoke-home",
      page,
      frontendUrl: FRONTEND_URL,
      route: "/",
      expectedMarkers: ["HyperAI Unified Workspace", "Conversation Core", "Companion Rail"],
      storageKeys: ["hyperai_autonomy_boundary_snapshot"],
      selectors: [
        {
          label: "conversation-core",
          strategies: [
            { type: "role", role: "heading", options: { name: "Conversation Core" } },
            { type: "text", text: "Conversation Core", options: { exact: true } },
          ],
        },
        {
          label: "route-task-button",
          strategies: [
            { type: "role", role: "button", options: { name: "Route task" } },
            { type: "text", text: "Route task", options: { exact: true } },
          ],
        },
      ],
      timeoutMs: TIMEOUT_MS,
    });

    await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    await page.waitForLoadState("domcontentloaded");
    await page.locator("body").waitFor({ state: "visible", timeout: TIMEOUT_MS });

    const bodyText = await page.locator("body").innerText();
    const requiredMarkers = ["HyperAI Unified Workspace", "Conversation Core", "Companion Rail"];
    const foundMarker = requiredMarkers.find((marker) => bodyText.includes(marker));

    if (!foundMarker) {
      throw new Error(`Frontend body missing expected markers. Saw: ${bodyText.slice(0, 400)}`);
    }

    await sendChatCommand(page, "Compare gemini_cli vs provider_reasoning cho yeu cau nay");

    await page.getByRole("button", { name: "Promote to mission" }).click();
    await page.goto(`${FRONTEND_URL}/missions`, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    await page.locator("body").waitFor({ state: "visible", timeout: TIMEOUT_MS });
    if (!page.url().endsWith("/missions")) {
      throw new Error(`Expected missions route after promotion, saw ${page.url()}`);
    }

    await page.goto(`${FRONTEND_URL}/systems`, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    await page.locator("body").waitFor({ state: "visible", timeout: TIMEOUT_MS });
    await page.getByText("System Graph", { exact: false }).waitFor({ timeout: TIMEOUT_MS });

    await page.goto(`${FRONTEND_URL}/symphony-control`, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
    await page.locator("body").waitFor({ state: "visible", timeout: TIMEOUT_MS });
    await page.getByText("Symphony Control Panel", { exact: false }).waitFor({ timeout: TIMEOUT_MS });

    if (restoreSymphonyAfterBrowser) {
      await page.goto(FRONTEND_URL, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
      await page.locator("body").waitFor({ state: "visible", timeout: TIMEOUT_MS });
    }

    const title = await page.title();
    console.log(
      JSON.stringify(
        {
          status: "ok",
          frontend_url: FRONTEND_URL,
          backend_url: BACKEND_URL,
          runtime_source: runtimeUrls.runtimeSource,
          detected_marker: foundMarker,
          title,
          auto_sync_status: autoSyncHome.status,
          auto_sync_drift_detected: Boolean(autoSyncHome.drift_detected || autoSyncRuntime.drift_detected),
          auto_sync_drift_unresolved: Boolean(autoSyncHome.drift_unresolved || autoSyncRuntime.drift_unresolved),
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
}

async function main() {
  await ensureRuntimeReady();
  await verifyBackend();
  await verifyBrowser();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
