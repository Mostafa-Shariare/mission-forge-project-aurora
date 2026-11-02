# 🚀 MISSION FORGE: PROJECT AURORA
### **NASA Space Apps Challenge 2026 // Category: Space Mission Game Design**

[![NASA Space Apps 2026](https://img.shields.io/badge/NASA_Space_Apps-2026_Global_Challenge-0b3d91?style=for-the-badge&logo=nasa&logoColor=white)](https://www.spaceappschallenge.org/)
[![Team: MathaiBlock](https://img.shields.io/badge/Team-MathaiBlock-00E5FF?style=for-the-badge&logo=spacex&logoColor=black)](#-nasa-space-apps-challenge-2026-team-mathaiblock)
[![WebGL Three.js](https://img.shields.io/badge/3D_Engine-Three.js_r128-000000?style=for-the-badge&logo=three.js&logoColor=white)](https://threejs.org/)
[![Web Audio API](https://img.shields.io/badge/Audio-Procedural_Web_Audio_API-cyan?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
[![Vercel Deployment](https://img.shields.io/badge/Vercel-Production_Live-00E5FF?style=for-the-badge&logo=vercel&logoColor=black)](https://mission-forge-project-aurora.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

---

## 🌌 Executive Overview

**MISSION FORGE: PROJECT AURORA** is a photorealistic, full-viewport 3D space mission engineering simulation and flight adventure game built from the ground up for the **NASA Space Apps Challenge 2026**. 

The simulation models real-world aerospace tradeoffs—balancing budget constraints, structural mass budgets, and single-stage ideal $\Delta v$ (Tsiolkovsky rocket equation)—with high-stakes in-flight emergencies, Martian rover surface traversals, and scientific sample return. Designed with an authentic **NASA Jet Propulsion Laboratory (JPL) Mission Control & Cockpit HUD** aesthetic, the application combines hardware-accelerated WebGL graphics, post-processing bloom shaders, dynamic camera choreography, and a zero-dependency procedural **Web Audio API** soundscape.

* **Live Demo (Vercel):** [https://mission-forge-project-aurora.vercel.app](https://mission-forge-project-aurora.vercel.app)
* **Live Demo (GitHub Pages):** [https://<your-username>.github.io/mission-forge-project-aurora/](https://<your-username>.github.io/mission-forge-project-aurora/)
* **Repository:** [https://github.com/<your-username>/mission-forge-project-aurora](https://github.com/<your-username>/mission-forge-project-aurora)

---

## 🎮 Interface & Mission Gallery

| **01. JPL Mission Control Flight Deck** | **02. 3D Modular Spacecraft Assembly Hangar** |
| :---: | :---: |
| ![Mission Control Flight Deck](src/game/previews/01-mission-control.png) | ![Assembly Hangar](src/game/previews/assembly-nine-systems.png) |

| **03. Deep Space Cruise & CME Crisis** | **04. Surface Rover Exploration & Sample Retrieval** |
| :---: | :---: |
| ![Flight & Hazard Encounter](src/game/previews/03-flight.png) | ![Surface Rover Exploration](src/game/previews/05-rover.png) |

| **05. Mission Debrief & Scientific Evidence Review** | **06. Interactive 3D Orbit & Assembly** |
| :---: | :---: |
| ![Debrief & Evidence Review](src/game/previews/campaign-debrief.png) | ![Hangar Complete](src/game/previews/hangar-complete.png) |

---

## 🏛️ System & Architecture Diagrams

### 1. End-to-End Simulation Lifecycle
```mermaid
flowchart TD
    subgraph S1["PHASE 1: BRIEFING & DESTINATION"]
        A["AAA Boot Sequence<br/>(Starfield Dolly & Audio Hum)"] --> B["Celestial Target Selector<br/>(Earth, Moon, Mars, Europa, Psyche)"]
        B --> C["Mission Dossier & Trajectory Window<br/>(Hohmann Transfer Arc & Delta-V)"]
    end

    subgraph S2["PHASE 2: SYSTEMS ENGINEERING"]
        C --> D["Orbital Assembly Hangar Dock"]
        D --> E{"Subsystem Trade-Off Engine<br/>($320M / 85T Mass Limit)"}
        E -->|Power| E1["Photovoltaic Solar vs. RTG Fission"]
        E -->|Comms| E2["Ka-Band Microwave vs. DSOC Laser"]
        E -->|Shielding| E3["Superconducting Deflector vs. Water Wall"]
        E1 & E2 & E3 --> F["Launch Readiness Review (GO/NO-GO)"]
    end

    subgraph S3["PHASE 3: TRANSIT & CRISIS"]
        F --> G["Departure Burn & Hyper-Speed Transit"]
        G --> H{"Solar CME Hazard Intercept<br/>(Class X-12 Flare Event)"}
        H -->|Tactical Option A| H1["Deploy Magnetic Deflector<br/>(+15 Score / High Power Draw)"]
        H -->|Tactical Option B| H2["Passive Storm Shelter Retreat<br/>(+10 Score / Blackout)"]
    end

    subgraph S4["PHASE 4: EXPLORATION & DEBRIEF"]
        H1 & H2 --> I["Orbital Capture & Rover Surface Traverse"]
        I --> J["Mineral Sample Retrieval & Telemetry Archive"]
        J --> K["3D Carousel Debrief & NASA Certificate"]
    end
```

---

### 2. Spacecraft Subsystems Engineering & Resource Matrix
```mermaid
flowchart LR
    subgraph Budget["RESOURCE BOUNDARIES"]
        B1["Max Budget: $320M"]
        B2["Max Wet Mass: 85,000 kg"]
    end

    subgraph Subsystems["9 MODULAR HARDWARE SUBSYSTEMS"]
        direction TB
        P["Propulsion Engine<br/>• Dual Hall-Effect Ion<br/>• Bipropellant Chemical"]
        E["Power Bus<br/>• Deployable UltraFlex Solar<br/>• Next-Gen RTG"]
        C["High-Gain Comms<br/>• Ka-Band Parabolic Dish<br/>• Deep Space Optical DSOC"]
        S["Thermal & Radiation Shielding<br/>• Superconducting Magnetosphere<br/>• Multi-Layer Polyethylene Aerogel"]
        I["Science Package<br/>• Subsurface Radar Sounder<br/>• Raman Spectroscopy Suite"]
    end

    subgraph Output["FLIGHT DYNAMICS OUTPUT"]
        R1["Ideal Delta-V (Rocket Equation)"]
        R2["Payload Mass Fraction"]
        R3["Emergency Margin Rating"]
    end

    Budget --> Subsystems
    Subsystems --> Output
```

---

### 3. Procedural Web Audio API Architecture
```mermaid
flowchart TD
    subgraph Engine["WEB AUDIO API SYNTHESIZER GRAPH"]
        AC["AudioContext (Auto-resume on User Interaction)"]
        
        subgraph Voices["Procedural Synthesizers"]
            OSC1["Dual Sub-Bass Sine Oscillators<br/>(45 Hz - 60 Hz Cosmic Drone)"]
            W_NOISE["White Noise Propulsion Generator<br/>(BufferSource)"]
            Q_TONE["Apollo Quindar Beep Generator<br/>(2525 Hz Pulse Sine)"]
            ALERT["Red Alert Alarm Generator<br/>(Sawtooth 320 Hz LFO-Modulated)"]
        end

        subgraph Filtering["Dynamic Filtering & Modulation"]
            LPF1["Resonant Lowpass Filter<br/>(Cutoff: 180 Hz - 650 Hz dynamic throttle)"]
            BPF1["Bandpass RCS Thruster Shaper<br/>(1200 Hz Q: 3.5)"]
            ENV["Attack / Decay Gain Envelopes"]
        end

        subgraph Master["Master Output"]
            PAN["Stereo Panner Node"]
            VOL["Master Volume & Mute Switch"]
            DEST["AudioDestinationNode (Speakers/Headphones)"]
        end
    end

    AC --> Voices
    OSC1 --> ENV --> VOL
    W_NOISE --> LPF1 --> VOL
    Q_TONE --> ENV --> PAN --> VOL
    ALERT --> ENV --> VOL
    VOL --> DEST
```

---

### 4. Cloud Deployment & Edge Microservice Architecture
```mermaid
flowchart LR
    Client["User Browser / Client"] --> Edge["Vercel Edge Network (Global CDN)"]
    
    subgraph VercelProject["Vercel Deployment Architecture"]
        Edge -->|Path: /| AppService["App Service (Repository Root)<br/>• index.html (347 KB Full NASA 3D Suite)<br/>• Shaders, Models & Textures CDN"]
        Edge -->|Path: /game/*| GameService["Game Service (src/game)<br/>• Vite Framework Build<br/>• Modular Sub-Expedition Modules"]
        
        AppService -.->|Internal Service Binding| GameService
    end

    Local["Local Machine (node server.js)"] --> LocalServer["Native Node.js HTTP Server (:8080)<br/>Auto-fallback & Static File Streaming"]
```

---

## 🔬 Scientific Realism & NASA Mission Data Alignment

Every mechanic in **MISSION FORGE: PROJECT AURORA** is grounded in real NASA mission parameters, aerospace engineering literature, and planetary science data:

| Mission System | Scientific Foundation | NASA Mission Reference | In-Game Simulation Behavior |
| :--- | :--- | :--- | :--- |
| **Ideal Rocket Equation** | $`\Delta v = I_{sp} \cdot g_0 \cdot \ln\left(\frac{m_0}{m_f}\right)`$ | Dawn & Deep Space 1 | Dynamic $\Delta v$ gauge calculates available orbital maneuver budget based on selected fuel mass and engine $I_{sp}$. |
| **Deep Space Optical Comms** | 1550 nm Near-Infrared Laser Pulse Transceiver | NASA DSOC (Psyche Mission) | 10x-100x science data downlink rates; susceptible to line-of-sight pointing errors during high-g maneuvers. |
| **Solar Flare / CME Hazards** | Proton Flux > 100 MeV, Solar Particle Events (SPE) | NASA SOHO / Parker Solar Probe | Class X-12 CME triggers ionizing radiation warnings, hull stress telemetry, and active magnetic shield defense choices. |
| **Planetary Environments** | Gravitational acceleration & atmospheric scale heights | Mars 2020 Perseverance / Artemis Gateway | 5 celestial destinations each feature accurate surface textures, orbital period curves, and landing hazard profiles. |
| **Microgravity Buoyancy** | Multi-axis low-frequency station keeping | ISS Orbital Telemetry | Organic 6-DOF micro-drift physics ensures spacecraft feels natural and unconstrained in 3D orbit. |
| **Apollo Quindar Tones** | 2525 Hz intro blip / 2475 Hz outro blip | Apollo Mission Control Comms | Procedurally synthesized sine tones preface Houston Flight Director telemetry announcements. |

---

## 🕹️ Flight Deck Controls & Hotkeys

| Input Command | Keybinding | Operation & Context |
| :--- | :---: | :--- |
| **Forward Propulsion / Throttle** | <kbd>W</kbd> | Engages main ion engine burn; modulates lowpass sound filter cutoff from 180 Hz to 650 Hz. |
| **Attitude & RCS Yaw Left / Right** | <kbd>A</kbd> / <kbd>D</kbd> | Fires compressed nitrogen cold-gas thrusters for lateral alignment with audible RCS bursts. |
| **Retro-Brake / Deceleration** | <kbd>S</kbd> | Reverses thrust vector for orbital deceleration, gate pacing, and velocity bleed. |
| **Tactical Camera Switch** | <kbd>C</kbd> | Cycles through **Chase Cam**, **Solar Transfer Tactical Map**, and **Cockpit Viewport**. |
| **Target Interlock & Scan** | <kbd>E</kbd> | Arms scientific spectrometer, sample intake arm, landing radar, or orbital docking clamp. |
| **Subsystem Power Routing** | <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> | Reroutes onboard bus power dynamically between **Thrust**, **Science Arrays**, and **Shields**. |
| **Free 360° Orbit Inspection** | `Mouse Drag` | Full Three.js `OrbitControls` rotation to inspect spacecraft components, solar wings, and terrain. |
| **Audio Master Mute Toggle** | `Top Header 🎵` / <kbd>M</kbd> | Mutes/unmutes procedural synthesizer with persistent state and animated cyan equalizer indicator. |

---

## 🛠️ Technology Stack & Engineering Highlights

* **3D Graphics Engine:** [Three.js](https://threejs.org/) (r128 / ^0.186), custom PBR `MeshPhysicalMaterial` pipelines, gold aerogel foil shaders, and procedural particle engines.
* **Post-Processing Pipeline:** `EffectComposer`, `RenderPass`, `ShaderPass`, and `UnrealBloomPass` for HDR thruster bloom and planetary atmosphere glow.
* **Audio Synthesis:** Zero-dependency procedural **Web Audio API** (`AudioContext`, `BiquadFilterNode`, `OscillatorNode`, `GainNode`) for dynamic engine hum, RCS bursts, and Apollo Quindar tones.
* **Typography & HUD Design:** Google Fonts (`Rajdhani`, `Orbitron`, `Space Grotesk`, `JetBrains Mono`), SVG vector instrumentation, and CSS glassmorphic backdrops.
* **Deployment & Cloud:** Configured for Vercel multi-service hosting (`vercel.json`) with edge caching and static CDN asset routing.

---

## 💻 Local Setup & Development

### 1. Quick Launch (Standalone / Zero Install)
Double click **`START_GAME.bat`** (on Windows) or run the native Node server:
```bash
node server.js
```
Open **[http://localhost:8080](http://localhost:8080)** in any modern web browser.

### 2. Full Development Environment
```bash
# Clone the repository
git clone https://github.com/<your-username>/mission-forge-project-aurora.git
cd mission-forge-project-aurora

# Start local server
npm start
```

### 3. Vite Game Subsystem Development (Optional)
```bash
cd src/game
npm install
npm run dev
```

---

## 🌐 Live Deployment Configuration

This repository is optimized for one-click deployment across major cloud providers:

* **Vercel:** Deploys instantly via `vercel.json` with multi-service routing (`app` for the primary 3D NASA experience, `game` for the Vite sub-campaign).
* **GitHub Pages:** Fully static compatible—enable under **Settings > Pages > Deploy from branch (`main`)**.
* **Docker / Node Container:** Supported via `server.js` with dynamic `process.env.PORT` binding.

---

## 👥 NASA Space Apps Challenge 2026 Team: MathaiBlock

<div align="center">

<img src="assets/team-logo.png" alt="MathaiBlock Team Logo" width="220" style="border-radius: 20px; box-shadow: 0 0 35px rgba(0, 229, 255, 0.45); margin-bottom: 14px;" />

# **MathaiBlock**
### *“BUILDING SOLUTIONS BEYOND EARTH”*
**NASA Space Apps Challenge 2026 Team**

</div>

* **Team Name:** **MathaiBlock**
* **Project Title:** **MISSION FORGE: PROJECT AURORA**
* **Challenge Track:** Space Mission Game Design
* **Team Motto:** *“Building Solutions Beyond Earth”*
* **Mission Vision:** *“Leave the blue behind. Bring the science home.”*

---

<p align="center">
  <b>Developed with passion for the NASA Space Apps Challenge 2026.</b><br/>
  <i>Exploring the frontier of deep space systems engineering and interactive science education.</i>
</p>
