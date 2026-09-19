import type { Vec } from '../util/math';

export type PlaneClass = 'light' | 'medium' | 'heavy' | 'sea' | 'heli';
export type RunwayKind = 'short' | 'long' | 'water' | 'helipad';
export type TimeOfDay = 'morning' | 'golden' | 'dusk' | 'night';

export interface PlaneType {
  id: string;
  name: string;          // real aircraft name
  maker: string;
  cls: PlaneClass;
  speed: number;         // world units per second (1 unit = 1 m for distance display)
  turnRate: number;      // rad/s
  hull: number;          // collision radius in units
  windSensitivity: number;
  engines: 'prop1' | 'prop2' | 'prop4' | 'jet2' | 'jet4' | 'rotor' | 'float';
  livery: { body: string; accent: string; wing: string };
  tip: string;           // shown in the post-mortem
  tipEn: string;
}

export interface RunwayDef {
  id: string;
  kind: RunwayKind;
  /** threshold (touchdown start) in normalized coords 0..1 of the world */
  x: number; y: number;
  /** landing heading in radians (0 = east, PI/2 = south on screen) */
  heading: number;
  length: number; // units
}

export interface IslandDef {
  cx: number; cy: number;     // normalized center
  rx: number; ry: number;     // normalized radii
  seed: number;
  style: 'meadow' | 'pine' | 'tropic';
  decor: Array<{ kind: 'lighthouse' | 'windmill' | 'village' | 'tower' | 'castle' | 'hangar' | 'terminal'; x: number; y: number; rot?: number }>;
}

export interface WindDef {
  kmh: number;          // mean wind speed
  gust: number;         // +/- variation
  dirDeg: number;       // direction wind blows TOWARD, compass (0 = north/up, 90 = east)
  wander: number;       // degrees of direction wander
}

export interface LevelDef {
  id: string;
  name: string;
  subtitle: string;
  subtitleEn: string;
  time: TimeOfDay;
  goal: number;
  seed: number;
  islands: IslandDef[];
  runways: RunwayDef[];
  planes: Array<{ type: string; weight: number }>;
  spawn: { first: number; base: number; min: number; step: number; maxConcurrent: number; maxConcurrentEnd: number };
  wind: WindDef | null;
  clouds: number;
}

export type PlaneState = 'flying' | 'landing' | 'landed' | 'crashed';

export interface Plane {
  id: number;
  type: PlaneType;
  pos: Vec;
  heading: number;
  speed: number;
  state: PlaneState;
  path: Vec[];
  pathIndex: number;
  lockedRunway: string | null;
  pathDrawnAt: number;    // game time at which the current path was drawn (-1 = none)
  landingT: number;       // progress along runway 0..1
  runway: string | null;  // runway being landed on
  altitude: number;       // 1 = cruise, 0 = ground
  crossTrack: number;     // distance from drawn path (for wind feedback)
  spawnedAt: number;
  trail: Vec[];
  conflictWith: Set<number>;
  bank: number;
  livery: number;
  goArounds: number;
  wanderTimer: number;
}

export interface Snapshot {
  t: number;
  planes: Array<{ id: number; x: number; y: number; h: number; state: PlaneState; alt: number; path: Vec[]; lock: string | null; cross: number }>;
}

export type EventKind = 'path' | 'lock' | 'nearmiss' | 'crash' | 'goaround' | 'landed' | 'spawn';
export interface GameEvent {
  t: number;
  kind: EventKind;
  planes: number[];
  text: string;
  meta?: Record<string, number | string>;
}
