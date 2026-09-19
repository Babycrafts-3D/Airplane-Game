import type { PlaneState, PlaneType, Shape } from '../game/types';
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

const ALT_ACCENTS = ['#f2a541', '#5aa9e6', '#8bd17c', '#ff5f8f', '#7c5cff'];

function accentFor(pv: PlaneView): string {
  if (pv.type.military) return pv.type.livery.accent;
  return pv.livery === 0 ? pv.type.livery.accent : ALT_ACCENTS[(pv.livery + pv.id) % ALT_ACCENTS.length];
}

export const planeScale = (alt: number): number => 0.74 + 0.26 * alt;

function fuselagePath(ctx: CanvasRenderingContext2D, g: Shape): void {
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

function fighterFuselagePath(ctx: CanvasRenderingContext2D, g: Shape): void {
  const L = g.L, w = g.w;
  ctx.beginPath();
  ctx.moveTo(L / 2, 0);
  ctx.lineTo(L * 0.2, -w * 0.9);
  ctx.lineTo(-L * 0.35, -w * 1.05);
  ctx.lineTo(-L / 2, -w * 0.7);
  ctx.lineTo(-L / 2, w * 0.7);
  ctx.lineTo(-L * 0.35, w * 1.05);
  ctx.lineTo(L * 0.2, w * 0.9);
  ctx.closePath();
}

function wingPath(ctx: CanvasRenderingContext2D, g: Shape, side: 1 | -1): void {
  const half = g.span / 2, c = g.chord, s = g.sweep, x0 = g.wingX;
  ctx.beginPath();
  if (g.delta) {
    ctx.moveTo(x0 + c * 0.9, side * g.w * 0.7);
    ctx.lineTo(x0 - c * 0.55, side * half);
    ctx.lineTo(x0 - c * 0.75, side * half);
    ctx.lineTo(x0 - c * 0.75, side * g.w * 0.7);
    ctx.closePath();
    return;
  }
  ctx.moveTo(x0 + c * 0.6, side * g.w * 0.6);
  ctx.lineTo(x0 + c * 0.6 - s, side * half);
  ctx.lineTo(x0 - c * 0.5 - s * 1.05, side * half);
  ctx.lineTo(x0 - c * 0.75, side * g.w * 0.6);
  ctx.closePath();
}

function tailPath(ctx: CanvasRenderingContext2D, g: Shape, side: 1 | -1): void {
  const half = g.tailSpan / 2, x0 = g.tailX, c = g.tailSpan * 0.32, s = g.sweep * 0.5;
  ctx.beginPath();
  ctx.moveTo(x0 + c * 0.5, side * g.w * 0.4);
  ctx.lineTo(x0 + c * 0.4 - s, side * half);
  ctx.lineTo(x0 - c * 0.45 - s, side * half);
  ctx.lineTo(x0 - c * 0.6, side * g.w * 0.4);
  ctx.closePath();
}

function heliBodyPath(ctx: CanvasRenderingContext2D, g: Shape): void {
  const L = g.L, w = g.w;
  ctx.beginPath();
  if (g.rotor === 'tandem') {
    ctx.moveTo(L * 0.5, 0);
    ctx.bezierCurveTo(L * 0.5, -w, L * 0.3, -w, L * 0.2, -w);
    ctx.lineTo(-L * 0.4, -w);
    ctx.bezierCurveTo(-L * 0.5, -w, -L * 0.5, w, -L * 0.4, w);
    ctx.lineTo(L * 0.2, w);
    ctx.bezierCurveTo(L * 0.3, w, L * 0.5, w, L * 0.5, 0);
    ctx.closePath();
    return;
  }
  ctx.moveTo(L * 0.5, 0);
  ctx.bezierCurveTo(L * 0.5, -w, L * 0.05, -w, -L * 0.1, -w * 0.6);
  ctx.lineTo(-L * 0.75, -w * 0.13);
  ctx.lineTo(-L * 0.75, w * 0.13);
  ctx.lineTo(-L * 0.1, w * 0.6);
  ctx.bezierCurveTo(L * 0.05, w, L * 0.5, w, L * 0.5, 0);
  ctx.closePath();
}

/** Silhouette used for the shadow. */
function silhouette(ctx: CanvasRenderingContext2D, g: Shape): void {
  if (g.rotor) {
    heliBodyPath(ctx, g); ctx.fill();
    if (g.rotor === 'single') { ctx.beginPath(); ctx.ellipse(g.tailX, 0, g.tailSpan * 0.32, g.tailSpan * 0.55, 0, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  wingPath(ctx, g, 1); ctx.fill();
  wingPath(ctx, g, -1); ctx.fill();
  tailPath(ctx, g, 1); ctx.fill();
  tailPath(ctx, g, -1); ctx.fill();
  if (g.canopy) fighterFuselagePath(ctx, g); else fuselagePath(ctx, g);
  ctx.fill();
}

export function drawPlaneShadow(ctx: CanvasRenderingContext2D, pv: PlaneView, shadowAlpha: number): void {
  const g = pv.type.shape;
  const s = planeScale(pv.altitude);
  const off = 8 + pv.altitude * 26;
  ctx.save();
  ctx.translate(pv.pos.x + off * 0.55, pv.pos.y + off);
  ctx.rotate(pv.heading);
  ctx.scale(s, s);
  ctx.fillStyle = `rgba(10, 30, 60, ${shadowAlpha * (0.55 + 0.45 * (1 - pv.altitude))})`;
  silhouette(ctx, g);
  ctx.restore();
}

function drawRotor(ctx: CanvasRenderingContext2D, cx: number, R: number, time: number, seed: number): void {
  ctx.fillStyle = 'rgba(220,230,245,0.16)';
  ctx.beginPath(); ctx.arc(cx, 0, R, 0, Math.PI * 2); ctx.fill();
  ctx.save(); ctx.translate(cx, 0); ctx.rotate(time * 22 + seed);
  ctx.strokeStyle = 'rgba(40,45,60,0.55)'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(R, 0); ctx.stroke(); ctx.rotate(Math.PI / 2); }
  ctx.restore();
  ctx.fillStyle = '#3a4150'; ctx.beginPath(); ctx.arc(cx, 0, 3, 0, Math.PI * 2); ctx.fill();
}

export function drawPlane(ctx: CanvasRenderingContext2D, pv: PlaneView, time: number, night: boolean): void {
  const t = pv.type, g = t.shape;
  const s = planeScale(pv.altitude);
  const accent = accentFor(pv);
  const body = t.livery.body, wing = t.military ? shade(body, -0.06) : t.livery.wing;
  const outline = 'rgba(40, 55, 80, 0.55)';
  ctx.save();
  ctx.translate(pv.pos.x, pv.pos.y);
  ctx.rotate(pv.heading);
  ctx.scale(s, s * (1 - 0.14 * Math.abs(pv.bank)));
  ctx.lineJoin = 'round';
  ctx.lineWidth = 1.2;

  if (g.rotor) {
    // skids / wheels
    ctx.strokeStyle = 'rgba(60,70,90,0.8)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(g.L * 0.3, -g.w * 1.1); ctx.lineTo(-g.L * 0.2, -g.w * 1.1); ctx.moveTo(g.L * 0.3, g.w * 1.1); ctx.lineTo(-g.L * 0.2, g.w * 1.1); ctx.stroke();
    if (g.rotor === 'single') {
      ctx.fillStyle = shade(body, -0.08); ctx.strokeStyle = outline; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(g.tailX, 0, g.tailSpan * 0.32, g.tailSpan * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath(); ctx.ellipse(g.tailX, 0, g.tailSpan * 0.16, g.tailSpan * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    heliBodyPath(ctx, g);
    const grd = ctx.createLinearGradient(0, -g.w, 0, g.w);
    grd.addColorStop(0, shade(body, 0.05)); grd.addColorStop(0.5, body); grd.addColorStop(1, shade(body, -0.16));
    ctx.fillStyle = grd; ctx.fill(); ctx.strokeStyle = outline; ctx.stroke();
    // canopy
    ctx.fillStyle = 'rgba(70,120,190,0.85)';
    ctx.beginPath(); ctx.moveTo(g.L * 0.47, 0); ctx.bezierCurveTo(g.L * 0.47, -g.w * 0.8, g.L * 0.2, -g.w * 0.8, g.L * 0.1, -g.w * 0.5); ctx.lineTo(g.L * 0.1, g.w * 0.5); ctx.bezierCurveTo(g.L * 0.2, g.w * 0.8, g.L * 0.47, g.w * 0.8, g.L * 0.47, 0); ctx.fill();
    ctx.strokeStyle = accent; ctx.lineWidth = g.w * 0.28;
    ctx.beginPath(); ctx.moveTo(g.L * 0.05, -g.w * 0.45); ctx.lineTo(-g.L * 0.7, -g.w * 0.05); ctx.stroke();
    if (g.rotor === 'tandem') {
      drawRotor(ctx, g.L * 0.28, t.hull * 1.25, time, pv.id);
      drawRotor(ctx, -g.L * 0.3, t.hull * 1.25, time * 1.02, pv.id + 2);
    } else {
      drawRotor(ctx, 0, t.hull * 1.65, time, pv.id);
    }
    ctx.restore();
    return;
  }

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
      if (!t.military) {
        ctx.save(); ctx.clip();
        ctx.fillStyle = accent;
        ctx.fillRect(-g.L, side * (g.span / 2 - g.chord * 0.32), g.L * 2, g.chord * 0.4 * side);
        ctx.restore();
      }
      if (g.winglets) {
        ctx.strokeStyle = accent; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
        const tipX = g.wingX + g.chord * 0.6 - g.sweep;
        ctx.beginPath(); ctx.moveTo(tipX - g.chord * 0.1, side * g.span / 2); ctx.lineTo(tipX - g.chord * 0.6, side * g.span / 2); ctx.stroke();
      }
    }
  };
  const drawEngines = (): void => {
    for (const e of g.engines) {
      if (e.kind === 'jet' || e.kind === 'rearjet') {
        ctx.fillStyle = shade(body, -0.12); ctx.strokeStyle = outline; ctx.lineWidth = 1;
        const len = e.kind === 'rearjet' ? g.w * 2.2 : g.w * 1.8;
        ctx.beginPath(); ctx.roundRect(e.x - len / 2, e.y - g.w * 0.42, len, g.w * 0.84, g.w * 0.42); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2f3542'; ctx.beginPath(); ctx.ellipse(e.x + len / 2 - g.w * 0.05, e.y, g.w * 0.12, g.w * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      } else if (e.x < g.L * 0.45) {
        ctx.fillStyle = shade(body, -0.08); ctx.strokeStyle = outline; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(e.x - g.w * 0.8, e.y - g.w * 0.36, g.w * 1.7, g.w * 0.72, g.w * 0.36); ctx.fill(); ctx.stroke();
      }
    }
  };

  if (!g.highWing) { drawWings(); drawEngines(); }

  // tailplane (+ twin fins for fighters)
  for (const side of [1, -1] as const) {
    tailPath(ctx, g, side); ctx.fillStyle = t.military ? shade(body, -0.1) : accent; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1; ctx.stroke();
  }
  if (g.twinTail) {
    ctx.strokeStyle = shade(body, -0.35); ctx.lineWidth = Math.max(1.5, g.w * 0.3); ctx.lineCap = 'round';
    for (const side of [1, -1]) { ctx.beginPath(); ctx.moveTo(g.tailX + g.tailSpan * 0.1, side * g.w * 0.75); ctx.lineTo(g.tailX - g.tailSpan * 0.35, side * g.w * 0.9); ctx.stroke(); }
  }
  // fuselage
  if (g.canopy) fighterFuselagePath(ctx, g); else fuselagePath(ctx, g);
  const fg = ctx.createLinearGradient(0, -g.w, 0, g.w);
  fg.addColorStop(0, shade(body, 0.04)); fg.addColorStop(0.45, body); fg.addColorStop(1, shade(body, -0.2));
  ctx.fillStyle = fg; ctx.fill(); ctx.strokeStyle = outline; ctx.lineWidth = 1.2; ctx.stroke();
  if (g.hump) {
    ctx.fillStyle = shade(body, 0.08);
    ctx.beginPath(); ctx.roundRect(-g.L * 0.05, -g.w * 0.62, g.L * 0.45, g.w * 1.24, g.w * 0.6); ctx.fill();
    ctx.strokeStyle = 'rgba(40,55,80,0.25)'; ctx.stroke();
  }
  // cheatline (civil) or roundel (military)
  if (!t.military) {
    ctx.save(); if (g.canopy) fighterFuselagePath(ctx, g); else fuselagePath(ctx, g); ctx.clip();
    ctx.fillStyle = hexA(accent, 0.9);
    ctx.fillRect(-g.L * 0.5, g.w * 0.45, g.L * 0.85, g.w * 0.22);
    ctx.restore();
  } else {
    ctx.fillStyle = '#e0413e'; ctx.beginPath(); ctx.arc(-g.L * 0.1, g.w * 0.45, g.w * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-g.L * 0.1, g.w * 0.45, g.w * 0.17, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1f4e8c'; ctx.beginPath(); ctx.arc(-g.L * 0.1, g.w * 0.45, g.w * 0.08, 0, Math.PI * 2); ctx.fill();
  }
  // fin (seen from above as a short spine)
  if (!g.twinTail) {
    ctx.strokeStyle = t.military ? shade(body, -0.35) : shade(accent, -0.15); ctx.lineWidth = Math.max(1.4, g.w * 0.3); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(g.tailX - g.tailSpan * 0.1, 0); ctx.lineTo(-g.L * 0.5 + 1, 0); ctx.stroke();
  }
  // cockpit / canopy
  if (g.canopy) {
    ctx.fillStyle = 'rgba(40,70,120,0.9)';
    ctx.beginPath(); ctx.ellipse(g.L * 0.18, 0, g.L * 0.16, g.w * 0.62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(180,220,255,0.5)';
    ctx.beginPath(); ctx.ellipse(g.L * 0.2, -g.w * 0.15, g.L * 0.08, g.w * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(60,105,175,0.95)';
    ctx.beginPath(); ctx.moveTo(g.L * 0.44, 0); ctx.lineTo(g.L * 0.3, -g.w * 0.75); ctx.lineTo(g.L * 0.24, -g.w * 0.72); ctx.lineTo(g.L * 0.28, 0); ctx.lineTo(g.L * 0.24, g.w * 0.72); ctx.lineTo(g.L * 0.3, g.w * 0.75); ctx.closePath(); ctx.fill();
  }
  // windows
  if (g.L > 60 && !g.canopy && !t.military) {
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
  // afterburner glow
  if (g.afterburner && pv.state === 'flying') {
    const n = g.afterburners ?? 1;
    for (let i = 0; i < n; i++) {
      const y = n === 1 ? 0 : (i === 0 ? -1 : 1) * g.w * 0.45;
      const flick = 0.7 + 0.3 * Math.sin(time * 40 + i);
      const gr = ctx.createRadialGradient(-g.L * 0.5, y, 0, -g.L * 0.5, y, g.w * 0.9 * flick);
      gr.addColorStop(0, 'rgba(255,240,200,0.95)'); gr.addColorStop(0.4, 'rgba(255,140,40,0.7)'); gr.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(-g.L * 0.5 - g.w * 0.4, y, g.w * 1.4 * flick, g.w * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    }
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
  const g = pv.type.shape;
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
    if (g.afterburner) glow(-g.L * 0.5, 0, 22, 'rgba(255,150,60,0.6)');
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
