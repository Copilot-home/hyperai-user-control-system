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

import { createReadStream, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import process from "node:process";

const distDir = process.argv[2];
const port = Number(process.argv[3] ?? 4177);

if (!distDir) {
  console.error("Usage: node scripts/runtime/static-spa-server.mjs <distDir> <port>");
  process.exit(1);
}

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

const server = createServer((req, res) => {
  const requestPath = (req.url ?? "/").split("?")[0];
  const normalizedPath = requestPath === "/" ? "/index.html" : requestPath;
  const candidatePath = path.join(distDir, normalizedPath);
  const targetPath = existsSync(candidatePath) ? candidatePath : path.join(distDir, "index.html");
  const extension = path.extname(targetPath).toLowerCase();

  res.writeHead(200, {
    "Content-Type": contentTypes[extension] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(targetPath).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`HyperAI static SPA server listening on http://127.0.0.1:${port}`);
});
