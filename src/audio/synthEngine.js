/* ==========================================================================
   TELETEXT 2099 — WEBAUDIO SYNTHESIZER SOUND ENGINE WITH VOLUME CONTROL
   ========================================================================== */

class AudioSynthEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.5; // Default 50%
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleAudio() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setVolume(volVal) {
    // volVal from 0 to 100
    this.masterVolume = Math.max(0, Math.min(1, volVal / 100));
  }

  // Play tone
  playTone(frequency, type = 'sine', duration = 0.1, gainVal = 0.1) {
    if (!this.enabled || this.masterVolume === 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

      const effectiveGain = gainVal * this.masterVolume;
      gain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Remote controller click
  playRemoteClick() {
    if (!this.enabled || this.masterVolume === 0) return;
    this.playTone(800, 'square', 0.03, 0.08);
    setTimeout(() => this.playTone(1200, 'triangle', 0.02, 0.05), 20);
  }

  // TV Broadcast Station Fanfare (80s/90s Synth Brass Chime)
  playStationIdent() {
    if (!this.enabled || this.masterVolume === 0) return;
    this.init();
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'sawtooth', 0.25, 0.15);
        this.playTone(freq * 0.5, 'sine', 0.3, 0.12);
      }, idx * 60);
    });
  }

  // White noise static burst for channel tuning
  playStaticBurst(duration = 0.25) {
    if (!this.enabled || this.masterVolume === 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      const bufferSize = this.ctx.sampleRate * duration;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1000;

      const gain = this.ctx.createGain();
      const effectiveGain = 0.2 * this.masterVolume;
      gain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      whiteNoise.start();
    } catch (e) {
      console.warn('Static burst error:', e);
    }
  }

  // Quiz Win Fanfare
  playQuizWin() {
    if (!this.enabled || this.masterVolume === 0) return;
    const arpeggio = [523.25, 659.25, 783.99, 1046.50];
    arpeggio.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'triangle', 0.15, 0.2), i * 80);
    });
  }

  // Quiz Fail Buzzer
  playQuizLose() {
    if (!this.enabled || this.masterVolume === 0) return;
    this.playTone(150, 'sawtooth', 0.3, 0.25);
    setTimeout(() => this.playTone(120, 'sawtooth', 0.4, 0.25), 150);
  }

  // CRT Power Degaussing Sound
  playPowerToggle() {
    if (!this.enabled || this.masterVolume === 0) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.3);

      const effectiveGain = 0.25 * this.masterVolume;
      gain.gain.setValueAtTime(effectiveGain, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.3);
    } catch (e) {}
  }
}

export const synthEngine = new AudioSynthEngine();
