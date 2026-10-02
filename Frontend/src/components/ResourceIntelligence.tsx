import { ResourceCard, type Status } from "./ResourceCard";
import styles from "./ResourceIntelligence.module.css";

interface Resource {
  label: string;
  value: number;
  status: Status;
  trend: number[];
  autonomyDays?: number;
  note?: string;
}

const resources: Resource[] = [
  { label: "OXYGEN", value: 82, status: "stable", trend: [78, 80, 79, 81, 82, 82], autonomyDays: 17.4 },
  { label: "WATER", value: 64, status: "stable", trend: [70, 68, 66, 65, 64, 64], autonomyDays: 22.6 },
  { label: "ENERGY", value: 71, status: "stable", trend: [86, 82, 78, 74, 72, 71], autonomyDays: 9.8 },
  { label: "FOOD PRODUCTION", value: 58, status: "caution", trend: [66, 64, 61, 60, 59, 58], autonomyDays: 12.3 },
  { label: "FUEL RESERVES", value: 45, status: "caution", trend: [58, 55, 51, 48, 46, 45], autonomyDays: 6.5 },
  { label: "HABITAT CAPACITY", value: 91, status: "stable", trend: [84, 86, 88, 89, 90, 91], note: "126 / 138 RESIDENTS" },
];

export function ResourceIntelligence() {
  return (
    <section id="resource-intelligence" className="section">
      <div className="section-inner">
        <div className={styles.header}>
          <h2 className="heading-lg">Know what keeps your colony alive.</h2>
          <p className={`body-lg ${styles.body}`}>
            MARSIS reads consumption, reserves and demand together — continuously. Not just where a
            resource stands today, but how many days it will last if nothing changes.
          </p>
        </div>

        <div className={styles.grid}>
          {resources.map((r, i) => (
            <ResourceCard key={r.label} index={i} {...r} />
          ))}
        </div>
      </div>
    </section>
  );
}
