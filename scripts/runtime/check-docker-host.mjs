import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const composeFile = path.join(projectRoot, "docker", "docker-compose.yml");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  return {
    ok: !result.error && (result.status ?? 1) === 0,
    status: result.status ?? null,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || "",
    error: result.error ? String(result.error.message || result.error) : null,
  };
}

function readWindowsService(name) {
  if (process.platform !== "win32") {
    return null;
  }

  const probe = run("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Get-Service ${name} | Select-Object Status,Name,DisplayName | ConvertTo-Json -Compress`,
  ]);

  if (!probe.ok || !probe.stdout) {
    return {
      name,
      ok: false,
      error: probe.stderr || probe.error || `Service probe failed with status ${probe.status}`,
    };
  }

  try {
    const payload = JSON.parse(probe.stdout);
    return {
      name,
      ok: true,
      status: payload.Status,
      displayName: payload.DisplayName,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const contextProbe = run("docker", ["context", "ls"]);
const composeProbe = run("docker", ["compose", "-f", composeFile, "config"]);
const engineProbe = run("docker", ["info"]);

const payload = {
  status: engineProbe.ok ? "ok" : "degraded",
  composeRenderable: composeProbe.ok,
  dockerEngineReachable: engineProbe.ok,
  currentContext: process.env.DOCKER_CONTEXT || "desktop-linux",
  probes: {
    context: contextProbe,
    composeConfig: composeProbe.ok
      ? {
          ok: true,
          status: composeProbe.status,
          servicesDetected: ["backend", "frontend"].filter((service) =>
            composeProbe.stdout.includes(`${service}:`)
          ),
        }
      : composeProbe,
    engine: engineProbe.ok
      ? {
          ok: true,
          status: engineProbe.status,
        }
      : {
          ok: false,
          status: engineProbe.status,
          stderr: engineProbe.stderr,
          error: engineProbe.error,
        },
    windowsServices: process.platform === "win32"
      ? {
          dockerDesktop: readWindowsService("com.docker.service"),
          vmcompute: readWindowsService("vmcompute"),
        }
      : null,
  },
};

console.log(JSON.stringify(payload, null, 2));
