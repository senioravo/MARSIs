import { FACILITIES } from "./catalog";
import { housingOf } from "./create";
import type { Facility, ResourceKey, SimState } from "./types";

export interface Balance {
  stock: number;
  capacity: number;
  prod: number; // per sol
  cons: number; // per sol
  net: number;
  days: number; // Infinity when production covers consumption
}

export function isRunning(f: Facility): boolean {
  if (!f.enabled) return false;
  const cat = FACILITIES[f.kind].category;
  if (cat === "habitat" || cat === "storage") return f.status !== "disabled";
  return f.status === "operational";
}

export function sumFlows(s: SimState, key: ResourceKey): { prod: number; cons: number } {
  const n = s.flows.length || 1;
  let prod = 0;
  let cons = 0;
  for (const f of s.flows) {
    prod += f.prod[key] ?? 0;
    cons += f.cons[key] ?? 0;
  }
  // normalise to a full sol even early in the run
  const k = 24 / n;
  return { prod: prod * k, cons: cons * k };
}

export function balance(s: SimState, key: ResourceKey): Balance {
  let { prod, cons } = sumFlows(s, key);
  if (key === "food") {
    // harvests are lumpy; use steady-state farm output instead of the last 24 hours
    prod = expectedFoodPerSol(s);
  }
  const net = prod - cons;
  const stock = s.resources[key];
  return {
    stock,
    capacity: s.capacity[key],
    prod,
    cons,
    net,
    days: net >= 0 ? Infinity : stock / -net,
  };
}

/** Food grown per sol (crops accrue toward harvest every hour), from the last 24 hours. */
export function expectedFoodPerSol(s: SimState): number {
  if (!s.flows.length) return 0;
  return (s.flows.reduce((a, f) => a + f.foodLocal, 0) * 24) / s.flows.length;
}

export function alive(s: SimState) {
  return s.people.filter((p) => p.status !== "deceased");
}

export interface Kpis {
  sol: number;
  hour: number;
  population: number;
  housing: number;
  density: number;
  oxygen: Balance;
  water: Balance;
  food: Balance;
  energy: { gen: number; demand: number; battery: number; batteryCap: number; hours: number; balance: number; daily: number };
  facilities: { operational: number; repair: number; disabled: number; offline: number; total: number };
  staff: { available: number; assigned: number; pending: number; responding: number; medical: number };
  selfSufficiency: { food: number; water: number; energy: number; materials: number; overall: number };
  health: number;
  openIncidents: number;
  criticalIncidents: number;
  commsUp: boolean;
  status: number; // 0 – 100 colony status index
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function kpis(s: SimState): Kpis {
  const people = alive(s);
  const housing = housingOf(s.facilities.filter((f) => f.status !== "disabled"));
  const oxygen = balance(s, "oxygen");
  const water = balance(s, "water");
  const food = balance(s, "food");

  let gen = 0;
  let use = 0;
  let recycled = 0;
  let waterUse = 0;
  for (const f of s.flows) {
    gen += f.energyGen;
    use += f.energyUse;
    recycled += f.recycled;
    waterUse += f.waterUse;
  }
  const n = s.flows.length || 1;
  const demand = s.power.demand;
  const fac = { operational: 0, repair: 0, disabled: 0, offline: 0, total: s.facilities.length };
  for (const f of s.facilities) {
    if (!f.enabled) fac.offline++;
    else fac[f.status === "offline" ? "offline" : f.status]++;
  }
  const staff = { available: 0, assigned: 0, pending: 0, responding: 0, medical: 0 };
  for (const p of people) if (p.status !== "deceased") staff[p.status]++;

  const foodNeed = people.length * s.config.consumption.food * s.config.policies.foodRation;
  const foodSelf = foodNeed > 0 ? clamp01(expectedFoodPerSol(s) / foodNeed) : 1;
  const waterSelf = waterUse > 0 ? clamp01(recycled / waterUse) : 0;
  const energySelf = use > 0 ? clamp01(gen / use) : 1;
  const matTotal = s.stats.componentsLocal + s.stats.componentsImported;
  const matSelf = matTotal > 0 ? s.stats.componentsLocal / matTotal : 0;
  const health = people.length ? people.reduce((a, p) => a + p.health, 0) / people.length : 0;
  const open = s.incidents.filter((i) => i.status !== "resolved");

  const dayScore = (d: number) => clamp01(d / 60);
  const status =
    100 *
    (0.18 * dayScore(oxygen.days) +
      0.14 * dayScore(water.days) +
      0.14 * dayScore(food.days) +
      0.12 * clamp01(s.power.gen / Math.max(1, demand)) +
      0.16 * (health / 100) +
      0.12 * (fac.total ? fac.operational / fac.total : 1) +
      0.14 * clamp01(1 - open.reduce((a, i) => a + i.severity, 0) / 12));

  return {
    sol: Math.floor(s.t / 24),
    hour: s.t % 24,
    population: people.length,
    housing,
    density: housing ? people.length / housing : 0,
    oxygen,
    water,
    food,
    energy: {
      gen: s.power.gen,
      demand,
      battery: s.battery,
      batteryCap: s.batteryCap,
      hours: demand > 0 ? s.battery / demand : Infinity,
      balance: ((gen - use) / n) * 24,
      daily: (gen / n) * 24,
    },
    facilities: fac,
    staff,
    selfSufficiency: {
      food: foodSelf,
      water: waterSelf,
      energy: energySelf,
      materials: matSelf,
      overall: (foodSelf + waterSelf + energySelf + matSelf) / 4,
    },
    health,
    openIncidents: open.length,
    criticalIncidents: open.filter((i) => i.severity >= 3).length,
    commsUp: s.comms.some((c) => c.status === "available"),
    status,
  };
}

export function formatDays(d: number): string {
  if (!Number.isFinite(d)) return "Sustained";
  if (d < 1) return `${Math.max(0, Math.round(d * 24))} h`;
  if (d > 999) return "999+ sols";
  return `${d < 10 ? d.toFixed(1) : Math.round(d)} sols`;
}

export function formatClock(t: number): { sol: number; hh: string; mm: string } {
  const sol = Math.floor(t / 24);
  const h = Math.floor(t % 24);
  const m = Math.floor((t % 1) * 60);
  return { sol, hh: String(h).padStart(2, "0"), mm: String(m).padStart(2, "0") };
}
