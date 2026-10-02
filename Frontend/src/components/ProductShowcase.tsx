import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./ProductShowcase.module.css";

const tabs = [
  "Resource Monitoring",
  "Operational Events",
  "Predictive Analytics",
  "Maintenance",
  "Colony Status",
  "Infrastructure",
  "Decision Support",
] as const;

type Tab = (typeof tabs)[number];

const resourceBars: { label: string; value: number; color: string }[] = [
  { label: "OXYGEN", value: 82, color: "var(--life)" },
  { label: "WATER", value: 64, color: "var(--energy)" },
  { label: "ENERGY", value: 71, color: "var(--energy)" },
  { label: "FOOD", value: 58, color: "var(--signal)" },
  { label: "FUEL", value: 45, color: "var(--signal)" },
];

const events = [
  { time: "T+00:04:12", system: "REACTOR B", detail: "Output deviation detected", tone: "signal" },
  { time: "T+00:14:22", system: "GREENHOUSE 02", detail: "Temperature above normal", tone: "signal" },
  { time: "T+01:02:47", system: "HABITAT 03", detail: "Airflow restored to normal", tone: "life" },
  { time: "T+02:18:03", system: "AIRLOCK 2", detail: "Routine cycle completed", tone: "life" },
];

const maintenance = [
  { item: "Reactor B — Coolant Loop", status: "IN PROGRESS", tone: "signal" },
  { item: "Water Recycler 02", status: "SCHEDULED", tone: "energy" },
  { item: "Airlock 3 Seal", status: "COMPLETE", tone: "life" },
  { item: "Solar Array — Sector 4", status: "SCHEDULED", tone: "energy" },
];

const subsystems = ["Life Support", "Power Distribution", "Water Reclamation", "Structural Integrity"];

const infraNodes = [
  { id: "H01", x: 90, y: 60, tone: "life" },
  { id: "H02", x: 220, y: 40, tone: "life" },
  { id: "H03", x: 330, y: 100, tone: "signal" },
  { id: "GH2", x: 200, y: 150, tone: "life" },
  { id: "RB", x: 60, y: 150, tone: "signal" },
];

const infraLinks = [
  [0, 1],
  [1, 2],
  [0, 3],
  [1, 3],
  [0, 4],
];

export function ProductShowcase() {
  const [active, setActive] = useState<Tab>(tabs[0]);

  return (
    <section id="product" className="section">
      <div className="section-inner">
        <div className={styles.header}>
          <h2 className="heading-lg">The software behind the decision.</h2>
          <p className={`body-lg ${styles.body}`}>
            Seven modules, one platform. Each view draws from the same live colony state — nothing
            is exported, duplicated or out of sync.
          </p>
        </div>

        <div className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${t === active ? styles.tabActive : ""}`}
              onClick={() => setActive(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className={styles.frame}>
          <div className={styles.frameBar}>
            <span>MARSIS / {active.toUpperCase()}</span>
          </div>
          <div className={styles.frameBody}>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {active === "Resource Monitoring" && (
                  <div className={styles.bars}>
                    {resourceBars.map((r) => (
                      <div className={styles.barRow} key={r.label}>
                        <span className={styles.barLabel}>{r.label}</span>
                        <div className={styles.barTrack}>
                          <motion.div
                            className={styles.barFill}
                            style={{ background: r.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${r.value}%` }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                        </div>
                        <span className={styles.barValue}>{r.value}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {active === "Operational Events" && (
                  <ul className={styles.list}>
                    {events.map((e) => (
                      <li className={styles.listRow} key={e.time}>
                        <span className={styles.mono}>{e.time}</span>
                        <span className={`${styles.dot} ${styles[e.tone]}`} />
                        <span className={styles.listSystem}>{e.system}</span>
                        <span className={styles.listDetail}>{e.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {active === "Predictive Analytics" && (
                  <div className={styles.chartWrap}>
                    <svg viewBox="0 0 400 140" className={styles.chart}>
                      <line x1="0" y1="110" x2="400" y2="110" stroke="var(--ink-12)" />
                      <path
                        d="M0,70 L60,64 L120,58 L180,52 L230,48"
                        fill="none"
                        stroke="var(--life)"
                        strokeWidth="2"
                      />
                      <path
                        d="M230,48 L290,66 L340,92 L400,118"
                        fill="none"
                        stroke="var(--signal)"
                        strokeWidth="2"
                        strokeDasharray="4 5"
                      />
                      <circle cx="230" cy="48" r="3.5" fill="var(--white)" />
                    </svg>
                    <div className={styles.chartLegend}>
                      <span><span className={styles.dot} style={{ background: "var(--life)" }} /> Observed</span>
                      <span><span className={styles.dot} style={{ background: "var(--signal)" }} /> Projected — Reactor B fault</span>
                    </div>
                  </div>
                )}

                {active === "Maintenance" && (
                  <ul className={styles.list}>
                    {maintenance.map((m) => (
                      <li className={styles.listRow} key={m.item}>
                        <span className={`${styles.dot} ${styles[m.tone]}`} />
                        <span className={styles.listSystem}>{m.item}</span>
                        <span className={`${styles.tag} ${styles[m.tone]}`}>{m.status}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {active === "Colony Status" && (
                  <div className={styles.statusGrid}>
                    <div className={styles.statusHeadline}>
                      <span className={styles.dot} style={{ background: "var(--life)" }} />
                      OPERATIONAL
                    </div>
                    <ul className={styles.checklist}>
                      {subsystems.map((s) => (
                        <li key={s}>
                          <span className={styles.check}>✓</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {active === "Infrastructure" && (
                  <svg viewBox="0 0 400 200" className={styles.chart}>
                    {infraLinks.map(([a, b], i) => (
                      <line
                        key={i}
                        x1={infraNodes[a].x}
                        y1={infraNodes[a].y}
                        x2={infraNodes[b].x}
                        y2={infraNodes[b].y}
                        stroke="var(--ink-25)"
                      />
                    ))}
                    {infraNodes.map((n) => (
                      <g key={n.id} transform={`translate(${n.x},${n.y})`}>
                        <circle r="14" fill="var(--surface)" stroke="var(--ink-25)" />
                        <circle
                          r="3.5"
                          fill={n.tone === "signal" ? "var(--signal)" : "var(--life)"}
                        />
                        <text x="0" y="28" textAnchor="middle" fontSize="10" fill="var(--ink-40)" fontFamily="var(--font-mono)">
                          {n.id}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}

                {active === "Decision Support" && (
                  <div className={styles.decisionCompare}>
                    <div className={styles.decisionCard}>
                      <span className={styles.mono}>REPAIR REACTOR</span>
                      <span className={styles.decisionMetric}>8 HOURS</span>
                      <span className={styles.barLabel}>RECOVERY TIME</span>
                    </div>
                    <div className={styles.decisionCard}>
                      <span className={styles.mono}>RATION ENERGY</span>
                      <span className={styles.decisionMetric}>+3.2 DAYS</span>
                      <span className={styles.barLabel}>AUTONOMY GAIN</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
