import pg from 'pg';
import { createDurableStore } from './durable-store.mjs';

const { Pool } = pg;

function requireConfig(name, value) {
  if (!value) throw new Error(`POSTGRES_CONFIG_MISSING:${name}`);
  return value;
}

export function createPostgresPool(config = {}) {
  const connectionString = config.connectionString || process.env.DATABASE_URL;
  if (!connectionString && !process.env.PGHOST) {
    throw new Error('POSTGRES_CONFIG_MISSING:DATABASE_URL_OR_PGHOST');
  }
  return new Pool({
    connectionString,
    host: config.host || process.env.PGHOST,
    port: config.port || process.env.PGPORT,
    user: config.user || process.env.PGUSER,
    password: config.password || process.env.PGPASSWORD,
    database: config.database || process.env.PGDATABASE,
    max: config.max || 4,
    idleTimeoutMillis: config.idleTimeoutMillis || 10_000,
  });
}

export function createPostgresDurableRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new Error('POSTGRES_POOL_REQUIRED');
  }

  const transaction = async (fn) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const tx = {
        async insertEvent(event) {
          requireConfig('event.id', event.id);
          await client.query(
            `INSERT INTO ed_narsg_events
              (event_id, aggregate_id, sequence, event_type, schema_version, created_at,
               correlation_id, causation_id, source, payload, previous_hash, event_hash)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)`,
            [
              event.id,
              event.aggregate_id,
              event.sequence,
              event.event_type,
              event.schema_version,
              event.created_at,
              event.correlation_id,
              event.causation_id,
              JSON.stringify(event.source),
              JSON.stringify(event.payload ?? null),
              event.previous_hash ?? null,
              event.event_hash,
            ],
          );
        },
        async upsertProjection(projection) {
          requireConfig('projection.aggregate_id', projection.aggregate_id);
          requireConfig('projection.last_event_id', projection.last_event_id);
          await client.query(
            `INSERT INTO ed_narsg_state_projections
              (aggregate_id, state_version, state, last_event_id, updated_at)
             VALUES ($1,$2,$3::jsonb,$4,$5)
             ON CONFLICT (aggregate_id) DO UPDATE SET
               state_version = EXCLUDED.state_version,
               state = EXCLUDED.state,
               last_event_id = EXCLUDED.last_event_id,
               updated_at = EXCLUDED.updated_at`,
            [
              projection.aggregate_id,
              projection.state_version ?? 0,
              JSON.stringify(projection.state ?? {}),
              projection.last_event_id,
              projection.updated_at || new Date().toISOString(),
            ],
          );
        },
        async claimIdempotency({ key, executionId }) {
          requireConfig('idempotency.key', key);
          requireConfig('idempotency.executionId', executionId);
          const inserted = await client.query(
            `INSERT INTO ed_narsg_idempotency
              (idempotency_key, execution_id, status, created_at)
             VALUES ($1,$2,'CLAIMED',NOW())
             ON CONFLICT (idempotency_key) DO NOTHING
             RETURNING idempotency_key, execution_id, status, result`,
            [key, executionId],
          );
          if (inserted.rowCount === 1) {
            return { claimed: true, ...inserted.rows[0] };
          }
          const existing = await client.query(
            `SELECT idempotency_key, execution_id, status, result
               FROM ed_narsg_idempotency WHERE idempotency_key = $1`,
            [key],
          );
          const row = existing.rows[0];
          return {
            claimed: false,
            ...row,
            same_execution: row?.execution_id === executionId,
          };
        },
      };
      const result = await fn(tx);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  const loadAggregate = async (aggregateId) => {
    const events = await pool.query(
      `SELECT event_id AS id, aggregate_id, sequence, event_type, schema_version,
              created_at, correlation_id, causation_id, source, payload,
              previous_hash, event_hash
         FROM ed_narsg_events
        WHERE aggregate_id = $1
        ORDER BY sequence ASC`,
      [aggregateId],
    );
    const projection = await pool.query(
      `SELECT aggregate_id, state_version, state, last_event_id, updated_at
         FROM ed_narsg_state_projections WHERE aggregate_id = $1`,
      [aggregateId],
    );
    return {
      aggregate_id: aggregateId,
      events: events.rows,
      projection: projection.rows[0] || null,
    };
  };

  return Object.freeze({ transaction, loadAggregate });
}

export async function closePostgresPool(pool) {
  if (pool && typeof pool.end === 'function') await pool.end();
}

export function createPostgresDurableStore(pool) {
  return createDurableStore(createPostgresDurableRepository(pool));
}
