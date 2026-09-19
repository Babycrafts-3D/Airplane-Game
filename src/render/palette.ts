import type { TimeOfDay } from '../game/types';

export interface Palette {
  seaDeep: string; seaMid: string; seaShallow: string; seaFoam: string; seaSparkle: string;
  sand: string; sandDark: string; cliff: string;
  grass: string; grassDark: string; grassLight: string;
  treeA: string; treeB: string; treeC: string; trunk: string;
  pineA: string; pineB: string;
  palmA: string; palmB: string;
  roof: string[]; wall: string; window: string;
  asphalt: string; asphaltEdge: string; marking: string; taxiway: string;
  tint: string | null; tintAlpha: number;
  sky: string; hud: string; hudText: string;
  light: string; lightsOn: boolean; stars: boolean;
  shadowAlpha: number;
  cloudAlpha: number;
}

const base: Palette = {
  seaDeep: '#1d6fc2', seaMid: '#2f97dc', seaShallow: '#6fd3ee', seaFoam: '#ffffff', seaSparkle: '#dff7ff',
  sand: '#f4dfa4', sandDark: '#e2c07c', cliff: '#b98550',
  grass: '#86d066', grassDark: '#63b54a', grassLight: '#a7e28a',
  treeA: '#3f9a4c', treeB: '#5cb85f', treeC: '#8bd47b', trunk: '#7a4b2a',
  pineA: '#2e7a4c', pineB: '#4aa066',
  palmA: '#3aa35e', palmB: '#6cc97a',
  roof: ['#e35d5b', '#e8875a', '#5b7fe3', '#c95ce0'], wall: '#fff5e6', window: '#ffd66b',
  asphalt: '#525a68', asphaltEdge: '#3c4350', marking: '#f7f7f2', taxiway: '#9aa1ab',
  tint: null, tintAlpha: 0,
  sky: '#bfe7ff', hud: 'rgba(20, 40, 70, 0.62)', hudText: '#ffffff',
  light: '#ffd27a', lightsOn: false, stars: false,
  shadowAlpha: 0.22,
  cloudAlpha: 0.75,
};

export const PALETTES: Record<TimeOfDay, Palette> = {
  morning: { ...base },
  golden: {
    ...base,
    seaDeep: '#2569a9', seaMid: '#3e9cd4', seaShallow: '#8fdbe8',
    grass: '#9ad066', grassDark: '#74b24a', grassLight: '#c4e58a',
    sand: '#f9e3a6',
    tint: '#ff9a3c', tintAlpha: 0.14,
    shadowAlpha: 0.3,
  },
  dusk: {
    ...base,
    seaDeep: '#3b3f93', seaMid: '#6a5fb9', seaShallow: '#c78fd6', seaSparkle: '#ffd9f0',
    grass: '#6f9f66', grassDark: '#4f7d4d', grassLight: '#93b985',
    sand: '#e7c69c', sandDark: '#c9a072', cliff: '#8f6448',
    treeA: '#2f6e49', treeB: '#3f8756', treeC: '#5d9e68',
    tint: '#5b2d8e', tintAlpha: 0.28,
    sky: '#f2a4c8', lightsOn: true, light: '#ffc86b',
    shadowAlpha: 0.3,
    cloudAlpha: 0.6,
  },
  night: {
    ...base,
    seaDeep: '#0a1f45', seaMid: '#12386f', seaShallow: '#2a6ea3', seaSparkle: '#a7d4ff', seaFoam: '#cfe4ff',
    grass: '#3a6e58', grassDark: '#2b5645', grassLight: '#4f8a68',
    sand: '#a99a7a', sandDark: '#857657', cliff: '#5c4534',
    treeA: '#1f4e3e', treeB: '#2a6249', treeC: '#3b7a58', trunk: '#4a2f1e',
    pineA: '#1c4a3a', pineB: '#2b6650', palmA: '#25634a', palmB: '#3d8563',
    wall: '#cfd2e6', asphalt: '#2f3644', asphaltEdge: '#222835', marking: '#d9dbe0', taxiway: '#5b6575',
    tint: '#0d1b4b', tintAlpha: 0.42,
    sky: '#0b1b3f', lightsOn: true, light: '#ffd27a', stars: true,
    shadowAlpha: 0.12,
    cloudAlpha: 0.35,
    hud: 'rgba(10, 20, 45, 0.7)',
  },
};

export function hexA(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function shade(hex: string, amt: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h, 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt > 0 ? (255 - c) * amt : c * amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
