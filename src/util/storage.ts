export interface LevelProgress { best: number; stars: number; completed: boolean }
export interface SaveData {
  levels: Record<string, LevelProgress>;
  sound: boolean;
  haptics: boolean;
  lang: 'nl' | 'en' | 'auto';
  tutorialSeen: boolean;
}

const KEY = 'wolkenhaven.save.v1';

const defaults = (): SaveData => ({ levels: {}, sound: true, haptics: true, lang: 'auto', tutorialSeen: false });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch { return defaults(); }
}

export function writeSave(data: SaveData): void {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* private mode */ }
}

export const save: SaveData = loadSave();
export const persist = (): void => writeSave(save);

export function levelProgress(id: string): LevelProgress {
  return save.levels[id] ?? { best: 0, stars: 0, completed: false };
}
export function recordLevelResult(id: string, landed: number, stars: number, completed: boolean): LevelProgress {
  const cur = levelProgress(id);
  const next: LevelProgress = {
    best: Math.max(cur.best, landed),
    stars: Math.max(cur.stars, stars),
    completed: cur.completed || completed,
  };
  save.levels[id] = next;
  persist();
  return next;
}
