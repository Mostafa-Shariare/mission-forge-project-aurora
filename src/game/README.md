# Mission Forge — The Last Transmission

**Featured update:** start a new Mars mission for 3D assembly, transfer planning, relay mystery, electrical fault recovery, interactive mineral investigation, a free-choice rover traverse and an evidence-based debrief. See [CAMPAIGN.md](CAMPAIGN.md) for controls, scientific boundaries and verification, and [DEMO.md](DEMO.md) for a suggested judge presentation.

A complete six-chapter 3D space adventure built from scratch in this folder. The cockpit, cyan telemetry frames, orbiting spacecraft, and destination cards follow the supplied video’s visual direction. The vehicle, world, movement, instruments, hazards, and resource model are rendered and simulated in real time.

## Play on Windows

Double-click **PLAY.cmd**. It serves the included production build on a local address and opens your browser. Keep its console window open while playing. Node.js is required; no npm installation is needed when `dist/` is present.

Or use `npm start`. If port 4173 is occupied, the launcher chooses another port and prints its address. The game is served only on your own computer.

For development:

```sh
npm install
npm run dev
```

Open the local address printed in the console. This version must be served over HTTP; opening `index.html` directly is not supported because it uses JavaScript modules.

## The expedition

Choose Earth, the Moon, Mars, Vesta, or Jupiter. Each has its own briefing, scientific context, visual environment, and discovery. Mars, Moon, and Vesta expeditions include a surface rover; Earth and Jupiter use an orbital recovery vehicle. You never land on Jupiter.

1. **Design:** choose propulsion, power, shielding, instruments, communications, thermal control, attitude control, recovery hardware and propellant storage within a $320M / 85-tonne capacity. The displayed single-stage ideal Δv uses the rocket equation. Equipment changes thrust, propellant use, power reserves, damage resistance, scan speed, and scientific return.
2. **Departure:** manually pilot through three departure gates above Earth.
3. **Transfer:** steer through a debris corridor and respond to a solar event. Collision damage, repairs, and power priorities have real consequences.
4. **Survey:** approach signal relays, brake, and hold position while scanning them. Three bearings reveal the missing station.
5. **Approach:** reach a landing/capture zone with a low enough relative speed. Press E near the target to arm the controlled approach.
6. **Discovery:** drive a rover or fly a recovery vehicle to three sites. Collect samples and recover the final transmission. Choose whether to spend reserves on the complete archive.
7. **Return:** dock at the recovery station and receive a science score, vehicle assessment, and mission rank. Export the flight log or replay with another design.

The six playable chapters follow spacecraft configuration. Failure supports a stage retry. Checkpoints, mission logs, and best results persist on this device. A guided run is shorter; manual piloting and reading the crew transmissions take longer.

On a new Mars campaign, three intercepted relay fragments advance the story. The rover can visit its three evidence sites in any order. Returning after the recorder and one science record preserves time and power but yields a provisional scientific interpretation; recovering both science records supports a stronger finding.

## Controls

The first flight offers pilot practice for thrust, braking and alignment. The relay chapter teaches one-press E scanning. Practice is optional and can be replayed from Controls. A live NEXT ACTION card explains the selected target, required distance/speed, blockers and operation progress. Green capture markers, a scan beam, progress percentages and optional sound confirm instrument activity.

| Action | Keyboard |
|---|---|
| Thrust / rover forward | W |
| Brake, then reverse | S |
| Lateral thrusters / rover steering | A, D |
| Altitude / rover forward and reverse | Up, Down |
| Boost (consumes fuel; heat limits sustained boost) | Space |
| Press once to arm scanning, collection, landing, or docking | E |
| Optional guidance: tracks target and brakes; you still operate instruments | G |
| Chase, cockpit, or orbital camera | C |
| Route power to engines / science / shields | 1, 2, 3 |
| Use one of two repair kits | R |
| Sensor pulse | Q |
| Cycle Mars surface evidence leads | Z |
| Depart Mars surface after recovering the recorder and one science record | X |
| Pause / resume | Escape |
| Controls / flight log | H / L |
| Mute / fullscreen | M / F |

Menus support Tab, Shift+Tab, Enter, and Space. Destination selection supports left/right arrows. Modal dialogs trap keyboard focus. Touch controls are shown on devices with a coarse pointer. Explorer difficulty reduces damage; Expedition uses the full damage model. If performance is low, open Controls and set Graphics to Low.

## Sound and animation

The game generates a continuous ambient score, engine drone, thrust noise, collision effects, radio tones, scanner pulses, alarms, and success cues with Web Audio. Audio begins after interaction, as required by browsers. Optional device speech synthesis narrates crew transmissions; availability and voice quality depend on the browser/OS. All dialogue also appears as captions. Sound and voice can be disabled separately.

The Three.js world includes textured rotating planets, atmospheric rim scattering, star parallax, orbit lines, a modeled spacecraft with engine plumes, moving debris, beacons, a planetary landscape, rover movement, surface shadows, an outpost, a recovery station, particle impacts, and camera transitions.

## Science and interpretation

This is an **arcade mission simulator**, not a high-fidelity trajectory tool. Local flight integrates acceleration and velocity, inertial coasting, counter-thrust, collisions, proximity, and resource consumption. Transfer distances and times are compressed. Engineering masses, prices, resource percentages, and spacecraft configurations are game parameters. Ion propulsion acceleration is exaggerated for play. Communication quality is a game signal indicator, not a DSN link-budget calculation.

Planetary imagery and educational concepts are sourced; the station, mission events, dialogue, and recovered record are authored fiction. Vesta uses an explicitly illustrative lunar texture. See [SOURCES.md](SOURCES.md) and the in-game **Data & credits** panel. This project does not imply NASA endorsement.

## Build and verification

```sh
npm test
npm run build
```

The deterministic tests cover design limits, momentum and braking, scanning constraints, damage and shielding, repairs, pause, save/restore, and completion of all five campaigns. Browser tests use Microsoft Edge through Playwright. With `npm run dev` already running:

```sh
node tests/browser-interface.mjs
node tests/browser-journey.mjs
```

The interface test covers real keyboard input, budget gating, pause, power routing, cameras, checkpoint restoration, the rover renderer, and mobile layout. The journey test plays all six Mars chapters using the same optional guidance and keyboard controls exposed to the player. It accelerates the browser’s animation clock to keep verification practical; production gameplay is unchanged. Screenshots are written to `previews/`.

## Structure

- `src/data.js`: destinations, hardware, story, and scientific context
- `src/simulation.js`: deterministic mission state, flight physics, resources, collisions, checkpoints
- `src/world.js`: 3D spacecraft, planets, terrain, rover, stations, cameras, effects
- `src/audio.js`: procedural audio and optional crew speech
- `src/main.js`: HUD, keyboard/touch controls, dialogs, saves, and the game loop
- `public/textures/`: locally bundled textures
- `dist/`: ready-to-serve production build
- `launch.mjs` / `PLAY.cmd`: local launcher without development dependencies

## Adding the challenge resource pack

When the event resource pack is available, connect its scientific objectives to `src/data.js`, update attribution in `SOURCES.md`, and distinguish measured data from game parameters. Source identifiers, units, uncertainty, and date ranges should travel with any imported data. The current game does not claim to use an unreleased resource pack or simulate an actual NASA flight plan.


## Phase 00 — 3D spacecraft assembly

Every component card includes its electrical draw or destination-specific generation, relevant subsystem ratings, and a full-build preview of wet mass, cost, ideal delta-v and power margin versus the selected design. These values share the specification and calculations used by the simulation. Assembled mass/cost count installed hardware; projected performance includes every selected module, including unfinished sockets. INSTALL SUGGESTED BUILD installs a balanced configuration that fits all destination design gates and remains editable. Extra engineering readouts are collapsible.

Subsystems appear in one horizontal strip. The ‹ / › buttons select the previous/next section; left/right keys do the same while that strip is focused. The craft viewport remains visible above the component cards while selecting and installing modules. Engineering readouts scroll separately on desktop; on mobile, use the ENGINEERING button to open or close the readout panel.

The hangar has nine sections and 27 component variants. Keys 1–9 select a section. Communications modify relay acquisition speed; radiators modify heat dissipation; attitude control modifies lateral response; the recovery bay modifies recovered science yield. Tank options carry 28, 34 or 40 t of propellant: larger tanks increase ideal delta-v and game reserves while adding both tank structure and propellant mass. Each module has its own animated 3D preview, installation, removal and exploded-view position. All nine selected modules persist into flight and mission exports.

Mission Design now opens a real-time assembly hangar. Choose each of the nine sockets, then click an animated 3D component card to install it. All twenty-seven variants have different geometry. Modules fly into position; remove, replace, explode, rotate and zoom the vehicle. Tab and Enter operate all controls, including camera buttons. Launch requires all nine installed modules, completed installation, mass and budget limits, and nonnegative continuous power at the destination. Your assembled geometry follows the selected loadout into every flight stage and checkpoint restore.

Engineering readouts include ideal rocket-equation delta-v, initial thrust/mass acceleration, full-propellant burn time from mass flow, inverse-square solar output, payload demand, and ion electrical demand at 60% efficiency. Dry bus is 12 t; selected propellant load is 28–40 t. Module ratings and geometry are conceptual educational examples. The hangar is not a trajectory or launch vehicle solver. Orbital insertion is assumed to have already occurred. Flight is still an arcade simulation with scaled ion acceleration, energy reserves and an auxiliary descent system. Electrical launch gating does not model eclipses, thermal management, degradation or transient peak loads.

New source modules: `src/vehicle.js` owns the shared modular ship geometry and `src/assembly.js` owns the hangar lifecycle and interface. The nine-section assembly was production-built and checked in Edge with keyboard controls, mobile layout, removal/reinstallation and checkpoint restoration.
