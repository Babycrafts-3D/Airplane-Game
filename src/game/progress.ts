import { LEVELS } from './levels';
import type { LevelDef, TimeOfDay } from './types';
import { levelProgress } from '../util/storage';
import { lang } from '../i18n';

export const LEVELS_PER_WORLD = 8;
export const WORLDS = LEVELS; // each island is a world with 8 missions

export type MissionTag = 'calm' | 'busy' | 'storm' | 'night' | 'heavies' | 'rush' | 'dusk' | 'golden';

const TAG_NAMES: Record<MissionTag, [string, string]> = {
  calm: ['Rustig', 'Calm'], busy: ['Drukte', 'Busy'], storm: ['Storm', 'Storm'], night: ['Nacht', 'Night'],
  heavies: ['Zware jongens', 'Heavies'], rush: ['Spitsuur', 'Rush hour'], dusk: ['Schemering', 'Twilight'], golden: ['Gouden uur', 'Golden hour'],
};

export const missionId = (worldId: string, index: number): string => `${worldId}:${index}`;

const TIMES: TimeOfDay[] = ['morning', 'golden', 'dusk', 'night'];

/** Build mission `index` (0-based) of a world by scaling the island's base definition. */
export function buildMission(worldIndex: number, index: number): LevelDef & { tag: MissionTag; index: number; worldIndex: number } {
  const base = WORLDS[worldIndex];
  const i = index;
  const tagOrder: MissionTag[] = ['calm', 'busy', 'golden', 'storm', 'dusk', 'heavies', 'night', 'rush'];
  const tag = tagOrder[i];
  const time: TimeOfDay = tag === 'night' ? 'night' : tag === 'dusk' ? 'dusk' : tag === 'golden' ? 'golden' : tag === 'storm' ? 'morning' : i % 2 === 0 ? base.time : TIMES[(worldIndex + i) % 4];
  const difficulty = worldIndex * 0.35 + i * 0.12; // 0 .. ~2.6
  const goal = Math.round(base.goal * (0.75 + i * 0.09));
  // plane pool: early missions of a world stick to the lighter half
  const sorted = base.planes.slice();
  let pool = sorted;
  if (i < 2 && sorted.length > 2) pool = sorted.filter(p => !['b747', 'a320'].includes(p.type));
  if (pool.length === 0) pool = sorted;
  if (tag === 'heavies') pool = sorted.map(p => ({ ...p, weight: ['b747', 'a320', 'e195'].includes(p.type) ? p.weight * 3 : p.weight }));
  const s = base.spawn;
  const spawn = {
    first: 1.2,
    base: Math.max(6, s.base - i * 0.5 - (tag === 'rush' ? 2 : 0)),
    min: Math.max(3.8, s.min - i * 0.25),
    step: s.step,
    maxConcurrent: s.maxConcurrent + (tag === 'busy' || tag === 'rush' ? 1 : 0),
    maxConcurrentEnd: s.maxConcurrentEnd + (tag === 'rush' ? 2 : i >= 5 ? 1 : 0),
  };
  const wind = base.wind
    ? { ...base.wind, kmh: Math.round(base.wind.kmh * (0.55 + i * 0.09) * (tag === 'storm' ? 1.7 : 1)), gust: Math.round(base.wind.gust * (tag === 'storm' ? 2.2 : 1)), wander: base.wind.wander * (tag === 'storm' ? 1.6 : 1) }
    : (tag === 'storm' ? { kmh: 14, gust: 8, dirDeg: 100 + worldIndex * 40, wander: 20 } : null);
  const tagName = TAG_NAMES[tag][lang() === 'nl' ? 0 : 1];
  return {
    ...base,
    id: missionId(base.id, i),
    name: `${base.name} ${i + 1}`,
    subtitle: tagName, subtitleEn: TAG_NAMES[tag][1],
    time, goal, planes: pool, spawn, wind,
    clouds: base.clouds + (tag === 'storm' ? 4 : 0),
    seed: base.seed,
    tag, index: i, worldIndex,
    // difficulty is folded into spawn/wind above; keep for display
    ...(difficulty ? {} : {}),
  };
}

export function worldStars(worldIndex: number): number {
  let s = 0;
  for (let i = 0; i < LEVELS_PER_WORLD; i++) s += levelProgress(missionId(WORLDS[worldIndex].id, i)).stars;
  return s;
}
export function totalStars(): number {
  let s = 0;
  for (let w = 0; w < WORLDS.length; w++) s += worldStars(w);
  return s;
}
/** A world unlocks once the previous world has at least 12 of 24 stars. */
export function worldUnlocked(worldIndex: number): boolean {
  if (worldIndex === 0) return true;
  return worldStars(worldIndex - 1) >= 12;
}
/** A mission unlocks when the previous mission in its world is completed. */
export function missionUnlocked(worldIndex: number, index: number): boolean {
  if (!worldUnlocked(worldIndex)) return false;
  if (index === 0) return true;
  return levelProgress(missionId(WORLDS[worldIndex].id, index - 1)).completed;
}
export function nextMission(worldIndex: number, index: number): { worldIndex: number; index: number } | null {
  if (index + 1 < LEVELS_PER_WORLD) return { worldIndex, index: index + 1 };
  if (worldIndex + 1 < WORLDS.length) return { worldIndex: worldIndex + 1, index: 0 };
  return null;
}

export function starsForRun(heartsLeft: number, maxHearts: number): number {
  const lost = maxHearts - heartsLeft;
  return lost === 0 ? 3 : lost === 1 ? 2 : 1;
}

export function coinsForRun(landed: number, stars: number, multiplier: number): number {
  return Math.round((landed * 6 + [0, 20, 45, 80][stars]) * multiplier);
}
