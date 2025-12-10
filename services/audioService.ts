

export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private initialized = false;
  private isMuted = false;
  
  // Music State
  private currentBgmMode: 'NONE' | 'EXPLORATION' | 'COMBAT' | 'BOSS' | 'REST' = 'NONE';
  private bgmInterval: number | null = null;
  private activeOscillators: AudioNode[] = [];

  init() {
    if (this.initialized) return;
    
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.3;
      this.masterGain.connect(this.ctx.destination);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.2; 
      this.bgmGain.connect(this.masterGain);

      this.initialized = true;
      // Start with silence until explicitly requested
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  toggleMute() {
    if (!this.masterGain || !this.ctx) return;
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
        this.stopBGM(); // Stop processing to save CPU when muted
    } else {
        this.masterGain.gain.setTargetAtTime(0.3, this.ctx.currentTime, 0.1);
        if (this.currentBgmMode !== 'NONE') {
            this.playBGM(this.currentBgmMode); // Restart track
        }
    }
    return this.isMuted;
  }

  playBGM(mode: 'EXPLORATION' | 'COMBAT' | 'BOSS' | 'REST') {
      if (!this.initialized || this.isMuted || !this.ctx || !this.bgmGain) return;
      if (this.currentBgmMode === mode) return;

      this.stopBGM();
      this.currentBgmMode = mode;

      // Crossfade
      this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.bgmGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 2);

      switch(mode) {
          case 'EXPLORATION':
              this.startExplorationTheme();
              break;
          case 'COMBAT':
              this.startCombatTheme();
              break;
          case 'BOSS':
              this.startBossTheme();
              break;
          case 'REST':
              this.startRestTheme();
              break;
      }
  }

  private stopBGM() {
      if (this.bgmInterval) {
          window.clearInterval(this.bgmInterval);
          this.bgmInterval = null;
      }
      this.activeOscillators.forEach(osc => {
          try { (osc as any).stop(); } catch(e) {}
          try { osc.disconnect(); } catch(e) {}
      });
      this.activeOscillators = [];
  }

  // --- THEMES ---

  private startExplorationTheme() {
    if (!this.ctx || !this.bgmGain) return;
    
    // Dark Drone (Constant)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 55; // A1
    osc1.connect(this.bgmGain);
    osc1.start();
    this.activeOscillators.push(osc1);

    // Random pings
    this.bgmInterval = window.setInterval(() => {
        if (Math.random() > 0.7) this.playPing(440 + (Math.random() * 100), 'sine', 1.5);
    }, 3000);
  }

  private startCombatTheme() {
    if (!this.ctx || !this.bgmGain) return;

    // Fast Bass Pulse
    const bassOsc = this.ctx.createOscillator();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.value = 80;
    
    const bassGain = this.ctx.createGain();
    bassGain.gain.value = 0.1;
    
    // Filter for rhythm
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    bassOsc.connect(filter);
    filter.connect(bassGain);
    bassGain.connect(this.bgmGain);
    bassOsc.start();
    this.activeOscillators.push(bassOsc, bassGain, filter);

    // Rhythm loop
    let beat = 0;
    this.bgmInterval = window.setInterval(() => {
        beat = (beat + 1) % 4;
        // Pulse filter
        filter.frequency.setValueAtTime(200, this.ctx!.currentTime);
        filter.frequency.exponentialRampToValueAtTime(800, this.ctx!.currentTime + 0.1);
        filter.frequency.exponentialRampToValueAtTime(200, this.ctx!.currentTime + 0.2);
        
        // High hat noise simulated
        if (beat % 2 === 0) this.playPing(2000, 'square', 0.05, 0.05);
    }, 400); // 150 BPM approx
  }

  private startBossTheme() {
      if (!this.ctx || !this.bgmGain) return;
      
      // Deep menacing drone
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 36; // Low C
      const gain1 = this.ctx.createGain();
      gain1.gain.value = 0.3;
      osc1.connect(gain1);
      gain1.connect(this.bgmGain);
      osc1.start();
      this.activeOscillators.push(osc1, gain1);

      // Tension notes
      const notes = [72, 75, 78, 79]; // C minorish
      let idx = 0;
      this.bgmInterval = window.setInterval(() => {
          const freq = this.midiToFreq(notes[idx]);
          this.playPing(freq, 'triangle', 0.3, 0.2);
          idx = (idx + 1) % notes.length;
      }, 800);
  }

  private startRestTheme() {
    if (!this.ctx || !this.bgmGain) return;
    
    // Ethereal pads
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 220; // A3
    const gain1 = this.ctx.createGain();
    gain1.gain.value = 0.1;
    osc1.connect(gain1);
    gain1.connect(this.bgmGain);
    osc1.start();
    this.activeOscillators.push(osc1, gain1);

    this.bgmInterval = window.setInterval(() => {
        const freq = [330, 440, 493][Math.floor(Math.random()*3)];
        this.playPing(freq, 'sine', 2.0, 0.05);
    }, 4000);
  }

  // --- HELPERS ---

  private playPing(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.ctx || !this.bgmGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(gain);
    gain.connect(this.bgmGain);
    osc.start(t);
    osc.stop(t + duration);
  }

  private midiToFreq(m: number) {
      return 440 * Math.pow(2, (m - 69) / 12);
  }

  // --- SFX GENERATORS (Existing) ---

  playHover() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
    
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.1);
  }

  playCombatSlash() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + 0.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  playDamage() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playLevelUp() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    
    [440, 554, 659, 880].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = t + (i * 0.1);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(this.masterGain!);
        osc.start(startTime);
        osc.stop(startTime + 0.6);
    });
  }

  playItemFound() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.linearRampToValueAtTime(1800, t + 0.1);
    
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

export const audio = new AudioService();
