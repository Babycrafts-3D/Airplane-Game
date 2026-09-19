import type { Vec } from '../util/math';
import { dist } from '../util/math';
import { sfx } from '../util/audio';
import type { Plane } from './types';
import type { World } from './world';

interface Drag {
  plane: Plane;
  raw: Vec[];
  startScreen: Vec;
  moved: boolean;
  locked: boolean;
  prevPath: Vec[];
  prevLock: string | null;
}

export class Input {
  private drags = new Map<number, Drag>();
  enabled = true;

  constructor(
    private canvas: HTMLCanvasElement,
    private getWorld: () => World | null,
    private toWorld: (sx: number, sy: number) => Vec,
    private hudHit: (sx: number, sy: number) => boolean,
  ) {
    canvas.addEventListener('pointerdown', this.onDown, { passive: false });
    canvas.addEventListener('pointermove', this.onMove, { passive: false });
    canvas.addEventListener('pointerup', this.onUp, { passive: false });
    canvas.addEventListener('pointercancel', this.onUp, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  private onDown = (e: PointerEvent): void => {
    e.preventDefault();
    sfx.unlock();
    if (!this.enabled) return;
    const world = this.getWorld();
    if (!world || world.status !== 'running') return;
    if (this.hudHit(e.clientX, e.clientY)) return;
    const p = this.toWorld(e.clientX, e.clientY);
    const plane = world.planeAt(p);
    if (!plane) { world.select(null); return; }
    const drag: Drag = { plane, raw: [{ ...plane.pos }], startScreen: { x: e.clientX, y: e.clientY }, moved: false, locked: false, prevPath: plane.path.slice(), prevLock: plane.lockedRunway };
    this.drags.set(e.pointerId, drag);
    world.beginPath(plane);
    world.select(plane);
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  private onMove = (e: PointerEvent): void => {
    const drag = this.drags.get(e.pointerId);
    if (!drag) return;
    e.preventDefault();
    const world = this.getWorld();
    if (!world || drag.locked || drag.plane.state !== 'flying') return;
    if (!drag.moved && dist(drag.startScreen, { x: e.clientX, y: e.clientY }) > 9) drag.moved = true;
    if (!drag.moved) return;
    const p = this.toWorld(e.clientX, e.clientY);
    const last = drag.raw[drag.raw.length - 1];
    if (dist(last, p) < 3) return;
    drag.raw.push(p);
    const locked = world.setPath(drag.plane, drag.raw);
    if (locked) { drag.locked = true; world.endPath(drag.plane); }
  };

  private onUp = (e: PointerEvent): void => {
    const drag = this.drags.get(e.pointerId);
    if (!drag) return;
    this.drags.delete(e.pointerId);
    const world = this.getWorld();
    if (!world) return;
    if (!drag.moved) {
      // a tap: keep whatever route the aircraft already had, just show its card
      drag.plane.path = drag.prevPath;
      drag.plane.lockedRunway = drag.prevLock;
      drag.plane.pathIndex = 0;
      return;
    }
    if (!drag.locked) world.endPath(drag.plane);
  };

  cancelAll(): void { this.drags.clear(); }
}
