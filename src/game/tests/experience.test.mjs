import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_LOADOUT,DESTINATIONS,designStats} from '../src/data.js';
import {componentPreview,suggestedBuild,missionGuidance,FlightCoach} from '../src/experience.js';
import {Simulation} from '../src/simulation.js';

test('All 135 destination/component previews conserve power and match the simulation configuration',()=>{
  for(const destination of DESTINATIONS)for(let slot=0;slot<9;slot++)for(let choice=0;choice<3;choice++){
    const preview=componentPreview(DEFAULT_LOADOUT,destination.id,slot,choice),loadout=[...DEFAULT_LOADOUT];loadout[slot]=choice;
    const sim=new Simulation({destination:destination.id,loadout});
    assert.deepEqual(preview.after,sim.stats);
    assert.ok(Math.abs(preview.after.demandKW-(.55+preview.after.parts.reduce((sum,p)=>sum+p.demand,0)))<1e-10);
    assert.ok(Math.abs(preview.after.powerMargin-(preview.after.generatedKW-preview.after.demandKW))<1e-10);
  }
});
test('Jupiter solar preview exposes its deficit; suggested designs fit every destination',()=>{
  const solar=componentPreview(DEFAULT_LOADOUT,'jupiter',1,0);assert.ok(solar.after.powerMargin<0);assert.ok(Math.abs(solar.after.generatedKW-18/5.2**2)<1e-10);
  for(const d of DESTINATIONS)assert.equal(suggestedBuild(d.id).stats.valid,true);
  const tank=componentPreview(DEFAULT_LOADOUT,'mars',8,1);assert.equal(tank.delta.mass,7);assert.equal(tank.delta.cost,8);
});
test('Mission guidance explains distance, braking, readiness, progress and gates separately',()=>{
  const s=new Simulation();s.mode='flight';assert.match(missionGuidance(s).detail,/E is not required/);
  s.stage=2;s.setupStage();s.mode='flight';assert.match(missionGuidance(s).detail,/65 m/);
  s.position={...s.target};s.velocity.z=20;assert.equal(missionGuidance(s).state,'blocked');
  s.velocity.z=0;assert.equal(missionGuidance(s).state,'ready');s.scan=.45;assert.match(missionGuidance(s).title,/45%/);
  s.position.x+=100;assert.equal(missionGuidance(s).state,'navigate');s.position={...s.target};s.velocity.z=20;assert.equal(missionGuidance(s).state,'blocked');
});
test('Practice advances through real input and pauses with flight; scanning completes the instrument lesson',()=>{
  const s=new Simulation(),coach=new FlightCoach();s.begin();
  for(const keys of [{forward:true},{brake:true},{left:true}])for(let i=0;i<45;i++){s.step(1/60,keys);coach.update(s,keys,1/60);}
  assert.equal(coach.basicComplete,true);s.pause();const step=coach.step;coach.update(s,{interact:true},1);assert.equal(coach.step,step);
  s.stage=2;s.setupStage();s.mode='flight';assert.match(coach.prompt(s).title,/INSTRUMENT/);s.scan=.1;coach.update(s,{},.1);assert.equal(coach.scanComplete,true);
});
