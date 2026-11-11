/**
 * MISSION FORGE: PROJECT AURORA
 * NASA-Style Interactive Procedural Audio System & Cinematic Soundscape Engine
 * Path: src/game/src/audio.js
 *
 * Implements real-time procedural Web Audio API synthesis:
 * 1. Layered Background Soundscape (Dynamic Adaptive BGM):
 *    - Base Layer: Deep cosmic ambient drone (45-60 Hz sub-bass + ethereal lowpass synth pad) at 30% volume.
 *    - Tension Layer: Oscillating rhythmic sub-pulse fading in at high velocity or low propellant margins.
 *    - Transition Logic: Smooth 1.8s crossfades.
 * 2. Real-Time Interactive Flight SFX:
 *    - Dynamic Engine Throttle ('W'): Resonant Lowpass Filter (Q: 3.5), 180 Hz (idle) -> 650 Hz (100% full burn).
 *    - RCS Steering Puffs ('A'/'D'): Compressed bursts of bandpass noise (~80ms, 1200 Hz, stereo panned).
 *    - Telemetry & Waypoint Gate Sync: High-tech harmonic chime (880 Hz + 1320 Hz, subtle reverb decay).
 *    - Warning Alarms: Low-frequency warning pulse (~320 Hz saw wave, 0.4s interval, propellant < 15% or hull stress > 80%).
 * 3. Cockpit Radio & Mission Control Comms:
 *    - Authentic Apollo Quindar Tones: 2525 Hz intro blip and 2475 Hz outro blip.
 *    - Background Radio Atmosphere: Subtle radio fuzz + Apollo comms snippets ducked under main engine sounds.
 * 4. UI Controls & Browser Lifecycle:
 *    - Global Master Volume / Mute toggle with localStorage persistence and audio context resumption.
 */

export const BGM_TRACKS = {
  main: {
    id: 'main',
    title: 'Theme 1: Aurora Prime',
    subtitle: 'Majestic Space Exploration (Main Theme)',
    src: './bgm/mission-forge-main.mp3',
    fallbackSrc: '/assets/bgm/mission-forge-main.mp3'
  },
  alt: {
    id: 'alt',
    title: 'Theme 2: Solar Velocity',
    subtitle: 'Dynamic Atmospheric & Action (Alt Theme)',
    src: './bgm/mission-forge-alt.mp3',
    fallbackSrc: '/assets/bgm/mission-forge-alt.mp3'
  }
};

export class FlightAudio {
  constructor(){
    this.muted = false;
    this.voice = true;
    this.ctx = null;
    this.master = null;
    this.lastWarning = 0;
    this.musicTime = 0;
    this.lastProximity = 0;
    this.lastRcsTime = 0;
    this.lastWarningPulseTime = 0;
    this.lastCommsSnippetTime = 0;
    this.klaxonActive = false;
    this.klaxonTimer = null;
    this.windSource = null;
    this.windFilter = null;
    this.windGain = null;

    // Cinematic In-Flight Dual BGM Engine
    this.bgmVolume = 0.6;
    this.bgmMode = 'adaptive'; // 'adaptive' | 'main' | 'alt' | 'playlist'
    this.activeTrackId = 'main';
    this.targetTrackId = 'main';
    this.audioElements = { main: null, alt: null };
    this.mediaSources = { main: null, alt: null };
    this.bgmGains = { main: null, alt: null };
    this.bgmDuckGain = null;
    this.bgmMasterBus = null;
    this.lastAdaptiveEvaluation = 0;
    this.initAudioElements();

    this.bgmGain = null;
    this.bgmPlaying = false;
    this.bgmNodes = [];
    this.tensionGain = null;
    this.tensionOsc = null;
    this.tensionFilter = null;

    // Engine & Propulsion
    this.engine = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.enginePan = null;
    this.thrusterNoise = null;
    this.thrusterFilter = null;
    this.thrusterGain = null;
    this.drone = null;
    this.droneGain = null;
    this.noise = null;
    this.noiseGain = null;

    // Cockpit Radio & Comms Bus (Ducked under engine)
    this.radioNoise = null;
    this.radioFilter = null;
    this.radioGain = null;
    this.commsBus = null;
  }

  initAudioElements(){
    if(typeof window === 'undefined' || typeof window.Audio === 'undefined') return;
    try {
      let storedMode = 'adaptive';
      try {
        storedMode = localStorage.getItem('aurora-bgm-mode') || 'adaptive';
      } catch(e){}
      this.bgmMode = storedMode;

      ['main', 'alt'].forEach(key => {
        if(!this.audioElements[key]){
          const el = new Audio();
          el.crossOrigin = 'anonymous';
          el.preload = 'auto';
          el.loop = this.bgmMode !== 'playlist';
          el.src = BGM_TRACKS[key].src;

          // Error fallback to absolute asset route (single attempt guard against loops)
          el.addEventListener('error', () => {
            if(el.src && !el._fallbackAttempted && !el.src.includes('assets/bgm')){
              el._fallbackAttempted = true;
              console.warn(`[FlightAudio] Primary BGM source error for ${key}, falling back to:`, BGM_TRACKS[key].fallbackSrc);
              el.src = BGM_TRACKS[key].fallbackSrc;
              el.load();
            } else if (el._fallbackAttempted) {
              console.warn(`[FlightAudio] BGM source unavailable for ${key}; continuing in silent mode.`);
            }
          });

          // In playlist mode, automatically advance and loop seamlessly
          el.addEventListener('ended', () => {
            if(this.bgmMode === 'playlist'){
              const next = key === 'main' ? 'alt' : 'main';
              this.crossfadeToTrack(next, 2.0);
            }
          });

          this.audioElements[key] = el;
        }
      });
    } catch(err){
      console.warn('initAudioElements error:', err);
    }
  }

  async start(){
    if(this.ctx){
      if(this.ctx.state === 'suspended') {
        try { await this.ctx.resume(); } catch(e){}
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      if(this.ctx.state === 'suspended') {
        try { await this.ctx.resume(); } catch(e){}
      }

      // Master output bus
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);

      // Core engine rumble oscillator (sawtooth at 42 Hz)
      this.engine = this.ctx.createOscillator();
      this.engine.type = 'sawtooth';
      this.engine.frequency.value = 42;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 140;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.02;

      this.enginePan = this.ctx.createStereoPanner();

      this.engine.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.enginePan);
      this.enginePan.connect(this.master);
      this.engine.start();

      // Dynamic Propulsion White-Noise Stream (Lowpass Filter Q: 3.5, 180 Hz to 650 Hz)
      const thrusterBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 2), this.ctx.sampleRate);
      const tData = thrusterBuf.getChannelData(0);
      for(let i = 0; i < tData.length; i++) {
        tData[i] = Math.random() * 2 - 1; // Pure white noise
      }
      this.thrusterNoise = this.ctx.createBufferSource();
      this.thrusterNoise.buffer = thrusterBuf;
      this.thrusterNoise.loop = true;

      this.thrusterFilter = this.ctx.createBiquadFilter();
      this.thrusterFilter.type = 'lowpass';
      this.thrusterFilter.frequency.value = 180;
      this.thrusterFilter.Q.value = 3.5; // Resonant Lowpass Filter (Q: 3.5)

      this.thrusterGain = this.ctx.createGain();
      this.thrusterGain.gain.value = 0;

      this.thrusterNoise.connect(this.thrusterFilter);
      this.thrusterFilter.connect(this.thrusterGain);
      this.thrusterGain.connect(this.master);
      this.thrusterNoise.start();

      // Cabin Sub-Drone (52 Hz fundamental hum)
      this.drone = this.ctx.createOscillator();
      this.drone.frequency.value = 52;
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.06;
      this.drone.connect(this.droneGain);
      this.droneGain.connect(this.master);
      this.drone.start();

      // Background avionics / electrical floor noise
      const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
      const d = buffer.getChannelData(0);
      let last = 0;
      for(let i = 0; i < d.length; i++){
        last = (last + Math.random() * 0.04 - 0.02) / 1.02;
        d[i] = last * 2.8;
      }
      this.noise = this.ctx.createBufferSource();
      this.noise.buffer = buffer;
      this.noise.loop = true;
      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.value = 0.016;
      this.noise.connect(this.noiseGain);
      this.noiseGain.connect(this.master);
      this.noise.start();

      // Background Radio Atmosphere & Comms Bus (Ducked under engine throttle)
      const rBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 2), this.ctx.sampleRate);
      const rData = rBuf.getChannelData(0);
      for(let i = 0; i < rData.length; i++) rData[i] = (Math.random() * 2 - 1) * 0.14;
      this.radioNoise = this.ctx.createBufferSource();
      this.radioNoise.buffer = rBuf;
      this.radioNoise.loop = true;

      this.radioFilter = this.ctx.createBiquadFilter();
      this.radioFilter.type = 'bandpass';
      this.radioFilter.frequency.value = 2600;
      this.radioFilter.Q.value = 2.2;

      this.radioGain = this.ctx.createGain();
      this.radioGain.gain.value = 0.012; // Low-level subtle radio fuzz

      this.commsBus = this.ctx.createGain();
      this.commsBus.gain.value = 1.0;

      this.radioNoise.connect(this.radioFilter);
      this.radioFilter.connect(this.radioGain);
      this.radioGain.connect(this.commsBus);
      this.commsBus.connect(this.master);
      this.radioNoise.start();

      // Cinematic BGM Bus (running continuously at balanced volume)
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0;
      this.bgmGain.connect(this.master);

      // Duck gain node for Apollo comms ducking
      this.bgmDuckGain = this.ctx.createGain();
      this.bgmDuckGain.gain.value = 1.0;
      this.bgmDuckGain.connect(this.bgmGain);

      // Dual track gain nodes
      this.bgmGains.main = this.ctx.createGain();
      this.bgmGains.main.gain.value = (this.activeTrackId === 'main') ? 1.0 : 0.0001;
      this.bgmGains.main.connect(this.bgmDuckGain);

      this.bgmGains.alt = this.ctx.createGain();
      this.bgmGains.alt.gain.value = (this.activeTrackId === 'alt') ? 1.0 : 0.0001;
      this.bgmGains.alt.connect(this.bgmDuckGain);

      // Connect MediaElementSource nodes if in browser
      ['main', 'alt'].forEach(key => {
        const el = this.audioElements[key];
        if(el && !this.mediaSources[key]){
          try {
            const src = this.ctx.createMediaElementSource(el);
            src.connect(this.bgmGains[key]);
            this.mediaSources[key] = src;
          } catch(err){}
        }
      });

      // Tension Layer Bus (Rhythmic sub-pulse)
      this.tensionGain = this.ctx.createGain();
      this.tensionGain.gain.value = 0;
      this.tensionGain.connect(this.master);

    } catch(error) {
      console.warn('FlightAudio start error:', error.message);
    }
  }

  /* --------------------------------------------------------------------------
     1. LAYERED BACKGROUND SOUNDSCAPE (DYNAMIC ADAPTIVE BGM)
     - Base Layer: Sub-bass hum at 45-60 Hz + ethereal lowpass synth pad (30% vol)
     - Tension Layer: Oscillating rhythmic sub-pulse fading in at high velocity / low fuel
     - Transition Logic: Smooth crossfade (1.8s duration)
     -------------------------------------------------------------------------- */
  initBgm(){
    if(!this.ctx || this.bgmPlaying) return;
    if(!this.bgmGain){
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0;
      this.bgmGain.connect(this.master);
    }
    if(!this.tensionGain){
      this.tensionGain = this.ctx.createGain();
      this.tensionGain.gain.value = 0;
      this.tensionGain.connect(this.master);
    }

    try {
      this.bgmNodes = [];

      // A. BASE LAYER: 1. Sub-Bass Drone Fundamental (52 Hz Sine)
      const subOsc = this.ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = 52.0;

      const subFilt = this.ctx.createBiquadFilter();
      subFilt.type = 'lowpass';
      subFilt.frequency.value = 85;

      const subGain = this.ctx.createGain();
      subGain.gain.value = 0.28;

      subOsc.connect(subFilt);
      subFilt.connect(subGain);
      subGain.connect(this.bgmGain);
      subOsc.start();
      this.bgmNodes.push(subOsc);

      // A. BASE LAYER: 2. Harmonic Fifth Drone (78 Hz Triangle)
      const fifthOsc = this.ctx.createOscillator();
      fifthOsc.type = 'triangle';
      fifthOsc.frequency.value = 78.0;

      const fifthFilt = this.ctx.createBiquadFilter();
      fifthFilt.type = 'lowpass';
      fifthFilt.frequency.value = 130;

      const fifthGain = this.ctx.createGain();
      fifthGain.gain.value = 0.20;

      fifthOsc.connect(fifthFilt);
      fifthFilt.connect(fifthGain);
      fifthGain.connect(this.bgmGain);
      fifthOsc.start();
      this.bgmNodes.push(fifthOsc);

      // A. BASE LAYER: 3. Ethereal Interstellar Space Chord Cluster (F3, C4, E4, G4)
      const padFilter = this.ctx.createBiquadFilter();
      padFilter.type = 'lowpass';
      padFilter.frequency.value = 320;
      padFilter.Q.value = 2.4;

      const padGain = this.ctx.createGain();
      padGain.gain.value = 0.26;

      // 14-second evolving breathing LFO
      const padLfo = this.ctx.createOscillator();
      padLfo.frequency.value = 0.07;
      const padLfoGain = this.ctx.createGain();
      padLfoGain.gain.value = 140;
      padLfo.connect(padLfoGain);
      padLfoGain.connect(padFilter.frequency);
      padLfo.start();
      this.bgmNodes.push(padLfo);

      const chordPitches = [
        { f: 174.61, type: 'sawtooth', detune: -4, pan: -0.4 },  // F3
        { f: 261.63, type: 'triangle', detune: 3,  pan: 0.35 },  // C4
        { f: 329.63, type: 'sine',     detune: 2,  pan: -0.2 },  // E4
        { f: 392.00, type: 'triangle', detune: -2, pan: 0.45 }   // G4
      ];

      chordPitches.forEach(p => {
        const osc = this.ctx.createOscillator();
        osc.type = p.type;
        osc.frequency.value = p.f;
        osc.detune.value = p.detune;

        const panner = this.ctx.createStereoPanner();
        panner.pan.value = p.pan;

        osc.connect(panner);
        panner.connect(padFilter);
        osc.start();
        this.bgmNodes.push(osc);
      });

      padFilter.connect(padGain);
      padGain.connect(this.bgmGain);

      // A. BASE LAYER: 4. Cosmic Interstellar Wash
      const washBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 3), this.ctx.sampleRate);
      const wData = washBuf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < wData.length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99 * b0 + white * 0.05;
        b1 = 0.95 * b1 + white * 0.1;
        b2 = 0.85 * b2 + white * 0.25;
        wData[i] = (b0 + b1 + b2) * 0.25;
      }
      const washSource = this.ctx.createBufferSource();
      washSource.buffer = washBuf;
      washSource.loop = true;

      const washFilt = this.ctx.createBiquadFilter();
      washFilt.type = 'bandpass';
      washFilt.frequency.value = 240;
      washFilt.Q.value = 1.8;

      const washGain = this.ctx.createGain();
      washGain.gain.value = 0.05;

      washSource.connect(washFilt);
      washFilt.connect(washGain);
      washGain.connect(this.bgmGain);
      washSource.start();
      this.bgmNodes.push(washSource);

      // B. TENSION LAYER: Oscillating Rhythmic Sub-Pulse
      this.tensionOsc = this.ctx.createOscillator();
      this.tensionOsc.type = 'sawtooth';
      this.tensionOsc.frequency.value = 65; // 65 Hz sub-bass

      this.tensionFilter = this.ctx.createBiquadFilter();
      this.tensionFilter.type = 'lowpass';
      this.tensionFilter.frequency.value = 140;
      this.tensionFilter.Q.value = 2.8;

      // 2.0 Hz rhythmic heartbeat/pulse LFO (120 BPM driving pulse)
      const pulseLfo = this.ctx.createOscillator();
      pulseLfo.type = 'sine';
      pulseLfo.frequency.value = 2.0;

      const pulseLfoGain = this.ctx.createGain();
      pulseLfoGain.gain.value = 0.55;

      const tensionModGain = this.ctx.createGain();
      tensionModGain.gain.value = 0.45;

      pulseLfo.connect(pulseLfoGain);
      pulseLfoGain.connect(tensionModGain.gain);

      this.tensionOsc.connect(this.tensionFilter);
      this.tensionFilter.connect(tensionModGain);
      tensionModGain.connect(this.tensionGain);

      this.tensionOsc.start();
      pulseLfo.start();
      this.bgmNodes.push(this.tensionOsc, pulseLfo);

      this.bgmPlaying = true;
    } catch(err) {
      console.warn('initBgm error:', err);
    }
  }

  fadeInBgm(duration = 1.8){
    if(!this.ctx || this.muted) return;
    this.initBgm();
    this.bgmPlaying = true;
    const t = this.ctx.currentTime;
    const targetGain = this.bgmVolume;

    if(this.bgmGain){
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t);
      this.bgmGain.gain.linearRampToValueAtTime(targetGain, t + duration);
    }

    // Play active track element
    const activeEl = this.audioElements[this.activeTrackId];
    if(activeEl){
      activeEl.volume = this.mediaSources[this.activeTrackId] ? 1.0 : targetGain;
      activeEl.play().catch(()=>{});
    }
  }

  fadeOutBgm(duration = 1.8){
    this.bgmPlaying = false;
    if(!this.ctx){
      Object.values(this.audioElements).forEach(el => el?.pause());
      return;
    }
    const t = this.ctx.currentTime;
    if(this.bgmGain){
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t);
      this.bgmGain.gain.linearRampToValueAtTime(0.0001, t + duration);
    }
    if(this.tensionGain){
      this.tensionGain.gain.cancelScheduledValues(t);
      this.tensionGain.gain.setValueAtTime(this.tensionGain.gain.value, t);
      this.tensionGain.gain.linearRampToValueAtTime(0.0001, t + duration);
    }
    setTimeout(() => {
      if(!this.bgmPlaying){
        Object.values(this.audioElements).forEach(el => el?.pause());
      }
    }, duration * 1000);
  }

  crossfadeToTrack(targetTrackId, duration = 2.0){
    if(!BGM_TRACKS[targetTrackId]) return;
    if(this.activeTrackId === targetTrackId && this.bgmPlaying) return;

    const prevTrackId = this.activeTrackId;
    this.activeTrackId = targetTrackId;
    this.targetTrackId = targetTrackId;

    const fromEl = this.audioElements[prevTrackId];
    const toEl = this.audioElements[targetTrackId];

    if(toEl && !this.muted && this.bgmPlaying){
      toEl.play().catch(()=>{});
    }

    if(this.ctx && this.bgmGains[prevTrackId] && this.bgmGains[targetTrackId]){
      const t = this.ctx.currentTime;
      this.bgmGains[prevTrackId].gain.cancelScheduledValues(t);
      this.bgmGains[prevTrackId].gain.setValueAtTime(this.bgmGains[prevTrackId].gain.value, t);
      this.bgmGains[prevTrackId].gain.linearRampToValueAtTime(0.0001, t + duration);

      this.bgmGains[targetTrackId].gain.cancelScheduledValues(t);
      this.bgmGains[targetTrackId].gain.setValueAtTime(this.bgmGains[targetTrackId].gain.value, t);
      this.bgmGains[targetTrackId].gain.linearRampToValueAtTime(1.0, t + duration);

      setTimeout(() => {
        if(this.activeTrackId === targetTrackId && fromEl){
          fromEl.pause();
        }
      }, duration * 1000);
    } else {
      if(fromEl) fromEl.pause();
      if(toEl && !this.muted && this.bgmPlaying){
        toEl.volume = this.bgmVolume * 0.35;
        toEl.play().catch(()=>{});
      }
    }
  }

  setBgmMode(mode){
    if(!['adaptive', 'main', 'alt', 'playlist'].includes(mode)) return;
    this.bgmMode = mode;
    try { localStorage.setItem('aurora-bgm-mode', mode); } catch(e){}

    if(mode === 'main'){
      this.crossfadeToTrack('main', 1.6);
      if(this.audioElements.main) this.audioElements.main.loop = true;
      if(this.audioElements.alt) this.audioElements.alt.loop = true;
    } else if(mode === 'alt'){
      this.crossfadeToTrack('alt', 1.6);
      if(this.audioElements.main) this.audioElements.main.loop = true;
      if(this.audioElements.alt) this.audioElements.alt.loop = true;
    } else if(mode === 'playlist'){
      if(this.audioElements.main) this.audioElements.main.loop = false;
      if(this.audioElements.alt) this.audioElements.alt.loop = false;
      if(!this.bgmPlaying){
        this.crossfadeToTrack('main', 1.6);
      }
    } else {
      // adaptive
      if(this.audioElements.main) this.audioElements.main.loop = true;
      if(this.audioElements.alt) this.audioElements.alt.loop = true;
    }
  }

  cycleBgmMode(){
    const modes = ['adaptive', 'main', 'alt', 'playlist'];
    const curIdx = modes.indexOf(this.bgmMode);
    const nextMode = modes[(curIdx + 1) % modes.length];
    this.setBgmMode(nextMode);
    return nextMode;
  }

  getBgmTrackTitle(){
    if(this.bgmMode === 'adaptive'){
      return `Adaptive Dynamic (${this.activeTrackId === 'main' ? 'Theme 1: Aurora Prime' : 'Theme 2: Solar Velocity'})`;
    }
    if(this.bgmMode === 'playlist'){
      return `Playlist Loop (${this.activeTrackId === 'main' ? 'Track 1' : 'Track 2'})`;
    }
    return this.activeTrackId === 'main' ? 'Theme 1: Aurora Prime (Majestic)' : 'Theme 2: Solar Velocity (Action)';
  }

  getBgmButtonLabel(){
    if(this.bgmMode === 'adaptive') return `BGM: ADAPTIVE [${this.activeTrackId === 'main' ? 'TH-1' : 'TH-2'}]`;
    if(this.bgmMode === 'main') return 'BGM: THEME 1';
    if(this.bgmMode === 'alt') return 'BGM: THEME 2';
    return `BGM: PLAYLIST [${this.activeTrackId === 'main' ? '1' : '2'}]`;
  }

  getBgmDescription(){
    if(this.bgmMode === 'adaptive'){
      return 'Adaptive: automatically crossfades between Aurora Prime (Cruise/Orbit) and Solar Velocity (Re-entry/Action).';
    }
    if(this.bgmMode === 'main'){
      return 'Theme 1: Aurora Prime — Majestic orchestral space odyssey theme.';
    }
    if(this.bgmMode === 'alt'){
      return 'Theme 2: Solar Velocity — Dynamic action and atmospheric re-entry theme.';
    }
    return 'Playlist Loop: plays Theme 1 and Theme 2 sequentially in a seamless loop.';
  }

  duckBgm(ratio = 0.35, duration = 0.15){
    if(this.ctx && this.bgmDuckGain){
      const t = this.ctx.currentTime;
      this.bgmDuckGain.gain.cancelScheduledValues(t);
      this.bgmDuckGain.gain.setValueAtTime(this.bgmDuckGain.gain.value, t);
      this.bgmDuckGain.gain.linearRampToValueAtTime(ratio, t + duration);
    }
  }

  unduckBgm(duration = 0.35){
    if(this.ctx && this.bgmDuckGain){
      const t = this.ctx.currentTime;
      this.bgmDuckGain.gain.cancelScheduledValues(t);
      this.bgmDuckGain.gain.setValueAtTime(this.bgmDuckGain.gain.value, t);
      this.bgmDuckGain.gain.linearRampToValueAtTime(1.0, t + duration);
    }
  }

  /* --------------------------------------------------------------------------
     2. REAL-TIME INTERACTIVE FLIGHT SFX (PROCEDURAL WEB AUDIO API)
     -------------------------------------------------------------------------- */

  // RCS Steering Puffs ('A' / 'D' Keys): ~80ms, 1200 Hz bandpass noise
  rcsBurst(pan = 0){
    if(!this.ctx || this.muted) return;
    const now = performance.now();
    if(now - this.lastRcsTime < 75) return;
    this.lastRcsTime = now;

    const t = this.ctx.currentTime;
    const dur = 0.080; // exactly ~80ms
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for(let i = 0; i < data.length; i++){
      data[i] = (Math.random() * 2 - 1) * 0.48;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t); // 1200 Hz
    filter.Q.value = 4.0;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.22, t + 0.003); // fast compressed punch
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.max(-0.85, Math.min(0.85, pan)), t);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(panner);
    panner.connect(this.master);

    source.start(t);
    source.stop(t + dur + 0.01);
  }

  // Telemetry & Waypoint Gate Sync: Two-tone sine wave (880 Hz + 1320 Hz, subtle reverb decay)
  playWaypointChime(){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.65;

    const freqs = [880, 1320]; // 880 Hz and 1320 Hz
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(idx === 0 ? 0.16 : 0.13, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      // Subtle simulated cabin reverb delay reflections
      const delay = this.ctx.createDelay();
      delay.delayTime.setValueAtTime(0.05 + idx * 0.04, t);

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = 'lowpass';
      delayFilter.frequency.setValueAtTime(2400, t);

      const delayGain = this.ctx.createGain();
      delayGain.gain.setValueAtTime(0.3, t);
      delayGain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);

      osc.connect(gain);
      gain.connect(this.master);

      gain.connect(delay);
      delay.connect(delayFilter);
      delayFilter.connect(delayGain);
      delayGain.connect(this.master);

      osc.start(t);
      osc.stop(t + dur + 0.25);
    });
  }

  // Warning Alarms: Low-frequency warning pulse (~320 Hz saw wave, 0.4s interval)
  playWarningPulse(){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 0.12;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, t); // ~320 Hz saw wave

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);
    filter.Q.value = 2.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.16, t + 0.008);
    gain.gain.setValueAtTime(0.16, t + dur - 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    osc.start(t);
    osc.stop(t + dur + 0.01);
  }

  /* --------------------------------------------------------------------------
     3. COCKPIT RADIO & MISSION CONTROL COMMS
     -------------------------------------------------------------------------- */

  // Authentic Apollo Quindar Tones (2525 Hz intro, 2475 Hz outro)
  playQuindar(type = 'intro'){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const freq = type === 'outro' ? 2475 : 2525; // 2525 Hz opening beep, 2475 Hz closing beep
    const dur = 0.082; // ~80ms short pulse

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.006);
    gain.gain.setValueAtTime(0.18, t + dur - 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.01);

    // Apollo carrier squelch click
    setTimeout(() => {
      if(!this.ctx || this.muted) return;
      const ct = this.ctx.currentTime;
      const cDur = 0.04;
      const cBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * cDur), this.ctx.sampleRate);
      const cData = cBuf.getChannelData(0);
      for(let i = 0; i < cData.length; i++) cData[i] = (Math.random() * 2 - 1) * 0.12;
      const cSource = this.ctx.createBufferSource();
      cSource.buffer = cBuf;

      const cFilt = this.ctx.createBiquadFilter();
      cFilt.type = 'bandpass';
      cFilt.frequency.value = 2200;
      cFilt.Q.value = 3.2;

      const cGain = this.ctx.createGain();
      cGain.gain.setValueAtTime(0.08, ct);
      cGain.gain.exponentialRampToValueAtTime(0.001, ct + cDur);

      cSource.connect(cFilt);
      cFilt.connect(cGain);
      cGain.connect(this.master);
      cSource.start(ct);
      cSource.stop(ct + cDur + 0.01);
    }, Math.round((dur - 0.005) * 1000));
  }

  // Occasional authentic NASA Apollo comms snippets
  playRadioSnippet(){
    if(!this.ctx || this.muted || !this.voice) return;
    const snippets = [
      "Houston, telemetry nominal.",
      "Roger, go for corridor entry.",
      "Odyssey, guidance computer is nominal.",
      "Trajectory locked on vector.",
      "CapCom copies, flight looks good.",
      "Cabin atmosphere steady.",
      "Standby for next checkpoint.",
      "Flight, all telemetry verified."
    ];
    const phrase = snippets[Math.floor(Math.random() * snippets.length)];
    this.playQuindar('intro');
    setTimeout(() => {
      this.speak(phrase, () => {
        setTimeout(() => this.playQuindar('outro'), 300);
      });
    }, 120);
  }

  playLaunchIgnition(){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const dur = 2.0;

    // Sub-bass rumble swell (30 Hz -> 68 Hz)
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(30, t);
    osc.frequency.exponentialRampToValueAtTime(68, t + 1.5);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(65, t);
    filter.frequency.linearRampToValueAtTime(180, t + 1.5);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.04, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);

    // Rocket combustion noise layer
    const nBuf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
    const nData = nBuf.getChannelData(0);
    let b = 0;
    for (let i = 0; i < nData.length; i++) {
      b = 0.96 * b + (Math.random() * 2 - 1) * 0.12;
      nData[i] = b * 1.5;
    }
    const nSource = this.ctx.createBufferSource();
    nSource.buffer = nBuf;

    const nFilter = this.ctx.createBiquadFilter();
    nFilter.type = 'lowpass';
    nFilter.frequency.setValueAtTime(110, t);
    nFilter.frequency.linearRampToValueAtTime(360, t + 1.3);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.001, t);
    nGain.gain.linearRampToValueAtTime(0.34, t + 1.2);
    nGain.gain.exponentialRampToValueAtTime(0.02, t + dur);

    nSource.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.master);
    nSource.start(t);
    nSource.stop(t + dur + 0.05);
  }

  playLaunchSequence(){
    this.start();
    this.playQuindar('intro');
    this.playLaunchIgnition();
    this.fadeInBgm(1.8);
  }

  /* --------------------------------------------------------------------------
     4. UI CONTROLS & BROWSER INTERACTION
     -------------------------------------------------------------------------- */
  toggle(){
    this.muted = !this.muted;
    if(this.ctx && this.ctx.state === 'suspended'){
      this.ctx.resume().catch(()=>{});
    }
    if(this.master && this.ctx){
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    if(this.muted){
      this.stopKlaxon();
      if(this.windGain && this.ctx){
        this.windGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      if(typeof window !== 'undefined') window.speechSynthesis?.cancel();
      Object.values(this.audioElements).forEach(el => el?.pause());
    } else {
      if(!this.bgmPlaying){
        this.fadeInBgm(1.5);
      } else {
        const el = this.audioElements[this.activeTrackId];
        if(el && el.paused) el.play().catch(()=>{});
        if(this.bgmGain && this.ctx){
          this.bgmGain.gain.setTargetAtTime(this.bgmVolume, this.ctx.currentTime, 0.1);
        }
      }
    }
    return !this.muted;
  }

  startKlaxon(){
    if(this.muted || this.klaxonActive || !this.ctx) return;
    this.klaxonActive = true;
    this.klaxonTimer = setInterval(() => {
      if(!this.klaxonActive || this.muted) return;
      this.tone(880, 0.22, 'sawtooth', 0.12);
      setTimeout(() => {
        if(this.klaxonActive && !this.muted){
          this.tone(660, 0.22, 'sawtooth', 0.12);
        }
      }, 280);
    }, 600);
  }

  stopKlaxon(){
    this.klaxonActive = false;
    if(this.klaxonTimer){
      clearInterval(this.klaxonTimer);
      this.klaxonTimer = null;
    }
  }

  initWind(){
    if(!this.ctx || this.windSource) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < bufferSize; i++){
      data[i] = (Math.random() * 2 - 1) * 0.3;
    }
    this.windSource = this.ctx.createBufferSource();
    this.windSource.buffer = buffer;
    this.windSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 240;
    this.windFilter.Q.value = 3.5;

    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;

    this.windSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    this.windSource.start();
  }

  updateWind(intensity){
    if(this.muted || !this.ctx) return;
    if(!this.windSource) this.initWind();
    if(this.windGain){
      const targetGain = this.muted ? 0 : Math.max(0, Math.min(0.4, intensity * 0.35));
      this.windGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
    }
    if(this.windFilter){
      const targetFreq = 180 + intensity * 350;
      this.windFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.15);
    }
  }

  tone(frequency = 600, duration = 0.12, type = 'sine', volume = 0.13, slide = 0){
    if(!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(frequency, t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, frequency + slide), t + duration);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + duration + 0.02);
  }

  impact(amount = 16){
    if(!this.ctx || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime, strength = Math.max(0.35, Math.min(1, amount / 24));
    this.tone(105, 0.55, 'sine', 0.42 * strength, -76);
    this.tone(235, 0.26, 'triangle', 0.17 * strength, -130);
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.48), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2600, t);
    filter.frequency.exponentialRampToValueAtTime(180, t + 0.45);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.5 * strength, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(t);
    source.stop(t + 0.48);
  }

  cue(name){
    if(name === 'click') this.tone(950, 0.05, 'sine', 0.07, -220);
    if(name === 'scan') this.tone(510, 0.2, 'sine', 0.1, 520);
    if(name === 'gate' || name === 'checkpoint') this.playWaypointChime();
    if(name === 'success'){
      [440, 554, 660, 880].forEach((f, i) => setTimeout(() => this.tone(f, 0.45, 'sine', 0.09), i * 100));
    }
    if(name === 'impact') this.impact();
    if(name === 'alert'){
      this.tone(580, 0.15, 'square', 0.06);
      setTimeout(() => this.tone(420, 0.25, 'square', 0.05), 180);
    }
    if(name === 'transition'){
      this.tone(80, 2.2, 'sine', 0.2, 850);
    }
    if(name === 'shield'){
      this.tone(160, 0.38, 'sine', 0.16, 240);
      setTimeout(() => this.tone(380, 0.45, 'triangle', 0.11, 140), 60);
      setTimeout(() => this.tone(520, 0.3, 'sine', 0.08, 0), 120);
    }
    if(name === 'shield_deflect'){
      this.tone(480, 0.12, 'sawtooth', 0.1, -180);
      this.tone(880, 0.08, 'sine', 0.09, -320);
    }
    if(name === 'sensor_stream'){
      this.tone(1150, 0.06, 'sine', 0.08, 220);
      setTimeout(() => this.tone(1480, 0.05, 'sine', 0.07, -180), 45);
    }
    if(name === 'solar_storm'){
      this.tone(65, 1.8, 'sawtooth', 0.22, 120);
      setTimeout(() => this.tone(140, 1.2, 'triangle', 0.18, -60), 180);
    }
  }

  speak(text, onEnd = null){
    if(this.muted || !this.voice || !('speechSynthesis' in window)){
      if(onEnd) setTimeout(onEnd, 1200);
      return;
    }
    window.speechSynthesis.cancel();

    // Clean and simplify technical abbreviations so the voice reads clear, natural English
    let clean = text
      .replace(/W\/S/g, 'W or S')
      .replace(/A\/D/g, 'A or D')
      .replace(/↑\/↓/g, 'up and down arrows')
      .replace(/m\/s/g, 'meters per second')
      .replace(/km\/s/g, 'kilometers per second')
      .replace(/km\b/g, 'kilometers')
      .replace(/AU\b/g, 'astronomical units')
      .replace(/[·•→—–]/g, ', ')
      .replace(/[\(\)\[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const message = new SpeechSynthesisUtterance(clean);
    message.rate = 0.88; // Slower, clearer, natural cadence
    message.pitch = 1.0; // Warm, natural human pitch (not robotic 0.86)
    message.volume = 0.95; // Clear and easily heard over space ambience

    // Softly duck cabin rumble and BGM while voice is speaking
    const restoreGains = () => {
      if(this.ctx && this.droneGain) this.droneGain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.2);
      if(this.ctx && this.noiseGain) this.noiseGain.gain.setTargetAtTime(0.016, this.ctx.currentTime, 0.2);
      this.unduckBgm(0.35);
    };

    this.duckBgm(0.35, 0.15);
    if(this.ctx && this.droneGain) {
      this.droneGain.gain.setTargetAtTime(0.02, this.ctx.currentTime, 0.1);
    }
    if(this.ctx && this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(0.005, this.ctx.currentTime, 0.1);
    }

    message.onend = () => {
      restoreGains();
      if(onEnd) onEnd();
    };
    message.onerror = () => {
      restoreGains();
      if(onEnd) onEnd();
    };

    const voices = window.speechSynthesis.getVoices();
    message.voice = voices.find(v => v.lang === 'en-US' && /Natural|Zira|Jenny|Guy|Google US|Aria|David/i.test(v.name)) || voices.find(v => v.lang.startsWith('en')) || null;
    window.speechSynthesis.speak(message);
  }

  stopVoice(){
    window.speechSynthesis?.cancel();
    this.unduckBgm(0.2);
    if(this.ctx && this.droneGain) this.droneGain.gain.setTargetAtTime(0.06, this.ctx.currentTime, 0.1);
    if(this.ctx && this.noiseGain) this.noiseGain.gain.setTargetAtTime(0.016, this.ctx.currentTime, 0.1);
  }

  /* --------------------------------------------------------------------------
     FRAME-BY-FRAME AUDIO TELEMETRY UPDATE
     - Dynamic Engine Throttle ('W' Key):
       * White-noise engine stream passed through resonant Lowpass Filter (Q: 3.5).
       * Modulate cutoff frequency dynamically from 180 Hz (idle) to 650 Hz (100% full burn).
     - Tension Layer:
       * Oscillating rhythmic sub-pulse fading in at high velocity or low propellant.
     - Warning Alarms:
       * Low-frequency warning pulse (~320 Hz saw wave, 0.4s interval) if fuel < 15% or hull stress > 80%.
     - Cockpit Radio Ducking:
       * Background radio fuzz ducked under engine throttle.
     -------------------------------------------------------------------------- */
  update(dt, sim, keys = {}){
    if(!this.ctx) return;
    const moving = sim?.mode === 'flight';
    const speed = moving ? sim.speed : 2;
    const t = this.ctx.currentTime;

    // Compute throttle factor (0.0 idle to 1.0 full burn)
    const forwardThrust = keys?.forward || keys?.boost || false;
    const throttle = moving ? (sim.isSurface ? Math.min(speed / 19, 1) : Math.max(sim.throttle || 0, forwardThrust ? 0.95 : 0)) : 0;

    // Core sawtooth engine rumble pitch & filter
    if(this.engine){
      this.engine.frequency.setTargetAtTime(36 + speed * 0.9 + throttle * 28, t, 0.12);
    }
    if(this.engineFilter){
      this.engineFilter.frequency.setTargetAtTime(105 + speed * 5 + throttle * 220, t, 0.15);
    }
    if(this.engineGain){
      this.engineGain.gain.setTargetAtTime(0.012 + throttle * 0.14, t, 0.16);
    }
    if(this.enginePan){
      const panVal = (moving && sim && sim.velocity && typeof sim.velocity.x === 'number') ? Math.max(-0.6, Math.min(0.6, sim.velocity.x / 25)) : 0;
      this.enginePan.pan.setTargetAtTime(panVal, t, 0.1);
    }

    // Dynamic White-Noise Engine Stream (180 Hz idle -> 650 Hz full burn, Q: 3.5)
    if(this.thrusterFilter){
      const targetCutoff = 180 + throttle * 470; // 180 Hz at idle, 650 Hz at 100% full burn
      this.thrusterFilter.frequency.setTargetAtTime(targetCutoff, t, 0.12);
      this.thrusterFilter.Q.value = 3.5;
    }
    if(this.thrusterGain){
      const targetThrusterHiss = moving ? (0.03 + throttle * 0.22) : 0;
      this.thrusterGain.gain.setTargetAtTime(targetThrusterHiss, t, 0.12);
    }

    // Avionics electrical floor noise
    if(this.noiseGain){
      this.noiseGain.gain.setTargetAtTime(moving ? (0.022 + speed * 0.002) : 0.012, t, 0.15);
    }

    // Tension Layer Modulation (Approaching high velocity > 22 m/s or low propellant < 20% or hull stress > 75%)
    if(this.tensionGain){
      const speedTension = (moving && typeof sim?.speed === 'number' && sim.speed > 22) ? Math.min(1, (sim.speed - 22) / 22) : 0;
      const fuelTension = (moving && typeof sim?.fuel === 'number' && sim.fuel < 20) ? Math.min(1, (20 - sim.fuel) / 20) : 0;
      const hullTension = (moving && typeof sim?.hull === 'number' && sim.hull < 25) ? Math.min(1, (25 - sim.hull) / 25) : 0;
      const tension = Math.max(speedTension, fuelTension, hullTension);
      this.tensionGain.gain.setTargetAtTime(moving ? tension * 0.28 : 0, t, 0.2);
    }

    // Warning Alarms: ~320 Hz saw wave pulse every 0.4s if fuel < 15% or hull < 20% (stress > 80%)
    const isWarning = moving && ((typeof sim?.fuel === 'number' && sim.fuel < 15) || (typeof sim?.hull === 'number' && sim.hull < 20) || (typeof sim?.heat === 'number' && sim.heat > 80));
    if(isWarning && !this.muted){
      if(t - this.lastWarningPulseTime >= 0.40){
        this.lastWarningPulseTime = t;
        this.playWarningPulse();
      }
    }

    // Cockpit Radio Atmosphere Ducking underneath main engine sounds
    if(this.commsBus){
      const duckRatio = moving ? Math.max(0.2, 1.0 - throttle * 0.8) : 1.0;
      this.commsBus.gain.setTargetAtTime(duckRatio, t, 0.15);
    }

    // Occasional authentic NASA Apollo comms snippets during active flight (when not blasting full throttle)
    if(moving && !this.muted && this.voice && throttle < 0.35){
      if(t - this.lastCommsSnippetTime > 34){
        this.lastCommsSnippetTime = t;
        this.playRadioSnippet();
      }
    }

    // Proximity Radar Beeps
    if(moving && [3, 5].includes(sim.stage) && sim.range < 150 && t - this.lastProximity > Math.max(0.3, sim.range / 100)){
      this.lastProximity = t;
      this.tone(sim.canInteract ? 880 : sim.speed > 10 ? 300 : 600, 0.055, 'sine', 0.035);
    }

    // Occasional cosmic harmonic shimmer tone (every 7 seconds)
    this.musicTime += dt;
    if(this.musicTime > 6.8){
      this.musicTime = 0;
      if(moving && !this.muted){
        const notes = [130.81, 164.81, 196.00, 220.00, 261.63, 329.63, 392.00];
        this.tone(notes[Math.floor(Math.random() * notes.length)], 4.2, 'sine', 0.024);
      }
    }

    // Intelligent Adaptive BGM evaluation during active flight
    if(this.bgmMode === 'adaptive' && moving && this.bgmPlaying){
      if(t - this.lastAdaptiveEvaluation > 1.2){
        this.lastAdaptiveEvaluation = t;
        const isDynamicFlight = (
          Boolean(sim?.isReentry) ||
          Boolean(sim?.isStorm) ||
          (typeof sim?.speed === 'number' && sim.speed > 25) ||
          (typeof sim?.heat === 'number' && sim.heat > 75) ||
          (typeof sim?.hull === 'number' && sim.hull < 25) ||
          (typeof sim?.fuel === 'number' && sim.fuel < 15) ||
          (sim?.stage === 3 && sim?.destination?.surface) // Terminal planetary descent
        );

        const targetTrack = isDynamicFlight ? 'alt' : 'main';
        if(this.activeTrackId !== targetTrack){
          this.crossfadeToTrack(targetTrack, 2.2);
        }
      }
    }
  }

  setMasterVolume(val) {
    const level = Math.max(0, Math.min(1, Number(val) || 0.5));
    if (this.master && this.ctx && !this.muted) {
      this.master.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
    }
  }

  setBgmVolume(val) {
    const level = Math.max(0, Math.min(1, Number(val) || 0.6));
    this.bgmVolume = level;
    if (this.bgmGain && this.ctx && !this.muted) {
      this.bgmGain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.05);
    }
    // Update direct element volume if media sources are not attached
    Object.keys(this.audioElements).forEach(k => {
      const el = this.audioElements[k];
      if(el && !this.mediaSources[k]){
        el.volume = (k === this.activeTrackId ? level : 0);
      }
    });
  }
}

