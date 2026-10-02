import { motion } from "framer-motion";
import { Metric } from "../hooks/useCountUp";
import styles from "./ResourceCard.module.css";

export type Status = "stable" | "caution" | "critical";

interface ResourceCardProps {
  label: string;
  value: number;
  status: Status;
  trend: number[];
  autonomyDays?: number;
  note?: string;
  index: number;
}

const statusVar: Record<Status, string> = {
  stable: "var(--life)",
  caution: "var(--signal)",
  critical: "var(--mars)",
};

const statusLabel: Record<Status, string> = {
  stable: "STABLE",
  caution: "CAUTION",
  critical: "CRITICAL",
};

function sparkPath(trend: number[]) {
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min || 1;
  const step = 100 / (trend.length - 1);
  return trend
    .map((v, i) => {
      const x = i * step;
      const y = 26 - ((v - min) / range) * 22;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function ResourceCard({ label, value, status, trend, autonomyDays, note, index }: ResourceCardProps) {
  const color = statusVar[status];

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-8% 0px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={styles.status} style={{ color }}>
          <span className={styles.statusDot} style={{ background: color }} />
          {statusLabel[status]}
        </span>
      </div>

      <div className={styles.value}>
        <Metric value={value} suffix="%" duration={1.3} delay={index * 0.08} />
      </div>

      <svg className={styles.spark} viewBox="0 0 100 30" preserveAspectRatio="none">
        <path d={sparkPath(trend)} fill="none" stroke={color} strokeWidth="1.6" opacity="0.7" />
      </svg>

      <div className={styles.footer}>
        {autonomyDays !== undefined ? (
          <>
            <span className={styles.footerLabel}>PROJECTED AUTONOMY</span>
            <span className={styles.footerValue}>
              <Metric value={autonomyDays} decimals={1} suffix=" DAYS" duration={1.3} delay={index * 0.08} />
            </span>
          </>
        ) : (
          <>
            <span className={styles.footerLabel}>STATUS</span>
            <span className={styles.footerValue}>{note}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}
