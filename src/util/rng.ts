/** Deterministic PRNG (mulberry32) so every level looks the same each time. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rangeRng = (rng: () => number, lo: number, hi: number): number => lo + (hi - lo) * rng();
export const pickRng = <T>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];

/** 2D value noise, smooth and cheap; enough for coastlines and gusts. */
export class ValueNoise {
  private perm: Uint8Array;
  constructor(seed: number) {
    const rng = makeRng(seed);
    const p = new Uint8Array(512);
    const base = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = base[i]; base[i] = base[j]; base[j] = tmp;
    }
    for (let i = 0; i < 512; i++) p[i] = base[i & 255];
    this.perm = p;
  }
  private hash(x: number, y: number): number {
    return this.perm[(this.perm[x & 255] + y) & 255] / 255;
  }
  noise2(x: number, y: number): number {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), w = yf * yf * (3 - 2 * yf);
    const a = this.hash(xi, yi), b = this.hash(xi + 1, yi);
    const c = this.hash(xi, yi + 1), d = this.hash(xi + 1, yi + 1);
    const ab = a + (b - a) * u, cd = c + (d - c) * u;
    return ab + (cd - ab) * w;
  }
  noise1(x: number): number { return this.noise2(x, 0.5); }
  /** Fractal sum, output roughly 0..1 */
  fbm2(x: number, y: number, octaves = 4): number {
    let amp = 0.5, freq = 1, sum = 0, tot = 0;
    for (let i = 0; i < octaves; i++) {
      sum += this.noise2(x * freq, y * freq) * amp;
      tot += amp; amp *= 0.5; freq *= 2.1;
    }
    return sum / tot;
  }
}
