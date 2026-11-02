# Survival & Environmental Hazards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement thrilling, interactive survival and environmental hazard systems in Mission Forge: atmospheric re-entry plasma sheath, dynamic Martian dust storm with battery pressure, procedural audio klaxon sirens, and emergency cockpit red alert feedback.

**Architecture:** 
- `src/simulation.js` models re-entry velocity thresholds, thermal dissipation, dust storm lifecycle, and alert states.
- `src/audio.js` synthesizes procedural Web Audio klaxon sirens and howling storm wind noise.
- `src/world.js` renders real-time 3D re-entry plasma cones, camera shudder, dynamic terrain fog, swirling dust particles, and damage sparks.
- `src/main.js` & `src/style.css` handle interactive HUD alerts, CRT glitch bursts, and voice announcements.

**Tech Stack:** Three.js, Web Audio API, Vanilla JavaScript (ES Modules), CSS animations, Node.js test runner (`node --test`), Vite.

## Global Constraints

- Must maintain 100% pass rate for all existing 22 simulation tests in `tests/*.test.mjs`.
- Audio must strictly respect user mute preferences (`audio.muted`).
- Code performance must target 60 FPS on standard desktop GPUs; particle systems and noise oscillators must properly recycle and dispose of resources.
- Exact styling must blend seamlessly with the existing cyan retro-cybernetic cockpit theme.

---

### Task 1: Simulation Core Mechanics & Hazard States

**Files:**
- Modify: `src/simulation.js:8-46` and `src/simulation.js:70-120`
- Test: `tests/simulation.test.mjs`

**Interfaces:**
- Consumes: `this.stage`, `this.speed`, `this.position`, `this.destination`, `this.hull`, `this.heat`, `this.power`
- Produces:
  - `this.reentryIntensity`: Number ($0.0$ to $1.0$)
  - `this.stormActive`: Boolean
  - `this.stormIntensity`: Number ($0.0$ to $1.0$)
  - `this.alertLevel`: String (`'nominal'` | `'warning'` | `'critical'`)
  - Event: `sim.emit('alertStateChange', {level, prevLevel})`
  - Event: `sim.emit('stormStateChange', {active, intensity})`

- [ ] **Step 1: Write the failing tests in `tests/simulation.test.mjs`**

Add tests for re-entry heat computation, storm progression, and alert levels:

```javascript
test('Re-entry intensity triggers on high descent speed in atmospheric stage', () => {
  const sim = new Simulation({destination: 'mars'});
  sim.stage = 3;
  sim.position = {x: 0, y: 40, z: -200};
  sim.velocity = {x: 0, y: -26, z: 0}; // 26 m/s descent
  sim.update(0.5);
  assert.ok(sim.reentryIntensity > 0.2, 'Re-entry intensity should be active above 18 m/s in stage 3');
});

test('Martian surface triggers dynamic dust storm and battery drain', () => {
  const sim = new Simulation({destination: 'mars'});
  sim.stage = 4;
  sim.stageTime = 25; // 25 seconds into surface traversal
  sim.update(0.5);
  assert.strictEqual(sim.stormActive, true, 'Storm should become active after 20s');
  assert.ok(sim.stormIntensity > 0, 'Storm intensity should ramp up');
});

test('Alert state escalates to critical when hull or heat reaches dangerous threshold', () => {
  const sim = new Simulation();
  sim.hull = 20; // Critical threshold
  sim.update(0.1);
  assert.strictEqual(sim.alertLevel, 'critical');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/simulation.test.mjs`
Expected: FAIL with undefined `reentryIntensity`, `stormActive`, or `alertLevel`.

- [ ] **Step 3: Implement hazard mechanics in `src/simulation.js`**

Initialize the hazard variables in `Simulation.constructor`:
```javascript
this.reentryIntensity = 0;
this.stormActive = false;
this.stormIntensity = 0;
this.alertLevel = 'nominal';
```

Update `Simulation.prototype.update(dt)` to compute re-entry, storm, and alert state:
```javascript
// Re-entry in Chapter 04 (Descent)
if (this.stage === 3 && this.destination.surface) {
  const speed = this.speed;
  if (speed > 18) {
    this.reentryIntensity = clamp((speed - 18) / 22, 0, 1);
    if (this.reentryIntensity > 0.3) {
      this.heat = clamp(this.heat + dt * 15 * this.reentryIntensity, 0, 100);
      if (this.heat > 85) {
        this.damage(dt * 6 * this.reentryIntensity, false);
      }
    }
  } else {
    this.reentryIntensity = Math.max(0, this.reentryIntensity - dt * 2);
  }
} else {
  this.reentryIntensity = 0;
}

// Dynamic Martian Dust Storm in Chapter 05 (Surface Rover)
if (this.isSurface && this.destination.id === 'mars') {
  if (this.stageTime >= 20 && this.stageTime <= 65) {
    this.stormActive = true;
    this.stormIntensity = clamp(this.stormIntensity + dt * 0.25, 0, 1);
    this.power = clamp(this.power - dt * 0.8 * this.stormIntensity, 0, 100);
  } else {
    this.stormIntensity = Math.max(0, this.stormIntensity - dt * 0.2);
    if (this.stormIntensity === 0) this.stormActive = false;
  }
} else {
  this.stormActive = false;
  this.stormIntensity = 0;
}

// Alert State Evaluation
let nextAlert = 'nominal';
if (this.hull < 30 || this.heat > 90 || this.power < 15) {
  nextAlert = 'critical';
} else if (this.hull < 55 || this.heat > 75 || this.power < 30) {
  nextAlert = 'warning';
}
if (nextAlert !== this.alertLevel) {
  const prevLevel = this.alertLevel;
  this.alertLevel = nextAlert;
  this.emit('alertStateChange', {level: nextAlert, prevLevel});
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/simulation.test.mjs`
Expected: PASS all tests.

- [ ] **Step 5: Commit changes**

```bash
git add src/simulation.js tests/simulation.test.mjs
git commit -m "feat(sim): add re-entry heat, dust storm, and alert state mechanics"
```

---

### Task 2: Audio Engine Procedural Soundscapes (Klaxon Siren & Storm Wind)

**Files:**
- Modify: `src/audio.js`

**Interfaces:**
- Consumes: `this.ctx`, `this.muted`, Web Audio API
- Produces:
  - `audio.startKlaxon()`: Starts alternating two-tone alarm ($880\text{ Hz} / 660\text{ Hz}$).
  - `audio.stopKlaxon()`: Silences alarm.
  - `audio.updateWind(intensity)`: Updates noise buffer playback and resonant bandpass filter.

- [ ] **Step 1: Write verification test for Audio API methods in `tests/helpers.mjs` or unit test**

Ensure `audio.js` methods don't throw when instantiated or muted.

- [ ] **Step 2: Implement klaxon and procedural wind in `src/audio.js`**

Add audio nodes for emergency klaxon and wind simulator:
```javascript
// Klaxon Siren
startKlaxon() {
  if (this.muted || this.klaxonActive || !this.ctx) return;
  this.klaxonActive = true;
  this.klaxonTimer = setInterval(() => {
    if (!this.klaxonActive || this.muted) return;
    this.tone(880, 0.22, 'sawtooth', 0.12);
    setTimeout(() => {
      if (this.klaxonActive && !this.muted) {
        this.tone(660, 0.22, 'sawtooth', 0.12);
      }
    }, 280);
  }, 600);
}

stopKlaxon() {
  this.klaxonActive = false;
  if (this.klaxonTimer) {
    clearInterval(this.klaxonTimer);
    this.klaxonTimer = null;
  }
}

// Procedural Wind Generator
initWind() {
  if (!this.ctx || this.windNode) return;
  const bufferSize = this.ctx.sampleRate * 2;
  const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
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

updateWind(intensity) {
  if (this.muted || !this.ctx) return;
  if (!this.windSource) this.initWind();
  if (this.windGain) {
    const targetGain = this.muted ? 0 : clamp(intensity * 0.35, 0, 0.4);
    this.windGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.1);
  }
  if (this.windFilter) {
    const targetFreq = 180 + intensity * 350;
    this.windFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.15);
  }
}
```

- [ ] **Step 3: Run full tests to verify no regressions**

Run: `npm test`
Expected: PASS all 22+ tests.

- [ ] **Step 4: Commit changes**

```bash
git add src/audio.js
git commit -m "feat(audio): implement procedural klaxon alarm and howling wind noise"
```

---

### Task 3: Visual 3D FX (Re-entry Plasma, Dynamic Storm Fog & Sparks)

**Files:**
- Modify: `src/world.js`

**Interfaces:**
- Consumes: `sim.reentryIntensity`, `sim.stormIntensity`, `sim.hull`, `sim.position`, Three.js
- Produces:
  - Re-entry flame cone mesh positioned in front of spacecraft.
  - Camera shudder during re-entry.
  - Dynamic fog density & color interpolation on Martian terrain.
  - Hull damage sparks emitter when `sim.hull < 50%`.

- [ ] **Step 1: Implement re-entry plasma mesh and attachment in `src/world.js`**

Add re-entry plasma cone mesh to `spacecraft()` or `world.js`:
```javascript
// Plasma Cone Geometry & Material
const plasmaMat = new THREE.MeshBasicMaterial({
  color: 0xffaa33,
  transparent: true,
  opacity: 0,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
  depthWrite: false
});
const plasmaCone = new THREE.Mesh(new THREE.ConeGeometry(3.2, 8, 24, 1, true), plasmaMat);
plasmaCone.rotation.x = -Math.PI / 2;
plasmaCone.position.set(0, 0, -8);
plasmaCone.visible = false;
```

- [ ] **Step 2: Update `world.js:update(dt, sim)` to drive re-entry and camera shudder**

```javascript
// In world.update():
if (sim.stage === 3 && sim.reentryIntensity > 0) {
  plasmaCone.visible = true;
  plasmaCone.material.opacity = sim.reentryIntensity * (0.6 + Math.sin(t * 35) * 0.15);
  plasmaCone.scale.set(
    1 + Math.sin(t * 20) * 0.08,
    sim.reentryIntensity * 1.4,
    1 + Math.cos(t * 20) * 0.08
  );
  // Add intense re-entry camera shudder
  this.shake = Math.max(this.shake, sim.reentryIntensity * 0.85);
} else {
  plasmaCone.visible = false;
}
```

- [ ] **Step 3: Implement dynamic dust storm fog and swirling particles in `world.js`**

```javascript
if (this.surfaceScene && sim.destination.id === 'mars') {
  if (sim.stormIntensity > 0) {
    const baseDensity = 0.00065;
    this.scene.fog.density = baseDensity + sim.stormIntensity * 0.0035;
    const dustColor = new THREE.Color(0x8a6753).lerp(new THREE.Color(0x522312), sim.stormIntensity);
    this.scene.fog.color.copy(dustColor);
  }
}
```

- [ ] **Step 4: Implement hull damage sparks when `sim.hull < 50%`**

When vehicle moves or takes damage, spawn spark particles with orange/yellow glowing points moving backwards.

- [ ] **Step 5: Run tests and build to verify no syntax or runtime errors**

Run: `npm test && npm run build`
Expected: PASS all tests and build successful.

- [ ] **Step 6: Commit changes**

```bash
git add src/world.js
git commit -m "feat(world): add re-entry plasma sheath, dynamic storm fog, and damage sparks"
```

---

### Task 4: Interactive HUD Red Alert, Screen Glitch & Emergency Feedback

**Files:**
- Modify: `src/main.js`
- Modify: `src/style.css`
- Modify: `index.html`

**Interfaces:**
- Consumes: `sim.onEvent({type: 'alertStateChange', ...})`, `sim.reentryIntensity`, `sim.stormActive`
- Produces:
  - CSS classes: `.hud-alert-warning`, `.hud-alert-critical`, `.screen-glitch`
  - Voice alerts for atmospheric re-entry and storm detection.
  - Interactive status banner in HUD.

- [ ] **Step 1: Add CSS animations in `src/style.css`**

Add pulsing red alert borders and static interference styles:
```css
/* Red Alert HUD */
.hud-alert-critical .hud-frame {
  filter: drop-shadow(0 0 12px rgba(255, 60, 60, 0.85));
}
.hud-alert-critical .frame-inner {
  stroke: #ff4c4c !important;
  animation: pulse-alert 0.75s ease-in-out infinite alternate;
}
.hud-alert-critical .telemetry {
  border-color: rgba(255, 76, 76, 0.7) !important;
  box-shadow: inset 0 0 20px rgba(255, 60, 60, 0.2);
}
@keyframes pulse-alert {
  0% { stroke: #ff4c4c; opacity: 0.7; }
  100% { stroke: #ff8888; opacity: 1; }
}

/* CRT Screen Glitch */
.screen-glitch {
  animation: glitch-burst 0.25s steps(2) 2;
}
@keyframes glitch-burst {
  0% { transform: translate(2px, -1px); filter: hue-rotate(90deg) contrast(1.5); }
  50% { transform: translate(-3px, 2px); filter: invert(0.2); }
  100% { transform: translate(0, 0); filter: none; }
}
```

- [ ] **Step 2: Bind alert state, klaxon, and voice warnings in `src/main.js`**

In `src/main.js`:
- Listen for `alertStateChange`:
  - If `level === 'critical'`, trigger `audio.startKlaxon()` and add `.hud-alert-critical` to `document.body`.
  - If `level === 'nominal'`, trigger `audio.stopKlaxon()` and remove alert classes.
  - On collision, trigger `.screen-glitch` on `#world` for 300ms.
- In `updateHud()`, sync storm status and wind audio:
  - `audio.updateWind(sim.stormIntensity);`
  - If `sim.stormActive`, display warning caption in `#flight-tip`: `"⚠ MARTIAN DUST STORM ACTIVE: SOLAR CHARGING INHIBITED"`.
  - If `sim.reentryIntensity > 0.4`, display warning: `"⚠ CRITICAL RE-ENTRY HEAT: ENGAGE BRAKE [S]"`.

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build`
Expected: PASS all tests and build clean.

- [ ] **Step 4: Commit changes**

```bash
git add src/main.js src/style.css index.html
git commit -m "feat(ui): add red alert HUD pulses, screen glitch, and storm warning captions"
```

---

### Task 5: End-to-End Verification & Polish

**Files:**
- Modify: `tests/simulation.test.mjs`
- Test: `npm test`
- Build: `npm run build`

- [ ] **Step 1: Run comprehensive simulation and regression tests**

Run: `npm test`
Expected: 25+ tests pass with 0 failures.

- [ ] **Step 2: Build client bundle**

Run: `npm run build`
Expected: Vite builds successfully into `dist/`.

- [ ] **Step 3: Interactive smoke test & preview verification**

Run Playwright smoke test:
Run: `node tests/production-smoke.mjs`
Expected: PRODUCTION_OK with zero console errors or uncaught rejections.

- [ ] **Step 4: Final commit and summary**

```bash
git add .
git commit -m "chore: complete survival hazards implementation and verification"
```
