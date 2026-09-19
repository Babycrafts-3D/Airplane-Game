export interface Vec { x: number; y: number }

export const TAU = Math.PI * 2;

export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y);
export const norm = (a: Vec): Vec => { const l = len(a) || 1; return { x: a.x / l, y: a.y / l }; };
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const fromAngle = (a: number, s = 1): Vec => ({ x: Math.cos(a) * s, y: Math.sin(a) * s });
export const angleOf = (a: Vec): number => Math.atan2(a.y, a.x);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
export const clamp01 = (x: number): number => clamp(x, 0, 1);
export const smoothstep = (a: number, b: number, x: number): number => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

/** Smallest signed angle from a to b, in (-PI, PI]. */
export function angleDiff(a: number, b: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d <= -Math.PI) d += TAU;
  return d;
}

export function turnToward(current: number, target: number, maxDelta: number): number {
  const d = angleDiff(current, target);
  if (Math.abs(d) <= maxDelta) return target;
  return current + Math.sign(d) * maxDelta;
}

/** Distance from point p to segment ab, plus the closest point. */
export function pointSegment(p: Vec, a: Vec, b: Vec): { d: number; t: number; q: Vec } {
  const abx = b.x - a.x, aby = b.y - a.y;
  const l2 = abx * abx + aby * aby;
  let t = l2 === 0 ? 0 : ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2;
  t = clamp01(t);
  const q = { x: a.x + abx * t, y: a.y + aby * t };
  return { d: dist(p, q), t, q };
}

export function polylineLength(pts: Vec[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
  return l;
}

/** Resample a polyline at a fixed spacing, keeping the last point. */
export function resample(pts: Vec[], spacing: number): Vec[] {
  if (pts.length < 2) return pts.slice();
  const out: Vec[] = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const segLen = dist(a, b);
    if (segLen === 0) continue;
    let d = spacing - carry;
    while (d <= segLen) {
      const t = d / segLen;
      out.push({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      d += spacing;
    }
    carry = segLen - (d - spacing);
  }
  const last = pts[pts.length - 1];
  if (dist(out[out.length - 1], last) > spacing * 0.35) out.push(last);
  return out;
}

/** Light smoothing that keeps endpoints. */
export function smoothPolyline(pts: Vec[], passes = 2): Vec[] {
  let cur = pts.slice();
  for (let p = 0; p < passes; p++) {
    if (cur.length < 3) return cur;
    const next: Vec[] = [cur[0]];
    for (let i = 1; i < cur.length - 1; i++) {
      next.push({
        x: (cur[i - 1].x + cur[i].x * 2 + cur[i + 1].x) / 4,
        y: (cur[i - 1].y + cur[i].y * 2 + cur[i + 1].y) / 4,
      });
    }
    next.push(cur[cur.length - 1]);
    cur = next;
  }
  return cur;
}

export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + s.toString().padStart(2, '0');
}
