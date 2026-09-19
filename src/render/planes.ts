import type { PlaneState, PlaneType } from '../game/types';
import type { Vec } from '../util/math';
import { hexA, shade } from './palette';

export interface PlaneView {
  type: PlaneType;
  pos: Vec;
  heading: number;
  altitude: number;
  bank: number;
  livery: number;
  state: PlaneState;
  id: number;
}

const ALT_ACCENTS = ['#f2a541', '#5aa9e6', '#8bd17c'];

function accentFor(pv: PlaneView): string {
  return pv.livery === 0 ? pv.type.livery.accent : ALT_ACCENTS[(pv.livery + pv.id) % ALT_ACCENTS.length];
}

export const planeScale = (alt: number): number => 0.74 + 0.26 * alt;

interface Geo {
  L: number; w: number; span: number; sweep: number; wingX: number; chord: number;
  tailSpan: number; tailX: number; engines: Array<{ x: number; y: number; kind: 'prop' | 'jet' }>;
  hump: boolean; floats: boolean; rotor: boolean; highWing: boolean; winglets: boolean;
}

function geo(t: PlaneType): Geo {
  const h = t.hull;
  switch (t.id) {
    case 'c172': return { L: 2.4 * h, w: 0.36 * h, span: 2.7 * h, sweep: 0, wingX: 0.2 * h, chord: 0.55 * h, tailSpan: 1.05 * h, tailX: -1.0 * h, engines: [{ x: 1.15 * h, y: 0, kind: 'prop' }], hump: false, floats: false, rotor: false, highWing: true, winglets: false };
    case 'dhc6': return { L: 2.6 * h, w: 0.38 * h, span: 3.0 * h, sweep: 0, wingX: 0.15 * h, chord: 0.5 * h, tailSpan: 1.1 * h, tailX: -1.1 * h, engines: [{ x: 0.55 * h, y: -0.85 * h, kind: 'prop' }, { x: 0.55 * h, y: 0.85 * h, kind: 'prop' }], hump: false, floats: false, rotor: false, highWing: true, winglets: false };
    case 'atr72': return { L: 2.9 * h, w: 0.4 * h, span: 2.8 * h, sweep: 0, wingX: 0.1 * h, chord: 0.5 * h, tailSpan: 1.1 * h, tailX: -1.25 * h, engines: [{ x: 0.5 * h, y: -0.8 * h, kind: 'prop' }, { x: 0.5 * h, y: 0.8 * h, kind: 'prop' }], hump: false, floats: false, rotor: false, highWing: true, winglets: false };
    case 'e195': return { L: 3.1 * h, w: 0.42 * h, span: 2.7 * h, sweep: 0.55 * h, wingX: 0.05 * h, chord: 0.6 * h, tailSpan: 1.0 * h, tailX: -1.3 * h, engines: [{ x: 0.35 * h, y: -0.7 * h, kind: 'jet' }, { x: 0.35 * h, y: 0.7 * h, kind: 'jet' }], hump: false, floats: false, rotor: false, highWing: false, winglets: true };
    case 'a320': return { L: 3.1 * h, w: 0.45 * h, span: 2.9 * h, sweep: 0.6 * h, wingX: 0.0, chord: 0.65 * h, tailSpan: 1.05 * h, tailX: -1.3 * h, engines: [{ x: 0.3 * h, y: -0.75 * h, kind: 'jet' }, { x: 0.3 * h, y: 0.75 * h, kind: 'jet' }], hump: false, floats: false, rotor: false, highWing: false, winglets: true };
    case 'b747': return { L: 3.3 * h, w: 0.5 * h, span: 3.1 * h, sweep: 0.75 * h, wingX: -0.05 * h, chord: 0.75 * h, tailSpan: 1.15 * h, tailX: -1.4 * h, engines: [{ x: 0.35 * h, y: -0.62 * h, kind: 'jet' }, { x: 0.05 * h, y: -1.1 * h, kind: 'jet' }, { x: 0.35 * h, y: 0.62 * h, kind: 'jet' }, { x: 0.05 * h, y: 1.1 * h, kind: 'jet' }], hump: true, floats: false, rotor: false, highWing: false, winglets: true };
    case 'c208': return { L: 2.6 * h, w: 0.38 * h, span: 2.9 * h, sweep: 0, wingX: 0.2 * h, chord: 0.55 * h, tailSpan: 1.05 * h, tailX: -1.1 * h, engines: [{ x: 1.25 * h, y: 0, kind: 'prop' }], hump: false, floats: true, rotor: false, highWing: true, winglets: false };
    case 'h135': return { L: 2.1 * h, w: 0.55 * h, span: 0, sweep: 0, wingX: 0, chord: 0, tailSpan: 0.6 * h, tailX: -1.55 * h, engines: [], hump: false, floats: false, rotor: true, highWing: false, winglets: false };
  }
  return { L: 2.6 * h, w: 0.4 * h, span: 2.8 * h, sweep: 0, wingX: 0, chord: 0.5 * h, tailSpan: 1.0 * h, tailX: -1.1 * h, engines: [], hump: false, floats: false, rotor: false, highWing: true, winglets: false };
}

function fuselagePath(ctx: CanvasRenderingContext2D, g: Geo): void {
  const L = g.L, w = g.w;
  ctx.beginPath();
  ctx.moveTo(L / 2, 0);
  ctx.bezierCurveTo(L / 2, -w * 0.9, L * 0.32, -w, L * 0.2, -w);
  ctx.lineTo(-L * 0.25, -w);
  ctx.bezierCurveTo(-L * 0.4, -w * 0.9, -L * 0.47, -w * 0.55, -L / 2, -w * 0.35);
  ctx.lineTo(-L / 2, w * 0.35);
  ctx.bezierCurveTo(-L * 0.47, w * 0.55, -L * 0.4, w * 0.9, -L * 0.25, w);
  ctx.lineTo(L * 0.2, w);
  ctx.bezierCurveTo(L * 0.32, w, L / 2, w * 0.9, L / 2, 0);
  ctx.closePath();
}

function wingPath(ctx: CanvasRenderingContext2D, g: Geo, side: 1 | -1): void {
  const half = g.span / 2, c = g.chord, s = g.sweep, x0 = g.wingX;
  ctx.beginPath();
  ctx.moveTo(x0 + c * 0.6, side * g.w * 0.6);
  ctx.lineTo(x0 + c * 0.6 - s, side * half);
  ctx.lineTo(x0 - c * 0.5 - s * 1.05, side * half);
  ctx.lineTo(x0 - c * 0.75, side * g.w * 0.6);
  ctx.closePath();
}

function tailPath(ctx: CanvasRenderingContext2D, g: Geo, side: 1 | -1): void {
  const half = g.tailSpan / 2, x0 = g.tailX, c = g.tailSpan * 0.32, s = g.sweep * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0 + c * 0.5, side * g.w * 0.4);
  ctx.lineTo(x0 + c * 0.4 - s, side * half);
  ctx.lineTo(x0 - c * 0.45 - s, side * half);
  ctx.lineTo(x0 - c * 0.6, side * g.w * 0.4);
  ctx.closePath();
}

function heliBodyPath(ctx: CanvasRenderingContext2D, g: Geo): void {
  const L = g.L, w = g.w;
  ctx.beginPath();
  ctx.moveTo(L * 0.5, 0);
  ctx.bezierCurveTo(L * 0.5, -w, L * 0.05, -w, -L * 0.1, -w * 0.6);
  ctx.lineTo(-L * 0.75, -w * 0.13);
  ctx.lineTo(-L * 0.75, w * 0.13);
  ctx.lineTo(-L * 0.1, w * 0.6);
  ctx.bezierCurveTo(L * 0.05, w, L * 0.5, w, L * 0.5, 0);
  ctx.closePath();
}

/** Silhouette used for the shadow. */
function silhouette(ctx: CanvasRenderingContext2D, g: Geo, isHeli: boolean): void {
  if (isHeli) {
    heliBodyPath(ctx, g); ctx.fill();
    ctx.beginPath(); ctx.ellipse(g.tailX, 0, g.tailSpan * 0.32, g.tailSpan * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    return;
  }
  wingPath(ctx, g, 1); ctx.fill();
  wingPath(ctx, g, -1); ctx.fill();
  tailPath(ctx, g, 1); ctx.fill();
  tailPath(ctx, g, -1); ctx.fill();
  fuselagePath(ctx, g); ctx.fill();
}

export function drawPlaneShadow(ctx: CanvasRenderingContext2D, pv: PlaneView, shadowAlpha: number): void {
  const g = geo(pv.type);
  const s = planeScale(pv.altitude);
  const off = 8 + pv.altitude * 26;
  ctx.save();
  ctx.translate(pv.pos.x + off * 0.55, pv.pos.y + off);
  ctx.rotate(pv.heading);
  ctx.scale(s, s);
  ctx.fillStyle = `rgba(10, 30, 60, ${shadowAlpha * (0.55 + 0.45 * (1 - pv.altitude))})`;
  silhouette(ctx, g, g.rotor);
  ctx.restore();
}

export function drawPlane(ctx: CanvasRenderingContext2D, pv: PlaneView, time: number, night: boolean): void {
  const t = pv.type, g = geo(t);
  const s = planeScale(pv.altitude);
  const accent = accentFor(pv);
  const body = t.livery.body, wing = t.livery.wing;
  const outline = 'rgba(40, 55, 80, 0.55)';
  ctx.save();
  ctx.translate(pv.pos.x, pv.pos.y);
  ctx.rotate(pv.heading);
  ctx.scale(s, s * (1 - 0.14 * Math.abs(pv.bank)));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2;

  if (g.rotor) {
    // skids
    ctx.strokeStyle = 'rgba(60,70,90,0.8)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(g.L * 0.3, -g.w * 1.1); ctx.lineTo(-g.L * 0.2, -g.w * 1.1); ctx.moveTo(g.L * 0.3, g.w * 1.1); ctx.lineTo(-g.L * 0.2, g.w * 1.1); ctx.stroke();
    // tail boom + fenestron
    ctx.fillStyle = shade(body, -0.08); ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.ellipse(g.tailX, 0, g.tailSpan * 0.32, g.tailSpan * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.ellipse(g.tailX, 0, g.tailSpan * 0.16, g.tailSpan * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    heliBodyPath(ctx, g);
    const grd = ctx.createLinearGradient(0, -g.w, 0, g.w);
    grd.addColorStop(0, shade(body, 0.05)); grd.addColorStop(0.5, body); grd.addColorStop(1, shade(body, -0.16));
    ctx.fillStyle = grd; ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    // canopy
    ctx.fillStyle = 'rgba(70,120,190,0.85)';
    ctx.beginPath(); ctx.moveTo(g.L * 0.47, 0); ctx.bezierCurveTo(g.L * 0.47, -g.w * 0.8, g.L * 0.2, -g.w * 0.8, g.L * 0.1, -g.w * 0.5); ctx.lineTo(g.L * 0.1, g.w * 0.5); ctx.bezierCurveTo(g.L * 0.2, g.w * 0.8, g.L * 0.47, g.w * 0.8, g.L * 0.47, 0); ctx.fill();
    // accent stripe
    ctx.strokeStyle = accent; ctx.lineWidth = g.w * 0.28;
    ctx.beginPath(); ctx.moveTo(g.L * 0.05, -g.w * 0.45); ctx.lineTo(-g.L * 0.7, -g.w * 0.05); ctx.stroke();
    // rotor
    const R = t.hull * 1.65;
    ctx.fillStyle = 'rgba(220,230,245,0.16)';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.rotate(time * 22 + pv.id);
    ctx.strokeStyle = 'rgba(40,45,60,0.55)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0); ctx.stroke(); ctx.rotate(Math.PI / 2); }
    ctx.restore();
    ctx.fillStyle = '#3a4150'; ctx.beginPath(); ctx.arc(0, 0, g.w * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }

  // floats under the fuselage (seaplane)
  if (g.floats) {
    ctx.fillStyle = shade(accent, -0.1); ctx.strokeStyle = outline;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.roundRect(-g.L * 0.42, side * g.w * 1.25 - g.w * 0.28, g.L * 0.82, g.w * 0.56, g.w * 0.28); ctx.fill(); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(60,70,90,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(g.L * 0.1, -g.w); ctx.lineTo(g.L * 0.1, -g.w * 1.25); ctx.moveTo(g.L * 0.1, g.w); ctx.lineTo(g.L * 0.1, g.w * 1.25); ctx.stroke();
  }

  const drawWings = (): void => {
    for (const side of [1, -1] as const) {
      wingPath(ctx, g, side);
      const grd = ctx.createLinearGradient(0, 0, 0, side * g.span / 2);
      grd.addColorStop(0, shade(wing, -0.06)); grd.addColorStop(1, shade(wing, 0.04));
      ctx.fillStyle = grd; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1.1; ctx.stroke();
      // accent wingtip
      ctx.save(); ctx.clip();
      ctx.fillStyle = accent;
      ctx.fillRect(-g.L, side * (g.span / 2 - g.chord * 0.32), g.L * 2, g.chord * 0.4 * side);
      ctx.restore();
      if (g.winglets) {
        ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        const tipX = g.wingX + g.chord * 0.6 - g.sweep;
        ctx.beginPath(); ctx.moveTo(tipX - g.chord * 0.1, side * g.span / 2); ctx.lineTo(tipX - g.chord * 0.6, side * g.span / 2); ctx.stroke();
      }
    }
  };
  const drawEngines = (): void => {
    for (const e of g.engines) {
      if (e.kind === 'jet') {
        ctx.fillStyle = shade(body, -0.12); ctx.strokeStyle = outline; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(e.x - g.w * 0.9, e.y - g.w * 0.42, g.w * 1.8, g.w * 0.84, g.w * 0.42); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.ellipse(e.x + g.w * 0.85, e.y, g.w * 0.12, g.w * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      } else if (e.x < g.L * 0.45) {
        // nacelle on wing
        ctx.fillStyle = shade(body, -0.08); ctx.strokeStyle = outline; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(e.x - g.w * 0.8, e.y - g.w * 0.36, g.w * 1.7, g.w * 0.72, g.w * 0.36); ctx.fill(); ctx.stroke();
      }
    }
  };

  if (!g.highWing) { drawWings(); drawEngines(); }

  // tailplane
  for (const side of [1, -1] as const) {
    tailPath(ctx, g, side); ctx.fillStyle = accent; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke();
  }
  // fuselage
  fuselagePath(ctx, g);
  const fg = ctx.createLinearGradient(0, -g.w, 0, g.w);
  fg.addColorStop(0, shade(body, 0.04)); fg.addColorStop(0.45, body); fg.addColorStop(1, shade(body, -0.2));
  ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  if (g.hump) {
    ctx.fillStyle = shade(body, 0.08);
    ctx.beginPath(); ctx.roundRect(-g.L * 0.05, -g.w * 0.62, g.L * 0.45, g.w * 1.24, g.w * 0.6); ctx.fill();
    ctx.strokeStyle = 'rgba(40,55,80,0.25)'; ctx.stroke();
  }
  // cheatline
  ctx.save(); fuselagePath(ctx, g); ctx.clip();
  ctx.fillStyle = hexA(accent, 0.9);
  ctx.fillRect(-g.L * 0.5, g.w * 0.45, g.L * 0.85, g.w * 0.22);
  ctx.restore();
  // fin (seen from above as a short spine)
  ctx.strokeStyle = shade(accent, -0.15); ctx.lineWidth = Math.max(1.4, g.w * 0.3); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(g.tailX - g.tailSpan * 0.1, 0); ctx.lineTo(-g.L * 0.5 + 1, 0); ctx.stroke();
  // cockpit
  ctx.fillStyle = 'rgba(60,105,175,0.95)';
  ctx.beginPath(); ctx.moveTo(g.L * 0.44, 0); ctx.lineTo(g.L * 0.3, -g.w * 0.75); ctx.lineTo(g.L * 0.24, -g.w * 0.72); ctx.lineTo(g.L * 0.28, 0); ctx.lineTo(g.L * 0.24, g.w * 0.72); ctx.lineTo(g.L * 0.3, g.w * 0.75); ctx.closePath(); ctx.fill();
  // windows
  if (g.L > 60) {
    ctx.fillStyle = 'rgba(60,90,140,0.7)';
    const n = Math.floor(g.L / 9);
    for (let i = 0; i < n; i++) {
      const x = g.L * 0.18 - i * 9;
      if (x < -g.L * 0.35) break;
      ctx.fillRect(x, -g.w * 0.98, 3, 2.2);
    }
  }
  if (g.highWing) { drawWings(); drawEngines(); }

  // propellers
  for (const e of g.engines) {
    if (e.kind !== 'prop') continue;
    const px = e.x < g.L * 0.45 ? e.x + g.w * 0.95 : g.L * 0.5 + 1.5;
    const R = t.hull * (e.x < g.L * 0.45 ? 0.55 : 0.6);
    ctx.fillStyle = 'rgba(230,235,245,0.22)';
    ctx.beginPath(); ctx.arc(px, e.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(px, e.y); ctx.rotate(time * 38 + e.y + pv.id);
    ctx.strokeStyle = 'rgba(40,45,60,0.6)'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.lineTo(0, R); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#3a4150'; ctx.beginPath(); ctx.arc(px, e.y, 1.6, 0, Math.PI * 2); ctx.fill();
  }

  // navigation lights
  const strobe = (time * 1.4 + pv.id * 0.37) % 1 < 0.08;
  const tipX = g.wingX + g.chord * 0.2 - g.sweep * 0.9;
  ctx.fillStyle = '#ff4d4d'; ctx.beginPath(); ctx.arc(tipX, -g.span / 2, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#4dff7a'; ctx.beginPath(); ctx.arc(tipX, g.span / 2, 1.5, 0, Math.PI * 2); ctx.fill();
  if (strobe || night) {
    ctx.fillStyle = strobe ? '#ffffff' : 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(-g.L * 0.5 + 1, 0, strobe ? 2.4 : 1.4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

/** Glow pass for night: call with globalCompositeOperation = 'lighter'. */
export function drawPlaneLights(ctx: CanvasRenderingContext2D, pv: PlaneView, time: number): void {
  const g = geo(pv.type);
  const s = planeScale(pv.altitude);
  ctx.save();
  ctx.translate(pv.pos.x, pv.pos.y); ctx.rotate(pv.heading); ctx.scale(s, s);
  const tipX = g.wingX + g.chord * 0.2 - g.sweep * 0.9;
  const glow = (x: number, y: number, r: number, c: string): void => {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, c); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  };
  if (!g.rotor) {
    glow(tipX, -g.span / 2, 9, 'rgba(255,80,80,0.55)');
    glow(tipX, g.span / 2, 9, 'rgba(80,255,140,0.55)');
    glow(g.L * 0.5, 0, 14, 'rgba(255,245,220,0.35)');
  } else {
    glow(0, 0, 10, 'rgba(255,90,90,0.5)');
  }
  const strobe = (time * 1.4 + pv.id * 0.37) % 1 < 0.08;
  if (strobe) glow(-g.L * 0.5 + 1, 0, 16, 'rgba(255,255,255,0.8)');
  ctx.restore();
}

/** Small stylised aeroplane used in HUD and menus (nose pointing up). */
export function drawPlaneGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 20, size / 20); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(10, 0); ctx.quadraticCurveTo(8, -2.6, 2, -2.6); ctx.lineTo(-1, -10); ctx.lineTo(-5, -10); ctx.lineTo(-3.5, -2.4);
  ctx.lineTo(-7, -2); ctx.lineTo(-8, -5); ctx.lineTo(-10, -5); ctx.lineTo(-9.5, 0); ctx.lineTo(-10, 5); ctx.lineTo(-8, 5); ctx.lineTo(-7, 2);
  ctx.lineTo(-3.5, 2.4); ctx.lineTo(-5, 10); ctx.lineTo(-1, 10); ctx.lineTo(2, 2.6); ctx.quadraticCurveTo(8, 2.6, 10, 0);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

export function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, filled: boolean, color: string): void {
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 20, size / 20);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-12, -3, -6, -12, 0, -6);
  ctx.bezierCurveTo(6, -12, 12, -3, 0, 6);
  ctx.closePath();
  if (filled) { ctx.fillStyle = color; ctx.fill(); }
  ctx.strokeStyle = filled ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6; ctx.stroke();
  ctx.restore();
}
