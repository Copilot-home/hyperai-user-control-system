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

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const MAX_EVENTS = 12;

function safeJsonRead(filePath) {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value) {
  return normalizeText(value).toLocaleLowerCase("en-US");
}

function buildBodySignature(text) {
  const normalized = normalizeText(text);
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return {
    hash: hash.toString(16).padStart(8, "0"),
    length: normalized.length,
    excerpt: normalized.slice(0, 500),
  };
}

function createResult({ status = "ok", driftDetected = false, unresolved = false, observations = [], fallbacks = [], evidence = {}, error = null } = {}) {
  return {
    status,
    drift_detected: driftDetected,
    drift_unresolved: unresolved,
    observations,
    fallbacks,
    evidence,
    error,
  };
}

export function createVerificationSyncEngine({ projectRoot, runtimeDir, source }) {
  const verificationDir = path.join(runtimeDir, "verification");
  const statePath = path.join(verificationDir, "auto_sync_state.json");

  function readState() {
    return safeJsonRead(statePath) ?? {
      schema_version: "auto-sync-verification-v1",
      updated_at: null,
      surfaces: {},
      events: [],
    };
  }

  function writeState(nextState) {
    mkdirSync(verificationDir, { recursive: true });
    writeFileSync(statePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");
  }

  function record(surface, result) {
    const state = readState();
    const event = {
      at: new Date().toISOString(),
      source,
      surface,
      status: result.status,
      drift_detected: result.drift_detected,
      drift_unresolved: result.drift_unresolved,
      fallbacks: result.fallbacks,
      observations: result.observations,
      evidence: result.evidence,
      error: result.error,
    };

    state.updated_at = event.at;
    state.surfaces = {
      ...state.surfaces,
      [surface]: {
        last_checked_at: event.at,
        status: result.status,
        drift_detected: result.drift_detected,
        drift_unresolved: result.drift_unresolved,
        evidence: result.evidence,
        fallbacks: result.fallbacks,
      },
    };
    state.events = [...(Array.isArray(state.events) ? state.events : []), event].slice(-MAX_EVENTS);
    writeState(state);
    console.log(
      `[verification-sync] ${surface}: status=${result.status} drift=${result.drift_detected} unresolved=${result.drift_unresolved}`
    );
    return result;
  }

  async function probeRuntime({ backendUrl, frontendUrl }) {
    const evidence = {
      backend_url: backendUrl,
      frontend_url: frontendUrl,
      backend_health: null,
      frontend_status: null,
    };

    try {
      const backendResponse = await fetch(`${backendUrl}/api/health`);
      evidence.backend_health = {
        ok: backendResponse.ok,
        status: backendResponse.status,
      };
    } catch (error) {
      evidence.backend_health = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    try {
      const frontendResponse = await fetch(frontendUrl);
      evidence.frontend_status = {
        ok: frontendResponse.ok,
        status: frontendResponse.status,
      };
    } catch (error) {
      evidence.frontend_status = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    return evidence;
  }

  async function inspectPage({ page, route, expectedMarkers = [], storageKeys = [] }) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    const headings = await page
      .locator("h1,h2,h3,[role='heading']")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean))
      .catch(() => []);
    const buttons = await page
      .locator("button,[role='button']")
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.replace(/\s+/g, " ").trim()).filter(Boolean))
      .catch(() => []);
    const storage = await page
      .evaluate((keys) => Object.fromEntries(keys.map((key) => [key, window.localStorage.getItem(key)])), storageKeys)
      .catch(() => ({}));

    const normalizedBody = normalizeText(bodyText);
    const searchableBody = normalizeSearchText(bodyText);
    return {
      requested_route: route,
      final_url: page.url(),
      markers: Object.fromEntries(
        expectedMarkers.map((marker) => [marker, searchableBody.includes(normalizeSearchText(marker))])
      ),
      headings,
      buttons,
      storage_keys: Object.fromEntries(Object.entries(storage).map(([key, value]) => [key, Boolean(value)])),
      body_signature: buildBodySignature(bodyText),
    };
  }

  async function waitForAnySelector({ page, label, strategies, timeoutMs }) {
    const attempts = [];

    for (const strategy of strategies) {
      try {
        if (strategy.type === "role") {
          await page.getByRole(strategy.role, strategy.options).waitFor({ timeout: strategy.timeoutMs ?? Math.min(timeoutMs, 3000) });
        } else if (strategy.type === "text") {
          await page.getByText(strategy.text, strategy.options ?? {}).waitFor({ timeout: strategy.timeoutMs ?? Math.min(timeoutMs, 3000) });
        } else if (strategy.type === "locator") {
          await page.locator(strategy.selector).waitFor({ timeout: strategy.timeoutMs ?? Math.min(timeoutMs, 3000) });
        }

        return {
          ok: true,
          strategy,
          attempts,
          drift: attempts.length > 0,
        };
      } catch (error) {
        attempts.push({
          type: strategy.type,
          target: strategy.text ?? strategy.role ?? strategy.selector,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      ok: false,
      strategy: null,
      attempts,
      drift: true,
    };
  }

  async function verifyPageContract({ surface, page, frontendUrl, route = "/", expectedMarkers = [], storageKeys = [], selectors = [], timeoutMs }) {
    try {
      const requestedUrl = new URL(route, frontendUrl).toString();
      await page.goto(requestedUrl, { waitUntil: "domcontentloaded", timeout: timeoutMs });
      await page.locator("body").waitFor({ state: "visible", timeout: timeoutMs });

      const selectorResults = [];
      for (const selector of selectors) {
        const selectorResult = await waitForAnySelector({
          page,
          label: selector.label,
          strategies: selector.strategies,
          timeoutMs,
        });
        selectorResults.push({
          label: selector.label,
          ok: selectorResult.ok,
          selected_strategy: selectorResult.strategy,
          attempts: selectorResult.attempts,
          drift: selectorResult.drift,
        });
      }

      const pageEvidence = await inspectPage({ page, route, expectedMarkers, storageKeys });
      const missingMarkers = Object.entries(pageEvidence.markers)
        .filter(([, present]) => !present)
        .map(([marker]) => marker);
      const failedSelectors = selectorResults.filter((result) => !result.ok);
      const fallbacks = selectorResults
        .filter((result) => result.ok && result.drift)
        .map((result) => ({
          label: result.label,
          selected_strategy: result.selected_strategy,
          failed_attempts: result.attempts,
        }));
      const routeDrift = pageEvidence.final_url !== requestedUrl;
      const driftDetected = routeDrift || missingMarkers.length > 0 || fallbacks.length > 0;
      const unresolved = failedSelectors.length > 0;

      return record(
        surface,
        createResult({
          status: unresolved ? "drift_unresolved" : "ok",
          driftDetected,
          unresolved,
          observations: [
            routeDrift ? "route drift detected" : "route matched requested URL",
            missingMarkers.length > 0 ? `missing markers: ${missingMarkers.join(", ")}` : "markers satisfied",
            failedSelectors.length > 0 ? `failed selectors: ${failedSelectors.map((item) => item.label).join(", ")}` : "selectors satisfied",
          ],
          fallbacks,
          evidence: {
            ...pageEvidence,
            requested_url: requestedUrl,
            selector_results: selectorResults,
          },
        })
      );
    } catch (error) {
      return record(
        surface,
        createResult({
          status: "auto_sync_failed",
          driftDetected: true,
          unresolved: true,
          observations: ["verification sync engine failed before completing page contract"],
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  async function observeRuntime(surface, runtime) {
    try {
      const evidence = await probeRuntime(runtime);
      const unhealthy = evidence.backend_health?.ok === false || evidence.frontend_status?.ok === false;
      return record(
        surface,
        createResult({
          status: unhealthy ? "runtime_probe_unhealthy" : "ok",
          driftDetected: unhealthy,
          unresolved: unhealthy,
          observations: [unhealthy ? "runtime health probe failed" : "runtime health probe passed"],
          evidence,
        })
      );
    } catch (error) {
      return record(
        surface,
        createResult({
          status: "auto_sync_failed",
          driftDetected: true,
          unresolved: true,
          observations: ["runtime probe failed inside verification sync engine"],
          error: error instanceof Error ? error.message : String(error),
        })
      );
    }
  }

  return {
    projectRoot,
    runtimeDir,
    statePath,
    observeRuntime,
    verifyPageContract,
  };
}
