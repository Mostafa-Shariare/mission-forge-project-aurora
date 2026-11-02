import test from 'node:test';
import assert from 'node:assert/strict';
import {Box3} from 'three';
import {DEFAULT_LOADOUT,SYSTEMS,designStats} from '../src/data.js';
import {Simulation} from '../src/simulation.js';
import {vehicleModule,assembledVehicle,disposeModel} from '../src/vehicle.js';

test('Every subsystem variant has finite, visible geometry and assembled ships retain nine modules',()=>{
  for(let slot=0;slot<SYSTEMS.length;slot++)for(let choice=0;choice<3;choice++){
    const model=vehicleModule(slot,choice),bounds=new Box3().setFromObject(model);
    assert.equal(bounds.isEmpty(),false);assert.ok(Number.isFinite(bounds.max.x+ bounds.max.y+bounds.max.z));disposeModel(model);
  }
  const ship=assembledVehicle([0,1,1,1]);assert.equal(ship.userData.modules.length,9);disposeModel(ship);
});
test('Extra propellant increases ideal delta-v and reserve while reducing acceleration',()=>{
  const a=designStats(DEFAULT_LOADOUT),b=designStats([...DEFAULT_LOADOUT.slice(0,8),1]);
  assert.ok(b.deltaV>a.deltaV);assert.ok(b.acceleration<a.acceleration);assert.ok(b.efficiency<a.efficiency);assert.equal(b.fuelMass,34);
});
test('New subsystems change actual relay scanning, cooling, lateral response and recovery rewards',()=>{
  const loadout=[...DEFAULT_LOADOUT];for(const i of [4,5,6,7])loadout[i]=2;
  const a=new Simulation(),b=new Simulation({loadout});
  for(const s of [a,b]){s.stage=2;s.setupStage();s.mode='flight';s.position={...s.target};s.heat=70;s.step(.05,{interact:true,right:true});}
  assert.ok(b.scan>a.scan);assert.ok(b.heat<a.heat);assert.ok(b.velocity.x>a.velocity.x);
  for(const s of [a,b]){s.stage=4;s.setupStage();s.completeTarget();}
  assert.ok(b.score>a.score);
});
test('Four-module legacy checkpoints migrate to standard auxiliaries and nine-module saves round-trip',()=>{
  const original=new Simulation(),legacy=original.serialize();legacy.loadout=legacy.loadout.slice(0,4);
  assert.deepEqual(Simulation.restore(legacy).loadout,DEFAULT_LOADOUT);
  original.loadout[4]=2;assert.deepEqual(Simulation.restore(original.serialize()).loadout,original.loadout);
  const invalid=original.serialize();invalid.loadout=[0,0,0,0,0];assert.throws(()=>Simulation.restore(invalid));
});
