import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { URL } from "url";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse connection string to extract all components
// This allows us to configure SSL properly while preserving the password
const dbUrl = new URL(process.env.DATABASE_URL);

// Build connection config with explicit parameters
// This ensures SSL config is properly applied
// Note: URL parser automatically decodes the password, but we'll ensure it's decoded
const password = decodeURIComponent(dbUrl.password);

const connectionConfig: pg.PoolConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port || "5432", 10),
  database: dbUrl.pathname.slice(1), // Remove leading '/'
  user: dbUrl.username,
  password: password,
  // Configure SSL to accept Neon's certificate
  ssl: {
    rejectUnauthorized: false,
  },
};

export const pool = new Pool(connectionConfig);
export const db = drizzle(pool, { schema });
