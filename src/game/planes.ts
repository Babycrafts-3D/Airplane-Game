import type { PlaneType } from './types';

/** Real aircraft, stylised. Speeds are game units/s; display km/h = speed * 2.4. */
export const PLANE_TYPES: Record<string, PlaneType> = {
  c172: {
    id: 'c172', name: 'Cessna 172 Skyhawk', maker: 'Cessna', cls: 'light',
    speed: 50, turnRate: 2.4, hull: 13, windSensitivity: 1.0, engines: 'prop1',
    livery: { body: '#fff8ee', accent: '#ff7a59', wing: '#f4ecdd' },
    tip: 'De Cessna is klein en wendbaar, maar wordt het meest door de wind geduwd. Teken bij wind een ruimere bocht.',
    tipEn: 'The Cessna is small and nimble but is pushed around most by wind. Draw wider turns in wind.',
  },
  dhc6: {
    id: 'dhc6', name: 'DHC-6 Twin Otter', maker: 'De Havilland', cls: 'light',
    speed: 58, turnRate: 2.0, hull: 17, windSensitivity: 0.85, engines: 'prop2',
    livery: { body: '#fffaf0', accent: '#3aa0d8', wing: '#eef3f6' },
    tip: 'De Twin Otter landt overal, maar houdt niet van korte routes vlak achter een sneller toestel.',
    tipEn: 'The Twin Otter lands anywhere, but dislikes short routes right behind a faster aircraft.',
  },
  atr72: {
    id: 'atr72', name: 'ATR 72-600', maker: 'ATR', cls: 'medium',
    speed: 72, turnRate: 1.5, hull: 21, windSensitivity: 0.6, engines: 'prop2',
    livery: { body: '#ffffff', accent: '#7c5cff', wing: '#f1efff' },
    tip: 'De ATR 72 is een turboprop: sneller dan de kleintjes, maar hij kan niet meer op een stuiver draaien.',
    tipEn: 'The ATR 72 is a turboprop: faster than the small ones, but it cannot turn on a dime anymore.',
  },
  e195: {
    id: 'e195', name: 'Embraer E195-E2', maker: 'Embraer', cls: 'medium',
    speed: 86, turnRate: 1.2, hull: 24, windSensitivity: 0.45, engines: 'jet2',
    livery: { body: '#fdfdff', accent: '#2fbf9a', wing: '#eaf7f2' },
    tip: 'De Embraer haalt propellertoestellen snel in. Geef hem voorrang of een lange omweg.',
    tipEn: 'The Embraer quickly catches up with propeller aircraft. Give it priority or a long detour.',
  },
  a320: {
    id: 'a320', name: 'Airbus A320neo', maker: 'Airbus', cls: 'medium',
    speed: 92, turnRate: 1.05, hull: 27, windSensitivity: 0.4, engines: 'jet2',
    livery: { body: '#ffffff', accent: '#ff5f8f', wing: '#f6f2f4' },
    tip: 'De A320 heeft een lange rechte eindnadering nodig: minstens 150 m recht voor de baan.',
    tipEn: 'The A320 needs a long straight final: at least 150 m straight before the runway.',
  },
  b747: {
    id: 'b747', name: 'Boeing 747-400', maker: 'Boeing', cls: 'heavy',
    speed: 98, turnRate: 0.75, hull: 36, windSensitivity: 0.3, engines: 'jet4',
    livery: { body: '#fbfbff', accent: '#3b6cff', wing: '#eef0fb' },
    tip: 'De Jumbo draait heel traag en mag alleen op de lange baan. Begin de bocht vroeg en houd andere toestellen ver weg.',
    tipEn: 'The Jumbo turns very slowly and may only use the long runway. Start turns early and keep others far away.',
  },
  c208: {
    id: 'c208', name: 'Cessna 208 Caravan (drijvers)', maker: 'Cessna', cls: 'sea',
    speed: 54, turnRate: 2.1, hull: 15, windSensitivity: 0.95, engines: 'float',
    livery: { body: '#fff6e0', accent: '#f2b53a', wing: '#f7eed6' },
    tip: 'Het watervliegtuig landt alleen op de waterbaan tussen de boeien, niet op asfalt.',
    tipEn: 'The seaplane only lands on the water lane between the buoys, not on asphalt.',
  },
  h135: {
    id: 'h135', name: 'Airbus H135', maker: 'Airbus Helicopters', cls: 'heli',
    speed: 42, turnRate: 3.4, hull: 12, windSensitivity: 1.1, engines: 'rotor',
    livery: { body: '#fff1f1', accent: '#e0413e', wing: '#f4dada' },
    tip: 'De helikopter landt op de H en mag uit elke richting komen, maar hij is traag: houd hem uit de aanvliegroutes.',
    tipEn: 'The helicopter lands on the H from any direction, but it is slow: keep it out of the approach paths.',
  },
};

export const displayKmh = (speed: number): number => Math.round(speed * 2.4 / 5) * 5;

export function runwayAccepts(kind: string, cls: string): boolean {
  switch (kind) {
    case 'short': return cls === 'light' || cls === 'medium';
    case 'long': return cls === 'light' || cls === 'medium' || cls === 'heavy';
    case 'water': return cls === 'sea';
    case 'helipad': return cls === 'heli';
  }
  return false;
}
