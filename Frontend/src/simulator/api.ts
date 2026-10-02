// Persistence: the MARSIS API (Postgres on Neon) when it is reachable,
// otherwise this browser's localStorage. Same interface either way.

import type { ColonyConfig, SimState } from "./engine/types";
import { kpis } from "./engine/kpis";

export type StorageMode = "database" | "browser";

export interface ColonySummary {
  id: string;
  name: string;
  siteId: string;
  population: number;
  updatedAt: string;
}

export interface RunSummary {
  id: string;
  colonyName: string;
  siteId: string;
  sol: number;
  durationSols: number;
  population: number;
  status: "running" | "complete" | "lost";
  updatedAt: string;
}

const API = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api";
const LS_COLONIES = "marsis.sim.colonies";
const LS_RUNS = "marsis.sim.runs";
const LS_RUN = (id: string) => `marsis.sim.run.${id}`;
const MAX_LOCAL_RUNS = 8;

let modePromise: Promise<StorageMode> | null = null;

export function storageMode(): Promise<StorageMode> {
  if (!modePromise) {
    modePromise = fetch(`${API}/health`, { signal: AbortSignal.timeout(2500) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && j.db ? "database" : "browser") as StorageMode)
      .catch(() => "browser" as StorageMode);
  }
  return modePromise;
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

// ───────────────────────────── colonies (builder designs)

type LocalColony = ColonySummary & { config: ColonyConfig };

export async function listColonies(): Promise<ColonySummary[]> {
  if ((await storageMode()) === "database") return http<ColonySummary[]>("/colonies");
  return readLocal<LocalColony[]>(LS_COLONIES, []).map(({ config: _c, ...rest }) => rest);
}

export async function saveColony(config: ColonyConfig, id?: string): Promise<string> {
  if ((await storageMode()) === "database") {
    const body = JSON.stringify({ name: config.name, config });
    const r = id
      ? await http<{ id: string }>(`/colonies/${id}`, { method: "PUT", body })
      : await http<{ id: string }>("/colonies", { method: "POST", body });
    return r.id;
  }
  const all = readLocal<LocalColony[]>(LS_COLONIES, []);
  const newId = id ?? `col-${Date.now().toString(36)}`;
  const entry: LocalColony = {
    id: newId,
    name: config.name,
    siteId: config.siteId,
    population: config.population,
    updatedAt: new Date().toISOString(),
    config,
  };
  writeLocal(LS_COLONIES, [entry, ...all.filter((c) => c.id !== newId)].slice(0, 20));
  return newId;
}

export async function loadColony(id: string): Promise<ColonyConfig> {
  if ((await storageMode()) === "database") return (await http<{ config: ColonyConfig }>(`/colonies/${id}`)).config;
  const c = readLocal<LocalColony[]>(LS_COLONIES, []).find((x) => x.id === id);
  if (!c) throw new Error("Colony not found in this browser.");
  return c.config;
}

export async function deleteColony(id: string): Promise<void> {
  if ((await storageMode()) === "database") return http<void>(`/colonies/${id}`, { method: "DELETE" });
  writeLocal(LS_COLONIES, readLocal<LocalColony[]>(LS_COLONIES, []).filter((c) => c.id !== id));
}

// ───────────────────────────── runs (simulation snapshots)

export function summarize(s: SimState): RunSummary {
  const k = kpis(s);
  return {
    id: s.id,
    colonyName: s.config.name,
    siteId: s.config.siteId,
    sol: k.sol,
    durationSols: s.config.durationSols,
    population: k.population,
    status: s.ended ?? "running",
    updatedAt: new Date().toISOString(),
  };
}

export async function listRuns(): Promise<RunSummary[]> {
  if ((await storageMode()) === "database") return http<RunSummary[]>("/runs");
  return readLocal<RunSummary[]>(LS_RUNS, []);
}

export async function saveRun(s: SimState): Promise<StorageMode> {
  const summary = summarize(s);
  const k = kpis(s);
  const metrics = {
    population: k.population,
    health: Math.round(k.health),
    statusIndex: Math.round(k.status),
    oxygenDays: Number.isFinite(k.oxygen.days) ? k.oxygen.days : null,
    waterDays: Number.isFinite(k.water.days) ? k.water.days : null,
    foodDays: Number.isFinite(k.food.days) ? k.food.days : null,
    selfSufficiency: k.selfSufficiency.overall,
    stats: s.stats,
  };
  if ((await storageMode()) === "database") {
    await http(`/runs/${s.id}`, { method: "PUT", body: JSON.stringify({ summary, metrics, state: s }) });
    return "database";
  }
  const runs = readLocal<RunSummary[]>(LS_RUNS, []).filter((r) => r.id !== s.id);
  const next = [summary, ...runs];
  for (const old of next.slice(MAX_LOCAL_RUNS)) localStorage.removeItem(LS_RUN(old.id));
  if (!writeLocal(LS_RUN(s.id), s)) throw new Error("This browser's storage is full. Delete an older run and try again.");
  writeLocal(LS_RUNS, next.slice(0, MAX_LOCAL_RUNS));
  return "browser";
}

export async function loadRun(id: string): Promise<SimState> {
  const s =
    (await storageMode()) === "database"
      ? (await http<{ state: SimState }>(`/runs/${id}`)).state
      : readLocal<SimState | null>(LS_RUN(id), null);
  if (!s) throw new Error("Run not found.");
  // JSON turns Infinity into null
  if (s.nextResupply == null) s.nextResupply = Infinity;
  return s;
}

export async function deleteRun(id: string): Promise<void> {
  if ((await storageMode()) === "database") return http<void>(`/runs/${id}`, { method: "DELETE" });
  localStorage.removeItem(LS_RUN(id));
  writeLocal(LS_RUNS, readLocal<RunSummary[]>(LS_RUNS, []).filter((r) => r.id !== id));
}
