import type { ReactNode } from "react";
import { COMMS, VEHICLES } from "../engine/catalog";
import type { CommsKind, VehicleKind } from "../engine/types";
import { Ground, Stars } from "./FacilityArt";

const L = { fill: "none", stroke: "var(--art-line)", strokeWidth: 1.3, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const D = { ...L, stroke: "var(--art-dim)", strokeWidth: 1 };
const A = { ...L, stroke: "var(--art-accent)" };
const AF = { fill: "var(--art-accent)", stroke: "none" };
const AFS = { fill: "var(--art-accent)", fillOpacity: 0.16, stroke: "var(--art-accent)", strokeWidth: 1.2 };

function Wheel({ x, y, r = 8 }: { x: number; y: number; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} {...L} />
      <circle cx={x} cy={y} r={r * 0.35} {...D} />
      {[0, 60, 120].map((a) => (
        <path key={a} d={`M${x - r * 0.8} ${y} H${x + r * 0.8}`} {...D} transform={`rotate(${a} ${x} ${y})`} />
      ))}
    </g>
  );
}

const VEHICLE_ART: Record<VehicleKind, () => ReactNode> = {
  pressurized_rover: () => (
    <g>
      <path d="M36 82 V62 C36 54 44 48 54 48 H140 C152 48 164 56 166 68 L168 82 Z" {...L} />
      <path d="M140 48 L156 66 H120 V48" {...D} />
      <path d="M124 52 H140 L152 64 H124 Z" {...AFS} />
      {[52, 70, 88, 106].map((x) => (
        <rect key={x} x={x} y="56" width="12" height="8" rx="2" {...AF} opacity={0.8} />
      ))}
      <path d="M60 48 V40 M56 40 H64" {...L} />
      <circle cx="80" cy="40" r="5" {...D} />
      {[54, 98, 146].map((x) => (
        <Wheel key={x} x={x} y={88} r={10} />
      ))}
    </g>
  ),
  utility_crawler: () => (
    <g>
      <path d="M50 92 H140 A6 6 0 0 0 140 80 H50 A6 6 0 0 0 50 92 Z" {...L} />
      {[56, 72, 88, 104, 120, 136].map((x) => (
        <circle key={x} cx={x} cy="86" r="3.5" {...D} />
      ))}
      <rect x="60" y="56" width="62" height="24" {...L} />
      <path d="M72 56 V40 H100 L106 56" {...L} />
      <path d="M78 44 H98 L102 54 H78 Z" {...AFS} />
      <path d="M122 64 L150 58 L164 74" {...L} strokeWidth={2.2} />
      <path d="M156 70 L176 70 L170 88 L156 84 Z" {...L} />
      <path d="M160 78 L172 78" {...A} />
      <path d="M40 92 l6 -6 M30 92 l4 -4" {...D} />
    </g>
  ),
  cargo_hauler: () => (
    <g>
      <rect x="20" y="46" width="104" height="36" rx="2" {...L} />
      {[36, 52, 68, 84, 100].map((x) => (
        <path key={x} d={`M${x} 46 V82`} {...D} />
      ))}
      <rect x="28" y="52" width="40" height="24" {...AFS} />
      <path d="M124 82 V52 H150 L170 66 V82 Z" {...L} />
      <path d="M132 56 H148 L162 66 H132 Z" {...D} />
      <ellipse cx="146" cy="40" rx="14" ry="5" {...L} />
      <ellipse cx="146" cy="40" rx="6" ry="2" {...AF} />
      <path d="M146 45 V52" {...L} />
      {[38, 66, 104, 154].map((x) => (
        <Wheel key={x} x={x} y={88} r={9} />
      ))}
      <path d="M172 72 c6 -1 8 2 12 0" {...A} />
    </g>
  ),
  survey_drone: () => (
    <g>
      <path d="M100 52 L58 98 M100 52 L142 98" {...A} strokeDasharray="2 3" opacity={0.8} />
      <path d="M58 98 Q100 104 142 98" {...AFS} />
      <rect x="84" y="36" width="32" height="14" rx="5" {...L} />
      <path d="M84 40 L58 32 M116 40 L142 32 M84 46 L62 54 M116 46 L138 54" {...L} />
      {[[58, 30], [142, 30], [62, 54], [138, 54]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="16" ry="2.5" {...D} />
      ))}
      <circle cx="100" cy="52" r="3" {...AF} />
      <path d="M100 50 V53" {...L} />
    </g>
  ),
};

export function VehicleArt({ kind, className }: { kind: VehicleKind; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} style={{ ["--art-accent" as string]: "var(--signal)" }} role="img" aria-label={VEHICLES[kind].label}>
      <Stars seed={kind.length + 2} />
      {VEHICLE_ART[kind]()}
      <Ground seed={kind.length + 5} />
    </svg>
  );
}

export function CommsArt({ kind, className }: { kind: CommsKind; className?: string }) {
  return (
    <svg viewBox="0 0 200 120" className={className} style={{ ["--art-accent" as string]: "#c9a7ff" }} role="img" aria-label={COMMS[kind].label}>
      <Stars seed={kind === "antenna" ? 4 : 9} />
      {kind === "antenna" ? (
        <g>
          <path d="M60 30 C70 62 104 82 138 74" {...L} />
          <path d="M60 30 C88 34 128 52 138 74" {...D} />
          <path d="M60 30 L138 74" {...D} strokeDasharray="2 3" />
          <path d="M99 52 L120 34" {...L} />
          <circle cx="122" cy="32" r="3" {...AF} />
          <path d="M128 24 a10 10 0 0 1 4 14 M134 18 a18 18 0 0 1 6 24" {...A} />
          <path d="M96 70 L86 98 M104 66 L118 98 M80 98 H124" {...L} />
          <path d="M92 84 H110" {...D} />
        </g>
      ) : (
        <g>
          <path d="M-10 128 A170 170 0 0 1 160 128" fill="none" stroke="var(--art-dim)" strokeWidth="1" />
          <path d="M0 128 A150 150 0 0 1 150 128" fill="none" stroke="var(--regolith)" strokeOpacity="0.35" strokeWidth="6" />
          <rect x="92" y="36" width="20" height="18" rx="2" {...L} />
          <rect x="44" y="40" width="40" height="10" {...AFS} />
          <rect x="120" y="40" width="40" height="10" {...AFS} />
          <path d="M54 40 V50 M64 40 V50 M74 40 V50 M130 40 V50 M140 40 V50 M150 40 V50 M84 45 H92 M112 45 H120" {...D} />
          <path d="M102 54 V60 M96 64 A8 8 0 0 0 108 64" {...L} />
          <path d="M102 66 L84 98" {...A} strokeDasharray="2 4" />
        </g>
      )}
    </svg>
  );
}
