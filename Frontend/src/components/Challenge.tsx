import { motion } from "framer-motion";
import Auralis from "./ui/auralis";
import styles from "./Challenge.module.css";

const BG_COLORS = ["#F6B681", "#F6A06B", "#F39653"];

const systems = [
  { label: "Water", angle: -6 },
  { label: "Energy", angle: 4 },
  { label: "Food", angle: -3 },
  { label: "Infrastructure", angle: 5 },
  { label: "Maintenance", angle: -5 },
  { label: "Personnel", angle: 3 },
];

export function Challenge() {
  return (
    <section id="the-challenge" className={`section ${styles.section}`}>
      <div className={styles.bgLayer} aria-hidden="true">
        <Auralis colors={BG_COLORS} speed={0.2} grain={0.1} height="100%" />
        <div className={styles.bgFade} />
      </div>
      <div className={`section-inner ${styles.inner}`}>
        <div className={styles.intro}>
          <h2 className="heading-lg">A colony cannot afford disconnected systems.</h2>
          <p className={`body-lg ${styles.body}`}>
            Water. Energy. Food. Infrastructure. Maintenance. Personnel. On Earth, these run as
            separate departments with separate tools. On Mars, they are one system — and treating
            them as anything else is how a small failure becomes a colony-wide one.
          </p>
        </div>

        <div className={styles.diagram}>
          <div className={styles.fragments}>
            {systems.map((s, i) => (
              <motion.div
                key={s.label}
                className={styles.fragment}
                initial={{ opacity: 0.3, rotate: s.angle, y: 0 }}
                whileInView={{ opacity: 1, rotate: 0, y: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <span className={styles.fragmentDot} />
                {s.label}
              </motion.div>
            ))}
          </div>

          <motion.div
            className={styles.connector}
            initial={{ scaleY: 0, opacity: 0 }}
            whileInView={{ scaleY: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.2, delay: 0.5 }}
          />

          <motion.div
            className={styles.unified}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.unifiedMark} />
            <span className={styles.unifiedText}>
              MARSIS <span className={styles.unifiedSep}>/</span> One operational view
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
