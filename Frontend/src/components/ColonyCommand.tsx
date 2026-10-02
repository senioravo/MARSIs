import { motion } from "framer-motion";
import { Metric } from "../hooks/useCountUp";
import styles from "./ColonyCommand.module.css";

const stats = [
  { label: "RESIDENTS", value: 126, decimals: 0, suffix: "" },
  { label: "OXYGEN", value: 82, decimals: 0, suffix: "%" },
  { label: "WATER", value: 64, decimals: 0, suffix: "%" },
  { label: "ENERGY", value: 71, decimals: 0, suffix: "%" },
  { label: "FOOD", value: 58, decimals: 0, suffix: "%" },
];

const events = [
  { system: "REACTOR B", detail: "Maintenance required", severity: "signal" as const },
  { system: "GREENHOUSE 02", detail: "Temperature above normal", severity: "signal" as const },
  { system: "HABITAT 03", detail: "Airflow normal", severity: "life" as const },
];

export function ColonyCommand() {
  return (
    <section id="colony-command" className="section">
      <div className="section-inner">
        <div className={styles.header}>
          <h2 className="heading-lg">One colony. One source of truth.</h2>
          <p className={`body-lg ${styles.body}`}>
            Every operator — habitat lead, maintenance crew, mission control — reads from the same
            live state. No exported spreadsheets. No stale reports.
          </p>
        </div>

        <motion.div
          className={styles.panel}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className={styles.panelTop}>
            <span className={styles.locTag}>MARS / HABITAT 01</span>
            <span className={styles.statusPill}>
              <span className={styles.statusDot} />
              OPERATIONAL
            </span>
          </div>

          <div className={styles.statRow}>
            {stats.map((s) => (
              <div className={styles.stat} key={s.label}>
                <span className={styles.statValue}>
                  <Metric value={s.value} decimals={s.decimals} suffix={s.suffix} duration={1.2} />
                </span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.eventsPanel}>
            <span className={styles.eventsLabel}>ACTIVE EVENTS</span>
            <ul className={styles.eventsList}>
              {events.map((e) => (
                <li className={styles.event} key={e.system}>
                  <span className={`${styles.eventDot} ${styles[e.severity]}`} />
                  <span className={styles.eventSystem}>{e.system}</span>
                  <span className={styles.eventDetail}>{e.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
