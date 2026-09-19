import { displayKmh, runwayAccepts } from '../game/planes';
import type { World } from '../game/world';
import { t } from '../i18n';
import { levelProgress } from '../util/storage';
import type { Palette } from './palette';
import { drawHeart, drawPlane, drawPlaneGlyph } from './planes';

type Ctx = CanvasRenderingContext2D;

export interface HudLayout { sw: number; sh: number; safeTop: number; safeBottom: number; safeLeft: number; safeRight: number; ui: number }
export interface Rect { x: number; y: number; w: number; h: number }
export interface HudHits { pause: Rect; slowmo?: Rect }

function roundedCard(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.stroke();
}

export function drawCoin(ctx: Ctx, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  g.addColorStop(0, '#fff1a8'); g.addColorStop(0.6, '#ffcf5a'); g.addColorStop(1, '#d99a12');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,0,0.5)'; ctx.lineWidth = r * 0.12; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = r * 0.14;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
}

export function drawHud(ctx: Ctx, world: World, L: HudLayout, time: number, pal: Palette): HudHits {
  const u = L.ui;
  const font = (w: string, s: number): string => `${w} ${Math.round(s * u)}px Nunito, system-ui, sans-serif`;
  const top = L.safeTop + 12 * u;
  const left = L.safeLeft + 12 * u;
  const right = L.sw - L.safeRight - 12 * u;

  // --- counter card ---
  const cw = 156 * u, ch = 72 * u;
  roundedCard(ctx, left, top, cw, ch, 18 * u, pal.hud);
  drawPlaneGlyph(ctx, left + 26 * u, top + 26 * u, 30 * u, '#9fd7ff');
  ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = font('800', 10); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(t('landed').toUpperCase(), left + 50 * u, top + 20 * u);
  ctx.fillStyle = '#fff'; ctx.font = font('900', 26);
  const num = world.landed.toString();
  ctx.fillText(num, left + 50 * u, top + 44 * u);
  const nw = ctx.measureText(num).width;
  ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = font('800', 13);
  ctx.fillText(world.endless ? t('endless').toLowerCase() : `/ ${world.level.goal}`, left + 54 * u + nw, top + 44 * u);
  // hearts
  for (let i = 0; i < world.maxHearts; i++) drawHeart(ctx, left + 26 * u + i * 15 * u, top + 58 * u, 14 * u, i < world.hearts, '#ff6a8a');
  // best + coins earned
  const best = levelProgress(world.level.id).best;
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = font('900', 11);
  ctx.shadowColor = 'rgba(0,20,50,0.6)'; ctx.shadowBlur = 6 * u;
  ctx.fillText(`${t('best').toUpperCase()}: ${Math.max(best, world.landed)}`, left + 6 * u, top + ch + 16 * u);
  if (world.coinsEarned > 0) {
    drawCoin(ctx, left + 90 * u, top + ch + 12 * u, 6 * u);
    ctx.fillText(`+${world.coinsEarned}`, left + 100 * u, top + ch + 16 * u);
  }
  ctx.shadowBlur = 0;

  // --- pause button ---
  const pr = 22 * u;
  const px = right - pr, py = top + pr;
  ctx.fillStyle = pal.hud; ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.roundRect(px - 7 * u, py - 8 * u, 5 * u, 16 * u, 2 * u); ctx.fill();
  ctx.beginPath(); ctx.roundRect(px + 2 * u, py - 8 * u, 5 * u, 16 * u, 2 * u); ctx.fill();
  const hits: HudHits = { pause: { x: px - pr - 8, y: py - pr - 8, w: pr * 2 + 16, h: pr * 2 + 16 } };

  // --- wind ---
  if (world.level.wind) {
    const wx = right - 46 * u - 22 * u, wy = top + 22 * u;
    const pillW = 110 * u, pillH = 44 * u;
    roundedCard(ctx, wx - pillW + 22 * u, wy - pillH / 2, pillW, pillH, pillH / 2, pal.hud);
    const cx = wx - pillW + 22 * u + 22 * u;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5 * u;
    ctx.beginPath(); ctx.arc(cx, wy, 14 * u, 0, Math.PI * 2); ctx.stroke();
    ctx.save(); ctx.translate(cx, wy); ctx.rotate(world.wind.dirRad);
    const gust = 1 + 0.08 * Math.sin(time * 6);
    ctx.fillStyle = '#bfe9ff';
    ctx.beginPath(); ctx.moveTo(12 * u * gust, 0); ctx.lineTo(-6 * u, -7 * u); ctx.lineTo(-2 * u, 0); ctx.lineTo(-6 * u, 7 * u); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = font('900', 15); ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(world.wind.kmh)}`, cx + 22 * u, wy + 5 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = font('800', 10);
    ctx.fillText(t('kmh'), cx + 22 * u + ctx.measureText('00').width * 1.6, wy + 5 * u);
  }

  // --- slow-motion button (upgrade) ---
  if (world.slowmoMax > 0) {
    const r = 28 * u;
    const bx = right - r, by = L.sh - L.safeBottom - 16 * u - r;
    const active = world.timeScale < 1;
    const avail = world.slowmoCharges > 0 && !active;
    ctx.fillStyle = active ? 'rgba(80,140,255,0.9)' : avail ? pal.hud : 'rgba(40,50,70,0.45)';
    ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke();
    // hourglass-like tower icon: a clock with slow hand
    ctx.strokeStyle = avail || active ? '#fff' : 'rgba(255,255,255,0.4)'; ctx.lineWidth = 2.2 * u; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(bx, by - 2 * u, 11 * u, 0, Math.PI * 2); ctx.stroke();
    const a = active ? time * 1.5 : -Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(bx, by - 2 * u); ctx.lineTo(bx + Math.cos(a) * 7 * u, by - 2 * u + Math.sin(a) * 7 * u); ctx.stroke();
    for (let i = 0; i < world.slowmoMax; i++) {
      ctx.fillStyle = i < world.slowmoCharges ? '#7cf7a0' : 'rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.arc(bx - 6 * u + i * 12 * u, by + 15 * u, 3 * u, 0, Math.PI * 2); ctx.fill();
    }
    hits.slowmo = { x: bx - r - 6, y: by - r - 6, w: r * 2 + 12, h: r * 2 + 12 };
  }

  // --- toasts ---
  let ty = top + 96 * u;
  ctx.textAlign = 'center';
  for (const toast of world.toasts) {
    const remain = toast.until - world.time;
    const a = Math.min(1, remain / 0.4);
    ctx.font = font('800', 14);
    const w = ctx.measureText(toast.text).width + 36 * u, h = 34 * u;
    const bg = toast.kind === 'bad' ? 'rgba(200,40,70,0.9)' : toast.kind === 'warn' ? 'rgba(235,150,30,0.92)' : toast.kind === 'good' ? 'rgba(40,170,120,0.92)' : 'rgba(20,40,70,0.75)';
    ctx.globalAlpha = a;
    roundedCard(ctx, L.sw / 2 - w / 2, ty, w, h, h / 2, bg);
    ctx.fillStyle = '#fff'; ctx.fillText(toast.text, L.sw / 2, ty + 22.5 * u);
    ctx.globalAlpha = 1;
    ty += h + 8 * u;
  }

  // --- selected aircraft card ---
  const sel = world.selected !== null ? world.planeById(world.selected) : undefined;
  if (sel && world.selectedUntil > world.time && sel.state === 'flying') {
    const a = Math.min(1, (world.selectedUntil - world.time) / 0.3);
    const w = Math.min(L.sw - 24 * u - (world.slowmoMax > 0 ? 70 * u : 0), 340 * u), h = 84 * u;
    const x = (world.slowmoMax > 0 ? L.safeLeft + 12 * u : L.sw / 2 - w / 2), y = L.sh - L.safeBottom - h - 16 * u;
    ctx.globalAlpha = a;
    roundedCard(ctx, x, y, w, h, 20 * u, pal.hud);
    ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 20 * u); ctx.clip();
    ctx.translate(x + 44 * u, y + h / 2);
    const s = (u * 1.25) / Math.max(0.9, sel.type.hull / 22);
    ctx.scale(s, s);
    drawPlane(ctx, { type: sel.type, pos: { x: 0, y: 0 }, heading: -Math.PI / 2, altitude: 1, bank: 0, livery: sel.livery, state: 'flying', id: sel.id }, time, false);
    ctx.restore();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff'; ctx.font = font('900', 16);
    ctx.fillText(sel.type.name, x + 90 * u, y + 28 * u);
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = font('700', 12.5);
    const rws = world.runways.filter(r => runwayAccepts(r.kind, sel.type.cls)).map(r => world.runwayName(r));
    const lands = rws.length ? rws.join(' / ') : '-';
    ctx.fillText(`${t('speed')}: ${displayKmh(sel.type.speed)} ${t('kmh')}`, x + 90 * u, y + 48 * u);
    ctx.fillText(`${t('landsOn')}: ${lands}`, x + 90 * u, y + 66 * u);
    ctx.globalAlpha = 1;
  }
  return hits;
}
