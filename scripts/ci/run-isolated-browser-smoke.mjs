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
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const distDir = path.join(projectRoot, "dist-isolated");

const BACKEND_PORT = Number(process.env.ISOLATED_BACKEND_PORT ?? 5001);
const FRONTEND_PORT = Number(process.env.ISOLATED_FRONTEND_PORT ?? 4177);
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 60000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};

async function waitForUrl(url, label) {
  const started = Date.now();
  let lastError = "unreachable";

  while (Date.now() - started < TIMEOUT_MS) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await delay(500);
  }

  throw new Error(`${label} did not become ready: ${lastError}`);
}

function createSpaServer() {
  return createServer((req, res) => {
    const requestUrl = req.url ?? "/";
    const cleanPath = requestUrl.split("?")[0];
    const normalizedPath = cleanPath === "/" ? "/index.html" : cleanPath;
    const candidatePath = join(distDir, normalizedPath);
    const targetPath = existsSync(candidatePath) ? candidatePath : join(distDir, "index.html");
    const extension = extname(targetPath).toLowerCase();

    res.writeHead(200, {
      "Content-Type": contentTypes[extension] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });

    createReadStream(targetPath).pipe(res);
  });
}

function spawnBackend() {
  return spawn("node", ["backend/server.js"], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
    },
    stdio: "inherit",
  });
}

function runSmoke() {
  return new Promise((resolve, reject) => {
    const smokeProcess = spawn("node", ["scripts/ci/browser-agent-smoke.mjs"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        BACKEND_URL,
        FRONTEND_URL,
        SMOKE_TIMEOUT_MS: String(TIMEOUT_MS),
      },
      stdio: "inherit",
    });

    smokeProcess.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`browser-agent-smoke exited with code ${code}`));
    });
    smokeProcess.on("error", reject);
  });
}

async function main() {
  if (!existsSync(join(distDir, "index.html"))) {
    throw new Error("dist-isolated/index.html is missing. Build with `npx vite build --outDir dist-isolated` first.");
  }

  const backendProcess = spawnBackend();
  const spaServer = createSpaServer();

  const shutdown = async () => {
    spaServer.close();
    if (!backendProcess.killed) {
      backendProcess.kill();
    }
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  try {
    await new Promise((resolve, reject) => {
      spaServer.once("error", reject);
      spaServer.listen(FRONTEND_PORT, "127.0.0.1", resolve);
    });

    await waitForUrl(`${BACKEND_URL}/api/health`, "isolated backend");
    await waitForUrl(FRONTEND_URL, "isolated frontend");
    await runSmoke();
  } finally {
    await shutdown();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
