import { motion } from "framer-motion";
import heroResource from "../assets/hero-resource.webp";
import heroSystem from "../assets/hero-system.webp";
import heroOperation from "../assets/hero-operation.webp";
import styles from "./Hero.module.css";

const headline = ["Mars is the next frontier.", "MARSIS is its infrastructure."];

const stack = [
  { src: heroResource, label: "01 — RESOURCE INTELLIGENCE", alt: "Oxygen storage and resource processing facility" },
  { src: heroSystem, label: "02 — COLONY SYSTEMS", alt: "Rover maintenance garage inside the habitat" },
  { src: heroOperation, label: "03 — OPERATIONS", alt: "MARSIS launch vehicle on the pad" },
];

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.11, delayChildren: 0.15 },
  },
};

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const line = {
  hidden: { y: "110%" },
  show: { y: "0%", transition: { duration: 0.9, ease: EASE_OUT } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

export function Hero() {
  return (
    <section id="hero" className={styles.hero}>
      <div className={styles.grid}>
        <motion.div className={styles.copy} variants={container} initial="hidden" animate="show">
          <h1 className={styles.headline}>
            {headline.map((l) => (
              <span className={styles.lineMask} key={l}>
                <motion.span className={styles.lineInner} variants={line}>
                  {l}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className={`body-lg ${styles.sub}`} variants={fadeUp}>
            One intelligent platform for managing the resources, systems and operations that keep a
            colony alive.
          </motion.p>
          <motion.div className={styles.actions} variants={fadeUp}>
            <a href="#resource-intelligence" className="btn btn-primary">
              Explore MARSIS
            </a>
            <a href="#the-challenge" className="link-arrow">
              See how it works →
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.visual}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          <div className={styles.stack}>
            <div className={styles.backdrop} />
            {stack.map((item, i) => (
              <motion.div
                key={item.label}
                className={styles.frameEntrance}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.5 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className={styles.frame}>
                  <img src={item.src} alt={item.alt} className={styles.frameImg} />
                  <span className={styles.frameLabel}>{item.label}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className={styles.scrollCue}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <span>SCROLL</span>
        <span className={styles.scrollLine} />
      </motion.div>
    </section>
  );
}
