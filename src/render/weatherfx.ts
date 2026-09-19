import type { Weather } from '../game/weather';
import type { Runway } from '../game/world';
import { TAU } from '../util/math';
import { makeRng } from '../util/rng';
import type { Palette } from './palette';

type Ctx = CanvasRenderingContext2D;

/** Rain streaks, storm cells, lightning, wet runways. Drawn in world space above the aircraft. */
export class WeatherFx {
  private rain: Array<{ x: number; y: number; l: number; s: number }> = [];
  private fogCanvas: HTMLCanvasElement | null = null;
  private lastFlash = -1;
  flashAlpha = 0;

  constructor(private W: number, private H: number) {
    const rng = makeRng(99);
    for (let i = 0; i < 260; i++) this.rain.push({ x: rng() * W, y: rng() * H, l: 14 + rng() * 18, s: 0.7 + rng() * 0.6 });
  }

  /** Storm cells (dark, rotating cloud masses) under the aircraft layer. */
  drawCells(ctx: Ctx, wx: Weather, time: number): void {
    for (const c of wx.cells) {
      if (c.intensity <= 0.01) continue;
      const a = c.intensity;
      const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.1, c.x, c.y, c.r);
      g.addColorStop(0, `rgba(40,30,70,${0.55 * a})`); g.addColorStop(0.6, `rgba(60,55,95,${0.4 * a})`); g.addColorStop(1, 'rgba(90,90,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, TAU); ctx.fill();
      // billowing lobes
      for (let i = 0; i < 5; i++) {
        const ang = time * 0.15 + i * 1.256, d = c.r * 0.45;
        const x = c.x + Math.cos(ang) * d, y = c.y + Math.sin(ang) * d, r = c.r * 0.5;
        const lg = ctx.createRadialGradient(x, y, 0, x, y, r);
        lg.addColorStop(0, `rgba(110,105,140,${0.35 * a})`); lg.addColorStop(1, 'rgba(110,105,140,0)');
        ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      }
    }
  }

  /** Rain, lightning bolts and the screen flash. */
  drawPrecip(ctx: Ctx, wx: Weather, time: number, dt: number): void {
    const p = wx.cur.precip;
    if (p > 0.03 || wx.cells.length) {
      ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 1.4;
      const dir = { x: wx.vec.x * 0.6, y: 1 };
      const len = Math.hypot(dir.x, dir.y); dir.x /= len; dir.y /= len;
      for (const r of this.rain) {
        const local = wx.sample(r); // heavier inside cells
        const inten = Math.max(p, local.precip);
        if (inten < 0.05) continue;
        r.x += (dir.x * 420 + wx.vec.x * 4) * r.s * dt; r.y += dir.y * 420 * r.s * dt;
        if (r.y > this.H + 20) { r.y = -20; r.x = Math.random() * this.W; }
        if (r.x > this.W + 20) r.x = -20; if (r.x < -20) r.x = this.W + 20;
        ctx.strokeStyle = `rgba(210,230,255,${0.12 + 0.3 * inten})`;
        ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - dir.x * r.l * inten, r.y - dir.y * r.l * inten); ctx.stroke();
      }
      ctx.restore();
    }
    // lightning
    for (const f of wx.flashes) {
      const age = time - f.t;
      if (f.t !== this.lastFlash && age < 0.05) { this.lastFlash = f.t; this.flashAlpha = 0.45; }
      if (age < 0.25) {
        ctx.save(); ctx.translate(f.x, f.y);
        ctx.strokeStyle = `rgba(255,255,255,${1 - age / 0.25})`; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.shadowColor = '#bfe0ff'; ctx.shadowBlur = 18;
        ctx.beginPath(); f.bolt.forEach((b, i) => (i ? ctx.lineTo(b.x, b.y) : ctx.moveTo(b.x, b.y))); ctx.stroke();
        ctx.restore();
        const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 160);
        g.addColorStop(0, `rgba(220,235,255,${0.5 * (1 - age / 0.25)})`); g.addColorStop(1, 'rgba(220,235,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 160, 0, TAU); ctx.fill();
      }
    }
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.2);
  }

  /** Wet runway gloss. */
  drawWetRunways(ctx: Ctx, wx: Weather, runways: Runway[], time: number): void {
    if (wx.cur.precip < 0.1) return;
    for (const rw of runways) {
      if (rw.kind === 'water') continue;
      ctx.save(); ctx.translate(rw.threshold.x, rw.threshold.y); ctx.rotate(rw.heading);
      const g = ctx.createLinearGradient(0, -rw.width / 2, 0, rw.width / 2);
      const sh = 0.5 + 0.5 * Math.sin(time * 0.7);
      g.addColorStop(0, `rgba(255,255,255,${0.04 * wx.cur.precip})`); g.addColorStop(0.5, `rgba(255,255,255,${(0.18 + 0.08 * sh) * wx.cur.precip})`); g.addColorStop(1, `rgba(255,255,255,${0.04 * wx.cur.precip})`);
      ctx.fillStyle = g;
      if (rw.kind === 'helipad') { ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill(); } else ctx.fillRect(-10, -rw.width / 2 + 3, rw.length + 20, rw.width - 6);
      ctx.restore();
    }
  }

  /** Fog as a screen-space layer with drifting clear patches. */
  drawFog(ctx: Ctx, wx: Weather, sw: number, sh: number, time: number, pal: Palette): void {
    const f = wx.cur.fog;
    if (f < 0.03) return;
    if (!this.fogCanvas || this.fogCanvas.width !== Math.ceil(sw / 2) || this.fogCanvas.height !== Math.ceil(sh / 2)) {
      this.fogCanvas = document.createElement('canvas'); this.fogCanvas.width = Math.ceil(sw / 2); this.fogCanvas.height = Math.ceil(sh / 2);
    }
    const fc = this.fogCanvas.getContext('2d')!;
    const w = this.fogCanvas.width, h = this.fogCanvas.height;
    fc.globalCompositeOperation = 'source-over';
    fc.clearRect(0, 0, w, h);
    fc.fillStyle = pal.lightsOn ? `rgba(150,165,190,${0.78 * f})` : `rgba(235,240,246,${0.82 * f})`;
    fc.fillRect(0, 0, w, h);
    fc.globalCompositeOperation = 'destination-out';
    const rng = makeRng(7);
    for (let i = 0; i < 9; i++) {
      const x = ((rng() * w + time * (6 + i * 2) + wx.vec.x * 5) % (w + 200)) - 100, y = (rng() * h + Math.sin(time * 0.2 + i) * 40 + h) % h;
      const r = (60 + rng() * 120) * (1.2 - f * 0.6);
      const g = fc.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      fc.fillStyle = g; fc.beginPath(); fc.arc(x, y, r, 0, TAU); fc.fill();
    }
    ctx.drawImage(this.fogCanvas, 0, 0, sw, sh);
  }

  /** Full-screen lightning flash (screen space). */
  drawFlash(ctx: Ctx, sw: number, sh: number): void {
    if (this.flashAlpha <= 0) return;
    ctx.fillStyle = `rgba(240,246,255,${this.flashAlpha})`; ctx.fillRect(0, 0, sw, sh);
  }
}

/** Little weather glyphs for the HUD (no emoji). */
export function drawWeatherIcon(ctx: Ctx, kind: string, x: number, y: number, s: number): void {
  ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const cloud = (cx: number, cy: number, k: number, fill: string): void => {
    ctx.fillStyle = fill; ctx.beginPath();
    ctx.arc(cx - 5 * k, cy + 1 * k, 4 * k, 0, TAU); ctx.arc(cx + 1 * k, cy - 2 * k, 5.5 * k, 0, TAU); ctx.arc(cx + 6 * k, cy + 1.5 * k, 4 * k, 0, TAU);
    ctx.rect(cx - 5 * k, cy + 1 * k, 11 * k, 4.5 * k); ctx.fill();
  };
  const k = s / 20;
  if (kind === 'clear') {
    ctx.fillStyle = '#ffd66b'; ctx.beginPath(); ctx.arc(0, 0, 5 * k, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffd66b'; ctx.lineWidth = 1.6 * k;
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 7 * k, Math.sin(a) * 7 * k); ctx.lineTo(Math.cos(a) * 9.5 * k, Math.sin(a) * 9.5 * k); ctx.stroke(); }
  } else if (kind === 'breezy') {
    ctx.strokeStyle = '#dff2ff'; ctx.lineWidth = 1.8 * k;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(-9 * k, i * 4.5 * k); ctx.quadraticCurveTo(3 * k, i * 4.5 * k - 3 * k, 8 * k, i * 4.5 * k); ctx.stroke(); }
  } else if (kind === 'rain' || kind === 'ice') {
    cloud(0, -3 * k, k, kind === 'ice' ? '#dbe7f5' : '#c7d3e3');
    ctx.strokeStyle = kind === 'ice' ? '#bfe9ff' : '#7fb8ff'; ctx.lineWidth = 1.6 * k;
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * 4 * k + 1 * k, 4 * k); ctx.lineTo(i * 4 * k - 1 * k, 8.5 * k); ctx.stroke(); }
  } else if (kind === 'fog') {
    cloud(0, -4 * k, k * 0.9, '#d5dde8');
    ctx.strokeStyle = '#eef3f8'; ctx.lineWidth = 1.8 * k;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(-8 * k, 3 * k + i * 3 * k); ctx.lineTo(8 * k, 3 * k + i * 3 * k); ctx.stroke(); }
  } else if (kind === 'storm') {
    cloud(0, -4 * k, k, '#6f6b8f');
    ctx.fillStyle = '#ffd66b'; ctx.beginPath(); ctx.moveTo(1 * k, 1 * k); ctx.lineTo(-3 * k, 6 * k); ctx.lineTo(0, 6 * k); ctx.lineTo(-1.5 * k, 10 * k); ctx.lineTo(3.5 * k, 4 * k); ctx.lineTo(0.5 * k, 4 * k); ctx.lineTo(2.5 * k, 1 * k); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
