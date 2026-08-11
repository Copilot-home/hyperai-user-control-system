import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const composeFile = path.join(projectRoot, "docker", "docker-compose.yml");
const nginxConfigFile = path.join(projectRoot, "docker", "nginx.conf");

const dockerfilePairs = [
  ["Dockerfile.backend", path.join("docker", "Dockerfile.backend")],
  ["Dockerfile.frontend", path.join("docker", "Dockerfile.frontend")],
];

function normalize(text) {
  return text.replace(/\r\n/g, "\n").trim();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

for (const [rootRelative, dockerRelative] of dockerfilePairs) {
  const rootFile = path.join(projectRoot, rootRelative);
  const dockerFile = path.join(projectRoot, dockerRelative);
  assert(existsSync(rootFile), `Missing Dockerfile: ${rootRelative}`);
  assert(existsSync(dockerFile), `Missing Dockerfile: ${dockerRelative}`);
  assert(
    normalize(readFileSync(rootFile, "utf8")) === normalize(readFileSync(dockerFile, "utf8")),
    `Dockerfile drift detected between ${rootRelative} and ${dockerRelative}`
  );
}

assert(existsSync(composeFile), "Missing docker/docker-compose.yml");
assert(existsSync(nginxConfigFile), "Missing docker/nginx.conf");

const composeConfig = spawnSync("docker", ["compose", "-f", composeFile, "config"], {
  cwd: projectRoot,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

if (composeConfig.error) {
  throw composeConfig.error;
}

if ((composeConfig.status ?? 1) !== 0) {
  throw new Error(
    `docker compose config failed with status ${composeConfig.status ?? "unknown"}\n${composeConfig.stderr}`
  );
}

const rendered = composeConfig.stdout;
const expectedSnippets = [
  "dockerfile: docker/Dockerfile.backend",
  "dockerfile: docker/Dockerfile.frontend",
  "restart: unless-stopped",
  "condition: service_healthy",
  "healthcheck:",
  'published: "5000"',
  'published: "4173"',
  "target: 5000",
  "target: 4173",
];

for (const snippet of expectedSnippets) {
  assert(rendered.includes(snippet), `Compose output missing expected snippet: ${snippet}`);
}

const nginxConfig = readFileSync(nginxConfigFile, "utf8");
assert(
  nginxConfig.includes("proxy_pass http://frontend:4173;"),
  "docker/nginx.conf must proxy frontend traffic to port 4173"
);
assert(
  nginxConfig.includes("proxy_pass http://backend:5000;"),
  "docker/nginx.conf must proxy backend traffic to port 5000"
);

console.log(
  JSON.stringify(
    {
      status: "ok",
      compose_file: path.relative(projectRoot, composeFile),
      dockerfile_pairs: dockerfilePairs.map(([rootRelative, dockerRelative]) => ({
        root: rootRelative,
        docker: dockerRelative,
        status: "in_sync",
      })),
      nginx_proxy_alignment: {
        frontend: 4173,
        backend: 5000,
      },
      exposed_ports: [5000, 4173],
    },
    null,
    2
  )
);
