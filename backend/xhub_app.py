"""
X_HUB FastAPI prototype — Redis/RQ integration, WAL, heritage and state history
Endpoints:
- POST /event
- POST /telegram_webhook
- GET  /state
"""

import os
import json
import hmac
import hashlib
import sqlite3
import subprocess
import logging
from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from pathlib import Path

# from redis import Redis
# from rq import Queue
import tasks

WORKSPACE_ROOT = Path(__file__).resolve().parents[2]
SYSTEM_LOG_DIR = WORKSPACE_ROOT / "logs" / "system_logs"
DEFAULT_DB_PATH = WORKSPACE_ROOT / "heritage.db"
DEFAULT_LOG_PATH = SYSTEM_LOG_DIR / "heritage.log"

DB_PATH = os.environ.get("X_HUB_DB", str(DEFAULT_DB_PATH))
SECRET = os.environ.get("X_HUB_SECRET", "")
REDIS_URL = os.environ.get("REDIS_URL", f"redis://{os.environ.get('REDIS_HOST','redis')}:{os.environ.get('REDIS_PORT',6379)}/0")
USE_REDIS = False # os.environ.get("USE_REDIS", "1") not in ("0", "false", "False")
TELEGRAM_WEBHOOK_SECRET = os.environ.get("TELEGRAM_WEBHOOK_SECRET", "")

# ensure DB and tables
os.makedirs(os.path.dirname(DB_PATH) or '.', exist_ok=True)
SYSTEM_LOG_DIR.mkdir(parents=True, exist_ok=True)
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
# enable WAL for better concurrency
try:
    conn.execute("PRAGMA journal_mode=WAL;")
except Exception:
    pass
cur = conn.cursor()
cur.execute("""CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    data TEXT,
    processed INTEGER DEFAULT 0,
    created_at TEXT
)""")
cur.execute("""CREATE TABLE IF NOT EXISTS system_state (
    key TEXT PRIMARY KEY,
    value TEXT
)""")
cur.execute("""CREATE TABLE IF NOT EXISTS system_state_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prev_state TEXT,
    new_state TEXT,
    event_id INTEGER,
    ts TEXT
)""")
cur.execute("""CREATE TABLE IF NOT EXISTS quotas (
    name TEXT PRIMARY KEY,
    limit_count INTEGER,
    period_seconds INTEGER,
    last_reset TEXT,
    current_count INTEGER DEFAULT 0
)""")
conn.commit()

app = FastAPI(title="X_HUB", version="0.2")

class EventModel(BaseModel):
    type: str
    data: dict
    signature: Optional[str] = None


def verify_event(ev: dict) -> bool:
    # Prefer HMAC attestation if secret provided
    if SECRET and ev.get("signature"):
        msg = json.dumps(ev.get("data", ""), separators=(",",":"), sort_keys=True)
        expected = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, ev.get("signature"))
    # fallback: basic structural check
    return bool(ev.get("type"))


def store_event(ev: dict) -> int:
    cur.execute("INSERT INTO events (type, data, created_at) VALUES (?, ?, ?)",
                (ev.get("type"), json.dumps(ev.get("data")), datetime.utcnow().isoformat()))
    conn.commit()
    return cur.lastrowid


def update_state(ev: dict, event_id: int = None):
    if ev.get("type") == "payment_received":
        cur.execute("INSERT OR REPLACE INTO system_state (key, value) VALUES (?, ?)", ("STATE", "PROCESSING"))
        conn.commit()
        # record history
        cur.execute("INSERT INTO system_state_history (prev_state, new_state, event_id, ts) VALUES (?, ?, ?, ?)",
                    ("IDLE", "PROCESSING", event_id, datetime.utcnow().isoformat()))
        conn.commit()


def can_spawn(worker_name: str) -> bool:
    """
    Quota check using the `quotas` table. Quotas can be configured per-worker
    with name `spawn_<worker_name>` or a fallback `spawn_default`.
    Each quota row: (limit_count, period_seconds, last_reset, current_count).
    """
    quota_name = f"spawn_{worker_name}"
    # try worker-specific quota first
    cur.execute("SELECT limit_count, period_seconds, last_reset, current_count FROM quotas WHERE name=?", (quota_name,))
    row = cur.fetchone()
    used_default = False
    if not row:
        cur.execute("SELECT limit_count, period_seconds, last_reset, current_count FROM quotas WHERE name=?", ("spawn_default",))
        row = cur.fetchone()
        used_default = True
    if not row:
        # no quota configured => allow spawn
        return True

    limit_count, period_seconds, last_reset, current_count = row
    try:
        limit_count = int(limit_count or 0)
    except Exception:
        limit_count = 0
    try:
        period_seconds = int(period_seconds or 0)
    except Exception:
        period_seconds = 0
    try:
        current_count = int(current_count or 0)
    except Exception:
        current_count = 0

    now = datetime.utcnow()
    reset_needed = False
    if last_reset:
        try:
            last_dt = datetime.fromisoformat(last_reset)
            if (now - last_dt).total_seconds() >= period_seconds:
                reset_needed = True
        except Exception:
            reset_needed = True
    else:
        reset_needed = True

    actual_name = ("spawn_default" if used_default else quota_name)
    if reset_needed:
        try:
            cur.execute("UPDATE quotas SET last_reset=?, current_count=0 WHERE name=?", (now.isoformat(), actual_name))
            conn.commit()
        except Exception:
            pass
        current_count = 0

    if limit_count == 0:
        return True

    if current_count < limit_count:
        try:
            cur.execute("UPDATE quotas SET current_count=current_count+1 WHERE name=?", (actual_name,))
            conn.commit()
        except Exception:
            pass
        return True

    return False


def log_event(event: dict, result: dict, event_id: Optional[int] = None):
    """Append a JSON line to the heritage log file. Non-fatal on error."""
    try:
        log_path = os.environ.get('X_HUB_LOG', str(DEFAULT_LOG_PATH))
        entry = {
            'ts': datetime.utcnow().isoformat(),
            'event': event,
            'result': result,
            'event_id': event_id
        }
        with open(log_path, 'a', encoding='utf-8') as f:
            f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    except Exception as e:
        logging.exception('Failed to write heritage log: %s', e)


def enqueue_job(event_id: int, worker_name: str):
    """Enqueue or execute the job to process the event. Returns a result dict."""
    result = None
    if USE_REDIS:
        try:
            redis_conn = Redis.from_url(REDIS_URL)
            q = Queue("default", connection=redis_conn)
            job = q.enqueue("tasks.process_event_job", event_id)
            logging.info("Enqueued event %s to Redis RQ, job_id=%s", event_id, getattr(job, 'id', None))
            result = {'queued': True, 'backend': 'redis', 'job_id': getattr(job, 'id', None)}
            return result
        except Exception as e:
            logging.exception("Redis enqueue failed, falling back to local execution: %s", e)
    # fallback: execute locally (non-blocking spawn inside tasks)
    try:
        ok = tasks.process_event_job(event_id)
        result = {'queued': True, 'backend': 'inline', 'processed': bool(ok)}
    except Exception as e:
        logging.exception("Local job execution failed: %s", e)
        result = {'queued': False, 'backend': 'inline', 'error': str(e)}
    return result


@app.post("/event")
async def post_event(ev: EventModel):
    ev_dict = ev.dict()
    if not verify_event(ev_dict):
        raise HTTPException(status_code=400, detail="Attestation failed")
    event_id = store_event(ev_dict)
    update_state(ev_dict, event_id=event_id)
    result = None
    # routing
    if ev.type == "payment_received":
        if not can_spawn("C6_payment_worker"):
            raise HTTPException(status_code=429, detail="Quota exceeded")
        result = enqueue_job(event_id, "C6_payment_worker")
    # heritage log
    try:
        log_event(ev_dict, result, event_id=event_id)
    except Exception:
        pass
    return {"status": "accepted", "event_id": event_id, "enqueue_result": result}


@app.post("/telegram_webhook")
async def telegram_webhook(request: Request):
    # verify Telegram secret token header if configured
    if TELEGRAM_WEBHOOK_SECRET:
        header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if header != TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=401, detail="Invalid webhook secret")

    payload = await request.json()
    message = payload.get("message") or {}
    payment = message.get("successful_payment")
    result = None
    if payment:
        total = payment.get("total_amount")
        amount = (int(total) / 100.0) if isinstance(total, int) else total
        event = {"type": "payment_received", "data": {"amount": amount, "task": "telegram_payment"}}
        # attach signature if secret configured
        if SECRET:
            msg = json.dumps(event["data"], separators=(",",":"), sort_keys=True)
            event["signature"] = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
        event_id = store_event(event)
        update_state(event, event_id=event_id)
        result = enqueue_job(event_id, "C6_payment_worker")
        try:
            log_event(event, result, event_id=event_id)
        except Exception:
            pass
        return {"ok": True, "enqueue_result": result}
    return {"ok": False, "reason": "no_payment"}


@app.post("/telegram")
async def telegram(request: Request):
    # Lightweight bridge endpoint that reuses the same pipeline
    payload = await request.json()
    event = {"type": "telegram_message", "data": payload}

    if not verify_event(event):
        raise HTTPException(status_code=400, detail="Attestation failed")

    event_id = store_event(event)
    update_state(event, event_id=event_id)
    result = None
    if can_spawn("C1_bot_clone"):
        result = enqueue_job(event_id, "C1_bot_clone")
    try:
        log_event(event, result, event_id=event_id)
    except Exception:
        pass
    return {"ok": True, "event_id": event_id, "enqueue_result": result}


@app.get("/state")
def get_state():
    cur.execute("SELECT value FROM system_state WHERE key=?", ("STATE",))
    row = cur.fetchone()
    return {"state": row[0] if row else "IDLE"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5050)
