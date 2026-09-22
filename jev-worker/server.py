"""Bounded HTTP adapter for the real browser-use/jev-ultrafast Agent.

The worker owns browser execution only. It never owns E-D NARSG state or commit authority.
Deploy behind a TLS-capable reverse proxy; Python's stdlib HTTP server is intentionally only
the local worker boundary.
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SERVICE = "jev-ultrafast"
VERSION = os.environ.get("JEV_WORKER_VERSION", "0.1.0")
WORKER_ID = os.environ.get("JEV_WORKER_ID", "jev-worker-local")
HOST = os.environ.get("JEV_WORKER_HOST", "127.0.0.1")
PORT = int(os.environ.get("JEV_WORKER_PORT", "8787"))
TOKEN = os.environ.get("JEV_WORKER_TOKEN", "")
HEALTH_ONLY = os.environ.get("JEV_WORKER_HEALTH_ONLY", "false").lower() == "true"
MAX_RUN_SECONDS = int(os.environ.get("JEV_WORKER_MAX_RUN_SECONDS", "120"))
MAX_CONCURRENT_RUNS = int(os.environ.get("JEV_WORKER_MAX_CONCURRENT_RUNS", "1"))
RUN_GATE = threading.BoundedSemaphore(MAX_CONCURRENT_RUNS)


def _is_local_host(host):
    return host in {"127.0.0.1", "localhost", "::1"}


if not _is_local_host(HOST) and not TOKEN:
    raise RuntimeError("JEV_WORKER_TOKEN_REQUIRED")


def attestation():
    return {
        "protocol_version": "JEV-WORKER-ATTESTATION-1.0",
        "service": SERVICE,
        "worker_id": WORKER_ID,
        "version": VERSION,
        "capability": "browser-execution",
        "state_authority": False,
        "commit_authority": False,
    }


def json_bytes(payload):
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def send_json(self, status, payload):
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if urlparse(self.path).path == "/healthz":
            return self.send_json(200, attestation())
        return self.send_json(404, {"error": "NOT_FOUND"})

    def do_POST(self):
        if urlparse(self.path).path != "/v1/run":
            return self.send_json(404, {"error": "NOT_FOUND"})
        if TOKEN and self.headers.get("Authorization") != "Bearer " + TOKEN:
            return self.send_json(401, {"error": "WORKER_AUTH_REQUIRED"})
        if not RUN_GATE.acquire(blocking=False):
            return self.send_json(429, {"error": "WORKER_BUSY", "retry": False})

        started = time.monotonic()
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16384:
                raise ValueError("REQUEST_SIZE_INVALID")
            body = json.loads(self.rfile.read(length))
            goal = body.get("goal")
            url = body.get("url")
            if not isinstance(goal, str) or not goal.strip() or len(goal) > 2000:
                raise ValueError("GOAL_INVALID")
            if not isinstance(url, str) or len(url) > 4096 or urlparse(url).scheme not in {"http", "https"}:
                raise ValueError("URL_INVALID")
            if HEALTH_ONLY:
                return self.send_json(503, {"error": "WORKER_HEALTH_ONLY"})
            from jev_ultrafast import Agent
            agent = Agent(url, goal.strip(), screenshots=False)
            try:
                snapshot = None
                for snapshot in agent.run():
                    if time.monotonic() - started > MAX_RUN_SECONDS:
                        raise TimeoutError("JEV_EXECUTION_TIMEOUT")
                if not snapshot or snapshot.get("status") not in {"done", "blocked"}:
                    raise RuntimeError("JEV_TERMINAL_STATE_MISSING")
                return self.send_json(200, {
                    "protocol_version": "JEV-WORKER-RUN-1.0",
                    "worker_id": WORKER_ID,
                    "status": snapshot.get("status"),
                    "snapshot": snapshot,
                })
            finally:
                agent.close()
        except TimeoutError as error:
            return self.send_json(504, {
                "error": "JEV_EXECUTION_TIMEOUT",
                "detail": str(error),
                "retry": False,
            })
        except Exception as error:
            return self.send_json(400, {
                "error": "JEV_EXECUTION_FAILED",
                "detail": str(error),
                "retry": False,
            })
        finally:
            RUN_GATE.release()

    def log_message(self, *_args):
        pass


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.daemon_threads = True
    print(f"JEV worker {WORKER_ID} listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
