import type { Palette } from './palette';
import { hexA, shade } from './palette';

export interface LightSpot { x: number; y: number; r: number; color: string; kind: 'window' | 'runway' | 'buoy' | 'beacon' | 'lamp' }

type Ctx = CanvasRenderingContext2D;

function shadowEllipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, pal: Palette): void {
  ctx.fillStyle = `rgba(20, 50, 40, ${pal.shadowAlpha})`;
  ctx.beginPath(); ctx.ellipse(x + rx * 0.35, y + ry * 0.3, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
}

export function drawTree(ctx: Ctx, x: number, y: number, r: number, pal: Palette, variant: number): void {
  shadowEllipse(ctx, x, y + r * 0.2, r * 1.15, r * 0.5, pal);
  ctx.fillStyle = pal.trunk;
  ctx.fillRect(x - r * 0.14, y - r * 0.1, r * 0.28, r * 0.5);
  const cols = [pal.treeA, pal.treeB, pal.treeC];
  const baseCol = cols[variant % 3];
  ctx.fillStyle = shade(baseCol, -0.18);
  ctx.beginPath(); ctx.arc(x, y - r * 0.15, r * 1.02, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = baseCol;
  ctx.beginPath();
  ctx.arc(x, y - r * 0.3, r * 0.82, 0, Math.PI * 2);
  ctx.arc(x - r * 0.55, y + r * 0.02, r * 0.6, 0, Math.PI * 2);
  ctx.arc(x + r * 0.55, y + r * 0.02, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(baseCol, 0.28);
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.5, r * 0.36, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(baseCol, 0.16);
  ctx.beginPath(); ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.22, 0, Math.PI * 2); ctx.fill();
}

export function drawPine(ctx: Ctx, x: number, y: number, r: number, pal: Palette, variant: number): void {
  shadowEllipse(ctx, x, y + r * 0.15, r * 0.9, r * 0.4, pal);
  ctx.fillStyle = pal.trunk; ctx.fillRect(x - r * 0.12, y, r * 0.24, r * 0.35);
  const col = variant % 2 === 0 ? pal.pineA : pal.pineB;
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const w = r * (1.1 - i * 0.28), h = r * 0.9, top = y - r * 0.2 - i * r * 0.55;
    ctx.fillStyle = shade(col, -0.15 + i * 0.05);
    ctx.beginPath(); ctx.moveTo(x, top - h); ctx.lineTo(x + w, top); ctx.lineTo(x - w, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(col, 0.18 + i * 0.05);
    ctx.beginPath(); ctx.moveTo(x, top - h); ctx.lineTo(x - w, top); ctx.lineTo(x - w * 0.15, top); ctx.closePath(); ctx.fill();
  }
}

export function drawPalm(ctx: Ctx, x: number, y: number, r: number, pal: Palette, variant: number): void {
  shadowEllipse(ctx, x, y + r * 0.1, r * 1.2, r * 0.45, pal);
  const lean = (variant % 2 === 0 ? 1 : -1) * r * 0.5;
  ctx.strokeStyle = pal.trunk; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y + r * 0.2); ctx.quadraticCurveTo(x + lean * 0.4, y - r * 0.6, x + lean, y - r * 1.3); ctx.stroke();
  const tx = x + lean, ty = y - r * 1.3;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + variant;
    ctx.fillStyle = i % 2 === 0 ? pal.palmA : pal.palmB;
    ctx.save(); ctx.translate(tx, ty); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(r * 0.55, 0, r * 0.62, r * 0.2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#c98a3b'; ctx.beginPath(); ctx.arc(tx, ty, r * 0.14, 0, Math.PI * 2); ctx.fill();
}

export function drawBush(ctx: Ctx, x: number, y: number, r: number, pal: Palette): void {
  ctx.fillStyle = shade(pal.treeB, -0.05);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.arc(x + r * 0.8, y + r * 0.2, r * 0.7, 0, Math.PI * 2); ctx.arc(x - r * 0.7, y + r * 0.25, r * 0.65, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(pal.treeC, 0.1);
  ctx.beginPath(); ctx.arc(x - r * 0.2, y - r * 0.3, r * 0.4, 0, Math.PI * 2); ctx.fill();
}

export function drawFlowers(ctx: Ctx, x: number, y: number, rng: () => number, pal: Palette): void {
  const cols = ['#ff8fb1', '#ffd66b', '#ffffff', '#c58dff'];
  for (let i = 0; i < 7; i++) {
    const a = rng() * Math.PI * 2, d = rng() * 14;
    ctx.fillStyle = cols[Math.floor(rng() * cols.length)];
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  void pal;
}

export function drawHouse(ctx: Ctx, x: number, y: number, w: number, h: number, roofCol: string, pal: Palette, lights: LightSpot[], rng: () => number): void {
  shadowEllipse(ctx, x, y + 2, w * 0.7, h * 0.45, pal);
  // wall
  ctx.fillStyle = pal.wall; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.strokeStyle = 'rgba(90,70,50,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - w / 2, y - h, w, h);
  // roof (oblique)
  const rh = h * 1.05, ov = 3;
  ctx.fillStyle = roofCol;
  ctx.beginPath(); ctx.moveTo(x - w / 2 - ov, y - h); ctx.lineTo(x + w / 2 + ov, y - h); ctx.lineTo(x + w / 2 - 3, y - h - rh); ctx.lineTo(x - w / 2 + 3, y - h - rh); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(roofCol, 0.25);
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 3, y - h - rh); ctx.lineTo(x + w / 2 - 3, y - h - rh); ctx.lineTo(x + w / 2 - 5, y - h - rh + 3); ctx.lineTo(x - w / 2 + 5, y - h - rh + 3); ctx.closePath(); ctx.fill();
  // chimney
  if (rng() < 0.6) { ctx.fillStyle = shade(roofCol, -0.35); ctx.fillRect(x + w * 0.22, y - h - rh - 3, 4, 6); }
  // door + windows
  ctx.fillStyle = shade(pal.trunk, 0.1); ctx.fillRect(x - 2.5, y - h * 0.55, 5, h * 0.55);
  const wy = y - h * 0.68;
  for (const wx of [x - w * 0.3, x + w * 0.3]) {
    ctx.fillStyle = pal.lightsOn ? pal.window : '#8fc3e8';
    ctx.fillRect(wx - 2.5, wy - 2.5, 5, 5);
    ctx.strokeStyle = 'rgba(90,70,50,0.5)'; ctx.strokeRect(wx - 2.5, wy - 2.5, 5, 5);
    if (pal.lightsOn) lights.push({ x: wx, y: wy, r: 9, color: 'rgba(255,214,120,0.55)', kind: 'window' });
  }
}

export function drawVillage(ctx: Ctx, x: number, y: number, pal: Palette, lights: LightSpot[], rng: () => number): void {
  const n = 6 + Math.floor(rng() * 3);
  const spots: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.6, d = 22 + rng() * 30;
    spots.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 });
  }
  spots.sort((a, b) => a.y - b.y);
  // little square
  ctx.fillStyle = hexA(pal.sandDark, 0.6);
  ctx.beginPath(); ctx.ellipse(x, y + 4, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
  // well
  ctx.fillStyle = '#8d97a5'; ctx.beginPath(); ctx.arc(x, y + 2, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5b6672'; ctx.beginPath(); ctx.arc(x, y + 2, 2.2, 0, Math.PI * 2); ctx.fill();
  for (const s of spots) {
    const w = 16 + rng() * 10, h = 9 + rng() * 5;
    drawHouse(ctx, s.x, s.y, w, h, pal.roof[Math.floor(rng() * pal.roof.length)], pal, lights, rng);
  }
  // a lamp post
  if (pal.lightsOn) lights.push({ x: x + 14, y: y - 6, r: 16, color: 'rgba(255,225,150,0.4)', kind: 'lamp' });
}

export function drawLighthouse(ctx: Ctx, x: number, y: number, pal: Palette, lights: LightSpot[]): void {
  // rocks
  ctx.fillStyle = '#7f8794'; ctx.beginPath(); ctx.ellipse(x, y + 4, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#98a1ad'; ctx.beginPath(); ctx.ellipse(x - 6, y + 1, 12, 7, 0, 0, Math.PI * 2); ctx.fill();
  shadowEllipse(ctx, x + 6, y + 4, 14, 6, pal);
  const h = 44, wb = 14, wt = 9;
  // tower with stripes
  const grd = ctx.createLinearGradient(x - wb / 2, 0, x + wb / 2, 0);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#cfd6e0');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.moveTo(x - wb / 2, y); ctx.lineTo(x + wb / 2, y); ctx.lineTo(x + wt / 2, y - h); ctx.lineTo(x - wt / 2, y - h); ctx.closePath(); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = '#e8484a';
  for (let i = 0; i < 3; i++) ctx.fillRect(x - 10, y - 8 - i * 14, 20, 6);
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,70,90,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  // gallery + lantern
  ctx.fillStyle = '#3d4452'; ctx.fillRect(x - 8, y - h - 2, 16, 3);
  ctx.fillStyle = pal.lightsOn ? '#fff1b8' : '#bfe9ff'; ctx.fillRect(x - 5, y - h - 10, 10, 8);
  ctx.fillStyle = '#e8484a'; ctx.beginPath(); ctx.moveTo(x - 7, y - h - 10); ctx.lineTo(x + 7, y - h - 10); ctx.lineTo(x, y - h - 17); ctx.closePath(); ctx.fill();
  lights.push({ x, y: y - h - 6, r: 30, color: 'rgba(255,240,180,0.55)', kind: 'beacon' });
}

export function drawTowerBase(ctx: Ctx, x: number, y: number, pal: Palette, lights: LightSpot[]): { x: number; y: number } {
  shadowEllipse(ctx, x + 2, y + 2, 18, 8, pal);
  // base building
  ctx.fillStyle = shade(pal.wall, -0.05); ctx.fillRect(x - 15, y - 12, 30, 12);
  ctx.fillStyle = shade(pal.taxiway, 0.3); ctx.fillRect(x - 16, y - 15, 32, 4);
  // shaft
  const h = 36;
  const grd = ctx.createLinearGradient(x - 6, 0, x + 6, 0);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#c6ccd6');
  ctx.fillStyle = grd; ctx.fillRect(x - 5, y - 12 - h, 10, h);
  // cab
  ctx.fillStyle = '#2f4f77'; ctx.beginPath(); ctx.roundRect(x - 11, y - 12 - h - 9, 22, 11, 3); ctx.fill();
  ctx.fillStyle = 'rgba(160,215,255,0.8)'; ctx.fillRect(x - 9, y - 12 - h - 7, 18, 5);
  ctx.fillStyle = '#e8e9ee'; ctx.beginPath(); ctx.roundRect(x - 12, y - 12 - h - 12, 24, 4, 2); ctx.fill();
  const beacon = { x, y: y - 12 - h - 13 };
  lights.push({ x: beacon.x, y: beacon.y, r: 10, color: 'rgba(255,90,90,0.6)', kind: 'beacon' });
  if (pal.lightsOn) lights.push({ x, y: y - 12 - h - 5, r: 14, color: 'rgba(170,220,255,0.45)', kind: 'window' });
  return beacon;
}

export function drawTerminal(ctx: Ctx, x: number, y: number, pal: Palette, lights: LightSpot[]): void {
  shadowEllipse(ctx, x + 4, y + 3, 40, 12, pal);
  const w = 74, h = 14;
  ctx.fillStyle = shade(pal.wall, -0.03); ctx.fillRect(x - w / 2, y - h, w, h);
  // glass roof: curved
  const grd = ctx.createLinearGradient(0, y - h - 18, 0, y - h);
  grd.addColorStop(0, '#9fdcff'); grd.addColorStop(1, '#4f9fd8');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 2, y - h); ctx.quadraticCurveTo(x, y - h - 30, x + w / 2 + 2, y - h); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(x + i * 10, y - h); ctx.lineTo(x + i * 10 * 0.85, y - h - 12 - (3 - Math.abs(i)) * 3); ctx.stroke(); }
  // windows row
  for (let i = -3; i <= 3; i++) {
    ctx.fillStyle = pal.lightsOn ? pal.window : '#8fc3e8';
    ctx.fillRect(x + i * 10 - 3, y - h + 4, 6, 5);
    if (pal.lightsOn && i % 2 === 0) lights.push({ x: x + i * 10, y: y - h + 6, r: 9, color: 'rgba(255,214,120,0.5)', kind: 'window' });
  }
  // canopy walkway
  ctx.fillStyle = shade(pal.taxiway, 0.25); ctx.fillRect(x - w / 2 + 6, y, w - 12, 5);
}

export function drawHangar(ctx: Ctx, x: number, y: number, pal: Palette, lights: LightSpot[]): void {
  shadowEllipse(ctx, x + 4, y + 2, 26, 10, pal);
  const w = 46, h = 16;
  ctx.fillStyle = '#d8dde6'; ctx.fillRect(x - w / 2, y - h, w, h);
  ctx.fillStyle = '#7fa6c9';
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - h); ctx.quadraticCurveTo(x, y - h - 22, x + w / 2, y - h); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a7c8e4';
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 6, y - h); ctx.quadraticCurveTo(x, y - h - 16, x + w / 2 - 6, y - h); ctx.closePath(); ctx.fill();
  // big doors
  ctx.fillStyle = '#5c7590'; ctx.fillRect(x - w / 2 + 4, y - h + 3, w - 8, h - 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + 4 + i * (w - 8) / 5, y - h + 3); ctx.lineTo(x - w / 2 + 4 + i * (w - 8) / 5, y); ctx.stroke(); }
  if (pal.lightsOn) lights.push({ x, y: y - 4, r: 22, color: 'rgba(255,230,170,0.35)', kind: 'lamp' });
}

export function drawWindmillBase(ctx: Ctx, x: number, y: number, pal: Palette): { x: number; y: number } {
  shadowEllipse(ctx, x + 3, y + 2, 14, 6, pal);
  // stone base
  ctx.fillStyle = '#8b6b4a';
  ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x + 11, y); ctx.lineTo(x + 7, y - 30); ctx.lineTo(x - 7, y - 30); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a58460';
  ctx.beginPath(); ctx.moveTo(x - 11, y); ctx.lineTo(x - 2, y); ctx.lineTo(x - 1, y - 30); ctx.lineTo(x - 7, y - 30); ctx.closePath(); ctx.fill();
  // door
  ctx.fillStyle = '#4a3220'; ctx.fillRect(x - 3, y - 9, 6, 9);
  // cap
  ctx.fillStyle = '#4b4f5c';
  ctx.beginPath(); ctx.ellipse(x, y - 31, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a3e49';
  ctx.beginPath(); ctx.moveTo(x - 9, y - 31); ctx.lineTo(x + 9, y - 31); ctx.lineTo(x, y - 40); ctx.closePath(); ctx.fill();
  return { x, y: y - 33 };
}

export function drawWindmillBlades(ctx: Ctx, hub: { x: number; y: number }, angle: number): void {
  ctx.save(); ctx.translate(hub.x, hub.y); ctx.rotate(angle);
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = '#6b4a2e'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -30); ctx.stroke();
    ctx.fillStyle = 'rgba(255,250,240,0.9)';
    ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(7, -8); ctx.lineTo(7, -28); ctx.lineTo(1, -29); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(90,70,50,0.6)'; ctx.lineWidth = 0.8;
    for (let k = -9; k > -28; k -= 5) { ctx.beginPath(); ctx.moveTo(1, k); ctx.lineTo(7, k - 1); ctx.stroke(); }
    ctx.rotate(Math.PI / 2);
  }
  ctx.fillStyle = '#2f3038'; ctx.beginPath(); ctx.arc(0, 0, 2.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawCastle(ctx: Ctx, x: number, y: number, pal: Palette, lights: LightSpot[]): void {
  shadowEllipse(ctx, x + 5, y + 4, 42, 14, pal);
  const towerAt = (tx: number, ty: number, w: number, h: number, roof: string): void => {
    const grd = ctx.createLinearGradient(tx - w / 2, 0, tx + w / 2, 0);
    grd.addColorStop(0, '#f6f1ff'); grd.addColorStop(1, '#c9bfe6');
    ctx.fillStyle = grd; ctx.fillRect(tx - w / 2, ty - h, w, h);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(tx - w / 2 - 3, ty - h); ctx.lineTo(tx + w / 2 + 3, ty - h); ctx.lineTo(tx, ty - h - w * 1.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(roof, 0.3);
    ctx.beginPath(); ctx.moveTo(tx - w / 2 - 3, ty - h); ctx.lineTo(tx, ty - h - w * 1.4); ctx.lineTo(tx - w * 0.1, ty - h - w * 1.4 + 2); ctx.lineTo(tx - w * 0.35, ty - h); ctx.closePath(); ctx.fill();
    // flag
    ctx.strokeStyle = '#5b5470'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(tx, ty - h - w * 1.4); ctx.lineTo(tx, ty - h - w * 1.4 - 9); ctx.stroke();
    ctx.fillStyle = '#ffd66b'; ctx.beginPath(); ctx.moveTo(tx, ty - h - w * 1.4 - 9); ctx.lineTo(tx + 7, ty - h - w * 1.4 - 6.5); ctx.lineTo(tx, ty - h - w * 1.4 - 4); ctx.closePath(); ctx.fill();
    // window
    ctx.fillStyle = pal.lightsOn ? pal.window : '#8fc3e8';
    ctx.beginPath(); ctx.roundRect(tx - 2, ty - h * 0.6 - 3, 4, 6, 2); ctx.fill();
    if (pal.lightsOn) lights.push({ x: tx, y: ty - h * 0.6, r: 10, color: 'rgba(255,214,120,0.55)', kind: 'window' });
  };
  // wall
  ctx.fillStyle = '#e4dcf5'; ctx.fillRect(x - 30, y - 14, 60, 14);
  ctx.fillStyle = '#cfc4ea';
  for (let i = -3; i <= 3; i++) ctx.fillRect(x + i * 9 - 3, y - 18, 6, 4);
  ctx.fillStyle = '#5b4a7a'; ctx.beginPath(); ctx.roundRect(x - 5, y - 10, 10, 10, [5, 5, 0, 0]); ctx.fill();
  towerAt(x - 30, y, 14, 28, '#ff8fb1');
  towerAt(x + 30, y, 14, 28, '#ff8fb1');
  towerAt(x, y - 10, 18, 40, '#c58dff');
}

/** Little boat bobbing on the sea (static part). */
export function drawBoat(ctx: Ctx, x: number, y: number, rot: number, pal: Palette): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.fillStyle = `rgba(0,30,60,${pal.shadowAlpha * 0.6})`;
  ctx.beginPath(); ctx.ellipse(3, 3, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f7f3ea';
  ctx.beginPath(); ctx.moveTo(13, 0); ctx.quadraticCurveTo(6, -5, -10, -4); ctx.lineTo(-11, 4); ctx.quadraticCurveTo(6, 5, 13, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c85a4a'; ctx.beginPath(); ctx.moveTo(10, 0); ctx.quadraticCurveTo(5, -3, -8, -2.5); ctx.lineTo(-9, 2.5); ctx.quadraticCurveTo(5, 3, 10, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.fillRect(-3, -1.5, 5, 3);
  ctx.restore();
}
