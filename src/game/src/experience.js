import {SYSTEMS,DEFAULT_LOADOUT,normalizeLoadout,designStats} from './data.js';

export function componentPreview(loadout,destination,slot,choice){
  const selected=normalizeLoadout(loadout),before=designStats(selected,destination);selected[slot]=choice;
  const after=designStats(selected,destination),part=after.parts[slot];
  const specs=[['Power draw',part.demand.toFixed(3)+' kW']];
  if(slot===0)specs.push(['Thrust',part.thrustN>=1000?(part.thrustN/1000).toFixed(0)+' kN':part.thrustN+' N'],['Specific impulse',part.isp+' s']);
  if(slot===1)specs.splice(0,1,['Output at destination',after.generatedKW.toFixed(2)+' kW'],['Game reserve capacity',part.capacity+' units']);
  if(slot===2)specs.push(['Game damage received',Math.round(part.armor*100)+'% of baseline']);
  if(slot===3)specs.push(['Scan rate','×'+part.scan],['Science yield','×'+part.yield]);
  if(slot===4)specs.push(['Relay scan rate','×'+part.link]);
  if(slot===5)specs.push(['Cooling rate','×'+part.cooling]);
  if(slot===6)specs.push(['Lateral response','×'+part.handling]);
  if(slot===7)specs.push(['Recovery yield','×'+part.recovery]);
  if(slot===8)specs.push(['Propellant',part.fuelMass+' t'],['Structure + propellant',(part.mass+part.fuelMass)+' t']);
  return {part,specs,before,after,delta:{mass:after.mass-before.mass,cost:after.cost-before.cost,deltaV:after.deltaV-before.deltaV,power:after.powerMargin-before.powerMargin}};
}
export function suggestedBuild(destination){return {loadout:[...DEFAULT_LOADOUT],stats:designStats(DEFAULT_LOADOUT,destination)};}
export function interactionLimits(sim){return {range:sim.isSurface?24:sim.stage===2||sim.stage===4?65:35,speed:sim.isSurface?4:sim.stage===5?8:sim.stage===3?10:12};}
export function missionGuidance(sim){
  if(!sim.target)return {title:sim.canDepartSurface?'Samples aboard · press X to depart':'All goals completed!',detail:'Review your findings and continue the mission.',state:'ready'};
  if(sim.destination.id==='asteroid'&&sim.boulderProximity){
    return {title:'⚠ BOULDER EJECTA HAZARD',detail:'Low-altitude pass near boulder ejecta! Steer away or ascend to HAMO with T to avoid collision.',state:'blocked'};
  }
  if(sim.destination.id==='jupiter'&&sim.stage===4){
    if(sim.radiationSurge&&sim.route!=='shield'){
      return {title:'⚡ RADIATION SURGE: SHIELDS REQUIRED',detail:'Intense Jovian magnetic flux is bombarding the ship! Press 3 to route power to SHIELDS immediately.',state:'blocked'};
    }
    if(sim.radiationDose>75){
      return {title:'⚠ HIGH RADIATION DOSE: RETREAT RECOMMENDED',detail:`Cumulative radiation dose is critical (${Math.round(sim.radiationDose)}%). Press X to retreat to safety and secure mission survival.`,state:'blocked'};
    }
    if(sim.canRetreat&&!sim.radiationSurge){
      return {title:`Observation window open (${sim.measurementsCollected}/3 scans)`,detail:'Radiation is quiet. Hold E to scan the current target, or press X to retreat to safe orbit with your data.',state:'ready'};
    }
  }
  const name=sim.target.name,limits=interactionLimits(sim);
  if(sim.stage<2){const dx=sim.target.x-sim.position.x,dy=sim.target.y-sim.position.y,offset=Math.hypot(dx,dy);
    return {title:(offset>25?'Turn toward ':'Fly through ')+name,detail:offset>25?`Steer with A and D to turn. Arrow keys go up and down. Press W to go forward. E is not required.`:'Fly straight through the glowing ring ahead! E is not required. Press G for autopilot.',state:'navigate'};
  }
  if(sim.scan>0&&sim.range<limits.range&&sim.speed<limits.speed)return {title:`${Math.round(sim.scan*100)}% · Scanning in progress`,detail:'Hold your ship steady until the green scanning circle finishes.',state:'working'};
  if(sim.range>=limits.range)return {title:'Fly toward '+name,detail:`Target is ${Math.round(sim.range)} m away. Fly inside ${limits.range} m. ${sim.isSurface?'Press W to drive forward, A/D to steer.':'Press W to move forward, A/D to steer, S to slow down.'}`,state:'navigate'};
  if(sim.speed>=limits.speed)return {title:'Slow down! (Brake with S)',detail:`Going too fast (${sim.speed.toFixed(1)} m/s). Hold S to slow down below ${limits.speed} m/s so you can interact.`,state:'blocked'};
  return {title:'Ready · press E to interact',detail:`${name} is ready! ${sim.canDepartSurface?'Press E to collect, or press X to depart with the samples aboard.':'Press E once, then hold steady while scanning.'}`,state:'ready'};
}
export class FlightCoach{
  constructor(completed=false){this.step=0;this.practice=0;this.basicComplete=completed;this.scanComplete=completed;}
  update(sim,keys,dt){
    if(sim.mode!=='flight')return;
    if(!this.basicComplete&&sim.stage===0){
      const action=[keys.forward&&!sim.assist&&sim.speed>1,keys.brake&&!sim.assist, (keys.left||keys.right||keys.up||keys.down)&&!sim.assist][this.step];
      if(action)this.practice+=dt;
      if(this.practice>=.5){this.practice=0;this.step++;if(this.step>=3)this.basicComplete=true;}
    }
    if(sim.stage===2&&sim.scan>0)this.scanComplete=true;
  }
  prompt(sim){
    if(!this.basicComplete&&sim.stage===0)return {title:'PILOT PRACTICE '+(this.step+1)+'/3',detail:sim.assist?'Autopilot is active. Press G to take manual control and practice.':['Hold W to fly forward toward the glowing ring.','Release W. Now hold S to brake and slow down.','Use A and D or arrow keys to steer into the ring.'][this.step]};
    if(!this.scanComplete&&sim.stage===2)return {title:'INSTRUMENT PRACTICE',detail:'Fly close to the beacon (inside 65 m), slow down below 12 m/s with S, and press E once to scan.'};
    return null;
  }
}
