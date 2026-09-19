import { save, persist } from '../util/storage';
import { lang } from '../i18n';

/**
 * Ads abstraction.
 * - Native (Capacitor): AdMob via @capacitor-community/admob, loaded lazily. Uses Google's public TEST ids
 *   until real ids are filled in below.
 * - Web / fallback: a clearly labelled placeholder overlay so the flow can be tested in the browser.
 */

const ADMOB_TEST = {
  interstitialAndroid: 'ca-app-pub-3940256099942544/1033173712',
  interstitialIos: 'ca-app-pub-3940256099942544/4411468910',
  rewardedAndroid: 'ca-app-pub-3940256099942544/5224354917',
  rewardedIos: 'ca-app-pub-3940256099942544/1712485313',
};
// TODO: replace with your own AdMob unit ids before releasing
const ADMOB = { ...ADMOB_TEST, testing: true };

const INTERSTITIAL_EVERY = 3;        // level ends between interstitials
const INTERSTITIAL_MIN_GAP_MS = 150000;
const FIRST_INTERSTITIAL_AFTER = 3;  // never before the 3rd level played

type Platform = 'web' | 'android' | 'ios';

function platform(): Platform {
  const cap = (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor;
  const p = cap?.getPlatform?.();
  return p === 'android' || p === 'ios' ? p : 'web';
}

// Lazy AdMob loader. The package is optional: when it is not installed the dynamic import fails and we fall back.
type AdMobModule = {
  AdMob: {
    initialize(opts: Record<string, unknown>): Promise<void>;
    prepareInterstitial(opts: Record<string, unknown>): Promise<unknown>;
    showInterstitial(): Promise<unknown>;
    prepareRewardVideoAd(opts: Record<string, unknown>): Promise<unknown>;
    showRewardVideoAd(): Promise<{ type?: string; amount?: number } | unknown>;
  };
};
let admob: AdMobModule['AdMob'] | null = null;
let admobInit: Promise<void> | null = null;

async function loadAdMob(): Promise<AdMobModule['AdMob'] | null> {
  if (platform() === 'web') return null;
  if (admob) return admob;
  if (!admobInit) {
    admobInit = (async () => {
      try {
        const modName = '@capacitor-community/admob';
        const mod = (await import(/* @vite-ignore */ modName)) as AdMobModule;
        await mod.AdMob.initialize({ initializeForTesting: ADMOB.testing });
        admob = mod.AdMob;
      } catch (e) { console.warn('AdMob unavailable', e); admob = null; }
    })();
  }
  await admobInit;
  return admob;
}

export function shouldShowInterstitial(): boolean {
  if (save.levelsPlayed < FIRST_INTERSTITIAL_AFTER) return false;
  if (save.levelsPlayed % INTERSTITIAL_EVERY !== 0) return false;
  if (Date.now() - save.lastAdAt < INTERSTITIAL_MIN_GAP_MS) return false;
  return true;
}

export async function showInterstitial(): Promise<void> {
  save.lastAdAt = Date.now(); persist();
  const a = await loadAdMob();
  if (a) {
    try {
      await a.prepareInterstitial({ adId: platform() === 'ios' ? ADMOB.interstitialIos : ADMOB.interstitialAndroid, isTesting: ADMOB.testing });
      await a.showInterstitial();
      return;
    } catch (e) { console.warn('interstitial failed', e); }
  }
  await placeholderAd('interstitial');
}

/** Resolves true when the user earned the reward. */
export async function showRewarded(): Promise<boolean> {
  const a = await loadAdMob();
  if (a) {
    try {
      await a.prepareRewardVideoAd({ adId: platform() === 'ios' ? ADMOB.rewardedIos : ADMOB.rewardedAndroid, isTesting: ADMOB.testing });
      const r = (await a.showRewardVideoAd()) as { type?: string } | undefined;
      return !!r;
    } catch (e) { console.warn('rewarded failed', e); }
  }
  return placeholderAd('rewarded');
}

/** Browser fallback: a labelled placeholder with a countdown. */
function placeholderAd(kind: 'interstitial' | 'rewarded'): Promise<boolean> {
  return new Promise(resolve => {
    const nl = lang() === 'nl';
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:50;background:#0b1b3f;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;font-family:Nunito,system-ui,sans-serif;pointer-events:auto;';
    const secs = kind === 'rewarded' ? 5 : 3;
    el.innerHTML = `
      <div style="font-size:12px;letter-spacing:.2em;opacity:.6;font-weight:800">${nl ? 'ADVERTENTIE' : 'ADVERTISEMENT'}</div>
      <div style="width:min(320px,80vw);aspect-ratio:1;border-radius:24px;background:linear-gradient(135deg,#ff7a59,#7c5cff);display:grid;place-items:center;font-weight:900;font-size:22px;text-align:center;padding:20px;box-shadow:0 30px 60px rgba(0,0,0,.4)">
        ${nl ? 'Hier komt straks een echte advertentie<br><span style="font-size:14px;font-weight:700;opacity:.85">(AdMob, alleen in de app)</span>' : 'A real ad will appear here<br><span style="font-size:14px;font-weight:700;opacity:.85">(AdMob, app only)</span>'}
      </div>
      <div data-cd style="font-weight:800;opacity:.8">${secs}</div>
      <button data-close class="btn secondary" style="width:auto;padding:12px 28px;opacity:.3;pointer-events:none">${kind === 'rewarded' ? (nl ? 'Beloning ophalen' : 'Collect reward') : (nl ? 'Sluiten' : 'Close')}</button>`;
    document.getElementById('ui')!.appendChild(el);
    const cd = el.querySelector('[data-cd]') as HTMLElement;
    const btn = el.querySelector('[data-close]') as HTMLButtonElement;
    let left = secs;
    const iv = setInterval(() => {
      left--; cd.textContent = String(Math.max(0, left));
      if (left <= 0) { clearInterval(iv); cd.textContent = ''; btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
    }, 1000);
    btn.addEventListener('click', () => { el.remove(); resolve(true); });
  });
}
