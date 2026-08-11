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
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { inspectRuntimeAuthority } from "./inspect-runtime-authority.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const manifestPath = path.resolve(projectRoot, "..", "runtime", "hyperai-autonomous-runtime.json");

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

function spawnRuntimeBootstrap() {
  const output = execFileSync(
    process.execPath,
    ["scripts/runtime/start-autonomous-runtime.mjs"],
    {
      cwd: projectRoot,
      encoding: "utf8",
      windowsHide: true,
    },
  ).trim();

  if (!output) {
    return null;
  }

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

  throw new Error(`No JSON payload found in runtime bootstrap output.\n${output}`);
}

async function inspectManifestRuntime(manifest) {
  if (!manifest?.backendPort || !manifest?.frontendPort) {
    return null;
  }

  return inspectRuntimeAuthority({
    backendPort: Number(manifest.backendPort),
    frontendPort: Number(manifest.frontendPort),
  });
}

async function main() {
  const defaultRuntime = await inspectRuntimeAuthority({
    backendPort: Number(process.env.HYPERAI_DEFAULT_BACKEND_PORT ?? 5000),
    frontendPort: Number(process.env.HYPERAI_DEFAULT_FRONTEND_PORT ?? 4173),
  });

  if (defaultRuntime.usable) {
    console.log(
      JSON.stringify(
        {
          action: "reuse_default_runtime",
          runtime: defaultRuntime,
        },
        null,
        2,
      ),
    );
    return;
  }

  const manifest = readManifest();
  if (manifest?.managed && manifest.backendPort && manifest.frontendPort) {
    const managedRuntime = await inspectRuntimeAuthority({
      backendPort: Number(manifest.backendPort),
      frontendPort: Number(manifest.frontendPort),
    });

    if (managedRuntime.usable) {
      console.log(
        JSON.stringify(
          {
            action: "reuse_managed_runtime",
            runtime: managedRuntime,
            manifest,
          },
          null,
          2,
        ),
      );
      return;
    }
  }

  const bootstrapped = spawnRuntimeBootstrap();
  const bootstrappedRuntime = await inspectManifestRuntime(bootstrapped);
  const action = bootstrapped?.managed ? "reuse_managed_runtime" : "reuse_default_runtime";
  console.log(
    JSON.stringify(
      {
        action,
        runtime: bootstrappedRuntime,
        manifest: bootstrapped,
      },
      null,
      2,
    ),
  );
}

await main();
