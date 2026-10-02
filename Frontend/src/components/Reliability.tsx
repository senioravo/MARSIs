import { motion } from "framer-motion";
import styles from "./Reliability.module.css";

const principles = [
  { term: "Accurate", detail: "Every figure traces back to a live reading, not a cached estimate." },
  { term: "Centralized", detail: "One state, shared by every operator and every module." },
  { term: "Accessible", detail: "Built for the people running the colony, not just the engineers who built it." },
  { term: "Predictable", detail: "The same event produces the same read, every time it happens." },
  { term: "Actionable", detail: "Every insight resolves to a decision an operator can make." },
];

export function Reliability() {
  return (
    <section id="reliability" className="section">
      <div className={`section-inner ${styles.inner}`}>
        <div className={styles.copy}>
          <h2 className="heading-lg">When infrastructure matters, clarity matters.</h2>
          <p className={`body-lg ${styles.body}`}>
            MARSIS is built for environments where information has to be accurate, centralized and
            actionable — not for occasional convenience, but for continuous operation.
          </p>

          <div className={styles.continuity}>
            <span className={styles.continuityLabel}>OPERATIONAL CONTINUITY — LAST 90 DAYS</span>
            <svg viewBox="0 0 400 60" className={styles.continuityChart}>
              <line x1="0" y1="30" x2="400" y2="30" stroke="var(--life)" strokeWidth="1.5" />
              {Array.from({ length: 13 }).map((_, i) => (
                <line
                  key={i}
                  x1={i * (400 / 12)}
                  y1="26"
                  x2={i * (400 / 12)}
                  y2="34"
                  stroke="var(--life-25)"
                />
              ))}
            </svg>
            <div className={styles.continuityFoot}>
              <span>T-90D</span>
              <span>T-0</span>
            </div>
          </div>
        </div>

        <dl className={styles.list}>
          {principles.map((p, i) => (
            <motion.div
              className={styles.row}
              key={p.term}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <dt className={styles.term}>{p.term}</dt>
              <dd className={styles.detail}>{p.detail}</dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </section>
  );
}
