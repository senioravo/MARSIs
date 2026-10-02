import { useMemo, useRef, useState, type PointerEvent } from "react";
import styles from "./Dashboard.module.css";

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const W = 600;
const H = 180;
const PAD = { l: 44, r: 70, t: 12, b: 24 };

/** Line chart over simulation time: one y-axis, direct end labels, crosshair tooltip. */
export function Chart({
  t,
  series,
  format = (v) => v.toFixed(0),
  unit = "",
  yMax,
  title,
}: {
  t: number[];
  series: Series[];
  format?: (v: number) => string;
  unit?: string;
  yMax?: number;
  title: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const n = t.length;

  const { paths, max, x0, x1, yTicks, xTicks } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const max = yMax ?? Math.max(1, ...all) * 1.08;
    const x0 = t[0] ?? 0;
    const x1 = Math.max(x0 + 1, t[n - 1] ?? 1);
    const sx = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
    const sy = (v: number) => PAD.t + (1 - Math.min(v, max) / max) * (H - PAD.t - PAD.b);
    // thin long histories so paths stay light
    const stride = Math.max(1, Math.floor(n / 300));
    const paths = series.map((s) => {
      let d = "";
      for (let i = 0; i < n; i += stride) d += `${i === 0 ? "M" : "L"}${sx(t[i]).toFixed(1)},${sy(s.values[i]).toFixed(1)}`;
      if (n > 1 && (n - 1) % stride) d += `L${sx(t[n - 1]).toFixed(1)},${sy(s.values[n - 1]).toFixed(1)}`;
      return { ...s, d, endY: n ? sy(s.values[n - 1]) : 0 };
    });
    // keep end labels from overlapping
    const ends = [...paths].sort((a, b) => a.endY - b.endY);
    for (let i = 1; i < ends.length; i++) if (ends[i].endY - ends[i - 1].endY < 13) ends[i].endY = ends[i - 1].endY + 13;
    const yTicks = [0, 0.5, 1].map((f) => ({ v: max * f, y: sy(max * f) }));
    const spanSols = (x1 - x0) / 24;
    const stepSols = spanSols > 300 ? 100 : spanSols > 120 ? 30 : spanSols > 40 ? 10 : spanSols > 12 ? 5 : 1;
    const xTicks: { x: number; label: string }[] = [];
    for (let sol = Math.ceil(x0 / 24 / stepSols) * stepSols; sol * 24 <= x1; sol += stepSols) xTicks.push({ x: sx(sol * 24), label: `Sol ${sol}` });
    return { paths, max, x0, x1, yTicks, xTicks };
  }, [t, series, n, yMax]);

  const sx = (v: number) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const onMove = (e: PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    const tv = x0 + ((x - PAD.l) / (W - PAD.l - PAD.r)) * (x1 - x0);
    let lo = 0;
    let hi = n - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (t[mid] < tv) lo = mid + 1;
      else hi = mid;
    }
    setHover(Math.max(0, Math.min(n - 1, lo)));
  };

  if (n < 2) return <p className={styles.chartEmpty}>The chart fills in as time passes.</p>;
  const hx = hover !== null ? sx(t[hover]) : 0;
  const sol = hover !== null ? Math.floor(t[hover] / 24) : 0;
  const hr = hover !== null ? t[hover] % 24 : 0;

  return (
    <figure className={styles.chart}>
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={title}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        className={styles.chartSvg}
      >
        {yTicks.map((tk) => (
          <g key={tk.v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={tk.y} y2={tk.y} stroke="var(--ink-06)" />
            <text x={PAD.l - 8} y={tk.y + 3.5} textAnchor="end" className={styles.chartTick}>
              {format(tk.v)}
            </text>
          </g>
        ))}
        {xTicks.map((tk) => (
          <text key={tk.label} x={tk.x} y={H - 6} textAnchor="middle" className={styles.chartTick}>
            {tk.label}
          </text>
        ))}
        {paths.map((p) => (
          <path key={p.key} d={p.d} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" />
        ))}
        {paths.map((p) => (
          <g key={`l-${p.key}`}>
            <circle cx={W - PAD.r} cy={n ? PAD.t + (1 - Math.min(p.values[n - 1], max) / max) * (H - PAD.t - PAD.b) : 0} r="3" fill={p.color} />
            <text x={W - PAD.r + 8} y={p.endY + 3.5} className={styles.chartLabel}>
              {p.label}
            </text>
          </g>
        ))}
        {hover !== null && <line x1={hx} x2={hx} y1={PAD.t} y2={H - PAD.b} stroke="var(--ink-25)" />}
      </svg>
      {hover !== null && (
        <div className={styles.chartTip} style={{ left: `${(hx / W) * 100}%` }}>
          <span className={styles.chartTipHead}>
            Sol {sol}, {String(hr).padStart(2, "0")}:00
          </span>
          {series.map((s) => (
            <span key={s.key} className={styles.chartTipRow}>
              <span className={styles.chartSwatch} style={{ background: s.color }} />
              {s.label}
              <b>
                {format(s.values[hover])}
                {unit}
              </b>
            </span>
          ))}
        </div>
      )}
      {series.length > 1 && (
        <figcaption className={styles.chartLegend}>
          {series.map((s) => (
            <span key={s.key}>
              <span className={styles.chartSwatch} style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
