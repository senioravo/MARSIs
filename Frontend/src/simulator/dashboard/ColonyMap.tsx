import { memo, useMemo, useState } from "react";
import { CATEGORIES, FACILITIES, INCIDENTS, SECTOR_KINDS, VEHICLES } from "../engine/catalog";
import { MAP_CX, MAP_CY, MAP_H, MAP_W } from "../engine/create";
import { isRunning } from "../engine/kpis";
import { Rng, hashSeed } from "../engine/rng";
import { daylight } from "../engine/tick";
import type { SimState } from "../engine/types";
import { CATEGORY_GLYPH, IncidentIcon } from "../art/Icons";
import { StatusPill, cx, pct } from "../ui";
import styles from "./Dashboard.module.css";

export function facilityPositions(s: SimState): Map<string, { x: number; y: number; r: number }> {
  const out = new Map<string, { x: number; y: number; r: number }>();
  for (const sec of s.sectors) {
    const list = s.facilities.filter((f) => f.sectorId === sec.id);
    // habitats first, at the heart of their sector
    list.sort((a, b) => Number(!!FACILITIES[b.kind].housing) - Number(!!FACILITIES[a.kind].housing));
    let ring = 0;
    let slot = 0;
    for (const f of list) {
      const slots = ring === 0 ? 1 : ring * 6;
      const ang = (slot / slots) * Math.PI * 2 + ring * 0.5;
      const rad = ring * 31;
      out.set(f.id, { x: sec.x + Math.cos(ang) * rad, y: sec.y + Math.sin(ang) * rad * 0.82, r: FACILITIES[f.kind].housing ? 13 : 10 });
      slot++;
      if (slot >= slots) {
        ring++;
        slot = 0;
      }
    }
  }
  return out;
}

function blob(cx: number, cy: number, r: number, rng: Rng): string {
  const k = 14;
  const ph = [rng.range(0, 6), rng.range(0, 6)];
  const pts = Array.from({ length: k }, (_, i) => {
    const a = (i / k) * Math.PI * 2;
    const rr = r * (1 + 0.07 * Math.sin(a * 3 + ph[0]) + 0.05 * Math.sin(a * 5 + ph[1]));
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.82];
  });
  // smooth closed curve through the points
  let d = `M${((pts[0][0] + pts[k - 1][0]) / 2).toFixed(1)},${((pts[0][1] + pts[k - 1][1]) / 2).toFixed(1)}`;
  for (let i = 0; i < k; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % k];
    d += ` Q${p[0].toFixed(1)},${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)},${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return d + "Z";
}

const Terrain = memo(function Terrain({ seed }: { seed: string }) {
  const { contours, craters, rocks } = useMemo(() => {
    const rng = new Rng(hashSeed(seed + "|terrain"));
    const contours: string[] = [];
    for (let h = 0; h < 4; h++) {
      const cx = rng.pick([rng.range(40, 260), rng.range(740, 960)]);
      const cy = rng.range(40, MAP_H - 40);
      const phases = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
      for (let j = 1; j <= 6; j++) {
        const base = 26 * j + rng.range(-4, 4);
        let d = "";
        for (let i = 0; i <= 48; i++) {
          const a = (i / 48) * Math.PI * 2;
          const r = base * (1 + 0.18 * Math.sin(a * 2 + phases[0]) + 0.1 * Math.sin(a * 3 + phases[1] + j * 0.2) + 0.05 * Math.sin(a * 7 + phases[2]));
          d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * r * 1.3).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
        }
        contours.push(d + "Z");
      }
    }
    const craters = Array.from({ length: 7 }, () => ({ x: rng.range(20, MAP_W - 20), y: rng.range(20, MAP_H - 20), r: rng.range(6, 26) }));
    const rocks = Array.from({ length: 90 }, () => ({ x: rng.range(0, MAP_W), y: rng.range(0, MAP_H), r: rng.range(0.6, 1.8) }));
    return { contours, craters, rocks };
  }, [seed]);
  return (
    <g>
      <rect width={MAP_W} height={MAP_H} fill="url(#mapGround)" />
      {contours.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="rgba(216,140,100,0.11)" strokeWidth={i % 6 === 5 ? 1.2 : 0.8} />
      ))}
      {craters.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r={c.r} fill="rgba(0,0,0,0.18)" stroke="rgba(216,140,100,0.16)" />
          <path d={`M${c.x - c.r * 0.7},${c.y - c.r * 0.5} A${c.r} ${c.r} 0 0 1 ${c.x + c.r * 0.7},${c.y - c.r * 0.5}`} fill="none" stroke="rgba(245,230,210,0.12)" />
        </g>
      ))}
      {rocks.map((r, i) => (
        <circle key={i} cx={r.x} cy={r.y} r={r.r} fill="rgba(245,220,200,0.09)" />
      ))}
    </g>
  );
});

const STATUS_COLOR: Record<string, string> = {
  operational: "rgba(245,247,250,0.4)",
  repair: "var(--signal)",
  disabled: "#ff5a4a",
};

export function ColonyMap({ s, selected, onSelect }: { s: SimState; selected: string | null; onSelect: (id: string | null) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const pos = useMemo(() => facilityPositions(s), [s, s.facilities.length, s.sectors.length]);
  const zones = useMemo(() => {
    const rng = new Rng(hashSeed(s.config.seed + "|zones"));
    return s.sectors.map((sec) => {
      const n = s.facilities.filter((f) => f.sectorId === sec.id).length;
      const rings = n <= 1 ? 0 : n <= 7 ? 1 : n <= 19 ? 2 : 3;
      return { sec, d: blob(sec.x, sec.y, 34 + rings * 31, rng), r: 34 + rings * 31 };
    });
  }, [s, s.facilities.length, s.sectors.length]);

  const hour = s.t % 24;
  const day = daylight(hour);
  const dark = 1 - day;
  const tau = s.weather.tau;
  const openByFacility = new Map<string, (typeof s.incidents)[number]>();
  for (const i of s.incidents) if (i.status !== "resolved" && i.facilityId) openByFacility.set(i.facilityId, i);
  const hovered = hover ? s.facilities.find((f) => f.id === hover) : null;
  const hp = hovered ? pos.get(hovered.id) : null;

  return (
    <div className={styles.map}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className={styles.mapSvg} role="img" aria-label={`Map of ${s.config.name}`} onClick={() => onSelect(null)}>
        <defs>
          <radialGradient id="mapGround" cx="50%" cy="52%" r="70%">
            <stop offset="0" stopColor="#2a1610" />
            <stop offset="0.7" stopColor="#150c09" />
            <stop offset="1" stopColor="#0a0706" />
          </radialGradient>
          <filter id="dustNoise" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.006 0.018" numOctaves="3" seed="7" />
            <feColorMatrix values="0 0 0 0 0.78  0 0 0 0 0.42  0 0 0 0 0.25  0 0 0 1.4 -0.35" />
          </filter>
          <linearGradient id="dusk" x1="0" x2="1">
            <stop offset="0" stopColor="#ff9f43" stopOpacity="0.14" />
            <stop offset="1" stopColor="#ff9f43" stopOpacity="0" />
          </linearGradient>
        </defs>

        <Terrain seed={s.config.seed} />

        {/* corridors to the hub and the power ring */}
        {s.sectors.map((sec) => (
          <g key={`c-${sec.id}`}>
            <line x1={MAP_CX} y1={MAP_CY} x2={sec.x} y2={sec.y} stroke="rgba(245,247,250,0.16)" strokeWidth="7" strokeLinecap="round" />
            <line x1={MAP_CX} y1={MAP_CY} x2={sec.x} y2={sec.y} stroke="#160d0a" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        ))}
        {s.sectors.length > 1 &&
          s.sectors.map((sec, i) => {
            const nx = s.sectors[(i + 1) % s.sectors.length];
            if (s.sectors.length === 2 && i === 1) return null;
            return (
              <line
                key={`p-${sec.id}`}
                x1={sec.x}
                y1={sec.y}
                x2={nx.x}
                y2={nx.y}
                className={cx(styles.powerLine, s.power.shed > 0 && styles.powerShort)}
              />
            );
          })}

        {/* sector zones */}
        {zones.map(({ sec, d, r }, i) => (
          <g key={sec.id}>
            <path d={d} fill="rgba(245,247,250,0.025)" stroke="rgba(245,247,250,0.22)" strokeDasharray="3 5" />
            <text x={sec.x} y={sec.y - r * 0.82 - 10} textAnchor="middle" className={styles.mapSector}>
              <tspan className={styles.mapSectorIdx}>{String.fromCharCode(65 + i)} </tspan>
              {sec.name}
            </text>
            <text x={sec.x} y={sec.y - r * 0.82 + 3} textAnchor="middle" className={styles.mapSectorKind}>
              {SECTOR_KINDS[sec.kind].label}
            </text>
          </g>
        ))}

        {/* command hub */}
        <g transform={`translate(${MAP_CX} ${MAP_CY})`}>
          <circle r="15" fill="#0d1014" stroke="var(--mars)" strokeWidth="1.4" />
          <circle r="5" fill="var(--mars)" />
          <circle r="22" fill="none" stroke="var(--mars)" strokeOpacity="0.3" strokeDasharray="2 4" className={styles.hubSpin} />
        </g>

        {/* vehicles on missions */}
        {s.vehicles.map((v) => {
          const m = v.mission;
          return (
            <g key={v.id}>
              {m && (
                <>
                  <line x1={v.x} y1={v.y} x2={m.targetX} y2={m.targetY} stroke="var(--signal)" strokeOpacity="0.35" strokeDasharray="2 5" />
                  <path d={`M${m.targetX - 6},${m.targetY} H${m.targetX + 6} M${m.targetX},${m.targetY - 6} V${m.targetY + 6}`} stroke="var(--signal)" strokeOpacity="0.6" />
                </>
              )}
              <g transform={`translate(${v.x} ${v.y})`} className={cx(v.status === "stranded" && styles.blink)}>
                <title>
                  {v.name} — {VEHICLES[v.kind].label}
                </title>
                <path d="M0,-6 L5,4 L-5,4 Z" fill={v.status === "stranded" ? "#ff5a4a" : v.status === "maintenance" ? "var(--ink-40)" : "var(--signal)"} stroke="#0a0706" strokeWidth="1" />
              </g>
            </g>
          );
        })}

        {/* facilities */}
        {s.facilities.map((f) => {
          const p = pos.get(f.id);
          if (!p) return null;
          const def = FACILITIES[f.kind];
          const inc = openByFacility.get(f.id);
          const building = f.repairReason === "Under construction";
          const off = !f.enabled;
          const unpowered = isRunning(f) && !f.powered && def.power > 0;
          return (
            <g
              key={f.id}
              transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`}
              className={styles.fac}
              onPointerEnter={() => setHover(f.id)}
              onPointerLeave={() => setHover((h) => (h === f.id ? null : h))}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(f.id);
              }}
              role="button"
              tabIndex={0}
              aria-label={`${f.name}, ${f.status}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(f.id);
              }}
            >
              {inc && <circle r={p.r + 9} fill="none" stroke={INCIDENTS[inc.kind].color} strokeWidth="1.5" className={styles.pulse} />}
              {selected === f.id && <circle r={p.r + 5} fill="none" stroke="var(--white)" strokeWidth="1.2" />}
              <circle
                r={p.r}
                fill={building ? "transparent" : "#0d1014"}
                stroke={off ? "var(--ink-25)" : building ? "var(--ink-60)" : STATUS_COLOR[f.status]}
                strokeWidth={f.status === "operational" ? 1 : 1.8}
                strokeDasharray={off || building ? "2 3" : undefined}
              />
              {def.housing && dark > 0.05 && f.status !== "disabled" && <circle r={p.r - 3} fill="#ffcf7a" opacity={dark * 0.22} />}
              <g
                stroke={off || unpowered ? "var(--ink-25)" : CATEGORIES[def.category].color}
                fill="none"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform={p.r > 11 ? "scale(1.15)" : "scale(0.9)"}
              >
                {CATEGORY_GLYPH[def.category]}
              </g>
              {inc && (
                <g transform={`translate(${p.r * 0.75} ${-p.r * 0.75})`}>
                  <circle r="8" fill="#0d1014" stroke={INCIDENTS[inc.kind].color} />
                  <g transform="translate(-6 -6)" color={INCIDENTS[inc.kind].color}>
                    <IncidentIcon kind={inc.kind} size={12} />
                  </g>
                </g>
              )}
            </g>
          );
        })}

        {/* light and weather */}
        <rect width={MAP_W} height={MAP_H} fill="#02040b" opacity={0.36 * dark} pointerEvents="none" />
        {day > 0 && day < 0.35 && <rect width={MAP_W} height={MAP_H} fill="url(#dusk)" opacity={1 - day / 0.35} pointerEvents="none" transform={hour > 12 ? `scale(-1 1) translate(${-MAP_W} 0)` : undefined} />}
        {tau > 0.9 && (
          <rect width={MAP_W} height={MAP_H} filter="url(#dustNoise)" opacity={Math.min(0.5, (tau - 0.9) / 6)} pointerEvents="none" className={styles.dust} />
        )}
      </svg>

      {hovered && hp && (
        <div className={styles.mapTip} style={{ left: `${(hp.x / MAP_W) * 100}%`, top: `${(hp.y / MAP_H) * 100}%` }}>
          <span className={styles.mapTipName}>{hovered.name}</span>
          <StatusPill status={hovered.enabled ? hovered.status : "offline"} label={hovered.repairReason === "Under construction" ? "Under construction" : undefined} />
          <span className={styles.mapTipRow}>
            Output {pct(hovered.efficiency)} · Integrity {Math.round(hovered.integrity)}%
          </span>
          {FACILITIES[hovered.kind].housing ? (
            <span className={styles.mapTipRow}>
              {hovered.residents} of {FACILITIES[hovered.kind].housing} residents
            </span>
          ) : null}
          {openByFacility.get(hovered.id) && <span className={styles.mapTipAlert}>{openByFacility.get(hovered.id)!.title}</span>}
        </div>
      )}

      <MapLegend s={s} />
    </div>
  );
}

function MapLegend({ s }: { s: SimState }) {
  const w = s.weather;
  const atmo = w.stormScale !== "none" ? `${w.stormScale[0].toUpperCase()}${w.stormScale.slice(1)} dust storm` : w.tau > 0.8 ? "Hazy" : "Clear";
  return (
    <div className={styles.mapLegend}>
      <span>
        <i className={styles.lgRing} /> Available
      </span>
      <span>
        <i className={cx(styles.lgRing, styles.lgRepair)} /> Repair
      </span>
      <span>
        <i className={cx(styles.lgRing, styles.lgDisabled)} /> Disabled
      </span>
      <span>
        <i className={styles.lgTri} /> Vehicle
      </span>
      <span className={styles.lgWeather}>
        {atmo} · τ {w.tau.toFixed(1)} · {Math.round(w.extTemp)}°C outside
        {w.flareHoursLeft > 0 ? " · solar particle event" : ""}
      </span>
    </div>
  );
}

