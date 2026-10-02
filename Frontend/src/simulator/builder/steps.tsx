import { useEffect, useMemo, useState } from "react";
import {
  CATEGORIES,
  COMMS,
  CROPS,
  CROP_KEYS,
  FACILITIES,
  RESOURCES,
  ROLES,
  ROLE_KEYS,
  SECTOR_KINDS,
  SITES,
  VEHICLES,
  VEHICLE_KINDS,
  siteById,
} from "../engine/catalog";
import { computeCapacity, housingOf, roleCounts } from "../engine/create";
import { personName, SECTOR_NAME_POOL } from "../engine/names";
import { PRESETS, makeComms, makeFacility, makeVehicle, newId, presetConfig, randomConfig, suggestSector } from "../engine/presets";
import { Rng, hashSeed, randomSeed } from "../engine/rng";
import type { ColonyConfig, CommsKind, FacilityKind, ResourceKey, SectorKind, VehicleKind } from "../engine/types";
import { CropArt, RoleBadge } from "../art/CrewArt";
import { FacilityArt } from "../art/FacilityArt";
import { CommsArt, VehicleArt } from "../art/FleetArt";
import { Ico } from "../art/Icons";
import { SiteArt } from "../art/SiteArt";
import { deleteColony, deleteRun, listColonies, listRuns, loadColony, loadRun, type ColonySummary, type RunSummary } from "../api";
import { Counter, Range, Segmented, Toggle, cx, fmt } from "../ui";
import type { StepProps } from "./Builder";
import styles from "./Builder.module.css";
import sim from "../Sim.module.css";

// ───────────────────────────── shared pieces

function SectorSelect({ value, onChange, config, label }: { value: string; onChange: (v: string) => void; config: ColonyConfig; label: string }) {
  return (
    <select className={sim.select} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      {config.sectors.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name} · {SECTOR_KINDS[s.kind].label}
        </option>
      ))}
    </select>
  );
}

function FacilityKindCard({ kind, config, update }: { kind: FacilityKind; config: ColonyConfig; update: StepProps["update"] }) {
  const def = FACILITIES[kind];
  const instances = config.facilities.filter((f) => f.kind === kind);
  const setCount = (n: number) =>
    update((d) => {
      const mine = d.facilities.filter((f) => f.kind === kind);
      if (n > mine.length) {
        const rng = new Rng(hashSeed(d.seed + kind + mine.length));
        for (let i = mine.length; i < n; i++) d.facilities.push(makeFacility(kind, suggestSector(kind, d.sectors), d.facilities, rng, kind === "greenhouse" ? CROP_KEYS[i % CROP_KEYS.length] : undefined));
      } else {
        const drop = new Set(mine.slice(n).map((f) => f.id));
        d.facilities = d.facilities.filter((f) => !drop.has(f.id));
      }
    });
  return (
    <article className={cx(styles.kindCard, instances.length > 0 && styles.kindCardOn)} style={{ ["--cat" as string]: CATEGORIES[def.category].color }}>
      <div className={styles.kindTop}>
        <FacilityArt kind={kind} className={styles.kindArt} />
        <div className={styles.kindText}>
          <h3>{def.label}</h3>
          <p>{def.blurb}</p>
          <ul className={styles.chips}>
            {def.stats.map((s) => (
              <li key={s}>{s}</li>
            ))}
            {def.staff > 0 && <li>{def.staff} crew · {def.roles.map((r) => ROLES[r].label.toLowerCase()).join(" or ")}</li>}
          </ul>
        </div>
        <Counter value={instances.length} onChange={setCount} max={kind.includes("habitat") || kind === "greenhouse" ? 30 : 16} label={def.label.toLowerCase()} />
      </div>
      {instances.length > 0 && (
        <ul className={styles.instances}>
          {instances.map((f) => (
            <li key={f.id}>
              <input
                className={sim.input}
                value={f.name}
                aria-label="Facility name"
                onChange={(e) => update((d) => void (d.facilities.find((x) => x.id === f.id)!.name = e.target.value))}
              />
              <SectorSelect value={f.sectorId} config={config} label={`Sector for ${f.name}`} onChange={(v) => update((d) => void (d.facilities.find((x) => x.id === f.id)!.sectorId = v))} />
              {kind === "greenhouse" && (
                <span className={styles.cropPick}>
                  <CropArt crop={f.crop ?? "potato"} size={34} />
                  <select
                    className={sim.select}
                    value={f.crop ?? "potato"}
                    aria-label={`Crop for ${f.name}`}
                    onChange={(e) => update((d) => void (d.facilities.find((x) => x.id === f.id)!.crop = e.target.value as never))}
                  >
                    {CROP_KEYS.map((c) => (
                      <option key={c} value={c}>
                        {CROPS[c].label} · {CROPS[c].yieldPerSol} kg/sol · {CROPS[c].cycleSols}-sol cycle
                      </option>
                    ))}
                  </select>
                </span>
              )}
              <button type="button" className={sim.iconBtn} aria-label={`Remove ${f.name}`} onClick={() => update((d) => void (d.facilities = d.facilities.filter((x) => x.id !== f.id)))}>
                <Ico name="trash" size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function FacilityGroup({ title, kinds, config, update, note }: { title: string; kinds: FacilityKind[]; config: ColonyConfig; update: StepProps["update"]; note?: string }) {
  return (
    <section className={styles.group}>
      <div className={styles.groupHead}>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      <div className={styles.kindList}>
        {kinds.map((k) => (
          <FacilityKindCard key={k} kind={k} config={config} update={update} />
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────── 1. site & mission

export function SiteStep({ config, update, replace }: StepProps) {
  const reseed = () => update((d) => void (d.seed = randomSeed()));
  return (
    <>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Start from a template</h2>
          <p>Each template fills every step. Change anything afterwards.</p>
        </div>
        <div className={styles.presets}>
          {Object.entries(PRESETS).map(([key, p]) => (
            <button key={key} type="button" className={styles.preset} onClick={() => replace({ ...presetConfig(key as keyof typeof PRESETS, config.seed), siteId: config.siteId })}>
              <span className={styles.presetName}>{p.label}</span>
              <span className={styles.presetBlurb}>{p.blurb}</span>
              <span className={styles.mono}>{p.recipe.population} colonists · {p.recipe.facilities.reduce((a, [, n]) => a + n, 0)} facilities</span>
            </button>
          ))}
          <button type="button" className={cx(styles.preset, styles.presetRandom)} onClick={() => replace(randomConfig())}>
            <span className={styles.presetName}>
              <Ico name="dice" size={18} /> Roll a random colony
            </span>
            <span className={styles.presetBlurb}>Site, size, crew mix, stock and event rates all rolled at once.</span>
            <span className={styles.mono}>New seed each roll</span>
          </button>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Landing site</h2>
          <p>The site sets how much ice you can mine, how much sun reaches the panels, how often storms come and how much radiation gets through.</p>
        </div>
        <div className={styles.sites}>
          {SITES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={cx(styles.site, config.siteId === s.id && styles.siteOn)}
              onClick={() => update((d) => void (d.siteId = s.id))}
              aria-pressed={config.siteId === s.id}
            >
              <SiteArt site={s} className={styles.siteArt} />
              <span className={styles.siteBody}>
                <span className={styles.siteName}>{s.label}</span>
                <span className={styles.siteRegion}>
                  {s.region} · <span className={styles.mono}>{s.coords}</span>
                </span>
                <span className={styles.siteBlurb}>{s.blurb}</span>
                <span className={styles.siteStats}>
                  <span>Ice <b>×{s.ice}</b></span>
                  <span>Sun <b>×{s.solar}</b></span>
                  <span>Storms <b>×{s.dust}</b></span>
                  <span>Radiation <b>{s.radiation}</b> mSv/sol</span>
                  <span>Mean <b>{s.baseTemp}°C</b></span>
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className={cx(styles.group, styles.formGrid)}>
        <label className={sim.field}>
          <span>Colony name</span>
          <input className={sim.input} value={config.name} onChange={(e) => update((d) => void (d.name = e.target.value))} maxLength={40} />
        </label>
        <label className={sim.field}>
          <span>Seed</span>
          <span className={styles.seedRow}>
            <input className={cx(sim.input, styles.mono)} value={config.seed} onChange={(e) => update((d) => void (d.seed = e.target.value))} maxLength={40} />
            <button type="button" className={sim.iconBtn} onClick={reseed} aria-label="Roll a new seed">
              <Ico name="dice" size={18} />
            </button>
          </span>
          <span className={sim.fieldHint}>The same seed replays the same storms, failures and arrivals.</span>
        </label>
        <div className={sim.field}>
          <span>Simulation length</span>
          <Segmented
            label="Simulation length"
            value={config.durationSols}
            onChange={(v) => update((d) => void (d.durationSols = v))}
            options={[30, 90, 180, 365, 668].map((v) => ({ value: v, label: v === 668 ? "1 Mars year" : `${v} sols` }))}
          />
        </div>
        <div className={sim.field}>
          <span>Difficulty</span>
          <Segmented
            label="Difficulty"
            value={config.difficulty}
            onChange={(v) => update((d) => void (d.difficulty = v))}
            options={[
              { value: "cadet", label: "Cadet" },
              { value: "standard", label: "Standard" },
              { value: "hardcore", label: "Hardcore" },
            ]}
          />
          <span className={sim.fieldHint}>
            {config.difficulty === "cadet"
              ? "Fewer breakdowns, extra starting stock."
              : config.difficulty === "hardcore"
                ? "60% more breakdowns, a quarter less stock, hungrier crew."
                : "Breakdowns and stock as specified."}
          </span>
        </div>
      </section>
    </>
  );
}

// ───────────────────────────── 2. crew

export function CrewStep({ config, update }: StepProps) {
  const counts = roleCounts(config.population, config.roleMix);
  const housing = housingOf(config.facilities);
  const roster = useMemo(() => {
    const rng = new Rng(hashSeed(config.seed + "|roster"));
    return Array.from({ length: Math.min(10, config.population) }, () => personName(rng));
  }, [config.seed, config.population]);
  return (
    <>
      <section className={cx(styles.group, styles.popRow)}>
        <Range
          label="Colonists at landing"
          value={config.population}
          min={4}
          max={240}
          onChange={(v) => update((d) => void (d.population = v))}
          format={(v) => `${v} people`}
          hint={housing < config.population ? `Habitats hold ${housing}. Add housing in step 3 or crew will be overcrowded.` : `Habitats hold ${housing}.`}
        />
        <div className={styles.roster}>
          <span className={styles.rosterHead}>First names on the manifest</span>
          <ul>
            {roster.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
            {config.population > roster.length && <li className={styles.mono}>+{config.population - roster.length} more</li>}
          </ul>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Crew mix</h2>
          <p>Weights, not head counts — the manifest is split in these proportions. Plants run best with the right specialist on shift.</p>
        </div>
        <div className={styles.roles}>
          {ROLE_KEYS.map((r) => (
            <div key={r} className={styles.role}>
              <RoleBadge role={r} size={52} />
              <div className={styles.roleText}>
                <span className={styles.roleName}>
                  {ROLES[r].plural} <span className={styles.mono}>{counts[r]}</span>
                </span>
                <span className={styles.roleBlurb}>{ROLES[r].blurb}</span>
              </div>
              <input
                type="range"
                className={styles.roleRange}
                min={0}
                max={10}
                step={0.5}
                value={config.roleMix[r]}
                aria-label={`${ROLES[r].label} weight`}
                style={{ ["--p" as string]: `${config.roleMix[r] * 10}%` }}
                onChange={(e) => update((d) => void (d.roleMix[r] = Number(e.target.value)))}
              />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Consumption per colonist, per sol</h2>
          <p>Population drives most of the colony's demand. NASA planning figures are the default.</p>
        </div>
        <div className={styles.formGrid}>
          <Range label="Oxygen" accent="var(--life)" value={config.consumption.oxygen} min={0.5} max={1.4} step={0.02} format={(v) => `${v.toFixed(2)} kg`} onChange={(v) => update((d) => void (d.consumption.oxygen = v))} />
          <Range label="Water" accent="var(--energy)" value={config.consumption.water} min={8} max={60} step={1} format={(v) => `${v} L`} onChange={(v) => update((d) => void (d.consumption.water = v))} />
          <Range label="Food" accent="var(--signal)" value={config.consumption.food} min={1} max={2.8} step={0.05} format={(v) => `${v.toFixed(2)} kg`} onChange={(v) => update((d) => void (d.consumption.food = v))} />
          <Range label="Electricity" accent="var(--energy)" value={config.consumption.power} min={2} max={14} step={0.5} format={(v) => `${v} kWh`} onChange={(v) => update((d) => void (d.consumption.power = v))} />
        </div>
      </section>
    </>
  );
}

// ───────────────────────────── 3. sectors & habitats

export function SectorsStep({ config, update }: StepProps) {
  const addSector = () =>
    update((d) => {
      const used = new Set(d.sectors.map((s) => s.name));
      const name = SECTOR_NAME_POOL.find((n) => !used.has(n)) ?? `Sector ${d.sectors.length + 1}`;
      d.sectors.push({ id: newId("s"), name, kind: "mixed" });
    });
  const removeSector = (id: string) =>
    update((d) => {
      d.sectors = d.sectors.filter((s) => s.id !== id);
      for (const f of d.facilities) if (f.sectorId === id) f.sectorId = suggestSector(f.kind, d.sectors);
      for (const c of d.comms) if (c.sectorId === id) c.sectorId = d.sectors[0]?.id;
    });
  return (
    <>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Sectors</h2>
          <p>Sectors are the districts on the colony map. New facilities go to the sector whose purpose fits them best.</p>
        </div>
        <ul className={styles.sectors}>
          {config.sectors.map((s, i) => {
            const n = config.facilities.filter((f) => f.sectorId === s.id).length;
            return (
              <li key={s.id} className={styles.sector}>
                <span className={styles.sectorIndex}>{String.fromCharCode(65 + i)}</span>
                <input className={sim.input} value={s.name} aria-label="Sector name" onChange={(e) => update((d) => void (d.sectors[i].name = e.target.value))} />
                <select className={sim.select} value={s.kind} aria-label={`Purpose of ${s.name}`} onChange={(e) => update((d) => void (d.sectors[i].kind = e.target.value as SectorKind))}>
                  {Object.entries(SECTOR_KINDS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <span className={styles.sectorCount}>{n} facilities</span>
                <button type="button" className={sim.iconBtn} disabled={config.sectors.length <= 1} aria-label={`Remove sector ${s.name}`} onClick={() => removeSector(s.id)}>
                  <Ico name="trash" size={15} />
                </button>
              </li>
            );
          })}
        </ul>
        <button type="button" className={sim.btnGhost} onClick={addSector} disabled={config.sectors.length >= 8}>
          <Ico name="plus" size={15} /> Add sector
        </button>
      </section>
      <FacilityGroup title="Habitats" kinds={["habitat_dome", "lava_tube", "inflatable_module"]} config={config} update={update} note="Where people sleep. Shielding decides how much radiation reaches them during a solar storm." />
    </>
  );
}

// ───────────────────────────── 4–6. facilities

export const LifeStep = ({ config, update }: StepProps) => (
  <>
    <FacilityGroup title="Oxygen" kinds={["o2_electrolysis", "moxie_array"]} config={config} update={update} note={`Each colonist breathes ${config.consumption.oxygen} kg a sol.`} />
    <FacilityGroup title="Water" kinds={["ice_extractor", "water_recycler"]} config={config} update={update} note={`Ice yield at ${siteById(config.siteId).label} is ×${siteById(config.siteId).ice}.`} />
    <FacilityGroup title="Food" kinds={["greenhouse", "algae_bioreactor"]} config={config} update={update} note="Greenhouses harvest at the end of each crop cycle. Mix fast and slow crops to smooth supply." />
  </>
);

export const PowerStep = ({ config, update }: StepProps) => (
  <>
    <FacilityGroup title="Generation" kinds={["solar_array", "fission_reactor", "rtg"]} config={config} update={update} note={`Sun at this site is ×${siteById(config.siteId).solar}. Dust storms can cut solar output by 80%.`} />
    <FacilityGroup title="Storage" kinds={["battery_bank"]} config={config} update={update} />
    <section className={styles.group}>
      <Range label="Battery charge at landing" value={config.batteryCharge} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update((d) => void (d.batteryCharge = v))} />
    </section>
  </>
);

export const IndustryStep = ({ config, update }: StepProps) => (
  <>
    <FacilityGroup title="Industry" kinds={["regolith_processor", "fabricator", "recycling_center", "sabatier_plant"]} config={config} update={update} note="Local industry turns regolith and waste into the materials repairs depend on." />
    <FacilityGroup title="Storage" kinds={["warehouse", "tank_farm"]} config={config} update={update} />
    <FacilityGroup title="Health and science" kinds={["medical_bay", "research_lab"]} config={config} update={update} />
  </>
);

// ───────────────────────────── 7. fleet & comms

export function FleetStep({ config, update }: StepProps) {
  const setVehicles = (kind: VehicleKind, n: number) =>
    update((d) => {
      const mine = d.vehicles.filter((v) => v.kind === kind);
      const rng = new Rng(hashSeed(d.seed + kind + mine.length));
      if (n > mine.length) for (let i = mine.length; i < n; i++) d.vehicles.push(makeVehicle(kind, rng));
      else {
        const drop = new Set(mine.slice(n).map((v) => v.id));
        d.vehicles = d.vehicles.filter((v) => !drop.has(v.id));
      }
    });
  const setComms = (kind: CommsKind, n: number) =>
    update((d) => {
      const mine = d.comms.filter((c) => c.kind === kind);
      if (n > mine.length) for (let i = mine.length; i < n; i++) d.comms.push(makeComms(kind, i, kind === "antenna" ? d.sectors[i % d.sectors.length]?.id : undefined));
      else {
        const drop = new Set(mine.slice(n).map((c) => c.id));
        d.comms = d.comms.filter((c) => !drop.has(c.id));
      }
    });
  return (
    <>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Vehicles</h2>
          <p>Vehicles haul regolith and ice, map the terrain and rescue stranded crews. Each crewed trip takes people off other work.</p>
        </div>
        <div className={styles.kindList}>
          {VEHICLE_KINDS.map((k) => {
            const def = VEHICLES[k];
            const mine = config.vehicles.filter((v) => v.kind === k);
            return (
              <article key={k} className={cx(styles.kindCard, mine.length > 0 && styles.kindCardOn)} style={{ ["--cat" as string]: "var(--signal)" }}>
                <div className={styles.kindTop}>
                  <VehicleArt kind={k} className={styles.kindArt} />
                  <div className={styles.kindText}>
                    <h3>{def.label}</h3>
                    <p>{def.blurb}</p>
                    <ul className={styles.chips}>
                      {def.stats.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                      <li>{def.speed} km/h</li>
                    </ul>
                  </div>
                  <Counter value={mine.length} onChange={(n) => setVehicles(k, n)} max={8} label={def.label.toLowerCase()} />
                </div>
                {mine.length > 0 && (
                  <ul className={styles.instances}>
                    {mine.map((v) => (
                      <li key={v.id}>
                        <input className={sim.input} value={v.name} aria-label="Vehicle name" onChange={(e) => update((d) => void (d.vehicles.find((x) => x.id === v.id)!.name = e.target.value))} />
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Communications</h2>
          <p>With every link down, resupply landers can't find the pad and repairs run slower.</p>
        </div>
        <div className={styles.kindList}>
          {(["antenna", "satellite"] as CommsKind[]).map((k) => {
            const mine = config.comms.filter((c) => c.kind === k);
            return (
              <article key={k} className={cx(styles.kindCard, mine.length > 0 && styles.kindCardOn)} style={{ ["--cat" as string]: "#c9a7ff" }}>
                <div className={styles.kindTop}>
                  <CommsArt kind={k} className={styles.kindArt} />
                  <div className={styles.kindText}>
                    <h3>{COMMS[k].label}</h3>
                    <p>{COMMS[k].blurb}</p>
                  </div>
                  <Counter value={mine.length} onChange={(n) => setComms(k, n)} max={6} label={COMMS[k].label.toLowerCase()} />
                </div>
                {mine.length > 0 && (
                  <ul className={styles.instances}>
                    {mine.map((c) => (
                      <li key={c.id}>
                        <input className={sim.input} value={c.name} aria-label="Asset name" onChange={(e) => update((d) => void (d.comms.find((x) => x.id === c.id)!.name = e.target.value))} />
                        {k === "antenna" && (
                          <SectorSelect value={c.sectorId ?? config.sectors[0]?.id} config={config} label={`Sector for ${c.name}`} onChange={(v) => update((d) => void (d.comms.find((x) => x.id === c.id)!.sectorId = v))} />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ───────────────────────────── 8. supplies, risks, policies

const STOCK_KEYS: ResourceKey[] = ["oxygen", "water", "food", "ice", "regolith", "metals", "silicon", "construction", "fuel", "components", "medical"];

export function SuppliesStep({ config, update }: StepProps) {
  const { cap } = computeCapacity(config.facilities);
  const pop = config.population;
  const perSol: Partial<Record<ResourceKey, number>> = { oxygen: pop * config.consumption.oxygen, water: pop * config.consumption.water, food: pop * config.consumption.food };
  return (
    <>
      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Cargo at landing</h2>
          <p>Limited by storage you built. Add warehouses and tank farms in step 6 to carry more.</p>
        </div>
        <div className={styles.stockGrid}>
          {STOCK_KEYS.map((k) => {
            const v = Math.min(config.stock[k] ?? 0, cap[k]);
            const days = perSol[k] ? v / (perSol[k] ?? 1) : null;
            return (
              <Range
                key={k}
                accent={RESOURCES[k].color}
                label={RESOURCES[k].label}
                value={v}
                min={0}
                max={cap[k]}
                step={Math.max(1, Math.round(cap[k] / 200))}
                format={(x) => `${fmt(x)} ${RESOURCES[k].unit}`}
                hint={days !== null ? `${days.toFixed(1)} sols of use · capacity ${fmt(cap[k])}` : `Capacity ${fmt(cap[k])} ${RESOURCES[k].unit}`}
                onChange={(x) => update((d) => void (d.stock[k] = x))}
              />
            );
          })}
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Random events</h2>
          <p>How often Mars interferes. 1× is the site's natural rate; 0 switches the event off.</p>
        </div>
        <div className={styles.formGrid}>
          <Range label="Dust storms" value={config.events.dustStorms} min={0} max={2.5} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update((d) => void (d.events.dustStorms = v))} hint="Cut solar output, wear outdoor equipment, ground vehicles." />
          <Range label="Solar particle events" value={config.events.solarFlares} min={0} max={2.5} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update((d) => void (d.events.solarFlares = v))} hint="Radiation spikes. Shielded habitats protect their residents." />
          <Range label="Micrometeorites" value={config.events.meteorites} min={0} max={2.5} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update((d) => void (d.events.meteorites = v))} hint="Punctures, structural damage and leaks." />
          <Range label="Equipment failures" value={config.events.failures} min={0} max={2.5} step={0.1} format={(v) => `${v.toFixed(1)}×`} onChange={(v) => update((d) => void (d.events.failures = v))} hint="Fires, faults and leaks. Worn equipment fails more often." />
        </div>
        <div className={styles.formGrid}>
          <Toggle checked={config.events.resupply} onChange={(v) => update((d) => void (d.events.resupply = v))} label="Cargo landers from Earth" hint="Parts, medicine, food and new colonists. Routing is handled outside MARSIS." />
          {config.events.resupply && (
            <Range label="Lander every" value={config.events.resupplyEverySols} min={20} max={200} step={5} format={(v) => `${v} sols`} onChange={(v) => update((d) => void (d.events.resupplyEverySols = v))} />
          )}
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Standing orders</h2>
          <p>What the colony does on its own. You can change these during the run.</p>
        </div>
        <div className={styles.formGrid}>
          <Toggle checked={config.policies.autoMaintenance} onChange={(v) => update((d) => void (d.policies.autoMaintenance = v))} label="Service worn equipment" hint="Uses spare components." />
          {config.policies.autoMaintenance && (
            <Range label="Service below integrity" value={config.policies.maintenanceThreshold} min={20} max={90} step={5} format={(v) => `${v}%`} onChange={(v) => update((d) => void (d.policies.maintenanceThreshold = v))} />
          )}
          <Toggle checked={config.policies.autoResponse} onChange={(v) => update((d) => void (d.policies.autoResponse = v))} label="Send crews to incidents" hint="Pulls the best-matched people off their posts." />
          <Toggle checked={config.policies.autoDispatch} onChange={(v) => update((d) => void (d.policies.autoDispatch = v))} label="Run supply trips" hint="Vehicles fetch regolith and ice when stock runs low." />
          <Range label="Food ration" value={config.policies.foodRation} min={0.6} max={1.1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update((d) => void (d.policies.foodRation = v))} />
          <Range label="Water ration" value={config.policies.waterRation} min={0.6} max={1.1} step={0.05} format={(v) => `${Math.round(v * 100)}%`} onChange={(v) => update((d) => void (d.policies.waterRation = v))} />
        </div>
      </section>
    </>
  );
}

// ───────────────────────────── 9. review & saved work

export function ReviewStep({ config, storage, onResume, onLoadDesign }: StepProps) {
  const [designs, setDesigns] = useState<ColonySummary[] | null>(null);
  const [runs, setRuns] = useState<RunSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => {
    listColonies().then(setDesigns).catch((e) => setError(e.message));
    listRuns().then(setRuns).catch((e) => setError(e.message));
  };
  useEffect(refresh, [storage]);
  const site = siteById(config.siteId);
  const byCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of config.facilities) m.set(FACILITIES[f.kind].category, (m.get(FACILITIES[f.kind].category) ?? 0) + 1);
    return m;
  }, [config.facilities]);

  return (
    <>
      <section className={styles.review}>
        <SiteArt site={site} seed={config.seed} className={styles.reviewArt} />
        <div className={styles.reviewText}>
          <h2>{config.name}</h2>
          <p>
            {config.population} colonists landing at {site.label} for {config.durationSols} sols on {config.difficulty} difficulty. Seed <span className={styles.mono}>{config.seed}</span>.
          </p>
          <dl className={styles.reviewList}>
            <div>
              <dt>Sectors</dt>
              <dd>{config.sectors.map((s) => s.name).join(", ")}</dd>
            </div>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <div key={k}>
                <dt>{c.label}</dt>
                <dd>{byCat.get(k) ?? 0} facilities</dd>
              </div>
            ))}
            <div>
              <dt>Fleet</dt>
              <dd>{config.vehicles.length} vehicles</dd>
            </div>
            <div>
              <dt>Comms</dt>
              <dd>{config.comms.length} assets</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Saved colony designs</h2>
          <p>{storage === "database" ? "Stored in the MARSIS database." : "Stored in this browser until a database is connected."}</p>
        </div>
        {error && <p className={sim.error}>{error}</p>}
        {designs === null ? (
          <p className={sim.muted}>Loading…</p>
        ) : designs.length === 0 ? (
          <p className={sim.muted}>Nothing saved yet. Use “Save design” at the top to keep this colony.</p>
        ) : (
          <ul className={styles.savedList}>
            {designs.map((d) => (
              <li key={d.id}>
                <span className={styles.savedName}>{d.name}</span>
                <span className={styles.savedMeta}>
                  {siteById(d.siteId).label} · {d.population} colonists · {new Date(d.updatedAt).toLocaleDateString()}
                </span>
                <button type="button" className={sim.btnGhost} onClick={() => loadColony(d.id).then((c) => onLoadDesign(c, d.id)).catch((e) => setError(e.message))}>
                  Load
                </button>
                <button type="button" className={sim.iconBtn} aria-label={`Delete ${d.name}`} onClick={() => deleteColony(d.id).then(refresh)}>
                  <Ico name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.group}>
        <div className={styles.groupHead}>
          <h2>Saved simulations</h2>
          <p>Pick up a run exactly where you saved it.</p>
        </div>
        {runs === null ? (
          <p className={sim.muted}>Loading…</p>
        ) : runs.length === 0 ? (
          <p className={sim.muted}>No saved runs. Save from the simulation's top bar.</p>
        ) : (
          <ul className={styles.savedList}>
            {runs.map((r) => (
              <li key={r.id}>
                <span className={styles.savedName}>{r.colonyName}</span>
                <span className={styles.savedMeta}>
                  Sol {r.sol} of {r.durationSols} · {r.population} alive · {r.status === "running" ? "In progress" : r.status === "complete" ? "Completed" : "Lost"}
                </span>
                <button type="button" className={sim.btnGhost} onClick={() => loadRun(r.id).then(onResume).catch((e) => setError(e.message))}>
                  Resume
                </button>
                <button type="button" className={sim.iconBtn} aria-label={`Delete run of ${r.colonyName}`} onClick={() => deleteRun(r.id).then(refresh)}>
                  <Ico name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

