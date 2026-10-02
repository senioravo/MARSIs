// Crew, fleet, health, environment, comms, emergencies and standing orders.

import { useState } from "react";
import { COMMS, FACILITIES, INCIDENTS, MISSIONS, RESOURCES, ROLES, ROLE_KEYS, SEVERITY, VEHICLES } from "../engine/catalog";
import { alive, isRunning, kpis } from "../engine/kpis";
import { assignPeople, autoAssignIdle, dispatchVehicle, recallVehicle, registerPerson, respondToIncident, setPolicy } from "../engine/actions";
import type { Incident, IncidentKind, ResourceKey, Role, SimState } from "../engine/types";
import { RoleBadge } from "../art/CrewArt";
import { FacilityArt } from "../art/FacilityArt";
import { CommsArt, VehicleArt } from "../art/FleetArt";
import { IncidentIcon } from "../art/Icons";
import { Meter, Plate, Range, Segmented, Stat, StatusPill, Toggle, cx, fmt, pct } from "../ui";
import type { PanelProps } from "./panelsA";
import styles from "./Dashboard.module.css";
import sim from "../Sim.module.css";

export const stamp = (t: number) => `S${Math.floor(t / 24)} ${String(t % 24).padStart(2, "0")}:00`;

function placeOf(s: SimState, inc: Incident): string {
  if (inc.facilityId) return s.facilities.find((f) => f.id === inc.facilityId)?.name ?? "—";
  if (inc.vehicleId) return `${s.vehicles.find((v) => v.id === inc.vehicleId)?.name ?? "Vehicle"} (field)`;
  if (inc.commsId) return s.comms.find((c) => c.id === inc.commsId)?.name ?? "—";
  if (inc.sectorId) return `Sector ${s.sectors.find((x) => x.id === inc.sectorId)?.name}`;
  return "Colony-wide";
}

// ───────────────────────────── crew

type Filter = "all" | "available" | "pending" | "assigned" | "other";

export function CrewPanel({ s, act }: PanelProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<string>("");
  const [sector, setSector] = useState<string>(s.sectors[0]?.id ?? "");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("technician");
  const [avail, setAvail] = useState<"available" | "pending">("available");
  const k = kpis(s);
  const crewOf = new Map<string, string>();
  for (const v of s.vehicles) for (const id of v.crew) crewOf.set(id, v.name);
  const people = s.people.filter((p) => {
    if (filter === "all") return p.status !== "deceased";
    if (filter === "other") return p.status === "responding" || p.status === "medical" || p.status === "deceased";
    return p.status === filter && !crewOf.has(p.id);
  });
  const toggle = (id: string) =>
    setPicked((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const staffed = s.facilities.filter((f) => FACILITIES[f.kind].staff > 0);
  const target0 = target || staffed[0]?.id || "";
  const facilityName = (id: string | null) => (id ? s.facilities.find((f) => f.id === id)?.name : undefined);
  const homeName = (id: string | null) => (id ? s.facilities.find((f) => f.id === id)?.name : "—");
  const assignable = [...picked].filter((id) => {
    const p = s.people.find((x) => x.id === id);
    return p && (p.status === "available" || p.status === "pending" || p.status === "assigned") && !crewOf.has(id);
  });

  return (
    <div className={styles.stack}>
      <div className={styles.statStrip}>
        <Stat label="Available" value={k.staff.available} tone="ok" />
        <Stat label="Assigned" value={k.staff.assigned - crewOf.size} sub={crewOf.size ? `+${crewOf.size} on vehicles` : undefined} />
        <Stat label="Pending assignment" value={k.staff.pending} tone={k.staff.pending ? "warn" : undefined} />
        <Stat label="Responding to incidents" value={k.staff.responding} />
        <Stat label="In medical care" value={k.staff.medical} tone={k.staff.medical ? "bad" : undefined} />
        <Stat label="Lost" value={s.stats.deaths} tone={s.stats.deaths ? "bad" : undefined} />
      </div>
      <div className={styles.grid2wide}>
        <Plate title="Roster" aside={<Segmented label="Filter crew" value={filter} onChange={setFilter} options={[
          { value: "all", label: "All" },
          { value: "available", label: "Available" },
          { value: "pending", label: "Pending" },
          { value: "assigned", label: "Assigned" },
          { value: "other", label: "Away" },
        ]} />}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all shown"
                      checked={people.length > 0 && people.every((p) => picked.has(p.id))}
                      onChange={(e) => setPicked(e.target.checked ? new Set(people.map((p) => p.id)) : new Set())}
                    />
                  </th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Working at</th>
                  <th>Home</th>
                  <th>Shift</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {people.slice(0, 250).map((p) => (
                  <tr key={p.id} className={cx(picked.has(p.id) && styles.rowPicked)}>
                    <td>
                      <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Select ${p.name}`} disabled={p.status === "deceased"} />
                    </td>
                    <td>
                      <span className={styles.person}>
                        <RoleBadge role={p.role} size={26} />
                        <span>
                          <span className={styles.facName}>{p.name}</span>
                          <span className={styles.facKind}>{ROLES[p.role].label}</span>
                        </span>
                      </span>
                    </td>
                    <td>
                      <StatusPill status={crewOf.has(p.id) ? "mission" : p.status} label={crewOf.has(p.id) ? "On vehicle" : undefined} />
                    </td>
                    <td className={styles.small}>
                      {crewOf.get(p.id) ?? (p.status === "responding" ? s.incidents.find((i) => i.id === p.incidentId)?.title : facilityName(p.facilityId)) ?? "—"}
                    </td>
                    <td className={styles.small}>{homeName(p.homeId)}</td>
                    <td className={styles.mono}>{p.shift}</td>
                    <td>
                      <span className={styles.integrity}>
                        <Meter value={p.health / 100} color={p.health < 40 ? "#ff5a4a" : p.health < 70 ? "var(--signal)" : "var(--life)"} label="Health" />
                        <span className={styles.mono}>{Math.round(p.health)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {people.length === 0 && <p className={sim.muted}>Nobody matches this filter.</p>}
          </div>
        </Plate>

        <div className={styles.stack}>
          <Plate title="Assign selected crew">
            <p className={styles.note}>{picked.size ? `${assignable.length} of ${picked.size} selected can be reassigned.` : "Tick people in the roster, then choose where they work."}</p>
            <label className={sim.field}>
              <span>Facility</span>
              <select className={sim.select} value={target0} onChange={(e) => setTarget(e.target.value)}>
                {staffed.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({s.people.filter((p) => p.facilityId === f.id && p.status === "assigned").length}/{FACILITIES[f.kind].staff})
                  </option>
                ))}
              </select>
            </label>
            <label className={sim.field}>
              <span>Sector</span>
              <select className={sim.select} value={s.facilities.find((f) => f.id === target0)?.sectorId ?? sector} onChange={(e) => setSector(e.target.value)} disabled>
                {s.sectors.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
              <span className={sim.fieldHint}>Set by the facility's location.</span>
            </label>
            <div className={styles.btnRow}>
              <button type="button" className={sim.btnPrimary} disabled={!assignable.length} onClick={() => act((st) => { assignPeople(st, assignable, target0, null); setPicked(new Set()); })}>
                Assign {assignable.length || ""}
              </button>
              <button type="button" className={sim.btnGhost} disabled={!assignable.length} onClick={() => act((st) => { assignPeople(st, assignable, null, null); setPicked(new Set()); })}>
                Release
              </button>
            </div>
            <button type="button" className={sim.btnGhost} onClick={() => act(autoAssignIdle)}>
              Auto-assign idle crew
            </button>
          </Plate>

          <Plate title="Register personnel">
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                act((st) => registerPerson(st, name, role, avail === "available"));
                setName("");
              }}
            >
              <label className={sim.field}>
                <span>Name</span>
                <input className={sim.input} value={name} onChange={(e) => setName(e.target.value)} placeholder="Leave blank for a random name" maxLength={40} />
              </label>
              <label className={sim.field}>
                <span>Role</span>
                <select className={sim.select} value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  {ROLE_KEYS.map((r) => (
                    <option key={r} value={r}>
                      {ROLES[r].label}
                    </option>
                  ))}
                </select>
              </label>
              <div className={sim.field}>
                <span>Availability</span>
                <Segmented label="Availability" value={avail} onChange={setAvail} options={[{ value: "available", label: "Available now" }, { value: "pending", label: "Pending induction" }]} />
              </div>
              <button type="submit" className={sim.btnPrimary}>
                Register
              </button>
            </form>
          </Plate>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────── fleet

export function FleetPanel({ s, act }: PanelProps) {
  const [msg, setMsg] = useState<string | null>(null);
  const home = s.sectors.find((x) => x.kind === "industrial") ?? s.sectors[0];
  if (!s.vehicles.length) return <p className={sim.muted}>This colony has no vehicles.</p>;
  return (
    <div className={styles.stack}>
      {msg && <p className={styles.alertLine}>{msg}</p>}
      <div className={styles.grid2}>
        {s.vehicles.map((v) => {
          const def = VEHICLES[v.kind];
          const hoursLeft = (v.charge * def.capacity) / def.drain;
          const away = v.mission ? Math.hypot(v.x - (home?.x ?? 0), v.y - (home?.y ?? 0)) * 0.08 : 0;
          const crew = v.crew.map((id) => s.people.find((p) => p.id === id)?.name).filter(Boolean);
          const inGarage = v.status === "docked" || v.status === "charging";
          return (
            <Plate key={v.id} title={v.name} aside={<StatusPill status={v.status} />} art={<VehicleArt kind={v.kind} />}>
              <div className={styles.statRow}>
                <Stat label={def.power === "battery" ? "Battery" : "Fuel tank"} value={pct(v.charge)} sub={`${fmt(v.charge * def.capacity)} ${def.power === "battery" ? "kWh" : "kg CH₄"}`} tone={v.charge < 0.25 ? "warn" : undefined} />
                <Stat label="Autonomy" value={`${hoursLeft.toFixed(1)} h`} sub={`${fmt(hoursLeft * def.speed)} km range`} />
                <Stat label="Location" value={inGarage ? "Garage" : v.status === "maintenance" ? "Workshop" : `${away.toFixed(1)} km out`} sub={home ? `Sector ${home.name}` : undefined} />
              </div>
              <dl className={styles.specs}>
                <div><dt>Type</dt><dd>{def.label}</dd></div>
                <div><dt>Energy use</dt><dd>{def.drain} {def.power === "battery" ? "kW" : "kg CH₄/h"}</dd></div>
                <div><dt>Oxygen use</dt><dd>{def.o2PerHour ? `${def.o2PerHour} kg/h` : "None"}</dd></div>
                <div><dt>Cargo capacity</dt><dd>{fmt(def.cargo)} kg</dd></div>
                <div><dt>Distance</dt><dd>{fmt(v.distanceKm)} km</dd></div>
                <div><dt>Hours</dt><dd>{fmt(v.hours)} h</dd></div>
                <div><dt>Integrity</dt><dd>{Math.round(v.integrity)}%</dd></div>
                <div><dt>Next service</dt><dd>{v.status === "maintenance" ? `${Math.ceil(v.serviceHoursLeft)} h left` : `in ${fmt(Math.max(0, v.serviceDueHours - v.hours))} h`}</dd></div>
                <div><dt>Crew</dt><dd>{crew.length ? crew.join(", ") : def.crew ? "—" : "Uncrewed"}</dd></div>
                <div><dt>Mission</dt><dd>{v.mission ? `${MISSIONS[v.mission.kind].label}, ${Math.round((v.mission.elapsed / v.mission.duration) * 100)}%` : "—"}</dd></div>
              </dl>
              <div className={styles.btnRow}>
                {def.missions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={sim.btnGhost}
                    disabled={!inGarage}
                    title={MISSIONS[m].blurb}
                    onClick={() => act((st) => setMsg(dispatchVehicle(st, v.id, m)))}
                  >
                    {MISSIONS[m].label}
                  </button>
                ))}
                {v.status === "mission" && (
                  <button type="button" className={sim.btnGhost} onClick={() => act((st) => recallVehicle(st, v.id))}>
                    Recall
                  </button>
                )}
              </div>
            </Plate>
          );
        })}
      </div>
    </div>
  );
}

// ───────────────────────────── health

export function HealthPanel({ s }: PanelProps) {
  const people = alive(s);
  const bays = s.facilities.filter((f) => f.kind === "medical_bay");
  const medics = people.filter((p) => p.role === "medic");
  const patients = people.filter((p) => p.status === "medical");
  const supplyPct = s.resources.medical / Math.max(1, s.capacity.medical);
  const equipment = bays.length ? bays.reduce((a, f) => a + (f.status === "operational" ? f.integrity : 0), 0) / (bays.length * 100) : 0;
  const k = kpis(s);
  const exposed = [...people].sort((a, b) => b.dose - a.dose).slice(0, 6);
  const medInc = s.incidents.filter((i) => (i.kind === "medical" || i.kind === "radiation") && i.status !== "resolved");
  return (
    <div className={styles.stack}>
      <div className={styles.statStrip}>
        <Stat label="Average health" value={fmt(k.health)} tone={k.health < 60 ? "bad" : k.health < 80 ? "warn" : undefined} />
        <Stat label="Medical staff available" value={`${medics.filter((p) => p.status !== "medical").length} of ${medics.length}`} />
        <Stat label="Supplies" value={pct(supplyPct)} sub={`${fmt(s.resources.medical)} units`} tone={supplyPct < 0.15 ? "bad" : undefined} />
        <Stat label="Equipment available" value={pct(equipment)} />
        <Stat label="Patients" value={patients.length} tone={patients.length ? "warn" : undefined} />
        <Stat label="Deaths" value={s.stats.deaths} tone={s.stats.deaths ? "bad" : undefined} />
      </div>
      <div className={styles.grid3}>
        <Plate title="Medical centres" art={<FacilityArt kind="medical_bay" />}>
          {bays.length === 0 && <p className={styles.alertLine}>No medical bay. Patients only recover slowly on their own.</p>}
          <ul className={styles.facRows}>
            {bays.map((f) => (
              <li key={f.id}>
                <span className={styles.facName}>{f.name}</span>
                <StatusPill status={f.enabled ? f.status : "offline"} />
                <span className={styles.mono}>{s.people.filter((p) => p.facilityId === f.id && p.status === "assigned").length} medics on shift</span>
              </li>
            ))}
          </ul>
        </Plate>
        <Plate title="Patients" aside={`${patients.length} in care`}>
          {patients.length === 0 ? (
            <p className={sim.muted}>Nobody is in medical care.</p>
          ) : (
            <ul className={styles.people}>
              {patients.map((p) => (
                <li key={p.id}>
                  <RoleBadge role={p.role} size={24} />
                  <span>{p.name}</span>
                  <Meter value={p.health / 100} color={p.health < 30 ? "#ff5a4a" : "var(--signal)"} label="Health" />
                  <span className={styles.mono}>{Math.round(p.health)}</span>
                </li>
              ))}
            </ul>
          )}
          {medInc.length > 0 && (
            <>
              <h4 className={styles.subhead}>Open medical incidents</h4>
              <ul className={styles.incList}>
                {medInc.map((i) => (
                  <li key={i.id}>
                    <IncidentIcon kind={i.kind} size={16} style={{ color: INCIDENTS[i.kind].color }} />
                    <span>{i.title}</span>
                    <StatusPill status={i.status} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </Plate>
        <Plate title="Radiation dose" aside="Highest accumulated, mSv">
          <ul className={styles.people}>
            {exposed.map((p) => (
              <li key={p.id}>
                <RoleBadge role={p.role} size={24} />
                <span>{p.name}</span>
                <Meter value={p.dose / 250} color="#e8d84a" label="Dose" />
                <span className={styles.mono}>{p.dose.toFixed(1)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.note}>Outside now: {s.weather.radiation.toFixed(2)} mSv/sol. Career limit for astronauts is about 600 mSv.</p>
        </Plate>
      </div>
    </div>
  );
}

// ───────────────────────────── environment

export function EnvironmentPanel({ s }: PanelProps) {
  const w = s.weather;
  const habs = s.facilities.filter((f) => f.env);
  const atmo = w.stormScale !== "none" ? `${w.stormScale[0].toUpperCase()}${w.stormScale.slice(1)} dust storm` : w.tau > 0.8 ? "Hazy" : "Clear";
  return (
    <div className={styles.stack}>
      <div className={styles.statStrip}>
        <Stat label="Outside temperature" value={`${Math.round(w.extTemp)}°C`} />
        <Stat label="Outside pressure" value={`${w.extPressure.toFixed(2)} mbar`} />
        <Stat label="Atmosphere" value={atmo} sub={`Dust opacity τ ${w.tau.toFixed(2)}`} tone={w.stormScale !== "none" ? "warn" : undefined} />
        <Stat label="Surface radiation" value={`${w.radiation.toFixed(2)} mSv/sol`} tone={w.flareHoursLeft > 0 ? "bad" : undefined} sub={w.flareHoursLeft > 0 ? `Solar event, ${w.flareHoursLeft} h left` : undefined} />
        <Stat label="Storm clears in" value={w.stormScale !== "none" ? `${Math.ceil(w.stormHoursLeft / 24)} sols` : "—"} />
      </div>
      <Plate title="Inside each habitat">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Habitat</th>
                <th>Temp</th>
                <th>Pressure</th>
                <th>Humidity</th>
                <th>O₂</th>
                <th>CO₂</th>
                <th>Air quality</th>
                <th>Radiation</th>
                <th>Dust</th>
                <th>Seals</th>
                <th>Structure</th>
                <th>Life support</th>
              </tr>
            </thead>
            <tbody>
              {habs.map((f) => {
                const e = f.env!;
                const ls = isRunning(f) && f.powered;
                return (
                  <tr key={f.id}>
                    <td>
                      <span className={styles.facName}>{f.name}</span>
                      <span className={styles.facKind}>
                        {s.sectors.find((x) => x.id === f.sectorId)?.name} · {f.residents} residents
                      </span>
                    </td>
                    <td className={cx(styles.mono, e.temp < 10 && styles.bad)}>{e.temp.toFixed(1)}°C</td>
                    <td className={cx(styles.mono, e.pressure < 80 && styles.bad)}>{e.pressure.toFixed(1)} kPa</td>
                    <td className={styles.mono}>{Math.round(e.humidity)}%</td>
                    <td className={cx(styles.mono, e.o2 < 19 && styles.bad)}>{e.o2.toFixed(1)}%</td>
                    <td className={cx(styles.mono, e.co2 > 2500 && styles.bad)}>{fmt(e.co2)} ppm</td>
                    <td>
                      <span className={styles.integrity}>
                        <Meter value={e.airQuality / 100} color={e.airQuality < 60 ? "var(--signal)" : "var(--life)"} label="Air quality" />
                        <span className={styles.mono}>{Math.round(e.airQuality)}</span>
                      </span>
                    </td>
                    <td className={styles.mono}>{e.radiation.toFixed(2)}</td>
                    <td className={styles.mono}>{Math.round(e.dust)} µg</td>
                    <td>
                      <StatusPill status={f.seals === "sealed" ? "operational" : f.seals === "degraded" ? "repair" : "disabled"} label={f.seals === "sealed" ? "Sealed" : f.seals === "degraded" ? "Degraded" : "Breached"} />
                    </td>
                    <td className={styles.mono}>{Math.round(f.integrity)}%</td>
                    <td>
                      <StatusPill status={ls ? "operational" : "disabled"} label={ls ? "Running" : "Down"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Plate>
    </div>
  );
}

// ───────────────────────────── comms

export function CommsPanel({ s }: PanelProps) {
  if (!s.comms.length) return <p className={styles.alertLine}>No communications assets. Resupply landers cannot land.</p>;
  const up = s.comms.filter((c) => c.status === "available").length;
  return (
    <div className={styles.stack}>
      <div className={styles.statStrip}>
        <Stat label="Link to Earth" value={up ? "Open" : "Lost"} tone={up ? "ok" : "bad"} />
        <Stat label="Assets available" value={`${up} of ${s.comms.length}`} />
      </div>
      <div className={styles.grid3}>
        {s.comms.map((c) => (
          <Plate key={c.id} title={c.name} aside={<StatusPill status={c.status} />} art={<CommsArt kind={c.kind} />}>
            <dl className={styles.specs}>
              <div><dt>Type</dt><dd>{COMMS[c.kind].label}</dd></div>
              <div><dt>Location</dt><dd>{c.sectorId ? `Sector ${s.sectors.find((x) => x.id === c.sectorId)?.name}` : "Areostationary orbit"}</dd></div>
              {c.hoursLeft > 0 && c.status !== "available" && <div><dt>Back in</dt><dd>{c.hoursLeft} h</dd></div>}
            </dl>
            <h4 className={styles.subhead}>Status history</h4>
            <ol className={styles.timeline}>
              {[...c.history].reverse().slice(0, 6).map((h, i) => (
                <li key={i}>
                  <span className={styles.mono}>{stamp(h.t)}</span>
                  <StatusPill status={h.status} />
                  <span className={styles.small}>{h.note}</span>
                </li>
              ))}
            </ol>
          </Plate>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────── emergencies

export function EmergenciesPanel({ s, act }: PanelProps) {
  const [show, setShow] = useState<"open" | "all">("open");
  const list = s.incidents.filter((i) => (show === "open" ? i.status !== "resolved" : true)).slice().reverse();
  const counts = new Map<IncidentKind, number>();
  for (const i of s.incidents) counts.set(i.kind, (counts.get(i.kind) ?? 0) + 1);
  return (
    <div className={styles.stack}>
      <div className={styles.typeStrip}>
        {(Object.keys(INCIDENTS) as IncidentKind[]).map((kind) => (
          <span key={kind} className={styles.typeChip} title={INCIDENTS[kind].label}>
            <IncidentIcon kind={kind} size={18} style={{ color: INCIDENTS[kind].color }} />
            <span>{INCIDENTS[kind].label}</span>
            <b className={styles.mono}>{counts.get(kind) ?? 0}</b>
          </span>
        ))}
      </div>
      <Plate
        title={show === "open" ? "Open incidents" : "Incident log"}
        aside={<Segmented label="Incidents shown" value={show} onChange={setShow} options={[{ value: "open", label: "Open" }, { value: "all", label: "Full history" }]} />}
      >
        {list.length === 0 ? (
          <p className={sim.muted}>{show === "open" ? "No open incidents. All systems nominal." : "Nothing has gone wrong yet."}</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Incident</th>
                  <th>Severity</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Responsible</th>
                  <th>Resources needed</th>
                  <th>Time left</th>
                  <th>Opened</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 120).map((i) => {
                  const rate = Math.max(0.4, i.responders.length * 0.85);
                  return (
                    <tr key={i.id}>
                      <td>
                        <span className={styles.incCell}>
                          <span className={styles.incIcon} style={{ color: INCIDENTS[i.kind].color }}>
                            <IncidentIcon kind={i.kind} size={18} />
                          </span>
                          <span>
                            <span className={styles.facName}>{INCIDENTS[i.kind].label}</span>
                            <span className={styles.facKind}>{i.title}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={styles.sev} style={{ ["--sev" as string]: SEVERITY[i.severity].color }}>
                          {Array.from({ length: 4 }, (_, n) => (
                            <i key={n} className={n < i.severity ? styles.sevOn : undefined} />
                          ))}
                          {SEVERITY[i.severity].label}
                        </span>
                      </td>
                      <td className={styles.small}>{placeOf(s, i)}</td>
                      <td>
                        <StatusPill status={i.status} />
                      </td>
                      <td className={styles.small}>{i.responsible ?? "Unassigned"}</td>
                      <td>
                        <span className={styles.needs}>
                          {Object.entries(i.needs).map(([rk, v]) => (
                            <span key={rk} className={cx(!i.resourcesCommitted && s.resources[rk as ResourceKey] < (v ?? 0) && styles.bad)}>
                              {fmt(v ?? 0)} {RESOURCES[rk as ResourceKey].label.toLowerCase()}
                            </span>
                          ))}
                          <span>
                            {i.crewNeeded} × {ROLES[i.needsRole].label.toLowerCase()}
                          </span>
                        </span>
                      </td>
                      <td className={styles.mono}>{i.status === "resolved" ? `took ${(i.resolvedAt ?? s.t) - i.openedAt} h` : `~${Math.ceil(i.workLeft / rate)} h`}</td>
                      <td className={styles.mono}>{stamp(i.openedAt)}</td>
                      <td>
                        {i.status !== "resolved" && i.responders.length < i.crewNeeded && (
                          <button type="button" className={sim.btnGhost} onClick={() => act((st) => respondToIncident(st, i.id))}>
                            Send crew
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Plate>
    </div>
  );
}

// ───────────────────────────── standing orders

export function OrdersPanel({ s, act }: PanelProps) {
  const p = s.config.policies;
  return (
    <div className={styles.grid2}>
      <Plate title="Automatic responses">
        <div className={styles.form}>
          <Toggle checked={p.autoMaintenance} onChange={(v) => act((st) => setPolicy(st, "autoMaintenance", v))} label="Service worn equipment" hint="Takes a facility offline for a few hours and uses spare components." />
          <Range label="Service below integrity" value={p.maintenanceThreshold} min={20} max={90} step={5} format={(v) => `${v}%`} onChange={(v) => act((st) => setPolicy(st, "maintenanceThreshold", v))} />
          <Toggle checked={p.autoResponse} onChange={(v) => act((st) => setPolicy(st, "autoResponse", v))} label="Send crews to incidents" hint="Off means incidents wait for you to press “Send crew”." />
          <Toggle checked={p.autoDispatch} onChange={(v) => act((st) => setPolicy(st, "autoDispatch", v))} label="Run supply trips" hint="Vehicles fetch regolith and ice when stock runs low, except during storms." />
        </div>
      </Plate>
      <Plate title="Rations">
        <div className={styles.form}>
          <Range label="Food ration" value={p.foodRation} min={0.6} max={1.1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => act((st) => setPolicy(st, "foodRation", v))} hint="Stretch food stock at a small cost to health." />
          <Range label="Water ration" accent="var(--energy)" value={p.waterRation} min={0.6} max={1.1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => act((st) => setPolicy(st, "waterRation", v))} />
        </div>
      </Plate>
    </div>
  );
}

