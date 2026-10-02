import type { ReactNode } from "react";
import { CROPS, ROLES } from "../engine/catalog";
import type { CropKind, Role } from "../engine/types";

const L = { fill: "none", stroke: "var(--art-line)", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const D = { ...L, stroke: "var(--art-dim)", strokeWidth: 1 };
const A = { ...L, stroke: "var(--art-accent)" };
const AF = { fill: "var(--art-accent)", stroke: "none" };

export const ROLE_COLORS: Record<Role, string> = {
  engineer: "#65b8ff",
  technician: "#b8c2cc",
  botanist: "#7ed957",
  medic: "#ff7a8a",
  scientist: "#c9a7ff",
  pilot: "#ff9f43",
  geologist: "#c7a17a",
};

// Mission-patch emblems drawn in a 64×64 badge.
const EMBLEMS: Record<Role, ReactNode> = {
  engineer: (
    <g>
      <path d="M22 42 L36 28" {...A} strokeWidth={3} />
      <path d="M36 28 a7 7 0 1 0 6 -10 l-4 4 l-3 -1 l-1 -3 l4 -4 a7 7 0 0 0 -2 14" {...L} />
      <path d="M20 44 l2 2" {...L} strokeWidth={4} />
    </g>
  ),
  technician: (
    <g>
      <path d="M24 22 L40 42 M40 22 L24 42" {...L} />
      <rect x="20" y="17" width="8" height="8" rx="2" transform="rotate(45 24 21)" {...A} />
      <circle cx="40" cy="43" r="3" {...AF} />
    </g>
  ),
  botanist: (
    <g>
      <path d="M32 46 V30" {...L} />
      <path d="M32 34 C22 34 18 26 20 18 C28 18 32 24 32 34" {...AF} opacity={0.85} />
      <path d="M32 38 C40 38 46 32 44 24 C38 24 32 28 32 38" {...A} />
    </g>
  ),
  medic: (
    <g>
      <path d="M28 18 H36 V28 H46 V36 H36 V46 H28 V36 H18 V28 H28 Z" {...A} />
      <path d="M22 32 h6 l2 -4 l4 8 l2 -4 h6" {...L} />
    </g>
  ),
  scientist: (
    <g>
      <path d="M27 18 V30 L19 44 H45 L37 30 V18" {...L} />
      <path d="M24 18 H40" {...L} />
      <path d="M22 40 L25 35 H39 L42 40 Z" {...AF} opacity={0.85} />
      <circle cx="30" cy="27" r="1.6" {...A} />
    </g>
  ),
  pilot: (
    <g>
      <path d="M32 22 L38 34 H26 Z" {...AF} />
      <path d="M14 32 C22 30 26 34 32 34 C38 34 42 30 50 32 M18 37 C24 36 28 38 32 38 C36 38 40 36 46 37" {...L} />
      <path d="M32 38 V46" {...L} />
    </g>
  ),
  geologist: (
    <g>
      <path d="M22 44 L38 24" {...L} strokeWidth={2} />
      <path d="M32 20 L44 30 L40 32 L30 24 Z" {...L} />
      <path d="M38 44 L42 36 L48 38 L46 46 Z" {...AF} opacity={0.85} />
    </g>
  ),
};

export function RoleBadge({ role, size = 44, className }: { role: Role; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      style={{ ["--art-accent" as string]: ROLE_COLORS[role] }}
      role="img"
      aria-label={ROLES[role].label}
    >
      <circle cx="32" cy="32" r="29" fill="var(--surface-2)" stroke="var(--art-accent)" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="25" {...D} strokeDasharray="1 3" />
      {EMBLEMS[role]}
    </svg>
  );
}

const CROP_ART: Record<CropKind, ReactNode> = {
  potato: (
    <g>
      <path d="M40 46 V24 M40 32 C30 30 28 22 30 16 C36 18 40 24 40 32 M40 28 C48 26 52 20 50 14 C44 16 40 20 40 28" {...A} />
      <path d="M40 46 C34 52 26 52 22 58 M40 46 C46 52 54 54 58 60" {...D} />
      {[[24, 60, 7, 5], [56, 62, 8, 5.5], [40, 64, 6, 4.5]].map(([x, y, rx, ry], i) => (
        <ellipse key={i} cx={x} cy={y} rx={rx} ry={ry} {...AF} opacity={0.75} />
      ))}
    </g>
  ),
  wheat: (
    <g>
      {[30, 40, 50].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 70 C${x} 50 ${x + (i - 1) * 4} 36 ${x + (i - 1) * 6} 20`} {...L} />
          {[22, 28, 34].map((y) => (
            <g key={y}>
              <ellipse cx={x + (i - 1) * 5 - 3} cy={y + 2} rx="2" ry="4" transform={`rotate(-25 ${x + (i - 1) * 5 - 3} ${y + 2})`} {...AF} />
              <ellipse cx={x + (i - 1) * 5 + 3} cy={y + 2} rx="2" ry="4" transform={`rotate(25 ${x + (i - 1) * 5 + 3} ${y + 2})`} {...AF} />
            </g>
          ))}
        </g>
      ))}
    </g>
  ),
  soy: (
    <g>
      <path d="M40 70 V18" {...L} />
      {[26, 40, 54].map((y, i) => (
        <g key={y}>
          <path d={`M40 ${y} C${i % 2 ? 54 : 26} ${y - 4} ${i % 2 ? 60 : 20} ${y + 6} ${i % 2 ? 56 : 24} ${y + 14}`} {...A} />
          <circle cx={i % 2 ? 54 : 26} cy={y + 6} r="2.4" {...AF} />
          <circle cx={i % 2 ? 55 : 25} cy={y + 11} r="2.4" {...AF} />
        </g>
      ))}
    </g>
  ),
  lettuce: (
    <g>
      <path d="M18 56 C18 36 30 28 40 28 C50 28 62 36 62 56 Z" {...A} />
      <path d="M26 56 C26 42 34 36 40 36 C46 36 54 42 54 56" {...L} />
      <path d="M40 56 V40 M33 56 C33 48 36 44 40 42 M47 56 C47 48 44 44 40 42" {...D} />
      <ellipse cx="40" cy="50" rx="10" ry="6" {...AF} opacity={0.5} />
    </g>
  ),
  tomato: (
    <g>
      <path d="M30 70 C30 50 36 34 50 18" {...L} />
      <path d="M36 44 C44 44 50 40 54 34" {...D} />
      {[[44, 50, 7], [54, 40, 5.5], [34, 58, 6]].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} {...AF} opacity={0.9} />
          <path d={`M${x - 2} ${y - r} l2 -2 l2 2`} {...L} strokeWidth={1} />
        </g>
      ))}
    </g>
  ),
};

const CROP_COLOR: Record<CropKind, string> = {
  potato: "#c7a17a",
  wheat: "#e8c46a",
  soy: "#a6d672",
  lettuce: "#7ed957",
  tomato: "#ff6a4a",
};

export function CropArt({ crop, size = 56, className }: { crop: CropKind; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 80 80" width={size} height={size} className={className} style={{ ["--art-accent" as string]: CROP_COLOR[crop] }} role="img" aria-label={CROPS[crop].label}>
      <path d="M8 70 H72" {...D} />
      {CROP_ART[crop]}
    </svg>
  );
}
