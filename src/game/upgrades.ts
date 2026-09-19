import { save, persist, upgradeLevel } from '../util/storage';
import { lang } from '../i18n';

export interface UpgradeDef {
  id: string;
  name: string; nameEn: string;
  desc: string; descEn: string;
  costs: number[];          // cost per tier; length = max tier
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'terminal', name: 'Terminal uitbreiden', nameEn: 'Expand terminal', desc: 'Grotere terminal en meer hangars op het eiland. Elke landing levert meer munten op.', descEn: 'Bigger terminal and more hangars on the island. Every landing earns more coins.', costs: [250, 600, 1200] },
  { id: 'hearts', name: 'Extra reddingsboei', nameEn: 'Extra lifebuoy', desc: 'Begin elk level met een extra leven.', descEn: 'Start every level with an extra life.', costs: [400, 1000] },
  { id: 'radar', name: 'Radar', nameEn: 'Radar', desc: 'De afstandsmeter tussen toestellen verschijnt al vanaf 220 m in plaats van 130 m.', descEn: 'The distance readout between aircraft appears from 220 m instead of 130 m.', costs: [200] },
  { id: 'ils', name: 'ILS-landingssysteem', nameEn: 'ILS landing system', desc: 'Toestellen mogen schever aanvliegen zonder doorstart.', descEn: 'Aircraft may approach more crooked without a go-around.', costs: [450] },
  { id: 'windbreak', name: 'Windschermen', nameEn: 'Wind shields', desc: 'De wind duwt toestellen minder van hun route af.', descEn: 'Wind pushes aircraft off their route less.', costs: [350, 900] },
  { id: 'taxi', name: 'Snelle taxibanen', nameEn: 'Fast taxiways', desc: 'De baan is sneller weer vrij na een landing.', descEn: 'The runway is free again sooner after a landing.', costs: [300] },
  { id: 'slowmo', name: 'Verkeerstoren: tijd vertragen', nameEn: 'Tower: slow time', desc: 'Een knop in het spel die alles 6 seconden op halve snelheid zet. Twee keer per level.', descEn: 'An in-game button that runs everything at half speed for 6 seconds. Twice per level.', costs: [500] },
];

export const upgradeById = (id: string): UpgradeDef => UPGRADES.find(u => u.id === id)!;
export const upgradeName = (u: UpgradeDef): string => (lang() === 'nl' ? u.name : u.nameEn);
export const upgradeDesc = (u: UpgradeDef): string => (lang() === 'nl' ? u.desc : u.descEn);

export function nextCost(id: string): number | null {
  const u = upgradeById(id);
  const lvl = upgradeLevel(id);
  return lvl >= u.costs.length ? null : u.costs[lvl];
}

export function buyUpgrade(id: string): boolean {
  const cost = nextCost(id);
  if (cost === null || save.coins < cost) return false;
  save.coins -= cost;
  save.upgrades[id] = upgradeLevel(id) + 1;
  persist();
  return true;
}

/** Gameplay effects derived from the owned upgrades. */
export function effects(): {
  hearts: number; radarRange: number; alignBonus: number; windFactor: number; taxiRelease: number;
  slowmoCharges: number; coinMultiplier: number; terminalTier: number;
} {
  const t = upgradeLevel('terminal');
  return {
    hearts: 3 + upgradeLevel('hearts'),
    radarRange: upgradeLevel('radar') ? 220 : 132,
    alignBonus: upgradeLevel('ils') ? 1.35 : 1,
    windFactor: [1, 0.75, 0.5][upgradeLevel('windbreak')] ?? 0.5,
    taxiRelease: upgradeLevel('taxi') ? 0.42 : 0.62,
    slowmoCharges: upgradeLevel('slowmo') ? 2 : 0,
    coinMultiplier: 1 + t * 0.25,
    terminalTier: t,
  };
}
