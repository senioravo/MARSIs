// Interventions the operator can make while the simulation runs.

import { FACILITIES, VEHICLES } from "./catalog";
import { assignHomes, autoAssign, defaultEnv } from "./create";
import { personName } from "./names";
import { Rng } from "./rng";
import { crewFor, dispatchResponders, log, recomputeCapacity, startMission, startService } from "./tick";
import type { CropKind, Facility, FacilityKind, MissionKind, Policies, ResourceKey, ResourceMap, Role, SimState } from "./types";

export function toggleFacility(s: SimState, id: string) {
  const f = s.facilities.find((x) => x.id === id);
  if (!f) return;
  f.enabled = !f.enabled;
  if (!f.enabled) {
    for (const p of s.people) if (p.facilityId === f.id && p.status === "assigned") { p.status = "available"; p.facilityId = null; }
  }
  log(s, "info", `${f.name} switched ${f.enabled ? "on" : "off"}.`, "system");
  if (FACILITIES[f.kind].housing) assignHomes(s);
}

export function serviceFacility(s: SimState, id: string) {
  const f = s.facilities.find((x) => x.id === id);
  if (f) startService(s, f, undefined, true);
}

export function setCrop(s: SimState, id: string, crop: CropKind) {
  const f = s.facilities.find((x) => x.id === id);
  if (!f || f.kind !== "greenhouse" || f.crop === crop) return;
  f.crop = crop;
  f.growth = 0;
  f.stockpile = 0;
  log(s, "info", `${f.name} replanted with ${crop}. The current crop was composted.`, "harvest");
}

export function setPolicy<K extends keyof Policies>(s: SimState, key: K, value: Policies[K]) {
  s.config.policies[key] = value;
}

export function assignPeople(s: SimState, ids: string[], facilityId: string | null, sectorId: string | null) {
  const f = facilityId ? s.facilities.find((x) => x.id === facilityId) : undefined;
  let n = 0;
  for (const id of ids) {
    const p = s.people.find((x) => x.id === id);
    if (!p || p.status === "deceased" || p.status === "responding" || p.status === "medical") continue;
    if (s.vehicles.some((v) => v.crew.includes(p.id))) continue;
    p.facilityId = f?.id ?? null;
    p.sectorId = f?.sectorId ?? sectorId;
    p.status = f ? "assigned" : "available";
    n++;
  }
  if (n) log(s, "info", f ? `${n} crew assigned to ${f.name}.` : `${n} crew released to the available pool.`, "system");
}

export function autoAssignIdle(s: SimState) {
  const before = s.people.filter((p) => p.status === "assigned").length;
  autoAssign(s);
  const after = s.people.filter((p) => p.status === "assigned").length;
  log(s, "info", after > before ? `Auto-assigned ${after - before} idle crew.` : "No open positions for idle crew.", "system");
}

export function registerPerson(s: SimState, name: string, role: Role, available: boolean) {
  const rng = new Rng(s.rng ^ s.counter);
  s.counter += 1;
  s.people.push({
    id: `p${s.counter}`,
    name: name.trim() || personName(rng),
    role,
    status: available ? "available" : "pending",
    health: 95,
    facilityId: null,
    sectorId: null,
    homeId: null,
    shift: (["A", "B", "C"] as const)[s.counter % 3],
    incidentId: null,
    arrivedSol: Math.floor(s.t / 24),
    dose: 0,
  });
  assignHomes(s);
  log(s, "info", `${name.trim() || "New colonist"} registered as ${role}.`, "system");
}

export function dispatchVehicle(s: SimState, id: string, mission: MissionKind): string | null {
  const v = s.vehicles.find((x) => x.id === id);
  if (!v) return "Vehicle not found.";
  if (v.status !== "docked" && v.status !== "charging") return `${v.name} is not in the garage.`;
  if (v.charge < 0.25) return `${v.name} needs to charge first.`;
  const crew = crewFor(s, v);
  if (VEHICLES[v.kind].crew > crew.length) return `No free crew for ${v.name}. Release a pilot or geologist first.`;
  const rescueOf = mission === "rescue" ? s.vehicles.find((x) => x.status === "stranded")?.id : undefined;
  if (mission === "rescue" && !rescueOf) return "No stranded vehicle to rescue.";
  const rng = new Rng(s.rng ^ (s.t * 7919));
  const ok = startMission(s, v, mission, rng, crew, rescueOf);
  return ok ? null : `${v.name} cannot make that trip (charge or oxygen too low).`;
}

export function recallVehicle(s: SimState, id: string) {
  const v = s.vehicles.find((x) => x.id === id);
  if (!v?.mission || v.status !== "mission") return;
  v.mission.elapsed = Math.max(v.mission.elapsed, v.mission.duration - Math.ceil(v.mission.elapsed * 0.66));
  v.mission.cargoKg = -1; // recalled: nothing to deliver
  v.status = "returning";
  log(s, "info", `${v.name} recalled. Returning without cargo.`, "mission");
}

export function respondToIncident(s: SimState, incidentId: string) {
  const inc = s.incidents.find((i) => i.id === incidentId);
  if (!inc || inc.status === "resolved") return;
  inc.manual = true;
  const onVehicles = new Set(s.vehicles.flatMap((v) => v.crew));
  const pool = s.people
    .filter((p) => (p.status === "available" || p.status === "pending" || p.status === "assigned") && p.health > 40 && !onVehicles.has(p.id))
    .sort((a, b) => Number(b.role === inc.needsRole) - Number(a.role === inc.needsRole));
  dispatchResponders(s, inc, pool.slice(0, Math.max(0, inc.crewNeeded - inc.responders.length)));
  log(s, "info", `Crew dispatched to ${inc.title}.`, inc.kind);
}

export function buildCost(kind: FacilityKind): { cost: ResourceMap; hours: number } {
  const cat = FACILITIES[kind].category;
  if (cat === "habitat") return { cost: { construction: 1400, metals: 260, components: 18 }, hours: 120 };
  if (cat === "energy") return { cost: { construction: 300, metals: 320, silicon: 160, components: 14 }, hours: 72 };
  if (cat === "storage") return { cost: { construction: 900, metals: 180, components: 6 }, hours: 60 };
  return { cost: { construction: 500, metals: 200, silicon: 40, components: 12 }, hours: 84 };
}

export function canAfford(s: SimState, cost: ResourceMap) {
  return Object.entries(cost).every(([k, v]) => s.resources[k as ResourceKey] >= (v ?? 0));
}

export function buildFacility(s: SimState, kind: FacilityKind, sectorId: string, crop?: CropKind): string | null {
  const { cost, hours } = buildCost(kind);
  if (!canAfford(s, cost)) return "Not enough materials in stock.";
  for (const [k, v] of Object.entries(cost)) s.resources[k as ResourceKey] -= v ?? 0;
  const def = FACILITIES[kind];
  const n = s.facilities.filter((f) => f.kind === kind).length + 1;
  const f: Facility = {
    id: `f-b${s.t}-${n}`,
    kind,
    name: `${def.label} ${n}`,
    sectorId,
    status: "repair",
    enabled: true,
    integrity: 100,
    hours: 0,
    efficiency: 0,
    powered: false,
    repairHoursLeft: hours,
    repairReason: "Under construction",
    lastService: s.t,
    crop: kind === "greenhouse" ? (crop ?? "potato") : undefined,
    growth: 0,
    stockpile: 0,
    output: {},
    residents: 0,
    env: def.housing ? defaultEnv() : undefined,
    seals: "sealed",
  };
  s.facilities.push(f);
  const { cap, battery } = recomputeCapacity(s);
  s.capacity = cap;
  s.batteryCap = battery;
  log(s, "info", `Construction started: ${f.name} in ${s.sectors.find((x) => x.id === sectorId)?.name ?? "colony"} (${hours} h).`, "system");
  return null;
}
