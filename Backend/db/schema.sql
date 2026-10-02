-- MARSIS simulator schema (PostgreSQL 13+, e.g. Neon).
-- Safe to run repeatedly: `npm run migrate` applies it, and the server applies it on start.

-- Colony designs saved from the simulator's builder.
CREATE TABLE IF NOT EXISTS colonies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  site_id     text        NOT NULL,
  population  integer     NOT NULL,
  config      jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- One row per simulation run. `state` is the full engine snapshot, so a run
-- can be resumed exactly; the other columns are for listing and reporting.
CREATE TABLE IF NOT EXISTS simulation_runs (
  id             text PRIMARY KEY,
  colony_name    text        NOT NULL,
  site_id        text        NOT NULL,
  sol            integer     NOT NULL,
  duration_sols  integer     NOT NULL,
  population     integer     NOT NULL,
  status         text        NOT NULL CHECK (status IN ('running', 'complete', 'lost')),
  metrics        jsonb       NOT NULL DEFAULT '{}'::jsonb,
  state          jsonb       NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS simulation_runs_updated_idx ON simulation_runs (updated_at DESC);

-- Incident history per run, queryable without unpacking the snapshot
-- (type, severity, location, status, responsible, resources required).
CREATE TABLE IF NOT EXISTS run_incidents (
  run_id       text    NOT NULL REFERENCES simulation_runs (id) ON DELETE CASCADE,
  incident_id  text    NOT NULL,
  kind         text    NOT NULL,
  severity     integer NOT NULL,
  status       text    NOT NULL,
  title        text    NOT NULL,
  location     text,
  responsible  text,
  opened_hour  integer NOT NULL,
  resolved_hour integer,
  needs        jsonb   NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, incident_id)
);

CREATE INDEX IF NOT EXISTS run_incidents_kind_idx ON run_incidents (kind);

-- Ownership (Entra ID object id of the signed-in user). NULL = saved anonymously,
-- before sign-in was required. Each user only sees and edits their own rows.
ALTER TABLE colonies ADD COLUMN IF NOT EXISTS owner_oid text;
ALTER TABLE colonies ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE simulation_runs ADD COLUMN IF NOT EXISTS owner_oid text;
ALTER TABLE simulation_runs ADD COLUMN IF NOT EXISTS owner_name text;
CREATE INDEX IF NOT EXISTS colonies_owner_idx ON colonies (owner_oid, updated_at DESC);
CREATE INDEX IF NOT EXISTS simulation_runs_owner_idx ON simulation_runs (owner_oid, updated_at DESC);
