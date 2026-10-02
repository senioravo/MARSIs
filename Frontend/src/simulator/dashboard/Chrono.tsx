import { Ico } from "../art/Icons";
import { cx } from "../ui";
import styles from "./Dashboard.module.css";

/** Simulated hours that pass per real second at each speed step. */
export const SPEEDS = [
  { hps: 0.25, label: "15 min / s" },
  { hps: 1, label: "1 hour / s" },
  { hps: 4, label: "4 hours / s" },
  { hps: 12, label: "½ sol / s" },
  { hps: 48, label: "2 sols / s" },
  { hps: 120, label: "5 sols / s" },
  { hps: 336, label: "14 sols / s" },
];

const R = 30;

/** The sol dial: a 24-hour ring with the sun's position, plus the transport controls. */
export function Chrono({
  t,
  duration,
  paused,
  speed,
  onToggle,
  onSpeed,
  daylight,
}: {
  t: number;
  duration: number;
  paused: boolean;
  speed: number;
  onToggle: () => void;
  onSpeed: (i: number) => void;
  daylight: number;
}) {
  const sol = Math.floor(t / 24);
  const hour = t % 24;
  const hh = Math.floor(hour);
  const mm = Math.floor((hour - hh) * 60);
  const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;
  const progress = Math.min(1, t / (duration * 24));
  const circ = 2 * Math.PI * (R + 6);
  return (
    <div className={styles.chrono}>
      <svg viewBox="-40 -40 80 80" className={styles.chronoDial} aria-hidden="true">
        {/* day arc 06–18 */}
        <circle r={R} fill="none" stroke="var(--ink-06)" strokeWidth="7" />
        <path d={`M${R} 0 A${R} ${R} 0 0 1 ${-R} 0`} fill="none" stroke="rgba(255,159,67,0.18)" strokeWidth="7" />
        {Array.from({ length: 24 }, (_, i) => {
          const ang = (i / 24) * Math.PI * 2 - Math.PI / 2;
          const r0 = i % 6 === 0 ? R - 6 : R - 3;
          return <line key={i} x1={Math.cos(ang) * r0} y1={Math.sin(ang) * r0} x2={Math.cos(ang) * R} y2={Math.sin(ang) * R} stroke="var(--ink-25)" strokeWidth={i % 6 === 0 ? 1.4 : 0.8} />;
        })}
        <circle r={R + 6} fill="none" stroke="var(--ink-06)" strokeWidth="1.5" />
        <circle
          r={R + 6}
          fill="none"
          stroke="var(--mars)"
          strokeWidth="1.5"
          strokeDasharray={`${circ * progress} ${circ}`}
          transform="rotate(-90)"
        />
        <line x1="0" y1="0" x2={Math.cos(a) * (R - 2)} y2={Math.sin(a) * (R - 2)} stroke="var(--white)" strokeWidth="1.2" />
        <circle cx={Math.cos(a) * R} cy={Math.sin(a) * R} r="4.5" fill={daylight > 0.02 ? "#ffcf7a" : "var(--energy)"} stroke="var(--sheet)" strokeWidth="1.5" />
        <circle r="2" fill="var(--white)" />
      </svg>
      <div className={styles.chronoRead}>
        <span className={styles.chronoSol}>
          Sol <b>{String(sol).padStart(3, "0")}</b>
        </span>
        <span className={styles.chronoTime}>
          {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")} <span>of {duration} sols</span>
        </span>
      </div>
      <div className={styles.transport}>
        <button type="button" onClick={() => onSpeed(Math.max(0, speed - 1))} disabled={speed === 0} aria-label="Slow down time" title="Slower ( − )">
          <Ico name="slower" size={16} />
        </button>
        <button type="button" className={styles.playBtn} onClick={onToggle} aria-label={paused ? "Resume time" : "Pause time"} title="Play / pause (space)">
          <Ico name={paused ? "play" : "pause"} size={18} />
        </button>
        <button type="button" onClick={() => onSpeed(Math.min(SPEEDS.length - 1, speed + 1))} disabled={speed === SPEEDS.length - 1} aria-label="Speed up time" title="Faster ( + )">
          <Ico name="faster" size={16} />
        </button>
      </div>
      <div className={styles.speed}>
        <span className={styles.speedLabel}>{paused ? "Paused" : SPEEDS[speed].label}</span>
        <span className={styles.speedPips} role="radiogroup" aria-label="Time speed">
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={i === speed}
              aria-label={s.label}
              className={cx(styles.pip, i <= speed && styles.pipOn, i === speed && styles.pipCur)}
              style={{ height: 6 + i * 2.2 }}
              onClick={() => onSpeed(i)}
            />
          ))}
        </span>
      </div>
    </div>
  );
}
