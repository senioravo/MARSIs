import type { ReactNode } from "react";
import { Ico } from "./art/Icons";
import styles from "./Sim.module.css";

export const fmt = (n: number, digits = 0) =>
  Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "∞";

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

export function Counter({
  value,
  onChange,
  min = 0,
  max = 99,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className={styles.counter} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Remove one ${label}`}>
        <Ico name="minus" size={14} />
      </button>
      <span className={styles.counterValue}>{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Add one ${label}`}>
        <Ico name="plus" size={14} />
      </button>
    </div>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = (v) => String(v),
  hint,
  accent,
}: {
  label: ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  hint?: ReactNode;
  accent?: string;
}) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <label className={styles.range} style={accent ? { ["--accent" as string]: accent } : undefined}>
      <span className={styles.rangeHead}>
        <span>{label}</span>
        <span className={styles.mono}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--p" as string]: `${p}%` }}
      />
      {hint && <span className={styles.rangeHint}>{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.toggleTrack} aria-hidden="true" />
      <span>
        <span className={styles.toggleLabel}>{label}</span>
        {hint && <span className={styles.toggleHint}>{hint}</span>}
      </span>
    </label>
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className={styles.segmented} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          className={o.value === value ? styles.segOn : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Meter({ value, color = "var(--white)", warn, label }: { value: number; color?: string; warn?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
  return (
    <span className={cx(styles.meter, warn && styles.meterWarn)} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(v * 100)} aria-label={label}>
      <span style={{ width: `${v * 100}%`, background: color }} />
    </span>
  );
}

type Tone = "ok" | "warn" | "bad" | "off" | "info";

const STATUS: Record<string, { label: string; tone: Tone }> = {
  // facilities
  operational: { label: "Available", tone: "ok" },
  repair: { label: "Repair", tone: "warn" },
  disabled: { label: "Disabled", tone: "bad" },
  offline: { label: "Switched off", tone: "off" },
  // comms
  available: { label: "Available", tone: "ok" },
  defective: { label: "Defective", tone: "bad" },
  maintenance: { label: "Maintenance", tone: "warn" },
  // people
  assigned: { label: "Assigned", tone: "info" },
  pending: { label: "Pending", tone: "warn" },
  responding: { label: "Responding", tone: "warn" },
  medical: { label: "In medical", tone: "bad" },
  deceased: { label: "Deceased", tone: "off" },
  // vehicles
  docked: { label: "Docked", tone: "ok" },
  charging: { label: "Charging", tone: "info" },
  mission: { label: "On mission", tone: "info" },
  returning: { label: "Returning", tone: "info" },
  stranded: { label: "Stranded", tone: "bad" },
  // incidents
  open: { label: "Open", tone: "bad" },
  awaiting: { label: "Awaiting resources", tone: "warn" },
  resolved: { label: "Resolved", tone: "off" },
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "off" as Tone };
  return (
    <span className={cx(styles.pill, styles[`tone_${s.tone}`])}>
      <span className={styles.pillDot} aria-hidden="true" />
      {label ?? s.label}
    </span>
  );
}

export function Plate({
  title,
  aside,
  children,
  className,
  art,
  id,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  art?: ReactNode;
  id?: string;
}) {
  return (
    <section className={cx(styles.plate, className)} id={id}>
      {(title || aside) && (
        <header className={styles.plateHead}>
          {title && <h3>{title}</h3>}
          {aside && <div className={styles.plateAside}>{aside}</div>}
        </header>
      )}
      {art && <div className={styles.plateArt}>{art}</div>}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: Tone }) {
  return (
    <div className={cx(styles.stat, tone && styles[`tone_${tone}`])}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
      {sub && <span className={styles.statSub}>{sub}</span>}
    </div>
  );
}
