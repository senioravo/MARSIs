import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";
import heroResource from "../assets/hero-resource.webp";
import heroSystem from "../assets/hero-system.webp";
import heroOperation from "../assets/hero-operation.webp";
import styles from "./ScrollGallery.module.css";

const PANELS = [
  {
    src: heroResource,
    index: "01",
    title: "Resource Intelligence",
    alt: "Oxygen storage and resource processing facility",
  },
  {
    src: heroSystem,
    index: "02",
    title: "Colony Systems",
    alt: "Rover maintenance garage inside the habitat",
  },
  {
    src: heroOperation,
    index: "03",
    title: "Operations",
    alt: "MARSIS launch vehicle on the pad",
  },
];

const REVEAL_VH = 45;
const ZOOM_VH = 85;
const PANEL_VH = REVEAL_VH + ZOOM_VH;
const HANDOFF_VH = 12;
const TOTAL_ACTIVE_VH = PANELS.length * PANEL_VH;
const SPRING_CONFIG = { stiffness: 100, damping: 24, mass: 0.5 };

interface GalleryLayerProps {
  panel: (typeof PANELS)[number];
  index: number;
  isLast: boolean;
  scrolledVh: MotionValue<number>;
}

function GalleryLayer({ panel, index, isLast, scrolledVh }: GalleryLayerProps) {
  const start = index * PANEL_VH;

  const sweepY = useTransform(scrolledVh, [start, start + REVEAL_VH], ["100%", "0%"]);
  const scale = useTransform(scrolledVh, [start + REVEAL_VH, start + PANEL_VH], [1, 1.32]);
  const textDrift = useTransform(scrolledVh, [start + PANEL_VH - HANDOFF_VH, start + PANEL_VH], [0, 34]);

  const [textShown, setTextShown] = useState(false);
  const [darken, setDarken] = useState(false);

  useMotionValueEvent(scrolledVh, "change", (v) => {
    setTextShown(v > start + 3 && v < start + PANEL_VH - HANDOFF_VH + 2);
    if (!isLast) setDarken(v > start + PANEL_VH);
  });

  return (
    <motion.div className={styles.layer} style={{ y: sweepY, zIndex: index }}>
      <motion.img src={panel.src} alt={panel.alt} className={styles.image} style={{ scale }} />
      <div className={styles.scrim} />
      {!isLast && <div className={`${styles.exitDarken} ${darken ? styles.exitDarkenActive : ""}`} />}
      <motion.div
        className={`${styles.headline} ${textShown ? styles.headlineVisible : ""}`}
        style={{ y: textDrift }}
      >
        <h3 className={styles.title}>
          <span className={styles.titleIndex}>{panel.index}.</span> {panel.title}
        </h3>
      </motion.div>
    </motion.div>
  );
}

function DockSlot({ panel, index, scrolledVh }: { panel: (typeof PANELS)[number]; index: number; scrolledVh: MotionValue<number> }) {
  const start = index * PANEL_VH;
  const [visible, setVisible] = useState(false);

  useMotionValueEvent(scrolledVh, "change", (v) => {
    setVisible(v > start + PANEL_VH - HANDOFF_VH + 2);
  });

  return (
    <div className={`${styles.dockSlot} ${visible ? styles.dockSlotVisible : ""}`}>
      <span className={styles.dockText}>
        <span className={styles.titleIndex}>{panel.index}.</span> {panel.title}
      </span>
    </div>
  );
}

export function ScrollGallery() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const smoothProgress = useSpring(scrollYProgress, SPRING_CONFIG);
  const scrolledVh = useTransform(smoothProgress, [0, 1], [0, TOTAL_ACTIVE_VH]);

  const { scrollY } = useScroll();
  const [releaseAt, setReleaseAt] = useState<number | null>(null);

  useEffect(() => {
    function measure() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      setReleaseAt(top + rect.height - window.innerHeight);
    }
    measure();
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const dockY = useTransform(scrollY, (v) => (releaseAt === null ? 0 : -Math.max(0, v - releaseAt)));

  return (
    <section
      ref={ref}
      className={styles.gallery}
      aria-label="MARSIS platform overview"
      style={{ height: `calc(100svh + ${TOTAL_ACTIVE_VH}vh)` }}
    >
      <div className={styles.stickyPin}>
        {PANELS.map((panel, i) => (
          <GalleryLayer
            key={panel.title}
            panel={panel}
            index={i}
            isLast={i === PANELS.length - 1}
            scrolledVh={scrolledVh}
          />
        ))}
      </div>

      <motion.div className={styles.textDock} style={{ y: dockY }}>
        <div className={styles.dockInner}>
          {PANELS.map((panel, i) => (
            <DockSlot key={panel.title} panel={panel} index={i} scrolledVh={scrolledVh} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
