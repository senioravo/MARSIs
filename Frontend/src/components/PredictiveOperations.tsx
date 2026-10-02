import { motion } from "framer-motion";
import styles from "./PredictiveOperations.module.css";

const chain = [
  { label: "REACTOR B OUTPUT", delta: "▼ 13.8%", tone: "mars" },
  { label: "ENERGY AVAILABLE", delta: "▼ 13.8%", tone: "mars" },
  { label: "GREENHOUSE YIELD", delta: "▼ 15%", tone: "signal" },
  { label: "FOOD PRODUCTION", delta: "▼ 10%", tone: "signal" },
  { label: "PROJECTED SHORTAGE", delta: "7 DAYS", tone: "signal" },
] as const;

const responses = [
  { title: "Repair Reactor", cost: "HIGH", metricLabel: "RECOVERY TIME", metricValue: "8 HOURS" },
  { title: "Ration Energy", cost: "LOW", metricLabel: "AUTONOMY GAIN", metricValue: "+3.2 DAYS" },
];

export function PredictiveOperations() {
  return (
    <section id="predictive-operations" className="section">
      <div className="section-inner">
        <div className={styles.header}>
          <h2 className="heading-lg">Don't wait for failure.</h2>
          <p className={`body-lg ${styles.body}`}>
            MARSIS doesn't just flag that a reactor is underperforming. It traces what that means
            for every system downstream — before the shortage arrives, not after.
          </p>
        </div>

        <div className={styles.chain}>
          {chain.map((node, i) => (
            <motion.div
              key={node.label}
              className={styles.nodeWrap}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px" }}
              transition={{ duration: 0.5, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={`${styles.node} ${styles[node.tone]}`}>
                <span className={styles.nodeLabel}>{node.label}</span>
                <span className={styles.nodeDelta}>{node.delta}</span>
              </div>
              {i < chain.length - 1 && <span className={styles.arrow}>→</span>}
            </motion.div>
          ))}
        </div>

        <div className={styles.responses}>
          <span className={styles.responsesLabel}>POSSIBLE RESPONSES</span>
          <div className={styles.responseRow}>
            {responses.map((r, i) => (
              <motion.div
                key={r.title}
                className={styles.responseCard}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.55, delay: 0.8 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              >
                <h3 className={styles.responseTitle}>{r.title}</h3>
                <div className={styles.responseMeta}>
                  <div>
                    <span className={styles.metaLabel}>OPERATIONAL COST</span>
                    <span className={styles.metaValue}>{r.cost}</span>
                  </div>
                  <div>
                    <span className={styles.metaLabel}>{r.metricLabel}</span>
                    <span className={styles.metaValue}>{r.metricValue}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          <a href="#decision-engine" className={`link-arrow ${styles.link}`}>
            Simulate the full decision →
          </a>
        </div>
      </div>
    </section>
  );
}
