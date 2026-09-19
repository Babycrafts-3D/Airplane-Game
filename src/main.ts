import './style.css';

import { Input } from './game/input';
import { LEVELS, levelById } from './game/levels';
import { buildReport } from './game/postmortem';
import { World } from './game/world';
import { PALETTES } from './render/palette';
import { Renderer } from './render/renderer';
import { ReplayView } from './ui/replay';
import { UI } from './ui/screens';
import { levelProgress, persist, recordLevelResult, save } from './util/storage';
import { sfx } from './util/audio';

type Mode = 'title' | 'levels' | 'tutorial' | 'playing' | 'paused' | 'complete' | 'failed' | 'settings';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const renderer = new Renderer(canvas);

let mode: Mode = 'title';
let prevMode: Mode = 'title';
let world: World;
let currentLevelId = LEVELS[0].id;
let last = performance.now();
let clock = 0;

function makeDemoWorld(): World {
  const completed = LEVELS.filter(l => levelProgress(l.id).completed);
  const pick = completed.length ? completed[Math.floor(Math.random() * completed.length)] : LEVELS[0];
  const w = new World(pick, renderer.suggestWorldWidth(), { demo: true });
  renderer.setWorld(w);
  return w;
}

function startLevel(id: string): void {
  const lv = levelById(id);
  if (!lv) return;
  currentLevelId = id;
  world = new World(lv, renderer.suggestWorldWidth());
  renderer.setWorld(world);
  input.cancelAll();
  ui.clear();
  mode = 'playing';
}

const ui = new UI({
  startLevel(id) {
    if (!save.tutorialSeen) { currentLevelId = id; mode = 'tutorial'; ui.tutorial(); return; }
    startLevel(id);
  },
  tutorialDone() { save.tutorialSeen = true; persist(); startLevel(currentLevelId); },
  resume() { ui.clear(); mode = 'playing'; last = performance.now(); },
  retry() { startLevel(currentLevelId); },
  next() {
    const i = LEVELS.findIndex(l => l.id === currentLevelId);
    startLevel(LEVELS[Math.min(LEVELS.length - 1, i + 1)].id);
  },
  toLevels() { world = makeDemoWorld(); mode = 'levels'; ui.levels(); },
  toTitle() { world = makeDemoWorld(); mode = 'title'; ui.title(); },
  continueEndless() { world.continueEndless(); ui.clear(); mode = 'playing'; last = performance.now(); },
  openSettings() { prevMode = mode; mode = 'settings'; ui.settings(); },
  closeSettings() {
    mode = prevMode === 'settings' ? 'title' : prevMode;
    if (mode === 'title') ui.title(); else if (mode === 'levels') ui.levels(); else if (mode === 'paused') ui.pause(world.level.name); else ui.title();
  },
  makeThumb(levelId, c) {
    const lv = levelById(levelId)!;
    const w = new World(lv, 800, { demo: true });
    Renderer.drawThumbnail(c, w, PALETTES[lv.time]);
  },
});

const input = new Input(canvas, () => (mode === 'playing' ? world : null), renderer.toWorld, (sx, sy) => {
  if (mode !== 'playing') return false;
  if (renderer.hudHit(sx, sy)) { pause(); return true; }
  return false;
});

function pause(): void {
  if (mode !== 'playing') return;
  mode = 'paused';
  input.cancelAll();
  ui.pause(world.level.name);
}

function onComplete(): void {
  mode = 'complete';
  const stars = world.hearts >= 3 ? 3 : world.hearts === 2 ? 2 : 1;
  const before = levelProgress(world.level.id).best;
  recordLevelResult(world.level.id, world.landed, stars, true);
  const i = LEVELS.findIndex(l => l.id === world.level.id);
  ui.complete({ levelName: world.level.name, landed: world.landed, stars, newBest: world.landed > before, hasNext: i < LEVELS.length - 1, goal: world.level.goal });
}

function onFailed(): void {
  mode = 'failed';
  input.cancelAll();
  recordLevelResult(world.level.id, world.landed, world.goalReached ? Math.max(1, levelProgress(world.level.id).stars) : 0, world.goalReached);
  const report = buildReport(world);
  const replay = new ReplayView(world, renderer.terrain!, renderer.pal, report);
  ui.failed(report, replay.el, () => replay.destroy(), world.landed);
}

function frame(now: number): void {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  clock += dt;
  if (mode === 'playing') {
    world.update(dt);
    if (world.status === 'complete') onComplete();
    else if (world.status === 'failed') onFailed();
  } else if (mode === 'title' || mode === 'levels' || mode === 'settings' || mode === 'tutorial') {
    if (world.demo) world.update(dt);
  }
  renderer.frame(world, clock, mode === 'playing' || world.demo ? dt : 0, mode === 'playing' || mode === 'paused');
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => renderer.resize());
window.addEventListener('orientationchange', () => setTimeout(() => renderer.resize(), 250));
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
window.addEventListener('blur', () => pause());
window.addEventListener('keydown', e => { if (e.key === 'Escape' || e.key === 'p') { if (mode === 'playing') pause(); else if (mode === 'paused') { ui.clear(); mode = 'playing'; last = performance.now(); } } });
document.addEventListener('pointerdown', () => sfx.unlock(), { once: true });

// debug handle (harmless in production)
(window as unknown as { __wh: unknown }).__wh = { renderer, getWorld: () => world, getMode: () => mode, step: () => frame(performance.now()), start: (id: string) => startLevel(id) };

world = makeDemoWorld();
ui.title();
requestAnimationFrame(frame);
