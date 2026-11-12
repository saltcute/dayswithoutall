// Every sound here is synthesized with the Web Audio API — no audio files.
// All public methods are safe to call before audio is unlocked (they no-op).

type OscType = OscillatorType;

interface ToneOpts {
  type?: OscType;
  gain?: number;
  attack?: number;
  release?: number;
  slideTo?: number;
  delay?: number;
  vibrato?: number; // Hz depth
  vibratoRate?: number;
  filter?: number; // lowpass cutoff
  pan?: number;
}

interface NoiseOpts {
  type?: BiquadFilterType;
  freq?: number;
  q?: number;
  gain?: number;
  attack?: number;
  release?: number;
  slideFreqTo?: number;
  delay?: number;
  pan?: number;
}

export type AmbientName =
  | "wind" | "crowd" | "fire" | "hum" | "rain" | "crickets" | "static" | "desert"
  | "droneSad" | "droneHoly" | "droneTense" | "droneEerie" | "arcadeDead" | "birds" | "chopper";

export class Sfx {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private noiseBuf!: AudioBuffer;
  private ambients = new Map<AmbientName, { stop: () => void }>();
  private wantedAmbients = new Map<AmbientName, number>();
  muted = false;

  /** Must be called from a user gesture. */
  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = this.ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 2;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    for (const [name, vol] of this.wantedAmbients) this.startAmbient(name, vol);
  }

  get ready() {
    return !!this.ctx && this.ctx.state !== "closed";
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.05);
  }

  dispose() {
    for (const a of this.ambients.values()) a.stop();
    this.ambients.clear();
    void this.ctx?.close();
    this.ctx = null;
  }

  // ---------- primitives ----------

  private out(pan = 0): AudioNode {
    const c = this.ctx!;
    if (!pan || !c.createStereoPanner) return this.master;
    const p = c.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.master);
    return p;
  }

  tone(freq: number, dur: number, o: ToneOpts = {}) {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime + (o.delay ?? 0);
    const osc = c.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.slideTo), t0 + dur);
    if (o.vibrato) {
      const lfo = c.createOscillator();
      const lg = c.createGain();
      lfo.frequency.value = o.vibratoRate ?? 6;
      lg.gain.value = o.vibrato;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.1);
    }
    const g = c.createGain();
    const peak = o.gain ?? 0.2;
    const a = o.attack ?? 0.005;
    const r = o.release ?? Math.min(0.3, dur * 0.5);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.setValueAtTime(peak, t0 + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node: AudioNode = osc;
    if (o.filter) {
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = o.filter;
      node.connect(f);
      node = f;
    }
    node.connect(g).connect(this.out(o.pan));
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur: number, o: NoiseOpts = {}) {
    const c = this.ctx;
    if (!c) return;
    const t0 = c.currentTime + (o.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type ?? "lowpass";
    f.frequency.setValueAtTime(o.freq ?? 1000, t0);
    if (o.slideFreqTo) f.frequency.exponentialRampToValueAtTime(o.slideFreqTo, t0 + dur);
    f.Q.value = o.q ?? 1;
    const g = c.createGain();
    const peak = o.gain ?? 0.3;
    const a = o.attack ?? 0.005;
    const r = o.release ?? dur * 0.6;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.setValueAtTime(peak, t0 + Math.max(a, dur - r));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.out(o.pan));
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  /** Play a sequence of [freq, startOffset, dur?] notes. */
  notes(seq: [number, number, number?][], o: ToneOpts = {}) {
    for (const [f, at, d] of seq) this.tone(f, d ?? 0.2, { ...o, delay: (o.delay ?? 0) + at });
  }

  // ---------- effects ----------

  coin() {
    this.tone(988, 0.08, { type: "square", gain: 0.12 });
    this.tone(1319, 0.35, { type: "square", gain: 0.12, delay: 0.08 });
  }
  coinDrop(n = 1) {
    for (let i = 0; i < n; i++) {
      const d = i * 0.07 + Math.random() * 0.05;
      this.tone(2400 + Math.random() * 1600, 0.12, { type: "triangle", gain: 0.08, delay: d });
      this.tone(3600 + Math.random() * 1200, 0.08, { type: "sine", gain: 0.05, delay: d + 0.03 });
    }
  }
  errorBeep(times = 2) {
    for (let i = 0; i < times; i++) this.tone(220, 0.22, { type: "square", gain: 0.1, delay: i * 0.3, filter: 1800 });
  }
  beep(freq = 880, dur = 0.1) {
    this.tone(freq, dur, { type: "square", gain: 0.08, filter: 3000 });
  }
  blip() {
    this.tone(1200, 0.04, { type: "sine", gain: 0.03 });
  }
  tap() {
    this.tone(1800, 0.05, { type: "triangle", gain: 0.06 });
    this.noise(0.04, { type: "highpass", freq: 3000, gain: 0.05 });
  }
  punch(pan = 0) {
    this.noise(0.18, { type: "lowpass", freq: 900, slideFreqTo: 120, gain: 0.7, pan });
    this.tone(110, 0.15, { type: "sine", gain: 0.5, slideTo: 40, pan });
  }
  thud() {
    this.tone(70, 0.35, { type: "sine", gain: 0.6, slideTo: 30 });
    this.noise(0.2, { freq: 300, gain: 0.3 });
  }
  whoosh(dur = 0.5) {
    this.noise(dur, { type: "bandpass", freq: 400, slideFreqTo: 3000, q: 2, gain: 0.25, attack: dur * 0.4 });
  }
  thunder() {
    this.noise(0.25, { type: "highpass", freq: 1500, gain: 0.5 });
    this.noise(3.5, { type: "lowpass", freq: 600, slideFreqTo: 60, gain: 0.9, attack: 0.05, release: 3 });
    this.tone(45, 2.5, { type: "sawtooth", gain: 0.12, filter: 120 });
  }
  boom() {
    this.noise(2.2, { type: "lowpass", freq: 400, slideFreqTo: 40, gain: 1, release: 2 });
    this.tone(55, 1.4, { type: "sine", gain: 0.8, slideTo: 25 });
  }
  stomp() {
    this.tone(48, 0.7, { type: "sine", gain: 0.9, slideTo: 22 });
    this.noise(0.6, { type: "lowpass", freq: 250, gain: 0.6 });
  }
  heartbeat() {
    this.tone(60, 0.15, { type: "sine", gain: 0.7, slideTo: 40 });
    this.tone(55, 0.18, { type: "sine", gain: 0.5, slideTo: 38, delay: 0.22 });
  }
  knock(n = 3) {
    for (let i = 0; i < n; i++) {
      this.tone(180, 0.08, { type: "triangle", gain: 0.5, slideTo: 90, delay: i * 0.28 });
      this.noise(0.06, { type: "bandpass", freq: 900, gain: 0.3, delay: i * 0.28 });
    }
  }
  footstep(pan = 0) {
    this.noise(0.08, { type: "lowpass", freq: 500, gain: 0.2, pan });
  }
  gasp() {
    this.noise(0.5, { type: "bandpass", freq: 1500, slideFreqTo: 2500, q: 3, gain: 0.3, attack: 0.05 });
  }
  crowdGasp() {
    for (let i = 0; i < 6; i++)
      this.noise(0.7, { type: "bandpass", freq: 1000 + Math.random() * 1500, q: 4, gain: 0.12, attack: 0.08, delay: Math.random() * 0.1, pan: Math.random() - 0.5 });
  }
  cheer(dur = 2.5) {
    for (let i = 0; i < 8; i++)
      this.noise(dur, { type: "bandpass", freq: 700 + Math.random() * 2000, q: 2, gain: 0.08, attack: 0.3, delay: Math.random() * 0.2, pan: Math.random() * 1.6 - 0.8 });
    for (let i = 0; i < 5; i++)
      this.tone(300 + Math.random() * 300, dur * 0.8, { type: "sawtooth", gain: 0.02, vibrato: 30, vibratoRate: 7, filter: 1400, delay: Math.random() * 0.3 });
  }
  scream() {
    for (let i = 0; i < 4; i++)
      this.tone(500 + Math.random() * 400, 1.2, { type: "sawtooth", gain: 0.04, vibrato: 40, vibratoRate: 9, filter: 2500, slideTo: 300, delay: Math.random() * 0.2 });
    this.noise(1.2, { type: "bandpass", freq: 2200, q: 2, gain: 0.15 });
  }
  /** Mournful "raaatiiing" vocal-ish groan. */
  moan(pitch = 1, pan = 0) {
    const c = this.ctx;
    if (!c) return;
    this.tone(140 * pitch, 1.6, { type: "sawtooth", gain: 0.07, slideTo: 95 * pitch, vibrato: 4, vibratoRate: 5, filter: 700, attack: 0.3, pan });
    this.tone(280 * pitch, 1.6, { type: "triangle", gain: 0.03, slideTo: 190 * pitch, filter: 900, attack: 0.3, pan });
  }
  /** Choir-like chant chord. */
  chant(root = 110, dur = 2.5) {
    const ratios = [1, 1.5, 2, 2.4];
    ratios.forEach((r, i) => {
      this.tone(root * r, dur, { type: "sawtooth", gain: 0.035, attack: 0.5, release: 0.8, vibrato: 2, vibratoRate: 4 + i * 0.3, filter: 900 });
    });
  }
  bell(freq = 660, dur = 3) {
    [1, 2.76, 5.4].forEach((r, i) => this.tone(freq * r, dur / (i + 1), { type: "sine", gain: 0.12 / (i + 1), attack: 0.002, release: dur / (i + 1) }));
  }
  gong() {
    [1, 1.48, 2.1, 2.9].forEach((r, i) => this.tone(90 * r, 4, { type: "sine", gain: 0.15 / (i + 1), vibrato: 2, vibratoRate: 3, release: 3.5 }));
    this.noise(1.5, { freq: 800, gain: 0.15 });
  }
  dramaticChord() {
    [130.8, 155.6, 196, 261.6].forEach((f) => this.tone(f, 2.8, { type: "sawtooth", gain: 0.06, filter: 1500, release: 2 }));
    this.tone(65.4, 2.8, { type: "square", gain: 0.06, filter: 400, release: 2 });
    this.noise(0.5, { freq: 300, gain: 0.3 });
  }
  dunDunDun() {
    this.notes([[196, 0, 0.35], [185, 0.45, 0.35], [174.6, 0.9, 1.4]], { type: "sawtooth", gain: 0.1, filter: 1100 });
    this.notes([[98, 0, 0.35], [92.5, 0.45, 0.35], [87.3, 0.9, 1.4]], { type: "square", gain: 0.06, filter: 500 });
  }
  sadTrombone() {
    this.notes([[293.7, 0, 0.45], [277.2, 0.5, 0.45], [261.6, 1.0, 0.45]], { type: "sawtooth", gain: 0.1, filter: 1200, vibrato: 3 });
    this.tone(246.9, 1.6, { type: "sawtooth", gain: 0.1, filter: 1200, vibrato: 8, vibratoRate: 6, delay: 1.5 });
  }
  fanfare() {
    const n: [number, number, number][] = [[523, 0, 0.15], [523, 0.17, 0.15], [523, 0.34, 0.15], [659, 0.51, 0.5], [784, 1.05, 0.25], [659, 1.32, 0.15], [784, 1.5, 0.9]];
    this.notes(n, { type: "square", gain: 0.07, filter: 3500 });
    this.notes(n.map(([f, a, d]) => [f / 2, a, d]), { type: "sawtooth", gain: 0.04, filter: 1500 });
  }
  /** A generic "system booting" jingle. */
  bootJingle() {
    this.notes([[392, 0, 0.12], [523, 0.12, 0.12], [659, 0.24, 0.12], [784, 0.36, 0.12], [1047, 0.48, 0.6]], { type: "triangle", gain: 0.12 });
    this.tone(1568, 0.8, { type: "sine", gain: 0.05, delay: 0.5 });
  }
  powerDown() {
    this.tone(800, 1.2, { type: "sawtooth", gain: 0.1, slideTo: 40, filter: 2000 });
  }
  glitch(dur = 0.6) {
    const c = this.ctx;
    if (!c) return;
    for (let t = 0; t < dur; t += 0.04) {
      if (Math.random() < 0.6) this.tone(100 + Math.random() * 2000, 0.03, { type: "square", gain: 0.06, delay: t });
    }
  }
  ding() {
    this.tone(1760, 0.6, { type: "sine", gain: 0.15 });
    this.tone(2637, 0.4, { type: "sine", gain: 0.06 });
  }
  buzzer() {
    this.tone(110, 0.7, { type: "sawtooth", gain: 0.15, filter: 900 });
    this.tone(116, 0.7, { type: "square", gain: 0.08, filter: 900 });
  }
  cardSwipe() {
    this.noise(0.15, { type: "bandpass", freq: 3000, q: 3, gain: 0.15 });
    this.tone(1046, 0.1, { type: "sine", gain: 0.08, delay: 0.15 });
  }
  thunk() {
    this.tone(150, 0.12, { type: "triangle", gain: 0.4, slideTo: 60 });
    this.noise(0.08, { freq: 1200, gain: 0.2 });
  }
  hammer() {
    this.tone(800, 0.06, { type: "square", gain: 0.12, filter: 2500 });
    this.noise(0.1, { type: "bandpass", freq: 1800, q: 2, gain: 0.25 });
  }
  crumple() {
    for (let i = 0; i < 10; i++) this.noise(0.06, { type: "bandpass", freq: 600 + Math.random() * 1500, q: 2, gain: 0.25, delay: i * 0.05 + Math.random() * 0.04 });
    this.thud();
  }
  ufoBeam(dur = 3) {
    this.tone(220, dur, { type: "sine", gain: 0.12, vibrato: 60, vibratoRate: 7, slideTo: 880 });
    this.tone(330, dur, { type: "triangle", gain: 0.05, vibrato: 30, vibratoRate: 11 });
  }
  roar() {
    this.tone(160, 2, { type: "sawtooth", gain: 0.2, slideTo: 60, vibrato: 20, vibratoRate: 18, filter: 1100 });
    this.noise(2, { type: "bandpass", freq: 500, q: 1, gain: 0.5, slideFreqTo: 200 });
  }
  radioVoice(dur = 2) {
    // Muffled syllable stream
    for (let t = 0; t < dur; t += 0.11 + Math.random() * 0.08) {
      this.tone(170 + Math.random() * 80, 0.09, { type: "sawtooth", gain: 0.05, filter: 1200, delay: t });
    }
    this.noise(dur, { type: "bandpass", freq: 1800, q: 1, gain: 0.05 });
  }
  /** Generic talking-mumble for characters. */
  mumble(dur = 1.2, pitch = 1, pan = 0) {
    for (let t = 0; t < dur; t += 0.09 + Math.random() * 0.07) {
      this.tone((180 + Math.random() * 120) * pitch, 0.07, { type: "triangle", gain: 0.06, delay: t, pan });
    }
  }
  shout(pitch = 1) {
    this.tone(330 * pitch, 0.5, { type: "sawtooth", gain: 0.08, slideTo: 260 * pitch, vibrato: 10, filter: 1800 });
    this.tone(495 * pitch, 0.5, { type: "square", gain: 0.03, slideTo: 380 * pitch, filter: 1800 });
  }
  airHorn() {
    [466, 470, 698].forEach((f) => this.tone(f, 0.9, { type: "sawtooth", gain: 0.06, filter: 2500 }));
  }
  splash() {
    this.noise(0.6, { type: "highpass", freq: 900, slideFreqTo: 3000, gain: 0.3 });
  }
  pop() {
    this.tone(600, 0.08, { type: "sine", gain: 0.2, slideTo: 1200 });
  }
  shimmer() {
    for (let i = 0; i < 8; i++) this.tone(1500 + i * 220, 0.5, { type: "sine", gain: 0.03, delay: i * 0.06 });
  }
  tick() {
    this.tone(2200, 0.02, { type: "square", gain: 0.05 });
  }
  cricket(pan = 0) {
    for (let i = 0; i < 3; i++) this.tone(4200, 0.04, { type: "sine", gain: 0.04, delay: i * 0.07, pan });
  }

  // ---------- ambients (looping beds) ----------

  /** Request a looping ambient bed. Starts when audio unlocks. */
  ambient(name: AmbientName, vol = 1) {
    this.wantedAmbients.set(name, vol);
    if (this.ctx) this.startAmbient(name, vol);
  }

  stopAmbient(name: AmbientName) {
    this.wantedAmbients.delete(name);
    this.ambients.get(name)?.stop();
    this.ambients.delete(name);
  }

  private startAmbient(name: AmbientName, vol: number) {
    if (this.ambients.has(name)) return;
    const c = this.ctx!;
    const g = c.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(vol, c.currentTime + 1.5);
    g.connect(this.master);
    const nodes: (AudioScheduledSourceNode)[] = [];
    const noiseSrc = () => {
      const s = c.createBufferSource();
      s.buffer = this.noiseBuf;
      s.loop = true;
      nodes.push(s);
      return s;
    };
    const filt = (type: BiquadFilterType, freq: number, q = 1) => {
      const f = c.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      return f;
    };
    const lfo = (rate: number, depth: number, target: AudioParam) => {
      const o = c.createOscillator();
      const og = c.createGain();
      o.frequency.value = rate;
      og.gain.value = depth;
      o.connect(og).connect(target);
      nodes.push(o);
    };
    const osc = (type: OscType, f: number, gain: number, dest: AudioNode, detune = 0) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = detune;
      const og = c.createGain();
      og.gain.value = gain;
      o.connect(og).connect(dest);
      nodes.push(o);
      return og;
    };
    let timer: number | undefined;

    switch (name) {
      case "wind":
      case "desert": {
        const f = filt("bandpass", name === "wind" ? 500 : 350, 0.8);
        const ng = c.createGain();
        ng.gain.value = name === "wind" ? 0.25 : 0.15;
        noiseSrc().connect(f).connect(ng).connect(g);
        lfo(0.13, 250, f.frequency);
        lfo(0.21, 0.1, ng.gain);
        break;
      }
      case "rain": {
        const f = filt("highpass", 1200);
        const ng = c.createGain();
        ng.gain.value = 0.12;
        noiseSrc().connect(f).connect(ng).connect(g);
        break;
      }
      case "static": {
        const f = filt("bandpass", 2500, 0.6);
        const ng = c.createGain();
        ng.gain.value = 0.06;
        noiseSrc().connect(f).connect(ng).connect(g);
        lfo(7, 0.03, ng.gain);
        break;
      }
      case "crowd": {
        const f = filt("bandpass", 600, 1.2);
        const ng = c.createGain();
        ng.gain.value = 0.12;
        noiseSrc().connect(f).connect(ng).connect(g);
        lfo(0.7, 150, f.frequency);
        lfo(0.33, 0.04, ng.gain);
        timer = window.setInterval(() => !this.muted && this.mumble(0.6 + Math.random(), 0.8 + Math.random() * 0.5, Math.random() * 1.4 - 0.7), 900);
        break;
      }
      case "fire": {
        const f = filt("lowpass", 400);
        const ng = c.createGain();
        ng.gain.value = 0.2;
        noiseSrc().connect(f).connect(ng).connect(g);
        timer = window.setInterval(() => {
          for (let i = 0; i < 3; i++) if (Math.random() < 0.6) this.noise(0.03, { type: "highpass", freq: 2000 + Math.random() * 3000, gain: 0.08 * vol, delay: Math.random() * 0.3 });
        }, 300);
        break;
      }
      case "hum": {
        osc("sawtooth", 50, 0.03, filt("lowpass", 300).connect(g) as AudioNode);
        osc("sine", 100, 0.03, g);
        break;
      }
      case "arcadeDead": {
        // fluorescent buzz + distant fan noise
        const f = filt("lowpass", 250);
        const ng = c.createGain();
        ng.gain.value = 0.12;
        noiseSrc().connect(f).connect(ng).connect(g);
        osc("sawtooth", 120, 0.012, g);
        break;
      }
      case "crickets": {
        timer = window.setInterval(() => this.cricket(Math.random() * 1.6 - 0.8), 420);
        break;
      }
      case "birds": {
        timer = window.setInterval(() => {
          if (Math.random() < 0.5) return;
          const f = 2000 + Math.random() * 1500;
          this.tone(f, 0.12, { type: "sine", gain: 0.04, slideTo: f * 1.4, pan: Math.random() - 0.5 });
          this.tone(f * 1.2, 0.1, { type: "sine", gain: 0.03, slideTo: f, delay: 0.15 });
        }, 600);
        break;
      }
      case "chopper": {
        const f = filt("lowpass", 300);
        const ng = c.createGain();
        ng.gain.value = 0.0;
        noiseSrc().connect(f).connect(ng).connect(g);
        lfo(12, 0.4, ng.gain);
        break;
      }
      case "droneSad":
      case "droneHoly":
      case "droneTense":
      case "droneEerie": {
        const chords: Record<string, number[]> = {
          droneSad: [110, 130.8, 164.8],
          droneHoly: [130.8, 196, 261.6, 329.6],
          droneTense: [73.4, 77.8, 110],
          droneEerie: [98, 138.6, 207.7],
        };
        const f = filt("lowpass", name === "droneHoly" ? 1400 : 700);
        f.connect(g);
        chords[name].forEach((fr, i) => {
          osc("sawtooth", fr, 0.025, f, -6);
          osc("sawtooth", fr, 0.025, f, 6 + i);
        });
        lfo(0.08, 300, f.frequency);
        break;
      }
    }
    nodes.forEach((n) => n.start());
    this.ambients.set(name, {
      stop: () => {
        if (timer) clearInterval(timer);
        g.gain.setTargetAtTime(0, c.currentTime, 0.3);
        nodes.forEach((n) => {
          try {
            n.stop(c.currentTime + 1.5);
          } catch {
            /* already stopped */
          }
        });
      },
    });
  }
}
