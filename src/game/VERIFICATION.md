# Verification — Mission Forge v2

## Decision support and pilot onboarding — 2026-10-08

- Production build successful; **38 automated checks pass**. All 135 destination/component previews were checked against simulation specifications and power balance, including Jupiter solar deficit, tank dry/propellant mass, and suggested-build feasibility.
- `tests/browser-experience.mjs` passed Jupiter power-card/readout agreement, suggested-build installation, keyboard pilot practice, live gate guidance, tutorial replay/skip and stored completion. Zero page errors.
- `tests/browser-assembly.mjs` passed desktop/mobile installation, horizontal section navigation, independent catalog scrolling with the craft remaining visible, launch gates, engineering toggle and checkpoint restoration.
- `tests/browser-campaign.mjs` completed the updated assembly/guidance build through all six Mars chapters and Earth docking, including scan effects and rover evidence: **236 science, 83% hull, 2 collisions, zero page errors**. It used optional guidance and an accelerated test clock.

## Assembly navigation layout — 2026-10-08

- Production build successful. The assembly browser check passed horizontal subsystem navigation through all nine sections, arrow end states, left-arrow keyboard selection, and craft/component/footer visibility at 1280 × 800.
- At 390 × 844, the horizontal strip, mobile engineering panel toggle, nine-module installation and launch passed without horizontal page overflow or page errors. Screenshots updated in `previews/assembly-nine-systems.png` and `previews/assembly-mobile.png`.

## Nine-section spacecraft assembly — 2026-10-08

- Production build successful; **34 automated checks pass**. Geometry checks cover all 27 components, and simulation checks cover larger-tank delta-v/reserve trade-offs, communications, cooling, control response, recovery rewards and migration of four-module checkpoints.
- `tests/browser-assembly.mjs` passed in Edge: all nine sockets installed with keyboard input, invalid power configuration blocked, component removal/reinstallation, 390 px layout, mission planning and checkpoint restoration. Zero page errors.
- `tests/browser-campaign.mjs` completed all six Mars chapters with nine installed modules, relay clues, keyboard spectral tuning, all rover records, interpretation and Earth docking: **236 science, 83% hull, 2 collisions, zero page errors**. Optional guidance and an accelerated test clock were used.
- `tests/browser-interaction.mjs` passed: a single E press completes each relay scan, native slider keys reach the intended wavelengths, both quick-tune buttons acquire their guides, and landing commitment unlocks only after two guides and a selected site.
- Additional subsystem multipliers are conceptual game parameters. Communication hardware does not compute a physical radio link budget; attitude actuators share a simplified lateral-response model. Tank propellant and structure mass enter the existing ideal rocket equation.

## Free-choice Mars expedition — 2026-10-08

- Production build successful; **30 simulation tests pass**. Added checks for relay clue pauses, out-of-order rover leads, minimum-evidence departure and provisional scientific credit.
- `tests/browser-campaign.mjs` completed the six-chapter Mars mission from assembly through final Earth docking, including all three relay fragments, surface evidence collection and scientific debrief. Result: **236 science, 83% hull, 2 collisions, zero page errors**. It used optional guidance and an accelerated test clock; production gameplay speed was unchanged.
- The browser run covered the full-evidence path. The early-return branch is covered by deterministic simulation checks, not a full browser playthrough. First-time player usability and device performance remain to be evaluated.

## Survival & Environmental Hazards release — 2026-10-08

- Production build successful; **28 simulation tests pass (100% pass rate)** with 0 failures across `tests/*.test.mjs`.
- Verified dynamic atmospheric re-entry thermal modeling, velocity-dependent heat buildup, and re-entry plasma sheath visuals.
- Verified Martian dust storm mechanics with real-time battery drain, howling wind noise modulation, and procedural storm fog.
- Verified alert state machine escalation (nominal → warning → critical) on hull damage (<30%) and thermal stress (>70%), with procedural dual-tone klaxon alarms and red alert HUD pulsing vignettes.
- Verified impact damage spark particles, screen glitch effects, and hazard warning banner captions.
- Audio synthesis verified with graceful fallbacks when uninitialized or muted, and procedural frequency/gain modulation validated under mock AudioContext.
- `tests/production-smoke.mjs`: verified production bundle launch, all bundled assets, keyboard flight controls, and dialog mute with 0 browser errors and 0 failed requests.

## Expanded Mars campaign — 2026-10-07

- Production build successful; **22 simulation tests pass**, including all six route/repair combinations, science reward gates, selected-site coordinates and persistence.
- `tests/browser-campaign.mjs`: completed assembly, planning, all six chapters, safe circuit restoration, both spectral acquisitions, boundary-site selection, evidence review, archive choice and final docking. **236 science, 83% hull, 2 collisions, zero page errors.** Uses optional guidance and an accelerated browser test clock, with actual UI and keyboard input.
- `tests/browser-assembly.mjs`: keyboard module installation, power-deficit blocking, removal/reinstallation, dialog reopening, 390 px mobile layout, route selection and campaign checkpoint restoration passed.
- `tests/production-smoke.mjs`: bundled assets, new launch flow, manual thrust and dialog mute passed with no page errors or failed requests.
- Screenshots: `previews/hangar-complete.png`, `previews/mission-planning.png`, `previews/power-failure.png`, `previews/mineral-investigation.png`, `previews/evidence-review.png`, `previews/campaign-debrief.png`.
- This is automated functional coverage, not an assertion of human usability validation, exact video matching, aerospace certification or competition readiness.

## Earlier baseline

Verified locally with Node.js and headless Microsoft Edge (Playwright).

- Production build: successful, with local textures, fonts, and rendering dependencies bundled.
- Simulation tests: **12 passed**. Includes complete six-stage runs for Earth, Moon, Mars, Vesta, and Jupiter; resource trade-offs; scanning constraints; inertia/braking; collisions/shielding/repairs; pause; save restoration; and failure/retry behavior.
- Browser interface: passed keyboard destination navigation, invalid-design launch blocking, manual thrust, pause freeze, controls dialog, power routing, camera change, saved-checkpoint reload, surface vehicle movement, and a 390 px mobile layout without horizontal page overflow.
- Full browser campaign after final resource balancing: Mars completed all six chapters, both narrative events, scans, surface collection, and recovery docking. Result: **198 science points, 73% hull, 3 collisions**. Optional guidance was enabled; interactions used keyboard controls. The test animation clock was accelerated.
- Packaged production server: loaded all requested assets without request failures; manual keyboard thrust and mute inside a dialog passed. No uncaught browser errors were reported.
- Screenshots: `previews/odyssey-final.png`, `previews/03-flight.png`, `previews/05-rover.png`, `previews/06-mobile.png`, and `previews/journey-complete.png`.

Not claimed: complete manual-path coverage, every hardware/browser combination, mobile-device performance certification, or high-fidelity aerospace validation. Speech voices depend on the device. The science/data limitations are explained in README.md, SOURCES.md, and the in-game credits.
