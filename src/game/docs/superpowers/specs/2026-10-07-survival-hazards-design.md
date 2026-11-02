# Design Specification: Survival & Environmental Hazards ("The Martian" Realism)

**Project:** Mission Forge  
**Date:** 2026-10-07  
**Status:** Approved  
**Author:** Pair Programming Session  

---

## 1. Executive Summary

Mission Forge is a 3D real-time space mission and design simulator inspired by NASA planetary science. While the game provides solid orbital mechanics and modular assembly, previous gameplay stages were largely linear and low-stakes.

This specification designs a set of survival and environmental hazard systems to elevate tension, realism, and immersion:
1. **Atmospheric Re-entry Plasma & Thermal Dissipation (Chapter 04: Descent)**: High-speed descents create fiery re-entry plasma, intense cockpit camera shake, thermal warnings, and heat shield degradation requiring active braking and vector control.
2. **Martian Dust Storm & Low-Visibility Exploration (Chapter 05: Surface Rover)**: Dynamic dust storm event reduces visibility with dense red fog, howls with procedural wind audio, drains rover solar-assisted batteries, and challenges directional navigation.
3. **Cockpit Red Alert & Crisis Systems (All Chapters)**: Procedural dual-tone klaxon alarm in Web Audio, pulsing emergency HUD frames (`#ff4c4c`), telemetry static glitches during collisions, and visual hull breach sparks.

---

## 2. Goals & Non-Goals

### Goals
- Deliver heart-pounding survival tension without breaking scientific grounding.
- Provide clear audiovisual feedback for emergencies (audio klaxon, red alert HUD, sparks, storm audio).
- Balance gameplay so `explorer` difficulty is forgiving while `expedition` tests player piloting and resource management.
- Preserve 100% compatibility with existing test suites, checkpoints, and performance targets (>= 60 FPS on standard desktop GPUs).

### Non-Goals
- Adding complex combat or weapons (the game remains focused on scientific exploration and survival against nature).
- Overhauling the core modular assembly system or rewriting Three.js render pipeline from scratch.

---

## 3. Core Mechanics & Features

### 3.1 Atmospheric Re-entry Sheath (Chapter 04: Descent)
- **Physics Calculation:**
  - Active when `sim.stage === 3` and `sim.destination.surface === true`.
  - Velocity threshold: If speed exceeds $18\text{ m/s}$ while in atmospheric altitude ($y < 80$), `reentryIntensity` scales from $0.0$ to $1.0$ based on `(speed - 18) / 25`.
  - When `reentryIntensity > 0.4`, spacecraft heat increases rapidly ($+12\%/\text{sec}$ scaled by intensity). If heat exceeds $90\%$, hull takes continuous thermal ablation damage unless player brakes ($S$) or activates shields ($3$).
- **Visuals in Three.js (`world.js`):**
  - An additive plasma cone sheath surrounding the nose and forward fuselage with animated glowing orange/yellow vertices.
  - Fiery tail particle emitter trailing behind the heat shield.
  - Camera shake proportional to `reentryIntensity`.
- **Audio (`audio.js`):**
  - Atmospheric rushing roar sound modulated by re-entry speed and intensity.

### 3.2 Dynamic Martian Dust Storm (Chapter 05: Surface Rover)
- **Trigger & Duration:**
  - Active during Stage 4 on Mars (`sim.destination.id === 'mars'`).
  - Triggers approximately 15–20 seconds into surface traversal or when approaching the second objective marker.
  - Duration: 40 seconds of intense weather, then gradual dissipation.
- **Environmental Effects:**
  - Fog density increases by $4\times$, horizon color shifts to a deep ochre dust storm atmosphere (`#632a18`).
  - Swirling horizontal dust stream particles generated around the rover.
  - Solar generation drops to zero; battery consumption rate increases by $35\%$.
  - Wind audio: Procedural bandpass-filtered noise generator produces wind gusts and whistling sand audio.
- **Player Countermeasures:**
  - Rover high-beam headlights pierce the dust within immediate range ($< 35\text{ m}$).
  - Long-range directional HUD ping ($Q$ sensor pulse) illuminates destination beacons through the storm.

### 3.3 Cockpit Red Alert & Emergency Alarms
- **Alert States:**
  - `nominal`: Hull $\ge 30\%$, Heat $\le 80\%$, Power $\ge 20\%$.
  - `warning`: Hull $30\text{–}50\%$, Heat $80\text{–}90\%$, or Power $15\text{–}25\%$.
  - `critical`: Hull $< 30\%$, Heat $> 90\%$, or Power $< 15\%$.
- **Audio Klaxon (`audio.js`):**
  - Web Audio oscillator alternating between $880\text{ Hz}$ and $660\text{ Hz}$ with $1.2\text{ Hz}$ cycle rate when `alertState === 'critical'`. Respects mute toggle.
- **HUD & Cockpit Visuals (`main.js`, `style.css`):**
  - Outer HUD SVG frame and telemetry panels pulse with red glow (`box-shadow: 0 0 15px rgba(255, 76, 76, 0.6)`).
  - Quick CRT static/glitch animation triggered upon heavy impact or storm surge.
  - Spark and smoke emitter attached to vehicle engine/hull when `hull < 50%`.

---

## 4. Architecture & Data Flow

```
                      ┌──────────────────────┐
                      │  src/simulation.js   │
                      │                      │
                      │ - reentryIntensity   │
                      │ - stormActive / time │
                      │ - alertLevel         │
                      └──────────┬───────────┘
                                 │
         ┌───────────────────────┼────────────────────────┐
         │ (frame state)         │ (events)               │ (HUD bindings)
         ▼                       ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   src/world.js   │    │   src/audio.js   │    │   src/main.js    │
│                  │    │                  │    │   src/style.css  │
│ - Plasma Cone    │    │ - playKlaxon()   │    │ - .hud-alert-*   │
│ - Fog Density    │    │ - updateWind()   │    │ - Glitch screen  │
│ - Dust Particles │    │ - mute handling  │    │ - Warning logs   │
│ - Sparks / Smoke │    └──────────────────┘    └──────────────────┘
└──────────────────┘
```

### File-by-File Changes

1. **`src/simulation.js`**:
   - Add properties: `reentryIntensity`, `stormActive`, `stormTime`, `stormIntensity`, `alertLevel`.
   - Update `update(dt)`:
     - Compute re-entry conditions in stage 3.
     - Manage dust storm timer and intensity transitions in stage 4.
     - Evaluate `alertLevel` and emit `alertStateChange` event when status changes.
   - Serialization: Include `stormActive` and `reentryIntensity` gracefully in checkpoint save/load.

2. **`src/world.js`**:
   - Build re-entry plasma mesh (cone geometry with additive gradient material).
   - In `buildTerrain()` / `update()`:
     - Interpolate `scene.fog.density` and fog color based on `sim.stormIntensity`.
     - Add horizontal dust particle stream when storm is active.
     - Spawn spark particles from vehicle when `sim.hull < 50%`.

3. **`src/audio.js`**:
   - Add `startKlaxon()` and `stopKlaxon()` methods utilizing periodic oscillator tones.
   - Add `updateWind(intensity)` utilizing pink/white noise buffer source connected to resonant BiquadFilterNode.

4. **`src/main.js` & `src/style.css`**:
   - Listen to `alertStateChange` and toggle `.hud-alert-warning` and `.hud-alert-critical` on `#menu-view`, `#flight-view`, and `.hud-frame`.
   - Add CSS keyframe pulses for red alert borders and static interference animation.
   - Trigger crew voice warning notifications on storm inception or critical heat.

5. **`tests/simulation.test.mjs`**:
   - Add automated unit tests verifying:
     - High descent speed triggers `reentryIntensity > 0` and heat increase.
     - Martian stage 4 triggers `stormActive` and drains power within expected parameters.
     - Low hull or high heat correctly transitions `alertLevel` to `critical`.

---

## 5. Verification & Testing

1. **Unit Testing:**
   - Execute `npm test` to ensure all existing 22 tests and newly added survival hazard tests pass.
2. **Build Verification:**
   - Run `npm run build` to verify Vite bundle compilation without asset or syntax issues.
3. **Interactive Smoke Test:**
   - Run launcher or Playwright headless smoke test ensuring no console errors or performance regressions occur during stage 3 re-entry and stage 4 dust storm.
