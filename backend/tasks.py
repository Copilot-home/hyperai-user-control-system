import os
import json
import sqlite3
import logging
import subprocess
from datetime import datetime
from pathlib import Path

try:
    import docker
except Exception:
    docker = None

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_LOG_DIR = WORKSPACE_ROOT / 'logs' / 'system_logs'
DEFAULT_DB_PATH = WORKSPACE_ROOT / 'heritage.db'
DEFAULT_LOG_PATH = SYSTEM_LOG_DIR / 'heritage.log'

DB_PATH = os.environ.get('X_HUB_DB', str(DEFAULT_DB_PATH))
DOCKER_SPAWN = os.environ.get('DOCKER_SPAWN', '0') in ('1', 'true', 'True')
CLONE_IMAGE = os.environ.get('CLONE_IMAGE', 'python:3.11-slim')


def process_event_job(event_id: int):
    """Process an event by id: spawn clone (docker or subprocess), mark processed, record history, and append heritage logs."""
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT id,type,data,processed FROM events WHERE id=?", (event_id,))
    row = cur.fetchone()
    if not row:
        logging.error("Event %s not found", event_id)
        return False
    if row[3] == 1:
        logging.info("Event %s already processed", event_id)
        return True
    event = {"id": row[0], "type": row[1], "data": json.loads(row[2] or "{}")}

    # heritage: start
    try:
        SYSTEM_LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = os.environ.get('X_HUB_LOG', str(DEFAULT_LOG_PATH))
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({'ts': datetime.utcnow().isoformat(), 'phase': 'start_processing', 'event': event}, ensure_ascii=False) + '\n')
    except Exception:
        logging.exception('Failed to write heritage start log')

    # spawn clone
    spawn_result = None
    if DOCKER_SPAWN and docker:
        try:
            client = docker.from_env()
            cwd = os.getcwd()
            container = client.containers.run(
                CLONE_IMAGE,
                command=["python", "xhub_worker.py", "--event-id", str(event_id)],
                volumes={cwd: {'bind': '/app', 'mode': 'rw'}},
                working_dir='/app',
                detach=True,
                remove=True,
                mem_limit='512m'
            )
            spawn_result = {'backend': 'docker', 'container_id': getattr(container, 'id', None)}
            logging.info("Started clone container %s", spawn_result.get('container_id'))
        except Exception as e:
            logging.exception("Docker spawn failed: %s", e)
            proc = subprocess.Popen(["python", "xhub_worker.py", "--event-id", str(event_id)])
            spawn_result = {'backend': 'subprocess', 'pid': proc.pid}
            logging.info("Spawned subprocess PID %s", proc.pid)
    else:
        proc = subprocess.Popen(["python", "xhub_worker.py", "--event-id", str(event_id)])
        spawn_result = {'backend': 'subprocess', 'pid': proc.pid}
        logging.info("Spawned subprocess PID %s", proc.pid)

    # mark processed
    cur.execute("UPDATE events SET processed=1 WHERE id=?", (event_id,))
    conn.commit()

    # heritage: done
    try:
        SYSTEM_LOG_DIR.mkdir(parents=True, exist_ok=True)
        log_path = os.environ.get('X_HUB_LOG', str(DEFAULT_LOG_PATH))
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps({'ts': datetime.utcnow().isoformat(), 'phase': 'done_processing', 'event_id': event_id, 'spawn_result': spawn_result}, ensure_ascii=False) + '\n')
    except Exception:
        logging.exception('Failed to write heritage done log')

    # record state history entry (simplified)
    try:
        cur.execute("INSERT INTO system_state_history (prev_state, new_state, event_id, ts) VALUES (?, ?, ?, ?)",
                    ("PROCESSING", "PROCESSING", event_id, datetime.utcnow().isoformat()))
        conn.commit()
    except Exception:
        pass

    return True
