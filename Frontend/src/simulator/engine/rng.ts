// Deterministic randomness: the same seed always grows the same colony and the same history.

export function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 step: returns [value 0..1, nextState]. */
export function step(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** Small stateful wrapper used inside a single tick or generator. */
export class Rng {
  state: number;
  constructor(state: number) {
    this.state = state >>> 0;
  }
  next(): number {
    const [v, s] = step(this.state);
    this.state = s;
    return v;
  }
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < items.length; i++) {
      r -= weights[i];
      if (r <= 0) return items[i];
    }
    return items[items.length - 1];
  }
  normal(mean = 0, sd = 1): number {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

const SEED_WORDS = [
  "ares", "deimos", "phobos", "tharsis", "elysium", "noctis", "hesperia", "argyre", "syrtis",
  "cydonia", "amazonis", "tempe", "chryse", "olympus", "gale", "isidis", "meridiani", "acidalia",
];

export function randomSeed(): string {
  const a = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
  const n = Math.floor(Math.random() * 9000 + 1000);
  return `${a}-${n}`;
}
