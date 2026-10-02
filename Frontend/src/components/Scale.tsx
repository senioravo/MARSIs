import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./Scale.module.css";

const stages = [
  { label: "1 Habitat", count: 1 },
  { label: "10 Habitats", count: 10 },
  { label: "1 Settlement", count: 30 },
  { label: "1 City", count: 70 },
  { label: "1 Martian Network", count: 140 },
];

const CLUSTER_SIZE = 10;
const COLS = 5;
const VIEW_W = 640;
const VIEW_H = 340;

interface Node {
  id: number;
  x: number;
  y: number;
  cluster: number;
  isHub: boolean;
}

function buildNetwork(total: number) {
  const clusterCount = Math.ceil(total / CLUSTER_SIZE);
  const rows = Math.ceil(clusterCount / COLS);
  const colW = VIEW_W / COLS;
  const rowH = VIEW_H / Math.max(rows, 1);

  const nodes: Node[] = [];
  for (let i = 0; i < total; i++) {
    const cluster = Math.floor(i / CLUSTER_SIZE);
    const localIndex = i % CLUSTER_SIZE;
    const col = cluster % COLS;
    const row = Math.floor(cluster / COLS);
    const cx = colW * col + colW / 2;
    const cy = rowH * row + rowH / 2;

    let x = cx;
    let y = cy;
    if (localIndex > 0) {
      const angle = (localIndex / (CLUSTER_SIZE - 1)) * Math.PI * 2;
      const radius = Math.min(colW, rowH) * 0.28;
      x = cx + Math.cos(angle) * radius;
      y = cy + Math.sin(angle) * radius;
    }

    nodes.push({ id: i, x, y, cluster, isHub: localIndex === 0 });
  }

  const links: [number, number][] = [];
  nodes.forEach((n) => {
    if (!n.isHub) {
      links.push([n.cluster * CLUSTER_SIZE, n.id]);
    } else if (n.cluster > 0) {
      links.push([(n.cluster - 1) * CLUSTER_SIZE, n.id]);
    }
  });

  return { nodes, links };
}

const FULL_NETWORK = buildNetwork(140);

export function Scale() {
  const [stageIndex, setStageIndex] = useState(0);
  const stage = stages[stageIndex];

  const visible = useMemo(() => {
    const nodeSet = new Set(FULL_NETWORK.nodes.filter((n) => n.id < stage.count).map((n) => n.id));
    return {
      nodes: FULL_NETWORK.nodes.filter((n) => nodeSet.has(n.id)),
      links: FULL_NETWORK.links.filter(([a, b]) => nodeSet.has(a) && nodeSet.has(b)),
    };
  }, [stage.count]);

  return (
    <section id="scale" className="section">
      <div className="section-inner">
        <div className={styles.header}>
          <h2 className="heading-lg">Built for the first habitat. Ready for the next civilization.</h2>
          <p className={`body-lg ${styles.body}`}>
            The same operational model that runs one habitat scales to a settlement, a city, and a
            network of interconnected colonies — without changing how operators work.
          </p>
        </div>

        <div className={styles.stepper}>
          {stages.map((s, i) => (
            <button
              key={s.label}
              className={`${styles.step} ${i === stageIndex ? styles.stepActive : ""}`}
              onClick={() => setStageIndex(i)}
            >
              <span className={styles.stepIndex}>0{i + 1}</span>
              {s.label}
            </button>
          ))}
        </div>

        <div className={styles.networkFrame}>
          <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className={styles.network}>
            <AnimatePresence>
              {visible.links.map(([a, b]) => {
                const na = FULL_NETWORK.nodes[a];
                const nb = FULL_NETWORK.nodes[b];
                return (
                  <motion.line
                    key={`${a}-${b}`}
                    x1={na.x}
                    y1={na.y}
                    x2={nb.x}
                    y2={nb.y}
                    stroke="var(--ink-12)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                );
              })}
            </AnimatePresence>
            <AnimatePresence>
              {visible.nodes.map((n) => (
                <motion.circle
                  key={n.id}
                  cx={n.x}
                  cy={n.y}
                  r={n.isHub ? 5 : 3}
                  fill={n.isHub ? "var(--mars)" : "var(--energy)"}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                />
              ))}
            </AnimatePresence>
          </svg>
          <div className={styles.networkMeta}>
            <span className={styles.metaLabel}>ACTIVE NODES</span>
            <span className={styles.metaValue}>{stage.count}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
