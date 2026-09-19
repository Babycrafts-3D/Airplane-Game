import { clamp, fromAngle, lerp, type Vec } from '../util/math';
import { makeRng, ValueNoise } from '../util/rng';
import { lang } from '../i18n';
import type { PlaneType } from './types';

/** Screen radians (0 = east, PI/2 = down) from a compass direction the wind blows TOWARDS. */
export const compassToRad = (deg: number): number => (deg - 90) * Math.PI / 180;
export const WIND_UNITS_PER_KMH = 0.3;

export interface WeatherState {
  kmh: number;        // mean wind
  gust: number;       // gust amplitude on top of the mean
  dirDeg: number;     // compass direction the wind blows towards
  turbulence: number; // 0..1
  precip: number;     // 0..1 rain intensity
  fog: number;        // 0..1 (visibility from 3000 m down to 150 m)
  temp: number;       // degrees C
  icing: number;      // 0..1 icing potential (needs precipitation to bite)
  cells: number;      // desired number of storm cells
}

export interface WeatherPhase extends Partial<WeatherState> { at: number }
export interface WeatherScript { base: WeatherState; phases: WeatherPhase[] }

export interface StormCell { x: number; y: number; r: number; vx: number; vy: number; intensity: number; born: number; life: number; nextFlash: number }
export interface Flash { x: number; y: number; t: number; bolt: Vec[] }

export const CLEAR: WeatherState = { kmh: 0, gust: 0, dirDeg: 90, turbulence: 0, precip: 0, fog: 0, temp: 21, icing: 0, cells: 0 };

export const visibilityFor = (fog: number): number => Math.round(lerp(3000, 150, clamp(fog, 0, 1)));

export class Weather {
  /** smoothed, current conditions (what aircraft feel) */
  cur: WeatherState;
  /** instantaneous wind with gusts applied */
  kmhNow = 0;
  dirRad = 0;
  vec: Vec = { x: 0, y: 0 };
  cells: StormCell[] = [];
  flashes: Flash[] = [];
  seaState = 0;
  private rng: () => number;
  private noise: ValueNoise;
  private cellSeq = 0;

  constructor(public script: WeatherScript, private W: number, private H: number, seed: number) {
    this.cur = { ...script.base };
    this.rng = makeRng(seed * 131 + 17);
    this.noise = new ValueNoise(seed + 77);
    this.update(0, 0);
  }

  /** Scripted target at time t (piecewise linear between phases, hold after the last). */
  target(t: number): WeatherState {
    const ph = this.script.phases;
    const out: WeatherState = { ...this.script.base };
    if (!ph.length) return out;
    const keys = Object.keys(this.script.base) as Array<keyof WeatherState>;
    for (const k of keys) {
      // collect points for this key
      const pts: Array<{ at: number; v: number }> = [{ at: 0, v: this.script.base[k] }];
      for (const p of ph) if (p[k] !== undefined) pts.push({ at: p.at, v: p[k] as number });
      pts.sort((a, b) => a.at - b.at);
      let v = pts[pts.length - 1].v;
      for (let i = 1; i < pts.length; i++) {
        if (t <= pts[i].at) { const a = pts[i - 1], b = pts[i]; v = b.at === a.at ? b.v : lerp(a.v, b.v, (t - a.at) / (b.at - a.at)); break; }
      }
      out[k] = v;
    }
    return out;
  }

  update(dt: number, t: number): void {
    const tg = this.target(t);
    const k = dt > 0 ? 1 - Math.exp(-dt * 0.35) : 1;
    for (const key of Object.keys(tg) as Array<keyof WeatherState>) {
      if (key === 'dirDeg') {
        let d = ((tg.dirDeg - this.cur.dirDeg + 540) % 360) - 180;
        this.cur.dirDeg = (this.cur.dirDeg + d * k + 360) % 360;
      } else this.cur[key] = lerp(this.cur[key], tg[key], k);
    }
    // gusts and direction wander
    const n1 = this.noise.noise2(t * 0.09, 3.3) * 2 - 1;
    const n2 = this.noise.noise2(t * 0.05, 7.7) * 2 - 1;
    const n3 = this.noise.noise2(t * 0.6, 1.1) * 2 - 1; // fast component for gusts
    const gust = this.cur.gust * (0.6 * n1 + 0.4 * n3);
    this.kmhNow = Math.max(0, this.cur.kmh + gust);
    const wander = (8 + this.cur.turbulence * 25) * n2;
    this.dirRad = compassToRad(this.cur.dirDeg + wander);
    this.vec = fromAngle(this.dirRad, this.kmhNow * WIND_UNITS_PER_KMH);
    this.seaState = clamp((this.kmhNow - 8) / 40 + this.cur.precip * 0.15, 0, 1);

    // storm cells
    const want = Math.round(this.cur.cells);
    while (this.cells.length < want) this.spawnCell(t);
    for (const c of this.cells) {
      c.x += (c.vx + this.vec.x * 0.6) * dt; c.y += (c.vy + this.vec.y * 0.6) * dt;
      const age = t - c.born;
      c.intensity = clamp(Math.min(age / 12, (c.life - age) / 15), 0, 1);
      if (c.x < -c.r) c.x = this.W + c.r; if (c.x > this.W + c.r) c.x = -c.r;
      if (c.y < -c.r) c.y = this.H + c.r; if (c.y > this.H + c.r) c.y = -c.r;
      if (t >= c.nextFlash && c.intensity > 0.4) {
        c.nextFlash = t + 3 + this.rng() * 9;
        const a = this.rng() * Math.PI * 2, d = this.rng() * c.r * 0.7;
        this.flashes.push({ x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d, t, bolt: this.makeBolt() });
      }
    }
    this.cells = this.cells.filter(c => t - c.born < c.life || want > this.cells.length);
    if (this.cells.length > want) this.cells = this.cells.filter(c => t - c.born < c.life);
    this.flashes = this.flashes.filter(f => t - f.t < 0.6);
  }

  private spawnCell(t: number): void {
    const edge = this.rng();
    const r = 130 + this.rng() * 90;
    const x = edge < 0.5 ? this.rng() * this.W : (edge < 0.75 ? -r : this.W + r);
    const y = edge < 0.5 ? -r : this.rng() * this.H * 0.7;
    const dir = Math.atan2(this.H * 0.5 - y, this.W * 0.5 - x) + (this.rng() - 0.5) * 0.8;
    const sp = 6 + this.rng() * 6;
    this.cells.push({ x, y, r, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, intensity: 0, born: t, life: 70 + this.rng() * 60, nextFlash: t + 4 + this.rng() * 6 });
    this.cellSeq++;
  }

  private makeBolt(): Vec[] {
    const pts: Vec[] = [{ x: 0, y: -40 }];
    let x = 0, y = -40;
    for (let i = 0; i < 6; i++) { x += (this.rng() - 0.5) * 22; y += 12 + this.rng() * 8; pts.push({ x, y }); }
    return pts;
  }

  /** Local conditions at a position: turbulence (0..1+), storm intensity, local rain. */
  sample(p: Vec): { turb: number; storm: number; precip: number } {
    let storm = 0;
    for (const c of this.cells) {
      const d = Math.hypot(p.x - c.x, p.y - c.y);
      if (d < c.r) storm = Math.max(storm, c.intensity * (1 - (d / c.r) ** 2));
    }
    const gustTurb = clamp(this.cur.gust / 30, 0, 0.6);
    return { turb: clamp(this.cur.turbulence + gustTurb + storm * 1.2, 0, 1.6), storm, precip: clamp(this.cur.precip + storm * 0.8, 0, 1) };
  }

  visibility(): number { return visibilityFor(this.cur.fog); }

  /** Crosswind / headwind components (km/h) for a runway heading (screen radians). */
  components(runwayHeading: number): { cross: number; head: number } {
    const wx = Math.cos(this.dirRad) * this.kmhNow, wy = Math.sin(this.dirRad) * this.kmhNow;
    const rx = Math.cos(runwayHeading), ry = Math.sin(runwayHeading);
    const along = wx * rx + wy * ry;           // positive = blowing along the landing direction = tailwind
    const cross = Math.abs(-wx * ry + wy * rx);
    return { cross, head: -along };
  }

  /** Icing accumulation rate per second for a type (0 when protected or no precipitation). */
  icingRate(type: PlaneType): number {
    const prot = type.antiIce === 'full' ? 0 : type.antiIce === 'partial' ? 0.35 : 1;
    return this.cur.icing * clamp(this.cur.precip * 2, 0, 1) * prot / 45;
  }

  /** Landing-roll factor from surface and temperature (1 = dry standard day). */
  rollFactor(type: PlaneType): number {
    const wet = 1 + this.cur.precip * (type.family === 'ga' || type.family === 'turboprop' ? 0.25 : 0.4);
    const heat = 1 + Math.max(0, this.cur.temp - 25) * 0.012;
    return wet * heat;
  }

  /** Short weather summary word for the HUD. */
  kind(): 'clear' | 'breezy' | 'rain' | 'fog' | 'storm' | 'ice' {
    if (this.cells.some(c => c.intensity > 0.3)) return 'storm';
    if (this.cur.fog > 0.35) return 'fog';
    if (this.cur.icing > 0.4 && this.cur.precip > 0.2) return 'ice';
    if (this.cur.precip > 0.25) return 'rain';
    if (this.kmhNow > 18) return 'breezy';
    return 'clear';
  }

  kindAt(t: number): ReturnType<Weather['kind']> {
    const s = this.target(t);
    if (s.cells >= 0.5) return 'storm';
    if (s.fog > 0.35) return 'fog';
    if (s.icing > 0.4 && s.precip > 0.2) return 'ice';
    if (s.precip > 0.25) return 'rain';
    if (s.kmh > 18) return 'breezy';
    return 'clear';
  }
}

// ---------- weather scripts per mission ----------

export type WeatherProfile = 'clear' | 'breezy' | 'gusty' | 'showers' | 'fog' | 'storm' | 'icing' | 'heat' | 'front';

export function makeScript(profile: WeatherProfile, worldIndex: number, baseWind: { kmh: number; gust: number; dirDeg: number } | null, night: boolean): WeatherScript {
  const w = baseWind ?? { kmh: 6, gust: 3, dirDeg: 90 + worldIndex * 50 };
  const s = 0.8 + worldIndex * 0.12; // intensity scale by world
  const base: WeatherState = { ...CLEAR, kmh: w.kmh, gust: w.gust, dirDeg: w.dirDeg, temp: night ? 9 : 21 };
  const ph: WeatherPhase[] = [];
  switch (profile) {
    case 'clear': break;
    case 'breezy': base.kmh = Math.max(base.kmh, 14 * s); base.gust = 5; base.turbulence = 0.15; break;
    case 'gusty': base.kmh = Math.max(base.kmh, 18 * s); base.gust = 14 * s; base.turbulence = 0.35; ph.push({ at: 60, gust: 20 * s, kmh: 24 * s }, { at: 110, gust: 8, kmh: 14 * s }); break;
    case 'showers': base.turbulence = 0.15; ph.push({ at: 25, precip: 0.7, kmh: base.kmh + 6, gust: base.gust + 6 }, { at: 75, precip: 0.1 }, { at: 120, precip: 0.8, cells: 0 }, { at: 170, precip: 0 }); break;
    case 'fog': base.kmh = 4; base.gust = 1; base.fog = 0.75; base.temp = 8; ph.push({ at: 70, fog: 0.35 }, { at: 120, fog: 0.8 }, { at: 190, fog: 0.15 }); break;
    case 'storm': base.turbulence = 0.3; base.gust = 12 * s; ph.push({ at: 20, cells: Math.min(3, 1 + Math.floor(worldIndex / 2)), precip: 0.5, turbulence: 0.5, kmh: base.kmh + 8 * s, gust: 18 * s }, { at: 150, cells: 0, precip: 0.2, turbulence: 0.2 }); break;
    case 'icing': base.temp = -2; base.icing = 0.8; base.precip = 0.35; base.turbulence = 0.2; ph.push({ at: 60, precip: 0.6 }, { at: 130, precip: 0.15 }); break;
    case 'heat': base.temp = 34; base.turbulence = 0.3; base.kmh = Math.max(base.kmh, 8); break;
    case 'front': base.temp = 18; ph.push({ at: 30, kmh: base.kmh + 12 * s, gust: 12 * s, dirDeg: w.dirDeg + 90, precip: 0.6, turbulence: 0.4 }, { at: 90, cells: 1, fog: 0.2 }, { at: 140, cells: 0, precip: 0.1, kmh: 8, gust: 4, dirDeg: w.dirDeg + 150, turbulence: 0.1 }); break;
  }
  return { base, phases: ph };
}

export const nl = (): boolean => lang() === 'nl';

export function kindLabel(k: ReturnType<Weather['kind']>): string {
  const m: Record<string, [string, string]> = { clear: ['Helder', 'Clear'], breezy: ['Winderig', 'Breezy'], rain: ['Regen', 'Rain'], fog: ['Mist', 'Fog'], storm: ['Onweer', 'Thunderstorm'], ice: ['IJzel', 'Icing'] };
  return m[k][nl() ? 0 : 1];
}
