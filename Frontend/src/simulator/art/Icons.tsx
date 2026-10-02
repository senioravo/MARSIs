import type { ReactNode, SVGProps } from "react";
import { INCIDENTS } from "../engine/catalog";
import type { FacilityCategory, IncidentKind } from "../engine/types";

const S = { fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

// Each incident type has its own recognisable pictogram (briefing §18).
const INCIDENT_PATHS: Record<IncidentKind, ReactNode> = {
  pressure_leak: (
    <g {...S}>
      <path d="M4 15 A8 8 0 1 1 20 15" />
      <path d="M12 15 L16.5 9" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" />
      <path d="M5 20 h3 M10 20 h4 M16 20 h3" strokeDasharray="1 2" />
    </g>
  ),
  fire: (
    <g {...S}>
      <path d="M12 3 C13 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C9.5 9 10.5 10 11.5 10 C11 7 11 5 12 3 Z" />
      <path d="M12 20 A2.6 2.6 0 0 1 9.5 16.5 C10.5 15.5 11.5 14.5 12 13 C13 14.5 14.5 15.6 14.5 17.4 A2.5 2.5 0 0 1 12 20 Z" fill="currentColor" stroke="none" />
    </g>
  ),
  power_failure: (
    <g {...S}>
      <path d="M13 2 L5 13 H11 L10 22 L18 10 H12 Z" />
      <path d="M3 3 L21 21" />
    </g>
  ),
  radiation: (
    <g {...S}>
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      {[0, 120, 240].map((a) => (
        <path key={a} d="M12 9.5 L9 4.4 A9 9 0 0 1 15 4.4 Z" transform={`rotate(${a} 12 12)`} fill="currentColor" stroke="none" opacity={0.9} />
      ))}
      <circle cx="12" cy="12" r="10" strokeWidth="1.2" />
    </g>
  ),
  comms_failure: (
    <g {...S}>
      <path d="M4 6 C6 13 11 16 17 15" />
      <path d="M4 6 L17 15" strokeDasharray="1.5 2" />
      <path d="M10 15 L8 21 M12 15 L14 21 M7 21 H15" />
      <path d="M16 3 L21 8 M21 3 L16 8" />
    </g>
  ),
  water_leak: (
    <g {...S}>
      <path d="M10 3 C10 3 4 10 4 14 A6 6 0 0 0 16 14 C16 10 10 3 10 3 Z" />
      <path d="M19 12 v2 M20.5 17 v2 M18 20 v1.5" />
      <path d="M7.5 14.5 A2.5 2.5 0 0 0 10 17" />
    </g>
  ),
  oxygen_failure: (
    <g {...S}>
      <circle cx="9" cy="12" r="5" />
      <circle cx="15.5" cy="12" r="5" />
      <path d="M3 21 L21 3" />
    </g>
  ),
  structural: (
    <g {...S}>
      <path d="M3 8 H21 V14 H3 Z" />
      <path d="M11 8 L13 10.5 L10.5 12 L12.5 14" />
      <path d="M6 14 V20 M18 14 V20" />
      <path d="M4 4 l2 2 M20 4 l-2 2" />
    </g>
  ),
  vehicle_breakdown: (
    <g {...S}>
      <path d="M3 15 V11 L6 7 H14 L17 11 H20 V15 Z" />
      <circle cx="7" cy="17" r="2.2" />
      <circle cx="16" cy="17" r="2.2" />
      <path d="M17 2 L21 6 M20 2 L18 4" />
    </g>
  ),
  contamination: (
    <g {...S}>
      <circle cx="12" cy="7.5" r="3.5" />
      <circle cx="7" cy="15.5" r="3.5" />
      <circle cx="17" cy="15.5" r="3.5" />
      <circle cx="12" cy="13" r="1.4" fill="currentColor" />
    </g>
  ),
  medical: (
    <g {...S}>
      <path d="M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z" />
    </g>
  ),
};

export function IncidentIcon({ kind, size = 18, ...rest }: { kind: IncidentKind; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} role="img" aria-label={INCIDENTS[kind].label} {...rest}>
      {INCIDENT_PATHS[kind]}
    </svg>
  );
}

// Compact category glyphs for the colony map (drawn centred on 0,0, ~16px).
export const CATEGORY_GLYPH: Record<FacilityCategory, ReactNode> = {
  habitat: <path d="M-6 3 A6 6 0 0 1 6 3 Z M-8 3 H8" />,
  life: (
    <g>
      <circle cx="-2.5" cy="0" r="3.4" />
      <circle cx="3" cy="0" r="3.4" />
    </g>
  ),
  agri: <path d="M0 6 V-1 M0 1 C-5 1 -6 -4 -5 -6 C-1 -6 0 -3 0 1 M0 -1 C4 -1 6 -5 5 -7 C1 -7 0 -4 0 -1" />,
  energy: <path d="M1 -7 L-4 1 H0 L-1 7 L4 -1 H0 Z" />,
  industry: (
    <g>
      <circle r="3.6" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <path key={a} d="M0 -3.6 V-6" transform={`rotate(${a})`} />
      ))}
    </g>
  ),
  storage: <path d="M-6 -4 H6 V5 H-6 Z M-6 -1 H6 M-2 -4 V-1" />,
  health: <path d="M-1.6 -6 H1.6 V-1.6 H6 V1.6 H1.6 V6 H-1.6 V1.6 H-6 V-1.6 H-1.6 Z" />,
  science: <path d="M-2 -6 V-1 L-6 6 H6 L2 -1 V-6 M-3.5 -6 H3.5" />,
};

// Transport and UI controls
export const Icon = {
  play: <path d="M7 5 L19 12 L7 19 Z" fill="currentColor" />,
  pause: <path d="M7 5 H10.5 V19 H7 Z M13.5 5 H17 V19 H13.5 Z" fill="currentColor" />,
  slower: <path d="M12 6 L4 12 L12 18 Z M20 6 L12 12 L20 18 Z" fill="currentColor" />,
  faster: <path d="M4 6 L12 12 L4 18 Z M12 6 L20 12 L12 18 Z" fill="currentColor" />,
  back: <path d="M15 5 L8 12 L15 19" {...S} />,
  dice: (
    <g {...S}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.2" fill="currentColor" />
      <circle cx="15" cy="15" r="1.2" fill="currentColor" />
      <circle cx="15" cy="9" r="1.2" fill="currentColor" />
      <circle cx="9" cy="15" r="1.2" fill="currentColor" />
    </g>
  ),
  plus: <path d="M12 5 V19 M5 12 H19" {...S} />,
  minus: <path d="M5 12 H19" {...S} />,
  close: <path d="M6 6 L18 18 M18 6 L6 18" {...S} />,
  up: <path d="M6 15 L12 9 L18 15" {...S} />,
  down: <path d="M6 9 L12 15 L18 9" {...S} />,
  save: <path d="M5 4 H16 L20 8 V20 H5 Z M8 4 V9 H15 V4 M8 20 V14 H16 V20" {...S} />,
  wrench: <path d="M14 7 A4 4 0 1 0 17 12 L20 15 L18 17 L15 14 A4 4 0 0 0 14 7 Z M4 20 L11 13" {...S} />,
  power: <path d="M12 3 V11 M7 6 A7.5 7.5 0 1 0 17 6" {...S} />,
  trash: <path d="M5 7 H19 M9 7 V4 H15 V7 M7 7 L8 20 H16 L17 7" {...S} />,
};

export function Ico({ name, size = 16 }: { name: keyof typeof Icon; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      {Icon[name]}
    </svg>
  );
}
