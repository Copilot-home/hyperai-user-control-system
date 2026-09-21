import pg from 'pg';
import { DURABLE_TABLES } from './durable-store.mjs';

const { Pool } = pg;

export function createPostgresPool(config = {}) {
  return new Pool({
    connectionString: config.connectionString || process.env.DATABASE_URL,
    host: config.host || process.env.PGHOST,
    port: config.port || (process.env.PGPORT ? Number(process.env.PGPORT) : undefined),
    user: config.user || process.env.PGUSER,
    password: config.password || process.env.PGPASSWORD,
    database: config.database || process.env.PGDATABASE,
    ssl: config.ssl ?? (process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: true } : undefined),
    max: config.max || 10,
    connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
  });
}

const json = (value) => JSON.stringify(value ?? {});

export function createPostgresRepository(pool) {
  if (!pool || typeof pool.connect !== 'function') throw new Error('POSTGRES_POOL_REQUIRED');
  return Object.freeze({
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx = {
          async insertEvent(event) {
            await client.query(
              'INSERT INTO ' + DURABLE_TABLES.events + ' (event_id, aggregate_id, sequence, event_type, schema_version, created_at, correlation_id, causation_id, source, payload, previous_hash, event_hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11,$12)',
              [event.id,event.aggregate_id,event.sequence,event.event_type,event.schema_version,event.created_at,event.correlation_id,event.causation_id,json(event.source),json(event.payload),event.previous_hash ?? null,event.event_hash],
            );
          },
          async upsertProjection(projection) {
            if (!projection.aggregate_id || !projection.last_event_id) throw new Error('PROJECTION_IDENTITY_INVALID');
            await client.query(
              'INSERT INTO ' + DURABLE_TABLES.projections + ' (aggregate_id, state_version, state, last_event_id, updated_at) VALUES ($1,$2,$3::jsonb,$4,$5) ON CONFLICT (aggregate_id) DO UPDATE SET state_version=EXCLUDED.state_version,state=EXCLUDED.state,last_event_id=EXCLUDED.last_event_id,updated_at=EXCLUDED.updated_at',
              [projection.aggregate_id,projection.state_version ?? 0,json(projection.state),projection.last_event_id,projection.updated_at || new Date().toISOString()],
            );
          },
          async claimIdempotency({ key, executionId, status='CLAIMED', result=null, expiresAt=null }) {
            const inserted = await client.query(
              'INSERT INTO ' + DURABLE_TABLES.idempotency + ' (idempotency_key, execution_id, status, result, created_at, expires_at) VALUES ($1,$2,$3,$4::jsonb,$5,$6) ON CONFLICT (idempotency_key) DO NOTHING RETURNING idempotency_key, execution_id, status, result, created_at, expires_at',
              [key,executionId,status,result === null ? null : json(result),new Date().toISOString(),expiresAt],
            );
            if (inserted.rowCount) return { claimed:true, record:inserted.rows[0] };
            const existing = await client.query(
              'SELECT idempotency_key, execution_id, status, result, created_at, expires_at FROM ' + DURABLE_TABLES.idempotency + ' WHERE idempotency_key=$1',[key],
            );
            return { claimed:false, record:existing.rows[0] || null };
          },
        };
        const result=await work(tx);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch {}
        throw error;
      } finally { client.release(); }
    },
    async loadAggregate(aggregateId) {
      const [events,projection]=await Promise.all([
        pool.query('SELECT event_id AS id, aggregate_id, sequence, event_type, schema_version, created_at, correlation_id, causation_id, source, payload, previous_hash, event_hash FROM ' + DURABLE_TABLES.events + ' WHERE aggregate_id=$1 ORDER BY sequence ASC',[aggregateId]),
        pool.query('SELECT aggregate_id, state_version, state, last_event_id, updated_at FROM ' + DURABLE_TABLES.projections + ' WHERE aggregate_id=$1',[aggregateId]),
      ]);
      const normalizedEvents = events.rows.map((event) => ({
        ...event,
        sequence: Number(event.sequence),
        created_at: new Date(event.created_at).toISOString(),
      }));
      return {events: normalizedEvents,projection:projection.rows[0] || null};
    },
  });
}

export async function migratePostgres(pool,migrationSql) {
  if (!migrationSql) throw new Error('MIGRATION_SQL_REQUIRED');
  await pool.query(migrationSql);
}
