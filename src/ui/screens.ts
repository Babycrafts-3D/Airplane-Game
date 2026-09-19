import { LEVELS } from '../game/levels';
import { PLANE_TYPES } from '../game/planes';
import type { Report } from '../game/postmortem';
import { lang, t } from '../i18n';
import { levelProgress, persist, save } from '../util/storage';
import { sfx } from '../util/audio';

export interface UIActions {
  startLevel(id: string): void;
  resume(): void;
  retry(): void;
  next(): void;
  toLevels(): void;
  toTitle(): void;
  continueEndless(): void;
  openSettings(): void;
  closeSettings(): void;
  tutorialDone(): void;
  makeThumb(levelId: string, canvas: HTMLCanvasElement): void;
}

const svgStar = (on: boolean, size = 16): string =>
  `<svg class="star" viewBox="0 0 24 24" width="${size}" height="${size}"><path d="M12 2.6l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.5l-5.9 3.2 1.3-6.6L2.5 9.5l6.6-.8z" fill="${on ? '#ffcf5a' : 'rgba(255,255,255,0.35)'}" stroke="${on ? '#e0a400' : 'rgba(0,0,0,0.25)'}" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
const svgLock = `<svg viewBox="0 0 24 24" width="34" height="34"><rect x="5" y="10" width="14" height="11" rx="3" fill="#fff" opacity="0.9"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const svgBack = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`;
const svgGear = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>`;
const svgLogo = `<svg viewBox="0 0 120 84" fill="none">
  <ellipse cx="60" cy="70" rx="44" ry="8" fill="rgba(0,20,60,0.25)"/>
  <path d="M18 46c0-8 7-13 15-11 3-9 12-14 21-11 5-8 17-9 23-2 9-2 17 4 17 12 7 1 11 6 11 12 0 7-6 12-13 12H30c-7 0-12-5-12-12z" fill="#ffffff" opacity="0.95"/>
  <path d="M30 40c6-6 14-7 20-3" stroke="#cfe6ff" stroke-width="3" stroke-linecap="round"/>
  <g transform="translate(60 38) rotate(-18)">
    <path d="M-26 0h46c6 0 10 2 10 4s-4 4-10 4h-46c-3 0-5-2-5-4s2-4 5-4z" fill="#ff7a59"/>
    <path d="M-8 -2l-14 -16h7l20 16z" fill="#ffb59c"/>
    <path d="M-8 10l-14 16h7l20 -16z" fill="#ffb59c"/>
    <path d="M-24 0l-8 -10h5l12 10z" fill="#ff5a3c"/>
    <circle cx="16" cy="4" r="2.2" fill="#12294a"/>
    <circle cx="8" cy="4" r="2.2" fill="#12294a"/>
    <circle cx="0" cy="4" r="2.2" fill="#12294a"/>
  </g>
</svg>`;

const tutSvg = [
  `<svg viewBox="0 0 54 54"><rect x="0" y="0" width="54" height="54" rx="14" fill="#e6f3ff"/><path d="M12 40c8-14 14-16 30-26" stroke="#5ad1a5" stroke-width="3" stroke-linecap="round" stroke-dasharray="5 4" fill="none"/><circle cx="12" cy="40" r="5" fill="#ff7a59"/><rect x="38" y="6" width="8" height="18" rx="2" fill="#6b7280"/><path d="M42 26l-3 5h6z" fill="#5ad1a5"/></svg>`,
  `<svg viewBox="0 0 54 54"><rect x="0" y="0" width="54" height="54" rx="14" fill="#fff0f0"/><circle cx="20" cy="27" r="12" fill="none" stroke="#ff5a6e" stroke-width="2.5"/><circle cx="36" cy="27" r="12" fill="none" stroke="#ff5a6e" stroke-width="2.5"/><circle cx="20" cy="27" r="3" fill="#ff5a6e"/><circle cx="36" cy="27" r="3" fill="#ff5a6e"/><rect x="21" y="38" width="14" height="8" rx="4" fill="#12294a"/><text x="28" y="44.5" font-size="6.5" font-weight="900" fill="#fff" text-anchor="middle" font-family="Nunito, sans-serif">60 m</text></svg>`,
  `<svg viewBox="0 0 54 54"><rect x="0" y="0" width="54" height="54" rx="14" fill="#f4eefe"/><path d="M10 34h34c2 0 3 1 3 2s-1 2-3 2H10c-1 0-2-1-2-2s1-2 2-2z" fill="#7c5cff"/><path d="M24 34l-10-12h5l14 12z" fill="#b7a5ff"/><path d="M24 38l-10 12h5l14-12z" fill="#b7a5ff"/><circle cx="41" cy="16" r="7" fill="none" stroke="#5ad1a5" stroke-width="2.5"/><text x="41" y="19" font-size="8" font-weight="900" fill="#5ad1a5" text-anchor="middle" font-family="Nunito, sans-serif">H</text></svg>`,
];

export class UI {
  root: HTMLElement;
  private current: HTMLElement | null = null;
  private onDestroy: (() => void) | null = null;

  constructor(private actions: UIActions) {
    this.root = document.getElementById('ui')!;
  }

  clear(): void {
    if (this.onDestroy) { this.onDestroy(); this.onDestroy = null; }
    this.root.innerHTML = '';
    this.current = null;
  }

  private mount(el: HTMLElement, destroy?: () => void): void {
    this.clear();
    this.root.appendChild(el);
    this.current = el;
    this.onDestroy = destroy ?? null;
    el.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', () => { sfx.unlock(); sfx.tap(); }));
  }

  get isOpen(): boolean { return !!this.current; }

  private screen(cls = 'dim'): HTMLDivElement {
    const s = document.createElement('div'); s.className = `screen ${cls}`; return s;
  }

  title(): void {
    const s = this.screen('');
    s.innerHTML = `
      <div class="logo">${svgLogo}<div class="word">Wolkenhaven</div><div class="tag">${lang() === 'nl' ? 'Luchtverkeersleider van de archipel' : 'Air traffic controller of the archipelago'}</div></div>
      <div class="card" style="text-align:center">
        <div class="stack" style="margin-top:0">
          <button class="btn" data-a="play">${t('play')}</button>
          <button class="btn secondary" data-a="settings">${t('settings')}</button>
        </div>
      </div>`;
    s.querySelector('[data-a=play]')!.addEventListener('click', () => this.actions.toLevels());
    s.querySelector('[data-a=settings]')!.addEventListener('click', () => this.actions.openSettings());
    this.mount(s);
  }

  levels(): void {
    const s = this.screen('dim top');
    const bar = document.createElement('div'); bar.className = 'topbar';
    bar.innerHTML = `<button class="iconbtn" data-a="back">${svgBack}</button><h2>${t('levels')}</h2><button class="iconbtn" data-a="settings">${svgGear}</button>`;
    bar.querySelector('[data-a=back]')!.addEventListener('click', () => this.actions.toTitle());
    bar.querySelector('[data-a=settings]')!.addEventListener('click', () => this.actions.openSettings());
    const grid = document.createElement('div'); grid.className = 'grid'; grid.style.maxWidth = '560px';
    LEVELS.forEach((lv, i) => {
      const prog = levelProgress(lv.id);
      const unlocked = i === 0 || levelProgress(LEVELS[i - 1].id).completed;
      const b = document.createElement('button'); b.className = `level${unlocked ? '' : ' locked'}`;
      const c = document.createElement('canvas'); c.width = 300; c.height = 384;
      b.appendChild(c);
      this.actions.makeThumb(lv.id, c);
      const meta = document.createElement('div'); meta.className = 'meta';
      meta.innerHTML = `<div class="name">${lv.name}</div><div class="info"><span>${lang() === 'nl' ? lv.subtitle : lv.subtitleEn}</span></div><div class="info"><span>${t('goal')} ${lv.goal}</span><span>${t('best')} ${prog.best}</span></div>`;
      b.appendChild(meta);
      const stars = document.createElement('div'); stars.className = 'stars';
      stars.innerHTML = [1, 2, 3].map(k => svgStar(prog.stars >= k)).join('');
      b.appendChild(stars);
      const num = document.createElement('div'); num.className = 'num'; num.textContent = String(i + 1); b.appendChild(num);
      if (!unlocked) { const lock = document.createElement('div'); lock.className = 'lock'; lock.innerHTML = svgLock; b.appendChild(lock); }
      b.addEventListener('click', () => { if (unlocked) this.actions.startLevel(lv.id); else this.toast(t('lockedHint')); });
      grid.appendChild(b);
    });
    s.append(bar, grid);
    this.mount(s);
  }

  private toast(text: string): void {
    const el = document.createElement('div');
    el.className = 'card'; el.style.cssText = 'position:absolute;left:50%;bottom:calc(var(--sab) + 24px);transform:translateX(-50%);padding:12px 18px;width:auto;max-width:90%;font-weight:800;pointer-events:none;';
    el.textContent = text;
    this.root.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  tutorial(): void {
    const s = this.screen();
    s.innerHTML = `<div class="card"><h2>${t('tutorialTitle')}</h2>
      <div class="tut">
        <div class="step">${tutSvg[0]}<p>${t('tutorial1')}</p></div>
        <div class="step">${tutSvg[1]}<p>${t('tutorial2')}</p></div>
        <div class="step">${tutSvg[2]}<p>${t('tutorial3')}</p></div>
      </div>
      <div class="stack"><button class="btn mint" data-a="ok">${t('gotIt')}</button></div></div>`;
    s.querySelector('[data-a=ok]')!.addEventListener('click', () => this.actions.tutorialDone());
    this.mount(s);
  }

  pause(levelName: string): void {
    const s = this.screen();
    s.innerHTML = `<div class="card" style="text-align:center"><div class="sub">${levelName}</div><h1>${t('pause')}</h1>
      <div class="stack">
        <button class="btn mint" data-a="resume">${t('resume')}</button>
        <button class="btn secondary" data-a="retry">${t('retry')}</button>
        <button class="btn secondary" data-a="levels">${t('levels')}</button>
      </div></div>`;
    s.querySelector('[data-a=resume]')!.addEventListener('click', () => this.actions.resume());
    s.querySelector('[data-a=retry]')!.addEventListener('click', () => this.actions.retry());
    s.querySelector('[data-a=levels]')!.addEventListener('click', () => this.actions.toLevels());
    this.mount(s);
  }

  complete(opts: { levelName: string; landed: number; stars: number; newBest: boolean; hasNext: boolean; goal: number }): void {
    const s = this.screen();
    s.innerHTML = `<div class="card result"><div class="sub">${opts.levelName}</div><h1>${t('levelComplete')}</h1>
      <div class="stars">${[1, 2, 3].map(k => svgStar(opts.stars >= k, 40)).join('')}</div>
      <div class="big">${opts.landed}</div><p>${t('landed').toLowerCase()} · ${t('goal').toLowerCase()} ${opts.goal}</p>
      ${opts.newBest ? `<span class="pill gold">${t('newBest')}</span>` : ''}
      <div class="stack">
        <button class="btn" data-a="continue">${t('continue')} · ${t('endless').toLowerCase()}</button>
        ${opts.hasNext ? `<button class="btn mint" data-a="next">${t('next')}</button>` : ''}
        <button class="btn secondary" data-a="levels">${t('levels')}</button>
      </div></div>`;
    s.querySelector('[data-a=continue]')!.addEventListener('click', () => this.actions.continueEndless());
    s.querySelector('[data-a=next]')?.addEventListener('click', () => this.actions.next());
    s.querySelector('[data-a=levels]')!.addEventListener('click', () => this.actions.toLevels());
    this.mount(s);
  }

  failed(report: Report, replayEl: HTMLElement, destroyReplay: () => void, landed: number): void {
    const s = this.screen('dim top');
    const card = document.createElement('div'); card.className = 'card wide report';
    const fmt = (sec: number): string => `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
    card.innerHTML = `
      <div class="sub">${t('missionFailed')} · ${landed} ${t('landed').toLowerCase()}</div>
      <h2>${report.title}</h2>
      <div class="headline">${report.headline}</div>
      <div class="tabs"><button class="on" data-tab="replay">${t('replay')}</button><button data-tab="why">${t('whatWentWrong')}</button><button data-tab="timeline">${t('timeline')}</button></div>
      <div data-pane="replay"></div>
      <div data-pane="why" class="hidden">
        ${report.causes.map(c => `<div class="cause">${c}</div>`).join('')}
        <div class="sub" style="margin-top:12px">${t('tips')}</div>
        <ul>${report.tips.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
      <div data-pane="timeline" class="hidden"><div class="timeline">${report.timeline.map(e => `<div class="ev${e.bad ? ' bad' : ''}"><span class="t">${fmt(e.t)}</span><span>${e.text}</span></div>`).join('') || '<p>-</p>'}</div></div>
      <div class="row"><button class="btn" data-a="retry">${t('retry')}</button><button class="btn secondary" data-a="levels">${t('levels')}</button></div>`;
    card.querySelector('[data-pane=replay]')!.appendChild(replayEl);
    const why = card.querySelector('[data-pane=why]') as HTMLElement;
    const short = document.createElement('div');
    short.className = 'cause'; short.innerHTML = report.causes[0] ?? '';
    card.querySelector('[data-pane=replay]')!.appendChild(short);
    card.querySelectorAll('[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      card.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b === btn));
      const tab = (btn as HTMLElement).dataset.tab;
      card.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('hidden', (p as HTMLElement).dataset.pane !== tab));
    }));
    void why;
    card.querySelector('[data-a=retry]')!.addEventListener('click', () => this.actions.retry());
    card.querySelector('[data-a=levels]')!.addEventListener('click', () => this.actions.toLevels());
    s.appendChild(card);
    this.mount(s, destroyReplay);
  }

  settings(): void {
    const s = this.screen();
    const card = document.createElement('div'); card.className = 'card';
    const render = (): void => {
      card.innerHTML = `<h2>${t('settings')}</h2>
        <div class="toggle"><span>${t('sound')}</span><button class="switch ${save.sound ? 'on' : ''}" data-k="sound" aria-label="${t('sound')}"></button></div>
        <div class="toggle"><span>${t('haptics')}</span><button class="switch ${save.haptics ? 'on' : ''}" data-k="haptics" aria-label="${t('haptics')}"></button></div>
        <div class="toggle"><span>${t('language')}</span><div class="seg">
          <button data-l="auto" class="${save.lang === 'auto' ? 'on' : ''}">Auto</button>
          <button data-l="nl" class="${save.lang === 'nl' ? 'on' : ''}">NL</button>
          <button data-l="en" class="${save.lang === 'en' ? 'on' : ''}">EN</button></div></div>
        <div class="sub" style="margin-top:14px">${t('planesOf')}</div>
        <div class="planelist">${Object.values(PLANE_TYPES).map(p => `<span>${p.name}</span>`).join('')}</div>
        <div class="stack"><button class="btn secondary" data-a="back">${t('back')}</button></div>`;
      card.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
        const k = (b as HTMLElement).dataset.k as 'sound' | 'haptics';
        save[k] = !save[k]; persist(); render();
      }));
      card.querySelectorAll('[data-l]').forEach(b => b.addEventListener('click', () => {
        save.lang = (b as HTMLElement).dataset.l as 'auto' | 'nl' | 'en'; persist(); render();
      }));
      card.querySelector('[data-a=back]')!.addEventListener('click', () => this.actions.closeSettings());
      card.querySelectorAll('button').forEach(b => b.addEventListener('pointerdown', () => sfx.tap()));
    };
    render();
    s.appendChild(card);
    this.mount(s);
  }
}
