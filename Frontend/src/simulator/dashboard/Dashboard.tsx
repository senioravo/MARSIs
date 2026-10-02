import { useCallback, useEffect, useReducer, useState, type ReactNode } from "react";
import { linkTo } from "../../router";
import { CATEGORIES, FACILITIES, INCIDENTS, RESOURCES, ROLES, siteById } from "../engine/catalog";
import { formatDays, kpis, type Kpis } from "../engine/kpis";
import { daylight, tick } from "../engine/tick";
import { respondToIncident, serviceFacility, toggleFacility } from "../engine/actions";
import type { LogEntry, SimState } from "../engine/types";
import { saveRun, type StorageMode } from "../api";
import { FacilityArt } from "../art/FacilityArt";
import { Ico, IncidentIcon } from "../art/Icons";
import { RoleBadge } from "../art/CrewArt";
import { Meter, StatusPill, cx, fmt, pct } from "../ui";
import { Chrono, SPEEDS } from "./Chrono";
import { ColonyMap } from "./ColonyMap";
import { EnergyPanel, FacilitiesPanel, InventoryPanel, LifePanel, OverviewPanel, type Act, type PanelProps } from "./panelsA";
import { CommsPanel, CrewPanel, EmergenciesPanel, EnvironmentPanel, FleetPanel, HealthPanel, OrdersPanel, stamp } from "./panelsB";
import styles from "./Dashboard.module.css";
import sim from "../Sim.module.css";

const TABS: { id: string; label: string; Panel: (p: PanelProps) => ReactNode }[] = [
  { id: "overview", label: "Overview", Panel: OverviewPanel },
  { id: "life", label: "Life support", Panel: LifePanel },
  { id: "energy", label: "Energy", Panel: EnergyPanel },
  { id: "facilities", label: "Infrastructure", Panel: FacilitiesPanel },
  { id: "crew", label: "Personnel", Panel: CrewPanel },
  { id: "fleet", label: "Fleet", Panel: FleetPanel },
  { id: "health", label: "Health", Panel: HealthPanel },
  { id: "environment", label: "Environment", Panel: EnvironmentPanel },
  { id: "comms", label: "Comms", Panel: CommsPanel },
  { id: "inventory", label: "Inventory", Panel: InventoryPanel },
  { id: "emergencies", label: "Emergencies", Panel: EmergenciesPanel },
  { id: "orders", label: "Standing orders", Panel: OrdersPanel },
];

const MAX_TICKS_PER_FRAME = 24;

export function Dashboard({
  initial,
  storage,
  onExit,
  onRestart,
}: {
  initial: SimState;
  storage: StorageMode | null;
  onExit: (edit: boolean) => void;
  onRestart: () => void;
}) {
  // The engine mutates one state object in place; "version" re-renders the views.
  const [s] = useState(initial);
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [tab, setTab] = useState("overview");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [reportOpen, setReportOpen] = useState(!!initial.ended);
  const [frac] = useState(() => ({ current: 0 }));

  const act: Act = useCallback((fn) => {
    fn(s);
    bump();
  }, [s]);

  // ── the clock
  useEffect(() => {
    if (paused || s.ended) return;
    let raf = 0;
    let last = performance.now();
    let lastPaint = 0;
    const hps = SPEEDS[speed].hps;
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      frac.current += dt * hps;
      let n = Math.floor(frac.current);
      if (n > MAX_TICKS_PER_FRAME) {
        n = MAX_TICKS_PER_FRAME;
        frac.current = n; // drop backlog rather than spiral
      }
      for (let i = 0; i < n && !s.ended; i++) tick(s);
      frac.current -= n;
      if (s.ended) {
        setPaused(true);
        setReportOpen(true);
        bump();
        return;
      }
      if (now - lastPaint > (hps > 24 ? 110 : 60)) {
        lastPaint = now;
        bump();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [paused, speed, s, frac]);

  // ── keyboard: space pauses, +/− change speed
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (!s.ended) setPaused((p) => !p);
      } else if (e.key === "+" || e.key === "=" || e.key === "]") setSpeed((v) => Math.min(SPEEDS.length - 1, v + 1));
      else if (e.key === "-" || e.key === "_" || e.key === "[") setSpeed((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3400);
    return () => clearTimeout(t);
  }, [note]);

  const save = async () => {
    setSaving(true);
    try {
      const where = await saveRun(s);
      setNote(where === "database" ? `Saved at sol ${Math.floor(s.t / 24)} to the database.` : `Saved at sol ${Math.floor(s.t / 24)} in this browser.`);
    } catch (e) {
      setNote(`Could not save: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const k = kpis(s);
  const site = siteById(s.config.siteId);
  const day = daylight(s.t % 24);
  const Active = TABS.find((t) => t.id === tab)!.Panel;
  const sel = selected ? s.facilities.find((f) => f.id === selected) : null;

  return (
    <div className={styles.dash}>
      <header className={cx(sim.topbar, styles.dashTop)}>
        <a href="/" onClick={linkTo("/")} className={sim.brand}>
          <Ico name="back" size={16} />
          <span className={sim.brandMark} aria-hidden="true" />
          MARSIS
        </a>
        <div className={sim.topTitle}>
          <span className={sim.topKicker}>
            {site.label} · seed <span className={styles.mono}>{s.config.seed}</span>
          </span>
          <span className={sim.topName}>{s.config.name}</span>
        </div>
        <Chrono
          t={s.t + (paused ? 0 : frac.current)}
          duration={s.config.durationSols}
          paused={paused || !!s.ended}
          speed={speed}
          daylight={day}
          onToggle={() => !s.ended && setPaused((p) => !p)}
          onSpeed={(i) => {
            setSpeed(i);
            if (paused && !s.ended) setPaused(false);
          }}
        />
        <div className={sim.topActions}>
          <button type="button" className={sim.btnGhost} onClick={save} disabled={saving} title={storage === "database" ? "Save to the MARSIS database" : "Save in this browser"}>
            <Ico name="save" size={15} /> {saving ? "Saving…" : "Save run"}
          </button>
          <button type="button" className={sim.btnGhost} onClick={() => onExit(true)}>
            Edit colony
          </button>
        </div>
      </header>

      <KpiRail k={k} s={s} onTab={setTab} />

      <div className={styles.main}>
        <section className={styles.mapCol}>
          <ColonyMap s={s} selected={selected} onSelect={setSelected} />
        </section>
        <aside className={styles.sideCol}>
          {sel ? (
            <FacilityDetail s={s} id={sel.id} act={act} onClose={() => setSelected(null)} />
          ) : (
            <Attention s={s} act={act} onTab={setTab} />
          )}
          <EventLog log={s.log} />
        </aside>
      </div>

      <nav className={styles.tabs} aria-label="Colony domains">
        {TABS.map((t) => {
          const badge =
            t.id === "emergencies" ? k.openIncidents : t.id === "crew" ? k.staff.pending : t.id === "health" ? k.staff.medical : t.id === "facilities" ? k.facilities.disabled : 0;
          return (
            <button key={t.id} type="button" className={cx(styles.tab, tab === t.id && styles.tabOn)} onClick={() => setTab(t.id)} aria-current={tab === t.id ? "page" : undefined}>
              {t.label}
              {badge > 0 && <span className={styles.tabBadge}>{badge}</span>}
            </button>
          );
        })}
      </nav>
      <section className={styles.panel} key={tab}>
        <Active s={s} act={act} version={version} onSelect={(id) => setSelected(id)} />
      </section>

      {reportOpen && s.ended && (
        <Report
          s={s}
          k={k}
          onClose={() => setReportOpen(false)}
          onSave={save}
          onRestart={onRestart}
          onEdit={() => onExit(true)}
        />
      )}
      {note && (
        <div className={sim.toast} role="status">
          {note}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── KPI rail

function KpiRail({ k, s, onTab }: { k: Kpis; s: SimState; onTab: (t: string) => void }) {
  const items = [
    { id: "o2", tab: "life", label: "Oxygen", value: formatDays(k.oxygen.days), sub: `${fmt(k.oxygen.stock)} kg · ${k.oxygen.net >= 0 ? "+" : ""}${fmt(k.oxygen.net)}/sol`, color: "var(--life)", fill: k.oxygen.stock / k.oxygen.capacity, low: k.oxygen.days < 7 },
    { id: "w", tab: "life", label: "Water", value: formatDays(k.water.days), sub: `${fmt(k.water.stock)} L · ${k.water.net >= 0 ? "+" : ""}${fmt(k.water.net)}/sol`, color: "var(--energy)", fill: k.water.stock / k.water.capacity, low: k.water.days < 7 },
    { id: "f", tab: "life", label: "Food", value: formatDays(k.food.days), sub: `${fmt(k.food.stock)} kg · ${k.food.net >= 0 ? "+" : ""}${fmt(k.food.net)}/sol`, color: "var(--signal)", fill: k.food.stock / k.food.capacity, low: k.food.days < 7 },
    {
      id: "e",
      tab: "energy",
      label: "Power",
      value: `${fmt(s.power.gen)} / ${fmt(s.power.demand)} kW`,
      sub: `Battery ${pct(s.battery / Math.max(1, s.batteryCap))} · ${Number.isFinite(k.energy.hours) ? `${k.energy.hours.toFixed(0)} h reserve` : "—"}`,
      color: "var(--energy)",
      fill: s.battery / Math.max(1, s.batteryCap),
      low: s.power.shed > 0,
    },
    { id: "p", tab: "crew", label: "Population", value: `${k.population}`, sub: `${k.housing} beds · health ${Math.round(k.health)}`, color: "var(--white)", fill: k.density, low: k.density > 1 || k.health < 50 },
    { id: "s", tab: "inventory", label: "Self-sufficiency", value: pct(k.selfSufficiency.overall), sub: `Food ${pct(k.selfSufficiency.food)} · water ${pct(k.selfSufficiency.water)} · parts ${pct(k.selfSufficiency.materials)}`, color: "var(--mars)", fill: k.selfSufficiency.overall, low: false },
    { id: "i", tab: "emergencies", label: "Incidents", value: `${k.openIncidents} open`, sub: `${k.criticalIncidents} high or critical · ${s.stats.resolved} resolved`, color: "#ff5a4a", fill: Math.min(1, k.openIncidents / 10), low: k.criticalIncidents > 0 },
  ];
  return (
    <div className={styles.kpis}>
      <div className={styles.statusIndex} title="Colony status index: reserves, power, health, facilities and incidents combined">
        <svg viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--ink-12)" strokeWidth="4" />
          <circle
            cx="22"
            cy="22"
            r="18"
            fill="none"
            stroke={k.status > 75 ? "var(--life)" : k.status > 50 ? "var(--signal)" : "#ff5a4a"}
            strokeWidth="4"
            strokeDasharray={`${(k.status / 100) * 113} 113`}
            transform="rotate(-90 22 22)"
            strokeLinecap="round"
          />
        </svg>
        <span>
          <b className={styles.mono}>{Math.round(k.status)}</b>
          <small>Colony status</small>
        </span>
      </div>
      {items.map((it) => (
        <button key={it.id} type="button" className={cx(styles.kpi, it.low && styles.kpiLow)} onClick={() => onTab(it.tab)}>
          <span className={styles.kpiLabel}>
            <i style={{ background: it.color }} aria-hidden="true" />
            {it.label}
          </span>
          <span className={styles.kpiValue}>{it.value}</span>
          <span className={styles.kpiSub}>{it.sub}</span>
          <Meter value={it.fill} color={it.color} warn={it.low} label={`${it.label} level`} />
        </button>
      ))}
    </div>
  );
}

// ───────────────────────────── side column

function Attention({ s, act, onTab }: { s: SimState; act: Act; onTab: (t: string) => void }) {
  const open = s.incidents.filter((i) => i.status !== "resolved").sort((a, b) => b.severity - a.severity || a.openedAt - b.openedAt);
  return (
    <div className={styles.attention}>
      <div className={styles.sideHead}>
        <h3>Needs attention</h3>
        <button type="button" className={styles.linkBtn} onClick={() => onTab("emergencies")}>
          All incidents
        </button>
      </div>
      {open.length === 0 ? (
        <p className={styles.allClear}>
          <span className={styles.allClearDot} aria-hidden="true" />
          All systems nominal.
        </p>
      ) : (
        <ul className={styles.attList}>
          {open.slice(0, 6).map((i) => (
            <li key={i.id} style={{ ["--inc" as string]: INCIDENTS[i.kind].color }}>
              <span className={styles.attIcon}>
                <IncidentIcon kind={i.kind} size={18} />
              </span>
              <span className={styles.attBody}>
                <span className={styles.attTitle}>{i.title}</span>
                <span className={styles.attMeta}>
                  <span className={styles.sevTag} data-sev={i.severity}>
                    {["", "Low", "Moderate", "High", "Critical"][i.severity]}
                  </span>
                  <StatusPill status={i.status} />
                  {i.responsible && <span>{i.responsible}</span>}
                </span>
                <Meter value={1 - i.workLeft / i.workTotal} color={INCIDENTS[i.kind].color} label="Progress" />
              </span>
              {i.responders.length < i.crewNeeded && (
                <button type="button" className={sim.btnGhost} onClick={() => act((st) => respondToIncident(st, i.id))}>
                  Send crew
                </button>
              )}
            </li>
          ))}
          {open.length > 6 && <li className={styles.attMore}>+{open.length - 6} more in Emergencies</li>}
        </ul>
      )}
    </div>
  );
}

function FacilityDetail({ s, id, act, onClose }: { s: SimState; id: string; act: Act; onClose: () => void }) {
  const f = s.facilities.find((x) => x.id === id);
  if (!f) return null;
  const def = FACILITIES[f.kind];
  const crew = s.people.filter((p) => p.facilityId === f.id && p.status === "assigned");
  const inc = s.incidents.find((i) => i.facilityId === f.id && i.status !== "resolved");
  const sector = s.sectors.find((x) => x.id === f.sectorId);
  const out = Object.entries(f.output).filter(([, v]) => (v ?? 0) > 0.0005);
  return (
    <div className={styles.detail} style={{ ["--art-accent" as string]: CATEGORIES[def.category].color }}>
      <div className={styles.sideHead}>
        <h3>{f.name}</h3>
        <button type="button" className={sim.iconBtn} onClick={onClose} aria-label="Close details">
          <Ico name="close" size={14} />
        </button>
      </div>
      <FacilityArt kind={f.kind} className={styles.detailArt} />
      <p className={styles.detailKind}>
        {def.label} · Sector {sector?.name}
      </p>
      <div className={styles.detailGrid}>
        <span>Status</span>
        <StatusPill status={f.enabled ? f.status : "offline"} label={f.repairReason || undefined} />
        <span>Output</span>
        <span className={styles.mono}>{pct(f.efficiency)}</span>
        <span>Integrity</span>
        <span className={styles.integrity}>
          <Meter value={f.integrity / 100} color="var(--ink-60)" label="Integrity" />
          <span className={styles.mono}>{Math.round(f.integrity)}%</span>
        </span>
        <span>Power</span>
        <span className={styles.mono}>{def.generation ? `makes up to ${def.generation.kw} kW` : `${def.power} kW${f.powered ? "" : " — not supplied"}`}</span>
        {out.length > 0 && (
          <>
            <span>Producing</span>
            <span className={styles.mono}>{out.map(([k2, v]) => `${fmt((v ?? 0) * 24, 1)} ${RESOURCES[k2 as keyof typeof RESOURCES].unit} ${RESOURCES[k2 as keyof typeof RESOURCES].label.toLowerCase()}`).join(", ")} per sol</span>
          </>
        )}
        {def.housing ? (
          <>
            <span>Residents</span>
            <span className={styles.mono}>
              {f.residents} of {def.housing}
            </span>
          </>
        ) : null}
        {f.env && (
          <>
            <span>Inside</span>
            <span className={styles.mono}>
              {f.env.temp.toFixed(0)}°C · {f.env.pressure.toFixed(0)} kPa · CO₂ {fmt(f.env.co2)} ppm
            </span>
          </>
        )}
        <span>Hours run</span>
        <span className={styles.mono}>{fmt(f.hours)}</span>
      </div>
      {def.staff > 0 && (
        <>
          <h4 className={styles.subhead}>
            Crew on shift {crew.length}/{def.staff}
          </h4>
          <ul className={styles.people}>
            {crew.map((p) => (
              <li key={p.id}>
                <RoleBadge role={p.role} size={22} />
                <span>{p.name}</span>
                <span className={styles.small}>{ROLES[p.role].label}</span>
              </li>
            ))}
            {crew.length === 0 && <li className={styles.small}>Nobody assigned. Running on automation only.</li>}
          </ul>
        </>
      )}
      {inc && (
        <p className={styles.alertLine}>
          <IncidentIcon kind={inc.kind} size={15} /> {inc.title}
        </p>
      )}
      <div className={styles.btnRow}>
        <button type="button" className={sim.btnGhost} disabled={f.status !== "operational" || !f.enabled} onClick={() => act((st) => serviceFacility(st, f.id))}>
          <Ico name="wrench" size={14} /> Service now
        </button>
        <button type="button" className={sim.btnGhost} onClick={() => act((st) => toggleFacility(st, f.id))}>
          <Ico name="power" size={14} /> {f.enabled ? "Switch off" : "Switch on"}
        </button>
      </div>
    </div>
  );
}

function EventLog({ log }: { log: LogEntry[] }) {
  const recent = log.slice(-60).reverse();
  return (
    <div className={styles.log}>
      <div className={styles.sideHead}>
        <h3>Operations log</h3>
      </div>
      <ol className={styles.logList} aria-live="polite">
        {recent.map((l, i) => (
          <li key={`${l.t}-${i}-${l.text.length}`} className={styles[`log_${l.level}`]}>
            <span className={styles.logTime}>{stamp(l.t)}</span>
            <span className={styles.logIcon} aria-hidden="true">
              {l.kind && l.kind in INCIDENTS ? <IncidentIcon kind={l.kind as keyof typeof INCIDENTS} size={13} /> : <i />}
            </span>
            <span className={styles.logText}>{l.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ───────────────────────────── end of run

function Report({ s, k, onClose, onSave, onRestart, onEdit }: { s: SimState; k: Kpis; onClose: () => void; onSave: () => void; onRestart: () => void; onEdit: () => void }) {
  const won = s.ended === "complete";
  const st = s.stats;
  return (
    <div className={styles.reportBack} role="dialog" aria-modal="true" aria-labelledby="report-title">
      <div className={styles.report}>
        <span className={cx(styles.reportTag, won ? styles.reportWon : styles.reportLost)}>{won ? "Mission complete" : "Colony lost"}</span>
        <h2 id="report-title">{won ? `${s.config.name} made it to sol ${s.config.durationSols}.` : `${s.config.name} fell silent on sol ${Math.floor(s.t / 24)}.`}</h2>
        <p>
          {won
            ? `${k.population} of ${st.peakPopulation} colonists are alive, with a colony status of ${Math.round(k.status)}.`
            : "Nobody survived. Look at the overview charts to see which reserve ran out first."}
        </p>
        <dl className={styles.reportGrid}>
          <div><dt>Survivors</dt><dd>{k.population}</dd></div>
          <div><dt>Deaths</dt><dd>{st.deaths}</dd></div>
          <div><dt>New arrivals</dt><dd>{st.arrivals}</dd></div>
          <div><dt>Incidents</dt><dd>{st.incidents} ({st.resolved} resolved)</dd></div>
          <div><dt>Dust storms</dt><dd>{st.storms}</dd></div>
          <div><dt>Food harvested</dt><dd>{fmt(st.harvestKg)} kg</dd></div>
          <div><dt>Vehicle missions</dt><dd>{st.missions}</dd></div>
          <div><dt>Research upgrades</dt><dd>{st.upgrades}</dd></div>
          <div><dt>Self-sufficiency</dt><dd>{pct(k.selfSufficiency.overall)}</dd></div>
          <div><dt>Parts made locally</dt><dd>{fmt(st.componentsLocal)}</dd></div>
        </dl>
        <div className={styles.btnRow}>
          <button type="button" className={sim.btnPrimary} onClick={onSave}>
            Save run
          </button>
          <button type="button" className={sim.btnGhost} onClick={onRestart}>
            Replay from sol 0
          </button>
          <button type="button" className={sim.btnGhost} onClick={onEdit}>
            Edit colony
          </button>
          <button type="button" className={sim.btnGhost} onClick={onClose}>
            Look around
          </button>
        </div>
      </div>
    </div>
  );
}
