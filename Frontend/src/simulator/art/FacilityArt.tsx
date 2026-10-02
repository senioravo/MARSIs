// Line-drawn technical illustrations, one per facility type.
// Drawn on a 200×120 plate with the horizon at y=98. Colour comes from CSS:
// --art-line (ink), --art-dim (secondary ink), --art-accent (category colour).

import type { ReactNode } from "react";
import { CATEGORIES, FACILITIES } from "../engine/catalog";
import type { FacilityKind } from "../engine/types";

const L = { fill: "none", stroke: "var(--art-line)", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const D = { ...L, stroke: "var(--art-dim)", strokeWidth: 1 };
const A = { ...L, stroke: "var(--art-accent)" };
const AF = { fill: "var(--art-accent)", stroke: "none" };
const AFS = { fill: "var(--art-accent)", fillOpacity: 0.16, stroke: "var(--art-accent)", strokeWidth: 1.2 };

export function Ground({ y = 98, seed = 1 }: { y?: number; seed?: number }) {
  const pebbles = [18, 41, 63, 128, 152, 181].map((x, i) => ({ x: (x + seed * 13) % 196, w: 2 + ((i * 7 + seed) % 4) }));
  return (
    <g>
      <path d={`M2 ${y} H198`} {...L} />
      <path d={`M10 ${y + 6} H44 M60 ${y + 6} H92 M118 ${y + 6} H170 M30 ${y + 12} H66 M96 ${y + 12} H140 M160 ${y + 12} H190`} {...D} strokeDasharray="1 4" />
      {pebbles.map((p, i) => (
        <path key={i} d={`M${p.x} ${y} q${p.w / 2} -${p.w * 0.7} ${p.w} 0`} {...D} />
      ))}
    </g>
  );
}

export function Stars({ seed = 3 }: { seed?: number }) {
  const pts = Array.from({ length: 7 }, (_, i) => ({ x: (i * 37 + seed * 23) % 190 + 5, y: (i * 19 + seed * 11) % 40 + 6, r: i % 3 === 0 ? 0.9 : 0.55 }));
  return (
    <g>
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="var(--art-dim)" />
      ))}
    </g>
  );
}

const ART: Record<FacilityKind, () => ReactNode> = {
  habitat_dome: () => (
    <g>
      <path d="M46 98 A54 54 0 0 1 154 98" {...D} strokeDasharray="2 3" />
      <path d="M52 98 A48 48 0 0 1 148 98" {...L} />
      <path d="M62 98 A38 38 0 0 1 138 98" {...D} />
      <path d="M100 50 V98 M72 62 L84 98 M128 62 L116 98" {...D} />
      {[76, 92, 108, 124].map((x, i) => (
        <rect key={x} x={x - 4} y={i === 0 || i === 3 ? 80 : 74} width="8" height="6" rx="1.5" {...AF} opacity={0.85} />
      ))}
      <path d="M148 98 V84 H172 V98" {...L} />
      <rect x="164" y="88" width="5" height="10" {...A} />
      <path d="M100 50 V40" {...L} />
      <circle cx="100" cy="38" r="2" {...AF} />
    </g>
  ),
  lava_tube: () => (
    <g>
      <path d="M2 70 C30 64 46 52 70 50 C98 48 120 40 150 46 C172 50 186 60 198 62" {...L} />
      <path d="M10 82 C40 78 60 72 90 74 M120 70 C150 66 170 72 196 74" {...D} strokeDasharray="3 3" />
      <path d="M60 98 C60 76 76 64 100 64 C124 64 140 76 140 98" {...L} />
      <path d="M68 98 C68 80 82 70 100 70 C118 70 132 80 132 98" {...AFS} />
      <path d="M92 98 V84 A8 8 0 0 1 108 84 V98" {...L} />
      {[78, 122].map((x) => (
        <rect key={x} x={x - 4} y="82" width="8" height="5" rx="1" {...AF} />
      ))}
      <path d="M84 76 H116" {...D} />
    </g>
  ),
  inflatable_module: () => (
    <g>
      <path d="M48 62 H152 A20 20 0 0 1 152 92 H48 A20 20 0 0 1 48 62 Z" {...L} />
      {[66, 84, 102, 120, 138].map((x) => (
        <path key={x} d={`M${x} 62 C${x - 4} 72 ${x - 4} 82 ${x} 92`} {...D} />
      ))}
      <path d="M58 92 L52 98 M142 92 L148 98 M100 92 V98" {...L} />
      <rect x="160" y="70" width="10" height="14" rx="2" {...A} />
      {[74, 92, 110, 128].map((x) => (
        <circle key={x} cx={x} cy="77" r="2.4" {...AF} />
      ))}
    </g>
  ),
  o2_electrolysis: () => (
    <g>
      <rect x="40" y="62" width="70" height="36" {...L} />
      <path d="M40 72 H110 M52 62 V54 H98 V62" {...D} />
      <rect x="122" y="40" width="18" height="58" rx="9" {...L} />
      <rect x="148" y="52" width="16" height="46" rx="8" {...L} />
      <path d="M110 84 H122 M140 90 H148" {...L} />
      {[[131, 34, 3], [136, 24, 2.2], [129, 15, 1.6], [156, 44, 2.4], [160, 34, 1.7]].map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} {...A} />
      ))}
      <rect x="126" y="62" width="10" height="28" rx="5" {...AF} opacity={0.75} />
      {[50, 64, 78, 92].map((x) => (
        <rect key={x} x={x} y="78" width="8" height="12" {...D} />
      ))}
    </g>
  ),
  moxie_array: () => (
    <g>
      {[30, 64, 98, 132].map((x) => (
        <g key={x}>
          <rect x={x} y="64" width="28" height="34" {...L} />
          {[70, 76, 82, 88].map((y) => (
            <path key={y} d={`M${x + 4} ${y} H${x + 24}`} {...D} />
          ))}
          <rect x={x + 9} y="56" width="10" height="8" {...A} />
        </g>
      ))}
      <path d="M16 46 H40 l-5 -4 M40 46 l-5 4" {...D} />
      <path d="M160 40 H186 l-5 -4 M186 40 l-5 4" {...A} />
      <path d="M44 56 V46 H146 V56" {...L} />
      <circle cx="173" cy="28" r="4" {...AF} />
    </g>
  ),
  ice_extractor: () => (
    <g>
      <path d="M70 98 L90 30 L110 98 M76 78 H104 M82 56 H98" {...L} />
      <path d="M90 30 V22 M86 22 H94" {...L} />
      <path d="M90 98 V112" {...L} strokeWidth={2} />
      <ellipse cx="90" cy="114" rx="40" ry="5" {...AFS} />
      <rect x="128" y="70" width="34" height="28" rx="3" {...L} />
      <path d="M110 86 H128" {...L} />
      <path d="M140 64 c-3 4 -3 6 0 7 c3 -1 3 -3 0 -7 z M152 60 c-3 4 -3 6 0 7 c3 -1 3 -3 0 -7 z" {...AF} />
      <path d="M134 84 H156" {...D} />
    </g>
  ),
  water_recycler: () => (
    <g>
      <rect x="60" y="44" width="44" height="54" rx="6" {...L} />
      {[56, 64, 72, 80, 88].map((y) => (
        <path key={y} d={`M64 ${y} H100`} {...D} strokeDasharray={y % 16 === 0 ? "0" : "2 2"} />
      ))}
      <rect x="64" y="70" width="36" height="24" {...AF} opacity={0.22} />
      <path d="M104 60 C140 60 150 70 150 82 C150 94 136 98 120 98" {...A} />
      <path d="M124 94 l-5 4 l5 4" {...A} />
      <path d="M150 56 c-6 8 -6 12 0 14 c6 -2 6 -6 0 -14 z" {...AF} />
      <path d="M40 98 V76 H60" {...L} />
    </g>
  ),
  greenhouse: () => (
    <g>
      <path d="M30 98 V72 C30 52 52 40 100 40 C148 40 170 52 170 72 V98" {...L} />
      {[52, 76, 100, 124, 148].map((x) => (
        <path key={x} d={`M${x} 98 V${x === 100 ? 40 : x === 76 || x === 124 ? 43 : 50}`} {...D} />
      ))}
      <path d="M30 72 H170" {...D} />
      {[44, 60, 84, 116, 140, 156].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 98 V${86 - (i % 2) * 4}`} {...A} />
          <path d={`M${x} ${90 - (i % 2) * 4} c-6 -2 -7 -7 -6 -10 c4 1 6 4 6 10 c0 -6 3 -9 7 -10 c1 4 -1 8 -7 10`} {...AF} opacity={0.85} />
        </g>
      ))}
      <path d="M36 92 H164" {...D} strokeDasharray="1 3" />
    </g>
  ),
  algae_bioreactor: () => (
    <g>
      <path d="M36 98 V40 H164 V98" {...D} />
      {[48, 66, 84, 102, 120, 138].map((x, i) => (
        <g key={x}>
          <rect x={x} y="46" width="12" height="50" rx="6" {...L} />
          <rect x={x + 2} y={58 + (i % 3) * 4} width="8" height={36 - (i % 3) * 4} rx="4" {...AF} opacity={0.7} />
          <circle cx={x + 6} cy={54 + (i % 2) * 3} r="1.4" {...A} />
        </g>
      ))}
      <path d="M36 40 H164 M44 98 H156" {...L} />
    </g>
  ),
  solar_array: () => (
    <g>
      <circle cx="168" cy="26" r="9" {...AFS} />
      {[0, 1, 2].map((i) => {
        const x = 18 + i * 56;
        return (
          <g key={i}>
            <path d={`M${x} 80 L${x + 20} 52 H${x + 62} L${x + 42} 80 Z`} {...L} />
            <path d={`M${x + 7} 70.7 H${x + 49} M${x + 13} 61.4 H${x + 55} M${x + 34} 52 L${x + 14} 80 M${x + 48} 52 L${x + 28} 80`} {...D} />
            <path d={`M${x + 31} 80 V98 M${x + 24} 98 H${x + 38}`} {...L} />
          </g>
        );
      })}
      <path d="M18 80 L38 52 H80 L60 80 Z" {...AFS} opacity={0.6} />
    </g>
  ),
  fission_reactor: () => (
    <g>
      <path d="M40 98 C52 80 70 74 100 74 C130 74 148 80 160 98" {...L} />
      <path d="M50 98 C60 86 74 82 100 82 C126 82 140 86 150 98" {...D} strokeDasharray="2 3" />
      <rect x="90" y="88" width="20" height="22" rx="4" {...AFS} />
      <path d="M100 74 V30" {...L} />
      {[-1, 1].map((d) =>
        [0, 1, 2].map((i) => <path key={`${d}${i}`} d={`M100 ${36 + i * 12} L${100 + d * (28 + i * 8)} ${30 + i * 12}`} {...L} />),
      )}
      {[-1, 1].map((d) => (
        <path key={d} d={`M100 36 L${100 + d * 28} 30 L${100 + d * 44} 54 L100 60`} {...D} />
      ))}
      <circle cx="100" cy="99" r="2" {...AF} />
    </g>
  ),
  rtg: () => (
    <g>
      <rect x="86" y="54" width="28" height="44" rx="4" {...L} />
      {[58, 66, 74, 82, 90].map((y) => (
        <path key={y} d={`M74 ${y} H86 M114 ${y} H126`} {...L} />
      ))}
      <rect x="94" y="62" width="12" height="28" rx="2" {...AF} opacity={0.75} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${88 + i * 12} 46 c-3 -4 3 -6 0 -10 c-3 -4 3 -6 0 -10`} {...A} />
      ))}
      <path d="M100 98 L84 112 M100 98 L116 112" {...D} />
    </g>
  ),
  battery_bank: () => (
    <g>
      {[28, 64, 100, 136].map((x, i) => (
        <g key={x}>
          <rect x={x} y="48" width="30" height="50" rx="2" {...L} />
          {[0, 1, 2, 3, 4].map((j) => (
            <rect key={j} x={x + 6} y={88 - j * 8} width="18" height="5" {...(j < 4 - (i % 3) ? AF : D)} opacity={j < 4 - (i % 3) ? 0.85 : 1} />
          ))}
          <path d={`M${x + 10} 48 V43 M${x + 20} 48 V43`} {...L} />
        </g>
      ))}
      <path d="M38 43 H156" {...D} />
      <path d="M176 60 l-6 12 h8 l-6 12" {...A} />
    </g>
  ),
  regolith_processor: () => (
    <g>
      <path d="M22 50 H58 L50 70 H30 Z" {...L} />
      <path d="M26 46 l4 -4 l4 3 l5 -5 l6 4 l5 -3 l4 5" {...D} />
      <path d="M40 70 V76 L110 64" {...L} />
      <path d="M44 80 L114 68" {...D} />
      <rect x="110" y="44" width="56" height="54" {...L} />
      <path d="M124 44 V28 H136 V44" {...L} />
      <path d="M128 24 c-2 -4 2 -6 0 -10 M134 24 c-2 -4 2 -6 0 -10" {...D} />
      <rect x="126" y="72" width="24" height="18" rx="2" {...AFS} />
      <path d="M132 86 c0 -6 6 -6 6 -12 c0 6 6 6 6 12 z" {...AF} />
      {[150, 158].map((x) => (
        <rect key={x} x={x} y="54" width="5" height="5" {...D} />
      ))}
    </g>
  ),
  fabricator: () => (
    <g>
      <rect x="30" y="50" width="140" height="48" {...L} />
      <path d="M30 50 L46 36 H154 L170 50" {...D} />
      <path d="M60 98 V86 H140 V98" {...D} />
      <path d="M66 86 V70 L86 62 L102 72" {...L} strokeWidth={2} />
      <circle cx="66" cy="70" r="3" {...L} />
      <circle cx="86" cy="62" r="3" {...L} />
      <path d="M102 72 V78" {...A} />
      <g transform="translate(112 80)">
        <circle r="6" {...AFS} />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M0 -6 V-9" {...A} transform={`rotate(${a})`} />
        ))}
        <circle r="2" {...AF} />
      </g>
    </g>
  ),
  recycling_center: () => (
    <g>
      <rect x="70" y="48" width="96" height="50" {...L} />
      <path d="M70 48 L84 36 H166 V48" {...D} />
      <path d="M20 58 L70 74" {...L} />
      <path d="M20 64 L70 80" {...D} />
      {[28, 40, 52].map((x, i) => (
        <rect key={x} x={x} y={52 + i * 4} width="7" height="5" {...D} transform={`rotate(${i * 20} ${x} 54)`} />
      ))}
      <g transform="translate(118 74)" {...A}>
        <path d="M-10 6 A12 12 0 0 1 -4 -10" />
        <path d="M-6 -12 l2 2 l-3 2" />
        <path d="M8 -8 A12 12 0 0 1 8 8" />
        <path d="M11 6 l-3 2 l-1 -3" />
        <path d="M4 11 A12 12 0 0 1 -11 2" />
        <path d="M-12 -1 l1 3 l3 -1" />
      </g>
    </g>
  ),
  sabatier_plant: () => (
    <g>
      <rect x="34" y="40" width="24" height="58" rx="12" {...L} />
      <path d="M40 56 H52 M40 66 H52 M40 76 H52" {...D} />
      <path d="M58 60 H82 M58 82 H82" {...L} />
      {[[104, 72, 18], [150, 76, 14]].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} {...L} />
          <circle cx={x} cy={y} r={r - 6} {...AFS} />
          <path d={`M${x - r * 0.6} ${y + r * 0.8} L${x - r * 0.8} 98 M${x + r * 0.6} ${y + r * 0.8} L${x + r * 0.8} 98`} {...L} />
        </g>
      ))}
      <path d="M122 72 H136" {...L} />
      <path d="M46 34 c-3 -4 3 -6 0 -10" {...D} />
    </g>
  ),
  medical_bay: () => (
    <g>
      <path d="M36 98 V58 C36 48 44 42 54 42 H146 C156 42 164 48 164 58 V98" {...L} />
      <rect x="86" y="54" width="28" height="28" rx="3" {...AFS} />
      <path d="M100 60 V76 M92 68 H108" {...A} strokeWidth={3} />
      <path d="M44 74 h8 l3 -6 l4 12 l3 -6 h6" {...A} />
      <circle cx="140" cy="76" r="12" {...L} />
      <circle cx="140" cy="76" r="6" {...D} />
      <path d="M128 98 H152" {...D} />
    </g>
  ),
  warehouse: () => (
    <g>
      <path d="M24 98 V64 C24 46 60 36 100 36 C140 36 176 46 176 64 V98" {...L} />
      {[44, 72, 100, 128, 156].map((x) => (
        <path key={x} d={`M${x} ${x === 100 ? 36 : x === 72 || x === 128 ? 38 : 44} V50`} {...D} />
      ))}
      {[[40, 82], [58, 82], [49, 66], [118, 82], [136, 82], [154, 82], [127, 66], [145, 66]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="16" height="16" {...(i === 2 || i === 6 ? AFS : L)} />
      ))}
      <path d="M84 98 V66 H116 V98" {...D} />
      <path d="M84 74 H116 M84 82 H116 M84 90 H116" {...D} strokeDasharray="2 2" />
    </g>
  ),
  tank_farm: () => (
    <g>
      <path d="M8 98 C30 84 50 82 70 82" {...D} />
      {[[52, 66, 16], [92, 62, 20]].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} {...L} />
          <path d={`M${x - r} ${y} A${r} ${r * 0.35} 0 0 0 ${x + r} ${y}`} {...D} />
          <path d={`M${x - r * 0.7} ${y + r * 0.7} V98 M${x + r * 0.7} ${y + r * 0.7} V98`} {...L} />
        </g>
      ))}
      <rect x="122" y="68" width="60" height="20" rx="10" {...L} />
      <rect x="128" y="72" width="30" height="12" rx="6" {...AFS} />
      <path d="M132 88 V98 M172 88 V98" {...L} />
      <path d="M112 62 H122 V72" {...D} />
    </g>
  ),
  research_lab: () => (
    <g>
      <rect x="40" y="62" width="80" height="36" {...L} />
      <path d="M48 62 A20 20 0 0 1 88 62" {...L} />
      <path d="M68 48 L84 36" {...A} strokeWidth={3} />
      <path d="M52 76 H72 M52 84 H66" {...D} />
      <path d="M140 98 V34 M132 42 H148 M134 52 H146" {...L} />
      <circle cx="140" cy="30" r="3" {...AF} />
      <path d="M96 74 v10 l-5 10 h18 l-5 -10 v-10" {...L} />
      <path d="M93 90 h14 l2 4 h-18 z" {...AF} opacity={0.8} />
      <circle cx="158" cy="44" r="10" {...D} strokeDasharray="2 3" />
    </g>
  ),
};

export function FacilityArt({ kind, className, title }: { kind: FacilityKind; className?: string; title?: string }) {
  const accent = CATEGORIES[FACILITIES[kind].category].color;
  return (
    <svg
      viewBox="0 0 200 120"
      className={className}
      style={{ ["--art-accent" as string]: accent }}
      role="img"
      aria-label={title ?? FACILITIES[kind].label}
    >
      <Stars seed={kind.length} />
      {ART[kind]()}
      <Ground seed={kind.length} />
    </svg>
  );
}
