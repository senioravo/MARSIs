import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import styles from "./DecisionEngine.module.css";

const cascadeSteps = [
  "Reactor failure",
  "Energy reduction",
  "Greenhouse impact",
  "Food production reduction",
  "Reserve depletion",
  "Potential shortage",
];

interface ResponseOption {
  id: string;
  title: string;
  cost: "LOW" | "MEDIUM" | "HIGH";
  recovery: string;
  energy: string;
  autonomy: string;
  food: string;
}

const options: ResponseOption[] = [
  {
    id: "repair",
    title: "Repair reactor",
    cost: "HIGH",
    recovery: "8 hours",
    energy: "Restored to 100%",
    autonomy: "No shortage projected",
    food: "Returns to baseline",
  },
  {
    id: "ration",
    title: "Ration energy",
    cost: "LOW",
    recovery: "Immediate",
    energy: "-6% non-critical draw",
    autonomy: "+3.2 days",
    food: "-4%, temporary",
  },
  {
    id: "redistribute",
    title: "Redistribute power",
    cost: "MEDIUM",
    recovery: "2 hours",
    energy: "Balanced across zones",
    autonomy: "+1.8 days",
    food: "Stabilized",
  },
  {
    id: "reduce",
    title: "Reduce non-critical load",
    cost: "LOW",
    recovery: "Immediate",
    energy: "-9% leisure & non-essential",
    autonomy: "+2.1 days",
    food: "No change",
  },
];

export function DecisionEngine() {
  const [selected, setSelected] = useState(options[0].id);
  const active = options.find((o) => o.id === selected)!;

  return (
    <section id="decision-engine" className="section">
      <div className="section-inner">
        <div className={styles.header}>
          <h2 className="heading-lg">What happens if the reactor goes offline?</h2>
          <p className={`body-lg ${styles.body}`}>
            Choose a response below and MARSIS models the outcome across energy, food and colony
            autonomy — the same comparison an operator would run before acting.
          </p>
        </div>

        <div className={styles.cascade}>
          {cascadeSteps.map((step, i) => (
            <span className={styles.cascadeStep} key={step}>
              {step}
              {i < cascadeSteps.length - 1 && <span className={styles.cascadeArrow}>→</span>}
            </span>
          ))}
        </div>

        <div className={styles.simulator}>
          <div className={styles.options}>
            {options.map((o) => (
              <button
                key={o.id}
                className={`${styles.option} ${o.id === selected ? styles.optionActive : ""}`}
                onClick={() => setSelected(o.id)}
              >
                <span className={styles.optionTitle}>{o.title}</span>
                <span className={styles.optionCost}>COST · {o.cost}</span>
              </button>
            ))}
          </div>

          <div className={styles.outcome}>
            <span className={styles.outcomeLabel}>PROJECTED OUTCOME</span>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                className={styles.outcomeGrid}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.outcomeRow}>
                  <span className={styles.outcomeKey}>ENERGY</span>
                  <span className={styles.outcomeValue}>{active.energy}</span>
                </div>
                <div className={styles.outcomeRow}>
                  <span className={styles.outcomeKey}>PROJECTED AUTONOMY</span>
                  <span className={styles.outcomeValue}>{active.autonomy}</span>
                </div>
                <div className={styles.outcomeRow}>
                  <span className={styles.outcomeKey}>FOOD PRODUCTION</span>
                  <span className={styles.outcomeValue}>{active.food}</span>
                </div>
                <div className={styles.outcomeRow}>
                  <span className={styles.outcomeKey}>RECOVERY TIME</span>
                  <span className={styles.outcomeValue}>{active.recovery}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
