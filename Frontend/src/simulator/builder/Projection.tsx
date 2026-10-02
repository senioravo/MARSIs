import { useMemo } from "react";
import { FACILITIES, VEHICLES, siteById } from "../engine/catalog";
import { createState, housingOf } from "../engine/create";
import { kpis, type Kpis } from "../engine/kpis";
import { tick } from "../engine/tick";
import type { ColonyConfig } from "../engine/types";
import { cx, fmt } from "../ui";
import { SiteArt } from "../art/SiteArt";
import styles from "./Builder.module.css";

interface Check {
  tone: "ok" | "warn" | "bad";
  text: string;
}

/** Dry-run three calm sols (no random events) and read the balance sheet. */
function project(config: ColonyConfig): { k: Kpis; checks: Check[]; staffSlots: number } {
  const c = structuredClone(config);
  c.events = { ...c.events, dustStorms: 0, solarFlares: 0, meteorites: 0, failures: 0, resupply: false };
  c.policies = { ...c.policies, autoDispatch: false };
  const s = createState(c);
  for (let i = 0; i < 72; i++) tick(s);
  const k = kpis(s);
  const checks: Check[] = [];
  const housing = housingOf(c.facilities);
  const staffSlots = c.facilities.reduce((a, f) => a + FACILITIES[f.kind].staff, 0);

  if (housing < c.population) checks.push({ tone: "bad", text: `Housing for ${housing}, crew of ${c.population}. Residents will be overcrowded.` });
  else checks.push({ tone: "ok", text: `Housing for ${housing} (${c.population} aboard).` });

  const cover = (prod: number, cons: number) => (cons > 0 ? prod / cons : 1);
  for (const [key, label] of [
    ["oxygen", "Oxygen"],
    ["water", "Water"],
    ["food", "Food"],
  ] as const) {
    const b = k[key];
    const r = cover(b.prod, b.cons);
    if (r >= 1) checks.push({ tone: "ok", text: `${label} production covers use (${Math.round(r * 100)}%).` });
    else
      checks.push({
        tone: r < 0.7 ? "bad" : "warn",
        text: `${label} production covers ${Math.round(r * 100)}% of use. Stock lasts about ${Math.round(b.days)} sols.`,
      });
  }
  if (k.energy.balance < 0) checks.push({ tone: k.energy.balance < -k.energy.daily * 0.15 ? "bad" : "warn", text: `Power falls short by ${fmt(-k.energy.balance)} kWh per sol.` });
  else checks.push({ tone: "ok", text: `Power surplus of ${fmt(k.energy.balance)} kWh per sol.` });
  if (s.power.shed > 0 || s.battery < s.batteryCap * 0.05) checks.push({ tone: "warn", text: "Batteries run dry at night — loads get shed." });
  if (staffSlots > c.population) checks.push({ tone: "warn", text: `${staffSlots} positions to staff with ${c.population} people. Some plants will run short-handed.` });
  if (!c.facilities.some((f) => f.kind === "medical_bay")) checks.push({ tone: "bad", text: "No medical bay. Injuries will not heal." });
  if (!c.comms.length) checks.push({ tone: "bad", text: "No comms. Resupply landers cannot find you." });
  if (!c.facilities.some((f) => f.kind === "fabricator")) checks.push({ tone: "warn", text: "No fabrication plant. Spare parts only arrive by resupply." });
  if (!c.facilities.some((f) => f.kind === "water_recycler")) checks.push({ tone: "warn", text: "No water recycler. Every litre used is lost." });
  if (c.facilities.some((f) => f.kind === "regolith_processor") && !c.vehicles.some((v) => VEHICLES[v.kind].missions.includes("regolith")))
    checks.push({ tone: "warn", text: "The regolith processor has no crawler or hauler to feed it." });
  return { k, checks, staffSlots };
}

export function Projection({ config, stale }: { config: ColonyConfig; stale: boolean }) {
  const { k, checks } = useMemo(() => project(config), [config]);
  const site = siteById(config.siteId);
  const rows = [
    { key: "oxygen" as const, label: "Oxygen", unit: "kg", color: "var(--life)" },
    { key: "water" as const, label: "Water", unit: "L", color: "var(--energy)" },
    { key: "food" as const, label: "Food", unit: "kg", color: "var(--signal)" },
  ];
  return (
    <div className={cx(styles.projection, stale && styles.stale)}>
      <div className={styles.projSite}>
        <SiteArt site={site} seed={config.seed} className={styles.projSiteArt} />
        <div className={styles.projSiteText}>
          <span>{site.label}</span>
          <span className={styles.mono}>{site.coords}</span>
        </div>
      </div>
      <h2 className={styles.projTitle}>Projected balance per sol</h2>
      <p className={styles.projNote}>A three-sol dry run of this design, with random events off.</p>
      <div className={styles.projRows}>
        {rows.map((r) => {
          const b = k[r.key];
          const max = Math.max(b.prod, b.cons, 1);
          return (
            <div key={r.key} className={styles.projRow}>
              <div className={styles.projRowHead}>
                <span>{r.label}</span>
                <span className={styles.mono}>
                  {b.net >= 0 ? "+" : "−"}
                  {fmt(Math.abs(b.net))} {r.unit}
                </span>
              </div>
              <div className={styles.projBars}>
                <span className={styles.projBarLabel}>Made</span>
                <span className={styles.projBar}>
                  <span style={{ width: `${(b.prod / max) * 100}%`, background: r.color }} />
                </span>
                <span className={styles.projBarVal}>{fmt(b.prod)}</span>
                <span className={styles.projBarLabel}>Used</span>
                <span className={styles.projBar}>
                  <span style={{ width: `${(b.cons / max) * 100}%`, background: "var(--ink-40)" }} />
                </span>
                <span className={styles.projBarVal}>{fmt(b.cons)}</span>
              </div>
            </div>
          );
        })}
        <div className={styles.projRow}>
          <div className={styles.projRowHead}>
            <span>Energy</span>
            <span className={styles.mono}>
              {k.energy.balance >= 0 ? "+" : "−"}
              {fmt(Math.abs(k.energy.balance))} kWh
            </span>
          </div>
          <div className={styles.projBars}>
            <span className={styles.projBarLabel}>Made</span>
            <span className={styles.projBar}>
              <span style={{ width: `${Math.min(100, (k.energy.daily / Math.max(k.energy.daily, k.energy.daily - k.energy.balance, 1)) * 100)}%`, background: "var(--energy)" }} />
            </span>
            <span className={styles.projBarVal}>{fmt(k.energy.daily)}</span>
            <span className={styles.projBarLabel}>Used</span>
            <span className={styles.projBar}>
              <span style={{ width: `${Math.min(100, ((k.energy.daily - k.energy.balance) / Math.max(k.energy.daily, k.energy.daily - k.energy.balance, 1)) * 100)}%`, background: "var(--ink-40)" }} />
            </span>
            <span className={styles.projBarVal}>{fmt(k.energy.daily - k.energy.balance)}</span>
          </div>
        </div>
      </div>
      <ul className={styles.checks}>
        {checks.map((c, i) => (
          <li key={i} className={styles[`check_${c.tone}`]}>
            <span className={styles.checkMark} aria-hidden="true">
              {c.tone === "ok" ? "✓" : c.tone === "warn" ? "!" : "×"}
            </span>
            {c.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
