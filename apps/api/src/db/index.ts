import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/mandaapp_dev",

  // Connection pool sizing
  max: parseInt(process.env.DB_POOL_MAX || "20"),       // Max connections in pool
  min: parseInt(process.env.DB_POOL_MIN || "2"),         // Min idle connections
  idleTimeoutMillis: 30000,                              // Close idle connections after 30s
  connectionTimeoutMillis: 5000,                         // Fail if connection takes > 5s
  maxUses: 7500,                                         // Recycle connections after 7500 queries (prevents memory leaks)

  // Statement timeout to prevent long-running queries from blocking
  statement_timeout: 30000,                              // 30s per query max
});

// Graceful shutdown — drain pool on process exit
process.on('SIGTERM', () => {
  console.log('[DB] SIGTERM received, draining pool...');
  pool.end().then(() => {
    console.log('[DB] Pool drained, exiting.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  pool.end().then(() => process.exit(0));
});

// Log pool errors (don't crash the server)
pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

export const db = drizzle(pool, { schema });
