export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this._musicGain = null;
    this._sfxGain = null;
    this._masterGain = null;
    this._currentMusic = null;
    this._musicOsc = null;
    this._initialized = false;
  }

  init() {
    const resume = () => {
      if (this._initialized) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this.ctx.createGain();
      this._masterGain.gain.value = this.settings.masterVolume;
      this._masterGain.connect(this.ctx.destination);

      this._musicGain = this.ctx.createGain();
      this._musicGain.gain.value = this.settings.musicVolume;
      this._musicGain.connect(this._masterGain);

      this._sfxGain = this.ctx.createGain();
      this._sfxGain.gain.value = this.settings.sfxVolume;
      this._sfxGain.connect(this._masterGain);

      this._initialized = true;
    };

    ['click', 'keydown', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, resume, { once: false })
    );
  }

  _ensureCtx() {
    if (!this._initialized) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  play(soundName) {
    if (!this._ensureCtx()) return;

    const sounds = {
      whistle: () => this._tone(800, 0.3, 'sine', 0.4),
      kick: () => this._sweep(150, 60, 0.15, 'sine', 0.5),
      hit: () => this._noise(0.08, 0.6),
      splash: () => this._noise(0.3, 0.4),
      bounce: () => this._tone(400, 0.1, 'triangle', 0.3),
      score: () => { this._tone(523, 0.15, 'sine', 0.3); setTimeout(() => this._tone(659, 0.15, 'sine', 0.3), 100); setTimeout(() => this._tone(784, 0.2, 'sine', 0.3), 200); },
      countdown: () => this._tone(440, 0.2, 'square', 0.15),
      go: () => this._tone(880, 0.3, 'sine', 0.4),
      swim_stroke: () => this._noise(0.1, 0.2),
      serve: () => { this._tone(300, 0.05, 'sawtooth', 0.3); this._noise(0.05, 0.3); },
      crowd: () => this._noise(0.8, 0.15),
      click: () => this._tone(1000, 0.05, 'sine', 0.2),
      unlock: () => { this._tone(523, 0.1, 'sine', 0.3); setTimeout(() => this._tone(784, 0.1, 'sine', 0.3), 80); setTimeout(() => this._tone(1047, 0.2, 'sine', 0.3), 160); }
    };

    const fn = sounds[soundName];
    if (fn) fn();
  }

  _tone(freq, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _sweep(startFreq, endFreq, duration, type, volume) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this._sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  _noise(duration, volume) {
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this._sfxGain);
    source.start();
  }

  playMusic(theme) {
    if (!this._ensureCtx()) return;
    this.stopMusic();

    const themes = {
      menu: { notes: [261, 329, 392, 329, 261, 392, 349, 329], tempo: 0.4 },
      football: { notes: [196, 247, 294, 330, 294, 247, 196, 220], tempo: 0.3 },
      swimming: { notes: [330, 392, 440, 494, 440, 392, 330, 294], tempo: 0.5 },
      tennis: { notes: [349, 440, 523, 440, 349, 294, 349, 392], tempo: 0.35 },
      soccer: { notes: [262, 330, 392, 494, 392, 330, 262, 196], tempo: 0.3 }
    };

    const t = themes[theme] || themes.menu;
    let noteIndex = 0;

    const playNote = () => {
      if (!this._initialized || !this._currentMusic) return;
      const freq = t.notes[noteIndex % t.notes.length];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + t.tempo * 0.9);
      osc.connect(gain);
      gain.connect(this._musicGain);
      osc.start();
      osc.stop(this.ctx.currentTime + t.tempo);
      noteIndex++;
      this._currentMusic = setTimeout(playNote, t.tempo * 1000);
    };

    this._currentMusic = setTimeout(playNote, 100);
  }

  stopMusic() {
    if (this._currentMusic) {
      clearTimeout(this._currentMusic);
      this._currentMusic = null;
    }
  }

  updateVolumes(settings) {
    if (!this._initialized) return;
    this._masterGain.gain.value = settings.masterVolume;
    this._musicGain.gain.value = settings.musicVolume;
    this._sfxGain.gain.value = settings.sfxVolume;
  }
}
