// Overview, life support, energy, infrastructure and inventory views.

import { useState } from "react";
import { CATEGORIES, CROPS, CROP_KEYS, FACILITIES, FACILITY_KINDS, RESOURCES, RESOURCE_KEYS, VEHICLES, siteById } from "../engine/catalog";
import { DIFFICULTY } from "../engine/create";
import { alive, balance, formatDays, isRunning, kpis, sumFlows, type Balance } from "../engine/kpis";
import { buildCost, buildFacility, canAfford, serviceFacility, setCrop, setPolicy, toggleFacility } from "../engine/actions";
import type { CropKind, Facility, FacilityCategory, FacilityKind, ResourceKey, SimState } from "../engine/types";
import { CropArt } from "../art/CrewArt";
import { FacilityArt } from "../art/FacilityArt";
import { CATEGORY_GLYPH, Ico } from "../art/Icons";
import { Meter, Plate, Range, Stat, StatusPill, cx, fmt, pct } from "../ui";
import { Chart } from "./Chart";
import styles from "./Dashboard.module.css";
import sim from "../Sim.module.css";

export type Act = (fn: (s: SimState) => void) => void;
export interface PanelProps {
  s: SimState;
  act: Act;
  version: number;
  onSelect?: (id: string) => void;
}

export function Glyph({ kind, size = 22 }: { kind: FacilityKind; size?: number }) {
  const cat = FACILITIES[kind].category;
  return (
    <svg viewBox="-11 -11 22 22" width={size} height={size} aria-hidden="true" className={styles.glyph}>
      <circle r="10" fill="none" stroke="var(--ink-12)" />
      <g stroke={CATEGORIES[cat].color} fill="none" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" transform="scale(0.85)">
        {CATEGORY_GLYPH[cat]}
      </g>
    </svg>
  );
}

function Trend({ net }: { net: number }) {
  if (Math.abs(net) < 0.05) return <span className={styles.trendFlat}>steady</span>;
  return net > 0 ? <span className={styles.trendUp}>▲ rising</span> : <span className={styles.trendDown}>▼ falling</span>;
}

function Gauge({ label, b, unit, color }: { label: string; b: Balance; unit: string; color: string }) {
  const fill = b.capacity ? b.stock / b.capacity : 0;
  const low = Number.isFinite(b.days) && b.days < 7;
  return (
    <div className={styles.gauge}>
      <div className={styles.gaugeHead}>
        <span>{label}</span>
        <Trend net={b.net} />
      </div>
      <div className={styles.gaugeValue}>
        {fmt(b.stock)} <small>{unit}</small>
      </div>
      <Meter value={fill} color={color} warn={low} label={`${label} storage`} />
      <div className={styles.gaugeRow}>
        <span>{pct(fill)} of {fmt(b.capacity)} {unit}</span>
        <span className={cx(low && styles.bad)}>{formatDays(b.days)}</span>
      </div>
    </div>
  );
}

function FlowTable({ rows, unit }: { rows: { label: string; value: number; tone?: "loss" | "gain" }[]; unit: string }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)));
  return (
    <ul className={styles.flowTable}>
      {rows.map((r) => (
        <li key={r.label}>
          <span>{r.label}</span>
          <span className={styles.flowBar}>
            <span style={{ width: `${(Math.abs(r.value) / max) * 100}%` }} className={cx(r.tone === "loss" && styles.flowLoss, r.tone === "gain" && styles.flowGain)} />
          </span>
          <span className={styles.mono}>
            {fmt(r.value, r.value < 10 && r.value > 0 ? 1 : 0)} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

function FacilityRows({ list, act }: { list: Facility[]; act: Act }) {
  if (!list.length) return <p className={sim.muted}>None built.</p>;
  return (
    <ul className={styles.facRows}>
      {list.map((f) => {
        const out = Object.entries(f.output).filter(([, v]) => (v ?? 0) > 0.001);
        return (
          <li key={f.id}>
            <Glyph kind={f.kind} />
            <span className={styles.facName}>{f.name}</span>
            <StatusPill status={f.enabled ? f.status : "offline"} label={f.repairReason === "Under construction" ? "Building" : !f.powered && isRunning(f) && FACILITIES[f.kind].power > 0 ? "No power" : undefined} />
            <span className={styles.mono}>
              {out.length ? out.map(([k, v]) => `${fmt((v ?? 0) * 24, 1)} ${RESOURCES[k as ResourceKey].unit}`).join(" · ") + " /sol" : FACILITIES[f.kind].generation ? `${fmt(FACILITIES[f.kind].generation!.kw * f.efficiency, 1)} kW cap` : `${pct(f.efficiency)}`}
            </span>
            <button type="button" className={sim.iconBtn} title={f.enabled ? "Switch off" : "Switch on"} aria-label={`${f.enabled ? "Switch off" : "Switch on"} ${f.name}`} onClick={() => act((st) => toggleFacility(st, f.id))}>
              <Ico name="power" size={14} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// ───────────────────────────── overview

export function OverviewPanel({ s }: PanelProps) {
  const h = s.history;
  const t = h.map((p) => p.t);
  return (
    <div className={styles.grid2}>
      <Plate title="Days of reserve" aside="Capped at 120 sols">
        <Chart
          title="Days of oxygen, water and food remaining"
          t={t}
          yMax={120}
          unit=" sols"
          format={(v) => v.toFixed(0)}
          series={[
            { key: "o2", label: "Oxygen", color: "var(--life)", values: h.map((p) => p.o2Days) },
            { key: "w", label: "Water", color: "var(--energy)", values: h.map((p) => p.waterDays) },
            { key: "f", label: "Food", color: "var(--signal)", values: h.map((p) => p.foodDays) },
          ]}
        />
      </Plate>
      <Plate title="Power" aside="kW">
        <Chart
          title="Power generated and demanded"
          t={t}
          unit=" kW"
          series={[
            { key: "g", label: "Generated", color: "var(--energy)", values: h.map((p) => p.gen) },
            { key: "d", label: "Demand", color: "var(--signal)", values: h.map((p) => p.demand) },
          ]}
        />
      </Plate>
      <Plate title="Battery reserve" aside="kWh">
        <Chart title="Battery charge" t={t} unit=" kWh" yMax={s.batteryCap} series={[{ key: "b", label: "Stored", color: "var(--energy)", values: h.map((p) => p.battery) }]} />
      </Plate>
      <Plate title="Colonist health" aside="Average, 0–100">
        <Chart title="Average colonist health" t={t} yMax={100} series={[{ key: "h", label: "Health", color: "var(--life)", values: h.map((p) => p.health) }]} />
      </Plate>
    </div>
  );
}

// ───────────────────────────── life support

export function LifePanel({ s, act }: PanelProps) {
  const cfg = s.config;
  const diff = DIFFICULTY[cfg.difficulty];
  const pop = alive(s).length;
  const o2 = balance(s, "oxygen");
  const water = balance(s, "water");
  const food = balance(s, "food");
  const open = s.incidents.filter((i) => i.status !== "resolved");
  const vehiclesO2 = s.vehicles.filter((v) => v.status === "mission" || v.status === "returning" || v.status === "stranded").reduce((a, v) => a + VEHICLES[v.kind].o2PerHour * 24, 0);
  const leaksO2 = open.reduce((a, i) => a + (i.kind === "pressure_leak" ? 0.35 * i.severity * 24 : i.kind === "fire" ? 0.15 * i.severity * 24 : 0), 0);
  const labsO2 = s.facilities.filter((f) => f.kind === "research_lab" && isRunning(f) && f.powered).length * 0.24;
  const by = (kinds: FacilityKind[]) => s.facilities.filter((f) => kinds.includes(f.kind));
  const greenWater = by(["greenhouse"]).reduce((a, f) => a + (isRunning(f) && f.powered ? (CROPS[f.crop ?? "potato"].waterPerSol * f.efficiency) : 0), 0);
  const indWater = by(["o2_electrolysis", "sabatier_plant", "algae_bioreactor", "medical_bay"]).reduce(
    (a, f) => a + (isRunning(f) && f.powered ? (FACILITIES[f.kind].inputs?.water ?? 0) * 24 * f.efficiency : 0),
    0,
  );
  const leaksW = open.reduce((a, i) => a + (i.kind === "water_leak" ? 12 * i.severity * 24 : 0), 0);
  const recycled = s.flows.reduce((a, f) => a + f.recycled, 0) * (24 / Math.max(1, s.flows.length));
  const used = s.flows.reduce((a, f) => a + f.waterUse, 0) * (24 / Math.max(1, s.flows.length));
  const site = siteById(cfg.siteId);

  return (
    <div className={styles.grid3}>
      <Plate title="Oxygen" art={<FacilityArt kind="o2_electrolysis" />}>
        <Gauge label="Stored" b={o2} unit="kg" color="var(--life)" />
        <div className={styles.statRow}>
          <Stat label="Made per sol" value={`${fmt(o2.prod)} kg`} />
          <Stat label="Used per sol" value={`${fmt(o2.cons)} kg`} />
          <Stat label="Balance" value={`${o2.net >= 0 ? "+" : ""}${fmt(o2.net)} kg`} tone={o2.net < 0 ? "bad" : undefined} />
        </div>
        <h4 className={styles.subhead}>Where it goes, per sol</h4>
        <FlowTable
          unit="kg"
          rows={[
            { label: "Colonists", value: pop * cfg.consumption.oxygen * diff.consumption },
            { label: "Vehicles", value: vehiclesO2 },
            { label: "Laboratories", value: labsO2 },
            { label: "Leaks and fires", value: leaksO2, tone: "loss" },
          ]}
        />
        <h4 className={styles.subhead}>Production</h4>
        <FacilityRows list={by(["o2_electrolysis", "moxie_array"])} act={act} />
      </Plate>

      <Plate title="Water" art={<FacilityArt kind="ice_extractor" />}>
        <Gauge label="Stored" b={water} unit="L" color="var(--energy)" />
        <div className={styles.statRow}>
          <Stat label="Made per sol" value={`${fmt(water.prod)} L`} />
          <Stat label="Used per sol" value={`${fmt(water.cons)} L`} />
          <Stat label="Recovered" value={used > 0 ? pct(recycled / used) : "—"} sub={`${fmt(recycled)} L/sol recycled`} />
        </div>
        <h4 className={styles.subhead}>Where it goes, per sol</h4>
        <FlowTable
          unit="L"
          rows={[
            { label: "Colonists", value: pop * cfg.consumption.water * cfg.policies.waterRation * diff.consumption },
            { label: "Agriculture", value: greenWater },
            { label: "Industry", value: indWater },
            { label: "Leaks", value: leaksW, tone: "loss" },
            { label: "Recycled back", value: recycled, tone: "gain" },
          ]}
        />
        <p className={styles.note}>
          Ice yield at {site.label}: ×{site.ice}
          {s.surveyBonus > 0 ? `, +${Math.round(s.surveyBonus * 100)}% from surveys` : ""}. Hauled ice in stock: {fmt(s.resources.ice)} kg.
        </p>
        <h4 className={styles.subhead}>Extraction and treatment</h4>
        <FacilityRows list={by(["ice_extractor", "water_recycler"])} act={act} />
      </Plate>

      <Plate title="Food" art={<FacilityArt kind="greenhouse" />}>
        <Gauge label="Stored" b={food} unit="kg" color="var(--signal)" />
        <div className={styles.statRow}>
          <Stat label="Farm output per sol" value={`${fmt(food.prod)} kg`} />
          <Stat label="Needed per sol" value={`${fmt(food.cons)} kg`} />
          <Stat label="Covered locally" value={pct(food.cons > 0 ? Math.min(1, food.prod / food.cons) : 1)} />
        </div>
        <p className={styles.note}>About 4% of food is wasted in handling. Harvested so far: {fmt(s.stats.harvestKg)} kg.</p>
        <h4 className={styles.subhead}>Greenhouses</h4>
        <ul className={styles.crops}>
          {by(["greenhouse"]).map((f) => {
            const crop = CROPS[f.crop ?? "potato"];
            const left = Math.max(0, crop.cycleSols - f.growth);
            const rate = Math.max(0.05, f.efficiency);
            return (
              <li key={f.id}>
                <CropArt crop={f.crop ?? "potato"} size={42} />
                <div className={styles.cropBody}>
                  <span className={styles.cropHead}>
                    <span>{f.name}</span>
                    <StatusPill status={f.enabled ? f.status : "offline"} />
                  </span>
                  <Meter value={f.growth / crop.cycleSols} color="#a6d672" label={`${crop.label} growth`} />
                  <span className={styles.cropMeta}>
                    {crop.label} · harvest in {left / rate > 200 ? "—" : `${(left / rate).toFixed(1)} sols`} · {fmt(f.stockpile)} kg growing · {fmt(crop.waterPerSol)} L/sol
                  </span>
                </div>
                <select className={sim.select} value={f.crop ?? "potato"} aria-label={`Replant ${f.name}`} onChange={(e) => act((st) => setCrop(st, f.id, e.target.value as CropKind))}>
                  {CROP_KEYS.map((c) => (
                    <option key={c} value={c}>
                      {CROPS[c].label}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
        <FacilityRows list={by(["algae_bioreactor"])} act={act} />
        <div className={styles.rations}>
          <Range label="Food ration" value={cfg.policies.foodRation} min={0.6} max={1.1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => act((st) => setPolicy(st, "foodRation", v))} hint="Below 85% slowly erodes health." />
          <Range label="Water ration" accent="var(--energy)" value={cfg.policies.waterRation} min={0.6} max={1.1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => act((st) => setPolicy(st, "waterRation", v))} hint="Below 80% slowly erodes health." />
        </div>
      </Plate>
    </div>
  );
}

// ───────────────────────────── energy

const PRIORITY_CATS: FacilityCategory[] = ["science", "industry", "storage", "agri", "health", "life", "habitat"];

export function EnergyPanel({ s, act }: PanelProps) {
  const k = kpis(s);
  const heat = 1 + Math.max(0, -s.weather.extTemp - 50) / 90;
  const byCat = new Map<FacilityCategory, number>();
  for (const f of s.facilities) {
    const def = FACILITIES[f.kind];
    if (!isRunning(f) || !f.powered || def.power <= 0) continue;
    byCat.set(def.category, (byCat.get(def.category) ?? 0) + def.power * (def.category === "habitat" ? heat : 1));
  }
  const base = (alive(s).length * s.config.consumption.power) / 24;
  const known = [...byCat.values()].reduce((a, b) => a + b, 0) + base;
  const charging = Math.max(0, s.power.demand - known);
  const order = [...PRIORITY_CATS].sort((a, b) => s.config.policies.powerPriority[a] - s.config.policies.powerPriority[b]);
  const move = (cat: FacilityCategory, dir: -1 | 1) =>
    act((st) => {
      const list = [...PRIORITY_CATS].sort((a, b) => st.config.policies.powerPriority[a] - st.config.policies.powerPriority[b]);
      const i = list.indexOf(cat);
      const j = i + dir;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      list.forEach((c, idx) => (st.config.policies.powerPriority[c] = idx + 1));
    });
  const gens = s.facilities.filter((f) => FACILITIES[f.kind].generation || FACILITIES[f.kind].battery);
  return (
    <div className={styles.grid3}>
      <Plate title="Generation" art={<FacilityArt kind="solar_array" />}>
        <div className={styles.statRow}>
          <Stat label="Solar now" value={`${fmt(s.power.solar, 1)} kW`} sub={s.weather.tau > 1 ? `Dust τ ${s.weather.tau.toFixed(1)}` : undefined} />
          <Stat label="Reactors and RTGs" value={`${fmt(s.power.steady, 1)} kW`} />
          <Stat label="Made per sol" value={`${fmt(k.energy.daily)} kWh`} />
        </div>
        <FacilityRows list={gens} act={act} />
      </Plate>
      <Plate title="Storage and balance" art={<FacilityArt kind="battery_bank" />}>
        <div className={styles.gauge}>
          <div className={styles.gaugeHead}>
            <span>Battery</span>
            <span className={styles.mono}>{pct(s.batteryCap ? s.battery / s.batteryCap : 0)}</span>
          </div>
          <div className={styles.gaugeValue}>
            {fmt(s.battery)} <small>of {fmt(s.batteryCap)} kWh</small>
          </div>
          <Meter value={s.batteryCap ? s.battery / s.batteryCap : 0} color="var(--energy)" warn={s.battery < s.batteryCap * 0.1} label="Battery charge" />
        </div>
        <div className={styles.statRow}>
          <Stat label="Demand now" value={`${fmt(s.power.demand, 1)} kW`} />
          <Stat label="Reserve at this demand" value={Number.isFinite(k.energy.hours) ? `${k.energy.hours.toFixed(1)} h` : "—"} tone={k.energy.hours < 6 ? "warn" : undefined} />
          <Stat label="Balance per sol" value={`${k.energy.balance >= 0 ? "+" : ""}${fmt(k.energy.balance)} kWh`} tone={k.energy.balance < 0 ? "bad" : undefined} />
        </div>
        {s.power.shed > 0 && <p className={styles.alertLine}>Short by {fmt(s.power.shed, 1)} kW. Lowest-priority loads are switched off.</p>}
        <h4 className={styles.subhead}>Demand by consumer, now</h4>
        <FlowTable
          unit="kW"
          rows={[
            { label: "Colonists and lighting", value: base },
            ...[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ label: CATEGORIES[c].label, value: v })),
            { label: "Vehicle charging", value: charging },
          ]}
        />
      </Plate>
      <Plate title="Load shedding order" aside="First cut at the top">
        <p className={styles.note}>When generation and batteries can't cover demand, MARSIS cuts power in this order. Habitats go last.</p>
        <ol className={styles.priority}>
          {order.map((c, i) => (
            <li key={c}>
              <span className={styles.priorityIdx}>{i + 1}</span>
              <span className={styles.priorityDot} style={{ background: CATEGORIES[c].color }} />
              <span>{CATEGORIES[c].label}</span>
              <span className={styles.priorityBtns}>
                <button type="button" className={sim.iconBtn} onClick={() => move(c, -1)} disabled={i === 0} aria-label={`Cut ${CATEGORIES[c].label} earlier`}>
                  <Ico name="up" size={14} />
                </button>
                <button type="button" className={sim.iconBtn} onClick={() => move(c, 1)} disabled={i === order.length - 1} aria-label={`Cut ${CATEGORIES[c].label} later`}>
                  <Ico name="down" size={14} />
                </button>
              </span>
            </li>
          ))}
        </ol>
      </Plate>
    </div>
  );
}

// ───────────────────────────── infrastructure

export function FacilitiesPanel({ s, act, onSelect }: PanelProps) {
  const [kind, setKind] = useState<FacilityKind>("greenhouse");
  const [sector, setSector] = useState(s.sectors[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const k = kpis(s);
  const staffAt = (id: string) => s.people.filter((p) => p.facilityId === id && p.status === "assigned").length;
  const th = s.config.policies.maintenanceThreshold;
  const { cost, hours } = buildCost(kind);
  return (
    <div className={styles.stack}>
      <div className={styles.statStrip}>
        <Stat label="Available" value={k.facilities.operational} tone="ok" />
        <Stat label="In repair" value={k.facilities.repair} tone={k.facilities.repair ? "warn" : undefined} />
        <Stat label="Disabled" value={k.facilities.disabled} tone={k.facilities.disabled ? "bad" : undefined} />
        <Stat label="Switched off" value={k.facilities.offline} />
        <Stat label="Housing used" value={pct(k.density)} sub={`${k.population} of ${k.housing} beds`} tone={k.density > 1 ? "bad" : undefined} />
      </div>
      {s.sectors.map((sec) => {
        const list = s.facilities.filter((f) => f.sectorId === sec.id);
        if (!list.length) return null;
        return (
          <Plate key={sec.id} title={`Sector ${sec.name}`} aside={`${list.length} facilities`}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Facility</th>
                    <th>Status</th>
                    <th>Output</th>
                    <th>Integrity</th>
                    <th>Crew</th>
                    <th>Hours run</th>
                    <th>Next service</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((f) => {
                    const def = FACILITIES[f.kind];
                    const wearPerSol = (def.wear / 100) * 24;
                    const solsToService = f.integrity > th ? (f.integrity - th) / wearPerSol : 0;
                    const building = f.repairReason === "Under construction";
                    return (
                      <tr key={f.id}>
                        <td>
                          <button type="button" className={styles.facCell} onClick={() => onSelect?.(f.id)}>
                            <Glyph kind={f.kind} />
                            <span>
                              <span className={styles.facName}>{f.name}</span>
                              <span className={styles.facKind}>{def.label}</span>
                            </span>
                          </button>
                        </td>
                        <td>
                          <StatusPill status={f.enabled ? f.status : "offline"} label={building ? "Building" : f.status === "repair" && f.repairReason ? f.repairReason : undefined} />
                        </td>
                        <td className={styles.mono}>{pct(f.efficiency)}</td>
                        <td>
                          <span className={styles.integrity}>
                            <Meter value={f.integrity / 100} color={f.integrity < th ? "var(--signal)" : "var(--ink-60)"} label="Integrity" />
                            <span className={styles.mono}>{Math.round(f.integrity)}%</span>
                          </span>
                        </td>
                        <td className={styles.mono}>{def.staff ? `${staffAt(f.id)}/${def.staff}` : "auto"}</td>
                        <td className={styles.mono}>{fmt(f.hours)}</td>
                        <td className={styles.mono}>
                          {building ? `done in ${Math.ceil(f.repairHoursLeft)} h` : f.repairHoursLeft > 0 ? `${Math.ceil(f.repairHoursLeft)} h left` : solsToService <= 0 ? "due now" : `~sol ${Math.floor(s.t / 24 + solsToService)}`}
                        </td>
                        <td className={styles.rowActions}>
                          <button type="button" className={sim.iconBtn} title="Service now" aria-label={`Service ${f.name}`} disabled={f.status !== "operational" || !f.enabled} onClick={() => act((st) => serviceFacility(st, f.id))}>
                            <Ico name="wrench" size={14} />
                          </button>
                          <button type="button" className={sim.iconBtn} title={f.enabled ? "Switch off" : "Switch on"} aria-label={`${f.enabled ? "Switch off" : "Switch on"} ${f.name}`} onClick={() => act((st) => toggleFacility(st, f.id))}>
                            <Ico name="power" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Plate>
        );
      })}
      <Plate title="Build a new facility" art={<FacilityArt kind={kind} />}>
        <div className={styles.buildRow}>
          <select className={sim.select} value={kind} onChange={(e) => setKind(e.target.value as FacilityKind)} aria-label="Facility type">
            {FACILITY_KINDS.map((fk) => (
              <option key={fk} value={fk}>
                {FACILITIES[fk].label}
              </option>
            ))}
          </select>
          <select className={sim.select} value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
            {s.sectors.map((sec) => (
              <option key={sec.id} value={sec.id}>
                {sec.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={sim.btnPrimary}
            disabled={!canAfford(s, cost)}
            onClick={() =>
              act((st) => {
                const err = buildFacility(st, kind, sector);
                setMsg(err ?? `Construction of ${FACILITIES[kind].label.toLowerCase()} started.`);
              })
            }
          >
            Start construction
          </button>
        </div>
        <ul className={styles.costList}>
          {Object.entries(cost).map(([rk, v]) => {
            const have = s.resources[rk as ResourceKey];
            return (
              <li key={rk} className={cx(have < (v ?? 0) && styles.bad)}>
                {RESOURCES[rk as ResourceKey].label} <b className={styles.mono}>{fmt(v ?? 0)}</b> <span>(have {fmt(have)})</span>
              </li>
            );
          })}
          <li>
            Build time <b className={styles.mono}>{hours} h</b>
          </li>
        </ul>
        {msg && <p className={styles.note}>{msg}</p>}
      </Plate>
    </div>
  );
}

// ───────────────────────────── inventory

export function InventoryPanel({ s }: PanelProps) {
  const pop = Math.max(10, alive(s).length);
  const solids: ResourceKey[] = ["food", "ice", "regolith", "metals", "silicon", "construction", "components", "medical", "waste"];
  const occ = solids.reduce((a, k) => a + s.resources[k], 0) / Math.max(1, solids.reduce((a, k) => a + s.capacity[k], 0));
  const warehouses = s.facilities.filter((f) => f.kind === "warehouse" || f.kind === "tank_farm");
  return (
    <div className={styles.stack}>
      <div className={styles.statStrip}>
        <Stat label="Warehouses and tank farms" value={warehouses.length} />
        <Stat label="Dry storage occupied" value={pct(occ)} />
        <Stat label="Parts made locally" value={fmt(s.stats.componentsLocal)} sub={`${fmt(s.stats.componentsImported)} imported`} />
        <Stat
          label="Below minimum"
          value={RESOURCE_KEYS.filter((k) => RESOURCES[k].minReserve > 0 && s.resources[k] < RESOURCES[k].minReserve * pop).length}
          sub="materials"
        />
      </div>
      <Plate title="Stock by material">
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Material</th>
                <th>In stock</th>
                <th>Fill</th>
                <th>Minimum</th>
                <th>In per sol</th>
                <th>Out per sol</th>
                <th>Trend</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {RESOURCE_KEYS.map((key) => {
                const def = RESOURCES[key];
                const f = sumFlows(s, key);
                const min = def.minReserve * pop;
                const stock = s.resources[key];
                const state = min > 0 && stock < min * 0.4 ? "bad" : min > 0 && stock < min ? "warn" : "ok";
                return (
                  <tr key={key}>
                    <td>
                      <span className={styles.matName}>
                        <span className={styles.matDot} style={{ background: def.color }} />
                        {def.label}
                      </span>
                    </td>
                    <td className={styles.mono}>
                      {fmt(stock)} {def.unit}
                    </td>
                    <td>
                      <span className={styles.integrity}>
                        <Meter value={stock / Math.max(1, s.capacity[key])} color={def.color} label={`${def.label} fill`} />
                        <span className={styles.mono}>{pct(stock / Math.max(1, s.capacity[key]))}</span>
                      </span>
                    </td>
                    <td className={styles.mono}>{min ? fmt(min) : "—"}</td>
                    <td className={styles.mono}>{fmt(f.prod, f.prod < 10 ? 1 : 0)}</td>
                    <td className={styles.mono}>{fmt(f.cons, f.cons < 10 ? 1 : 0)}</td>
                    <td>
                      <Trend net={f.prod - f.cons} />
                    </td>
                    <td>
                      <StatusPill status={state === "ok" ? "operational" : state === "warn" ? "repair" : "disabled"} label={state === "ok" ? "OK" : state === "warn" ? "Low" : "Critical"} />
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
