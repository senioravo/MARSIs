import express from "express";
import { authConfig, authenticate } from "./auth.js";
import { migrate, ping, pool } from "./db.js";

const PORT = Number(process.env.PORT ?? 8787);
const ORIGINS = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",").map((s) => s.trim());

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUN_ID = /^[a-z0-9-]{4,64}$/i;

const app = express();
app.use(express.json({ limit: "15mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const requireDb = (_req, res, next) => (pool ? next() : res.status(503).json({ error: "No database configured. Set DATABASE_URL." }));
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

// Public: lets the frontend discover storage and how to sign in (no secrets here).
app.get("/api/health", async (_req, res) => {
  const { enabled, required, tenantId, authority, spaClientId, scope } = authConfig;
  res.json({ ok: true, db: await ping(), auth: { enabled, required, tenantId, authority, clientId: spaClientId, scope } });
});

// Everything below runs after token validation; req.user is the signed-in user or null.
app.use("/api", authenticate());

app.get("/api/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Not signed in." });
  res.json(req.user);
});

/** owner_oid for the current request: the user object id, or null when anonymous. */
const owner = (req) => req.user?.oid ?? null;

// ───────────────────────────── colonies

app.get("/api/colonies", requireDb, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `select id, name, site_id as "siteId", population, updated_at as "updatedAt"
       from colonies where owner_oid is not distinct from $1 order by updated_at desc limit 50`,
    [owner(req)],
  );
  res.json(rows);
}));

function colonyFields(body) {
  const c = body?.config;
  if (!c || typeof c !== "object" || !Array.isArray(c.facilities) || typeof c.siteId !== "string") return null;
  return {
    name: String(body.name ?? c.name ?? "Unnamed colony").slice(0, 80),
    siteId: c.siteId.slice(0, 40),
    population: Math.max(0, Math.min(10_000, Number(c.population) || 0)),
    config: c,
  };
}

app.post("/api/colonies", requireDb, wrap(async (req, res) => {
  const f = colonyFields(req.body);
  if (!f) return res.status(400).json({ error: "Body must be { name, config } with a colony config." });
  const { rows } = await pool.query(
    "insert into colonies (name, site_id, population, config, owner_oid, owner_name) values ($1, $2, $3, $4, $5, $6) returning id",
    [f.name, f.siteId, f.population, f.config, owner(req), req.user?.name ?? null],
  );
  res.status(201).json({ id: rows[0].id });
}));

app.put("/api/colonies/:id", requireDb, wrap(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid colony id." });
  const f = colonyFields(req.body);
  if (!f) return res.status(400).json({ error: "Body must be { name, config } with a colony config." });
  const { rows } = await pool.query(
    `insert into colonies (id, name, site_id, population, config, owner_oid, owner_name) values ($1, $2, $3, $4, $5, $6, $7)
     on conflict (id) do update set name = excluded.name, site_id = excluded.site_id,
       population = excluded.population, config = excluded.config, updated_at = now()
       where colonies.owner_oid is not distinct from excluded.owner_oid
     returning id`,
    [req.params.id, f.name, f.siteId, f.population, f.config, owner(req), req.user?.name ?? null],
  );
  if (!rows.length) return res.status(404).json({ error: "Colony not found." });
  res.json({ id: rows[0].id });
}));

app.get("/api/colonies/:id", requireDb, wrap(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid colony id." });
  const { rows } = await pool.query("select id, name, config from colonies where id = $1 and owner_oid is not distinct from $2", [req.params.id, owner(req)]);
  if (!rows.length) return res.status(404).json({ error: "Colony not found." });
  res.json(rows[0]);
}));

app.delete("/api/colonies/:id", requireDb, wrap(async (req, res) => {
  if (!UUID.test(req.params.id)) return res.status(400).json({ error: "Invalid colony id." });
  await pool.query("delete from colonies where id = $1 and owner_oid is not distinct from $2", [req.params.id, owner(req)]);
  res.sendStatus(204);
}));

// ───────────────────────────── simulation runs

app.get("/api/runs", requireDb, wrap(async (req, res) => {
  const { rows } = await pool.query(
    `select id, colony_name as "colonyName", site_id as "siteId", sol, duration_sols as "durationSols",
            population, status, updated_at as "updatedAt"
       from simulation_runs where owner_oid is not distinct from $1 order by updated_at desc limit 50`,
    [owner(req)],
  );
  res.json(rows);
}));

app.put("/api/runs/:id", requireDb, wrap(async (req, res) => {
  const id = req.params.id;
  if (!RUN_ID.test(id)) return res.status(400).json({ error: "Invalid run id." });
  const { summary, metrics, state } = req.body ?? {};
  if (!summary || !state || typeof state !== "object" || !Array.isArray(state.facilities)) {
    return res.status(400).json({ error: "Body must be { summary, metrics, state }." });
  }
  const status = ["running", "complete", "lost"].includes(summary.status) ? summary.status : "running";
  const client = await pool.connect();
  try {
    await client.query("begin");
    const saved = await client.query(
      `insert into simulation_runs (id, colony_name, site_id, sol, duration_sols, population, status, metrics, state, owner_oid, owner_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       on conflict (id) do update set colony_name = excluded.colony_name, sol = excluded.sol,
         population = excluded.population, status = excluded.status, metrics = excluded.metrics,
         state = excluded.state, updated_at = now()
         where simulation_runs.owner_oid is not distinct from excluded.owner_oid
       returning id`,
      [
        id,
        String(summary.colonyName ?? "Colony").slice(0, 80),
        String(summary.siteId ?? "").slice(0, 40),
        Number(summary.sol) || 0,
        Number(summary.durationSols) || 0,
        Number(summary.population) || 0,
        status,
        metrics ?? {},
        state,
        owner(req),
        req.user?.name ?? null,
      ],
    );
    if (!saved.rows.length) {
      await client.query("rollback");
      return res.status(404).json({ error: "Run not found." });
    }
    const incidents = Array.isArray(state.incidents) ? state.incidents : [];
    if (incidents.length) {
      const where = (i) =>
        state.facilities.find((f) => f.id === i.facilityId)?.name ??
        state.vehicles?.find((v) => v.id === i.vehicleId)?.name ??
        state.comms?.find((c) => c.id === i.commsId)?.name ??
        state.sectors?.find((s) => s.id === i.sectorId)?.name ??
        "Colony-wide";
      await client.query(
        `insert into run_incidents (run_id, incident_id, kind, severity, status, title, location, responsible, opened_hour, resolved_hour, needs)
         select $1, x.incident_id, x.kind, x.severity, x.status, x.title, x.location, x.responsible, x.opened_hour, x.resolved_hour, x.needs
           from jsonb_to_recordset($2::jsonb) as x(incident_id text, kind text, severity int, status text, title text,
                location text, responsible text, opened_hour int, resolved_hour int, needs jsonb)
         on conflict (run_id, incident_id) do update set severity = excluded.severity, status = excluded.status,
           responsible = excluded.responsible, resolved_hour = excluded.resolved_hour`,
        [
          id,
          JSON.stringify(
            incidents.map((i) => ({
              incident_id: String(i.id),
              kind: String(i.kind),
              severity: Number(i.severity) || 1,
              status: String(i.status),
              title: String(i.title ?? "").slice(0, 200),
              location: where(i),
              responsible: i.responsible ?? null,
              opened_hour: Number(i.openedAt) || 0,
              resolved_hour: i.resolvedAt ?? null,
              needs: i.needs ?? {},
            })),
          ),
        ],
      );
    }
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  res.json({ id });
}));

app.get("/api/runs/:id", requireDb, wrap(async (req, res) => {
  if (!RUN_ID.test(req.params.id)) return res.status(400).json({ error: "Invalid run id." });
  const { rows } = await pool.query("select id, state from simulation_runs where id = $1 and owner_oid is not distinct from $2", [req.params.id, owner(req)]);
  if (!rows.length) return res.status(404).json({ error: "Run not found." });
  res.json(rows[0]);
}));

app.get("/api/runs/:id/incidents", requireDb, wrap(async (req, res) => {
  if (!RUN_ID.test(req.params.id)) return res.status(400).json({ error: "Invalid run id." });
  const { rows } = await pool.query(
    `select incident_id as id, kind, severity, status, title, location, responsible,
            opened_hour as "openedHour", resolved_hour as "resolvedHour", needs
       from run_incidents i
      where i.run_id = $1
        and exists (select 1 from simulation_runs r where r.id = i.run_id and r.owner_oid is not distinct from $2)
      order by opened_hour desc`,
    [req.params.id, owner(req)],
  );
  res.json(rows);
}));

app.delete("/api/runs/:id", requireDb, wrap(async (req, res) => {
  if (!RUN_ID.test(req.params.id)) return res.status(400).json({ error: "Invalid run id." });
  await pool.query("delete from simulation_runs where id = $1 and owner_oid is not distinct from $2", [req.params.id, owner(req)]);
  res.sendStatus(204);
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Database error. Check the server log." });
});

if (pool) {
  try {
    await migrate();
    console.log("Database connected; schema up to date.");
  } catch (e) {
    console.error(`Database unavailable (${e.message}). The API will report db:false.`);
  }
} else {
  console.log("No DATABASE_URL set. Running without a database; the simulator saves in the browser.");
}

console.log(
  authConfig.enabled
    ? `Entra ID auth ${authConfig.required ? "required" : "optional"} (tenant ${authConfig.tenantId}, scope ${authConfig.scope}).`
    : "Entra ID auth off.",
);
app.listen(PORT, () => console.log(`MARSIS API listening on http://localhost:${PORT}`));
