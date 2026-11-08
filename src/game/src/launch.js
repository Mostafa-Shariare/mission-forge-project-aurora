/**
 * MISSION FORGE: PROJECT AURORA
 * Super Heavy-Lift Rocket Launch Simulation (Earth -> Orbit)
 * Path: src/game/src/launch.js
 *
 * Cinematic, high-fidelity 2-minute rocket launch simulation from Kennedy Space Center (LC-39B):
 * - Authentic 2-Minute Pacing: Countdown (5s) -> Liftoff (15s) -> Cloud Punch & Max-Q (35s) ->
 *   SRB Staging (55s) -> Space Boundary & Fairing Jettison (75s) -> Orbital Insertion (100s) -> Separation (115s)
 * - True Atmospheric Immersion:
 *   - Procedural Sky Dome with Rayleigh horizon scattering (pale cyan -> deep navy -> indigo -> pitch black)
 *   - Soft layered volumetric cloud canopy (procedural cloud sprites)
 *   - Dynamic cloud penetration moisture mist flash as the rocket punches through the deck
 *   - Supersonic vapor slipstream streaks rushing past the hull at Mach 0.9-2.5
 *   - Photorealistic curved Earth below with continents, oceans, and glowing blue atmospheric limb
 *   - Radiant Sun flare with solar corona
 * - 4 Cinematic Camera Views:
 *   [1] PAD CAM: NASA long-range tracking camera with optical telephoto zoom
 *   [2] BOOSTER CAM: Downward view along hull past engines & SRBs, watching Earth drop away
 *   [3] NOSE CAM: Forward view looking into the sky, clouds, and stars
 *   [4] ORBIT CHASE: 360° interactive mouse-drag orbital camera
 * - Dual Flight Modes: SAS Auto-Pilot (with auto-staging fallback) & Manual Gimbal Vectoring
 * - Skip to Orbit [ESC] & Time Warp (1X / 2X / 4X)
 */

import * as T from 'three';
import { assembledVehicle, disposeModel } from './vehicle.js';
import { NASA_MISSION_CLASSES, LAUNCH_VEHICLES } from './data.js';

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/* =========================================================================
   PHOTOREALISTIC PROCEDURAL TEXTURE GENERATORS (NASA SLS / ARTEMIS AESTHETIC)
   ========================================================================= */

function createCapeTerrainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Atlantic Ocean with coastal gradient & surf
  const oceanGrad = ctx.createLinearGradient(0, 0, 1024, 0);
  oceanGrad.addColorStop(0, '#153243');
  oceanGrad.addColorStop(0.35, '#12485e');
  oceanGrad.addColorStop(0.55, '#1e6878');
  oceanGrad.addColorStop(0.65, '#288b8e');
  oceanGrad.addColorStop(0.70, '#42b0a8'); // Coastal shallows
  oceanGrad.addColorStop(0.72, '#d9c598'); // Sandy barrier beach
  oceanGrad.addColorStop(0.76, '#314e2c'); // Florida coastal wetlands
  oceanGrad.addColorStop(1, '#243e22');    // Merritt Island greenery
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, 1024, 1024);

  // Inland marsh waterways & lagoons (Banana River)
  ctx.fillStyle = '#183c48';
  ctx.beginPath();
  ctx.ellipse(890, 512, 55, 480, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(945, 280, 32, 220, -0.1, 0, Math.PI * 2);
  ctx.fill();

  // Florida scrub and pine vegetation canopy texture
  ctx.fillStyle = '#1e331c';
  for (let i = 0; i < 450; i++) {
    const rx = 740 + Math.random() * 270;
    const ry = Math.random() * 1024;
    const rw = 10 + Math.random() * 26;
    const rh = 6 + Math.random() * 18;
    ctx.fillRect(rx, ry, rw, rh);
  }

  // Pad 39B Concrete Octagonal Apron & Perimeter Road
  ctx.fillStyle = '#485258';
  ctx.beginPath();
  ctx.arc(512, 512, 140, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#606c72';
  ctx.beginPath();
  ctx.arc(512, 512, 110, 0, Math.PI * 2);
  ctx.fill();

  // Crawlerway: Dual 40-foot crushed river-rock tan lanes leading toward VAB
  ctx.strokeStyle = '#a48a60';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.moveTo(512, 512);
  ctx.bezierCurveTo(460, 620, 380, 780, 220, 960);
  ctx.stroke();

  ctx.strokeStyle = '#8f764e';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(524, 512);
  ctx.bezierCurveTo(472, 620, 392, 780, 232, 960);
  ctx.stroke();

  // Center grass median between crawler tracks
  ctx.strokeStyle = '#2b4226';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(518, 512);
  ctx.bezierCurveTo(466, 620, 386, 780, 226, 960);
  ctx.stroke();

  // Concrete flame trench channel & runoff pond
  ctx.fillStyle = '#1b2126';
  ctx.fillRect(504, 460, 16, 120);
  ctx.fillStyle = '#163842';
  ctx.beginPath();
  ctx.arc(420, 480, 38, 0, Math.PI * 2);
  ctx.fill();

  // Shoreline surf whitecaps
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 2.0;
  for (let y = 8; y < 1024; y += 16) {
    ctx.beginPath();
    ctx.moveTo(725 + Math.sin(y * 0.05) * 5, y);
    ctx.lineTo(732 + Math.sin(y * 0.05) * 5, y + 8);
    ctx.stroke();
  }

  const tex = new T.CanvasTexture(canvas);
  tex.wrapS = T.RepeatWrapping;
  tex.wrapT = T.RepeatWrapping;
  return tex;
}

function createCoreStageTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Artemis / SLS Orange SOFI Insulation Foam Base
  ctx.fillStyle = '#cf6124';
  ctx.fillRect(0, 0, 1024, 1024);

  // Micro-textured horizontal foam application rings
  ctx.fillStyle = 'rgba(235, 125, 55, 0.16)';
  for (let y = 0; y < 1024; y += 4) {
    if (y % 8 === 0) ctx.fillRect(0, y, 1024, 2);
  }

  // Circumferential tank structural weld bands
  for (let y = 110; y < 920; y += 135) {
    ctx.fillStyle = '#9c4415';
    ctx.fillRect(0, y, 1024, 4);
    ctx.fillStyle = '#e87838';
    ctx.fillRect(0, y + 4, 1024, 2);
  }

  // Vertical structural stringers (longitudinal ribs)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let x = 0; x < 1024; x += 16) {
    ctx.fillRect(x, 0, 1, 1024);
  }

  // Checkerboard Roll Calibration Target Markers (Forward and Aft)
  const drawCheckerboard = (startX, startY, size, cols, rows) => {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#11161a' : '#ffffff';
        ctx.fillRect(startX + c * size, startY + r * size, size, size);
      }
    }
  };
  drawCheckerboard(120, 75, 24, 4, 4);
  drawCheckerboard(632, 75, 24, 4, 4);
  drawCheckerboard(120, 885, 24, 4, 4);
  drawCheckerboard(632, 885, 24, 4, 4);

  // NASA Meatball Insignia (Blue circle, red chevron, orbital ring, white stars & text)
  const drawMeatball = (cx, cy, radius) => {
    ctx.fillStyle = '#0b3d91';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fc3d21';
    ctx.lineWidth = radius * 0.18;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.9, cy + radius * 0.4);
    ctx.lineTo(cx + radius * 0.1, cy - radius * 0.5);
    ctx.lineTo(cx + radius * 0.9, cy + radius * 0.6);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = radius * 0.08;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius * 0.9, radius * 0.4, -0.4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(radius * 0.48)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NASA', cx, cy);
  };
  drawMeatball(320, 360, 68);
  drawMeatball(832, 360, 68);

  // Stencils & Block Lettering
  ctx.fillStyle = '#11161a';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('UNITED STATES', 320, 480);
  ctx.fillText('UNITED STATES', 832, 480);

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 24px monospace';
  ctx.fillText('ODYSSEY 07 // PROJECT AURORA', 320, 520);
  ctx.fillText('ODYSSEY 07 // PROJECT AURORA', 832, 520);

  // American Flag
  const drawFlag = (fx, fy, fw, fh) => {
    for (let s = 0; s < 13; s++) {
      ctx.fillStyle = s % 2 === 0 ? '#b22234' : '#ffffff';
      ctx.fillRect(fx, fy + (s * fh) / 13, fw, fh / 13);
    }
    ctx.fillStyle = '#3c3b6e';
    ctx.fillRect(fx, fy, fw * 0.4, (fh * 7) / 13);
  };
  drawFlag(275, 560, 90, 52);
  drawFlag(787, 560, 90, 52);

  const tex = new T.CanvasTexture(canvas);
  return tex;
}

function createBoosterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Aerospace white composite casing
  ctx.fillStyle = '#f4f8fb';
  ctx.fillRect(0, 0, 512, 1024);

  // Segment joint pin bands (5-segment solid rocket motor)
  ctx.fillStyle = '#222830';
  for (let y = 180; y < 900; y += 150) {
    ctx.fillRect(0, y, 512, 8);
    // Pin heads
    ctx.fillStyle = '#7a8590';
    for (let x = 8; x < 512; x += 20) {
      ctx.fillRect(x, y + 2, 4, 4);
    }
    ctx.fillStyle = '#222830';
  }

  // Black Chevron roll alignment stripes
  ctx.fillStyle = '#11161a';
  for (let y = 140; y < 860; y += 300) {
    ctx.beginPath();
    ctx.moveTo(120, y);
    ctx.lineTo(150, y + 30);
    ctx.lineTo(120, y + 60);
    ctx.lineTo(90, y + 60);
    ctx.lineTo(120, y + 30);
    ctx.lineTo(90, y);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(376, y);
    ctx.lineTo(406, y + 30);
    ctx.lineTo(376, y + 60);
    ctx.lineTo(346, y + 60);
    ctx.lineTo(376, y + 30);
    ctx.lineTo(346, y);
    ctx.closePath();
    ctx.fill();
  }

  // Red NASA Worm Logo
  ctx.fillStyle = '#e03a24';
  ctx.font = '900 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NASA', 128, 420);
  ctx.fillText('NASA', 384, 420);

  // Booster separation motor (BSM) warning labels
  ctx.fillStyle = '#11161a';
  ctx.font = '700 13px monospace';
  ctx.fillText('BOOSTER SEP MOTOR // DANGER', 128, 120);
  ctx.fillText('BOOSTER SEP MOTOR // DANGER', 384, 120);

  const tex = new T.CanvasTexture(canvas);
  return tex;
}

function createFairingTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f5f9fc';
  ctx.fillRect(0, 0, 512, 512);

  // Acoustic insulation tile seam grid
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
  }
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(512, y); ctx.stroke();
  }

  // Clamshell split line seal
  ctx.fillStyle = '#20262b';
  ctx.fillRect(252, 0, 8, 512);

  // Project Aurora / Odyssey 07 Mission Crest
  const cx = 128, cy = 256;
  ctx.fillStyle = '#0a213a';
  ctx.beginPath();
  ctx.arc(cx, cy, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#00e5ff';
  ctx.font = '900 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PROJECT AURORA', cx, cy - 20);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 22px sans-serif';
  ctx.fillText('ODYSSEY 07', cx, cy + 10);

  ctx.fillStyle = '#ffbb00';
  ctx.font = '700 12px monospace';
  ctx.fillText('★ EXPLORATION ★', cx, cy + 34);

  // Mirror crest on right half
  ctx.drawImage(canvas, 0, 0, 256, 512, 256, 0, 256, 512);

  const tex = new T.CanvasTexture(canvas);
  return tex;
}

export class RocketLaunchSimulation {
  constructor({ container, destination, loadout, campaign, missionClass, launchVehicle, audio, onComplete, onCancel }) {
    this.container = container;
    this.destination = destination;
    this.loadout = loadout;
    this.campaign = campaign;
    this.missionClass = typeof missionClass === 'object' ? missionClass : (NASA_MISSION_CLASSES.find(c => c.id === missionClass) || NASA_MISSION_CLASSES[0]);
    this.launchVehicle = typeof launchVehicle === 'object' ? launchVehicle : (LAUNCH_VEHICLES.find(lv => lv.id === launchVehicle) || LAUNCH_VEHICLES[0]);
    this.audio = audio;
    this.onComplete = onComplete;
    this.onCancel = onCancel;

    this.disposed = false;
    this.time = 0;
    this.simSpeed = 1.0;
    this.missionTime = -5.0; // T-5s at start

    // Physical Flight State (calibrated for 2-minute cinematic progression)
    this.altitude = 0;         // meters (0 to 185,000 m)
    this.velocity = 0;         // m/s (0 to 7,850 m/s)
    this.downrange = 0;        // meters
    this.pitch = 90.0;         // degrees (90 = vertical pad, 0 = horizontal orbit)
    this.targetPitch = 90.0;   // optimal gravity turn corridor
    this.throttle = 1.0;       // 0.65 to 1.0
    this.dynamicPressure = 0;  // kPa
    this.aerodynamicStress = 0;// 0 to 100%
    this.mach = 0;
    this.propellantMass = 2100000; // kg
    this.dryMass = 280000;         // kg
    this.sasActive = true;

    // Staging State & Auto-Stage Fallback Timers
    this.phase = 'countdown';
    this.srbSeparated = false;
    this.fairingSeparated = false;
    this.spacecraftSeparated = false;
    this.stagePromptTime = 0;

    // Cloud Punch State
    this.cloudPunched = false;

    // Visual Objects & Particles
    this.srbObjects = [];
    this.fairingObjects = [];
    this.padSteamParticles = [];
    this.trailSmokeParticles = [];
    this.slipstreamStreaks = [];
    this.sparkParticles = [];
    this.cloudSprites = [];
    this.cryoVaporParticles = [];
    this.sparklerParticles = [];
    this.bsmPlumes = [];
    this.machDiamonds = [];

    // Cinematic Director System (Automated scenario-based broadcast cinematography)
    this.directorShot = 'pad_liftoff';
    this.directorShotName = 'PAD 39B UMBILICAL TRACKING';
    this.cameraMode = 'director';
    this.orbitYaw = 0.65;
    this.orbitPitch = 0.24;
    this.orbitDistance = 110;
    this.shakeIntensity = 0;

    // Steering Physics & Heavy Rotational Dynamics (2,000+ metric ton launch vehicle)
    this.pitchRate = 0; // deg/s angular velocity
    this.rollAngle = 0; // deg aerodynamic bank
    this.gimbalAngle = 0; // RS-25 TVC gimbal deflection in degrees (-5° to +5°)
    this.gimbalTarget = 0;
    this.keysHeld = { left: false, right: false };

    this.initAudioNodes();
    this.initScene();
    this.initDom();
    this.bindEvents();

    this.lastFrameTime = performance.now();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);

    this.commsLog('Houston / Flight Director', 'Odyssey 07 on Pad 39B. Cryogenic sound suppression armed. Terminal countdown activated.');
    if (this.audio && this.audio.playQuindar) this.audio.playQuindar('intro');
  }

  /* =========================================================================
     AUDIO SYNTHESIS (Procedural Launch Soundscape)
     ========================================================================= */
  initAudioNodes() {
    if (!this.audio || !this.audio.ctx) return;
    try {
      const ctx = this.audio.ctx;
      this.launchMaster = ctx.createGain();
      this.launchMaster.gain.setValueAtTime(0.001, ctx.currentTime);
      this.launchMaster.connect(this.audio.master || ctx.destination);

      // Low frequency rocket bass rumble
      this.rumbleOsc = ctx.createOscillator();
      this.rumbleOsc.type = 'sawtooth';
      this.rumbleOsc.frequency.setValueAtTime(38, ctx.currentTime);

      this.rumbleFilter = ctx.createBiquadFilter();
      this.rumbleFilter.type = 'lowpass';
      this.rumbleFilter.frequency.setValueAtTime(140, ctx.currentTime);
      this.rumbleFilter.Q.setValueAtTime(3.5, ctx.currentTime);

      this.rumbleGain = ctx.createGain();
      this.rumbleGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.rumbleOsc.connect(this.rumbleFilter);
      this.rumbleFilter.connect(this.rumbleGain);
      this.rumbleGain.connect(this.launchMaster);
      this.rumbleOsc.start();

      // Atmospheric roar noise
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.5;
      }
      this.noiseSource = ctx.createBufferSource();
      this.noiseSource.buffer = noiseBuffer;
      this.noiseSource.loop = true;

      this.noiseFilter = ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setValueAtTime(260, ctx.currentTime);
      this.noiseFilter.Q.setValueAtTime(1.8, ctx.currentTime);

      this.noiseGain = ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.001, ctx.currentTime);

      this.noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.launchMaster);
      this.noiseSource.start();
    } catch (e) {
      console.warn('Launch audio init error:', e);
    }
  }

  updateAudio(thrustLevel, inVacuum) {
    if (!this.launchMaster || !this.audio?.ctx) return;
    const ctx = this.audio.ctx;
    const t = ctx.currentTime;
    const effectiveThrust = (this.phase === 'countdown' && this.missionTime < 0) ? 0 : thrustLevel;
    const targetGain = effectiveThrust * (inVacuum ? 0.35 : 0.95);

    this.launchMaster.gain.setTargetAtTime(targetGain, t, 0.15);
    if (this.rumbleOsc) {
      const freq = 36 + effectiveThrust * 28 + (this.mach * 3.5);
      this.rumbleOsc.frequency.setTargetAtTime(clamp(freq, 32, 120), t, 0.1);
    }
    if (this.noiseFilter) {
      const filterFreq = 220 + effectiveThrust * 520 + (inVacuum ? -120 : (this.dynamicPressure * 14));
      this.noiseFilter.frequency.setTargetAtTime(clamp(filterFreq, 160, 2200), t, 0.1);
    }
    if (this.noiseGain) {
      this.noiseGain.gain.setTargetAtTime(effectiveThrust * (inVacuum ? 0.22 : 0.75), t, 0.1);
    }
    if (this.rumbleGain) {
      this.rumbleGain.gain.setTargetAtTime(effectiveThrust * 0.92, t, 0.1);
    }
  }

  playStagingSound() {
    if (!this.audio?.ctx) return;
    try {
      const ctx = this.audio.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + 0.45);
      gain.gain.setValueAtTime(0.85, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(this.launchMaster || ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) {}
  }

  /* =========================================================================
     THREE.JS 3D SCENE SETUP
     ========================================================================= */
  initScene() {
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x010309);
    this.scene.fog = new T.FogExp2(0x99d2f8, 0.00015);

    this.camera = new T.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 100000);
    this.camera.position.set(0, 15, 65);

    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = T.PCFSoftShadowMap;

    // Celestial Astronomical Sun Vector (East-Southeast, elevated ~20° over Atlantic orbital corridor)
    this.sunDir = new T.Vector3(0.52, 0.34, -0.78).normalize();

    // Lighting (Calibrated for bright atmosphere and high-contrast space)
    this.ambientLight = new T.AmbientLight(0xd9ebff, 1.15);
    this.scene.add(this.ambientLight);

    // Primary Direct Solar Sunlight (High-contrast space beam)
    this.sunLight = new T.DirectionalLight(0xfffaee, 3.8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024;
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.bias = -0.0001;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Secondary Earthshine (Albedo) Fill Light (Simulates cyan sunlight reflected from Earth's oceans & cloud deck)
    this.earthshineLight = new T.DirectionalLight(0x28a6f0, 0.0);
    this.scene.add(this.earthshineLight);
    this.scene.add(this.earthshineLight.target);

    this.hemiLight = new T.HemisphereLight(0x86b8ea, 0x1d2c38, 0.85);
    this.scene.add(this.hemiLight);

    // Build World Elements
    this.buildDeepSpaceEnvironment();
    this.buildCapeCanaveralEnvironment();
    this.buildLaunchPad39B();
    this.buildRocketModel();
    this.buildSoftCloudCanopy();
    this.buildOrbitalEarth();
    this.buildSunCelestialSystem();
    this.buildRocketVfx();
    this.buildSlipstreamStreaks();
  }

  /* =========================================================================
     1. CAPE CANAVERAL (MOVING-ORIGIN GROUND GROUP)
     ========================================================================= */
  buildCapeCanaveralEnvironment() {
    this.groundGroup = new T.Group();
    this.groundGroup.position.set(0, 0, 0);

    // Atlantic Ocean with specular sun reflection
    const oceanGeo = new T.PlaneGeometry(36000, 36000, 16, 16);
    const oceanMat = new T.MeshStandardMaterial({
      color: 0x143c52,
      roughness: 0.12,
      metalness: 0.88
    });
    this.ocean = new T.Mesh(oceanGeo, oceanMat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -1.6;
    this.ocean.receiveShadow = true;
    this.groundGroup.add(this.ocean);

    // Cape Canaveral textured coastal landmass (Merritt Island, lagoons, crawlerway, beaches)
    const capeGeo = new T.PlaneGeometry(9000, 12000);
    const capeTex = createCapeTerrainTexture();
    const capeMat = new T.MeshStandardMaterial({
      map: capeTex,
      roughness: 0.82,
      metalness: 0.12
    });
    this.cape = new T.Mesh(capeGeo, capeMat);
    this.cape.rotation.x = -Math.PI / 2;
    this.cape.position.set(-600, -1.2, -600);
    this.cape.receiveShadow = true;
    this.groundGroup.add(this.cape);

    // Launch Pad 39B Concrete Berm
    const bermGeo = new T.CylinderGeometry(140, 185, 7.5, 36);
    const bermMat = new T.MeshStandardMaterial({ color: 0x48524a, roughness: 0.88 });
    const berm = new T.Mesh(bermGeo, bermMat);
    berm.position.set(0, 2.8, 0);
    berm.receiveShadow = true;
    this.groundGroup.add(berm);

    // Distant VAB (Vehicle Assembly Building) with NASA logo
    const vabGroup = new T.Group();
    vabGroup.position.set(-2400, 90, -3100);

    const vabMat = new T.MeshStandardMaterial({ color: 0xc4d4dd, roughness: 0.6, metalness: 0.25 });
    const vab = new T.Mesh(new T.BoxGeometry(130, 180, 150), vabMat);
    vabGroup.add(vab);

    const flagPatch = new T.Mesh(
      new T.BoxGeometry(45, 60, 2),
      new T.MeshBasicMaterial({ color: 0x0b3d91 })
    );
    flagPatch.position.set(66, 30, 0);
    flagPatch.rotation.y = Math.PI / 2;
    vabGroup.add(flagPatch);

    this.groundGroup.add(vabGroup);

    this.scene.add(this.groundGroup);
  }

  /* =========================================================================
     0. DEEP SPACE ENVIRONMENT (CELESTIAL SPHERE, MILKY WAY & MULTI-TIER STARFIELD)
     ========================================================================= */
  buildDeepSpaceEnvironment() {
    this.celestialGroup = new T.Group();

    // 1. Procedural Milky Way Galactic Dust Nebula Band
    const mwCanvas = document.createElement('canvas');
    mwCanvas.width = 2048; mwCanvas.height = 1024;
    const mCtx = mwCanvas.getContext('2d');

    // Galactic Core & Cosmic Stardust Glow
    const coreGrad = mCtx.createRadialGradient(1024, 512, 0, 1024, 512, 600);
    coreGrad.addColorStop(0.0, 'rgba(215, 230, 255, 0.48)');
    coreGrad.addColorStop(0.18, 'rgba(150, 180, 240, 0.34)');
    coreGrad.addColorStop(0.42, 'rgba(68, 55, 115, 0.22)');
    coreGrad.addColorStop(0.70, 'rgba(18, 48, 75, 0.12)');
    coreGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    mCtx.fillStyle = coreGrad;
    mCtx.fillRect(0, 0, 2048, 1024);

    // Sweeping Galactic Plane Stardust Ribbon
    mCtx.save();
    mCtx.strokeStyle = 'rgba(70, 95, 150, 0.18)';
    mCtx.lineWidth = 140;
    mCtx.beginPath();
    mCtx.moveTo(0, 380);
    mCtx.bezierCurveTo(512, 620, 1536, 400, 2048, 640);
    mCtx.stroke();

    mCtx.strokeStyle = 'rgba(25, 70, 95, 0.15)';
    mCtx.lineWidth = 80;
    mCtx.beginPath();
    mCtx.moveTo(0, 390);
    mCtx.bezierCurveTo(512, 610, 1536, 410, 2048, 630);
    mCtx.stroke();

    // Dark Absorption Dust Lanes cutting through the core (Great Rift effect)
    mCtx.strokeStyle = 'rgba(2, 4, 10, 0.35)';
    mCtx.lineWidth = 22;
    mCtx.beginPath();
    mCtx.moveTo(750, 495);
    mCtx.bezierCurveTo(950, 520, 1150, 485, 1350, 530);
    mCtx.stroke();

    // 1,400 Micro Stardust Cluster points along the galactic equator
    for (let i = 0; i < 1400; i++) {
      const sx = Math.random() * 2048;
      const waveY = 512 + Math.sin(sx * 0.003) * 90 + (Math.random() - 0.5) * 110;
      const sr = 0.5 + Math.random() * 1.5;
      const sa = 0.2 + Math.random() * 0.6;
      mCtx.fillStyle = `rgba(220, 240, 255, ${sa})`;
      mCtx.beginPath();
      mCtx.arc(sx, waveY, sr, 0, Math.PI * 2);
      mCtx.fill();
    }
    mCtx.restore();

    const mwTex = new T.CanvasTexture(mwCanvas);
    mwTex.colorSpace = T.SRGBColorSpace;
    const mwGeo = new T.SphereGeometry(46000, 40, 24);
    const mwMat = new T.MeshBasicMaterial({
      map: mwTex,
      side: T.BackSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.milkyWayMesh = new T.Mesh(mwGeo, mwMat);
    this.celestialGroup.add(this.milkyWayMesh);

    // 2. High-Density Multi-Tier Starfield (6,200 celestial stars)
    const starCount = 6200;
    const starGeo = new T.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    const starCols = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      const r = 41000 + Math.random() * 6000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      starPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPos[idx + 2] = r * Math.cos(phi);

      const cRand = Math.random();
      if (cRand < 0.32) {
        // Hot O/B-type blue-white stars
        starCols[idx] = 0.78; starCols[idx + 1] = 0.88; starCols[idx + 2] = 1.0;
      } else if (cRand < 0.72) {
        // Brilliant pure white A/F stars
        starCols[idx] = 1.0; starCols[idx + 1] = 1.0; starCols[idx + 2] = 1.0;
      } else if (cRand < 0.88) {
        // Warm G-type solar stars
        starCols[idx] = 1.0; starCols[idx + 1] = 0.94; starCols[idx + 2] = 0.76;
      } else {
        // K/M-type orange/red giants
        starCols[idx] = 1.0; starCols[idx + 1] = 0.65; starCols[idx + 2] = 0.45;
      }
    }
    starGeo.setAttribute('position', new T.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new T.BufferAttribute(starCols, 3));

    const starMat = new T.PointsMaterial({
      vertexColors: true,
      size: 2.1,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.stars = new T.Points(starGeo, starMat);
    this.celestialGroup.add(this.stars);

    // 3. 90 Prominent Navigational Alpha Stars
    const alphaCount = 90;
    const alphaGeo = new T.BufferGeometry();
    const alphaPos = new Float32Array(alphaCount * 3);
    const alphaCols = new Float32Array(alphaCount * 3);
    for (let i = 0; i < alphaCount; i++) {
      const idx = i * 3;
      const r = 43000 + Math.random() * 2000;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      alphaPos[idx] = r * Math.sin(phi) * Math.cos(theta);
      alphaPos[idx + 1] = r * Math.sin(phi) * Math.sin(theta);
      alphaPos[idx + 2] = r * Math.cos(phi);
      alphaCols[idx] = 0.92; alphaCols[idx + 1] = 0.96; alphaCols[idx + 2] = 1.0;
    }
    alphaGeo.setAttribute('position', new T.BufferAttribute(alphaPos, 3));
    alphaGeo.setAttribute('color', new T.BufferAttribute(alphaCols, 3));
    const alphaMat = new T.PointsMaterial({
      vertexColors: true,
      size: 4.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    this.alphaStars = new T.Points(alphaGeo, alphaMat);
    this.celestialGroup.add(this.alphaStars);

    this.scene.add(this.celestialGroup);
  }

  /* =========================================================================
     2. LAUNCH COMPLEX 39B (MLP, LATTICE TOWER, SWING ARMS, WATER TOWER)
     ========================================================================= */
  buildLaunchPad39B() {
    this.padGroup = new T.Group();

    const steelMat = new T.MeshStandardMaterial({ color: 0x3e4952, roughness: 0.5, metalness: 0.65 });
    const darkSteelMat = new T.MeshStandardMaterial({ color: 0x202830, roughness: 0.7, metalness: 0.5 });
    const towerRedMat = new T.MeshStandardMaterial({ color: 0xa33228, roughness: 0.55, metalness: 0.45 });
    const pipeMat = new T.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3, metalness: 0.85 });
    const whiteTankMat = new T.MeshStandardMaterial({ color: 0xeff5fa, roughness: 0.35, metalness: 0.3 });

    // Mobile Launcher Platform (MLP) Deck
    const mlp = new T.Mesh(new T.BoxGeometry(42, 8.5, 38), steelMat);
    mlp.position.set(0, 8.25, 0);
    mlp.castShadow = true;
    mlp.receiveShadow = true;
    this.padGroup.add(mlp);

    // Blast deck railings (safety yellow)
    const railMat = new T.MeshBasicMaterial({ color: 0xffcc00 });
    for (const rx of [-20.5, 20.5]) {
      const rail = new T.Mesh(new T.BoxGeometry(0.3, 1.2, 36), railMat);
      rail.position.set(rx, 13, 0);
      this.padGroup.add(rail);
    }

    // Flame Trench & Inverted-V Flame Deflector
    const trenchMat = new T.MeshStandardMaterial({ color: 0x151a1e, roughness: 0.95 });
    const trenchNorth = new T.Mesh(new T.BoxGeometry(16, 9, 52), trenchMat);
    trenchNorth.position.set(0, 3.5, 0);
    this.padGroup.add(trenchNorth);

    const deflectorGeo = new T.ConeGeometry(7, 10, 4);
    deflectorGeo.rotateY(Math.PI / 4);
    const deflectorMat = new T.MeshStandardMaterial({ color: 0x2b333a, roughness: 0.8, metalness: 0.6 });
    const deflector = new T.Mesh(deflectorGeo, deflectorMat);
    deflector.position.set(0, 2, 0);
    this.padGroup.add(deflector);

    // Tail Service Masts (TSMs) with Cryogenic Umbilicals at rocket base
    const tsmMat = new T.MeshStandardMaterial({ color: 0x90a4ae, roughness: 0.4, metalness: 0.7 });
    for (const tsmX of [-3.8, 3.8]) {
      const tsm = new T.Mesh(new T.BoxGeometry(2.4, 7.5, 3.2), tsmMat);
      tsm.position.set(tsmX, 16, 3.8);
      tsm.castShadow = true;
      this.padGroup.add(tsm);

      const cryoPipe = new T.Mesh(new T.CylinderGeometry(0.25, 0.25, 3.2, 12), pipeMat);
      cryoPipe.rotation.x = Math.PI / 2.8;
      cryoPipe.position.set(tsmX, 17, 2.2);
      this.padGroup.add(cryoPipe);
    }

    // Hold-down Support Posts under SRBs
    for (const hx of [-4.5, 4.5]) {
      for (const hz of [-1.2, 1.2]) {
        const post = new T.Mesh(new T.BoxGeometry(1.0, 3.2, 1.0), darkSteelMat);
        post.position.set(hx, 14.1, hz);
        this.padGroup.add(post);
      }
    }

    // Mobile Launcher Red Lattice Tower
    const towerLattice = new T.Group();
    towerLattice.position.set(-14, 12, 0);

    const colGeo = new T.BoxGeometry(1.2, 92, 1.2);
    const c1 = new T.Mesh(colGeo, towerRedMat); c1.position.set(-4, 46, -4); towerLattice.add(c1);
    const c2 = new T.Mesh(colGeo, towerRedMat); c2.position.set(4, 46, -4); towerLattice.add(c2);
    const c3 = new T.Mesh(colGeo, towerRedMat); c3.position.set(-4, 46, 4); towerLattice.add(c3);
    const c4 = new T.Mesh(colGeo, towerRedMat); c4.position.set(4, 46, 4); towerLattice.add(c4);

    for (let h = 8; h <= 88; h += 7) {
      const deck = new T.Mesh(new T.BoxGeometry(10, 0.6, 10), darkSteelMat);
      deck.position.set(0, h, 0);
      towerLattice.add(deck);

      const strut1 = new T.Mesh(new T.BoxGeometry(0.4, 8.5, 0.4), towerRedMat);
      strut1.position.set(4, h + 3.5, 0);
      strut1.rotation.z = 0.5;
      towerLattice.add(strut1);

      const strut2 = new T.Mesh(new T.BoxGeometry(0.4, 8.5, 0.4), towerRedMat);
      strut2.position.set(-4, h + 3.5, 0);
      strut2.rotation.z = -0.5;
      towerLattice.add(strut2);
    }

    // Top Gantry Crane Boom
    const craneBoom = new T.Mesh(new T.BoxGeometry(28, 2.5, 3.2), towerRedMat);
    craneBoom.position.set(-2, 95, 0);
    towerLattice.add(craneBoom);

    // Crew Access Arm (CAA) & White Room at capsule level
    const caaArm = new T.Mesh(new T.BoxGeometry(11, 2.2, 2.2), towerRedMat);
    caaArm.position.set(5.5, 78, 0);
    towerLattice.add(caaArm);
    const whiteRoom = new T.Mesh(new T.BoxGeometry(3.2, 3.2, 3.2), whiteTankMat);
    whiteRoom.position.set(11, 78, 0);
    towerLattice.add(whiteRoom);

    this.padGroup.add(towerLattice);

    // Retractable Umbilical Swing Arms
    this.swingArms = [];
    const armConfigs = [
      { y: 68, len: 11 },
      { y: 52, len: 9 },
      { y: 28, len: 8 }
    ];

    armConfigs.forEach((cfg) => {
      const armGroup = new T.Group();
      armGroup.position.set(-10, cfg.y, 0);

      const armMesh = new T.Mesh(new T.BoxGeometry(cfg.len, 1.8, 1.8), steelMat);
      armMesh.position.set(cfg.len / 2, 0, 0);
      armGroup.add(armMesh);

      const hose = new T.Mesh(new T.CylinderGeometry(0.18, 0.18, 2.4, 8), darkSteelMat);
      hose.position.set(cfg.len, -1.0, 0);
      armGroup.add(hose);

      this.padGroup.add(armGroup);
      this.swingArms.push(armGroup);
    });

    // 3 Towering Pad 39B Lightning Pylons with Aviation Warning Paint
    const mastPositions = [
      [-55, 0, 45],
      [-55, 0, -45],
      [-75, 0, 0]
    ];
    mastPositions.forEach(([mx, my, mz]) => {
      const pylonGroup = new T.Group();
      pylonGroup.position.set(mx, 0, mz);

      const mastMat1 = new T.MeshStandardMaterial({ color: 0xeff5fa, roughness: 0.35, metalness: 0.4 });
      const mastMat2 = new T.MeshStandardMaterial({ color: 0xd84315, roughness: 0.4, metalness: 0.3 });

      for (let s = 0; s < 5; s++) {
        const seg = new T.Mesh(
          new T.CylinderGeometry(0.6 + (4 - s) * 0.25, 0.8 + (4 - s) * 0.25, 24, 12),
          s % 2 === 0 ? mastMat1 : mastMat2
        );
        seg.position.y = 12 + s * 24;
        pylonGroup.add(seg);
      }

      const rod = new T.Mesh(new T.CylinderGeometry(0.08, 0.2, 14, 8), steelMat);
      rod.position.y = 138;
      pylonGroup.add(rod);

      const strobe = new T.Mesh(new T.SphereGeometry(0.6, 8, 8), new T.MeshBasicMaterial({ color: 0xff2222 }));
      strobe.position.y = 145;
      pylonGroup.add(strobe);

      this.padGroup.add(pylonGroup);
    });

    // Pad 39B Sound Suppression Water Sphere (Iconic 290-ft Water Tower)
    const waterTowerGroup = new T.Group();
    waterTowerGroup.position.set(-135, 0, -115);

    // 4 Heavy Trestle Support Legs
    for (const lx of [-10, 10]) {
      for (const lz of [-10, 10]) {
        const leg = new T.Mesh(new T.BoxGeometry(1.6, 68, 1.6), steelMat);
        leg.position.set(lx, 34, lz);
        waterTowerGroup.add(leg);
      }
    }
    for (let by = 18; by <= 54; by += 18) {
      const brace = new T.Mesh(new T.BoxGeometry(22, 0.8, 22), darkSteelMat);
      brace.position.set(0, by, 0);
      waterTowerGroup.add(brace);
    }

    // Elevated 300,000 Gallon Water Sphere
    const sphereGeo = new T.SphereGeometry(15, 32, 24);
    const sphereMesh = new T.Mesh(sphereGeo, whiteTankMat);
    sphereMesh.position.set(0, 78, 0);
    sphereMesh.castShadow = true;
    waterTowerGroup.add(sphereMesh);

    // Center downcomer pipe to pad
    const downcomer = new T.Mesh(new T.CylinderGeometry(2.2, 2.2, 68, 16), pipeMat);
    downcomer.position.set(0, 34, 0);
    waterTowerGroup.add(downcomer);

    // Massive 7-ft diameter main water pipe leading from tower to flame trench
    const mainPipe = new T.Mesh(new T.CylinderGeometry(1.8, 1.8, 145, 16), pipeMat);
    mainPipe.rotation.z = Math.PI / 2;
    mainPipe.rotation.y = 0.72;
    mainPipe.position.set(65, 3.5, 55);
    waterTowerGroup.add(mainPipe);

    this.padGroup.add(waterTowerGroup);
    this.groundGroup.add(this.padGroup);
  }

  /* =========================================================================
     3. ROCKET MODEL (NASA ARTEMIS LIVERY, 4 RS-25s, TWIN SRBs, FAIRING)
     ========================================================================= */
  buildRocketModel() {
    this.rocketGroup = new T.Group();
    this.rocketGroup.position.set(0, 12.0, 0);

    const coreTex = createCoreStageTexture();
    const orangeCryoMat = new T.MeshStandardMaterial({
      map: coreTex,
      roughness: 0.65,
      metalness: 0.15
    });
    const whiteRocketMat = new T.MeshStandardMaterial({
      color: 0xeff5fa,
      roughness: 0.35,
      metalness: 0.42
    });
    const darkInterstageMat = new T.MeshStandardMaterial({
      color: 0x1b232b,
      roughness: 0.45,
      metalness: 0.65
    });
    const engineNozzleMat = new T.MeshStandardMaterial({
      color: 0x222a30,
      roughness: 0.28,
      metalness: 0.92
    });
    const pipeMat = new T.MeshStandardMaterial({ color: 0x78909c, roughness: 0.3, metalness: 0.85 });

    // Core Stage
    this.coreStage = new T.Group();

    const coreCylinder = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, 42, 32), orangeCryoMat);
    coreCylinder.position.set(0, 21, 0);
    coreCylinder.castShadow = true;
    this.coreStage.add(coreCylinder);

    // Systems tunnels and pressurization feedlines with support brackets
    for (const angle of [0, Math.PI]) {
      const feedline = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 38, 12), whiteRocketMat);
      feedline.position.set(Math.sin(angle) * 2.82, 21, Math.cos(angle) * 2.82);
      this.coreStage.add(feedline);

      for (let by = 6; by <= 36; by += 6) {
        const bracket = new T.Mesh(new T.BoxGeometry(0.5, 0.3, 0.3), darkInterstageMat);
        bracket.position.set(Math.sin(angle) * 2.8, by, Math.cos(angle) * 2.8);
        this.coreStage.add(bracket);
      }
    }

    // Avionics raceways (wiring conduit)
    const racewayMat = new T.MeshStandardMaterial({ color: 0x20262b, roughness: 0.5 });
    for (const rAngle of [Math.PI / 2, -Math.PI / 2]) {
      const raceway = new T.Mesh(new T.BoxGeometry(0.2, 40, 0.35), racewayMat);
      raceway.position.set(Math.sin(rAngle) * 2.78, 21, Math.cos(rAngle) * 2.78);
      this.coreStage.add(raceway);
    }

    const forwardSkirt = new T.Mesh(new T.CylinderGeometry(2.7, 2.7, 7, 32), whiteRocketMat);
    forwardSkirt.position.set(0, 45.5, 0);
    this.coreStage.add(forwardSkirt);

    const boattail = new T.Mesh(new T.CylinderGeometry(2.7, 2.35, 4.5, 32), darkInterstageMat);
    boattail.position.set(0, -1.5, 0);
    this.coreStage.add(boattail);

    // 4 RS-25 Main Engines with regenerative cooling manifolds & titanium bells
    this.coreEngines = [];
    const engineOffsets = [
      [-1.15, -1.15],
      [1.15, -1.15],
      [-1.15, 1.15],
      [1.15, 1.15]
    ];
    for (const [ox, oz] of engineOffsets) {
      const enginePivot = new T.Group();
      enginePivot.position.set(ox, -3.8, oz);

      const actuator = new T.Mesh(new T.BoxGeometry(0.4, 1.2, 0.4), darkInterstageMat);
      actuator.position.set(0, 0.3, 0);
      enginePivot.add(actuator);

      const nozzle = new T.Mesh(new T.CylinderGeometry(0.38, 0.78, 2.6, 20, 1, true), engineNozzleMat);
      nozzle.position.set(0, -1.3, 0);
      enginePivot.add(nozzle);

      const manifold = new T.Mesh(new T.TorusGeometry(0.56, 0.06, 8, 20), pipeMat);
      manifold.rotation.x = Math.PI / 2;
      manifold.position.set(0, -0.6, 0);
      enginePivot.add(manifold);

      const glow = new T.Mesh(new T.SphereGeometry(0.32, 12, 12), new T.MeshBasicMaterial({ color: 0x55ccff }));
      glow.position.set(0, -0.6, 0);
      enginePivot.add(glow);

      this.coreStage.add(enginePivot);
      this.coreEngines.push(enginePivot);
    }

    this.rocketGroup.add(this.coreStage);

    // Twin Solid Rocket Boosters (SRBs)
    this.srbLeft = this.createBooster(-4.5, whiteRocketMat, darkInterstageMat, engineNozzleMat);
    this.srbRight = this.createBooster(4.5, whiteRocketMat, darkInterstageMat, engineNozzleMat);
    this.rocketGroup.add(this.srbLeft);
    this.rocketGroup.add(this.srbRight);
    this.srbObjects = [this.srbLeft, this.srbRight];

    // Payload Fairings (with Project Aurora mission crest and acoustic tile pattern)
    this.fairingGroup = new T.Group();
    this.fairingGroup.position.set(0, 49, 0);

    const fairingTex = createFairingTexture();
    const fairingMat = new T.MeshStandardMaterial({
      map: fairingTex,
      roughness: 0.35,
      metalness: 0.32
    });

    this.fairingLeft = this.createFairingHalf(-1, fairingMat);
    this.fairingRight = this.createFairingHalf(1, fairingMat);
    this.fairingGroup.add(this.fairingLeft);
    this.fairingGroup.add(this.fairingRight);
    this.rocketGroup.add(this.fairingGroup);
    this.fairingObjects = [this.fairingLeft, this.fairingRight];

    // Odyssey 07 Spacecraft (Pre-assembled vehicle)
    this.spacecraftMount = new T.Group();
    this.spacecraftMount.position.set(0, 54, 0);

    const adapter = new T.Mesh(new T.CylinderGeometry(1.6, 2.5, 3.2, 24), darkInterstageMat);
    adapter.position.set(0, -1.8, 0);
    this.spacecraftMount.add(adapter);

    this.spacecraft = assembledVehicle(this.loadout);
    this.spacecraft.scale.set(0.24, 0.24, 0.24);
    this.spacecraft.rotation.x = -Math.PI / 2;
    this.spacecraft.position.set(0, 1.4, 0);

    if (this.spacecraft.userData?.flames) {
      this.spacecraft.userData.flames.forEach(f => { f.visible = false; });
    }

    this.spacecraftMount.add(this.spacecraft);
    this.rocketGroup.add(this.spacecraftMount);

    this.scene.add(this.rocketGroup);
  }

  createBooster(xPos, whiteMat, darkMat, nozzleMat) {
    const srb = new T.Group();
    srb.position.set(xPos, 16, 0);

    const boosterTex = createBoosterTexture();
    const boosterMat = new T.MeshStandardMaterial({
      map: boosterTex,
      roughness: 0.35,
      metalness: 0.4
    });

    const casing = new T.Mesh(new T.CylinderGeometry(0.95, 0.95, 36, 24), boosterMat);
    casing.castShadow = true;
    srb.add(casing);

    // Segment joint rings (field joint pin bands)
    for (let r = -14; r <= 14; r += 7) {
      const jointRing = new T.Mesh(new T.TorusGeometry(0.97, 0.05, 8, 24), darkMat);
      jointRing.rotation.x = Math.PI / 2;
      jointRing.position.y = r;
      srb.add(jointRing);
    }

    // Systems tunnel running vertically down the booster
    const sysTunnel = new T.Mesh(new T.BoxGeometry(0.25, 36, 0.35), darkMat);
    sysTunnel.position.set(Math.sign(xPos) * 0.95, 0, 0);
    srb.add(sysTunnel);

    // Aerodynamic Nose Cone
    const nose = new T.Mesh(new T.ConeGeometry(0.95, 5.2, 24), whiteMat);
    nose.position.set(0, 20.6, 0);
    srb.add(nose);

    // 4 Forward Booster Separation Motor (BSM) Pods on Nose
    const bsmPodMat = new T.MeshStandardMaterial({ color: 0x11161a, roughness: 0.6 });
    for (let i = 0; i < 4; i++) {
      const bsmPod = new T.Mesh(new T.CylinderGeometry(0.14, 0.18, 0.8, 8), bsmPodMat);
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      bsmPod.position.set(Math.cos(angle) * 0.92, 19.8, Math.sin(angle) * 0.92);
      bsmPod.rotation.z = Math.sign(xPos) * 0.6;
      srb.add(bsmPod);
    }

    // Aft Skirt with TVC Actuator Fairings
    const skirt = new T.Mesh(new T.CylinderGeometry(0.95, 1.25, 3.0, 24), darkMat);
    skirt.position.set(0, -19.5, 0);
    srb.add(skirt);

    // 4 Aft BSM Separation Thruster Pods on Skirt
    for (let i = 0; i < 4; i++) {
      const bsmAft = new T.Mesh(new T.CylinderGeometry(0.12, 0.16, 0.7, 8), bsmPodMat);
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      bsmAft.position.set(Math.cos(angle) * 1.15, -19.0, Math.sin(angle) * 1.15);
      bsmAft.rotation.z = Math.sign(xPos) * 0.6;
      srb.add(bsmAft);
    }

    // Hold-down post brackets at base
    for (let hp of [-0.9, 0.9]) {
      const bracket = new T.Mesh(new T.BoxGeometry(0.4, 0.8, 0.5), darkMat);
      bracket.position.set(hp, -20.6, 0);
      srb.add(bracket);
    }

    // Rocket Nozzle with gimbal pivot
    const nozzle = new T.Mesh(new T.CylinderGeometry(0.55, 1.15, 3.2, 16, 1, true), nozzleMat);
    nozzle.position.set(0, -22.2, 0);
    srb.add(nozzle);

    srb.userData.initialX = xPos;
    srb.userData.vx = 0;
    srb.userData.vy = 0;
    srb.userData.rotZ = 0;

    return srb;
  }

  createFairingHalf(side, mat) {
    const half = new T.Group();
    const thetaStart = side === 1 ? -Math.PI / 2 : Math.PI / 2;

    const barrelGeo = new T.CylinderGeometry(2.7, 2.7, 11, 24, 1, false, thetaStart, Math.PI);
    const barrelMesh = new T.Mesh(barrelGeo, mat);
    barrelMesh.position.set(0, 5.5, 0);
    half.add(barrelMesh);

    // Interior Gold Foil Thermal Acoustic Insulation
    const goldFoilMat = new T.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.25,
      metalness: 0.95,
      side: T.BackSide
    });
    const interiorBarrel = new T.Mesh(barrelGeo.clone(), goldFoilMat);
    interiorBarrel.position.set(0, 5.5, 0);
    half.add(interiorBarrel);

    const coneGeo = new T.ConeGeometry(2.7, 9.5, 24, 1, false, thetaStart, Math.PI);
    coneGeo.translate(0, 4.75, 0);
    const coneMesh = new T.Mesh(coneGeo, mat);
    coneMesh.position.set(0, 11, 0);
    half.add(coneMesh);

    const interiorCone = new T.Mesh(coneGeo.clone(), goldFoilMat);
    interiorCone.position.set(0, 11, 0);
    half.add(interiorCone);

    half.userData.side = side;
    half.userData.vx = 0;
    half.userData.vz = 0;
    half.userData.rotZ = 0;

    return half;
  }

  /* =========================================================================
     4. SOFT PROCEDURAL CLOUD CANOPY (2.5 KM VOLUMETRIC LAYER)
     ========================================================================= */
  buildSoftCloudCanopy() {
    this.cloudGroup = new T.Group();
    this.cloudGroup.position.set(0, 2500, 0);

    // Procedural soft circular cloud gradient texture
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.7, 'rgba(240, 248, 255, 0.2)');
    grad.addColorStop(1, 'rgba(240, 248, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    const cloudTex = new T.CanvasTexture(canvas);

    const cloudMat = new T.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.85,
      blending: T.NormalBlending,
      depthWrite: false
    });

    // 140 Overlapping cloud puffs forming a realistic 3D volumetric deck across Florida
    for (let i = 0; i < 140; i++) {
      const sprite = new T.Sprite(cloudMat.clone());
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 8500;
      const hOffset = (Math.random() - 0.5) * 650;
      sprite.position.set(
        Math.cos(angle) * dist,
        hOffset,
        Math.sin(angle) * dist
      );
      const s = 700 + Math.random() * 950;
      sprite.scale.set(s, s * 0.65, 1);
      this.cloudGroup.add(sprite);
      this.cloudSprites.push(sprite);
    }

    this.scene.add(this.cloudGroup);
  }

  /* =========================================================================
     5. DETAILED ORBITAL EARTH (CONTINENTS, OCEANS, ATMOSPHERIC LIMB)
     ========================================================================= */
  buildOrbitalEarth() {
    this.earthGroup = new T.Group();
    this.earthRadius = 6800;
    this.earthGroup.position.set(0, -this.earthRadius - 380, -600);
    this.earthGroup.visible = false;

    // High-resolution Earth Sphere
    const earthGeo = new T.SphereGeometry(this.earthRadius, 96, 64);
    const earthMat = new T.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.04
    });

    // 1. Procedural Realistic Fallback Canvas (Instant, avoids any black frame before JPEG decodes)
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 1024; fallbackCanvas.height = 512;
    const fCtx = fallbackCanvas.getContext('2d');
    fCtx.fillStyle = '#082544';
    fCtx.fillRect(0, 0, 1024, 512);
    // Subtle coastal shallows
    fCtx.fillStyle = '#10526e';
    fCtx.beginPath();
    fCtx.ellipse(285, 175, 120, 85, 0, 0, Math.PI * 2);
    fCtx.fill();
    // Continents
    fCtx.fillStyle = '#224a28';
    fCtx.beginPath();
    fCtx.ellipse(280, 170, 105, 75, 0, 0, Math.PI * 2);
    fCtx.fill();
    // Swirling cloud deck
    fCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let i = 0; i < 28; i++) {
      fCtx.beginPath();
      fCtx.ellipse((i * 47) % 1024, 60 + (i * 17) % 390, 140 + (i * 19) % 180, 16 + (i * 7) % 24, ((i % 5) - 2) * 0.06, 0, Math.PI * 2);
      fCtx.fill();
    }
    const fallbackTex = new T.CanvasTexture(fallbackCanvas);
    fallbackTex.colorSpace = T.SRGBColorSpace;
    earthMat.map = fallbackTex;

    // 2. Load Real Photorealistic NASA Blue Marble Earth Texture (textures/earth.jpg)
    const texLoader = new T.TextureLoader();
    const applyRealTexture = (tex) => {
      if (!tex || this.disposed) return;
      tex.colorSpace = T.SRGBColorSpace;
      tex.anisotropy = 8;
      earthMat.map = tex;
      earthMat.roughness = 0.55;
      earthMat.metalness = 0.14;
      earthMat.needsUpdate = true;
    };

    texLoader.load('./textures/earth.jpg', applyRealTexture, undefined, () => {
      texLoader.load('/textures/earth.jpg', applyRealTexture, undefined, () => {
        texLoader.load('/src/game/dist/textures/earth.jpg', applyRealTexture);
      });
    });

    this.earthSphere = new T.Mesh(earthGeo, earthMat);
    // Align Florida & the Atlantic Ocean with Cape Canaveral LC-39B launch corridor
    this.earthSphere.rotation.x = 0.36;
    this.earthSphere.rotation.y = -1.72;
    this.earthGroup.add(this.earthSphere);

    // 3. Authentic Rayleigh Atmospheric Rim (Two-tone Rayleigh limb with sunset amber terminator)
    const atmoGeo = new T.SphereGeometry(this.earthRadius * 1.018, 96, 64);
    const atmoMat = new T.ShaderMaterial({
      uniforms: {
        glowColor: { value: new T.Color(0x00c8ff) },
        sunDir: { value: this.sunDir.clone() },
        eyePos: { value: this.camera.position.clone() }
      },
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform vec3 sunDir;
        uniform vec3 eyePos;
        varying vec3 vWorldNormal;
        varying vec3 vWorldPosition;
        void main() {
          vec3 viewDir = normalize(eyePos - vWorldPosition);
          float rim = 1.0 - max(0.0, dot(vWorldNormal, viewDir));
          float rimIntensity = pow(rim, 3.4);
          float sunDot = dot(vWorldNormal, sunDir);
          float sunFactor = clamp(sunDot * 0.75 + 0.38, 0.0, 1.0);
          vec3 dayColor = vec3(0.0, 0.82, 1.0);
          vec3 sunsetColor = vec3(1.0, 0.46, 0.14);
          vec3 atmosphericColor = mix(sunsetColor, dayColor, smoothstep(-0.12, 0.28, sunDot));
          gl_FragColor = vec4(atmosphericColor, rimIntensity * sunFactor * 0.96);
        }
      `,
      transparent: true,
      blending: T.AdditiveBlending,
      side: T.FrontSide,
      depthWrite: false
    });
    this.atmoLimb = new T.Mesh(atmoGeo, atmoMat);
    this.earthGroup.add(this.atmoLimb);

    this.scene.add(this.earthGroup);
  }

  /* =========================================================================
     6. CELESTIAL SUN SYSTEM (PHOTOSPHERE, CORONA & ANAMORPHIC DIFFRACTION FLARE)
     ========================================================================= */
  buildSunCelestialSystem() {
    this.sunGroup = new T.Group();

    // 1. Incandescent Solar Photosphere (Blinding White Core Disk)
    const coreGeo = new T.SphereGeometry(480, 32, 32);
    const coreMat = new T.MeshBasicMaterial({ color: 0xffffff, depthWrite: false });
    this.sunCoreMesh = new T.Mesh(coreGeo, coreMat);
    this.sunGroup.add(this.sunCoreMesh);

    // 2. Solar Chromosphere Glow Shell
    const chromoGeo = new T.SphereGeometry(680, 32, 32);
    const chromoMat = new T.MeshBasicMaterial({
      color: 0xffea85,
      transparent: true,
      opacity: 0.86,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    this.sunChromoMesh = new T.Mesh(chromoGeo, chromoMat);
    this.sunGroup.add(this.sunChromoMesh);

    // 3. Radiant Multi-Stop Solar Corona Sprite
    const coronaCanvas = document.createElement('canvas');
    coronaCanvas.width = 512; coronaCanvas.height = 512;
    const cCtx = coronaCanvas.getContext('2d');
    const cGrad = cCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
    cGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    cGrad.addColorStop(0.12, 'rgba(255, 248, 205, 0.98)');
    cGrad.addColorStop(0.28, 'rgba(255, 205, 75, 0.82)');
    cGrad.addColorStop(0.50, 'rgba(255, 135, 25, 0.36)');
    cGrad.addColorStop(0.74, 'rgba(240, 70, 10, 0.12)');
    cGrad.addColorStop(1.0, 'rgba(180, 15, 0, 0.0)');
    cCtx.fillStyle = cGrad;
    cCtx.fillRect(0, 0, 512, 512);

    const coronaTex = new T.CanvasTexture(coronaCanvas);
    coronaTex.colorSpace = T.SRGBColorSpace;
    const coronaMat = new T.SpriteMaterial({
      map: coronaTex,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    this.sunCorona = new T.Sprite(coronaMat);
    this.sunCorona.scale.set(6800, 6800, 1);
    this.sunGroup.add(this.sunCorona);

    // 4. Cinematic Anamorphic Lens Flare & 6-Point Starburst Diffraction Optics
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = 1024; flareCanvas.height = 1024;
    const fCtx = flareCanvas.getContext('2d');

    // (a) Horizontal Anamorphic Glare Streak (Apollo/Falcon 9 flight cam lens flare)
    const hGrad = fCtx.createLinearGradient(0, 512, 1024, 512);
    hGrad.addColorStop(0.0, 'rgba(80, 200, 255, 0.0)');
    hGrad.addColorStop(0.32, 'rgba(110, 215, 255, 0.28)');
    hGrad.addColorStop(0.46, 'rgba(245, 250, 255, 0.88)');
    hGrad.addColorStop(0.50, 'rgba(255, 255, 255, 1.0)');
    hGrad.addColorStop(0.54, 'rgba(245, 250, 255, 0.88)');
    hGrad.addColorStop(0.68, 'rgba(110, 215, 255, 0.28)');
    hGrad.addColorStop(1.0, 'rgba(80, 200, 255, 0.0)');
    fCtx.fillStyle = hGrad;
    fCtx.fillRect(0, 503, 1024, 18);

    // (b) 6 Diffraction Spikes (at 0, 60, 120, 180, 240, 300 degrees)
    fCtx.save();
    fCtx.translate(512, 512);
    for (let angle of [0, Math.PI / 3, (2 * Math.PI) / 3]) {
      fCtx.save();
      fCtx.rotate(angle);
      const sGrad = fCtx.createLinearGradient(-512, 0, 512, 0);
      sGrad.addColorStop(0.0, 'rgba(255, 210, 120, 0)');
      sGrad.addColorStop(0.38, 'rgba(255, 225, 140, 0.30)');
      sGrad.addColorStop(0.50, 'rgba(255, 255, 255, 0.98)');
      sGrad.addColorStop(0.62, 'rgba(255, 225, 140, 0.30)');
      sGrad.addColorStop(1.0, 'rgba(255, 210, 120, 0)');
      fCtx.fillStyle = sGrad;
      fCtx.fillRect(-512, -3.5, 1024, 7);
      fCtx.restore();
    }

    // (c) Iridescent Chromatic Halo Ring
    fCtx.strokeStyle = 'rgba(120, 220, 255, 0.16)';
    fCtx.lineWidth = 4;
    fCtx.beginPath();
    fCtx.arc(0, 0, 240, 0, Math.PI * 2);
    fCtx.stroke();
    fCtx.strokeStyle = 'rgba(255, 190, 80, 0.12)';
    fCtx.lineWidth = 2.5;
    fCtx.beginPath();
    fCtx.arc(0, 0, 246, 0, Math.PI * 2);
    fCtx.stroke();
    fCtx.restore();

    const flareTex = new T.CanvasTexture(flareCanvas);
    flareTex.colorSpace = T.SRGBColorSpace;
    const flareMat = new T.SpriteMaterial({
      map: flareTex,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false
    });
    this.sunFlare = new T.Sprite(flareMat);
    this.sunFlare.scale.set(15000, 15000, 1);
    this.sunGroup.add(this.sunFlare);

    // Initial Placement at Astronomical Optical Infinity along sunDir
    this.sunGroup.position.copy(this.camera.position).addScaledVector(this.sunDir, 26000);
    this.scene.add(this.sunGroup);
  }

  buildSunCorona() {
    this.buildSunCelestialSystem();
  }

  /* =========================================================================
     7. SUPERSONIC SLIPSTREAM VAPOR STREAKS
     ========================================================================= */
  buildSlipstreamStreaks() {
    this.streakGroup = new T.Group();
    const streakGeo = new T.CylinderGeometry(0.08, 0.08, 16, 6);
    streakGeo.translate(0, 8, 0);
    const streakMat = new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: T.AdditiveBlending
    });

    for (let i = 0; i < 65; i++) {
      const streak = new T.Mesh(streakGeo, streakMat.clone());
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.5 + Math.random() * 12.0;
      streak.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 60,
        Math.sin(angle) * radius
      );
      this.streakGroup.add(streak);
      this.slipstreamStreaks.push(streak);
    }
    this.rocketGroup.add(this.streakGroup);
  }

  /* =========================================================================
     8. VFX (PLUMES, MACH DIAMONDS, BLOOM, DELUGE STEAM, SHOCK CONE)
     ========================================================================= */
  buildRocketVfx() {
    this.flames = [];
    this.machDiamonds = [];

    // Core RS-25 Main Hydrogen Flame Mantle
    const coreFlameGeo = new T.ConeGeometry(2.1, 16, 20, 1, true);
    coreFlameGeo.translate(0, -8, 0);
    const coreFlameMat = new T.MeshBasicMaterial({
      color: 0xff8c2b,
      transparent: true,
      opacity: 0.9,
      blending: T.AdditiveBlending
    });
    this.coreFlameMesh = new T.Mesh(coreFlameGeo, coreFlameMat);
    this.coreFlameMesh.position.set(0, -4.0, 0);
    this.coreStage.add(this.coreFlameMesh);
    this.flames.push(this.coreFlameMesh);

    // 4 Individual RS-25 Supersonic Shock Diamonds (Mach Diamond Chains)
    const engineOffsets = [
      [-1.15, -1.15],
      [1.15, -1.15],
      [-1.15, 1.15],
      [1.15, 1.15]
    ];
    for (const [ox, oz] of engineOffsets) {
      const coneGeo = new T.ConeGeometry(0.38, 5.5, 12, 1, true);
      coneGeo.translate(0, -2.75, 0);
      const coneMat = new T.MeshBasicMaterial({
        color: 0x48e5ff,
        transparent: true,
        opacity: 0.92,
        blending: T.AdditiveBlending
      });
      const cone = new T.Mesh(coneGeo, coneMat);
      cone.position.set(ox, -4.2, oz);
      this.coreStage.add(cone);
      this.flames.push(cone);

      for (let d = 0; d < 3; d++) {
        const dGeo = new T.ConeGeometry(0.22 - d * 0.04, 0.75, 8);
        dGeo.rotateX(Math.PI);
        const dMat = new T.MeshBasicMaterial({
          color: 0xaaffff,
          transparent: true,
          opacity: 0.95,
          blending: T.AdditiveBlending
        });
        const diamond = new T.Mesh(dGeo, dMat);
        diamond.position.set(ox, -5.2 - d * 1.3, oz);
        this.coreStage.add(diamond);
        this.machDiamonds.push({ mesh: diamond, baseY: -5.2 - d * 1.3, phase: d * 1.4 });
      }
    }

    // Vacuum Plume Expansion Bell
    const bloomGeo = new T.ConeGeometry(9.5, 30, 24, 1, true);
    bloomGeo.translate(0, -15, 0);
    const bloomMat = new T.MeshBasicMaterial({
      color: 0x44bbff,
      transparent: true,
      opacity: 0.0,
      blending: T.AdditiveBlending
    });
    this.plumeBloomMesh = new T.Mesh(bloomGeo, bloomMat);
    this.plumeBloomMesh.position.set(0, -4.0, 0);
    this.coreStage.add(this.plumeBloomMesh);

    // Multi-Layer Solid Rocket Booster (SRB) Plumes (White incandescent core + fiery mantle)
    const srbFlameGeo = new T.ConeGeometry(2.4, 25, 20, 1, true);
    srbFlameGeo.translate(0, -12.5, 0);
    const srbFlameMat = new T.MeshBasicMaterial({
      color: 0xffa028,
      transparent: true,
      opacity: 0.92,
      blending: T.AdditiveBlending
    });

    const srbCoreGeo = new T.ConeGeometry(1.3, 18, 16, 1, true);
    srbCoreGeo.translate(0, -9, 0);
    const srbCoreMat = new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      blending: T.AdditiveBlending
    });

    // Left SRB
    this.srbFlameLeft = new T.Mesh(srbFlameGeo, srbFlameMat);
    this.srbFlameLeft.position.set(0, -22.5, 0);
    const srbCoreLeft = new T.Mesh(srbCoreGeo, srbCoreMat);
    this.srbFlameLeft.add(srbCoreLeft);
    this.srbLeft.add(this.srbFlameLeft);
    this.flames.push(this.srbFlameLeft);

    // Right SRB
    this.srbFlameRight = new T.Mesh(srbFlameGeo, srbFlameMat.clone());
    this.srbFlameRight.position.set(0, -22.5, 0);
    const srbCoreRight = new T.Mesh(srbCoreGeo, srbCoreMat.clone());
    this.srbFlameRight.add(srbCoreRight);
    this.srbRight.add(this.srbFlameRight);
    this.flames.push(this.srbFlameRight);

    // Transonic Shock Collar
    const collarGeo = new T.TorusGeometry(3.8, 0.65, 12, 36);
    const collarMat = new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      blending: T.AdditiveBlending
    });
    this.shockCollar = new T.Mesh(collarGeo, collarMat);
    this.shockCollar.rotation.x = Math.PI / 2;
    this.shockCollar.position.set(0, 48, 0);
    this.rocketGroup.add(this.shockCollar);

    this.exhaustLight = new T.PointLight(0xffa733, 5.5, 220);
    this.exhaustLight.position.set(0, -6, 0);
    this.rocketGroup.add(this.exhaustLight);
  }

  /* =========================================================================
     DOM HUD & TELEMETRY OVERLAY
     ========================================================================= */
  initDom() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'rocket-launch-overlay';
    this.overlay.innerHTML = `
      <!-- Cloud Penetration Flash Vignette -->
      <div id="cloud-mist-overlay" class="cloud-mist-flash"></div>

      <!-- NASA Optical Long-Range Tracking Camera Reticle (Pad Cam) -->
      <div id="pad-optics-overlay" class="pad-optics-overlay active">
        <div class="optics-reticle">
          <div class="optics-crosshair-h"></div>
          <div class="optics-crosshair-v"></div>
          <div class="optics-box"></div>
          <div class="optics-bracket tl"></div>
          <div class="optics-bracket tr"></div>
          <div class="optics-bracket bl"></div>
          <div class="optics-bracket br"></div>
        </div>
        <div class="optics-data">
          <span>KSC OPTICAL TRACKER 39B-2 // 1200mm F/8</span>
          <span id="optics-telemetry">AZ: 090.0°  EL: +04.2°  RANGE: 3,420 M</span>
          <span class="lock-tag">● AUTO-LOCK [NOMINAL]</span>
        </div>
      </div>

      <div class="launch-hud-container">
        <!-- Slim Floating Top Bar (Single-line Ribbon) -->
        <div class="launch-top-bar">
          <div class="launch-brand">
            <span class="meatball-dot"></span>
            <div>
              <strong>NASA KSC // LC-39B</strong>
              <small id="launch-vehicle-header-subtitle">${this.launchVehicle.name.toUpperCase()} • ${this.missionClass.name}</small>
            </div>
          </div>

          <!-- Integrated Center Flight Status Ribbon (MET + Stage Title) -->
          <div class="launch-top-center-cluster">
            <div class="timer-badge">
              <span class="timer-label">MET</span>
              <span id="launch-met" class="timer-val">T-00:05</span>
            </div>
            <div id="launch-phase-banner" class="phase-banner">
              <span class="eyebrow" id="launch-phase-eyebrow">COUNTDOWN</span>
              <h2 id="launch-phase-title">IGNITION SEQUENCE</h2>
            </div>
            <!-- Cinematic Director Badge -->
            <div class="launch-director-badge" id="launch-director-badge">
              <span class="director-rec-dot"></span>
              <strong id="director-cam-title">PAD 39B TRACKING</strong>
            </div>
          </div>

          <!-- Actions & Controls -->
          <div class="launch-top-actions">
            <button id="launch-hud-toggle-btn" class="outline-btn-small" title="Toggle HUD Display (H)">HUD [H]</button>
            <button id="launch-speed-btn" class="outline-btn-small" title="Toggle Simulation Speed">1X</button>
            <button id="launch-skip-btn" class="launch-skip-btn" title="Skip to Orbit (ESC)">SKIP ⏭</button>
          </div>
        </div>

        <!-- Compact Telemetry Clusters (Corner Glass Wings, Center 100% Unobstructed) -->
        <div class="launch-telemetry-grid">
          <!-- Left Column: Compact Flight Telemetry -->
          <div class="telemetry-col left-gauges">
            <div class="telemetry-card">
              <div class="telemetry-compact-row">
                <span class="telemetry-label">ALT</span>
                <div class="telemetry-val-group">
                  <strong id="launch-alt-val">0.0</strong>
                  <small>KM</small>
                </div>
              </div>
              <div class="gauge-track">
                <div id="launch-alt-bar" class="gauge-fill" style="width: 0%"></div>
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-compact-row">
                <span class="telemetry-label">VEL</span>
                <div class="telemetry-val-group">
                  <strong id="launch-vel-val">0</strong>
                  <small>M/S</small>
                </div>
              </div>
              <div class="gauge-track">
                <div id="launch-vel-bar" class="gauge-fill" style="width: 0%"></div>
              </div>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-compact-row">
                <span class="telemetry-label">MACH</span>
                <div class="telemetry-val-group">
                  <strong id="launch-mach-val">0.00</strong>
                  <small id="launch-mach-tag" class="mach-tag">SUBSONIC</small>
                </div>
              </div>
            </div>

            <div class="telemetry-card" id="card-stress">
              <div class="telemetry-compact-row">
                <span class="telemetry-label">STRESS</span>
                <div class="telemetry-val-group">
                  <strong id="launch-stress-val">12%</strong>
                  <small id="launch-stress-tag" class="stress-tag nominal">NOMINAL</small>
                </div>
              </div>
              <div class="gauge-track">
                <div id="launch-stress-bar" class="gauge-fill stress-fill" style="width: 12%"></div>
              </div>
            </div>
          </div>

          <!-- Center Column (100% CLEAR - Unobstructed 3D Viewport) -->
          <div class="launch-center-hud"></div>

          <!-- Right Column: Dynamics & Staging -->
          <div class="telemetry-col right-gauges">
            <div class="telemetry-card" id="card-max-q">
              <div class="telemetry-compact-row">
                <span class="telemetry-label">DYN PRESS (Q)</span>
                <div class="telemetry-val-group">
                  <strong id="launch-q-val">0.0</strong>
                  <small>KPA</small>
                </div>
              </div>
              <div class="gauge-track">
                <div id="launch-q-bar" class="gauge-fill q-fill" style="width: 0%"></div>
              </div>
              <span id="launch-q-status" class="sub-metric">ATMOSPHERE</span>
            </div>

            <div class="telemetry-card">
              <div class="telemetry-compact-row">
                <span class="telemetry-label">FUEL</span>
                <div class="telemetry-val-group">
                  <strong id="launch-prop-val">100%</strong>
                  <small id="launch-twr-val">TWR: 1.55</small>
                </div>
              </div>
              <div class="gauge-track">
                <div id="launch-prop-bar" class="gauge-fill" style="width: 100%"></div>
              </div>
            </div>

            <!-- Staging Mini-Pills -->
            <div class="stages-status-card">
              <div class="stage-pill active" id="status-pill-srb">
                <span>01</span>
                <b>BOOSTERS</b>
                <small id="status-tag-srb">BURNING</small>
              </div>
              <div class="stage-pill standby" id="status-pill-fairing">
                <span>02</span>
                <b id="status-pill-fairing-title">FAIRING</b>
                <small id="status-tag-fairing">COVER</small>
              </div>
              <div class="stage-pill standby" id="status-pill-spacecraft">
                <span>03</span>
                <b>SEPARATION</b>
                <small id="status-tag-spacecraft">DOCKED</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Bottom Controls & Flight Director Comms (Floating Split Glass Pods) -->
        <div class="launch-bottom-bar">
          <div class="launch-comms-box">
            <div class="comm-avatar">◈</div>
            <div class="comm-text-wrap">
              <div class="comm-header">
                <strong id="launch-comm-speaker">HOUSTON // FLIGHT DIRECTOR</strong>
                <span class="comm-live-tag">LIVE LINK</span>
              </div>
              <p id="launch-comm-text">Odyssey 07 launch vehicle on Pad 39B. Countdown sequence activated.</p>
            </div>
          </div>

          <div class="launch-pilot-cluster">
            <!-- Pitch Corridor Guidance (Integrated snugly above controls) -->
            <div class="pitch-corridor-box">
              <div class="corridor-row">
                <span>PITCH: <b id="launch-pitch-val">90.0°</b></span>
                <span>TARGET: <b id="launch-target-pitch">90.0°</b></span>
                <span id="sas-status-tag" class="sas-active">SAS ON</span>
              </div>
              <div class="corridor-bar-track">
                <div id="launch-pitch-pointer" class="pitch-pointer"></div>
                <div class="corridor-optimal-zone"></div>
              </div>
            </div>

            <div class="launch-pilot-actions">
              <button id="launch-sas-toggle-btn" class="outline-button active">
                SAS: <b>[ON]</b>
              </button>
              <button id="launch-throttle-btn" class="outline-button">
                THROTTLE: <b id="launch-throttle-text">100%</b>
              </button>
              <div class="steering-arrows">
                <button id="launch-steer-left" class="small-arrow-btn" aria-label="Steer Pitch Left">‹ [A]</button>
                <span>STEER</span>
                <button id="launch-steer-right" class="small-arrow-btn" aria-label="Steer Pitch Right">[D] ›</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Staging Action Prompt - Docked Unobtrusively at Bottom-Right HUD with ample breathing room -->
        <div id="launch-action-prompt" class="launch-action-prompt docked" hidden>
          <div class="prompt-icon">⚡</div>
          <div class="prompt-text">
            <b id="launch-prompt-title">STAGE SEPARATION READY</b>
            <span id="launch-prompt-desc">Press [SPACE] or Click to Jettison Boosters</span>
            <div class="auto-stage-bar-wrap">
              <div id="launch-auto-stage-bar" class="auto-stage-fill" style="width: 0%"></div>
            </div>
          </div>
          <button id="launch-stage-trigger-btn" class="launch-stage-btn" title="Execute Staging (SPACE)">
            <kbd>SPACE</kbd>
            <span id="launch-trigger-label">JETTISON</span>
          </button>
        </div>
      </div>
    `;

    this.container.appendChild(this.renderer.domElement);
    this.container.appendChild(this.overlay);
  }

  /* =========================================================================
     USER INTERACTION & CAMERA BINDINGS
     ========================================================================= */
  bindEvents() {
    this.onKeyDown = (e) => {
      if (e.key === 'h' || e.key === 'H') {
        this.toggleHud();
        return;
      }
      if (e.key === 'Escape') {
        this.completeLaunch();
        return;
      }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.triggerCurrentStagingAction();
      }

      // Continuous Weighted Steering (A / D / Left / Right)
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        this.keysHeld.left = true;
        if (this.sasActive) {
          this.sasActive = false;
          this.updateSasButton();
        }
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        this.keysHeld.right = true;
        if (this.sasActive) {
          this.sasActive = false;
          this.updateSasButton();
        }
      }
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        this.throttle = Math.min(1.0, this.throttle + 0.05);
        this.updateThrottleText();
      }
      if (e.key === 's' || e.key === 'S' || e.key === 'ArrowDown') {
        this.throttle = Math.max(0.65, this.throttle - 0.05);
        this.updateThrottleText();
      }
    };

    this.onKeyUp = (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        this.keysHeld.left = false;
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        this.keysHeld.right = false;
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Mouse drag for Free Orbit Cam during orbital phases
    const dom = this.renderer.domElement;
    this.onMouseDown = (e) => {
      this.isDraggingMouse = true;
      this.previousMousePos = { x: e.clientX, y: e.clientY };
    };
    this.onMouseMove = (e) => {
      if (!this.isDraggingMouse) return;
      const dx = e.clientX - this.previousMousePos.x;
      const dy = e.clientY - this.previousMousePos.y;
      this.previousMousePos = { x: e.clientX, y: e.clientY };

      this.orbitYaw -= dx * 0.006;
      this.orbitPitch = clamp(this.orbitPitch + dy * 0.005, -0.4, 1.2);
    };
    this.onMouseUp = () => { this.isDraggingMouse = false; };
    this.onWheel = (e) => {
      this.orbitDistance = clamp(this.orbitDistance + e.deltaY * 0.08, 60, 280);
    };

    dom.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    dom.addEventListener('wheel', this.onWheel, { passive: true });

    // HUD Cinema Toggle Button
    const hudToggleBtn = this.overlay.querySelector('#launch-hud-toggle-btn');
    if (hudToggleBtn) {
      hudToggleBtn.onclick = () => this.toggleHud();
    }

    // Speed / Warp Button
    const speedBtn = this.overlay.querySelector('#launch-speed-btn');
    if (speedBtn) {
      speedBtn.onclick = () => {
        this.simSpeed = this.simSpeed === 1.0 ? 2.0 : this.simSpeed === 2.0 ? 4.0 : 1.0;
        speedBtn.textContent = `SPEED: ${this.simSpeed}X`;
      };
    }

    // Skip Button
    const skipBtn = this.overlay.querySelector('#launch-skip-btn');
    if (skipBtn) skipBtn.onclick = () => this.completeLaunch();

    // Stage Action Button
    const stageBtn = this.overlay.querySelector('#launch-stage-trigger-btn');
    if (stageBtn) stageBtn.onclick = () => this.triggerCurrentStagingAction();

    // SAS Toggle Button
    const sasBtn = this.overlay.querySelector('#launch-sas-toggle-btn');
    if (sasBtn) {
      sasBtn.onclick = () => {
        this.sasActive = !this.sasActive;
        this.updateSasButton();
      };
    }

    // Throttle Button
    const throttleBtn = this.overlay.querySelector('#launch-throttle-btn');
    if (throttleBtn) {
      throttleBtn.onclick = () => {
        this.throttle = this.throttle > 0.8 ? 0.7 : 1.0;
        this.updateThrottleText();
      };
    }

    // Continuous Steering Buttons (Mouse / Touch holding support)
    const steerL = this.overlay.querySelector('#launch-steer-left');
    if (steerL) {
      const startL = (e) => {
        e.preventDefault();
        this.keysHeld.left = true;
        if (this.sasActive) {
          this.sasActive = false;
          this.updateSasButton();
        }
      };
      const stopL = () => { this.keysHeld.left = false; };
      steerL.addEventListener('pointerdown', startL);
      steerL.addEventListener('pointerup', stopL);
      steerL.addEventListener('pointerleave', stopL);
    }

    const steerR = this.overlay.querySelector('#launch-steer-right');
    if (steerR) {
      const startR = (e) => {
        e.preventDefault();
        this.keysHeld.right = true;
        if (this.sasActive) {
          this.sasActive = false;
          this.updateSasButton();
        }
      };
      const stopR = () => { this.keysHeld.right = false; };
      steerR.addEventListener('pointerdown', startR);
      steerR.addEventListener('pointerup', stopR);
      steerR.addEventListener('pointerleave', stopR);
    }

    // Resize
    this.onResize = () => {
      if (this.disposed) return;
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', this.onResize);
  }

  setDirectorShot(shotId, title) {
    if (this.directorShot === shotId) return;
    this.directorShot = shotId;
    this.directorShotName = title;
    const titleEl = this.overlay.querySelector('#director-cam-title');
    if (titleEl) titleEl.textContent = title;
    const opticsOverlay = this.overlay.querySelector('#pad-optics-overlay');
    if (opticsOverlay) {
      opticsOverlay.classList.toggle('active', shotId === 'pad_liftoff');
    }
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
  }

  toggleHud() {
    this.hudMinimal = !this.hudMinimal;
    this.overlay.classList.toggle('hud-minimal', this.hudMinimal);
    const btn = this.overlay.querySelector('#launch-hud-toggle-btn');
    if (btn) btn.textContent = this.hudMinimal ? 'HUD: OFF' : 'HUD [H]';
  }

  updateSasButton() {
    const btn = this.overlay.querySelector('#launch-sas-toggle-btn');
    const tag = this.overlay.querySelector('#sas-status-tag');
    if (btn) {
      btn.className = `outline-button ${this.sasActive ? 'active' : ''}`;
      btn.innerHTML = `SAS: <b>[${this.sasActive ? 'ON' : 'MANUAL'}]</b>`;
    }
    if (tag) {
      tag.className = this.sasActive ? 'sas-active' : 'sas-manual';
      tag.textContent = this.sasActive ? 'SAS AUTO-PILOT ENGAGED' : 'MANUAL FLIGHT OVERRIDE';
    }
  }

  updateThrottleText() {
    const el = this.overlay.querySelector('#launch-throttle-text');
    if (el) el.textContent = `${Math.round(this.throttle * 100)}%`;
  }

  /* =========================================================================
     STAGING STATE MACHINE
     ========================================================================= */
  triggerCurrentStagingAction() {
    if (this.phase === 'srb_flight' || this.phase === 'srb_sep') {
      this.separateSRBs();
    } else if (this.phase === 'fairing_flight' || this.phase === 'fairing_sep') {
      this.separateFairings();
    } else if (this.phase === 'meco' || this.phase === 'spacecraft_sep') {
      this.separateSpacecraft();
    } else if (this.spacecraftSeparated || this.phase === 'in_orbit') {
      this.completeLaunch();
    }
  }

  separateSRBs() {
    if (this.srbSeparated) return;
    this.srbSeparated = true;
    this.phase = 'fairing_flight';
    this.playStagingSound();
    this.shakeIntensity = 2.4;
    this.spawnStagingSparks(this.rocketGroup.position);
    this.spawnBsmPlumes();

    this.srbLeft.userData.vx = -6.5;
    this.srbLeft.userData.vy = -1.8;
    this.srbLeft.userData.rotZ = 0.09;

    this.srbRight.userData.vx = 6.5;
    this.srbRight.userData.vy = -1.8;
    this.srbRight.userData.rotZ = -0.09;

    this.srbFlameLeft.visible = false;
    this.srbFlameRight.visible = false;

    this.commsLog('Houston / Capcom', 'Booster burnout. Solid rocket booster separation confirmed! Core stage burning nominal.');
    this.hidePrompt();
  }

  separateFairings() {
    if (this.fairingSeparated) return;
    this.fairingSeparated = true;
    this.phase = 'orbital_burn';
    this.playStagingSound();
    this.shakeIntensity = 1.5;
    this.spawnStagingSparks(this.rocketGroup.position.clone().add(new T.Vector3(0, 52, 0)));

    this.fairingLeft.userData.vx = -9.2;
    this.fairingLeft.userData.vz = -3.2;
    this.fairingLeft.userData.rotZ = 0.08;

    this.fairingRight.userData.vx = 9.2;
    this.fairingRight.userData.vz = 3.2;
    this.fairingRight.userData.rotZ = -0.08;

    this.setCameraMode('orbit');
    this.commsLog('Flight Director', `Passing Kármán line (100 km). ${this.launchVehicle.fairingDiameter} payload fairing jettison confirmed! Spacecraft exposed to orbital vacuum.`);
    this.hidePrompt();
  }

  separateSpacecraft() {
    if (this.spacecraftSeparated) return;
    this.spacecraftSeparated = true;
    this.phase = 'in_orbit';
    this.hidePrompt();
    this.playStagingSound();
    this.shakeIntensity = 1.2;
    this.spawnStagingSparks(this.rocketGroup.position.clone().add(new T.Vector3(0, 56, 0)));

    this.coreFlameMesh.visible = false;
    this.plumeBloomMesh.visible = false;

    this.spacecraftMount.remove(this.spacecraft);
    this.spacecraft.position.copy(this.rocketGroup.position).add(new T.Vector3(0, 56, 0));
    this.spacecraft.quaternion.copy(this.rocketGroup.quaternion);
    this.scene.add(this.spacecraft);

    this.spacecraftVelocity = new T.Vector3(0, 2.2, 0).applyQuaternion(this.rocketGroup.quaternion);

    this.setCameraMode('orbit');
    this.commsLog('Flight Dynamics Officer', 'Odyssey 07 spacecraft separation confirmed! Orbital insertion complete. All systems nominal.');

    // Transition smoothly to active space mission flight
    setTimeout(() => {
      this.completeLaunch();
    }, 3500);
  }

  showPrompt(title, desc, buttonLabel) {
    const prompt = this.overlay.querySelector('#launch-action-prompt');
    if (!prompt) return;
    this.overlay.querySelector('#launch-prompt-title').textContent = title;
    this.overlay.querySelector('#launch-prompt-desc').textContent = desc;
    this.overlay.querySelector('#launch-trigger-label').textContent = buttonLabel;
    prompt.hidden = false;
    this.stagePromptTime = this.time;
  }

  hidePrompt() {
    const prompt = this.overlay.querySelector('#launch-action-prompt');
    if (prompt) prompt.hidden = true;
    this.stagePromptTime = 0;
  }

  commsLog(speaker, text) {
    const sp = this.overlay.querySelector('#launch-comm-speaker');
    const tx = this.overlay.querySelector('#launch-comm-text');
    if (sp) sp.textContent = speaker.toUpperCase();
    if (tx) tx.textContent = text;
    if (this.audio && this.audio.speak && this.audio.voice) {
      this.audio.speak(text);
    }
  }

  spawnStagingSparks(center) {
    for (let i = 0; i < 30; i++) {
      const geo = new T.SphereGeometry(0.25, 4, 4);
      const mat = new T.MeshBasicMaterial({ color: 0xffe680 });
      const spark = new T.Mesh(geo, mat);
      spark.position.copy(center);
      spark.userData.vel = new T.Vector3(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 16
      );
      spark.userData.life = 1.0;
      this.scene.add(spark);
      this.sparkParticles.push(spark);
    }
  }

  /* =========================================================================
     ANIMATION & PHYSICS LOOP (EXACT 2-MINUTE PACING)
     ========================================================================= */
  animate(now) {
    if (this.disposed) return;
    const rawDt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;
    const dt = rawDt * this.simSpeed;
    this.time += dt;

    this.stepPhysics(dt);
    this.updateVfxAndParticles(dt);
    this.updateAtmosphereAndLighting(dt);
    this.updateHud();
    this.updateCamera(rawDt);

    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  }

  stepPhysics(dt) {
    this.missionTime += dt;

    // Countdown (T-5 to T-0s)
    if (this.phase === 'countdown') {
      if (this.missionTime >= -4.5 && this.missionTime < 0) {
        this.spawnHydrogenSparklers(dt);
      }
      if (this.missionTime < 2.0 && this.altitude < 80) {
        this.spawnCryoVapor(dt);
      }
      if (this.missionTime >= -3.5 && this.swingArms) {
        this.swingArms.forEach((arm, i) => {
          arm.rotation.y = Math.min(Math.PI * 0.42, arm.rotation.y + dt * (0.35 + i * 0.05));
        });
      }
      if (this.missionTime >= -2.0) {
        this.spawnPadSteam(dt * 5);
      }
      if (this.missionTime >= 0) {
        this.phase = 'liftoff';
        this.shakeIntensity = 2.8;
        this.commsLog('Flight Director', '3, 2, 1, 0... ALL ENGINES RUNNING... LIFTOFF! We have liftoff of Odyssey 07!');
      }
      this.updateAudio(this.missionTime > -2 ? 0.8 : 0.05, false);
      return;
    }

    if (this.altitude < 120 && this.missionTime < 6.0) {
      this.spawnCryoVapor(dt * 0.4);
    }

    // ACCELERATION & FLIGHT DYNAMICS (Calibrated for ~115s total mission ascent)
    let thrustAccel = 0;
    if (!this.spacecraftSeparated && this.phase !== 'meco' && this.phase !== 'in_orbit') {
      const baseThrust = (this.srbSeparated ? 132.0 : 42.0) * this.throttle;
      thrustAccel = baseThrust;
    }

    // Optimal NASA Gravity Turn Curve
    const altRatio = clamp(this.altitude / 165000, 0, 1);
    this.targetPitch = clamp(90 - Math.pow(altRatio, 0.72) * 90, 0, 90);

    // ROTATIONAL INERTIA & TVC GIMBAL DYNAMICS (2,000+ Ton Launch Vehicle)
    let steerCmd = 0;
    if (this.keysHeld.left) steerCmd += 1.0;   // Pilot command pitch up
    if (this.keysHeld.right) steerCmd -= 1.0;  // Pilot command pitch down

    if (this.sasActive) {
      // SAS Autopilot: Proportional-Derivative guidance toward optimal gravity turn corridor
      const pitchError = this.targetPitch - this.pitch;
      this.gimbalTarget = clamp(pitchError * 0.4 - this.pitchRate * 0.35, -4.5, 4.5);
    } else {
      // Manual Piloting Override: Direct TVC gimbal deflection (-5° to +5°)
      this.gimbalTarget = steerCmd * 5.0;
    }

    // Hydraulic Gimbal Actuator Speed (~16 deg/s actuator rate)
    const actuatorRate = 16.0;
    const gimbalDelta = this.gimbalTarget - this.gimbalAngle;
    this.gimbalAngle += clamp(gimbalDelta, -actuatorRate * dt, actuatorRate * dt);

    // Rocket Moment of Inertia & Engine TVC Torque
    const engineThrustNorm = (this.srbSeparated ? 1.0 : 1.75) * this.throttle;
    const tvcTorque = this.gimbalAngle * engineThrustNorm * 1.9;

    // Aerodynamic restoring & damping moment based on dynamic pressure Q
    const aeroDamping = (0.75 + this.dynamicPressure * 0.04) * this.pitchRate;

    // Angular acceleration: alpha = (tau_tvc - tau_damping) / I
    const angularAccel = (tvcTorque - aeroDamping) * 0.95;
    this.pitchRate += angularAccel * dt;
    this.pitchRate = clamp(this.pitchRate, -7.5, 7.5);

    // Integrate vehicle pitch angle with heavy momentum
    this.pitch = clamp(this.pitch + this.pitchRate * dt, 0, 90);

    // Dynamic aerodynamic banking roll during maneuvers
    const targetRoll = clamp(-this.pitchRate * 2.2, -18, 18);
    this.rollAngle += (targetRoll - this.rollAngle) * dt * 2.6;

    // Gravity & Atmospheric Drag
    const grav = 9.81 * Math.pow(6371000 / (6371000 + this.altitude), 2);
    const pitchRad = (this.pitch * Math.PI) / 180;

    const rho = 1.225 * Math.exp(-this.altitude / 7800);
    this.dynamicPressure = (0.5 * rho * Math.pow(this.velocity, 2)) / 1000;

    const angleOfAttack = Math.abs(this.pitch - this.targetPitch);
    const stressBase = (this.dynamicPressure / 35) * 60;
    const stressAoA = (angleOfAttack / 12) * 40 * (this.dynamicPressure / 20);
    this.aerodynamicStress = clamp(Math.round(stressBase + stressAoA), 5, 100);

    const dragArea = 22.0;
    const dragCoeff = this.mach > 0.9 && this.mach < 1.3 ? 0.45 : 0.28;
    const dragForce = 0.5 * rho * Math.pow(this.velocity, 2) * dragArea * dragCoeff;
    const dragAccel = dragForce / (this.dryMass + this.propellantMass);

    const ax = thrustAccel * Math.cos(pitchRad);
    const ay = thrustAccel * Math.sin(pitchRad) - (this.srbSeparated ? 0 : grav) - dragAccel;

    this.velocity += Math.max(0, Math.sqrt(ax * ax + ay * ay) * dt);
    const altMult = this.srbSeparated ? 0.72 : 1.35;
    this.altitude += (this.velocity * Math.sin(pitchRad)) * dt * altMult;
    this.downrange += (this.velocity * Math.cos(pitchRad)) * dt * 1.15;

    this.mach = this.velocity / 340;

    // Propellant burn
    const burnRate = (this.srbSeparated ? 1800 : 8500) * this.throttle;
    this.propellantMass = Math.max(0, this.propellantMass - burnRate * dt);

    // Cloud Punch Trigger (around 2,400 m)
    if (!this.cloudPunched && this.altitude >= 2200 && this.altitude <= 3500) {
      this.cloudPunched = true;
      this.triggerCloudPunchEffect();
    }

    // CHECKPOINTS & TIMELINE
    // 1. Max-Q (~12-16 km, ~T+34s)
    if (this.phase === 'liftoff' && this.altitude > 12000) {
      this.phase = 'max_q';
      this.shakeIntensity = 2.4;
      this.commsLog('Flight Dynamics', 'Vehicle passing through Max-Q. Throttle bucket nominal. Maximum aerodynamic pressure.');
    }
    // 2. Approaching booster burnout (~32 km, ~T+48s)
    else if (this.phase === 'max_q' && this.altitude > 32000) {
      this.phase = 'srb_flight';
      this.commsLog('Capcom', 'Approaching solid rocket booster burnout. Standby for staging.');
    }
    // 3. SRB Separation (~45 km, ~T+54s)
    else if (this.phase === 'srb_flight' && this.altitude > 44000 && !this.srbSeparated) {
      this.phase = 'srb_sep';
      this.showPrompt('SRB BURNOUT CONFIRMED', 'Separate solid rocket boosters', 'SEPARATE SRBS');
    }
    // 4. Fairing Jettison (~100 km Kármán line, ~T+78s)
    else if (this.phase === 'fairing_flight' && this.altitude > 98000 && !this.fairingSeparated) {
      this.phase = 'fairing_sep';
      this.showPrompt('KÁRMÁN LINE (100 KM)', 'Jettison aerodynamic payload fairing', 'JETTISON FAIRING');
    }
    // 5. MECO & Orbital Insertion (7,850 m/s, ~T+104s)
    else if (this.phase === 'orbital_burn' && this.velocity > 7800) {
      this.phase = 'meco';
      this.commsLog('Flight Director', 'Orbital insertion velocity reached. MECO - Main Engine Cutoff.');
      this.showPrompt('ORBIT INSERTION COMPLETE (7,850 M/S)', 'Deploy Odyssey 07 from launch vehicle', 'SEPARATE SPACECRAFT');
    }

    // Auto-Stage Countdown Timer (3.5s fallback with visual bar)
    if (this.stagePromptTime > 0) {
      const elapsedPrompt = this.time - this.stagePromptTime;
      const remaining = Math.max(0, 3.5 - elapsedPrompt);
      const bar = this.overlay.querySelector('#launch-auto-stage-bar');
      if (bar) {
        bar.style.width = `${(remaining / 3.5) * 100}%`;
      }
      const desc = this.overlay.querySelector('#launch-prompt-desc');
      if (desc) {
        desc.textContent = `Auto-staging in ${remaining.toFixed(1)}s // Press [SPACE] to stage now`;
      }
      if (elapsedPrompt >= 3.5) {
        this.triggerCurrentStagingAction();
      }
    }

    // Automatic Scenario-Based Cinematic Director Decision Tree
    this.updateCinematicDirectorState();

    const inVacuum = this.altitude > 75000;
    this.updateAudio(this.throttle, inVacuum);
  }

  updateCinematicDirectorState() {
    let targetShot = 'pad_liftoff';
    let shotTitle = 'PAD 39B UMBILICAL TRACKING';

    if (this.spacecraftSeparated || this.phase === 'in_orbit' || this.phase === 'spacecraft_sep') {
      targetShot = 'spacecraft_deploy';
      shotTitle = 'ODYSSEY 07 PAYLOAD DEPLOYMENT';
    } else if (this.altitude > 120000 || this.phase === 'orbital_burn' || this.phase === 'meco') {
      targetShot = 'orbital_burn';
      shotTitle = 'ORBITAL INSERTION CHASE';
    } else if (this.altitude > 92000 || this.phase === 'fairing_sep') {
      targetShot = 'fairing_sep';
      shotTitle = 'KÁRMÁN LINE FAIRING JETTISON';
    } else if (this.altitude > 52000 || this.phase === 'fairing_flight') {
      targetShot = 'mesosphere';
      shotTitle = 'MESOSPHERE ASCENT PROFILE';
    } else if (this.altitude > 32000 || this.phase === 'srb_sep') {
      targetShot = 'srb_sep';
      shotTitle = 'SRB SEPARATION KOROLEV CROSS';
    } else if (this.altitude > 11000 || this.phase === 'max_q') {
      targetShot = 'max_q';
      shotTitle = 'MAX-Q BOOSTER HULL CAM';
    } else if (this.altitude > 450 || this.missionTime >= 9) {
      targetShot = 'gravity_turn';
      shotTitle = 'SUPERSONIC GRAVITY TURN CHASE';
    } else {
      targetShot = 'pad_liftoff';
      shotTitle = 'PAD 39B UMBILICAL TRACKING';
    }

    this.setDirectorShot(targetShot, shotTitle);
  }

  triggerCloudPunchEffect() {
    const flash = this.overlay.querySelector('#cloud-mist-overlay');
    if (flash) {
      flash.classList.add('active');
      setTimeout(() => { flash.classList.remove('active'); }, 1200);
    }
    this.commsLog('Flight Director', 'Punching through cloud deck. Passing 8,000 feet. Clear skies above.');
  }

  /* =========================================================================
     PARTICLES & DYNAMIC MOVING-ORIGIN COORDINATES
     ========================================================================= */
  spawnPadSteam(intensity = 1.0) {
    for (let i = 0; i < Math.ceil(intensity * 4); i++) {
      const geo = new T.SphereGeometry(1.5 + Math.random() * 2.5, 6, 6);
      const mat = new T.MeshStandardMaterial({
        color: 0xedf4f8,
        roughness: 0.95,
        transparent: true,
        opacity: 0.75
      });
      const puff = new T.Mesh(geo, mat);
      const angle = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 25;
      puff.position.set(Math.cos(angle) * r, 2 + Math.random() * 4, Math.sin(angle) * r);
      puff.userData.vel = new T.Vector3(Math.cos(angle) * 12, 3 + Math.random() * 6, Math.sin(angle) * 12);
      puff.userData.life = 1.0;
      this.groundGroup.add(puff);
      this.padSteamParticles.push(puff);
    }
  }

  spawnTrailSmoke() {
    if (this.altitude > 65000) return;
    const srbOffsets = [-4.5, 4.5];
    srbOffsets.forEach(ox => {
      const geo = new T.SphereGeometry(1.4 + Math.random() * 1.2, 5, 5);
      const mat = new T.MeshStandardMaterial({
        color: 0xe8eff5,
        roughness: 0.95,
        transparent: true,
        opacity: 0.65
      });
      const puff = new T.Mesh(geo, mat);
      puff.position.copy(this.rocketGroup.position).add(new T.Vector3(ox, -22, 0));
      puff.userData.vel = new T.Vector3((Math.random() - 0.5) * 2, -2 - Math.random() * 4, (Math.random() - 0.5) * 2);
      puff.userData.life = 1.0;
      this.scene.add(puff);
      this.trailSmokeParticles.push(puff);
    });
  }

  spawnHydrogenSparklers(dt) {
    const engineOffsets = [
      [-1.15, -1.15],
      [1.15, -1.15],
      [-1.15, 1.15],
      [1.15, 1.15]
    ];
    for (const [ox, oz] of engineOffsets) {
      for (let i = 0; i < 3; i++) {
        const geo = new T.SphereGeometry(0.12 + Math.random() * 0.12, 4, 4);
        const mat = new T.MeshBasicMaterial({
          color: Math.random() > 0.35 ? 0xffdf65 : 0xff7b22
        });
        const spark = new T.Mesh(geo, mat);
        const startPos = this.rocketGroup.position.clone().add(new T.Vector3(ox, -3.8, oz));
        spark.position.copy(startPos);
        const angle = Math.random() * Math.PI * 2;
        const speed = 7 + Math.random() * 14;
        spark.userData.vel = new T.Vector3(
          Math.cos(angle) * speed,
          -5 - Math.random() * 10,
          Math.sin(angle) * speed
        );
        spark.userData.life = 0.5 + Math.random() * 0.45;
        this.scene.add(spark);
        this.sparklerParticles.push(spark);
      }
    }
  }

  spawnCryoVapor(dt) {
    const vents = [
      new T.Vector3(0, 48, 2.9),    // Forward interstage LOX/LH2 vent
      new T.Vector3(-3.8, 17, 2.2), // Left TSM umbilical
      new T.Vector3(3.8, 17, 2.2)   // Right TSM umbilical
    ];
    vents.forEach(ventLocal => {
      if (Math.random() > 0.45) return;
      const geo = new T.SphereGeometry(0.6 + Math.random() * 0.6, 6, 6);
      const mat = new T.MeshStandardMaterial({
        color: 0xedf7fd,
        roughness: 0.98,
        transparent: true,
        opacity: 0.48
      });
      const puff = new T.Mesh(geo, mat);
      puff.position.copy(this.rocketGroup.position).add(ventLocal);
      puff.userData.vel = new T.Vector3(
        (Math.random() - 0.5) * 1.5,
        -1.4 - Math.random() * 2.2,
        1.6 + Math.random() * 2.8
      );
      puff.userData.life = 1.0;
      this.scene.add(puff);
      this.cryoVaporParticles.push(puff);
    });
  }

  spawnBsmPlumes() {
    const bsmConfigs = [
      { booster: this.srbLeft, dir: new T.Vector3(-1, -0.35, 0).normalize(), offsets: [
        new T.Vector3(0, 19.8, 0),
        new T.Vector3(0, -19.0, 0)
      ]},
      { booster: this.srbRight, dir: new T.Vector3(1, -0.35, 0).normalize(), offsets: [
        new T.Vector3(0, 19.8, 0),
        new T.Vector3(0, -19.0, 0)
      ]}
    ];

    bsmConfigs.forEach(cfg => {
      cfg.offsets.forEach(off => {
        const coneGeo = new T.ConeGeometry(0.55, 3.8, 8);
        coneGeo.translate(0, -1.9, 0);
        const coneMat = new T.MeshBasicMaterial({
          color: 0xffdf70,
          transparent: true,
          opacity: 0.95,
          blending: T.AdditiveBlending
        });
        const jet = new T.Mesh(coneGeo, coneMat);
        jet.position.copy(off);
        jet.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), cfg.dir);
        cfg.booster.add(jet);
        this.bsmPlumes.push({ mesh: jet, booster: cfg.booster, life: 1.25 });
      });
    });
  }

  updateVfxAndParticles(dt) {
    if (this.missionTime > 0 && this.altitude < 1200) {
      this.spawnPadSteam(Math.max(0, 1.0 - this.altitude / 1200));
    }

    if (!this.srbSeparated && this.missionTime > 0) {
      this.spawnTrailSmoke();
    }

    // MOVING ORIGIN WORLD POSITIONING
    if (this.altitude <= 140) {
      this.rocketGroup.position.y = 12.0 + this.altitude;
      this.rocketGroup.position.z = -(this.downrange * 0.1);
      this.groundGroup.position.y = 0;
      this.groundGroup.position.z = 0;
      this.cloudGroup.position.y = 2500;
    } else {
      this.rocketGroup.position.y = 140;
      this.rocketGroup.position.z = 0;
      const recedeDistance = (this.altitude - 140);
      this.groundGroup.position.y = -recedeDistance;
      this.groundGroup.position.z = (this.downrange * 0.4);
      this.cloudGroup.position.y = 2500 - recedeDistance;
    }

    // Physical RS-25 TVC Engine Bell Gimbal Deflection
    const gimbalRad = (this.gimbalAngle * Math.PI) / 180;
    if (this.coreEngines) {
      this.coreEngines.forEach(eng => {
        // Pivot engine bells along Z axis to simulate authentic hydraulic TVC nozzle vectoring
        eng.rotation.z = -gimbalRad;
      });
    }

    // Rocket 3D Orientation: Pitch along trajectory + Aerodynamic Banking Roll
    const pitchAngleRad = ((90 - this.pitch) * Math.PI) / 180;
    const rollAngleRad = (this.rollAngle * Math.PI) / 180;
    this.rocketGroup.rotation.set(-pitchAngleRad, -rollAngleRad * 0.35, -rollAngleRad);

    // Dynamic Exhaust Lighting Flicker & Vacuum Spectrum Modulation
    if (this.exhaustLight) {
      const isThrusting = !this.spacecraftSeparated && this.phase !== 'meco' && this.phase !== 'in_orbit';
      if (isThrusting) {
        const flicker = Math.sin(this.time * 48) * 0.7 + Math.cos(this.time * 26) * 0.45;
        const baseIntensity = (this.srbSeparated ? 4.5 : 7.2) * this.throttle;
        this.exhaustLight.intensity = Math.max(0, baseIntensity + flicker);
        if (this.altitude > 45000) {
          this.exhaustLight.color.setHex(0xaadeff);
        } else {
          this.exhaustLight.color.setHex(0xffaa44);
        }
      } else {
        this.exhaustLight.intensity = 0;
      }
    }

    // Flame pulse
    const pulse = 1.0 + Math.sin(this.time * 30) * 0.12;
    this.flames.forEach(f => {
      f.scale.set(pulse, pulse * (0.8 + this.throttle * 0.4), pulse);
    });

    // Vacuum Plume Expansion
    if (this.plumeBloomMesh) {
      if (this.altitude > 30000 && !this.spacecraftSeparated) {
        const bloomRatio = clamp((this.altitude - 30000) / 45000, 0, 1);
        this.plumeBloomMesh.material.opacity = bloomRatio * 0.65 * this.throttle;
        this.plumeBloomMesh.scale.set(
          1.0 + bloomRatio * 3.5,
          1.0 + bloomRatio * 1.8,
          1.0 + bloomRatio * 3.5
        );
      } else {
        this.plumeBloomMesh.material.opacity = 0;
      }
    }

    // Transonic Shock Collar (Condensation shockwave)
    if (this.shockCollar) {
      if (this.mach > 0.92 && this.mach < 1.38) {
        const shockPhase = (this.mach - 0.92) / (1.38 - 0.92);
        const pulseWave = 1.0 + Math.sin(this.time * 35) * 0.08;
        this.shockCollar.material.opacity = Math.sin(shockPhase * Math.PI) * 0.88;
        this.shockCollar.scale.set(
          (1.0 + shockPhase * 0.5) * pulseWave,
          (1.0 + shockPhase * 0.5) * pulseWave,
          1.0 + shockPhase * 0.35
        );
      } else {
        this.shockCollar.material.opacity = 0;
      }
    }

    // Supersonic Slipstream Streaks (active between 1.5 km and 35 km)
    if (this.slipstreamStreaks) {
      const isSlipstreamActive = this.altitude > 1500 && this.altitude < 40000 && this.mach > 0.85;
      const streakOpacity = isSlipstreamActive ? clamp((this.dynamicPressure / 25), 0.15, 0.75) : 0;
      this.slipstreamStreaks.forEach(s => {
        s.material.opacity = streakOpacity;
        s.position.y -= dt * 140;
        if (s.position.y < -35) s.position.y = 35 + Math.random() * 20;
      });
    }

    // SRB Separation Animation (Authentic Korolev Cross with 3D Tumble)
    if (this.srbSeparated) {
      this.srbObjects.forEach((srb, idx) => {
        const srbDir = idx === 0 ? -1 : 1;
        srb.position.x += srb.userData.vx * dt * 3.8;
        srb.position.y += srb.userData.vy * dt * 3.8;
        srb.position.z += Math.sin(srb.rotation.z) * 1.6 * dt;
        srb.rotation.z += srb.userData.rotZ * dt * 3.2;
        srb.rotation.x += srbDir * dt * 0.35;
      });
    }

    // Fairing Separation Animation
    if (this.fairingSeparated) {
      this.fairingObjects.forEach(fh => {
        fh.position.x += fh.userData.vx * dt * 4;
        fh.position.z += fh.userData.vz * dt * 4;
        fh.rotation.z += fh.userData.rotZ * dt * 4;
      });
    }

    // Spacecraft Drift
    if (this.spacecraftSeparated && this.spacecraftVelocity) {
      this.spacecraft.position.addScaledVector(this.spacecraftVelocity, dt * 6);
      this.spacecraft.rotation.y += dt * 0.18;
    }

    // Mach Diamonds Supersonic Oscillation
    if (this.machDiamonds && this.machDiamonds.length > 0) {
      const isThrusting = !this.spacecraftSeparated && this.phase !== 'meco' && this.phase !== 'in_orbit';
      this.machDiamonds.forEach(d => {
        d.mesh.visible = isThrusting;
        if (isThrusting) {
          const osc = Math.sin(this.time * 65 + d.phase);
          d.mesh.position.y = d.baseY + osc * 0.12;
          const s = 1.0 + osc * 0.15;
          d.mesh.scale.set(s, s * (0.9 + this.throttle * 0.25), s);
        }
      });
    }

    // Update BSM Separation Motor Plumes
    for (let i = this.bsmPlumes.length - 1; i >= 0; i--) {
      const bsm = this.bsmPlumes[i];
      bsm.life -= dt * 1.5;
      const flicker = 0.85 + Math.random() * 0.35;
      bsm.mesh.scale.set(flicker, flicker, flicker);
      bsm.mesh.material.opacity = Math.max(0, bsm.life);
      if (bsm.life <= 0) {
        bsm.booster.remove(bsm.mesh);
        bsm.mesh.geometry.dispose();
        bsm.mesh.material.dispose();
        this.bsmPlumes.splice(i, 1);
      }
    }

    // Update Particles
    this.updateParticleList(this.padSteamParticles, dt, 3.5, 0.4);
    this.updateParticleList(this.trailSmokeParticles, dt, 2.8, 0.5);
    this.updateParticleList(this.cryoVaporParticles, dt, 1.8, 0.45);

    // Hydrogen Burn-Off Sparkler Particles
    for (let i = this.sparklerParticles.length - 1; i >= 0; i--) {
      const sp = this.sparklerParticles[i];
      sp.position.addScaledVector(sp.userData.vel, dt);
      sp.userData.vel.y -= 9.8 * dt; // gravity arc
      sp.userData.life -= dt * 1.8;
      sp.scale.setScalar(Math.max(0.01, sp.userData.life));
      if (sp.userData.life <= 0) {
        this.scene.remove(sp);
        sp.geometry.dispose();
        sp.material.dispose();
        this.sparklerParticles.splice(i, 1);
      }
    }

    // Staging Sparks
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.position.addScaledVector(p.userData.vel, dt);
      p.userData.life -= dt * 1.6;
      p.scale.setScalar(Math.max(0.01, p.userData.life));
      if (p.userData.life <= 0) {
        this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        this.sparkParticles.splice(i, 1);
      }
    }
  }

  updateParticleList(list, dt, scaleGrowth, lifeDecay) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.position.addScaledVector(p.userData.vel, dt);
      p.scale.addScalar(dt * scaleGrowth);
      p.userData.life -= dt * lifeDecay;
      p.material.opacity = Math.max(0, p.userData.life * 0.7);
      if (p.userData.life <= 0) {
        if (p.parent) p.parent.remove(p);
        else this.scene.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        list.splice(i, 1);
      }
    }
  }

  /* =========================================================================
     ATMOSPHERE, SKY COLOR & ORBITAL EARTH
     ========================================================================= */
  updateAtmosphereAndLighting(dt = 0.016) {
    const atmoRatio = clamp(this.altitude / 65000, 0, 1);

    // Dynamic Rayleigh atmospheric sky color transition
    let skyR = 0, skyG = 0, skyB = 0;
    if (this.altitude < 14000) {
      // 0 - 14km: Florida daylight azure [0.20, 0.56, 0.92] -> deep cerulean [0.08, 0.28, 0.60]
      const t = this.altitude / 14000;
      skyR = 0.20 * (1 - t) + 0.08 * t;
      skyG = 0.56 * (1 - t) + 0.28 * t;
      skyB = 0.92 * (1 - t) + 0.60 * t;
    } else if (this.altitude < 35000) {
      // 14 - 35km: Stratospheric cobalt -> dark navy [0.08, 0.28, 0.60] -> [0.02, 0.07, 0.22]
      const t = (this.altitude - 14000) / 21000;
      skyR = 0.08 * (1 - t) + 0.02 * t;
      skyG = 0.28 * (1 - t) + 0.07 * t;
      skyB = 0.60 * (1 - t) + 0.22 * t;
    } else if (this.altitude < 65000) {
      // 35 - 65km: Navy to ink-black velvet [0.02, 0.07, 0.22] -> [0.000, 0.001, 0.003]
      const t = (this.altitude - 35000) / 30000;
      skyR = 0.02 * (1 - t);
      skyG = 0.07 * (1 - t) + 0.001 * t;
      skyB = 0.22 * (1 - t) + 0.003 * t;
    } else {
      // 65km+ Space: Pure crisp black with subtle star depth (#000103)
      skyR = 0.000;
      skyG = 0.001;
      skyB = 0.003;
    }
    this.scene.background.setRGB(skyR, skyG, skyB);

    // Fog: realistic coastal atmospheric haze that dissipates through the cloud deck
    if (this.altitude < 12000) {
      if (!this.scene.fog) {
        this.scene.fog = new T.FogExp2(0x99d2f8, 0.00012);
      }
      const fogFactor = 1.0 - (this.altitude / 12000);
      this.scene.fog.density = 0.00012 * fogFactor * fogFactor;
      this.scene.fog.color.setRGB(skyR * 1.15, skyG * 1.1, Math.min(1.0, skyB * 1.08));
    } else {
      this.scene.fog = null; // Crystal clear vacuum in space!
    }

    // 1. Celestial Sphere Tracking (Infinity Depth Centered on Observer)
    if (this.celestialGroup) {
      this.celestialGroup.position.copy(this.camera.position);
    }
    if (this.stars) {
      this.stars.material.opacity = clamp((this.altitude - 10000) / 32000, 0, 0.98);
    }
    if (this.alphaStars) {
      this.alphaStars.material.opacity = clamp((this.altitude - 8000) / 28000, 0, 0.95);
    }
    if (this.milkyWayMesh) {
      this.milkyWayMesh.material.opacity = clamp((this.altitude - 20000) / 42000, 0, 0.72);
      this.milkyWayMesh.rotation.y += dt * 0.0005;
    }

    // 2. Celestial Sun System Tracking (Positioned at Optical Infinity along sunDir)
    if (this.sunGroup) {
      this.sunGroup.position.copy(this.camera.position).addScaledVector(this.sunDir, 26000);
      if (this.sunCorona) {
        const pulse = 1.0 + Math.sin(this.time * 2.2) * 0.035;
        this.sunCorona.scale.set(6800 * pulse, 6800 * pulse, 1);
      }
      if (this.sunFlare) {
        this.sunFlare.material.rotation += dt * 0.004;
        this.sunFlare.material.opacity = clamp((this.altitude - 4000) / 22000, 0.35, 1.0);
      }
    }

    // 3. Directional Solar Beam Lighting
    if (this.sunLight) {
      this.sunLight.position.copy(this.camera.position).addScaledVector(this.sunDir, 1800);
      this.sunLight.target.position.copy(this.camera.position);
      this.sunLight.target.updateMatrixWorld();

      if (this.altitude < 25000) {
        this.sunLight.intensity = 3.4 + (this.altitude / 25000) * 0.8;
        this.sunLight.color.setHex(0xfff4e4);
      } else {
        this.sunLight.intensity = 4.8;
        this.sunLight.color.setHex(0xfffaf4);
      }
    }

    // 4. Earthshine (Albedo) Fill Light
    if (this.earthshineLight) {
      this.earthshineLight.position.copy(this.camera.position).add(new T.Vector3(0, -1200, 0));
      this.earthshineLight.target.position.copy(this.camera.position);
      this.earthshineLight.target.updateMatrixWorld();

      const earthshineRatio = clamp((this.altitude - 16000) / 48000, 0, 1);
      this.earthshineLight.intensity = earthshineRatio * 1.55;
      this.earthshineLight.color.setHex(0x32a8f8);
    }

    // 5. Ambient & Atmosphere Light Modulation
    if (this.ambientLight) {
      this.ambientLight.intensity = 1.15 - atmoRatio * 0.72; // drops to 0.43 in orbit
      if (this.altitude > 45000) {
        this.ambientLight.color.setHex(0x102236);
      } else {
        this.ambientLight.color.setHex(0xd9ebff);
      }
    }
    if (this.hemiLight) {
      this.hemiLight.intensity = 0.85 - atmoRatio * 0.62; // drops to 0.23 in orbit
    }

    // Visibility management: hide low ground & clouds once well above them so only 3D curved Earth is visible
    if (this.cloudGroup) {
      this.cloudGroup.visible = this.altitude < 36000;
    }
    if (this.groundGroup) {
      this.groundGroup.visible = this.altitude < 26000;
    }

    // 6. Photorealistic Curved Earth Globe & Rayleigh Atmospheric Limb
    if (this.earthGroup) {
      if (this.altitude > 8000) {
        this.earthGroup.visible = true;
        const orbitRatio = clamp((this.altitude - 8000) / 175000, 0, 1);
        const r = this.earthRadius || 6800;
        const earthY = -r - 380 - (orbitRatio * 1800);
        const earthZ = -600 - (this.downrange * 0.035);
        this.earthGroup.position.set(0, earthY, earthZ);
        if (this.earthSphere) {
          this.earthSphere.rotation.y += dt * 0.008; // Subtle real-time Earth rotation
        }
        if (this.atmoLimb && this.atmoLimb.material.uniforms) {
          this.atmoLimb.material.uniforms.sunDir.value.copy(this.sunDir);
          this.atmoLimb.material.uniforms.eyePos.value.copy(this.camera.position);
        }
      } else {
        this.earthGroup.visible = false;
      }
    }
  }

  /* =========================================================================
     MULTI-ANGLE CINEMATIC CAMERA SYSTEM
     ========================================================================= */
  /* =========================================================================
     AUTOMATED SCENARIO-BASED CINEMATIC CAMERA DIRECTOR
     ========================================================================= */
  updateCamera(dt) {
    const rocketPos = this.spacecraftSeparated ? this.spacecraft.position : this.rocketGroup.position;

    // Camera Vibration & Rocket Acoustic Shake
    this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.6);
    const shakeVec = new T.Vector3(
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity,
      (Math.random() - 0.5) * this.shakeIntensity
    );

    // Dynamic Zoom scale linked to user wheel control (default 1.0 at orbitDistance=110)
    const userZoom = Math.max(0.6, Math.min(2.2, (this.orbitDistance || 110) / 110));
    const shot = this.directorShot || 'pad_liftoff';

    if (shot === 'pad_liftoff') {
      // [1] Ground Optical Tracking Telephoto Zoom Camera (Pad 39B)
      const padGroundY = this.groundGroup.position.y;
      const padCamPos = new T.Vector3(
        this.groundGroup.position.x + 90 * userZoom,
        padGroundY + 22,
        this.groundGroup.position.z + 155 * userZoom
      );
      const targetLook = rocketPos.clone().add(new T.Vector3(0, 24, 0));
      this.camera.position.lerp(padCamPos.add(shakeVec), dt * 3.8);
      this.camera.lookAt(targetLook);

      const targetFov = clamp(48 - (this.altitude / 5500) * 24, 22, 48);
      this.camera.fov += (targetFov - this.camera.fov) * dt * 2.5;
      this.camera.updateProjectionMatrix();

    } else if (shot === 'gravity_turn') {
      // [2] Supersonic Gravity Turn Sweeping Wide-Quarter Chase Cam
      if (Math.abs(this.camera.fov - 50) > 0.5) {
        this.camera.fov += (50 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const chaseOffset = new T.Vector3(-42 * userZoom, -22 * userZoom, 115 * userZoom);
      chaseOffset.applyQuaternion(this.rocketGroup.quaternion);
      const desiredPos = rocketPos.clone().add(chaseOffset).add(shakeVec);

      const lookAhead = new T.Vector3(0, 24, 0);
      lookAhead.applyQuaternion(this.rocketGroup.quaternion);
      const lookTarget = rocketPos.clone().add(lookAhead);

      this.camera.position.lerp(desiredPos, dt * 4.5);
      this.camera.lookAt(lookTarget);

    } else if (shot === 'max_q') {
      // [3] Max-Q Booster Wing & Fuselage Downward Cam
      if (Math.abs(this.camera.fov - 54) > 0.5) {
        this.camera.fov += (54 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const boosterCamOffset = new T.Vector3(8 * userZoom, 48 * userZoom, 8 * userZoom);
      boosterCamOffset.applyQuaternion(this.rocketGroup.quaternion);
      const camPos = rocketPos.clone().add(boosterCamOffset).add(shakeVec);

      const lookDownOffset = new T.Vector3(1.2, -26, 1.2);
      lookDownOffset.applyQuaternion(this.rocketGroup.quaternion);
      const lookDownTarget = rocketPos.clone().add(lookDownOffset);

      this.camera.position.lerp(camPos, dt * 5.5);
      this.camera.lookAt(lookDownTarget);

    } else if (shot === 'srb_sep') {
      // [4] High-Contrast Staging Telephoto Tracking (Korolev Cross)
      if (Math.abs(this.camera.fov - 48) > 0.5) {
        this.camera.fov += (48 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const sepCamOffset = new T.Vector3(34 * userZoom, -18 * userZoom, 130 * userZoom);
      sepCamOffset.applyQuaternion(this.rocketGroup.quaternion);
      const camPos = rocketPos.clone().add(sepCamOffset).add(shakeVec);

      const lookTarget = rocketPos.clone().add(new T.Vector3(0, 24, 0));
      this.camera.position.lerp(camPos, dt * 4.8);
      this.camera.lookAt(lookTarget);

    } else if (shot === 'mesosphere') {
      // [5] Mesosphere Ascent Cockpit / Nose Cam Facing Space
      if (Math.abs(this.camera.fov - 56) > 0.5) {
        this.camera.fov += (56 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const noseCamOffset = new T.Vector3(0, 56, 3.8);
      noseCamOffset.applyQuaternion(this.rocketGroup.quaternion);
      const camPos = rocketPos.clone().add(noseCamOffset).add(shakeVec);

      const lookForwardOffset = new T.Vector3(0, 130, 0);
      lookForwardOffset.applyQuaternion(this.rocketGroup.quaternion);
      const lookForwardTarget = rocketPos.clone().add(lookForwardOffset);

      this.camera.position.lerp(camPos, dt * 5.5);
      this.camera.lookAt(lookForwardTarget);

    } else if (shot === 'fairing_sep') {
      // [6] Kármán Line Payload Shroud Jettison Frontal Profile
      if (Math.abs(this.camera.fov - 48) > 0.5) {
        this.camera.fov += (48 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const fairingCamOffset = new T.Vector3(-48 * userZoom, 50 * userZoom, 88 * userZoom);
      fairingCamOffset.applyQuaternion(this.rocketGroup.quaternion);
      const camPos = rocketPos.clone().add(fairingCamOffset).add(shakeVec);

      const lookTarget = rocketPos.clone().add(new T.Vector3(0, 42, 0));
      this.camera.position.lerp(camPos, dt * 4.5);
      this.camera.lookAt(lookTarget);

    } else if (shot === 'spacecraft_deploy') {
      // [8] Odyssey 07 Spacecraft Free Orbit Deployment Profile
      if (Math.abs(this.camera.fov - 46) > 0.5) {
        this.camera.fov += (46 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const orbitAngle = this.time * 0.22;
      const driftCamOffset = new T.Vector3(
        Math.cos(orbitAngle) * 36 * userZoom,
        10 * userZoom,
        Math.sin(orbitAngle) * 36 * userZoom
      );
      const camPos = rocketPos.clone().add(driftCamOffset).add(shakeVec);
      const targetLook = rocketPos.clone().add(new T.Vector3(0, 2, 0));

      this.camera.position.lerp(camPos, dt * 4.5);
      this.camera.lookAt(targetLook);

    } else {
      // [7] Orbital Insertion Accelerating Chase Panorama (Full Vehicle View)
      if (Math.abs(this.camera.fov - 48) > 0.5) {
        this.camera.fov += (48 - this.camera.fov) * dt * 3.0;
        this.camera.updateProjectionMatrix();
      }

      const slowOrbitAngle = 0.65 + this.time * 0.12;
      const orbitRadius = 148 * userZoom;
      const cx = Math.sin(slowOrbitAngle) * orbitRadius;
      const cy = 26 * userZoom;
      const cz = Math.cos(slowOrbitAngle) * orbitRadius;

      const targetPos = rocketPos.clone().add(new T.Vector3(0, 25, 0));
      const desiredPos = targetPos.clone().add(new T.Vector3(cx, cy, cz)).add(shakeVec);
      this.camera.position.lerp(desiredPos, dt * 4.5);
      this.camera.lookAt(targetPos);
    }
  }

  /* =========================================================================
     HUD TELEMETRY UPDATE
     ========================================================================= */
  updateHud() {
    const metEl = this.overlay.querySelector('#launch-met');
    if (metEl) {
      const absTime = Math.abs(Math.floor(this.missionTime));
      const m = String(Math.floor(absTime / 60)).padStart(2, '0');
      const s = String(absTime % 60).padStart(2, '0');
      metEl.textContent = `${this.missionTime < 0 ? 'T-' : 'T+'}${m}:${s}`;
      metEl.classList.toggle('countdown', this.missionTime < 0);
    }

    const altKm = (this.altitude / 1000).toFixed(1);
    this.overlay.querySelector('#launch-alt-val').textContent = altKm;
    this.overlay.querySelector('#launch-alt-bar').style.width = `${clamp((this.altitude / 185000) * 100, 0, 100)}%`;

    const velVal = Math.round(this.velocity);
    this.overlay.querySelector('#launch-vel-val').textContent = velVal.toLocaleString();
    this.overlay.querySelector('#launch-vel-bar').style.width = `${clamp((this.velocity / 7850) * 100, 0, 100)}%`;

    this.overlay.querySelector('#launch-mach-val').textContent = this.mach.toFixed(2);
    const machTag = this.overlay.querySelector('#launch-mach-tag');
    if (machTag) {
      machTag.textContent = this.mach < 1.0 ? 'SUBSONIC' : this.mach < 5.0 ? 'SUPERSONIC' : 'HYPERSONIC';
      machTag.className = `mach-tag ${this.mach >= 1.0 ? 'supersonic' : ''}`;
    }

    this.overlay.querySelector('#launch-stress-val').textContent = `${this.aerodynamicStress}%`;
    this.overlay.querySelector('#launch-stress-bar').style.width = `${this.aerodynamicStress}%`;
    const stressTag = this.overlay.querySelector('#launch-stress-tag');
    if (stressTag) {
      stressTag.textContent = this.aerodynamicStress > 80 ? 'CRITICAL' : this.aerodynamicStress > 50 ? 'ELEVATED' : 'NOMINAL';
      stressTag.className = `stress-tag ${this.aerodynamicStress > 80 ? 'critical' : this.aerodynamicStress > 50 ? 'warning' : 'nominal'}`;
    }

    const qVal = this.dynamicPressure.toFixed(1);
    this.overlay.querySelector('#launch-q-val').textContent = qVal;
    this.overlay.querySelector('#launch-q-bar').style.width = `${clamp((this.dynamicPressure / 36) * 100, 0, 100)}%`;
    const qStatus = this.overlay.querySelector('#launch-q-status');
    if (qStatus) {
      qStatus.textContent = this.dynamicPressure > 28 ? '⚠ MAX-Q FLIGHT REGIME' : this.altitude > 80000 ? 'VACUUM REGIME' : 'TROPOSPHERE DENSITY';
    }

    const propPercent = Math.max(0, Math.round((this.propellantMass / 2100000) * 100));
    this.overlay.querySelector('#launch-prop-val').textContent = `${propPercent}%`;
    this.overlay.querySelector('#launch-prop-bar').style.width = `${propPercent}%`;

    const totalMass = this.dryMass + this.propellantMass;
    const currentThrust = (this.srbSeparated ? 8800000 : 40800000) * this.throttle;
    const twr = (currentThrust / (totalMass * 9.81)).toFixed(2);
    this.overlay.querySelector('#launch-twr-val').textContent = `TWR: ${twr}`;

    this.overlay.querySelector('#launch-pitch-val').textContent = `${this.pitch.toFixed(1)}°`;
    this.overlay.querySelector('#launch-target-pitch').textContent = `${this.targetPitch.toFixed(1)}°`;
    const pitchOffset = clamp(((90 - this.pitch) / 90) * 100, 0, 100);
    this.overlay.querySelector('#launch-pitch-pointer').style.left = `${pitchOffset}%`;

    const opticsTel = this.overlay.querySelector('#optics-telemetry');
    if (opticsTel && this.cameraMode === 'pad') {
      const padDist = Math.round(Math.hypot(65, 115, this.altitude));
      const elDeg = Math.min(88, Math.atan2(this.altitude, 130) * (180 / Math.PI)).toFixed(1);
      const azDeg = (90.0 + (this.downrange / 1500)).toFixed(1);
      opticsTel.textContent = `AZ: ${azDeg}°  EL: +${elDeg}°  RANGE: ${padDist.toLocaleString()} M`;
    }

    const phaseTitles = {
      countdown: 'COUNTDOWN & SOUND SUPPRESSION',
      liftoff: 'LIFTOFF // TOWER CLEARANCE',
      max_q: 'TRANSONIC ASCENT // MAX-Q FLIGHT REGIME',
      srb_flight: 'BOOSTER FLIGHT // STRATOSPHERE',
      srb_sep: 'STAGE 01 // SOLID BOOSTER BURNOUT',
      fairing_flight: 'MESOSPHERE ASCENT',
      fairing_sep: 'KÁRMÁN LINE (100 KM) // FAIRING JETTISON',
      orbital_burn: 'ORBITAL INSERTION ACCELERATION',
      meco: 'MECO // MAIN ENGINE CUTOFF',
      spacecraft_sep: 'ODYSSEY 07 VEHICLE SEPARATION',
      in_orbit: 'LOW EARTH ORBIT CONFIRMED'
    };
    const phaseEyebrows = {
      countdown: 'LAUNCH COMPLEX 39B • KENNEDY SPACE CENTER',
      liftoff: 'CAPE CANAVERAL • EASTERN RANGE',
      max_q: 'ALTITUDE 13 KM • MACH 1.4 • TRANSONIC SHOCK',
      srb_flight: 'ALTITUDE 35 KM • MACH 3.8',
      srb_sep: 'ALTITUDE 44 KM • SEPARATION CORRIDOR',
      fairing_flight: 'IONOSPHERE TRANSITION',
      fairing_sep: 'ALTITUDE 105 KM • SPACE BOUNDARY',
      orbital_burn: 'VELOCITY 6,800 M/S • APOGEE 185 KM',
      meco: 'TARGET VELOCITY 7,850 M/S',
      spacecraft_sep: 'PAYLOAD RELEASE PROTOCOL',
      in_orbit: 'STATION DEPARTURE PROTOCOL'
    };
    this.overlay.querySelector('#launch-phase-eyebrow').textContent = phaseEyebrows[this.phase] || 'ASCENT FLIGHT';
    this.overlay.querySelector('#launch-phase-title').textContent = phaseTitles[this.phase] || 'IN FLIGHT';

    const pillSrb = this.overlay.querySelector('#status-pill-srb');
    if (pillSrb) {
      pillSrb.className = `stage-pill ${this.srbSeparated ? 'done' : 'active'}`;
      this.overlay.querySelector('#status-tag-srb').textContent = this.srbSeparated ? 'JETTISONED' : 'BURNING';
    }
    const pillFairing = this.overlay.querySelector('#status-pill-fairing');
    if (pillFairing) {
      pillFairing.className = `stage-pill ${this.fairingSeparated ? 'done' : this.srbSeparated ? 'active' : 'standby'}`;
      this.overlay.querySelector('#status-tag-fairing').textContent = this.fairingSeparated ? 'JETTISONED' : 'PROTECTIVE COVER';
    }
    const pillCraft = this.overlay.querySelector('#status-pill-spacecraft');
    if (pillCraft) {
      pillCraft.className = `stage-pill ${this.spacecraftSeparated ? 'done' : this.fairingSeparated ? 'active' : 'standby'}`;
      this.overlay.querySelector('#status-tag-spacecraft').textContent = this.spacecraftSeparated ? 'DEPLOYED' : 'DOCKED';
    }
  }

  /* =========================================================================
     CLEANUP & COMPLETION
     ========================================================================= */
  completeLaunch() {
    if (this.disposed) return;
    try {
      this.dispose();
    } catch (e) {
      console.warn('Launch dispose error:', e);
    }
    if (this.onComplete) {
      try {
        this.onComplete();
      } catch (err) {
        console.error('Launch onComplete error:', err);
      }
    }
  }

  dispose() {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);

    const dom = this.renderer?.domElement;
    if (dom) {
      dom.removeEventListener('mousedown', this.onMouseDown);
      dom.removeEventListener('wheel', this.onWheel);
    }

    if (this.launchMaster) {
      try {
        this.launchMaster.gain.setTargetAtTime(0.001, this.audio.ctx.currentTime, 0.2);
        setTimeout(() => {
          this.rumbleOsc?.stop();
          this.noiseSource?.stop();
        }, 300);
      } catch (e) {}
    }

    try {
      disposeModel(this.scene);
    } catch (_) {}

    try {
      this.renderer?.dispose();
    } catch (_) {}

    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    if (dom && dom.parentNode) {
      dom.parentNode.removeChild(dom);
    }
  }
}

/**
 * Entry function to launch rocket simulation
 */
export function startRocketLaunch({ destination, loadout, campaign, missionClass, launchVehicle, audio, onComplete, onCancel }) {
  const container = document.getElementById('launch-view');
  if (!container) {
    if (onComplete) onComplete();
    return null;
  }

  const menuView = document.getElementById('menu-view');
  if (menuView) menuView.hidden = true;

  container.hidden = false;
  document.body.classList.add('in-launch-simulation');

  try {
    const sim = new RocketLaunchSimulation({
      container,
      destination,
      loadout,
      campaign,
      missionClass,
      launchVehicle,
      audio,
      onComplete: () => {
        container.hidden = true;
        document.body.classList.remove('in-launch-simulation');
        if (onComplete) onComplete();
      },
      onCancel: () => {
        container.hidden = true;
        document.body.classList.remove('in-launch-simulation');
        if (onCancel) onCancel();
      }
    });

    return sim;
  } catch (err) {
    console.error('Launch simulation failed to initialize:', err);
    container.hidden = true;
    document.body.classList.remove('in-launch-simulation');
    if (onComplete) onComplete();
    return null;
  }
}
