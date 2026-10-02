import { readFile } from "node:fs/promises";
import pg from "pg";

const raw = process.env.DATABASE_URL;

/**
 * Neon strings carry libpq-style sslmode / channel_binding parameters. node-postgres
 * interprets sslmode differently (and warns), so read them here and configure TLS and
 * SCRAM channel binding explicitly instead.
 */
function connectionOptions(urlString) {
  const url = new URL(urlString);
  const sslmode = url.searchParams.get("sslmode");
  const binding = url.searchParams.get("channel_binding");
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");
  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  return {
    connectionString: url.toString(),
    ssl: local || sslmode === "disable" ? false : { rejectUnauthorized: true },
    enableChannelBinding: binding === "require" || binding === "prefer",
  };
}

/** null when no DATABASE_URL is configured — the API then reports db:false and the frontend saves locally. */
export const pool = raw
  ? new pg.Pool({
      ...connectionOptions(raw),
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
    })
  : null;

export async function migrate() {
  if (!pool) throw new Error("DATABASE_URL is not set.");
  const sql = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
}

export async function ping() {
  if (!pool) return false;
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}
