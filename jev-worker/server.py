"""Bounded HTTP adapter for the real browser-use/jev-ultrafast Agent.

The worker owns browser execution only. It never owns E-D NARSG state or commit authority.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

SERVICE = "jev-ultrafast"
VERSION = os.environ.get("JEV_WORKER_VERSION", "0.1.0")
WORKER_ID = os.environ.get("JEV_WORKER_ID", "jev-worker-local")
HOST = os.environ.get("JEV_WORKER_HOST", "127.0.0.1")
PORT = int(os.environ.get("JEV_WORKER_PORT", "8787"))
TOKEN = os.environ.get("JEV_WORKER_TOKEN", "")
HEALTH_ONLY = os.environ.get("JEV_WORKER_HEALTH_ONLY", "false").lower() == "true"


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
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 16384:
                raise ValueError("REQUEST_SIZE_INVALID")
            body = json.loads(self.rfile.read(length))
            goal = body.get("goal")
            url = body.get("url")
            if not isinstance(goal, str) or not goal.strip() or len(goal) > 2000:
                raise ValueError("GOAL_INVALID")
            if not isinstance(url, str) or urlparse(url).scheme not in {"http", "https"}:
                raise ValueError("URL_INVALID")
            if HEALTH_ONLY:
                return self.send_json(503, {"error": "WORKER_HEALTH_ONLY"})
            from jev_ultrafast import Agent
            agent = Agent(url, goal.strip(), screenshots=False)
            try:
                snapshot = None
                for snapshot in agent.run():
                    pass
                return self.send_json(200, {
                    "protocol_version": "JEV-WORKER-RUN-1.0",
                    "worker_id": WORKER_ID,
                    "status": snapshot.get("status") if snapshot else "UNKNOWN",
                    "snapshot": snapshot,
                    "completion_assertion": snapshot.get("status") if snapshot else None,
                })
            finally:
                agent.close()
        except Exception as error:
            return self.send_json(400, {
                "error": "JEV_EXECUTION_FAILED",
                "detail": str(error),
                "retry": False,
            })

    def log_message(self, *_args):
        pass


def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"JEV worker {WORKER_ID} listening on {HOST}:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
