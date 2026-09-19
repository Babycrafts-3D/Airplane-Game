import type { IslandDef, LevelDef } from '../game/types';
import { PLANE_TYPES } from '../game/planes';
import type { Runway } from '../game/world';
import { angleDiff, dist, TAU, type Vec } from '../util/math';
import { makeRng, ValueNoise } from '../util/rng';
import { drawBoat, drawBush, drawCastle, drawFlowers, drawHangar, drawHouse, drawLighthouse, drawPalm, drawPine, drawTerminal, drawTowerBase, drawTree, drawVillage, drawWindmillBase, type LightSpot } from './decor';
import { hexA, shade, type Palette } from './palette';
import { drawPlane } from './planes';

export interface IslandShape { poly: Vec[]; def: IslandDef; cx: number; cy: number }
export interface TerrainData {
  canvas: HTMLCanvasElement;
  pixelScale: number;
  islands: IslandShape[];
  lights: LightSpot[];
  windmills: Array<{ x: number; y: number }>;
  beacons: Array<{ x: number; y: number }>;
  runwayLights: Array<{ x: number; y: number; color: string }>;
  boats: Array<{ x: number; y: number; rot: number }>;
  W: number; H: number;
}

type Ctx = CanvasRenderingContext2D;

export function pointInPoly(p: Vec, poly: Vec[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    const hit = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function scalePoly(poly: Vec[], cx: number, cy: number, s: number, dy = 0): Vec[] {
  return poly.map(p => ({ x: cx + (p.x - cx) * s, y: cy + (p.y - cy) * s + dy }));
}

function tracePoly(ctx: Ctx, poly: Vec[]): void {
  ctx.beginPath();
  ctx.moveTo(poly[0].x, poly[0].y);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
  ctx.closePath();
}

function polyArea(poly: Vec[]): number {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) a += (poly[j].x + poly[i].x) * (poly[j].y - poly[i].y);
  return Math.abs(a / 2);
}

export function islandPolygon(def: IslandDef, W: number, H: number, runways: Runway[]): IslandShape {
  const n = 110;
  const noise = new ValueNoise(def.seed);
  const cx = def.cx * W, cy = def.cy * H, rx = def.rx * W, ry = def.ry * H;
  // runway samples that must be inside the island
  const samples: Array<{ ang: number; rn: number }> = [];
  for (const rw of runways) {
    if (rw.kind === 'water') continue;
    const dxc = (rw.center.x - cx) / rx, dyc = (rw.center.y - cy) / ry;
    if (Math.hypot(dxc, dyc) > 1.25) continue;
    const perp = { x: -rw.dir.y, y: rw.dir.x };
    const halfW = rw.width * 0.5 + 34;
    for (let along = -50; along <= rw.length + 60; along += 20) {
      for (const side of [-1, 0, 1]) {
        const p = { x: rw.threshold.x + rw.dir.x * along + perp.x * halfW * side, y: rw.threshold.y + rw.dir.y * along + perp.y * halfW * side };
        const dx = (p.x - cx) / rx, dy = (p.y - cy) / ry;
        samples.push({ ang: Math.atan2(dy, dx), rn: Math.hypot(dx, dy) });
      }
    }
    for (const d of def.decor) {
      const dx = (d.x * W - cx) / rx, dy = (d.y * H - cy) / ry;
      samples.push({ ang: Math.atan2(dy, dx), rn: Math.hypot(dx, dy) + 0.06 });
    }
  }
  const radii: number[] = [];
  for (let i = 0; i < n; i++) {
    const th = (i / n) * TAU;
    const f = noise.fbm2(Math.cos(th) * 1.7 + def.seed * 0.01, Math.sin(th) * 1.7, 3);
    let rn = 0.66 + 0.46 * f;
    for (const s of samples) if (Math.abs(angleDiff(th, s.ang)) < 0.26) rn = Math.max(rn, s.rn + 0.1);
    radii.push(rn);
  }
  // circular smoothing to avoid kinks where the runway bulge meets the noise
  const sm: number[] = [];
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = -3; k <= 3; k++) s += radii[(i + k + n) % n];
    sm.push(s / 7);
  }
  const poly = sm.map((rn, i) => { const th = (i / n) * TAU; return { x: cx + Math.cos(th) * rx * rn, y: cy + Math.sin(th) * ry * rn }; });
  return { poly, def, cx, cy };
}

function runwayRectContains(rw: Runway, p: Vec, margin: number): boolean {
  const dx = p.x - rw.threshold.x, dy = p.y - rw.threshold.y;
  const along = dx * rw.dir.x + dy * rw.dir.y;
  const lat = Math.abs(-dx * rw.dir.y + dy * rw.dir.x);
  if (rw.kind === 'helipad') return Math.hypot(dx, dy) < 40 + margin;
  return along > -70 - margin && along < rw.length + 30 + margin && lat < rw.width * 0.5 + margin;
}

function drawSea(ctx: Ctx, W: number, H: number, pal: Palette, rng: () => number): void {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, pal.seaDeep); g.addColorStop(0.55, pal.seaMid); g.addColorStop(1, shade(pal.seaMid, 0.08));
  ctx.fillStyle = g; ctx.fillRect(-200, -200, W + 400, H + 400);
  // soft depth blotches
  for (let i = 0; i < 9; i++) {
    const x = rng() * W, y = rng() * H, r = 120 + rng() * 260;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = i % 3 === 0;
    rg.addColorStop(0, hexA(dark ? pal.seaDeep : pal.seaShallow, dark ? 0.35 : 0.16));
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

function drawRunway(ctx: Ctx, rw: Runway, pal: Palette, lights: LightSpot[], rl: TerrainData['runwayLights']): void {
  ctx.save();
  ctx.translate(rw.threshold.x, rw.threshold.y);
  ctx.rotate(rw.heading);
  const L = rw.length, w = rw.width;
  if (rw.kind === 'helipad') {
    ctx.fillStyle = `rgba(20,50,40,${pal.shadowAlpha})`; ctx.beginPath(); ctx.arc(3, 3, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.asphaltEdge; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = pal.asphalt; ctx.beginPath(); ctx.arc(0, 0, 27, 0, TAU); ctx.fill();
    ctx.strokeStyle = pal.marking; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 21, 0, TAU); ctx.stroke();
    ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-7, -9); ctx.lineTo(-7, 9); ctx.moveTo(7, -9); ctx.lineTo(7, 9); ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.stroke();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; rl.push({ x: rw.threshold.x + Math.cos(a) * 25, y: rw.threshold.y + Math.sin(a) * 25, color: '#7cf7a0' }); }
    ctx.restore();
    return;
  }
  if (rw.kind === 'water') {
    // lane on the sea: darker calm strip and buoys
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.beginPath(); ctx.roundRect(-20, -w / 2, L + 40, w, 14); ctx.fill();
    ctx.setLineDash([12, 16]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(L - 20, 0); ctx.stroke(); ctx.setLineDash([]);
    for (let x = 0; x <= L; x += 40) {
      for (const side of [-1, 1]) {
        const y = side * (w / 2);
        ctx.fillStyle = 'rgba(0,30,60,0.25)'; ctx.beginPath(); ctx.arc(x + 2, y + 3, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = x === 0 ? '#3ad36b' : x >= L - 1 ? '#ff5a5a' : '#ff9a3c';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x - 1.5, y - 1.5, 1.6, 0, TAU); ctx.fill();
        const wx = rw.threshold.x + rw.dir.x * x - rw.dir.y * y, wy = rw.threshold.y + rw.dir.y * x + rw.dir.x * y;
        rl.push({ x: wx, y: wy, color: x === 0 ? '#7cf7a0' : x >= L - 1 ? '#ff7a7a' : '#ffd27a' });
      }
    }
    ctx.restore();
    return;
  }
  // paved runway
  ctx.fillStyle = `rgba(20,50,40,${pal.shadowAlpha * 0.8})`;
  ctx.beginPath(); ctx.roundRect(-14 + 3, -w / 2 + 4, L + 28, w, 6); ctx.fill();
  ctx.fillStyle = pal.asphaltEdge; ctx.beginPath(); ctx.roundRect(-14, -w / 2, L + 28, w, 6); ctx.fill();
  const g = ctx.createLinearGradient(0, -w / 2, 0, w / 2);
  g.addColorStop(0, shade(pal.asphalt, 0.08)); g.addColorStop(1, shade(pal.asphalt, -0.08));
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-10, -w / 2 + 3, L + 20, w - 6, 4); ctx.fill();
  // edge lines
  ctx.strokeStyle = pal.marking; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-6, -w / 2 + 5); ctx.lineTo(L + 6, -w / 2 + 5); ctx.moveTo(-6, w / 2 - 5); ctx.lineTo(L + 6, w / 2 - 5); ctx.stroke();
  // threshold piano keys
  const keys = rw.kind === 'long' ? 8 : 6;
  const kw = (w - 14) / keys;
  for (let i = 0; i < keys; i++) {
    ctx.fillStyle = pal.marking; ctx.fillRect(6, -w / 2 + 7 + i * kw + kw * 0.2, 26, kw * 0.6);
  }
  // runway number
  const num = Math.round((((rw.heading * 180 / Math.PI) + 90 + 360) % 360) / 10) || 36;
  ctx.save(); ctx.translate(58, 0); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = pal.marking; ctx.font = `bold ${Math.round(w * 0.42)}px Nunito, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(num.toString().padStart(2, '0'), 0, 0);
  ctx.restore();
  // aiming point bars
  ctx.fillStyle = pal.marking; ctx.fillRect(95, -w * 0.3, 24, w * 0.11); ctx.fillRect(95, w * 0.19, 24, w * 0.11);
  // centre line
  for (let x = 78; x < L - 30; x += 24) ctx.fillRect(x, -1.2, 13, 2.4);
  // far threshold keys
  for (let i = 0; i < keys; i++) ctx.fillRect(L - 30, -w / 2 + 7 + i * kw + kw * 0.2, 22, kw * 0.6);
  // lights along edges
  for (let x = 0; x <= L; x += 30) {
    for (const side of [-1, 1]) {
      const y = side * (w / 2 + 3);
      const wx = rw.threshold.x + rw.dir.x * x - rw.dir.y * y, wy = rw.threshold.y + rw.dir.y * x + rw.dir.x * y;
      rl.push({ x: wx, y: wy, color: x === 0 ? '#7cf7a0' : x >= L - 1 ? '#ff7a7a' : '#ffe9a8' });
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(x, y, 1.4, 0, TAU); ctx.fill();
    }
  }
  // threshold light bar (green) and end (red)
  for (let y = -w / 2 + 4; y <= w / 2 - 4; y += 6) {
    rl.push({ x: rw.threshold.x - rw.dir.x * 4 - rw.dir.y * y, y: rw.threshold.y - rw.dir.y * 4 + rw.dir.x * y, color: '#7cf7a0' });
  }
  ctx.restore();
  void lights;
}

function drawTaxiwayAndApron(ctx: Ctx, rw: Runway, apron: Vec, pal: Palette, rng: () => number, time: string): void {
  // connector from the runway to the apron
  const startAlong = rw.length * 0.72;
  const start = { x: rw.threshold.x + rw.dir.x * startAlong, y: rw.threshold.y + rw.dir.y * startAlong };
  const side = Math.sign((apron.x - start.x) * -rw.dir.y + (apron.y - start.y) * rw.dir.x) || 1;
  const exit = { x: start.x - rw.dir.y * side * (rw.width / 2), y: start.y + rw.dir.x * side * (rw.width / 2) };
  const mid = { x: exit.x - rw.dir.y * side * 60, y: exit.y + rw.dir.x * side * 60 };
  ctx.strokeStyle = pal.taxiway; ctx.lineWidth = 16; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(exit.x, exit.y); ctx.quadraticCurveTo(mid.x, mid.y, apron.x, apron.y); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,214,90,0.8)'; ctx.lineWidth = 1.2; ctx.setLineDash([6, 6]);
  ctx.beginPath(); ctx.moveTo(exit.x, exit.y); ctx.quadraticCurveTo(mid.x, mid.y, apron.x, apron.y); ctx.stroke(); ctx.setLineDash([]);
  // apron
  ctx.fillStyle = `rgba(20,50,40,${pal.shadowAlpha * 0.6})`; ctx.beginPath(); ctx.roundRect(apron.x - 52 + 3, apron.y - 30 + 4, 104, 60, 14); ctx.fill();
  ctx.fillStyle = pal.taxiway; ctx.beginPath(); ctx.roundRect(apron.x - 52, apron.y - 30, 104, 60, 14); ctx.fill();
  ctx.fillStyle = shade(pal.taxiway, 0.12); ctx.beginPath(); ctx.roundRect(apron.x - 46, apron.y - 24, 92, 48, 10); ctx.fill();
  // parked aircraft
  const parked = [PLANE_TYPES.c172, PLANE_TYPES.dhc6];
  parked.forEach((t, i) => {
    drawPlane(ctx, { type: t, pos: { x: apron.x - 22 + i * 44, y: apron.y + 2 }, heading: -Math.PI / 2 + (rng() - 0.5) * 0.2, altitude: 0, bank: 0, livery: i, state: 'landed', id: 900 + i }, 0, time === 'night');
  });
}

export function buildTerrain(level: LevelDef, runways: Runway[], W: number, H: number, pixelScale: number, pal: Palette): TerrainData {
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(W * pixelScale); canvas.height = Math.ceil(H * pixelScale);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(pixelScale, pixelScale);
  const rng = makeRng(level.seed * 31 + 7);
  const lights: LightSpot[] = [];
  const windmills: TerrainData['windmills'] = [];
  const beacons: TerrainData['beacons'] = [];
  const runwayLights: TerrainData['runwayLights'] = [];
  const boats: TerrainData['boats'] = [];

  drawSea(ctx, W, H, pal, rng);
  const islands = level.islands.map(def => islandPolygon(def, W, H, runways));

  // shallow halos first for all islands
  for (const isl of islands) {
    for (const [s, a] of [[1.16, 0.28], [1.09, 0.35], [1.04, 0.45]] as Array<[number, number]>) {
      ctx.fillStyle = hexA(pal.seaShallow, a);
      tracePoly(ctx, scalePoly(isl.poly, isl.cx, isl.cy, s)); ctx.fill();
    }
  }

  const drawables: Array<{ y: number; fn: () => void }> = [];

  for (const isl of islands) {
    const irng = makeRng(isl.def.seed);
    // cliff / thickness
    ctx.fillStyle = pal.cliff; tracePoly(ctx, scalePoly(isl.poly, isl.cx, isl.cy, 1, 16)); ctx.fill();
    ctx.fillStyle = shade(pal.cliff, 0.18); tracePoly(ctx, scalePoly(isl.poly, isl.cx, isl.cy, 1, 8)); ctx.fill();
    // sand
    ctx.fillStyle = pal.sand; tracePoly(ctx, isl.poly); ctx.fill();
    ctx.fillStyle = hexA(pal.sandDark, 0.5); tracePoly(ctx, scalePoly(isl.poly, isl.cx, isl.cy, 0.985, 3)); ctx.fill();
    // grass
    const grassPoly = scalePoly(isl.poly, isl.cx, isl.cy, 0.94, -5);
    ctx.fillStyle = pal.grassDark; tracePoly(ctx, scalePoly(isl.poly, isl.cx, isl.cy, 0.95, -3)); ctx.fill();
    ctx.fillStyle = pal.grass; tracePoly(ctx, grassPoly); ctx.fill();
    // grass texture
    ctx.save(); tracePoly(ctx, grassPoly); ctx.clip();
    const area = polyArea(grassPoly);
    const bx = Math.min(...grassPoly.map(p => p.x)), by = Math.min(...grassPoly.map(p => p.y));
    const bw = Math.max(...grassPoly.map(p => p.x)) - bx, bh = Math.max(...grassPoly.map(p => p.y)) - by;
    const blobs = Math.floor(area / 6000);
    for (let i = 0; i < blobs; i++) {
      const x = bx + irng() * bw, y = by + irng() * bh;
      ctx.fillStyle = hexA(i % 3 === 0 ? pal.grassLight : pal.grassDark, 0.35);
      ctx.beginPath(); ctx.ellipse(x, y, 20 + irng() * 40, 10 + irng() * 22, irng() * Math.PI, 0, TAU); ctx.fill();
    }
    ctx.restore();

    // decor anchors for later
    const decorPts = isl.def.decor.map(d => ({ ...d, wx: d.x * W, wy: d.y * H }));
    const islandRunways = runways.filter(rw => rw.kind !== 'water' && pointInPoly(rw.center, isl.poly));

    // road from village to apron / runway
    const village = decorPts.find(d => d.kind === 'village');
    const terminal = decorPts.find(d => d.kind === 'terminal');
    let apron: Vec | null = null;
    if (islandRunways.length) {
      const rw = islandRunways.find(r => r.kind !== 'helipad');
      if (rw) {
        const side = terminal ? Math.sign((terminal.wx - rw.center.x) * -rw.dir.y + (terminal.wy - rw.center.y) * rw.dir.x) || 1 : 1;
        apron = terminal
          ? { x: terminal.wx - rw.dir.y * 0 , y: terminal.wy + 44 }
          : { x: rw.center.x - rw.dir.y * side * (rw.width / 2 + 95) + rw.dir.x * rw.length * 0.22, y: rw.center.y + rw.dir.x * side * (rw.width / 2 + 95) + rw.dir.y * rw.length * 0.22 };
        // keep the apron on the island
        if (!pointInPoly(apron, grassPoly)) apron = { x: rw.center.x - rw.dir.y * side * (rw.width / 2 + 80), y: rw.center.y + rw.dir.x * side * (rw.width / 2 + 80) };
        if (village) {
          ctx.strokeStyle = shade(pal.sandDark, -0.05); ctx.lineWidth = 9; ctx.lineCap = 'round';
          const c = { x: (village.wx + apron.x) / 2 + (irng() - 0.5) * 120, y: (village.wy + apron.y) / 2 + (irng() - 0.5) * 80 };
          ctx.beginPath(); ctx.moveTo(village.wx, village.wy); ctx.quadraticCurveTo(c.x, c.y, apron.x, apron.y); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; ctx.setLineDash([5, 7]);
          ctx.beginPath(); ctx.moveTo(village.wx, village.wy); ctx.quadraticCurveTo(c.x, c.y, apron.x, apron.y); ctx.stroke(); ctx.setLineDash([]);
        }
        drawTaxiwayAndApron(ctx, rw, apron, pal, irng, level.time);
      }
    }
    for (const rw of islandRunways) drawRunway(ctx, rw, pal, lights, runwayLights);

    // scatter vegetation
    const style = isl.def.style;
    const treeCount = Math.floor(area / (style === 'pine' ? 5200 : 6800));
    const occupied = (p: Vec, margin: number): boolean => {
      if (!pointInPoly(p, scalePoly(isl.poly, isl.cx, isl.cy, 0.9, -4))) return true;
      for (const rw of islandRunways) if (runwayRectContains(rw, p, margin + 26)) return true;
      if (apron && dist(p, apron) < 80 + margin) return true;
      for (const d of decorPts) if (dist(p, { x: d.wx, y: d.wy }) < (d.kind === 'village' ? 78 : d.kind === 'terminal' ? 60 : 44) + margin) return true;
      return false;
    };
    for (let i = 0, tries = 0; i < treeCount && tries < treeCount * 12; tries++) {
      const p = { x: bx + irng() * bw, y: by + irng() * bh };
      if (occupied(p, 6)) continue;
      i++;
      const r = 9 + irng() * 8, variant = Math.floor(irng() * 3);
      const kind = style === 'pine' ? (irng() < 0.75 ? 'pine' : 'tree') : style === 'tropic' ? (irng() < 0.5 ? 'palm' : 'tree') : (irng() < 0.85 ? 'tree' : 'pine');
      drawables.push({ y: p.y, fn: () => { if (kind === 'pine') drawPine(ctx, p.x, p.y, r, pal, variant); else if (kind === 'palm') drawPalm(ctx, p.x, p.y, r, pal, variant); else drawTree(ctx, p.x, p.y, r, pal, variant); } });
    }
    const bushes = Math.floor(treeCount * 0.5);
    for (let i = 0, tries = 0; i < bushes && tries < bushes * 10; tries++) {
      const p = { x: bx + irng() * bw, y: by + irng() * bh };
      if (occupied(p, 0)) continue;
      i++;
      const r = 4 + irng() * 4;
      drawables.push({ y: p.y - 2, fn: () => drawBush(ctx, p.x, p.y, r, pal) });
    }
    const flowers = Math.floor(treeCount * 0.6);
    for (let i = 0, tries = 0; i < flowers && tries < flowers * 10; tries++) {
      const p = { x: bx + irng() * bw, y: by + irng() * bh };
      if (occupied(p, -4)) continue;
      i++;
      const frng = makeRng(Math.floor(p.x * 13 + p.y * 7));
      drawables.push({ y: -1e9, fn: () => drawFlowers(ctx, p.x, p.y, frng, pal) });
    }
    // stray houses
    const houses = Math.floor(area / 90000);
    for (let i = 0, tries = 0; i < houses && tries < 60; tries++) {
      const p = { x: bx + irng() * bw, y: by + irng() * bh };
      if (occupied(p, 18)) continue;
      i++;
      const w = 16 + irng() * 8, h = 9 + irng() * 4, roof = pal.roof[Math.floor(irng() * pal.roof.length)];
      drawables.push({ y: p.y, fn: () => drawHouse(ctx, p.x, p.y, w, h, roof, pal, lights, irng) });
    }
    // named decor
    for (const d of decorPts) {
      const x = d.wx, y = d.wy;
      switch (d.kind) {
        case 'village': drawables.push({ y, fn: () => drawVillage(ctx, x, y, pal, lights, irng) }); break;
        case 'lighthouse': drawables.push({ y, fn: () => drawLighthouse(ctx, x, y, pal, lights) }); break;
        case 'tower': drawables.push({ y, fn: () => { beacons.push(drawTowerBase(ctx, x, y, pal, lights)); } }); break;
        case 'terminal': drawables.push({ y, fn: () => drawTerminal(ctx, x, y, pal, lights) }); break;
        case 'hangar': drawables.push({ y, fn: () => drawHangar(ctx, x, y, pal, lights) }); break;
        case 'windmill': drawables.push({ y, fn: () => { windmills.push(drawWindmillBase(ctx, x, y, pal)); } }); break;
        case 'castle': drawables.push({ y, fn: () => drawCastle(ctx, x, y, pal, lights) }); break;
      }
    }
  }

  // water runways are drawn on the sea, under everything on land
  for (const rw of runways) if (rw.kind === 'water') drawRunway(ctx, rw, pal, lights, runwayLights);

  // boats in open water
  const boatCount = 3;
  for (let i = 0, tries = 0; i < boatCount && tries < 60; tries++) {
    const p = { x: 60 + rng() * (W - 120), y: 60 + rng() * (H * 0.62) };
    let onLand = false;
    for (const isl of islands) if (pointInPoly(p, scalePoly(isl.poly, isl.cx, isl.cy, 1.25))) { onLand = true; break; }
    for (const rw of runways) if (rw.kind === 'water' && runwayRectContains(rw, p, 60)) onLand = true;
    if (onLand) continue;
    i++;
    boats.push({ x: p.x, y: p.y, rot: rng() * TAU });
  }

  drawables.sort((a, b) => a.y - b.y);
  for (const d of drawables) d.fn();
  for (const b of boats) drawBoat(ctx, b.x, b.y, b.rot, pal);

  return { canvas, pixelScale, islands, lights, windmills, beacons, runwayLights, boats, W, H };
}
