import { BASE_CAPACITY, CROPS, FACILITIES, RESOURCE_KEYS, ROLE_KEYS, siteById } from "./catalog";
import { personName } from "./names";
import { Rng, hashSeed } from "./rng";
import type {
  ColonyConfig,
  Environment,
  Facility,
  FacilityCategory,
  Person,
  ResourceKey,
  Role,
  Sector,
  SimState,
  Vehicle,
} from "./types";

export const MAP_W = 1000;
export const MAP_H = 640;
export const MAP_CX = MAP_W / 2;
export const MAP_CY = MAP_H / 2 + 10;

export const DIFFICULTY = {
  cadet: { failure: 0.55, stock: 1.2, consumption: 0.92 },
  standard: { failure: 1, stock: 1, consumption: 1 },
  hardcore: { failure: 1.6, stock: 0.75, consumption: 1.08 },
} as const;

export function computeCapacity(facilities: { kind: Facility["kind"] }[]) {
  const cap = { ...BASE_CAPACITY };
  let battery = 50; // lander buffer
  for (const f of facilities) {
    const def = FACILITIES[f.kind];
    if (def.storage) for (const [k, v] of Object.entries(def.storage)) cap[k as ResourceKey] += v ?? 0;
    if (def.battery) battery += def.battery;
  }
  return { cap, battery };
}

export function housingOf(facilities: { kind: Facility["kind"] }[]) {
  return facilities.reduce((a, f) => a + (FACILITIES[f.kind].housing ?? 0), 0);
}

export function sectorLayout(count: number, index: number): { x: number; y: number } {
  if (count === 1) return { x: MAP_CX, y: MAP_CY };
  const rx = count <= 3 ? 230 : 300;
  const ry = count <= 3 ? 150 : 200;
  const a = -Math.PI / 2 + (index / count) * Math.PI * 2 + (count % 2 === 0 ? Math.PI / count : 0);
  return { x: MAP_CX + Math.cos(a) * rx, y: MAP_CY + Math.sin(a) * ry };
}

export function defaultEnv(): Environment {
  return { temp: 21, pressure: 101.3, humidity: 42, o2: 21, co2: 650, airQuality: 94, radiation: 0.2, dust: 8 };
}

/** Allocate role counts from weights using largest-remainder rounding. */
export function roleCounts(total: number, mix: Record<Role, number>): Record<Role, number> {
  const sum = ROLE_KEYS.reduce((a, r) => a + Math.max(0, mix[r]), 0) || 1;
  const raw = ROLE_KEYS.map((r) => ({ r, v: (Math.max(0, mix[r]) / sum) * total }));
  const out = Object.fromEntries(raw.map(({ r, v }) => [r, Math.floor(v)])) as Record<Role, number>;
  let left = total - Object.values(out).reduce((a, b) => a + b, 0);
  raw.sort((a, b) => (b.v % 1) - (a.v % 1));
  for (let i = 0; left > 0; i = (i + 1) % raw.length, left--) out[raw[i].r] += 1;
  return out;
}

const STAFF_ORDER: FacilityCategory[] = ["life", "energy", "agri", "health", "industry", "science", "habitat", "storage"];

/** Put idle, healthy colonists to work where they fit best. Pilots stay free for vehicles. */
export function autoAssign(state: SimState, onlyIdle = true) {
  const byId = new Map(state.facilities.map((f) => [f.id, f]));
  const working = (fid: string) => state.people.filter((p) => p.facilityId === fid && p.status === "assigned").length;
  const idle = () =>
    state.people.filter(
      (p) => (p.status === "available" || p.status === "pending" || (!onlyIdle && p.status === "assigned")) && p.role !== "pilot",
    );
  if (!onlyIdle) for (const p of state.people) if (p.status === "assigned") { p.status = "available"; p.facilityId = null; }
  const ordered = [...state.facilities]
    .filter((f) => FACILITIES[f.kind].staff > 0 && f.status !== "disabled")
    .sort((a, b) => STAFF_ORDER.indexOf(FACILITIES[a.kind].category) - STAFF_ORDER.indexOf(FACILITIES[b.kind].category));
  // three passes: preferred role, technicians, anyone
  for (let pass = 0; pass < 3; pass++) {
    for (const f of ordered) {
      const def = FACILITIES[f.kind];
      while (working(f.id) < def.staff) {
        const pool = idle();
        const p =
          pass === 0
            ? pool.find((x) => def.roles.includes(x.role))
            : pass === 1
              ? pool.find((x) => x.role === "technician" || x.role === "engineer")
              : pool.find((x) => x.role !== "medic" && x.role !== "scientist");
        if (!p) break;
        p.status = "assigned";
        p.facilityId = f.id;
        p.sectorId = byId.get(f.id)?.sectorId ?? null;
      }
    }
  }
}

export function assignHomes(state: SimState) {
  const habs = state.facilities.filter((f) => FACILITIES[f.kind].housing && f.status !== "disabled");
  for (const h of habs) h.residents = 0;
  const alive = state.people.filter((p) => p.status !== "deceased");
  let i = 0;
  for (const p of alive) {
    // fill habitats in order, overflow spreads evenly
    let home = habs.find((h) => h.residents < (FACILITIES[h.kind].housing ?? 0));
    if (!home && habs.length) home = habs[i++ % habs.length];
    p.homeId = home?.id ?? null;
    if (home) home.residents += 1;
  }
}

export function makePerson(rng: Rng, role: Role, id: string, sol: number): Person {
  return {
    id,
    name: personName(rng),
    role,
    status: sol === 0 ? "available" : "pending",
    health: rng.range(88, 100),
    facilityId: null,
    sectorId: null,
    homeId: null,
    shift: rng.pick(["A", "B", "C"] as const),
    incidentId: null,
    arrivedSol: sol,
    dose: 0,
  };
}

export function createState(config: ColonyConfig): SimState {
  const cfg = structuredClone(config);
  const rng = new Rng(hashSeed(cfg.seed));
  const diff = DIFFICULTY[cfg.difficulty];
  const site = siteById(cfg.siteId);

  const sectors: Sector[] = cfg.sectors.map((s, i) => ({ ...s, ...sectorLayout(cfg.sectors.length, i) }));

  const facilities: Facility[] = cfg.facilities.map((fc) => {
    const def = FACILITIES[fc.kind];
    const f: Facility = {
      id: fc.id,
      kind: fc.kind,
      name: fc.name,
      sectorId: fc.sectorId,
      status: "operational",
      enabled: true,
      integrity: rng.range(80, 100),
      hours: Math.round(rng.range(0, 400)),
      efficiency: 1,
      powered: true,
      repairHoursLeft: 0,
      repairReason: "",
      lastService: -Math.round(rng.range(0, 300)),
      crop: fc.crop,
      growth: 0,
      stockpile: 0,
      output: {},
      residents: 0,
      seals: "sealed",
    };
    if (def.housing) f.env = defaultEnv();
    if (fc.kind === "greenhouse") {
      const crop = CROPS[fc.crop ?? "potato"];
      f.growth = rng.range(0, crop.cycleSols * 0.9);
      f.stockpile = f.growth * crop.yieldPerSol * 0.92;
    }
    return f;
  });

  const { cap, battery } = computeCapacity(facilities);
  const resources = Object.fromEntries(RESOURCE_KEYS.map((k) => [k, 0])) as Record<ResourceKey, number>;
  for (const k of RESOURCE_KEYS) resources[k] = Math.min(cap[k], Math.round((cfg.stock[k] ?? 0) * diff.stock));

  const counts = roleCounts(cfg.population, cfg.roleMix);
  const people: Person[] = [];
  let pid = 0;
  for (const role of ROLE_KEYS) for (let i = 0; i < counts[role]; i++) people.push(makePerson(rng, role, `p${++pid}`, 0));

  const garage = sectors.find((s) => s.kind === "industrial") ?? sectors[0];
  const vehicles: Vehicle[] = cfg.vehicles.map((vc, i) => ({
    id: vc.id,
    kind: vc.kind,
    name: vc.name,
    status: "docked",
    charge: 1,
    integrity: rng.range(85, 100),
    x: (garage?.x ?? MAP_CX) + 40 + (i % 3) * 16,
    y: (garage?.y ?? MAP_CY) + 46 + Math.floor(i / 3) * 14,
    crew: [],
    mission: null,
    distanceKm: Math.round(rng.range(0, 800)),
    hours: Math.round(rng.range(0, 200)),
    serviceDueHours: 220 + Math.round(rng.range(0, 120)),
    cargoKg: 0,
    serviceHoursLeft: 0,
  }));

  const state: SimState = {
    id: `run-${Date.now().toString(36)}`,
    config: cfg,
    t: 6, // land at dawn
    rng: hashSeed(cfg.seed + "|sim"),
    ended: null,
    resources,
    capacity: cap,
    battery: battery * cfg.batteryCharge,
    batteryCap: battery,
    power: { gen: 0, demand: 0, shed: 0, solar: 0, steady: 0 },
    sectors,
    facilities,
    people,
    vehicles,
    comms: cfg.comms.map((c) => ({ ...c, status: "available", history: [{ t: 6, status: "available", note: "Commissioned" }], hoursLeft: 0 })),
    incidents: [],
    log: [
      {
        t: 6,
        level: "info",
        kind: "system",
        text: `${cfg.name} established at ${site.label} with ${people.length} colonists.`,
      },
    ],
    history: [],
    flows: [],
    weather: {
      tau: 0.45 + rng.range(0, 0.2),
      stormHoursLeft: 0,
      stormScale: "none",
      flareHoursLeft: 0,
      extTemp: site.baseTemp,
      extPressure: site.pressure,
      radiation: site.radiation,
    },
    research: 0,
    upgrades: {},
    surveyBonus: 0,
    nextResupply: cfg.events.resupply ? Math.round(cfg.events.resupplyEverySols * 24 * rng.range(0.8, 1.2)) : Infinity,
    stats: { deaths: 0, arrivals: 0, incidents: 0, resolved: 0, storms: 0, harvestKg: 0, missions: 0, peakPopulation: people.length, componentsLocal: 0, componentsImported: 0, upgrades: 0 },
    alerted: {},
    counter: 0,
  };

  assignHomes(state);
  autoAssign(state);
  return state;
}
