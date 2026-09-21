// Compatibility facade. The canonical PostgreSQL implementation lives in postgres-store.mjs.
export {
  createPostgresPool,
  createPostgresRepository,
  migratePostgres,
} from './postgres-store.mjs';
