import type { PlaneType, Shape, PlaneFamily } from './types';

// ---------- shape builders (all sizes relative to the hull radius h) ----------

const ga = (h: number, o: { low?: boolean; twin?: boolean; long?: number } = {}): Shape => ({
  L: (o.long ?? 2.4) * h, w: 0.36 * h, span: 2.7 * h, sweep: 0, wingX: 0.2 * h, chord: 0.55 * h, tailSpan: 1.05 * h, tailX: -1.0 * h,
  engines: o.twin ? [{ x: 0.55 * h, y: -0.85 * h, kind: 'prop' }, { x: 0.55 * h, y: 0.85 * h, kind: 'prop' }] : [{ x: 1.15 * h, y: 0, kind: 'prop' }],
  highWing: !o.low,
});
const turboprop = (h: number, o: { tTail?: boolean; span?: number; four?: boolean } = {}): Shape => ({
  L: 2.9 * h, w: 0.4 * h, span: (o.span ?? 2.8) * h, sweep: 0, wingX: 0.1 * h, chord: 0.5 * h, tailSpan: 1.1 * h, tailX: -1.25 * h,
  engines: o.four
    ? [{ x: 0.45 * h, y: -0.7 * h, kind: 'prop' }, { x: 0.35 * h, y: -1.25 * h, kind: 'prop' }, { x: 0.45 * h, y: 0.7 * h, kind: 'prop' }, { x: 0.35 * h, y: 1.25 * h, kind: 'prop' }]
    : [{ x: 0.5 * h, y: -0.8 * h, kind: 'prop' }, { x: 0.5 * h, y: 0.8 * h, kind: 'prop' }],
  highWing: true, tTail: o.tTail,
});
const airliner = (h: number, o: { span?: number; sweep?: number; four?: boolean; hump?: boolean; L?: number; w?: number } = {}): Shape => ({
  L: (o.L ?? 3.1) * h, w: (o.w ?? 0.45) * h, span: (o.span ?? 2.9) * h, sweep: (o.sweep ?? 0.6) * h, wingX: 0, chord: 0.65 * h, tailSpan: 1.05 * h, tailX: -1.3 * h,
  engines: o.four
    ? [{ x: 0.35 * h, y: -0.62 * h, kind: 'jet' }, { x: 0.05 * h, y: -1.1 * h, kind: 'jet' }, { x: 0.35 * h, y: 0.62 * h, kind: 'jet' }, { x: 0.05 * h, y: 1.1 * h, kind: 'jet' }]
    : [{ x: 0.3 * h, y: -0.75 * h, kind: 'jet' }, { x: 0.3 * h, y: 0.75 * h, kind: 'jet' }],
  winglets: true, hump: o.hump,
});
const bizjet = (h: number): Shape => ({
  L: 3.0 * h, w: 0.36 * h, span: 2.6 * h, sweep: 0.55 * h, wingX: -0.1 * h, chord: 0.55 * h, tailSpan: 0.95 * h, tailX: -1.3 * h,
  engines: [{ x: -0.85 * h, y: -0.55 * h, kind: 'rearjet' }, { x: -0.85 * h, y: 0.55 * h, kind: 'rearjet' }], winglets: true, tTail: true,
});
const fighter = (h: number, o: { delta?: boolean; twinTail?: boolean; twin?: boolean } = {}): Shape => ({
  L: 3.2 * h, w: 0.34 * h, span: 2.0 * h, sweep: 0.9 * h, wingX: -0.3 * h, chord: 1.1 * h, tailSpan: 1.0 * h, tailX: -1.35 * h,
  engines: [], delta: o.delta, twinTail: o.twinTail, canopy: true, afterburner: true, afterburners: o.twin ? 2 : 1,
});
const heli = (h: number, o: { tandem?: boolean } = {}): Shape => ({
  L: (o.tandem ? 3.0 : 2.1) * h, w: 0.55 * h, span: 0, sweep: 0, wingX: 0, chord: 0, tailSpan: 0.6 * h, tailX: -1.55 * h,
  engines: [], rotor: o.tandem ? 'tandem' : 'single',
});
const transport = (h: number, o: { four?: boolean; jets?: boolean } = {}): Shape => ({
  L: 3.0 * h, w: 0.5 * h, span: 3.1 * h, sweep: 0.1 * h, wingX: 0.05 * h, chord: 0.6 * h, tailSpan: 1.2 * h, tailX: -1.3 * h,
  engines: o.jets
    ? [{ x: 0.3 * h, y: -0.75 * h, kind: 'jet' }, { x: 0.3 * h, y: 0.75 * h, kind: 'jet' }]
    : [{ x: 0.45 * h, y: -0.7 * h, kind: 'prop' }, { x: 0.35 * h, y: -1.25 * h, kind: 'prop' }, { x: 0.45 * h, y: 0.7 * h, kind: 'prop' }, { x: 0.35 * h, y: 1.25 * h, kind: 'prop' }],
  highWing: true, tTail: true,
});

// ---------- family tips (shown in the post-mortem) ----------

const TIPS: Record<PlaneFamily, [string, string]> = {
  ga: ['Kleine propellertoestellen zijn wendbaar maar worden het meest door de wind geduwd. Teken bij wind een ruimere bocht.', 'Small propeller aircraft are nimble but are pushed around most by wind. Draw wider turns in wind.'],
  turboprop: ['Turboprops zijn sneller dan de kleintjes en draaien minder scherp. Zet ze niet vlak achter een langzaam toestel.', 'Turboprops are faster than the small ones and turn less sharply. Do not put them right behind a slow aircraft.'],
  regional: ['Regionale jets halen propellertoestellen snel in. Geef ze voorrang of een lange omweg.', 'Regional jets quickly catch up with propeller aircraft. Give them priority or a long detour.'],
  narrow: ['Een narrowbody heeft een lange rechte eindnadering nodig: minstens 150 m recht voor de baan.', 'A narrowbody needs a long straight final: at least 150 m straight before the runway.'],
  wide: ['Widebodies draaien heel traag en mogen alleen op de lange baan. Begin de bocht vroeg en houd anderen ver weg.', 'Widebodies turn very slowly and may only use the long runway. Start turns early and keep others far away.'],
  bizjet: ['Zakenjets zijn snel én wendbaar, maar juist daardoor onderschat je hoe snel ze bij een ander toestel zijn.', 'Business jets are fast and agile, which makes it easy to underestimate how quickly they reach another aircraft.'],
  heli: ['Helikopters landen op de H uit elke richting, maar zijn traag: houd ze uit de aanvliegroutes.', 'Helicopters land on the H from any direction, but are slow: keep them out of the approach paths.'],
  sea: ['Watervliegtuigen landen alleen op de waterbaan tussen de boeien, niet op asfalt.', 'Seaplanes only land on the water lane between the buoys, not on asphalt.'],
  fighter: ['Straaljagers zijn extreem snel en hebben weinig brandstof: land ze direct en ruim het luchtruim voor ze.', 'Fighters are extremely fast and low on fuel: land them immediately and clear the airspace for them.'],
  miltransport: ['Militaire transporten zijn groot en traag maar hebben vaak haast. Geef ze de lange baan en voorrang.', 'Military transports are big and slow but often in a hurry. Give them the long runway and priority.'],
};

interface Spec {
  id: string; name: string; maker: string; family: PlaneFamily; cls: PlaneType['cls'];
  speed: number; turn: number; hull: number; wind: number; engines: PlaneType['engines'];
  body: string; accent: string; shape: Shape; callsign: string; military?: boolean; fuel?: number;
  xwind?: number; ils?: boolean; antiIce?: 'none' | 'partial' | 'full'; minVis?: number; seaLimit?: number;
}

/** Realistic defaults per family; individual specs may override. */
const CAPS: Record<PlaneFamily, { xwind: number; ils: boolean; antiIce: 'none' | 'partial' | 'full'; minVis: number }> = {
  ga: { xwind: 28, ils: false, antiIce: 'none', minVis: 1500 },
  turboprop: { xwind: 46, ils: true, antiIce: 'partial', minVis: 800 },
  regional: { xwind: 60, ils: true, antiIce: 'full', minVis: 550 },
  narrow: { xwind: 65, ils: true, antiIce: 'full', minVis: 550 },
  wide: { xwind: 65, ils: true, antiIce: 'full', minVis: 550 },
  bizjet: { xwind: 50, ils: true, antiIce: 'full', minVis: 800 },
  heli: { xwind: 60, ils: false, antiIce: 'none', minVis: 800 },
  sea: { xwind: 24, ils: false, antiIce: 'none', minVis: 1500 },
  fighter: { xwind: 55, ils: true, antiIce: 'full', minVis: 800 },
  miltransport: { xwind: 60, ils: true, antiIce: 'full', minVis: 550 },
};

const WHITE = '#fdfdff';
const MIL_GREY = '#aab3bd', MIL_GREEN = '#6f7d5a', MIL_DARK = '#3f4750';

const SPECS: Spec[] = [
  // --- general aviation ---
  { id: 'c172', name: 'Cessna 172 Skyhawk', maker: 'Cessna', family: 'ga', cls: 'light', speed: 50, turn: 2.4, hull: 13, wind: 1.0, engines: 'prop1', body: '#fff8ee', accent: '#ff7a59', shape: ga(13), callsign: 'Skyhawk', xwind: 28 },
  { id: 'pa28', name: 'Piper PA-28 Cherokee', maker: 'Piper', family: 'ga', cls: 'light', speed: 52, turn: 2.4, hull: 13, wind: 1.0, engines: 'prop1', body: '#fffdf5', accent: '#3aa0d8', shape: ga(13, { low: true }), callsign: 'Cherokee' },
  { id: 'sr22', name: 'Cirrus SR22', maker: 'Cirrus', family: 'ga', cls: 'light', speed: 58, turn: 2.3, hull: 13, wind: 0.95, engines: 'prop1', body: '#f7fbff', accent: '#e0413e', shape: ga(13, { low: true }), callsign: 'Cirrus', xwind: 38, ils: true, antiIce: 'partial' },
  { id: 'da40', name: 'Diamond DA40', maker: 'Diamond', family: 'ga', cls: 'light', speed: 50, turn: 2.5, hull: 12, wind: 1.05, engines: 'prop1', body: '#ffffff', accent: '#2fbf9a', shape: ga(12, { low: true }), callsign: 'Diamond' },
  { id: 'bonanza', name: 'Beechcraft Bonanza', maker: 'Beechcraft', family: 'ga', cls: 'light', speed: 56, turn: 2.3, hull: 13, wind: 0.95, engines: 'prop1', body: '#fff9f0', accent: '#7c5cff', shape: ga(13, { low: true }), callsign: 'Bonanza' },
  { id: 'dhc6', name: 'DHC-6 Twin Otter', maker: 'De Havilland', family: 'ga', cls: 'light', speed: 58, turn: 2.0, hull: 17, wind: 0.85, engines: 'prop2', body: '#fffaf0', accent: '#3aa0d8', shape: ga(17, { twin: true, long: 2.6 }), callsign: 'Twin Otter', xwind: 46, ils: true, antiIce: 'partial' },
  { id: 'c208', name: 'Cessna 208 Caravan', maker: 'Cessna', family: 'ga', cls: 'light', speed: 54, turn: 2.1, hull: 15, wind: 0.9, engines: 'prop1', body: '#fff6e0', accent: '#f2b53a', shape: ga(15, { long: 2.6 }), callsign: 'Caravan', xwind: 37, ils: true, antiIce: 'partial' },
  // --- turboprops ---
  { id: 'kingair', name: 'Beechcraft King Air 350', maker: 'Beechcraft', family: 'turboprop', cls: 'medium', speed: 70, turn: 1.7, hull: 17, wind: 0.7, engines: 'prop2', body: WHITE, accent: '#1f4e8c', shape: turboprop(17, { tTail: true, span: 2.6 }), callsign: 'King Air' },
  { id: 'pc12', name: 'Pilatus PC-12', maker: 'Pilatus', family: 'turboprop', cls: 'medium', speed: 66, turn: 1.8, hull: 16, wind: 0.75, engines: 'prop1', body: WHITE, accent: '#c92a2a', shape: ga(16, { low: true, long: 2.8 }), callsign: 'Pilatus' },
  { id: 'atr72', name: 'ATR 72-600', maker: 'ATR', family: 'turboprop', cls: 'medium', speed: 72, turn: 1.5, hull: 21, wind: 0.6, engines: 'prop2', body: '#ffffff', accent: '#7c5cff', shape: turboprop(21, { tTail: true }), callsign: 'ATR' },
  { id: 'q400', name: 'De Havilland Dash 8 Q400', maker: 'De Havilland', family: 'turboprop', cls: 'medium', speed: 78, turn: 1.4, hull: 22, wind: 0.55, engines: 'prop2', body: WHITE, accent: '#0aa35e', shape: turboprop(22, { tTail: true, span: 2.7 }), callsign: 'Dash' },
  // --- regional jets ---
  { id: 'e175', name: 'Embraer E175', maker: 'Embraer', family: 'regional', cls: 'medium', speed: 84, turn: 1.25, hull: 22, wind: 0.5, engines: 'jet2', body: WHITE, accent: '#2fbf9a', shape: airliner(22, { L: 3.0, w: 0.42, span: 2.7, sweep: 0.55 }), callsign: 'Embraer' },
  { id: 'e195', name: 'Embraer E195-E2', maker: 'Embraer', family: 'regional', cls: 'medium', speed: 86, turn: 1.2, hull: 24, wind: 0.45, engines: 'jet2', body: WHITE, accent: '#2fbf9a', shape: airliner(24, { L: 3.1, w: 0.42, span: 2.7, sweep: 0.55 }), callsign: 'Embraer' },
  { id: 'crj900', name: 'Bombardier CRJ900', maker: 'Bombardier', family: 'regional', cls: 'medium', speed: 86, turn: 1.25, hull: 22, wind: 0.5, engines: 'jet2', body: WHITE, accent: '#ff5f8f', shape: { ...bizjet(22), L: 3.3 * 22, span: 2.5 * 22 }, callsign: 'Canadair' },
  // --- narrowbodies ---
  { id: 'a320', name: 'Airbus A320neo', maker: 'Airbus', family: 'narrow', cls: 'medium', speed: 92, turn: 1.05, hull: 27, wind: 0.4, engines: 'jet2', body: '#ffffff', accent: '#ff5f8f', shape: airliner(27), callsign: 'Airbus' },
  { id: 'a321', name: 'Airbus A321neo', maker: 'Airbus', family: 'narrow', cls: 'medium', speed: 94, turn: 1.0, hull: 29, wind: 0.38, engines: 'jet2', body: WHITE, accent: '#ff8f4a', shape: airliner(29, { L: 3.4 }), callsign: 'Airbus' },
  { id: 'b737', name: 'Boeing 737 MAX 8', maker: 'Boeing', family: 'narrow', cls: 'medium', speed: 92, turn: 1.05, hull: 27, wind: 0.4, engines: 'jet2', body: WHITE, accent: '#1f6feb', shape: airliner(27), callsign: 'Boeing' },
  { id: 'b757', name: 'Boeing 757-200', maker: 'Boeing', family: 'narrow', cls: 'medium', speed: 96, turn: 0.98, hull: 30, wind: 0.36, engines: 'jet2', body: WHITE, accent: '#8a2be2', shape: airliner(30, { L: 3.5, span: 2.7 }), callsign: 'Boeing' },
  // --- widebodies ---
  { id: 'b787', name: 'Boeing 787-9 Dreamliner', maker: 'Boeing', family: 'wide', cls: 'heavy', speed: 100, turn: 0.85, hull: 35, wind: 0.3, engines: 'jet2', body: WHITE, accent: '#1f6feb', shape: airliner(35, { span: 3.2, sweep: 0.8 }), callsign: 'Dreamliner heavy' },
  { id: 'a350', name: 'Airbus A350-900', maker: 'Airbus', family: 'wide', cls: 'heavy', speed: 102, turn: 0.82, hull: 36, wind: 0.3, engines: 'jet2', body: WHITE, accent: '#0b3d91', shape: airliner(36, { span: 3.2, sweep: 0.8 }), callsign: 'Airbus heavy' },
  { id: 'a330', name: 'Airbus A330-300', maker: 'Airbus', family: 'wide', cls: 'heavy', speed: 100, turn: 0.82, hull: 36, wind: 0.3, engines: 'jet2', body: WHITE, accent: '#d97706', shape: airliner(36, { span: 3.1, sweep: 0.7 }), callsign: 'Airbus heavy' },
  { id: 'b777', name: 'Boeing 777-300ER', maker: 'Boeing', family: 'wide', cls: 'heavy', speed: 104, turn: 0.78, hull: 38, wind: 0.28, engines: 'jet2', body: WHITE, accent: '#b91c1c', shape: airliner(38, { L: 3.5, span: 3.1, sweep: 0.75 }), callsign: 'Triple seven heavy' },
  { id: 'b747', name: 'Boeing 747-8', maker: 'Boeing', family: 'wide', cls: 'heavy', speed: 98, turn: 0.75, hull: 38, wind: 0.3, engines: 'jet4', body: '#fbfbff', accent: '#3b6cff', shape: airliner(38, { L: 3.3, w: 0.5, span: 3.1, sweep: 0.75, four: true, hump: true }), callsign: 'Jumbo heavy' },
  { id: 'a380', name: 'Airbus A380-800', maker: 'Airbus', family: 'wide', cls: 'heavy', speed: 100, turn: 0.7, hull: 42, wind: 0.26, engines: 'jet4', body: WHITE, accent: '#0aa35e', shape: airliner(42, { L: 3.2, w: 0.6, span: 3.3, sweep: 0.7, four: true }), callsign: 'Super heavy' },
  // --- business jets ---
  { id: 'citation', name: 'Cessna Citation CJ4', maker: 'Cessna', family: 'bizjet', cls: 'medium', speed: 88, turn: 1.5, hull: 16, wind: 0.55, engines: 'jet2', body: WHITE, accent: '#6b7280', shape: bizjet(16), callsign: 'Citation' },
  { id: 'g650', name: 'Gulfstream G650', maker: 'Gulfstream', family: 'bizjet', cls: 'medium', speed: 98, turn: 1.35, hull: 20, wind: 0.5, engines: 'jet2', body: WHITE, accent: '#c9a227', shape: bizjet(20), callsign: 'Gulfstream' },
  // --- helicopters ---
  { id: 'h135', name: 'Airbus H135', maker: 'Airbus Helicopters', family: 'heli', cls: 'heli', speed: 42, turn: 3.4, hull: 12, wind: 1.1, engines: 'rotor', body: '#fff1f1', accent: '#e0413e', shape: heli(12), callsign: 'Helicopter' },
  { id: 'r44', name: 'Robinson R44', maker: 'Robinson', family: 'heli', cls: 'heli', speed: 38, turn: 3.6, hull: 10, wind: 1.2, engines: 'rotor', body: '#fffbe6', accent: '#1f6feb', shape: heli(10), callsign: 'Robinson', xwind: 32 },
  { id: 'aw139', name: 'Leonardo AW139', maker: 'Leonardo', family: 'heli', cls: 'heli', speed: 48, turn: 3.2, hull: 14, wind: 1.0, engines: 'rotor', body: '#fff7e6', accent: '#f59e0b', shape: heli(14), callsign: 'Rescue', ils: true, antiIce: 'full' },
  { id: 's92', name: 'Sikorsky S-92', maker: 'Sikorsky', family: 'heli', cls: 'heli', speed: 46, turn: 3.0, hull: 16, wind: 0.95, engines: 'rotor', body: '#eef2ff', accent: '#0b3d91', shape: heli(16), callsign: 'Sikorsky', ils: true, antiIce: 'full' },
  // --- seaplanes ---
  { id: 'c208a', name: 'Cessna 208 Caravan Amphibian', maker: 'Cessna', family: 'sea', cls: 'sea', speed: 54, turn: 2.1, hull: 15, wind: 0.95, engines: 'float', body: '#fff6e0', accent: '#f2b53a', shape: { ...ga(15, { long: 2.6 }), floats: true }, callsign: 'Caravan', seaLimit: 0.45 },
  { id: 'dhc6f', name: 'DHC-6 Twin Otter (drijvers)', maker: 'De Havilland', family: 'sea', cls: 'sea', speed: 56, turn: 2.0, hull: 17, wind: 0.9, engines: 'float', body: '#fffaf0', accent: '#0aa35e', shape: { ...ga(17, { twin: true, long: 2.6 }), floats: true }, callsign: 'Twin Otter', seaLimit: 0.55 },
  { id: 'icona5', name: 'ICON A5', maker: 'ICON', family: 'sea', cls: 'sea', speed: 44, turn: 2.6, hull: 11, wind: 1.1, engines: 'float', body: '#ffffff', accent: '#e0413e', shape: { ...ga(11), floats: true }, callsign: 'Icon', seaLimit: 0.3, xwind: 20 },
  // --- military ---
  { id: 'c130', name: 'Lockheed C-130 Hercules', maker: 'Lockheed Martin', family: 'miltransport', cls: 'heavy', speed: 80, turn: 1.1, hull: 28, wind: 0.42, engines: 'prop4', body: MIL_GREY, accent: MIL_DARK, shape: transport(28), callsign: 'Herky', military: true, fuel: 80 },
  { id: 'a400m', name: 'Airbus A400M Atlas', maker: 'Airbus Defence', family: 'miltransport', cls: 'heavy', speed: 88, turn: 1.0, hull: 32, wind: 0.4, engines: 'prop4', body: MIL_GREY, accent: MIL_DARK, shape: transport(32), callsign: 'Atlas', military: true, fuel: 80 },
  { id: 'p8', name: 'Boeing P-8 Poseidon', maker: 'Boeing Defense', family: 'miltransport', cls: 'heavy', speed: 96, turn: 0.98, hull: 30, wind: 0.36, engines: 'jet2', body: '#b9c2cc', accent: MIL_DARK, shape: airliner(30, { L: 3.4, span: 2.8 }), callsign: 'Poseidon', military: true, fuel: 75 },
  { id: 'f16', name: 'F-16 Fighting Falcon', maker: 'Lockheed Martin', family: 'fighter', cls: 'fast', speed: 128, turn: 1.7, hull: 15, wind: 0.35, engines: 'jet2', body: MIL_GREY, accent: MIL_DARK, shape: fighter(15), callsign: 'Viper', military: true, fuel: 50 },
  { id: 'f35', name: 'F-35 Lightning II', maker: 'Lockheed Martin', family: 'fighter', cls: 'fast', speed: 130, turn: 1.6, hull: 16, wind: 0.34, engines: 'jet2', body: '#8f98a3', accent: MIL_DARK, shape: fighter(16, { twinTail: true }), callsign: 'Lightning', military: true, fuel: 50 },
  { id: 'eurofighter', name: 'Eurofighter Typhoon', maker: 'Eurofighter', family: 'fighter', cls: 'fast', speed: 134, turn: 1.75, hull: 16, wind: 0.34, engines: 'jet2', body: MIL_GREY, accent: MIL_DARK, shape: fighter(16, { delta: true, twin: true }), callsign: 'Typhoon', military: true, fuel: 45 },
  { id: 'chinook', name: 'Boeing CH-47 Chinook', maker: 'Boeing Defense', family: 'heli', cls: 'heli', speed: 50, turn: 2.8, hull: 18, wind: 0.9, engines: 'rotor', body: MIL_GREEN, accent: MIL_DARK, shape: heli(18, { tandem: true }), callsign: 'Chinook', military: true, fuel: 70, ils: true, antiIce: 'full' },
  { id: 'nh90', name: 'NH90', maker: 'NHIndustries', family: 'heli', cls: 'heli', speed: 48, turn: 3.0, hull: 15, wind: 0.95, engines: 'rotor', body: MIL_GREEN, accent: MIL_DARK, shape: heli(15), callsign: 'Merlin', military: true, fuel: 70, ils: true, antiIce: 'full' },
];

export const PLANE_TYPES: Record<string, PlaneType> = Object.fromEntries(SPECS.map(s => [s.id, {
  id: s.id, name: s.name, maker: s.maker, family: s.family, cls: s.cls,
  speed: s.speed, turnRate: s.turn, hull: s.hull, windSensitivity: s.wind, engines: s.engines,
  livery: { body: s.body, accent: s.accent, wing: s.military ? s.body : '#f1efff' },
  shape: s.shape, callsign: s.callsign, military: !!s.military, fuel: s.fuel ?? 0,
  crosswindLimit: s.xwind ?? CAPS[s.family].xwind, ils: s.ils ?? CAPS[s.family].ils, antiIce: s.antiIce ?? CAPS[s.family].antiIce,
  minVis: s.minVis ?? CAPS[s.family].minVis, seaLimit: s.seaLimit ?? (s.family === 'sea' ? 0.4 : 0),
  tip: TIPS[s.family][0], tipEn: TIPS[s.family][1],
} satisfies PlaneType]));

export const displayKmh = (speed: number): number => Math.round(speed * 2.4 / 5) * 5;

export function runwayAccepts(kind: string, cls: string): boolean {
  switch (kind) {
    case 'short': return cls === 'light' || cls === 'medium';
    case 'long': return cls === 'light' || cls === 'medium' || cls === 'heavy' || cls === 'fast';
    case 'water': return cls === 'sea';
    case 'helipad': return cls === 'heli';
  }
  return false;
}
