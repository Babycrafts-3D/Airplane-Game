import { interpolate, type Report } from '../game/postmortem';
import { RING_EXTRA, World } from '../game/world';
import { PLANE_TYPES } from '../game/planes';
import { TAU } from '../util/math';
import type { Palette } from '../render/palette';
import { drawPlane, drawPlaneShadow } from '../render/planes';
import type { TerrainData } from '../render/terrain';
import { t } from '../i18n';

const COLORS = ['#ffb04d', '#5ec8ff'];

export class ReplayView {
  el: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private range: HTMLInputElement;
  private label: HTMLSpanElement;
  private playBtn: HTMLButtonElement;
  private tStart: number;
  private tEnd: number;
  private time: number;
  private playing = true;
  private raf = 0;
  private last = 0;
  private center = { x: 0, y: 0 };
  private typeById = new Map<number, string>();

  constructor(private world: World, private terrain: TerrainData, private pal: Palette, private report: Report) {
    const first = world.snapshots[0]?.t ?? 0;
    this.tStart = Math.max(first, report.tIncident - 8);
    this.tEnd = report.tIncident + (report.kind === 'crash' ? 0.5 : 1.5);
    this.time = this.tStart;
    for (const e of world.events) if (e.kind === 'spawn') this.typeById.set(e.planes[0], Object.values(PLANE_TYPES).find(pt => pt.name === e.text)?.id ?? 'c172');
    for (const p of world.planes) this.typeById.set(p.id, p.type.id);

    const inc = interpolate(world, report.tIncident - 0.05).filter(p => report.involved.includes(p.id));
    if (inc.length) {
      this.center = { x: inc.reduce((s, p) => s + p.x, 0) / inc.length, y: inc.reduce((s, p) => s + p.y, 0) / inc.length };
    }

    this.el = document.createElement('div');
    this.el.className = 'replay';
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.el.appendChild(this.canvas);
    const scrub = document.createElement('div'); scrub.className = 'scrub';
    this.playBtn = document.createElement('button'); this.playBtn.className = 'playbtn'; this.playBtn.setAttribute('aria-label', t('replay'));
    this.range = document.createElement('input'); this.range.type = 'range'; this.range.min = '0'; this.range.max = '1000'; this.range.value = '0';
    this.label = document.createElement('span'); this.label.className = 'time';
    scrub.append(this.playBtn, this.range, this.label);
    this.el.appendChild(scrub);
    this.playBtn.addEventListener('click', () => { this.playing = !this.playing; this.updatePlayIcon(); });
    this.range.addEventListener('input', () => { this.playing = false; this.updatePlayIcon(); this.time = this.tStart + (parseInt(this.range.value, 10) / 1000) * (this.tEnd - this.tStart); this.draw(); });
    this.updatePlayIcon();
    this.raf = requestAnimationFrame(this.tick);
  }

  private updatePlayIcon(): void {
    this.playBtn.innerHTML = this.playing
      ? '<svg viewBox="0 0 20 20" width="16" height="16"><rect x="4" y="3" width="4" height="14" rx="1.5" fill="#12294a"/><rect x="12" y="3" width="4" height="14" rx="1.5" fill="#12294a"/></svg>'
      : '<svg viewBox="0 0 20 20" width="16" height="16"><path d="M6 3.5v13l10-6.5z" fill="#12294a"/></svg>';
  }

  destroy(): void { cancelAnimationFrame(this.raf); }

  private tick = (now: number): void => {
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.playing) {
      this.time += dt * 0.55;
      if (this.time > this.tEnd) { this.time = this.tStart; }
      this.range.value = String(Math.round(((this.time - this.tStart) / (this.tEnd - this.tStart)) * 1000));
    }
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private draw(): void {
    const el = this.el;
    const cssW = el.clientWidth || 320, cssH = Math.round(cssW * 0.78);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(cssW * dpr)) { this.canvas.width = Math.round(cssW * dpr); this.canvas.height = Math.round(cssH * dpr); this.canvas.style.height = `${cssH}px`; }
    const ctx = this.ctx, pal = this.pal;
    const viewW = 620; // world units visible horizontally
    const scale = (cssW * dpr) / viewW;
    const viewH = (cssH * dpr) / scale;
    const cx = Math.max(viewW / 2 - 80, Math.min(this.world.W - viewW / 2 + 80, this.center.x));
    const cy = Math.max(viewH / 2 - 80, Math.min(this.world.H - viewH / 2 + 80, this.center.y));
    const x0 = cx - viewW / 2, y0 = cy - viewH / 2;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = pal.seaDeep; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const ps = this.terrain.pixelScale;
    ctx.drawImage(this.terrain.canvas, x0 * ps, y0 * ps, viewW * ps, viewH * ps, 0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, -x0 * scale, -y0 * scale);
    if (pal.tint) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = pal.tintAlpha; ctx.fillStyle = pal.tint; ctx.fillRect(x0, y0, viewW, viewH); ctx.restore(); }

    const px = 1 / scale * dpr;
    const frame = interpolate(this.world, this.time);
    const inv = this.report.involved;

    // routes of the involved aircraft at this moment
    inv.forEach((id, idx) => {
      const p = frame.find(f => f.id === id);
      if (!p || !p.path || p.path.length < 2) return;
      ctx.strokeStyle = COLORS[idx]; ctx.lineWidth = 2.5 * px; ctx.setLineDash([8 * px, 6 * px]); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.path[0].x, p.path[0].y);
      for (let i = 1; i < p.path.length; i++) ctx.lineTo(p.path[i].x, p.path[i].y);
      ctx.stroke(); ctx.setLineDash([]);
    });
    // ghost trails from the start of the replay window
    inv.forEach((id, idx) => {
      ctx.strokeStyle = COLORS[idx]; ctx.globalAlpha = 0.55; ctx.lineWidth = 4 * px; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); let started = false;
      for (const s of this.world.snapshots) {
        if (s.t < this.tStart) continue; if (s.t > this.time) break;
        const sp = s.planes.find(q => q.id === id); if (!sp) continue;
        if (!started) { ctx.moveTo(sp.x, sp.y); started = true; } else ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    });

    const views = frame.map(f => {
      const type = PLANE_TYPES[this.typeById.get(f.id) ?? 'c172'];
      return { f, view: { type, pos: { x: f.x, y: f.y }, heading: f.h, altitude: f.alt, bank: 0, livery: f.id % 3, state: f.state, id: f.id } };
    });
    for (const v of views) drawPlaneShadow(ctx, v.view, pal.shadowAlpha);
    for (const v of views) {
      const isInv = inv.includes(v.f.id);
      ctx.globalAlpha = isInv ? 1 : 0.45;
      if (v.f.state !== 'crashed' || this.time < this.report.tIncident) drawPlane(ctx, v.view, this.time, pal.lightsOn);
      ctx.globalAlpha = 1;
      if (isInv) {
        const idx = inv.indexOf(v.f.id);
        ctx.strokeStyle = COLORS[idx]; ctx.lineWidth = 2.4 * px;
        ctx.beginPath(); ctx.arc(v.f.x, v.f.y, v.view.type.hull + RING_EXTRA, 0, TAU); ctx.stroke();
        ctx.fillStyle = COLORS[idx]; ctx.font = `900 ${12 * px}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'center';
        ctx.fillText(v.view.type.name, v.f.x, v.f.y - v.view.type.hull - RING_EXTRA - 8 * px);
      }
    }
    const a = views.find(v => v.f.id === inv[0]), b = views.find(v => v.f.id === inv[1]);
    if (a && b) {
      const gap = Math.max(0, Math.hypot(a.f.x - b.f.x, a.f.y - b.f.y) - a.view.type.hull - b.view.type.hull);
      const hot = gap < 60;
      ctx.strokeStyle = hot ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.6 * px; ctx.setLineDash([5 * px, 5 * px]);
      ctx.beginPath(); ctx.moveTo(a.f.x, a.f.y); ctx.lineTo(b.f.x, b.f.y); ctx.stroke(); ctx.setLineDash([]);
      const mx = (a.f.x + b.f.x) / 2, my = (a.f.y + b.f.y) / 2;
      const label = `${Math.round(gap)} m`;
      ctx.font = `900 ${14 * px}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const w = ctx.measureText(label).width + 16 * px, h = 22 * px;
      ctx.fillStyle = hot ? 'rgba(200,30,60,0.95)' : 'rgba(20,40,70,0.85)';
      ctx.beginPath(); ctx.roundRect(mx - w / 2, my - h / 2 + 18 * px, w, h, h / 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(label, mx, my + 18 * px);
    }
    if (this.time >= this.report.tIncident && this.report.kind === 'crash') {
      const k = Math.min(1, (this.time - this.report.tIncident) / 0.5);
      ctx.fillStyle = `rgba(255,120,80,${0.5 * (1 - k)})`; ctx.fillRect(x0, y0, viewW, viewH);
    }
    const rel = this.time - this.report.tIncident;
    this.label.textContent = `${rel >= 0 ? '+' : ''}${rel.toFixed(1)} s`;
  }
}
