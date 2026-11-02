import test from 'node:test';
import assert from 'node:assert/strict';
import {Simulation} from '../src/simulation.js';
import {makeCampaign,FLIGHT_PLANS,SITES} from '../src/campaign.js';
import {designStats} from '../src/data.js';

for(const plan of FLIGHT_PLANS)for(const repair of ['bypass','isolate'])test(`Mars campaign: ${plan.id}, ${repair}, complete six chapters`,()=>{
 const s=new Simulation({campaign:makeCampaign(plan.id)});s.assist=true;let ticks=0;const ops=[];
 while(!['complete','failed'].includes(s.mode)&&ticks++<90000){
  if(s.mode==='briefing')s.begin();
  else if(s.mode==='transition')s.advance();
  else if(s.mode==='clue')s.acknowledgeClue();
  else if(s.mode==='event')s.choose(s.stage===1?'shelter':'archive');
  else if(s.mode==='operation'){ops.push(s.operation);s.resolveOperation(s.operation,{repair,survey:'boundary',analysis:'water'}[s.operation]);}
  else if(s.isSurface&&s.targets.every(target=>target.done))s.departSurface();
  else s.step(1/60,{interact:true});
 }
 assert.equal(s.mode,'complete',`stage ${s.stage} mode ${s.mode} fuel ${s.fuel} power ${s.power}`);
 assert.deepEqual(ops,['repair','survey','analysis']);assert.equal(s.campaign.clues.length,3);assert.equal(s.campaign.evidence.length,3);assert.equal(s.campaign.confidence,'supported');assert.equal(s.campaign.decisions.length,3);assert.equal(s.campaign.conclusion,'water');assert.ok(s.score>200);assert.ok(s.power>0);
});
test('Science gates reject invalid outcomes and prevent duplicate rewards',()=>{
 const s=new Simulation({campaign:makeCampaign()});s.mode='operation';s.operation='survey';
 assert.equal(s.resolveOperation('survey','fake'),false);assert.equal(s.score,0);
 assert.equal(s.resolveOperation('survey','boundary'),true);const score=s.score;assert.equal(s.resolveOperation('survey','boundary'),false);assert.equal(s.score,score);
});
test('Landing site changes surface coordinates and checkpoint preserves design consequences',()=>{
 const s=new Simulation({campaign:makeCampaign('rapid')});s.mode='operation';s.operation='repair';s.resolveOperation('repair','isolate');
 s.mode='operation';s.operation='survey';s.resolveOperation('survey','ridge');s.stage=4;s.setupStage();
 assert.equal(s.target.x,SITES[2].x);const r=Simulation.restore(s.serialize());assert.equal(r.campaign.plan,'rapid');assert.equal(r.campaign.site,'ridge');assert.equal(r.stats.scan,s.stats.scan);assert.equal(r.target.z,SITES[2].z);
});
test('Scientific overclaims retain data but earn lower interpretation reward',()=>{
 const sims=['water','life'].map(value=>{const s=new Simulation({campaign:makeCampaign()});s.campaign.evidence=[{kind:'mineral'},{kind:'context'},{kind:'recorder'}];s.mode='operation';s.operation='analysis';s.resolveOperation('analysis',value);return s;});assert.equal(sims[0].score-sims[1].score,16);assert.equal(sims[1].mode,'event');
});
test('Rover leads can be visited out of order; early return yields a provisional result',()=>{
 const s=new Simulation({campaign:makeCampaign()});s.stage=4;s.campaign.site='boundary';s.setupStage();s.begin();
 assert.equal(s.selectSurfaceTarget(2),true);s.completeTarget();assert.equal(s.canDepartSurface,false);
 assert.equal(s.selectSurfaceTarget(1),true);s.completeTarget();assert.equal(s.canDepartSurface,true);
 assert.equal(s.targets[0].done,false);assert.equal(s.departSurface(),true);
 assert.equal(s.resolveOperation('analysis','water'),true);assert.equal(s.campaign.confidence,'provisional');assert.equal(s.score,Math.round(10*s.stats.yield)*2+9);
});
test('Signal fragments pause flight and the final fragment opens the survey',()=>{
 const s=new Simulation({campaign:makeCampaign()});s.stage=2;s.setupStage();s.begin();
 for(let i=0;i<3;i++){s.completeTarget();assert.equal(s.mode,'clue');assert.equal(s.campaign.clues.length,i+1);assert.equal(s.acknowledgeClue(),true);}
 assert.equal(s.mode,'operation');assert.equal(s.operation,'survey');
});
test('Assembly power uses destination distance and blocks ion / radioisotope mismatch',()=>{
 assert.ok(designStats([0,0,0,0],'mars').generatedKW<designStats([0,0,0,0],'earth').generatedKW);
 assert.equal(designStats([1,1,0,0],'mars').valid,false);assert.equal(designStats([0,0,0,0],'jupiter').valid,false);
 assert.ok(Math.abs(designStats([0,0,0,0],'asteroid').generatedKW-18/2.36**2)<1e-8);
});
