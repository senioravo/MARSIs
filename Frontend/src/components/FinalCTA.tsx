import { motion } from "framer-motion";
import styles from "./FinalCTA.module.css";

export function FinalCTA() {
  return (
    <section id="access" className={styles.section}>
      <div className={styles.glow} />
      <div className={`section-inner ${styles.inner}`}>
        <motion.h2
          className={`heading-xl ${styles.headline}`}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Build the colony.
          <br />
          MARSIS keeps it running.
        </motion.h2>

        <motion.p
          className={`body-lg ${styles.body}`}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        >
          From your first habitat to an interconnected Martian settlement, MARSIS provides the
          operational intelligence required to manage what comes next.
        </motion.p>

        <motion.div
          className={styles.actions}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <a href="#request-access" className="btn btn-primary">
            Request Access
          </a>
          <a href="#product" className="link-arrow">
            Explore the platform →
          </a>
        </motion.div>
      </div>
    </section>
  );
}
