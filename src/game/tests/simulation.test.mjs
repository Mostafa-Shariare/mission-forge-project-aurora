import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {designStats,DESTINATIONS,NASA_MISSION_CLASSES,LAUNCH_VEHICLES} from '../src/data.js';
import {getTargetProvenance} from '../src/campaign.js';

test('Mission design enforces mass and budget limits and uses rocket equation',()=>{
  const nominal=designStats([0,1,1,1]);assert.equal(nominal.valid,true);assert.ok(Math.abs(nominal.mass-72.2)<1e-9);
  assert.ok(nominal.deltaV>2&&nominal.deltaV<3);assert.equal(designStats([2,2,2,2]).valid,false);
});
test('Thrust, inertial coast, and counter-thrust change the actual vehicle velocity',()=>{
  const s=new Simulation();s.begin();for(let i=0;i<120;i++)s.step(1/60,{forward:true});const velocity=s.speed;const z=s.position.z;
  for(let i=0;i<60;i++)s.step(1/60,{});assert.ok(s.position.z<z-velocity*.9);
  for(let i=0;i<30;i++)s.step(1/60,{brake:true});assert.ok(s.speed<velocity);
});
test('Scanning requires proximity, low velocity, and sustained interaction',()=>{
  const s=new Simulation();s.stage=2;s.setupStage();s.begin();s.position={...s.target,x:s.target.x+10};
  for(let i=0;i<180;i++)s.step(1/60,{});assert.equal(s.targetIndex,0);
  s.speedCommand=30;s.step(1/60,{interact:true});assert.equal(s.scan,0);
  s.speedCommand=0;s.velocity={x:0,y:0,z:0};for(let i=0;i<280;i++)s.step(1/60,{interact:true});assert.equal(s.targetIndex,1);
});
test('Collision, shield allocation and repairs have measurable consequences',()=>{
  const a=new Simulation(),b=new Simulation();b.route='shield';a.damage(30);b.damage(30);assert.ok(b.hull>a.hull);a.begin();assert.ok(a.repair());assert.equal(a.repairs,1);assert.ok(a.hull>90);
});
test('Pause freezes the simulation and checkpoints retain stage resources',()=>{
  const s=new Simulation();s.begin();s.step(1/60,{forward:true});s.pause();const p={...s.position},time=s.time;s.step(.05,{forward:true});assert.deepEqual(s.position,p);assert.equal(s.time,time);
  s.stage=3;s.hull=73;s.setupStage();const restored=Simulation.restore(s.serialize());assert.equal(restored.stage,3);assert.equal(restored.hull,73);assert.equal(restored.mode,'briefing');assert.throws(()=>Simulation.restore({version:1}));
});
test('Interplanetary burns consume reserves and propulsion choice changes the margin',()=>{
  const chemical=new Simulation({loadout:[0,1,1,1]}),ion=new Simulation({loadout:[1,1,1,1]});
  for(const s of [chemical,ion]){s.mode='transition';s.advance();}
  assert.equal(chemical.fuel,82);assert.ok(ion.fuel>chemical.fuel+7);assert.equal(chemical.power,92);
});
test('Depleted power and destroyed hull lead to recoverable mission failure',()=>{
  const a=new Simulation();a.begin();a.power=.00001;a.step(1/60,{});assert.equal(a.mode,'failed');
  const b=new Simulation();b.damage(10000);assert.equal(b.mode,'failed');assert.equal(b.hull,0);
  const checkpoint=Simulation.restore(b.checkpoint);assert.equal(checkpoint.hull,100);assert.equal(checkpoint.mode,'briefing');
});
for(const destination of DESTINATIONS){test(`${destination.name}: all six stages, narrative choices, and return can be completed`,()=>{
  const s=new Simulation({destination:destination.id});s.assist=true;let ticks=0;
  while(s.mode!=='complete'&&s.mode!=='failed'&&ticks++<65000){
    if(s.mode==='briefing')s.begin();
    else if(s.mode==='transition')s.advance();
    else if(s.mode==='event')s.choose(s.stage===1?'shelter':'archive');
    else s.step(1/60,{interact:true});
  }
  assert.equal(s.mode,'complete',`Stuck in stage ${s.stage}, target ${s.targetIndex}, range ${s.range}, speed ${s.speed}, mode ${s.mode}`);
  assert.ok(s.score>130);assert.equal(s.journal.length,8);assert.equal(s.fullArchive,true);assert.ok(s.hull>0);
});}

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

test('Alert and storm state changes emit events', () => {
  const events = [];
  const sim = new Simulation({destination: 'mars', onEvent: e => events.push(e)});
  sim.hull = 20;
  sim.update(0.1);
  assert.ok(events.some(e => e.type === 'alertStateChange' && e.level === 'critical'));

  sim.stage = 4;
  sim.stageTime = 25;
  sim.update(0.5);
  assert.ok(events.some(e => e.type === 'stormStateChange' && e.active === true));
});

test('FlightAudio exposes klaxon and wind hazard methods without throwing when uninitialized', async () => {
  const {FlightAudio} = await import('../src/audio.js');
  const audio = new FlightAudio();
  assert.strictEqual(typeof audio.startKlaxon, 'function');
  assert.strictEqual(typeof audio.stopKlaxon, 'function');
  assert.strictEqual(typeof audio.updateWind, 'function');
  // Safe calls before user audio interaction (no AudioContext)
  assert.doesNotThrow(() => audio.startKlaxon());
  assert.doesNotThrow(() => audio.updateWind(0.8));
  assert.doesNotThrow(() => audio.stopKlaxon());
});

test('FlightAudio klaxon and procedural wind modulate parameters with mock AudioContext', async () => {
  const {FlightAudio} = await import('../src/audio.js');
  const audio = new FlightAudio();
  const setTargetCalls = [];
  const mockGain = {
    gain: {
      value: 0,
      setTargetAtTime: (val, time, constant) => setTargetCalls.push({val, time, constant})
    },
    connect: () => {}
  };
  const mockFilter = {
    type: '',
    frequency: {
      value: 0,
      setTargetAtTime: (val, time, constant) => setTargetCalls.push({val, time, constant})
    },
    Q: { value: 0 },
    connect: () => {}
  };
  const mockSource = {
    buffer: null,
    loop: false,
    connect: () => {},
    start: () => {}
  };
  audio.ctx = {
    currentTime: 10,
    sampleRate: 44100,
    createBuffer: () => ({ getChannelData: () => new Float32Array(88200) }),
    createBufferSource: () => mockSource,
    createBiquadFilter: () => mockFilter,
    createGain: () => mockGain
  };
  audio.master = mockGain;

  // Test wind initialization and intensity modulation
  audio.updateWind(0.8);
  assert.ok(audio.windSource, 'windSource should be initialized');
  assert.strictEqual(audio.windFilter.type, 'bandpass');
  assert.strictEqual(audio.windFilter.Q.value, 3.5);
  assert.strictEqual(audio.windFilter.frequency.value, 240);
  assert.ok(setTargetCalls.length >= 2, 'Should schedule gain and frequency targets');

  // Test klaxon activation and timer
  audio.startKlaxon();
  assert.strictEqual(audio.klaxonActive, true);
  assert.ok(audio.klaxonTimer !== null);

  // Calling startKlaxon again while active should be a no-op
  const currentTimer = audio.klaxonTimer;
  audio.startKlaxon();
  assert.strictEqual(audio.klaxonTimer, currentTimer);

  // Test stop klaxon
  audio.stopKlaxon();
  assert.strictEqual(audio.klaxonActive, false);
  assert.strictEqual(audio.klaxonTimer, null);

  // Test toggle mute stops klaxon and silences wind gain
  audio.startKlaxon();
  assert.strictEqual(audio.klaxonActive, true);
  audio.toggle();
  assert.strictEqual(audio.muted, true);
  assert.strictEqual(audio.klaxonActive, false);
  assert.strictEqual(audio.klaxonTimer, null);
  assert.strictEqual(audio.windGain.gain.value, 0);
});

test('Destination campaigns have distinct authentic stages and titles', async () => {
  const {getDestinationStages} = await import('../src/data.js');
  const earthStages = getDestinationStages('earth');
  const moonStages = getDestinationStages('moon');
  const jupiterStages = getDestinationStages('jupiter');

  assert.strictEqual(earthStages.length, 6);
  assert.strictEqual(earthStages[0].title, 'LOW EARTH ORBIT INSERTION');
  assert.strictEqual(moonStages[0].title, 'TRANS-LUNAR INJECTION');
  assert.strictEqual(jupiterStages[1].title, 'THE DEADLY RADIATION BELTS');
});

test('Jupiter radiation flux activates in cruise/approach and is mitigated by shield routing', () => {
  const sim = new Simulation({destination: 'jupiter'});
  sim.stage = 2;
  sim.update(0.5);
  assert.ok(sim.radiationFlux > 0.5, 'Jupiter should have active radiation flux in chapter 2');

  const unshieldedFlux = sim.radiationFlux;
  sim.route = 'shield';
  sim.update(0.5);
  assert.ok(sim.radiationFlux < unshieldedFlux * 0.5, 'Shield route should significantly reduce radiation flux');
});

test('Moon surface detects permanently shadowed region and drains power', () => {
  const sim = new Simulation({destination: 'moon'});
  sim.stage = 4;
  sim.position = {x: 0, y: 0, z: -160}; // Deep inside crater basin
  sim.update(0.5);
  assert.strictEqual(sim.inShadow, true, 'Rover should detect shadowed cold trap when z < -130');
});

test('Bonus science anomalies can be scanned for extra science yield', () => {
  const events = [];
  const sim = new Simulation({destination: 'mars', onEvent: e => events.push(e)});
  sim.stage = 2;
  sim.setupStage();
  sim.begin();
  assert.ok(sim.bonusAnomaly !== null, 'Bonus anomaly should exist in stage 2');

  // Move right on top of bonus anomaly with low speed and interact
  sim.position = {x: sim.bonusAnomaly.x, y: sim.bonusAnomaly.y, z: sim.bonusAnomaly.z};
  sim.velocity = {x: 0, y: 0, z: 0};
  sim.speedCommand = 0;
  for(let i = 0; i < 90; i++) sim.step(1/60, {interact: true});

  assert.strictEqual(sim.bonusAnomaly.scanned, true, 'Bonus anomaly should be successfully scanned');
  assert.ok(sim.score >= 35, 'Bonus anomaly should award score yield');
  assert.ok(events.some(e => e.type === 'bonusAnomaly'), 'Should emit bonusAnomaly event');
});

test('Moon Stage 3 descent experiences lunar gravity and evaluates precision touchdown', () => {
  const events = [];
  const sim = new Simulation({destination: 'moon', onEvent: e => events.push(e)});
  sim.stage = 3;
  sim.setupStage();
  sim.begin();

  // Test lunar gravity pulls downward during stage 3 descent
  const initialVy = sim.velocity.y;
  sim.step(0.1, {});
  assert.ok(sim.velocity.y < initialVy, 'Lunar gravity should accelerate descent downwards');

  // Test hard landing (> 6 m/s) damages equipment and penalizes hull
  const simHard = new Simulation({destination: 'moon'});
  simHard.stage = 3;
  simHard.setupStage();
  simHard.begin();
  simHard.velocity = {x: 0, y: -7.5, z: 0};
  const prevHull = simHard.hull;
  simHard.completeTarget();
  assert.strictEqual(simHard.equipmentDamaged, true, 'Hard landing must flag equipmentDamaged');
  assert.strictEqual(simHard.touchdownQuality, 'damaged', 'Touchdown quality should be damaged');
  assert.ok(simHard.hull < prevHull, 'Hard landing must damage hull');

  // Test gentle precision landing (<= 3.5 m/s) awards flawless landing bonus
  const simFlawless = new Simulation({destination: 'moon'});
  simFlawless.stage = 3;
  simFlawless.setupStage();
  simFlawless.begin();
  simFlawless.position = {x: simFlawless.target.x, y: simFlawless.target.y, z: simFlawless.target.z};
  simFlawless.velocity = {x: 0, y: -2.0, z: 0};
  const prevScore = simFlawless.score;
  simFlawless.completeTarget();
  assert.strictEqual(simFlawless.equipmentDamaged, false, 'Flawless landing leaves equipment pristine');
  assert.strictEqual(simFlawless.flawlessLanding, true, 'Flawless landing flag should be true');
  assert.strictEqual(simFlawless.touchdownQuality, 'flawless', 'Touchdown quality should be flawless');
  assert.ok(simFlawless.score >= prevScore + 30, 'Flawless touchdown awards +30 score');
});

test('Moon surface damaged equipment slows scanning and increases power drain in cold-trap shadow', () => {
  const sim = new Simulation({destination: 'moon', loadout: [0, 0, 1, 1, 0, 0, 0, 0, 0]});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();
  sim.equipmentDamaged = true;
  sim.position = {x: 0, y: 0, z: -160}; // in shadow
  sim.update(1.0);

  assert.strictEqual(sim.inShadow, true, 'Should detect permanently shadowed region');
  // Solar loadout[1] === 0 has high drain rate in shadow when equipment is damaged
  const initialPower = sim.power;
  sim.update(1.0);
  assert.ok(sim.power < initialPower - 0.5, 'Damaged equipment in shadow should exhibit heightened battery drain');
});

test('Mars rover has sample tube limit of 2 and emits sampleStored events on core collection', () => {
  const events = [];
  const sim = new Simulation({
    destination: 'mars',
    campaign: { completed: {}, clues: [], evidence: [], decisions: [] },
    onEvent: e => events.push(e)
  });
  sim.stage = 4;
  sim.setupStage();
  sim.begin();

  assert.strictEqual(sim.maxSampleTubes, 2, 'Mars rover should have 2 sample tubes maximum');
  assert.strictEqual(sim.sampleTubesUsed, 0, 'Initially 0 sample tubes used');

  // Complete target 0 (mineral core)
  sim.targetIndex = 0;
  sim.completeTarget();
  assert.strictEqual(sim.sampleTubesUsed, 1, 'First core sample seals 1 tube');
  assert.ok(events.some(e => e.type === 'sampleStored' && e.tubeIndex === 1), 'Should emit sampleStored event for tube 1');

  // Complete target 1 (context sample)
  sim.targetIndex = 1;
  sim.completeTarget();
  assert.strictEqual(sim.sampleTubesUsed, 2, 'Second core sample seals 2nd tube');
  assert.ok(events.some(e => e.type === 'sampleStored' && e.tubeIndex === 2), 'Should emit sampleStored event for tube 2');
});

test('Mars Séítah dunes loose sand increases driving power drain and reduces traction', () => {
  const simRocky = new Simulation({destination: 'mars'});
  simRocky.stage = 4;
  simRocky.setupStage();
  simRocky.begin();
  simRocky.position = {x: -20, y: 0, z: -80}; // Rocky delta area
  simRocky.speedCommand = 10;
  const initialRockyPower = simRocky.power;
  simRocky.step(0.5, {forward: true});
  const rockyDrain = initialRockyPower - simRocky.power;

  const simDunes = new Simulation({destination: 'mars'});
  simDunes.stage = 4;
  simDunes.setupStage();
  simDunes.begin();
  simDunes.position = {x: 50, y: 0, z: -80}; // Séítah dunes (x > 25)
  simDunes.speedCommand = 10;
  const initialDunesPower = simDunes.power;
  simDunes.step(0.5, {forward: true});
  const dunesDrain = initialDunesPower - simDunes.power;

  assert.ok(dunesDrain > rockyDrain, 'Driving through Séítah dunes soft sand must consume more power than firm ground');
});

test('Mars dust storm drops power significantly faster for solar panels than RTG power system', () => {
  const simSolar = new Simulation({destination: 'mars', loadout: [0, 0, 1, 1, 0, 0, 0, 0, 0]}); // loadout[1]=0 is solar
  simSolar.stage = 4;
  simSolar.setupStage();
  simSolar.stageTime = 30; // active storm
  simSolar.stormActive = true;
  simSolar.stormIntensity = 1.0;
  const solarP0 = simSolar.power;
  simSolar.update(1.0);
  const solarDrain = solarP0 - simSolar.power;

  const simRtg = new Simulation({destination: 'mars', loadout: [0, 1, 1, 1, 0, 0, 0, 0, 0]}); // loadout[1]=1 is RTG
  simRtg.stage = 4;
  simRtg.setupStage();
  simRtg.stageTime = 30; // active storm
  simRtg.stormActive = true;
  simRtg.stormIntensity = 1.0;
  const rtgP0 = simRtg.power;
  simRtg.update(1.0);
  const rtgDrain = rtgP0 - simRtg.power;

  assert.ok(solarDrain > rtgDrain * 2, 'Solar panels should lose power more than twice as fast as RTG during a dust storm');
});

test('Vesta Dawn Protocol: toggleOrbitMode switches between HAMO and LAMO and detects orbit regime', () => {
  const events = [];
  const sim = new Simulation({destination: 'asteroid', onEvent: e => events.push(e)});
  sim.stage = 2; // Mapping orbit chapters
  sim.setupStage();
  assert.strictEqual(sim.orbitMode, 'HAMO');
  assert.strictEqual(sim.currentOrbitRegime, 'HAMO');

  // Toggle to LAMO
  const toggled = sim.toggleOrbitMode();
  assert.strictEqual(toggled, true);
  assert.strictEqual(sim.orbitMode, 'LAMO');
  assert.strictEqual(sim.currentOrbitRegime, 'LAMO');
  assert.ok(events.some(e => e.type === 'orbitModeChange' && e.mode === 'LAMO'));

  // Toggle back to HAMO
  sim.toggleOrbitMode();
  assert.strictEqual(sim.orbitMode, 'HAMO');
  assert.strictEqual(sim.currentOrbitRegime, 'HAMO');
  assert.ok(events.some(e => e.type === 'orbitModeChange' && e.mode === 'HAMO'));
});

test('Vesta Dawn Protocol: LAMO close orbit provides +80% science yield bonus on completed targets', () => {
  const events = [];
  const sim = new Simulation({destination: 'asteroid', onEvent: e => events.push(e)});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();
  sim.orbitMode = 'LAMO';
  assert.strictEqual(sim.currentOrbitRegime, 'LAMO');

  const p0Score = sim.score;
  sim.completeTarget();
  assert.ok(sim.score > p0Score, 'Score should increase after completing target in LAMO');
  assert.ok(events.some(e => e.type === 'lamoObservationBonus'), 'Should emit lamoObservationBonus in LAMO pass');
});

test('Vesta Dawn Protocol: LAMO close passes trigger irregular gravitational perturbations and boulder ejecta proximity', () => {
  const sim = new Simulation({destination: 'asteroid'});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();
  sim.orbitMode = 'LAMO';

  // In LAMO, step should calculate irregular gravitational harmonics
  sim.step(0.1, {});
  assert.ok(sim.irregularGravityPerturbation > 0, 'Irregular gravity perturbation should be active in LAMO');

  // If inside boulder hazard proximity
  if (sim.hazards.length > 0) {
    const boulder = sim.hazards[0];
    sim.position = {x: boulder.x, y: boulder.y, z: boulder.z + boulder.radius + 5};
    sim.step(0.05, {});
    assert.strictEqual(sim.boulderProximity, 1, 'Should detect boulder ejecta proximity when close to a hazard');
  }
});

test('Vesta Dawn Protocol: multi-angle spectral scanning across observation angles awards bonus and emits multiAngleLock', () => {
  const events = [];
  const sim = new Simulation({destination: 'asteroid', onEvent: e => events.push(e)});
  sim.stage = 2;
  sim.setupStage();
  sim.begin();
  const target = sim.target;

  // Simulate scanning from angle 1 (sector 0: 0 deg)
  sim.position = {x: target.x, y: target.y, z: target.z + 20}; // angle ~ 0 deg
  sim.speedCommand = 0;
  sim.velocity = {x: 0, y: 0, z: 0};
  sim.step(0.1, {interact: true});
  assert.ok(sim.viewAnglesAcquired.size >= 1);

  // Angle 2 (sector 3: ~90 deg)
  sim.position = {x: target.x + 20, y: target.y, z: target.z};
  sim.step(0.1, {interact: true});
  assert.ok(sim.viewAnglesAcquired.size >= 2);

  // Angle 3 (sector 6: ~180 deg)
  sim.position = {x: target.x, y: target.y, z: target.z - 20};
  const scoreBefore = sim.score;
  sim.step(0.1, {interact: true});
  assert.ok(sim.viewAnglesAcquired.size >= 3);
  assert.ok(sim.score >= scoreBefore + 15, 'Multi-angle lock should award +15 science points');
  assert.ok(events.some(e => e.type === 'multiAngleLock'), 'Should emit multiAngleLock event');
});

test('Europa / Jupiter Jovian Deep-Field: radiation surge cycle and comms blackout windows', () => {
  const events = [];
  const sim = new Simulation({destination: 'jupiter', onEvent: e => events.push(e)});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();

  // Quiet observation window at t=5s
  sim.stageTime = 5;
  sim.update(0.1);
  assert.strictEqual(sim.radiationSurge, false, 't=5s should be quiet observation window');
  assert.strictEqual(sim.commsWindowActive, true, 't=5s should have active comms window');
  assert.ok(sim.radiationFlux < 1.0, 'Quiet window flux should be moderate');

  // Radiation surge window at t=16s
  sim.stageTime = 16;
  sim.update(0.1);
  assert.strictEqual(sim.radiationSurge, true, 't=16s should trigger radiation surge');
  assert.strictEqual(sim.commsWindowActive, false, 't=16s should be comms blackout (occultation)');
  assert.ok(sim.radiationFlux >= 1.2, 'Radiation surge should produce intense flux');
  assert.ok(events.some(e => e.type === 'radiationSurgeChange'), 'Should emit radiationSurgeChange event');
});

test('Europa / Jupiter Jovian Deep-Field: unshielded scanning in radiation and overheating degrade instrument health, restored by repair', () => {
  const sim = new Simulation({destination: 'jupiter'});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();
  assert.strictEqual(sim.instrumentHealth, 100);

  // Overheating degrades instruments
  sim.heat = 85;
  sim.step(1.0, {});
  assert.ok(sim.instrumentHealth < 100, 'Heat > 75C should degrade instrument health');

  // High radiation unshielded scanning degrades instruments further
  sim.radiationFlux = 2.0;
  sim.route = 'science';
  sim.position = {x: sim.target.x, y: sim.target.y, z: sim.target.z};
  sim.velocity = {x: 0, y: 0, z: 0};
  sim.speedCommand = 0;
  const healthBeforeScan = sim.instrumentHealth;
  sim.step(0.5, {interact: true});
  assert.ok(sim.instrumentHealth < healthBeforeScan, 'Unshielded scanning in radiation should degrade instruments');

  // Repair kit restores both hull and instruments when degraded
  sim.instrumentHealth = 70;
  const degradedHealth = sim.instrumentHealth;
  assert.strictEqual(sim.repairs, 2);
  const repaired = sim.repair();
  assert.strictEqual(repaired, true);
  assert.ok(sim.instrumentHealth > degradedHealth, 'Repair should restore instrument health');
});

test('Europa / Jupiter Jovian Deep-Field: risk-reward tactical retreat completes stage and awards Survival Margin Bonus', () => {
  const events = [];
  const sim = new Simulation({destination: 'jupiter', onEvent: e => events.push(e)});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();

  assert.strictEqual(sim.canRetreat, false, 'Cannot retreat before collecting any science');
  assert.strictEqual(sim.retreat(), false, 'retreat() returns false when canRetreat is false');

  // Complete one measurement (target 0: INDUCED DIPOLE FIELD SOUNDING)
  const scoreBefore = sim.score;
  const doseBefore = sim.radiationDose;
  sim.completeTarget();
  assert.strictEqual(sim.measurementsCollected, 1, 'Should record 1 measurement');
  assert.ok(sim.radiationDose > doseBefore, 'Science measurement should add radiation dose');
  assert.strictEqual(sim.canRetreat, true, 'canRetreat unlocks after 1 measurement');

  // Execute tactical retreat
  const retreated = sim.retreat();
  assert.strictEqual(retreated, true, 'retreat() succeeds');
  assert.strictEqual(sim.retreatedSafely, true, 'retreatedSafely flag set to true');
  assert.strictEqual(sim.mode, 'transition', 'Stage transitions upon tactical retreat');
  assert.ok(sim.score >= scoreBefore + 25, 'Retreat awards Survival Margin Bonus');
  assert.ok(events.some(e => e.type === 'retreatSuccess'), 'Should emit retreatSuccess event');
  assert.ok(sim.journal.some(j => j.title === 'TACTICAL RETREAT'), 'Should log tactical retreat in mission journal');
});

test('Earth / LEO Sentinel Recovery: ground station pass cycles and tracking uncertainty', () => {
  const events = [];
  const sim = new Simulation({destination: 'earth', onEvent: e => events.push(e)});
  sim.stage = 1;
  sim.setupStage();
  sim.begin();

  // AOS (Acquisition of Signal) at t = 5s
  sim.stageTime = 5;
  sim.update(0.1);
  assert.strictEqual(sim.groundStationPass, true, 't=5s should be in ground station pass (AOS)');
  assert.strictEqual(sim.trackingUncertainty, 5, 'Tracking uncertainty should be 5m during AOS');

  // LOS (Loss of Signal) at t = 18s
  sim.stageTime = 18;
  sim.update(0.1);
  assert.strictEqual(sim.groundStationPass, false, 't=18s should be in orbital shadow (LOS)');
  assert.strictEqual(sim.trackingUncertainty, 35, 'Tracking uncertainty should expand to 35m during LOS');
  assert.ok(events.some(e => e.type === 'groundStationPassChange'), 'Should emit groundStationPassChange event');
});

test('Earth / LEO Sentinel Recovery: orbital conjunction prediction and CAM burn maneuver', () => {
  const events = [];
  const sim = new Simulation({destination: 'earth', onEvent: e => events.push(e)});
  sim.stage = 1;
  sim.setupStage();
  sim.begin();

  // Position a debris hazard directly on an incoming collision trajectory
  sim.position = {x: 0, y: 10, z: 0};
  sim.velocity = {x: 0, y: 0, z: -20};
  sim.hazards = [{
    x: 2, y: 10, z: -80,
    radius: 4, vx: 0, vy: 0, vz: 0,
    name: 'TEST DEBRIS #999'
  }];

  // Update simulation to predict close approach
  sim.update(0.1);
  assert.ok(sim.closestApproach !== null, 'Should detect close approach for oncoming debris');
  assert.ok(sim.closestApproach.tca < 5, 'Time to closest approach should be calculated');
  assert.strictEqual(sim.conjunctionRisk, 'critical', 'Close approach under 20m should trigger critical conjunction');
  assert.ok(events.some(e => e.type === 'conjunctionRiskChange'), 'Should emit conjunctionRiskChange event');

  // Execute Collision Avoidance Maneuver (CAM)
  const initialFuel = sim.fuel;
  const initialScore = sim.score;
  assert.strictEqual(sim.canExecuteCamBurn, true);

  const burnSuccess = sim.executeCamBurn();
  assert.strictEqual(burnSuccess, true, 'executeCamBurn should succeed');
  assert.ok(sim.fuel < initialFuel, 'CAM burn should consume propellant');
  assert.strictEqual(sim.conjunctionsAvoided, 1, 'Should increment conjunctionsAvoided');
  assert.ok(sim.score >= initialScore + 15, 'CAM burn should award safety clearance score');
  assert.strictEqual(sim.conjunctionRisk, 'nominal', 'Conjunction risk should be cleared');
  assert.ok(events.some(e => e.type === 'camBurnSuccess'), 'Should emit camBurnSuccess event');
  assert.ok(sim.journal.some(j => j.title === 'COLLISION AVOIDANCE MANEUVER'), 'Should log CAM burn in journal');
});

test('Earth / LEO Sentinel Recovery: Stage 4 satellite recovery logs authentic Earth observation data', () => {
  const sim = new Simulation({destination: 'earth'});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();

  assert.strictEqual(sim.targets.length, 3);
  assert.strictEqual(sim.targets[0].name, 'SENTINEL-7 PRIMARY TELEMETRY BUS');

  // Complete target 0
  sim.completeTarget();
  assert.ok(sim.journal.some(j => j.text.includes('Sentinel-7 Primary Telemetry Bus')), 'Should log telemetry bus recovery');

  // Complete target 1
  sim.completeTarget();
  assert.ok(sim.journal.some(j => j.text.includes('ocean color & sea surface temperature')), 'Should log ocean temperature data');

  // Complete target 2
  sim.completeTarget();
  assert.ok(sim.journal.some(j => j.text.includes('CALIOP Atmospheric Lidar')), 'Should log atmospheric lidar data');
});

test('NASA Open Data Provenance: resolves authentic instruments and dataset IDs across all destinations', () => {
  // Mars: MRO CRISM & Perseverance PIXL
  const marsProv = getTargetProvenance('mars', 'SÉÍTAH OLIVINE DUNES');
  assert.ok(marsProv.instrument.includes('PIXL') || marsProv.instrument.includes('CRISM'), 'Mars instrument must cite PIXL or CRISM');
  assert.ok(marsProv.datasetId.includes('M2020-PIXL') || marsProv.datasetId.includes('PDS'), 'Mars dataset must cite NASA PDS identifier');

  // Moon: LRO LEND & Diviner
  const moonProv = getTargetProvenance('moon', 'COLD-TRAP PROFILE MOSAIC');
  assert.ok(moonProv.instrument.includes('Diviner') || moonProv.instrument.includes('LEND'), 'Moon instrument must cite Diviner or LEND');
  assert.ok(moonProv.datasetId.includes('LRO-L') || moonProv.datasetId.includes('DLRE'), 'Moon dataset must cite LRO PDS catalog');

  // Europa: Galileo MAG & Europa Clipper MISE
  const europaProv = getTargetProvenance('jupiter', 'INDUCED DIPOLE FIELD SOUNDING');
  assert.ok(europaProv.instrument.includes('MAG') || europaProv.instrument.includes('PIMS'), 'Europa instrument must cite MAG or PIMS');
  assert.ok(europaProv.datasetId.includes('GO-J-MAG') || europaProv.datasetId.includes('EC-PIMS'), 'Europa dataset must cite Galileo/Clipper catalog');

  // Earth: MODIS & CALIOP
  const earthProv = getTargetProvenance('earth', 'OCEAN COLOR & SST OBSERVATIONS');
  assert.ok(earthProv.instrument.includes('MODIS'), 'Earth instrument must cite MODIS');
  assert.ok(earthProv.datasetId.includes('MODIS') || earthProv.datasetId.includes('Earthdata'), 'Earth dataset must cite NASA Earthdata catalog');

  // Test simulation target completion emits verified provenance
  const events = [];
  const sim = new Simulation({destination: 'mars', onEvent: e => events.push(e)});
  sim.stage = 4;
  sim.setupStage();
  sim.begin();

  sim.completeTarget();
  const targetEvent = events.find(e => e.type === 'target');
  assert.ok(targetEvent, 'Should emit target event');
  assert.ok(targetEvent.provenance, 'Target event must include verified NASA Open Data provenance');
  assert.ok(targetEvent.provenance.datasetId, 'Provenance must have dataset ID');
  assert.ok(targetEvent.provenance.url, 'Provenance must have archive URL');
});

test('NASA Mission Classes: enforces Discovery ($500M), New Frontiers ($1.0B), and Flagship ($3.25B) budget caps', () => {
  // Discovery class with standard build and Falcon 9 is under $500M
  const discBuild = designStats([0, 1, 1, 1], 'mars', 'discovery', 'falcon9_medium');
  assert.equal(discBuild.valid, true);
  assert.equal(discBuild.missionClass.costLimit, 500);
  assert.ok(discBuild.totalMissionCost <= 500);

  // Expensive flagship build (advanced chem + fission + heavy armor + return lab + SLS)
  const flagshipLoadout = [2, 2, 2, 2, 2, 2, 2, 2, 2];
  const discRejected = designStats(flagshipLoadout, 'jupiter', 'discovery', 'sls_block1b');
  assert.equal(discRejected.valid, false, 'Massive Flagship payload must fail Discovery $500M budget');
  assert.ok(discRejected.issues.some(i => i.includes('exceeds Discovery cap')));

  // Same heavy payload is permitted under Flagship class ($3.25B cap) with SLS
  const flagshipApproved = designStats(flagshipLoadout, 'jupiter', 'flagship', 'sls_block1b');
  assert.equal(flagshipApproved.missionClass.costLimit, 3250);
  assert.ok(flagshipApproved.totalMissionCost < 3250);
});

test('Launch Vehicles: enforces fairing payload mass limits and calculates C3 injection boost', () => {
  // Extended propellant tank (40 t fuel) creates ~84.2 t wet mass
  const heavyTanksLoadout = [0, 1, 1, 1, 0, 0, 0, 0, 2];
  
  // Falcon 9 Medium has 76 t limit -> must fail fairing limit
  const f9Stats = designStats(heavyTanksLoadout, 'mars', 'new_frontiers', 'falcon9_medium');
  assert.equal(f9Stats.valid, false, 'Heavy wet mass must exceed Falcon 9 76 t fairing limit');
  assert.ok(f9Stats.issues.some(i => i.includes('exceeds Falcon 9 Medium fairing limit')));

  // Upgrading to Heavy-Lift Workhorse (98 t limit) passes fairing check
  const heavyStats = designStats(heavyTanksLoadout, 'mars', 'new_frontiers', 'heavy_workhorse');
  assert.equal(heavyStats.valid, true, 'Heavy-Lift launcher must accommodate 84 t payload');
  assert.equal(heavyStats.launchVehicle.fairingDiameter, '5.4 m');
  assert.ok(heavyStats.deltaV > f9Stats.rawDeltaV, 'Heavy-Lift must add C3 injection deltaV boost');
  assert.ok(Math.abs(heavyStats.deltaV - (heavyStats.rawDeltaV + 0.65)) < 1e-6);

  // SLS Block 1B provides +1.45 km/s C3 injection boost with 8.4m exploration fairing
  const slsStats = designStats(heavyTanksLoadout, 'jupiter', 'flagship', 'sls_block1b');
  assert.equal(slsStats.valid, true);
  assert.equal(slsStats.fairingDiameter, '8.4 m');
  assert.ok(Math.abs(slsStats.deltaVBonus - 1.45) < 1e-6);
  assert.ok(slsStats.deltaV > heavyStats.deltaV);
});

test('DSN Speed-of-Light Comms: computes authentic OWLT and RTLT delays per destination', () => {
  const earthSim = new Simulation({destination: 'earth'});
  const earthDsn = earthSim.getDsnTelemetry();
  assert.equal(earthDsn.owltDisplay, '1.4 ms');
  assert.equal(earthDsn.rtltDisplay, '2.8 ms');
  assert.equal(earthDsn.isAutonomous, false, 'LEO allows direct Earth teleoperation');

  const moonSim = new Simulation({destination: 'moon'});
  const moonDsn = moonSim.getDsnTelemetry();
  assert.equal(moonDsn.owltDisplay, '1.28 s');
  assert.equal(moonDsn.rtltDisplay, '2.56 s');

  const marsSim = new Simulation({destination: 'mars'});
  const marsDsn = marsSim.getDsnTelemetry();
  assert.equal(marsDsn.owltDisplay, '12m 30s');
  assert.equal(marsDsn.rtltDisplay, '25m 00s');
  assert.equal(marsDsn.isAutonomous, true, 'Mars comms delay requires autonomous FDIR triage');

  const vestaSim = new Simulation({destination: 'asteroid'});
  const vestaDsn = vestaSim.getDsnTelemetry();
  assert.equal(vestaDsn.owltDisplay, '19m 38s');
  assert.equal(vestaDsn.rtltDisplay, '39m 16s');

  const jupiterSim = new Simulation({destination: 'jupiter'});
  const jupiterDsn = jupiterSim.getDsnTelemetry();
  assert.equal(jupiterDsn.owltDisplay, '43m 15s');
  assert.equal(jupiterDsn.rtltDisplay, '86m 30s');
  assert.equal(jupiterDsn.isAutonomous, true);
});

test('DSN Ground Stations & Comms Subsystem: computes tracking stations and radio link metrics', () => {
  // Comms choice 0: Patch antenna array
  const patchSim = new Simulation({destination: 'mars', loadout: [0, 1, 1, 1, 0, 0, 0, 0, 0]});
  const patchDsn = patchSim.getDsnTelemetry();
  assert.equal(patchDsn.bandwidth, '2.0 kbps');
  assert.equal(patchDsn.linkMargin, '+3.2 dB');

  // Comms choice 1: High-gain dish
  const dishSim = new Simulation({destination: 'mars', loadout: [0, 1, 1, 1, 1, 0, 0, 0, 0]});
  const dishDsn = dishSim.getDsnTelemetry();
  assert.equal(dishDsn.bandwidth, '28.5 kbps');
  assert.equal(dishDsn.linkMargin, '+8.7 dB');

  // Comms choice 2: Dish + relay mast
  const mastSim = new Simulation({destination: 'mars', loadout: [0, 1, 1, 1, 2, 0, 0, 0, 0]});
  const mastDsn = mastSim.getDsnTelemetry();
  assert.equal(mastDsn.bandwidth, '128 kbps');
  assert.equal(mastDsn.linkMargin, '+14.1 dB');

  // Ground station rotation
  assert.ok(dishDsn.stations.includes(dishDsn.activeStation));
  dishSim.time = 250; // After 240 seconds, station index shifts
  const rotatedDsn = dishSim.getDsnTelemetry();
  assert.ok(rotatedDsn.activeStation);
});

test('Deep Space Emergency Anomalies: triggers destination-authentic anomalies and executes real-time triage directives', () => {
  let emittedAnomaly = null;
  const marsSim = new Simulation({
    destination: 'mars',
    onEvent: (ev) => {
      if (ev.type === 'event') emittedAnomaly = ev;
    }
  });

  marsSim.stage = 1;
  marsSim.begin();
  marsSim.stageTime = 13;
  marsSim.step(1/60); // Trigger transit anomaly in stage 1

  assert.ok(emittedAnomaly, 'Should trigger deep space anomaly');
  assert.equal(emittedAnomaly.id, 'cme_surge', 'Mars should trigger coronal mass ejection surge');
  assert.ok(emittedAnomaly.dsn, 'Anomaly must include live DSN telemetry');
  assert.equal(emittedAnomaly.dsn.rtltDisplay, '25m 00s');

  // Test triage choice execution
  const initialHull = marsSim.hull;
  marsSim.choose('autonomous_attitude');
  assert.equal(marsSim.mode, 'flight', 'Triage choice should restore flight mode');
  assert.equal(marsSim.hull, initialHull, 'Autonomous attitude reorientation protects hull integrity');
  assert.ok(marsSim.journal.some(j => j.title === 'Deep Space Triage'));

  // Test Vesta reaction wheel momentum saturation triage
  let vestaAnomaly = null;
  const vestaSim = new Simulation({
    destination: 'asteroid',
    onEvent: (ev) => {
      if (ev.type === 'event') vestaAnomaly = ev;
    }
  });
  vestaSim.stage = 1;
  vestaSim.begin();
  vestaSim.stageTime = 13;
  vestaSim.step(1/60);
  assert.equal(vestaAnomaly.id, 'wheel_saturation');
  const initialFuel = vestaSim.fuel;
  vestaSim.choose('rcs_desaturate');
  assert.ok(vestaSim.fuel < initialFuel, 'RCS desaturation burn consumes propellant margin');

  // Test Europa Jovian plasma arc triage
  let jupiterAnomaly = null;
  const jupiterSim = new Simulation({
    destination: 'jupiter',
    onEvent: (ev) => {
      if (ev.type === 'event') jupiterAnomaly = ev;
    }
  });
  jupiterSim.stage = 1;
  jupiterSim.begin();
  jupiterSim.stageTime = 13;
  jupiterSim.step(1/60);
  assert.equal(jupiterAnomaly.id, 'jovian_plasma_arc');
  const initialPower = jupiterSim.power;
  jupiterSim.choose('load_shed');
  assert.ok(jupiterSim.power < initialPower, 'Bus load shedding temporarily draws power buffer');
});



