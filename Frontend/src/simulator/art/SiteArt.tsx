import { useMemo } from "react";
import type { SiteDef } from "../engine/catalog";
import { Rng, hashSeed } from "../engine/rng";

const W = 320;
const H = 140;

/** Ridge profile 0..1 (fraction of height from the bottom) for each terrain type. */
function profile(terrain: SiteDef["terrain"], x: number, n: (x: number) => number): number {
  const u = x / W;
  switch (terrain) {
    case "crater": {
      const rim = Math.exp(-((u - 0.12) ** 2) / 0.006) * 0.32 + Math.exp(-((u - 0.9) ** 2) / 0.01) * 0.26;
      return 0.2 + rim + n(x) * 0.04;
    }
    case "plain":
      return 0.24 + n(x) * 0.05 + Math.sin(u * 9) * 0.01;
    case "basin":
      return 0.18 + (u < 0.25 ? (0.25 - u) * 1.2 : 0) + (u > 0.7 ? (u - 0.7) * 0.9 : 0) + n(x) * 0.05;
    case "canyon": {
      const wall = u < 0.28 ? 0.72 - u * 0.4 : u > 0.72 ? 0.5 + (u - 0.72) * 1.1 : 0.2;
      return wall + n(x) * 0.05;
    }
    case "volcano":
      return 0.22 + Math.max(0, 0.36 - Math.abs(u - 0.58) * 0.9) + n(x) * 0.02;
    case "polar":
      return 0.3 + (Math.floor(u * 7) % 2 ? 0.04 : 0) + n(x) * 0.03 + (u > 0.6 ? 0.08 : 0);
  }
}

export function SiteArt({ site, className, seed = "" }: { site: SiteDef; className?: string; seed?: string }) {
  const { ridge, far, strata, stars } = useMemo(() => {
    const rng = new Rng(hashSeed(site.id + seed));
    const phases = Array.from({ length: 4 }, () => rng.range(0, Math.PI * 2));
    const n = (x: number) =>
      (Math.sin(x * 0.045 + phases[0]) + 0.5 * Math.sin(x * 0.11 + phases[1]) + 0.25 * Math.sin(x * 0.27 + phases[2]) + 0.12 * Math.sin(x * 0.6 + phases[3])) / 1.9;
    const pts: string[] = [];
    const farPts: string[] = [];
    for (let x = 0; x <= W; x += 4) {
      pts.push(`${x},${(H - profile(site.terrain, x, n) * H).toFixed(1)}`);
      farPts.push(`${x},${(H - (profile(site.terrain, x * 0.7 + 60, n) * 0.75 + 0.18) * H).toFixed(1)}`);
    }
    const strata = Array.from({ length: site.terrain === "canyon" || site.terrain === "polar" ? 5 : 2 }, (_, i) => {
      const y = H - (0.12 + i * 0.07) * H;
      return `M0 ${y.toFixed(1)} ${Array.from({ length: 9 }, (_, k) => `L${(k + 1) * 40} ${(y + Math.sin(k + i) * 2).toFixed(1)}`).join(" ")}`;
    });
    const stars = Array.from({ length: 22 }, () => ({ x: rng.range(0, W), y: rng.range(4, H * 0.45), r: rng.chance(0.2) ? 0.9 : 0.5 }));
    return { ridge: pts.join(" "), far: farPts.join(" "), strata, stars };
  }, [site, seed]);

  const polar = site.terrain === "polar";
  const gid = `sky-${site.id}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} preserveAspectRatio="xMidYMax slice" role="img" aria-label={`${site.label} horizon`}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#06070a" />
          <stop offset="0.62" stopColor={polar ? "#121a22" : "#1a0f0b"} />
          <stop offset="1" stopColor={polar ? "#3c4a55" : "#5a2a1a"} stopOpacity={0.9 * Math.min(1, site.dust)} />
        </linearGradient>
        <linearGradient id={`${gid}-g`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={polar ? "#9fb4c2" : "#8a4a30"} />
          <stop offset="1" stopColor={polar ? "#2a343c" : "#2a140d"} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${gid})`} />
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#f5f7fa" opacity={0.5} />
      ))}
      <circle cx={W * 0.78} cy={H * 0.3} r={4.5 * site.solar} fill="#f3e6cf" opacity={0.85} />
      <circle cx={W * 0.78} cy={H * 0.3} r={11 * site.solar} fill="#f3e6cf" opacity={0.08} />
      <polygon points={`0,${H} ${far} ${W},${H}`} fill={polar ? "#2c3943" : "#3a1c12"} opacity={0.75} />
      <polygon points={`0,${H} ${ridge} ${W},${H}`} fill={`url(#${gid}-g)`} />
      <polyline points={ridge} fill="none" stroke={polar ? "#dfeaf0" : "#d85c3a"} strokeOpacity="0.55" strokeWidth="1" />
      {strata.map((d, i) => (
        <path key={i} d={d} fill="none" stroke={polar ? "#e6f1f7" : "#f5f7fa"} strokeOpacity={0.07 + i * 0.02} strokeWidth="0.8" />
      ))}
    </svg>
  );
}
