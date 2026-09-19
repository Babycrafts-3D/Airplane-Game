import { save } from './storage';

/** Tiny synthesized sound set: no audio files needed, works offline in Capacitor. */
class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  unlock(): void {
    if (this.ctx) { if (this.ctx.state === 'suspended') void this.ctx.resume(); return; }
    try {
      const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext || w.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }

  private get ready(): boolean { return !!this.ctx && !!this.master && save.sound; }

  private tone(freq: number, t0: number, dur: number, type: OscillatorType, gain: number, slideTo?: number): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  landed(): void {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(659, t, 0.35, 'sine', 0.25);
    this.tone(988, t + 0.12, 0.45, 'sine', 0.22);
    this.tone(1319, t + 0.24, 0.6, 'sine', 0.18);
  }
  pathStart(): void {
    if (!this.ready || !this.ctx) return;
    this.tone(520, this.ctx.currentTime, 0.08, 'triangle', 0.08, 700);
  }
  pathLock(): void {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(880, t, 0.12, 'triangle', 0.12);
    this.tone(1175, t + 0.08, 0.18, 'triangle', 0.12);
  }
  warn(): void {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.tone(440, t, 0.12, 'square', 0.06);
    this.tone(440, t + 0.18, 0.12, 'square', 0.06);
  }
  goAround(): void {
    if (!this.ready || !this.ctx) return;
    this.tone(300, this.ctx.currentTime, 0.4, 'sawtooth', 0.05, 520);
  }
  crash(): void {
    if (!this.ready || !this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.tone(120, t, 0.8, 'sawtooth', 0.2, 40);
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.6), this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0.35;
    src.connect(g).connect(this.master); src.start(t);
  }
  tap(): void {
    if (!this.ready || !this.ctx) return;
    this.tone(740, this.ctx.currentTime, 0.06, 'sine', 0.08);
  }
  fanfare(): void {
    if (!this.ready || !this.ctx) return;
    const t = this.ctx.currentTime;
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, 0.5, 'sine', 0.2));
  }
}

export const sfx = new Sfx();

export function haptic(kind: 'light' | 'medium' | 'heavy' = 'light'): void {
  if (!save.haptics) return;
  try {
    const pattern: number | number[] = kind === 'light' ? 10 : kind === 'medium' ? 25 : [30, 40, 60];
    if (typeof navigator.vibrate === 'function') navigator.vibrate(pattern);
  } catch { /* unsupported */ }
}
