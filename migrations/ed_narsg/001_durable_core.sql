CREATE TABLE IF NOT EXISTS ed_narsg_events (
  event_id TEXT PRIMARY KEY,
  aggregate_id TEXT NOT NULL,
  sequence BIGINT NOT NULL CHECK (sequence >= 0),
  event_type TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  correlation_id TEXT NOT NULL,
  causation_id TEXT,
  source JSONB NOT NULL,
  payload JSONB NOT NULL,
  previous_hash TEXT,
  event_hash TEXT NOT NULL,
  UNIQUE (aggregate_id, sequence),
  UNIQUE (aggregate_id, event_hash)
);

CREATE INDEX IF NOT EXISTS ed_narsg_events_aggregate_idx
  ON ed_narsg_events (aggregate_id, sequence);

CREATE TABLE IF NOT EXISTS ed_narsg_state_projections (
  aggregate_id TEXT PRIMARY KEY,
  state_version BIGINT NOT NULL DEFAULT 0,
  state JSONB NOT NULL,
  last_event_id TEXT NOT NULL REFERENCES ed_narsg_events(event_id),
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS ed_narsg_idempotency (
  idempotency_key TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL,
  status TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ed_narsg_idempotency_execution_idx
  ON ed_narsg_idempotency (execution_id);