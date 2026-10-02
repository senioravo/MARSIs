// One simulated hour. Order mirrors the MARSIS operating model:
// resources → production → storage → consumption → balance → autonomy → alerts.

import { BASE_CAPACITY, CROPS, FACILITIES, INCIDENTS, RESOURCES, ROLES, VEHICLES, siteById } from "./catalog";
import { DIFFICULTY, assignHomes, housingOf, makePerson, roleCounts } from "./create";
import { alive, balance, isRunning, kpis } from "./kpis";
import { Rng } from "./rng";
import type {
  Facility,
  FacilityCategory,
  FlowHour,
  Incident,
  IncidentKind,
  LogEntry,
  MissionKind,
  Person,
  ResourceKey,
  ResourceMap,
  Role,
  SimState,
  Vehicle,
} from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const UNSTAFFED_FLOOR: Partial<Record<FacilityCategory, number>> = { energy: 0.75, life: 0.5, agri: 0.45, habitat: 0.8 };

export function daylight(hour: number): number {
  return Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
}

export function log(s: SimState, level: LogEntry["level"], text: string, kind?: LogEntry["kind"]) {
  s.log.push({ t: s.t, level, text, kind });
  if (s.log.length > 400) s.log.splice(0, s.log.length - 400);
}

function emptyFlow(): FlowHour {
  return { prod: {}, cons: {}, energyGen: 0, energyUse: 0, recycled: 0, waterUse: 0, foodLocal: 0, componentsLocal: 0, componentsImported: 0 };
}

function add(s: SimState, fl: FlowHour, key: ResourceKey, amount: number): number {
  if (amount <= 0) return 0;
  const room = Math.max(0, s.capacity[key] - s.resources[key]);
  const put = Math.min(room, amount);
  s.resources[key] += put;
  fl.prod[key] = (fl.prod[key] ?? 0) + amount;
  return put;
}

function take(s: SimState, fl: FlowHour, key: ResourceKey, amount: number): number {
  if (amount <= 0) return 0;
  const got = Math.min(s.resources[key], amount);
  s.resources[key] -= got;
  fl.cons[key] = (fl.cons[key] ?? 0) + got;
  return got;
}

function has(s: SimState, need: ResourceMap): boolean {
  return Object.entries(need).every(([k, v]) => s.resources[k as ResourceKey] >= (v ?? 0));
}

function nextId(s: SimState, prefix: string) {
  s.counter += 1;
  return `${prefix}${s.counter}`;
}

function sectorName(s: SimState, id?: string) {
  return s.sectors.find((x) => x.id === id)?.name ?? "colony";
}

// ───────────────────────────── incidents

export function openIncident(
  s: SimState,
  kind: IncidentKind,
  severity: number,
  opts: { facility?: Facility; vehicleId?: string; commsId?: string; personId?: string; sectorId?: string; title?: string } = {},
): Incident | null {
  const sev = clamp(Math.round(severity), 1, 4) as Incident["severity"];
  const def = INCIDENTS[kind];
  // one live incident per asset is enough
  const dup = s.incidents.find(
    (i) =>
      i.status !== "resolved" &&
      ((opts.facility && i.facilityId === opts.facility.id) ||
        (opts.vehicleId && i.vehicleId === opts.vehicleId) ||
        (opts.commsId && i.commsId === opts.commsId) ||
        (opts.personId && i.personId === opts.personId) ||
        (kind === "radiation" && i.kind === "radiation" && !opts.facility)),
  );
  if (dup) return null;
  const hours = def.hours(sev);
  const where = opts.facility?.name ?? s.vehicles.find((v) => v.id === opts.vehicleId)?.name ?? s.comms.find((c) => c.id === opts.commsId)?.name;
  const inc: Incident = {
    id: nextId(s, "inc"),
    kind,
    severity: sev,
    status: "open",
    title: opts.title ?? `${def.label}${where ? ` · ${where}` : ""}`,
    facilityId: opts.facility?.id,
    vehicleId: opts.vehicleId,
    commsId: opts.commsId,
    personId: opts.personId,
    sectorId: opts.sectorId ?? opts.facility?.sectorId,
    openedAt: s.t,
    responders: [],
    needs: Object.fromEntries(Object.entries(def.needs(sev)).filter(([, v]) => (v ?? 0) > 0)),
    needsRole: def.role,
    crewNeeded: def.crew(sev),
    workTotal: hours,
    workLeft: hours,
    resourcesCommitted: false,
  };
  s.incidents.push(inc);
  s.stats.incidents += 1;
  if (opts.facility) {
    const f = opts.facility;
    f.status = sev >= 4 || (kind === "fire" && sev >= 3) ? "disabled" : "repair";
    f.repairHoursLeft = 0;
    f.repairReason = def.label;
    if (FACILITIES[f.kind].housing && f.status === "disabled") assignHomes(s);
    if (kind === "pressure_leak") f.seals = sev >= 3 ? "breached" : "degraded";
  }
  if (opts.commsId) {
    const c = s.comms.find((x) => x.id === opts.commsId);
    if (c) setComms(s, c, "defective", def.label);
  }
  log(s, sev >= 3 ? "critical" : "warn", `${inc.title} — ${["", "low", "moderate", "high", "critical"][sev]} severity in ${sectorName(s, inc.sectorId)}.`, kind);
  if (s.incidents.length > 300) {
    const idx = s.incidents.findIndex((i) => i.status === "resolved");
    if (idx >= 0) s.incidents.splice(idx, 1);
  }
  return inc;
}

function releasePerson(p: Person) {
  p.incidentId = null;
  if (p.status === "responding") p.status = p.facilityId ? "assigned" : "available";
}

function resolveIncident(s: SimState, inc: Incident, rng: Rng) {
  inc.status = "resolved";
  inc.resolvedAt = s.t;
  s.stats.resolved += 1;
  for (const id of inc.responders) {
    const p = s.people.find((x) => x.id === id);
    if (p) releasePerson(p);
  }
  if (inc.facilityId) {
    const f = s.facilities.find((x) => x.id === inc.facilityId);
    if (f) {
      f.integrity = clamp(f.integrity + 15 + rng.range(0, 15), 5, 100);
      const wasDisabled = f.status === "disabled";
      if (f.repairHoursLeft <= 0) f.status = "operational";
      f.seals = "sealed";
      f.repairReason = "";
      if (wasDisabled && FACILITIES[f.kind].housing) assignHomes(s);
    }
  }
  if (inc.vehicleId) {
    const v = s.vehicles.find((x) => x.id === inc.vehicleId);
    if (v && v.status === "stranded" && v.mission) {
      v.status = "returning";
      v.mission.elapsed = Math.max(v.mission.elapsed, v.mission.duration * 0.6);
    }
  }
  if (inc.commsId) {
    const c = s.comms.find((x) => x.id === inc.commsId);
    if (c) setComms(s, c, "available", "Repaired on site");
  }
  if (inc.personId) {
    const p = s.people.find((x) => x.id === inc.personId);
    if (p && p.status !== "deceased") p.health = clamp(p.health + 25, 0, 100);
  }
  if (inc.kind === "radiation") for (const p of alive(s)) p.health = clamp(p.health + 2, 0, 100);
  const who = inc.responsible ? ` by ${inc.responsible}` : "";
  log(s, "good", `${inc.title} resolved${who}.`, inc.kind);
}

const roleSkill = (p: Person, role: Role) => (p.role === role ? 1 : p.role === "technician" || p.role === "engineer" ? 0.75 : 0.5);

function crewOnVehicles(s: SimState): Set<string> {
  const set = new Set<string>();
  for (const v of s.vehicles) for (const c of v.crew) set.add(c);
  return set;
}

function pickResponders(s: SimState, inc: Incident, count: number, onVehicles: Set<string>): Person[] {
  const pool = s.people.filter(
    (p) =>
      (p.status === "available" || p.status === "pending" || p.status === "assigned") &&
      p.health > 45 &&
      !onVehicles.has(p.id),
  );
  pool.sort((a, b) => {
    const score = (p: Person) => roleSkill(p, inc.needsRole) * 10 + (p.status === "assigned" ? 0 : 3) + ((p.id.charCodeAt(p.id.length - 1) + s.t) % 7) / 2.5;
    return score(b) - score(a);
  });
  return pool.slice(0, count);
}

export function dispatchResponders(s: SimState, inc: Incident, people: Person[]) {
  for (const p of people) {
    if (inc.responders.includes(p.id)) continue;
    p.status = "responding";
    p.incidentId = inc.id;
    inc.responders.push(p.id);
  }
  if (!inc.responsible && inc.responders.length) {
    inc.responsible = s.people.find((x) => x.id === inc.responders[0])?.name;
  }
}

function runIncidents(s: SimState, fl: FlowHour, rng: Rng, commsUp: boolean) {
  const onVehicles = crewOnVehicles(s);
  for (const inc of s.incidents) {
    if (inc.status === "resolved") continue;

    // ongoing damage
    const f = inc.facilityId ? s.facilities.find((x) => x.id === inc.facilityId) : undefined;
    switch (inc.kind) {
      case "pressure_leak":
        take(s, fl, "oxygen", 0.35 * inc.severity);
        break;
      case "water_leak":
        take(s, fl, "water", 12 * inc.severity);
        break;
      case "fire":
        if (f) f.integrity = clamp(f.integrity - 0.6 * inc.severity, 0, 100);
        take(s, fl, "oxygen", 0.15 * inc.severity);
        if (f && rng.chance(0.004 * inc.severity)) {
          const nearby = alive(s).filter((p) => p.sectorId === f.sectorId || p.incidentId === inc.id);
          if (nearby.length) {
            const victim = rng.pick(nearby);
            victim.health = clamp(victim.health - rng.range(10, 30), 0, 100);
          }
        }
        break;
      case "contamination":
        if (f?.kind === "greenhouse") f.stockpile *= 1 - 0.01 * inc.severity;
        else take(s, fl, "water", 3 * inc.severity);
        break;
      case "structural":
        if (f) f.integrity = clamp(f.integrity - 0.15 * inc.severity, 0, 100);
        break;
      default:
        break;
    }

    // commit resources
    if (!inc.resourcesCommitted) {
      if (has(s, inc.needs)) {
        for (const [k, v] of Object.entries(inc.needs)) take(s, fl, k as ResourceKey, v ?? 0);
        inc.resourcesCommitted = true;
        if (inc.status === "awaiting") inc.status = "open";
      } else if (inc.status !== "awaiting") {
        inc.status = "awaiting";
        const missing = Object.entries(inc.needs)
          .filter(([k, v]) => s.resources[k as ResourceKey] < (v ?? 0))
          .map(([k]) => RESOURCES[k as ResourceKey].label.toLowerCase());
        log(s, "warn", `${inc.title} is waiting on ${missing.join(" and ")}.`, inc.kind);
      }
    }

    // staff it
    if (inc.resourcesCommitted && (s.config.policies.autoResponse || inc.manual) && inc.responders.length < inc.crewNeeded) {
      const extra = pickResponders(s, inc, inc.crewNeeded - inc.responders.length, onVehicles);
      dispatchResponders(s, inc, extra);
    }
    // drop responders who fell ill or died
    inc.responders = inc.responders.filter((id) => {
      const p = s.people.find((x) => x.id === id);
      return p && p.status === "responding";
    });

    if (inc.resourcesCommitted && inc.responders.length > 0) {
      inc.status = "responding";
      let work = 0;
      for (const id of inc.responders) {
        const p = s.people.find((x) => x.id === id);
        if (p) work += roleSkill(p, inc.needsRole) * (0.5 + p.health / 200);
      }
      work *= commsUp ? 1 : 0.8;
      work *= 0.6 + 0.4 * Math.min(1, inc.responders.length / inc.crewNeeded);
      inc.workLeft -= work;
      if (inc.workLeft <= 0) resolveIncident(s, inc, rng);
    } else if (s.t - inc.openedAt > 12 && inc.severity < 4 && rng.chance(0.012)) {
      inc.severity = (inc.severity + 1) as Incident["severity"];
      inc.workLeft += INCIDENTS[inc.kind].hours(inc.severity) - INCIDENTS[inc.kind].hours(inc.severity - 1);
      inc.workTotal += INCIDENTS[inc.kind].hours(inc.severity) - INCIDENTS[inc.kind].hours(inc.severity - 1);
      inc.crewNeeded = INCIDENTS[inc.kind].crew(inc.severity);
      if (f && inc.severity >= 4) {
        f.status = "disabled";
        if (FACILITIES[f.kind].housing) assignHomes(s);
      }
      if (f && inc.kind === "pressure_leak" && inc.severity >= 3) f.seals = "breached";
      log(s, "critical", `${inc.title} escalated to ${["", "low", "moderate", "high", "critical"][inc.severity]} — no crew on it.`, inc.kind);
    }
  }
}

// ───────────────────────────── comms

function setComms(s: SimState, c: SimState["comms"][number], status: SimState["comms"][number]["status"], note: string) {
  if (c.status === status) return;
  c.status = status;
  c.history.push({ t: s.t, status, note });
  if (c.history.length > 30) c.history.shift();
}

function runComms(s: SimState, rng: Rng) {
  const storm = s.weather.tau > 2;
  for (const c of s.comms) {
    if (c.status === "maintenance" || (c.kind === "satellite" && c.status === "defective")) {
      c.hoursLeft -= 1;
      if (c.hoursLeft <= 0) setComms(s, c, "available", c.kind === "satellite" ? "Remote reboot complete" : "Service complete");
      continue;
    }
    if (c.status !== "available") continue;
    const p = (c.kind === "antenna" ? 0.0009 * (storm ? 3 : 1) : 0.0005) * s.config.events.failures;
    if (rng.chance(p)) {
      if (c.kind === "antenna") {
        openIncident(s, "comms_failure", rng.weighted([1, 2, 3], [0.6, 0.3, 0.1]), { commsId: c.id, sectorId: c.sectorId });
      } else if (rng.chance(0.06)) {
        setComms(s, c, "disabled", "Lost attitude control — relay unrecoverable");
        log(s, "critical", `${c.name} lost. Relay coverage reduced.`, "comms_failure");
      } else {
        setComms(s, c, "defective", "Safe mode after a single-event upset");
        c.hoursLeft = rng.int(6, 30);
        log(s, "warn", `${c.name} entered safe mode. Remote reboot in progress.`, "comms_failure");
      }
    } else if (c.kind === "antenna" && rng.chance(0.002)) {
      setComms(s, c, "maintenance", "Routine dish alignment");
      c.hoursLeft = rng.int(2, 5);
    }
  }
}

// ───────────────────────────── vehicles

function vehicleHome(s: SimState) {
  const g = s.sectors.find((x) => x.kind === "industrial") ?? s.sectors[0];
  return { x: (g?.x ?? 500) + 46, y: (g?.y ?? 330) + 50 };
}

export function startMission(s: SimState, v: Vehicle, kind: MissionKind, rng: Rng, crew: Person[], rescueOf?: string): boolean {
  const def = VEHICLES[v.kind];
  if (!def.missions.includes(kind)) return false;
  if (v.status !== "docked" && v.status !== "charging") return false;
  if (crew.length < def.crew) return false;
  let duration = kind === "survey" ? rng.int(5, 10) : rng.int(7, 13);
  const maxHours = (v.charge * def.capacity * 0.92) / def.drain;
  duration = Math.min(duration, Math.floor(maxHours));
  if (duration < 3) return false;
  if (def.o2PerHour > 0) {
    const o2 = def.o2PerHour * duration;
    if (s.resources.oxygen < o2 + 10) return false;
    s.resources.oxygen -= o2;
  }
  const home = vehicleHome(s);
  const rescueTarget = rescueOf ? s.vehicles.find((x) => x.id === rescueOf) : undefined;
  const angle = rng.range(0, Math.PI * 2);
  const dist = rng.range(260, 420);
  v.mission = {
    kind,
    duration,
    elapsed: 0,
    targetX: rescueTarget ? rescueTarget.x : clamp(home.x + Math.cos(angle) * dist, 30, 970),
    targetY: rescueTarget ? rescueTarget.y : clamp(home.y + Math.sin(angle) * dist * 0.7, 30, 610),
    cargoKg: 0,
    rescueOf,
  };
  v.status = "mission";
  v.crew = crew.map((p) => p.id);
  for (const p of crew) {
    p.status = "assigned";
    p.facilityId = null;
  }
  s.stats.missions += 1;
  log(s, "info", `${v.name} left on a ${kind === "survey" ? "survey" : kind === "rescue" ? "rescue" : `${kind} run`} (${duration} h).`, "mission");
  return true;
}

export function crewFor(s: SimState, v: Vehicle): Person[] {
  const need = VEHICLES[v.kind].crew;
  if (need === 0) return [];
  const onVehicles = crewOnVehicles(s);
  const pool = s.people.filter((p) => (p.status === "available" || p.status === "pending") && p.health > 60 && !onVehicles.has(p.id));
  pool.sort((a, b) => (b.role === "pilot" ? 2 : b.role === "geologist" ? 1 : 0) - (a.role === "pilot" ? 2 : a.role === "geologist" ? 1 : 0));
  if (pool.length >= need) return pool.slice(0, need);
  // borrow pilots and geologists from facilities as a last resort
  const borrowed = s.people.filter(
    (p) => p.status === "assigned" && p.facilityId && (p.role === "pilot" || p.role === "geologist") && p.health > 60 && !onVehicles.has(p.id),
  );
  const crew = [...pool, ...borrowed].slice(0, need);
  return crew.length === need ? crew : [];
}

function finishMission(s: SimState, v: Vehicle, rng: Rng, fl: FlowHour) {
  const m = v.mission;
  if (!m) return;
  const def = VEHICLES[v.kind];
  if (m.cargoKg < 0) {
    log(s, "info", `${v.name} is back in the garage.`, "mission");
  } else if (m.kind === "regolith" || m.kind === "ice") {
    const kg = def.cargo * rng.range(0.7, 1) * (m.kind === "ice" ? 0.6 + 0.4 * siteById(s.config.siteId).ice : 1);
    const put = add(s, fl, m.kind, kg);
    log(s, "good", `${v.name} delivered ${Math.round(put).toLocaleString("en-US")} kg of ${m.kind}.`, "mission");
  } else if (m.kind === "survey") {
    const found = rng.chance(0.25);
    const gain = found ? 0.06 : 0.015;
    s.surveyBonus = Math.min(0.35, s.surveyBonus + gain);
    log(s, found ? "good" : "info", found ? `${v.name} mapped a shallow ice lens — extractor yield up.` : `${v.name} finished its survey loop.`, "mission");
  } else if (m.kind === "rescue") {
    const target = s.vehicles.find((x) => x.id === m.rescueOf);
    const inc = s.incidents.find((i) => i.vehicleId === m.rescueOf && i.status !== "resolved");
    if (inc) resolveIncident(s, inc, rng);
    if (target) log(s, "good", `${v.name} brought ${target.name}'s crew home.`, "mission");
  }
  for (const id of v.crew) {
    const p = s.people.find((x) => x.id === id);
    if (p && p.status === "assigned" && !p.facilityId) p.status = "available";
  }
  v.crew = [];
  v.mission = null;
  v.status = "charging";
  const home = vehicleHome(s);
  v.x = home.x;
  v.y = home.y;
}

function runVehicles(s: SimState, fl: FlowHour, rng: Rng): number {
  let chargeDemand = 0;
  const home = vehicleHome(s);
  const storm = s.weather.tau > 2;
  const garageSlots = s.vehicles.map((v) => v.id);
  for (const v of s.vehicles) {
    const def = VEHICLES[v.kind];
    const slot = garageSlots.indexOf(v.id);
    const dockX = home.x + (slot % 3) * 16;
    const dockY = home.y + Math.floor(slot / 3) * 14;
    if (v.status === "maintenance") {
      v.serviceHoursLeft -= 1;
      if (v.serviceHoursLeft <= 0) {
        v.status = "charging";
        v.integrity = 100;
        v.serviceDueHours = v.hours + 240;
        log(s, "info", `${v.name} cleared its service.`, "mission");
      }
      continue;
    }
    if (v.status === "docked" || v.status === "charging") {
      v.x = dockX;
      v.y = dockY;
      if (def.power === "battery") {
        if (v.charge < 1) {
          const kwh = Math.min(30, (1 - v.charge) * def.capacity);
          chargeDemand += kwh;
          v.charge = clamp(v.charge + kwh / def.capacity, 0, 1);
        }
      } else if (v.charge < 1) {
        const fuel = take(s, fl, "fuel", Math.min(60, (1 - v.charge) * def.capacity));
        v.charge = clamp(v.charge + fuel / def.capacity, 0, 1);
      }
      v.status = v.charge >= 0.98 ? "docked" : "charging";
      if (v.hours >= v.serviceDueHours && v.status === "docked") {
        if (s.resources.components >= 1) {
          take(s, fl, "components", 1);
          v.status = "maintenance";
          v.serviceHoursLeft = 8;
        }
        continue;
      }
      // automatic logistics
      if (s.config.policies.autoDispatch && v.status === "docked" && !storm && v.integrity > 40) {
        const need = chooseMission(s, v, rng);
        if (need) startMission(s, v, need, rng, crewFor(s, v));
      }
      continue;
    }
    if (v.status === "stranded") continue;
    // on mission or returning
    const m = v.mission;
    if (!m) {
      v.status = "charging";
      continue;
    }
    m.elapsed += 1;
    v.hours += 1;
    v.distanceKm += def.speed * (m.elapsed / m.duration < 0.4 || m.elapsed / m.duration > 0.6 ? 1 : 0.2);
    v.charge = clamp(v.charge - def.drain / def.capacity, 0, 1);
    v.integrity = clamp(v.integrity - 0.25 * (storm ? 2 : 1), 0, 100);
    const p = m.elapsed / m.duration;
    const leg = p < 0.4 ? p / 0.4 : p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
    v.x = dockX + (m.targetX - dockX) * leg;
    v.y = dockY + (m.targetY - dockY) * leg;
    if (p >= 0.6) v.status = "returning";
    const breakP = 0.004 * s.config.events.failures * (storm ? 2.5 : 1) * (1 + ((100 - v.integrity) / 30) ** 2);
    if (m.kind !== "rescue" && p < 0.9 && rng.chance(breakP)) {
      v.status = "stranded";
      const inc = openIncident(s, "vehicle_breakdown", rng.weighted([1, 2, 3], [0.5, 0.35, 0.15]), { vehicleId: v.id });
      if (inc && def.crew > 0) {
        // send a rescue vehicle if one is free
        const rescuer = s.vehicles.find(
          (x) => x.id !== v.id && (x.status === "docked" || x.status === "charging") && VEHICLES[x.kind].missions.includes("rescue") && x.charge > 0.5,
        );
        if (rescuer) startMission(s, rescuer, "rescue", rng, crewFor(s, rescuer), v.id);
      }
      continue;
    }
    if (m.elapsed >= m.duration) finishMission(s, v, rng, fl);
  }
  return chargeDemand;
}

function chooseMission(s: SimState, v: Vehicle, rng: Rng): MissionKind | null {
  const def = VEHICLES[v.kind];
  const hasProcessor = s.facilities.some((f) => f.kind === "regolith_processor" && f.status !== "disabled");
  const hasExtractor = s.facilities.some((f) => f.kind === "ice_extractor" && f.status !== "disabled");
  if (def.missions.includes("regolith") && hasProcessor && s.resources.regolith < s.capacity.regolith * 0.35) return "regolith";
  const water = balance(s, "water");
  if (def.missions.includes("ice") && hasExtractor && (water.days < 25 || s.resources.ice < 400) && s.resources.ice < s.capacity.ice * 0.5) return "ice";
  if (def.missions.includes("survey") && s.surveyBonus < 0.35 && rng.chance(v.kind === "survey_drone" ? 0.05 : 0.008)) return "survey";
  return null;
}

// ───────────────────────────── main step

export function tick(s: SimState) {
  if (s.ended) return;
  const rng = new Rng(s.rng);
  const cfg = s.config;
  const site = siteById(cfg.siteId);
  const diff = DIFFICULTY[cfg.difficulty];
  const hour = s.t % 24;
  const fl = emptyFlow();
  const w = s.weather;
  const people = alive(s);

  // ── weather
  if (w.stormHoursLeft <= 0 && w.stormScale !== "none") {
    log(s, "good", "The dust is settling. Skies clearing.", "storm");
    w.stormScale = "none";
  }
  if (w.stormScale === "none" && rng.chance(0.0011 * site.dust * cfg.events.dustStorms)) {
    const scale = rng.weighted(["local", "regional", "global"] as const, [0.68, 0.27, 0.05]);
    w.stormScale = scale;
    w.stormHoursLeft = scale === "local" ? rng.int(18, 60) : scale === "regional" ? rng.int(72, 200) : rng.int(300, 800);
    s.stats.storms += 1;
    log(s, scale === "local" ? "warn" : "critical", `${scale[0].toUpperCase() + scale.slice(1)} dust storm rolling in. Solar output will drop.`, "storm");
  }
  if (w.stormScale !== "none") w.stormHoursLeft -= 1;
  const tauTarget = w.stormScale === "global" ? 5 : w.stormScale === "regional" ? 3.2 : w.stormScale === "local" ? 1.9 : 0.5;
  w.tau += (tauTarget - w.tau) * 0.08 + rng.range(-0.01, 0.01);
  w.tau = clamp(w.tau, 0.3, 6);
  if (w.flareHoursLeft > 0) w.flareHoursLeft -= 1;
  else if (rng.chance(0.00045 * cfg.events.solarFlares)) {
    w.flareHoursLeft = rng.int(4, 18);
    const sev = rng.weighted([1, 2, 3, 4], [0.4, 0.35, 0.18, 0.07]);
    openIncident(s, "radiation", sev, { title: "Solar particle event · colony-wide" });
  }
  w.radiation = site.radiation * (w.flareHoursLeft > 0 ? 22 : 1) * (1 - Math.min(0.25, (w.tau - 0.5) * 0.04));
  const swing = site.swing / (1 + w.tau * 0.25);
  w.extTemp = site.baseTemp + swing * Math.sin((2 * Math.PI * (hour - 9)) / 24) + rng.range(-1.5, 1.5);
  w.extPressure = site.pressure * (1 + 0.04 * Math.sin((2 * Math.PI * hour) / 24)) + (w.tau - 0.5) * 0.08;

  if (rng.chance(0.00035 * cfg.events.meteorites)) {
    const targets = s.facilities.filter((f) => f.status !== "disabled");
    const f = targets.length ? rng.pick(targets) : undefined;
    if (f) {
      const kind: IncidentKind = FACILITIES[f.kind].housing || f.kind === "tank_farm" ? "pressure_leak" : "structural";
      f.integrity = clamp(f.integrity - rng.range(10, 35), 0, 100);
      openIncident(s, kind, rng.weighted([1, 2, 3, 4], [0.35, 0.35, 0.2, 0.1]), { facility: f, title: `Micrometeorite strike · ${f.name}` });
    }
  }

  // ── staffing
  const staffAt = new Map<string, number>();
  for (const p of people) {
    if (p.status !== "assigned" || !p.facilityId) continue;
    const f = s.facilities.find((x) => x.id === p.facilityId);
    if (!f) continue;
    const skill = FACILITIES[f.kind].roles.includes(p.role) ? 1 : 0.65;
    staffAt.set(f.id, (staffAt.get(f.id) ?? 0) + skill * (0.6 + p.health / 250));
  }
  const upgrade = (c: FacilityCategory) => 1 + (s.upgrades[c] ?? 0);

  // ── efficiency
  for (const f of s.facilities) {
    const def = FACILITIES[f.kind];
    const staffRatio = def.staff ? Math.min(1, (staffAt.get(f.id) ?? 0) / def.staff) : 1;
    // automated plants keep part of their output with nobody on shift
    const floor = UNSTAFFED_FLOOR[def.category] ?? 0.3;
    const staffFactor = def.staff ? floor + (1 - floor) * staffRatio : 1;
    f.efficiency = isRunning(f) ? staffFactor * (0.55 + 0.45 * (f.integrity / 100)) * upgrade(def.category) : 0;
    f.output = {};
  }

  // ── power
  const daylightNow = daylight(hour) * site.solar * Math.exp(-w.tau * 0.32);
  let solar = 0;
  let steady = 0;
  for (const f of s.facilities) {
    const g = FACILITIES[f.kind].generation;
    if (!g || !isRunning(f)) continue;
    const kw = g.kw * f.efficiency * (g.kind === "solar" ? daylightNow : 1);
    if (g.kind === "solar") solar += kw;
    else steady += kw;
    f.powered = true;
  }
  const gen = solar + steady;
  const heat = 1 + Math.max(0, -w.extTemp - 50) / 90;
  type Load = { id: string; kw: number; prio: number };
  const loads: Load[] = [];
  for (const f of s.facilities) {
    const def = FACILITIES[f.kind];
    if (!isRunning(f) || def.power <= 0) continue;
    const kw = def.power * (def.category === "habitat" ? heat : 1);
    loads.push({ id: f.id, kw, prio: cfg.policies.powerPriority[def.category] ?? 5 });
  }
  const baseLoad = (people.length * cfg.consumption.power) / 24;
  const chargeKw = runVehicles(s, fl, rng);
  loads.push({ id: "vehicles", kw: chargeKw, prio: 2.5 });
  let demand = baseLoad + loads.reduce((a, l) => a + l.kw, 0);
  const shedIds = new Set<string>();
  let shed = 0;
  if (demand > gen + s.battery * 0.9) {
    const order = [...loads].sort((a, b) => a.prio - b.prio);
    for (const l of order) {
      if (demand - shed <= gen + s.battery * 0.9) break;
      shedIds.add(l.id);
      shed += l.kw;
    }
  }
  const served = demand - shed;
  if (gen >= served) s.battery = Math.min(s.batteryCap, s.battery + (gen - served) * 0.9);
  else s.battery = Math.max(0, s.battery - (served - gen) / 0.9);
  if (shed > 0 && s.t - (s.alerted["shed"] ?? -999) > 24) {
    s.alerted["shed"] = s.t;
    log(s, "warn", `Power short by ${Math.round(shed)} kW — shedding low-priority loads.`, "power_failure");
  }
  if (shedIds.has("vehicles")) {
    for (const v of s.vehicles) if (v.status === "charging" && VEHICLES[v.kind].power === "battery") v.charge = clamp(v.charge - 30 / VEHICLES[v.kind].capacity, 0, 1);
  }
  for (const f of s.facilities) {
    const def = FACILITIES[f.kind];
    if (def.generation) continue;
    f.powered = isRunning(f) && !shedIds.has(f.id);
    if (!f.powered && def.power > 0) f.efficiency = 0;
  }
  s.power = { gen, demand, shed, solar, steady };
  fl.energyGen = gen;
  fl.energyUse = served;

  // ── production
  let agriWater = 0;
  let industryWater = 0;
  for (const f of s.facilities) {
    const def = FACILITIES[f.kind];
    if (!isRunning(f) || f.efficiency <= 0 || (!f.powered && def.power > 0)) continue;
    const e = f.efficiency;
    if (f.kind === "greenhouse") {
      const crop = CROPS[f.crop ?? "potato"];
      const want = (crop.waterPerSol / 24) * e;
      const got = take(s, fl, "water", want);
      const ratio = want > 0 ? got / want : 1;
      agriWater += got;
      f.growth += (e * ratio) / 24;
      f.stockpile += (crop.yieldPerSol / 24) * e * ratio;
      fl.foodLocal += (crop.yieldPerSol / 24) * e * ratio;
      f.output = { oxygen: 0.02 * e };
      add(s, fl, "oxygen", 0.02 * e);
      if (f.growth >= crop.cycleSols) {
        const kg = f.stockpile;
        const put = add(s, fl, "food", kg);
        s.stats.harvestKg += kg;
        log(s, "good", `${f.name}: ${crop.label.toLowerCase()} harvest, ${Math.round(kg).toLocaleString("en-US")} kg${put < kg - 1 ? ` (${Math.round(kg - put)} kg lost — storage full)` : ""}.`, "harvest");
        f.growth = 0;
        f.stockpile = 0;
      }
      continue;
    }
    if (f.kind === "water_recycler") continue;
    if (f.kind === "research_lab") {
      s.research += e;
      take(s, fl, "oxygen", 0.01);
      if (s.research >= 400) {
        s.research -= 400;
        const cats: FacilityCategory[] = ["life", "agri", "energy", "industry"];
        const c = rng.pick(cats);
        if ((s.upgrades[c] ?? 0) < 0.2) {
          s.upgrades[c] = Math.round(((s.upgrades[c] ?? 0) + 0.02) * 100) / 100;
          s.stats.upgrades += 1;
          log(s, "good", `Research breakthrough: ${c === "life" ? "life support" : c === "agri" ? "agriculture" : c} efficiency +2%.`, "research");
        }
      }
      continue;
    }
    let ratio = 1;
    for (const [k, v] of Object.entries(def.inputs ?? {})) {
      const need = (v ?? 0) * e;
      if (need > 0) ratio = Math.min(ratio, s.resources[k as ResourceKey] / need);
    }
    ratio = clamp(ratio, 0, 1);
    for (const [k, v] of Object.entries(def.inputs ?? {})) {
      const amt = (v ?? 0) * e * ratio;
      take(s, fl, k as ResourceKey, amt);
      if (k === "water") industryWater += amt;
    }
    let mult = e * ratio;
    if (f.kind === "ice_extractor") mult *= site.ice * (1 + s.surveyBonus);
    for (const [k, v] of Object.entries(def.outputs ?? {})) {
      const amt = (v ?? 0) * mult;
      add(s, fl, k as ResourceKey, amt);
      f.output[k as ResourceKey] = amt;
      if (k === "food") fl.foodLocal += amt;
      if (k === "components") {
        fl.componentsLocal += amt;
        s.stats.componentsLocal += amt;
      }
    }
    if (f.kind === "ice_extractor") {
      const melt = take(s, fl, "ice", 8 * e);
      add(s, fl, "water", melt * 0.95);
      f.output.water = (f.output.water ?? 0) + melt * 0.95;
    }
  }

  // ── consumption
  const pop = people.length;
  const crewOut = crewOnVehicles(s);
  const o2Need = (pop * cfg.consumption.oxygen * diff.consumption) / 24;
  const waterNeed = (pop * cfg.consumption.water * cfg.policies.waterRation * diff.consumption) / 24;
  const foodNeed = (pop * cfg.consumption.food * cfg.policies.foodRation * diff.consumption) / 24;
  const o2Got = take(s, fl, "oxygen", o2Need);
  const waterGot = take(s, fl, "water", waterNeed);
  const foodGot = take(s, fl, "food", foodNeed * 1.04);
  add(s, fl, "waste", (pop * 0.45) / 24 + foodGot * 0.04);
  const o2Def = o2Need > 0 ? 1 - o2Got / o2Need : 0;
  const waterDef = waterNeed > 0 ? 1 - waterGot / waterNeed : 0;
  const foodDef = foodNeed > 0 ? 1 - Math.min(1, foodGot / foodNeed) : 0;

  // ── recycling
  const grey = waterGot * 0.9 + agriWater * 0.6 + industryWater * 0.25;
  let recyclerCap = 0;
  for (const f of s.facilities) {
    if (f.kind !== "water_recycler" || !isRunning(f) || !f.powered) continue;
    recyclerCap += 60 * f.efficiency;
  }
  const recovered = Math.min(grey, recyclerCap) * Math.min(0.98, 0.93 * upgrade("life"));
  add(s, fl, "water", recovered);
  for (const f of s.facilities) if (f.kind === "water_recycler" && recyclerCap > 0) f.output = { water: (recovered * (60 * f.efficiency)) / recyclerCap };
  fl.recycled = recovered;
  fl.waterUse = waterGot + agriWater + industryWater;

  // ── incidents and comms
  runComms(s, rng);
  const commsUp = s.comms.some((c) => c.status === "available");
  runIncidents(s, fl, rng, commsUp);

  // ── wear, failures, maintenance
  const stormStress = w.tau > 2 ? 1.5 : 1;
  for (const f of s.facilities) {
    const def = FACILITIES[f.kind];
    if (f.repairHoursLeft > 0) {
      const crew = Math.max(0.5, Math.min(1, (staffAt.get(f.id) ?? 0.5) / Math.max(1, def.staff)));
      f.repairHoursLeft -= crew;
      if (f.repairHoursLeft <= 0) {
        f.repairHoursLeft = 0;
        const built = f.repairReason === "Under construction";
        f.integrity = built ? 100 : clamp(f.integrity + 40, 0, 100);
        f.lastService = s.t;
        const blocked = s.incidents.some((i) => i.facilityId === f.id && i.status !== "resolved");
        if (!blocked) {
          f.status = "operational";
          f.repairReason = "";
        }
        if (built) {
          const { cap, battery } = recomputeCapacity(s);
          s.capacity = cap;
          s.batteryCap = battery;
          if (def.housing) assignHomes(s);
          log(s, "good", `${f.name} is complete and online.`, "system");
        }
      }
      continue;
    }
    if (!isRunning(f)) continue;
    f.hours += 1;
    const outdoor = def.category === "energy" || f.kind === "ice_extractor" ? stormStress : 1;
    f.integrity = clamp(f.integrity - (def.wear / 100) * outdoor, 0, 100);
    if (f.status !== "operational") continue;
    const failP = (def.failRate / 1000) * diff.failure * cfg.events.failures * (1 + ((100 - f.integrity) / 30) ** 2) * outdoor;
    if (rng.chance(failP)) {
      const kinds = def.incidents;
      const weights = kinds.map((k) => (k === "radiation" ? 0.15 : k === "fire" ? 0.5 : 1));
      const kind = rng.weighted(kinds, weights);
      const sev = rng.weighted([1, 2, 3, 4], [0.45, 0.33, 0.16, 0.06]) + (f.integrity < 30 ? 1 : 0);
      openIncident(s, kind, sev, { facility: f });
      continue;
    }
    if (f.integrity <= 0) {
      openIncident(s, "structural", 3, { facility: f, title: `${f.name} failed from wear` });
      continue;
    }
    if (cfg.policies.autoMaintenance && f.integrity < cfg.policies.maintenanceThreshold) {
      startService(s, f, fl);
    }
  }

  // ── people
  const housing = housingOf(s.facilities.filter((f) => f.status !== "disabled"));
  const crowd = housing > 0 ? Math.max(0, pop / housing - 1) : 1;
  const habById = new Map(s.facilities.map((f) => [f.id, f]));
  const medBays = s.facilities.filter((f) => f.kind === "medical_bay" && isRunning(f) && f.powered);
  const medics = people.filter((p) => p.role === "medic" && (p.status === "assigned" || p.status === "available") && p.health > 50).length;
  let beds = Math.min(medBays.length * 6, Math.max(medBays.length ? 2 : 0, medics * 3));
  for (const p of people) {
    let dh = 0;
    dh -= 7 * o2Def + 0.9 * waterDef + 0.15 * foodDef;
    if (cfg.policies.foodRation < 0.85) dh -= (0.85 - cfg.policies.foodRation) * 0.15;
    if (cfg.policies.waterRation < 0.8) dh -= (0.8 - cfg.policies.waterRation) * 0.2;
    const home = p.homeId ? habById.get(p.homeId) : undefined;
    const outside = crewOut.has(p.id);
    const shield = outside ? 0.9 : home ? (FACILITIES[home.kind].shielding ?? 0.4) : 0.6;
    const dose = (w.radiation / 24) * shield;
    p.dose += dose;
    dh -= dose * 0.35;
    if (home?.env && !outside) {
      if (home.env.temp < 8) dh -= 0.25;
      if (home.env.co2 > 5000) dh -= 0.5;
      if (home.env.pressure < 60) dh -= 1.2;
    }
    if (!home && !outside) dh -= 0.3;
    dh -= crowd * 0.05;
    const fine = o2Def < 0.02 && waterDef < 0.05 && foodDef < 0.05;
    if (p.status === "medical" && beds > 0 && s.resources.medical > 0.05) {
      beds -= 1;
      take(s, fl, "medical", 0.03);
      dh += 0.7;
    } else if (fine) dh += 0.05;
    p.health = clamp(p.health + dh, 0, 100);

    if (p.health <= 0) {
      p.status = "deceased";
      p.facilityId = null;
      s.stats.deaths += 1;
      log(s, "critical", `${p.name}, ${ROLES[p.role].label.toLowerCase()}, has died.`, "medical");
      continue;
    }
    if (p.status !== "medical" && p.status !== "responding" && p.health < 35 && !outside) {
      p.status = "medical";
      if (rng.chance(0.3)) openIncident(s, "medical", p.health < 20 ? 3 : 2, { personId: p.id, sectorId: home?.sectorId, title: `Medical emergency · ${p.name}` });
    } else if (p.status === "medical" && p.health >= 80) {
      p.status = p.facilityId ? "assigned" : "available";
    }
    if (p.status !== "medical" && p.status !== "responding" && rng.chance(0.00012 * (1 + (100 - p.health) / 40))) {
      openIncident(s, "medical", rng.weighted([1, 2, 3], [0.6, 0.3, 0.1]), { personId: p.id, sectorId: home?.sectorId, title: `Medical emergency · ${p.name}` });
    }
  }
  if (people.length && alive(s).length < people.length) assignHomes(s);

  // ── habitat environment
  for (const f of s.facilities) {
    if (!f.env) continue;
    const env = f.env;
    const def = FACILITIES[f.kind];
    const powered = isRunning(f) && f.powered;
    const occupancy = def.housing ? f.residents / def.housing : 0;
    env.temp += powered ? (21 + rng.range(-0.4, 0.4) - env.temp) * 0.35 : (w.extTemp - env.temp) * 0.02;
    const leak = s.incidents.find((i) => i.facilityId === f.id && i.kind === "pressure_leak" && i.status !== "resolved");
    if (leak) env.pressure = Math.max(0, env.pressure - (leak.severity >= 3 ? 6 : 0.7));
    else if (s.resources.oxygen > 5) env.pressure += (101.3 - env.pressure) * 0.3;
    env.o2 = s.resources.oxygen > 1 && env.pressure > 50 ? 20.9 + rng.range(-0.15, 0.15) : Math.max(12, env.o2 - 0.35);
    const scrub = powered ? 0.45 : 0.02;
    env.co2 += (600 + occupancy * 500 - env.co2) * scrub + (powered ? 0 : 160 * occupancy);
    env.humidity = clamp(env.humidity + (38 + occupancy * 10 - env.humidity) * 0.1 + rng.range(-0.6, 0.6), 15, 80);
    env.dust = clamp(4 + w.tau * 5 + rng.range(-1, 1), 0, 80);
    env.radiation = w.radiation * (def.shielding ?? 0.4);
    env.airQuality = clamp(100 - Math.max(0, env.co2 - 700) / 50 - env.dust * 0.6 - Math.max(0, 20.9 - env.o2) * 6 - Math.max(0, 70 - env.pressure) * 0.5, 0, 100);
  }

  // ── resupply (logistics handled outside MARSIS)
  if (cfg.events.resupply && s.t >= s.nextResupply) {
    if (!commsUp) {
      s.nextResupply = s.t + 24;
      log(s, "warn", "Cargo lander holding in orbit — no landing beacon. Retrying in 24 h.", "resupply");
    } else {
      const crate: ResourceMap = {
        components: Math.round(20 + pop * 0.5),
        medical: Math.round(15 + pop * 0.6),
        food: Math.round(Math.max(20, pop) * cfg.consumption.food * 15),
        construction: 600,
        metals: 200,
        silicon: 80,
      };
      for (const [k, v] of Object.entries(crate)) add(s, fl, k as ResourceKey, v ?? 0);
      s.stats.componentsImported += crate.components ?? 0;
      fl.componentsImported += crate.components ?? 0;
      const room = Math.max(0, housing - pop);
      const arrivals = Math.min(room, rng.int(0, 6));
      const counts = roleCounts(arrivals, cfg.roleMix);
      for (const [role, n] of Object.entries(counts) as [Role, number][]) {
        for (let i = 0; i < n; i++) {
          s.people.push(makePerson(rng, role, nextId(s, "p"), Math.floor(s.t / 24)));
        }
      }
      s.stats.arrivals += arrivals;
      if (arrivals) assignHomes(s);
      log(s, "good", `Cargo lander down: parts, medicine, food${arrivals ? ` and ${arrivals} new colonist${arrivals > 1 ? "s" : ""} awaiting assignment` : ""}.`, "resupply");
      s.nextResupply = s.t + Math.round(cfg.events.resupplyEverySols * 24 * rng.range(0.85, 1.2));
    }
  }

  // ── flows, alerts, history
  s.flows.push(fl);
  if (s.flows.length > 24) s.flows.shift();

  if (hour % 6 === 0) {
    for (const key of ["oxygen", "water", "food"] as const) {
      const b = balance(s, key);
      const last = s.alerted[key] ?? -999;
      if (b.days < 7 && s.t - last >= 24) {
        s.alerted[key] = s.t;
        log(s, b.days < 2 ? "critical" : "warn", `${RESOURCES[key].label} reserve down to ${b.days < 1 ? `${Math.round(b.days * 24)} hours` : `${b.days.toFixed(1)} sols`}.`, key === "oxygen" ? "oxygen_failure" : key === "water" ? "water_leak" : "contamination");
      }
    }
    for (const key of ["components", "medical", "construction"] as const) {
      const min = RESOURCES[key].minReserve * Math.max(10, pop);
      const last = s.alerted[key] ?? -999;
      if (s.resources[key] < min && s.t - last >= 48) {
        s.alerted[key] = s.t;
        log(s, "warn", `${RESOURCES[key].label} below minimum stock (${Math.round(s.resources[key])} of ${Math.round(min)}).`, "system");
      }
    }
  }

  if (s.t % 3 === 0) {
    const k = kpis(s);
    s.history.push({
      t: s.t,
      oxygen: s.resources.oxygen,
      water: s.resources.water,
      food: s.resources.food,
      battery: s.battery,
      gen,
      demand,
      population: k.population,
      health: k.health,
      o2Days: Math.min(120, k.oxygen.days),
      waterDays: Math.min(120, k.water.days),
      foodDays: Math.min(120, k.food.days),
    });
    if (s.history.length > 3000) s.history.splice(0, s.history.length - 3000);
  }

  s.stats.peakPopulation = Math.max(s.stats.peakPopulation, alive(s).length);
  s.t += 1;
  s.rng = rng.state;

  if (alive(s).length === 0) {
    s.ended = "lost";
    log(s, "critical", `${cfg.name} has fallen silent. No survivors.`, "system");
  } else if (s.t >= cfg.durationSols * 24 + 6) {
    s.ended = "complete";
    log(s, "good", `Simulation complete: ${cfg.name} reached sol ${cfg.durationSols}.`, "system");
  }
}

export function startService(s: SimState, f: Facility, fl?: FlowHour, manual = false): boolean {
  if (f.status !== "operational" || f.repairHoursLeft > 0) return false;
  const parts = f.integrity < 35 ? 2 : 1;
  if (s.resources.components < parts) {
    if (manual || s.t - (s.alerted[`svc-${f.id}`] ?? -999) > 48) {
      s.alerted[`svc-${f.id}`] = s.t;
      log(s, "warn", `${f.name} is due for service but there are no spare components.`, "system");
    }
    return false;
  }
  if (fl) take(s, fl, "components", parts);
  else s.resources.components -= parts;
  f.status = "repair";
  f.repairReason = "Scheduled service";
  f.repairHoursLeft = 4 + (100 - f.integrity) / 12;
  if (manual) log(s, "info", `${f.name} taken down for service.`, "system");
  return true;
}

export function recomputeCapacity(s: SimState) {
  const done = s.facilities.filter((f) => f.repairReason !== "Under construction");
  const cap = { ...s.capacity };
  let battery = 50;
  for (const k of Object.keys(cap) as ResourceKey[]) cap[k] = BASE_CAPACITY[k];
  for (const f of done) {
    const def = FACILITIES[f.kind];
    for (const [k, v] of Object.entries(def.storage ?? {})) cap[k as ResourceKey] += v ?? 0;
    battery += def.battery ?? 0;
  }
  return { cap, battery };
}
