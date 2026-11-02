import {flightPlan,SITES,SIGNAL_FRAGMENTS,resolveOperation,getCampaignData,getTargetProvenance} from './campaign.js';
import {DESTINATIONS,STAGES,SYSTEMS,DEFAULT_LOADOUT,normalizeLoadout,designStats,clamp,getDestinationStages} from './data.js';
import {interactionLimits} from './experience.js';

export function seeded(seed=1287){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const point=(x,y,z)=>({x,y,z});
export class Simulation {
  constructor({destination='mars',loadout=DEFAULT_LOADOUT,difficulty='explorer',campaign=null,onEvent=()=>{}}={}) {
    this.destination=DESTINATIONS.find(d=>d.id===destination)||DESTINATIONS[2];
    this.loadout=normalizeLoadout(loadout); this.stats=designStats(this.loadout,this.destination.id); this.difficulty=difficulty; this.onEvent=onEvent;
    this.campaign=campaign?JSON.parse(JSON.stringify(campaign)):null;this.operation=null;
    if(this.campaign){this.campaign.clues??=[];this.campaign.evidence??=[];this.campaign.decisions??=[];this.campaign.completed??={};}
    this.stage=0; this.mode='briefing';this.time=0;this.stageTime=0;this.score=0;this.hull=100;this.fuel=100;
    this.power=100;this.repairs=2;this.route='balanced';this.assist=false;this.eventFlags={};this.journal=[];this.collisions=0;
    this.scan=0;this.targetIndex=0;this.heat=0;this.immunity=0;this.pulse=0;this.fullArchive=false;this.interactionQueued=false;
    this.reentryIntensity=0;this.stormActive=false;this.stormIntensity=0;this.alertLevel='nominal';
    this.radiationFlux=0;this.inShadow=false;this.bonusAnomaly=null;
    this.equipmentDamaged=false;this.touchdownQuality=null;this.flawlessLanding=false;
    this.sampleTubesUsed=0;this.maxSampleTubes=this.destination.id==='mars'?2:3;
    this.orbitMode='HAMO';this.irregularGravityPerturbation=0;this.boulderProximity=0;this.viewAnglesAcquired=new Set();
    this.radiationDose=0;this.maxRadiationDose=100;this.radiationSurge=false;this.instrumentHealth=100;
    this.commsWindowActive=true;this.measurementsCollected=0;this.retreatedSafely=false;
    this.conjunctionsAvoided=0;this.conjunctionRisk='nominal';this.closestApproach=null;
    this.groundStationPass=true;this.trackingUncertainty=5;this.lastCamBurnTime=-99;
    this.solarStormActive=false;this.solarStormIntensity=0;this.solarStormWarning=0;this.solarStormDuration=0;
    this.nextSolarStormTime=45+seeded(8421)()*25;
    this.setupStage();
  }
  emit(type,data={}){this.onEvent({type,...data});}
  get isSurface(){return this.stage===4&&this.destination.surface;}
  get target(){return this.targets[this.targetIndex];}
  get range(){return this.target?distance(this.position,this.target):0;}
  get speed(){return Math.hypot(this.velocity.x,this.velocity.y,this.velocity.z);}
  get missionProgress(){return (this.stage+Math.max(0,this.targetIndex)/Math.max(1,this.targets.length))/6;}
  get canDepartSurface(){return !!(this.campaign&&this.isSurface&&this.targets[2]?.done&&(this.targets[0]?.done||this.targets[1]?.done));}
  get canRetreat(){return this.destination.id==='jupiter'&&this.stage===4&&(this.measurementsCollected>=1||this.targets.some(t=>t.done));}
  get canExecuteCamBurn(){return this.destination.id==='earth'&&this.fuel>=3.5&&this.mode==='flight';}
  get currentStageInfo(){const list=getDestinationStages(this.destination.id);return list[this.stage]||STAGES[this.stage];}
  get currentOrbitRegime(){if(this.destination.id!=='asteroid')return 'nominal';return this.orbitMode;}
  toggleOrbitMode(){if(this.destination.id!=='asteroid'||this.stage<2)return false;this.orbitMode=this.orbitMode==='HAMO'?'LAMO':'HAMO';this.emit('orbitModeChange',{mode:this.orbitMode,regime:this.currentOrbitRegime});return true;}
  executeCamBurn(){
    if(!this.canExecuteCamBurn)return false;
    this.fuel=clamp(this.fuel-3.5,0,100);
    this.lastCamBurnTime=this.time;
    const lateralSign=(this.closestApproach&&this.closestApproach.x>this.position.x)?-1:1;
    const verticalSign=(this.closestApproach&&this.closestApproach.y>this.position.y)?-1:1;
    this.velocity.x+=lateralSign*11*this.stats.handling;
    this.velocity.y+=verticalSign*8*this.stats.handling;
    this.speedCommand=clamp(this.speedCommand+4,-18,62);
    for(const h of this.hazards){
      const d=Math.hypot(h.x-this.position.x,h.y-this.position.y);
      if(d<75){h.x+=lateralSign*-48;h.y+=verticalSign*-36;}
    }
    const wasCritical=this.conjunctionRisk==='critical';
    if(wasCritical){
      this.conjunctionsAvoided++;
      this.score+=15;
      this.log('COLLISION AVOIDANCE MANEUVER',`Fired CAM orbital burn. Conjunction cleared with positive miss-distance margin. Propellant: ${Math.round(this.fuel)}%.`);
      this.emit('camBurnSuccess',{avoided:this.conjunctionsAvoided,fuel:Math.round(this.fuel)});
    }
    this.conjunctionRisk='nominal';
    this.closestApproach=null;
    this.emit('camBurn',{fuel:Math.round(this.fuel),wasCritical});
    return true;
  }
  retreat(){
    if(this.destination.id!=='jupiter'||this.stage!==4||this.mode!=='flight')return false;
    if(!this.canRetreat){
      this.emit('interactionHint',{message:'Collect at least one Europa measurement before retreating!'});
      return false;
    }
    this.retreatedSafely=true;
    const marginBonus=Math.max(10,Math.round(50-(this.radiationDose||0)*0.4));
    this.score+=marginBonus;
    this.log('TACTICAL RETREAT',`Retreated from Europa radiation belts with ${this.measurementsCollected} measurement(s). Radiation dose: ${Math.round(this.radiationDose)}%. Survival margin bonus: +${marginBonus} pts.`);
    this.emit('retreatSuccess',{measurements:this.measurementsCollected,dose:Math.round(this.radiationDose),bonus:marginBonus});
    this.finishStage();
    return true;
  }
  setupStage(){
    this.stageTime=0;this.targetIndex=0;this.scan=0;this.canInteract=false;this.interactionQueued=false;this.speedCommand=0;this.heat=0;this.heading=0;this.stranded=0;this.throttle=0;
    this.reentryIntensity=0;this.stormActive=false;this.stormIntensity=0;this.radiationFlux=0;this.inShadow=false;this.bonusAnomaly=null;
    this.solarStormActive=false;this.solarStormIntensity=0;this.solarStormWarning=0;this.solarStormDuration=0;
    this.nextSolarStormTime=this.isSurface?9999:(38+seeded(8421+(this.stage||0)*7)()*30);
    if(this.stage===0){this.equipmentDamaged=false;this.touchdownQuality=null;this.flawlessLanding=false;}
    if(this.stage===4&&this.destination.id==='mars'){this.sampleTubesUsed=0;this.maxSampleTubes=2;}
    if(this.destination.id==='asteroid'){this.orbitMode='HAMO';this.irregularGravityPerturbation=0;this.boulderProximity=0;this.viewAnglesAcquired.clear();}
    if(this.destination.id==='jupiter'){this.radiationSurge=false;this.commsWindowActive=true;if(this.stage===0){this.radiationDose=0;this.instrumentHealth=100;this.measurementsCollected=0;this.retreatedSafely=false;}}
    if(this.destination.id==='earth'){this.conjunctionRisk='nominal';this.closestApproach=null;this.groundStationPass=true;this.trackingUncertainty=5;if(this.stage===0)this.conjunctionsAvoided=0;}
    this.position=point(0,this.isSurface?0:8,60);this.velocity=point(0,0,0);this.immunity=2;
    const dId=this.destination.id;
    const make=(p,i,name)=>({...point(...p),name,done:false});

    // 01 Departure Corridor
    if(this.stage===0){
      const stage0Coords={
        earth:    [[0,6,-160],[35,16,-400],[-25,8,-680],[15,14,-1000]],
        moon:     [[0,10,-180],[-20,25,-440],[30,12,-740],[0,8,-1060]],
        mars:     [[0,8,-170],[35,24,-420],[-20,10,-720],[10,16,-1050]],
        asteroid: [[0,8,-180],[-30,18,-450],[25,28,-780],[-10,12,-1120]],
        jupiter:  [[0,12,-200],[45,26,-500],[-35,14,-850],[15,20,-1240]]
      }[dId] || [[0,8,-160],[30,24,-390],[-18,8,-680]];

      const stage0Names={
        earth:    ['LEO CLIMB VECTOR','ORBITAL INCLINATION TRIM','EQUATORIAL TRAJECTORY GATE','CIRCULARIZATION NODE'],
        moon:     ['TLI BURN CORRIDOR','TRANS-LUNAR VECTOR','CIS-LUNAR GATE ALPHA','LUNAR CAPTURE CORRIDOR'],
        mars:     ['EARTH DEPARTURE GATE','TMI TRANSIT CORRIDOR','INTERPLANETARY CRUISE','ARES APPROACH VECTOR'],
        asteroid: ['MAIN BELT INJECTION','MARS-VESTA TRANSIT','CHONDRITE CROSSING','VESTA POLAR CAPTURE'],
        jupiter:  ['JOVIAN INJECTION GATE','OUTER MAGNETOPAUSE ENTRY','RADIATION BELT BOUNDARY','EUROPA APPROACH VECTOR']
      }[dId] || ['NAVIGATION GATE 01','NAVIGATION GATE 02','DEPARTURE VECTOR','TRAJECTORY EXIT'];

      this.targets=stage0Coords.map((p,i)=>make(p,i,stage0Names[i]||`NAVIGATION GATE 0${i+1}`));
    }

    // 02 Hazard / Transit Corridor
    if(this.stage===1){
      const stage1Coords={
        earth:    [[-25,18,-240],[30,22,-520],[-15,-8,-840],[0,14,-1180]],
        moon:     [[-25,20,-250],[30,-10,-560],[-12,15,-900],[18,8,-1240]],
        mars:     [[-28,25,-240],[32,-8,-570],[0,15,-940],[-15,12,-1300]],
        asteroid: [[-35,22,-260],[38,-14,-600],[-22,26,-980],[12,8,-1360]],
        jupiter:  [[-35,28,-280],[42,-12,-640],[-18,20,-1040],[10,14,-1460]]
      }[dId] || [[-28,25,-240],[32,-8,-570],[0,15,-940]];

      const stage1Names={
        earth:    ['UPPER STAGE FRAGMENT CLOUD','COSMOS DEBRIS BELT','GEO RETRO CORRIDOR','SAFE ESCAPE VECTOR'],
        moon:     ['CIS-LUNAR DUST VEIL','METEOROID STREAM A','COMETARY PARTICLE FIELD','SOUTH POLE CLEAR VECTOR'],
        mars:     ['DEBRIS CORRIDOR A','SOLAR FLARE STREAM','DEBRIS CORRIDOR B','TRANSFER EXIT'],
        asteroid: ['CHONDRITE SWARM ALPHA','TUMBLING ASTEROID CLUSTER','EJECTA CORRIDOR','RHEASILVIA APPROACH'],
        jupiter:  ['RADIATION FLUX ALPHA','IO PLASMA TORUS TUBE','HIGH-ENERGY PROTON CORRIDOR','EUROPA INSERTION VECTOR']
      }[dId] || ['DEBRIS CORRIDOR A','DEBRIS CORRIDOR B','TRANSFER EXIT'];

      this.targets=stage1Coords.map((p,i)=>make(p,i,stage1Names[i]||`HAZARD WAYPOINT 0${i+1}`));
    }

    // 03 Survey Beacons / Signal Relays
    if(this.stage===2){
      const pdsSignals=getCampaignData(dId).signals || SIGNAL_FRAGMENTS;
      const stage2Coords=[[-28,14,-230],[40,30,-490],[-12,-5,-780]];
      this.targets=stage2Coords.map((p,i)=>make(p,i,pdsSignals[i]?.label || `RELAY 0${i+1}`));

      // Secondary Science Anomaly in Cruise Orbit
      const bonusNames2={
        earth:    'HISTORIC VANGUARD-1 RADAR GLINT',
        moon:     'APOLLO 17 ASCENT STAGE DEBRIS',
        mars:     'OPPORTUNITY ROVER HEATSHIELD ARTIFACT',
        asteroid: 'ANCIENT BASALTIC CORE FRAGMENT',
        jupiter:  'IO PLASMA TORUS CHARGED FLUX'
      };
      this.bonusAnomaly={
        x:160,y:35,z:-390,
        name:bonusNames2[dId]||'SECONDARY SCIENCE ANOMALY',
        scanned:false,
        scanProgress:0,
        radius:7,
        yield:35
      };
    }

    // 04 Approach / Landing Zone
    if(this.stage===3){
      const stage3Name={
        earth:    'AURORA OBSERVATORY VELOCITY MATCH',
        moon:     'SHACKLETON CRATER RIM / LZ-01',
        mars:     'LANDING ZONE / LZ-01',
        asteroid: 'LOW-ALTITUDE ORBIT (LAMO) CORRIDOR',
        jupiter:  'EUROPA CLOSE FLYBY ENCOUNTER'
      }[dId] || (this.destination.surface?'LANDING ZONE / LZ-01':'PROBE CAPTURE ZONE');
      this.targets=[make([0,-10,-540],0,stage3Name)];
    }

    // 05 Surface Exploration / Drone Recovery
    if(this.stage===4){
      const destSites=getCampaignData(dId).sites;
      const site=(destSites.find(s=>s.id===this.campaign?.site)) || SITES.find(s=>s.id===this.campaign?.site) || destSites[0];
      const stage4Names={
        earth:    ['SENTINEL-7 PRIMARY TELEMETRY BUS','OCEAN COLOR & SST OBSERVATIONS','CALIOP ATMOSPHERIC LIDAR ARCHIVE'],
        moon:     [site.name+' / HYDROGEN CORE','COLD-TRAP PROFILE MOSAIC','POLAR STATION RECORDER'],
        mars:     [site.name+' / MINERAL CORE','LAYER CONTEXT / CAMERA MOSAIC','STATION RECORDER'],
        asteroid: [site.name+' / PYROXENE-I MAPPING','DIVALIA FOSSAE SURVEY PASS','RHEASILVIA SPECTRAL ARCHIVE'],
        jupiter:  ['INDUCED DIPOLE FIELD SOUNDING','CHAOS TERRAIN ICE COMPOSITION','CRYOPLUME VAPOR VENT SOUNDING']
      }[dId] || ['MINERAL SURVEY','CONTEXT SAMPLE','STATION RECORDER'];

      const stage4Coords=(this.isSurface&&this.campaign
        ?[[-45,0,-75],[130,0,-185],[-70,0,-265]]
        :this.isSurface
        ?[[-45,0,-75],[50,0,-170],[-10,0,-295]]
        :dId==='asteroid'
        ?[[-35,10,-210],[38,26,-450],[-15,8,-700]]
        :dId==='jupiter'
        ?[[-35,12,-190],[40,-8,-420],[-15,6,-680]]
        :[[-35,15,-190],[35,-10,-420],[0,5,-650]]);

      this.targets=stage4Coords.map((p,i)=>make(p,i,stage4Names[i]));
      if(this.campaign?.site){
        if(this.isSurface){
          this.targets[0]={...this.targets[0],x:site.x,z:site.z,name:stage4Names[0]};
          this.targets[1].name=stage4Names[1];
        }else if(dId==='asteroid'){
          this.targets[0].name=site.name+' / PYROXENE-I MAPPING';
        }else if(dId==='jupiter'){
          this.targets[0].name=site.name+' / DIPOLE SOUNDING';
        }else if(dId==='earth'){
          this.targets[0].name='SENTINEL-7 / TELEMETRY BUS';
        }
      }

      // Secondary Field Discovery
      const surfaceBonusNames={
        earth:    'SENTINEL-7 HIGH-RESOLUTION ALTIMETRY',
        moon:     'CRYOGENIC ICE CRYSTAL DEPOSIT',
        mars:     'HYDROTHERMAL CHIMNEY FLUID CRUST',
        asteroid: 'EXCAVATED EUCRITE IMPACT CLAST',
        jupiter:  'CONAMARA SUBSURFACE CONDUCTION ANOMALY'
      };
      this.bonusAnomaly={
        x:this.isSurface?180:160,
        y:this.isSurface?0:25,
        z:this.isSurface?-180:-420,
        name:surfaceBonusNames[dId]||'UNIDENTIFIED SCIENTIFIC ANOMALY',
        scanned:false,
        scanProgress:0,
        radius:6,
        yield:35
      };
    }

    // 06 Recovery Station Docking
    if(this.stage===5){
      const stage5Name={
        earth:    'KEPLER ORBITAL RETRIEVAL STATION',
        moon:     'LUNAR GATEWAY RECOVERY MODULE',
        mars:     'KEPLER RECOVERY STATION',
        asteroid: 'DAWN INTERPLANETARY CARRIER DOCK',
        jupiter:  'KEPLER SLINGSHOT CARRIER SHIP'
      }[dId] || 'KEPLER RECOVERY STATION';
      this.targets=[make([0,8,-610],0,stage5Name)];
    }

    this.hazards=[];const random=seeded(2801+this.stage*37+this.destination.difficulty);
    const count=this.stage===1?Math.round(70*flightPlan(this.campaign).hazards):this.stage===0?8:this.stage===2?18:this.stage===5?10:0;
    for(let i=0;i<count;i++){
      const z=-80-random()*(this.stage===1?920:760),x=(random()-.5)*310,y=(random()-.5)*160;
      const safe=this.targets.every(t=>Math.hypot(t.x-x,t.y-y,t.z-z)>60);
      if(safe)this.hazards.push({x,y,z,radius:3+random()*9,rotation:random()*Math.PI,spin:(random()-.5)*.3});
    }
    if(this.stage===1)this.hazards.push({x:0,y:8,z:-110,radius:11,rotation:0,spin:.1});
    if(this.isSurface)for(let i=0;i<20;i++){const x=(random()-.5)*270,z=-random()*350;const p={x,y:0,z,radius:2+random()*3,rotation:random()*6,spin:0};if(this.targets.every(t=>distance(t,p)>32))this.hazards.push(p);}
    if(this.stage===4&&dId==='asteroid'){
      for(let i=0;i<18;i++){
        const z=-100-random()*580,x=(random()-.5)*220,y=-12+random()*24;
        const safe=this.targets.every(t=>Math.hypot(t.x-x,t.y-y,t.z-z)>35);
        if(safe)this.hazards.push({x,y,z,radius:2.5+random()*5,rotation:random()*Math.PI,spin:(random()-.5)*.4});
      }
    }
    if((this.stage===1||this.stage===4)&&dId==='earth'){
      const debrisCount=this.stage===1?22:12;
      for(let i=0;i<debrisCount;i++){
        const z=-90-random()*640, x=(random()-.5)*240, y=-10+random()*24;
        const safe=this.targets.every(t=>Math.hypot(t.x-x,t.y-y,t.z-z)>38);
        if(safe){
          this.hazards.push({
            x,y,z,
            radius: 2 + random()*4,
            rotation: random()*Math.PI,
            spin: (random()-.5)*.4,
            vx: (random()-.5)*5,
            vy: (random()-.5)*3.5,
            vz: (random()-.5)*8,
            name: `DEBRIS #${1020 + i}`
          });
        }
      }
    }
    this.checkpoint=this.serialize();
  }
  resolveOperation(kind,value){return resolveOperation(this,kind,value);}
  acknowledgeClue(){
    if(this.mode!=='clue'||this.stage!==2||!this.campaign)return false;
    this.mode='flight';
    if(this.targetIndex>=this.targets.length&&!this.campaign.completed.survey){this.operation='survey';this.mode='operation';this.emit('operation',{kind:'survey'});}
    return true;
  }
  selectSurfaceTarget(index){
    if(this.mode!=='flight'||!this.campaign||!this.isSurface||!Number.isInteger(index)||index<0||index>=this.targets.length||this.targets[index].done)return false;
    this.targetIndex=index;this.scan=0;this.canInteract=false;this.interactionQueued=false;this.emit('selection',{index,name:this.target.name});return true;
  }
  requestInteraction(){
    if(this.mode!=='flight'||!this.target)return false;
    if(this.stage<2){this.emit('interactionHint',{message:'Fly through the marked gate. E is used for scanning and recovery later.'});return false;}
    if(this.range>110){this.emit('interactionHint',{message:'Move within 110 m of the marked target, then press E to start the operation.'});return false;}
    this.interactionQueued=true;this.emit('interactionHint',{message:'Operation armed. Stay near the target while the craft stabilizes and the progress bar fills.'});return true;
  }
  departSurface(){
    if(this.mode!=='flight'||!this.canDepartSurface||this.campaign.completed.analysis)return false;
    this.operation='analysis';this.mode='operation';this.emit('operation',{kind:'analysis'});return true;
  }
  begin(){if(this.mode==='briefing'){this.mode='flight';this.emit('begin');}}
  setRoute(route){this.route=route;this.emit('route',{route});}
  toggleAssist(){this.assist=!this.assist;this.emit('assist',{active:this.assist});}
  repair(){if(this.mode!=='flight'||this.repairs<=0||(this.hull>=99&&(this.destination.id!=='jupiter'||this.instrumentHealth>=99)))return false;this.repairs--;this.hull=clamp(this.hull+30,0,100);if(this.destination.id==='jupiter')this.instrumentHealth=clamp(this.instrumentHealth+35,0,100);this.power=clamp(this.power-4,0,100);this.emit('repair');return true;}
  scannerPulse(){if(this.mode!=='flight'||this.pulse>0||this.power<2)return false;this.pulse=4;this.power-=1.5;this.emit('pulse');return true;}
  getDsnTelemetry(){
    const dest=this.destination||DESTINATIONS[2];
    const stations=dest.dsnStations||['Goldstone DSS-14','Madrid DSS-63','Canberra DSS-43'];
    const stationIndex=Math.floor(Math.abs(this.time)/120)%stations.length;
    const activeStation=stations[stationIndex];
    const commsChoiceIndex=this.loadout?.[4]??0;
    const commsModule=SYSTEMS[4]?.choices?.[commsChoiceIndex]||{name:'Patch antenna array',bandwidth:'2.0 kbps',linkMargin:'+3.2 dB',carrierLock:'LOCKED (BEACON RATE)'};
    const owltSeconds=dest.owltSeconds??750;
    const rtltSeconds=owltSeconds*2;
    const owltDisplay=dest.owltDisplay??'12m 30s';
    const rtltDisplay=dest.rtltDisplay??'25m 00s';
    const carrierBand=dest.carrierBand??'X/Ka-Band DSN (32.1 GHz)';
    const autonomyMode=dest.autonomyMode??(owltSeconds>5?'On-Board Autonomous FDIR':'Ground Tele-command');
    const isAutonomous=owltSeconds>5;
    let carrierLocked=true;
    if(dest.id==='jupiter'&&!this.commsWindowActive)carrierLocked=false;
    if(dest.id==='earth'&&!this.groundStationPass)carrierLocked=false;
    return {
      destinationId:dest.id,
      destinationName:dest.name,
      activeStation,
      stations,
      owltSeconds,
      rtltSeconds,
      owltDisplay,
      rtltDisplay,
      carrierBand,
      carrierLocked,
      commsModule:commsModule.name,
      bandwidth:commsModule.bandwidth||'28.5 kbps',
      linkMargin:commsModule.linkMargin||'+8.7 dB',
      autonomyMode,
      isAutonomous
    };
  }
  pause(){if(this.mode==='flight'){this.mode='paused';return true;}return false;}
  resume(){if(this.mode==='paused')this.mode='flight';}
  choose(effect){
    if(this.mode!=='event')return;
    if(effect==='shelter'||effect==='autonomous_attitude'||effect==='shield_bleed'){
      this.power=clamp(this.power-6,0,100);
      this.score+=12;
      this.eventFlags.shelter=true;
      this.log('Deep Space Triage','Spacecraft attitude & shields protected core buses from deep space hazard.');
    }else if(effect==='observe'){
      this.damage(14,false);
      this.score+=22;
      this.log('Scientific Observation','Particle/plasma sensors recorded valuable scientific data during hazard transit.');
    }else if(effect==='rcs_desaturate'){
      this.fuel=clamp(this.fuel-6,0,100);
      this.score+=10;
      this.log('Attitude Desaturation','RCS thrusters fired to desaturate reaction wheel momentum.');
    }else if(effect==='gravity_dump'){
      this.score+=16;
      this.log('Gravitational Torquing','Leveraged planetary gravity gradient to bleed angular momentum without propellant consumption.');
    }else if(effect==='load_shed'){
      this.power=clamp(this.power-8,0,100);
      this.score+=18;
      this.log('Autonomous Load Shedding','Power buses isolated and transient currents shunted into grounding sinks.');
    }else if(effect==='dust_repel'){
      this.power=clamp(this.power-5,0,100);
      this.score+=14;
      this.log('Electrostatic Repulsion','High-frequency voltage pulse repelled clinging lunar regolith grains.');
    }else if(effect==='purge_filter'){
      this.power=clamp(this.power-3,0,100);
      this.score+=10;
      this.log('Mechanical Purge','Mechanical wipers cleared radiator surfaces; nominal thermal dissipation restored.');
    }else if(effect==='isolate_loop'){
      this.power=clamp(this.power-4,0,100);
      this.score+=12;
      this.log('Loop Isolation','Pyrotechnic valves isolated punctured radiator loop.');
    }else if(effect==='drone_patch'){
      if(this.repairs>0)this.repairs--;
      this.hull=clamp(this.hull+15,0,100);
      this.score+=18;
      this.log('EVA Drone Repair','Drone sealed radiator breach; hull and coolant integrity restored.');
    }else if(effect==='relay_burst'){
      this.power=clamp(this.power-6,0,100);
      this.score+=14;
      this.log('DSN Telemetry Burst','High-gain antenna beamed emergency packet dump to Deep Space Network.');
    }else if(effect==='archive'){
      this.power-=12;this.score+=22;this.fullArchive=true;this.log('The last transmission','The complete archive was recovered.');
    }else if(effect==='return'){
      this.fuel=clamp(this.fuel+8,0,100);this.score+=8;this.log('Return margin','Essential samples secured; reserves preserved for the return.');
    }else{
      this.score+=8;
      this.log('Anomaly Triage','Autonomous triage directive completed.');
    }
    if(this.mode==='failed')return;
    this.power=clamp(this.power,0,100);this.mode='flight';this.emit('choice',{effect});
    if(effect==='archive'||effect==='return')this.finishStage();
  }
  log(title,text){const entry={title,text,stage:this.stage,time:this.time};this.journal.push(entry);this.emit('log',{entry});}
  damage(amount,collision=true){
    const shield=this.route==='shield'?.45:1;
    this.hull=clamp(this.hull-amount*this.stats.armor*shield*(this.difficulty==='explorer'?.7:1),0,100);
    if(collision){this.collisions++;this.immunity=2;this.velocity.x*=-.7;this.velocity.y*=-.7;this.velocity.z*=.55;this.speedCommand*=.55;this.emit('impact',{amount});}
    if(this.hull<=0)this.fail('HULL INTEGRITY LOST','The vehicle can no longer maintain a safe flight. Return to the stage checkpoint and approach more carefully.');
  }
  fail(title,message){if(this.mode==='failed')return;this.mode='failed';this.emit('failed',{title,message});}
  finishStage(){
    this.score+=8;this.mode=this.stage===5?'complete':'transition';
    if(this.stage===5)this.emit('complete');else this.emit('stageComplete',{stage:this.stage});
  }
  advance(){
    if(this.mode!=='transition')return;this.stage++;
    // Macro burns represent the off-screen transfer/insertion/ascent legs, not local input alone.
    const plan=flightPlan(this.campaign);const burn=[0,18,7,10,2,18][this.stage]*(this.campaign?plan.burn:1);const housekeeping=[0,8,7,4,6,9][this.stage]*(this.campaign?plan.housekeeping:1);
    this.fuel=clamp(this.fuel-burn*this.stats.efficiency,0,100);
    this.power=clamp(this.power-housekeeping*(110/this.stats.power),0,100);
    this.setupStage();this.mode='briefing';this.emit('stage',{stage:this.stage});
  }
  completeTarget(){
    const index=this.targetIndex,target=this.target;target.done=true;
    const inLamo=this.destination.id==='asteroid'&&this.currentOrbitRegime==='LAMO';
    const orbitBonus=inLamo?1.8:1;
    this.score+=this.stage<2?4:Math.round(10*this.stats.yield*(this.stage===4?this.stats.recovery*orbitBonus:orbitBonus));
    if(inLamo&&this.destination.id==='asteroid'&&this.stage>=2){
      this.emit('lamoObservationBonus',{targetName:target.name,bonus:Math.round(10*this.stats.yield*.8)});
    }
    this.scan=0;this.interactionQueued=false;
    if(this.stage===3&&this.destination.id==='moon'){
      const touchdownSpeed=this.speed;
      const touchdownOffset=Math.hypot(this.position.x-target.x,this.position.y-target.y);
      if(touchdownSpeed>6.0||touchdownOffset>24){
        this.equipmentDamaged=true;
        this.touchdownQuality='damaged';
        this.damage(22,false);
        this.emit('touchdownRating',{quality:'damaged',speed:touchdownSpeed,offset:touchdownOffset});
      }else if(touchdownSpeed<=3.5&&touchdownOffset<=14){
        this.equipmentDamaged=false;
        this.flawlessLanding=true;
        this.touchdownQuality='flawless';
        this.score+=30;
        this.emit('touchdownRating',{quality:'flawless',speed:touchdownSpeed,offset:touchdownOffset});
      }else{
        this.equipmentDamaged=false;
        this.touchdownQuality='nominal';
        this.emit('touchdownRating',{quality:'nominal',speed:touchdownSpeed,offset:touchdownOffset});
      }
    }
    const prov = getTargetProvenance(this.destination.id, target.name);
    if(this.campaign&&this.isSurface){
      const kinds=['mineral','context','recorder'];this.campaign.evidence.push({name:target.name,kind:kinds[index],provenance:prov});
      if(this.destination.id==='mars'&&(index===0||index===1)){
        if(this.sampleTubesUsed<this.maxSampleTubes){
          this.sampleTubesUsed++;
          this.emit('sampleStored',{tubeIndex:this.sampleTubesUsed,maxTubes:this.maxSampleTubes,sampleName:target.name,provenance:prov});
        }
      }
      this.log(target.name,['Mineral core sealed with its collection location.','Layer context recorded in a camera mosaic.','The field vehicle held the station crew’s final record.'][index]);
      this.targetIndex=this.targets.findIndex(t=>!t.done);this.emit('target',{name:target.name,provenance:prov});
      if(this.canDepartSurface&&!this.campaign.completed.ready){this.campaign.completed.ready=true;this.emit('expeditionReady');}
      return;
    }
    this.targetIndex++;this.emit('target',{name:target.name,provenance:prov});
    if(this.destination.id==='jupiter'&&this.stage===4){
      this.measurementsCollected++;
      this.radiationDose=clamp(this.radiationDose+15,0,100);
      this.emit('measurementRecorded',{count:this.measurementsCollected,name:target.name,dose:Math.round(this.radiationDose)});
    }
    if(this.stage===2){
      if(this.campaign){
        const signals = getCampaignData(this.destination.id).signals;
        const clue=signals[index] || SIGNAL_FRAGMENTS[index];
        this.campaign.clues.push({label:clue.label,finding:clue.finding});
        this.log(clue.label,clue.finding);
        this.mode='clue';
        this.emit('clue',{index,clue});
        return;
      }
      this.log(target.name,['Carrier isolated. Signal strength measured at a known position.','Second bearing acquired. The intersection constrains the source.','Third bearing confirms the lost station. Landing coordinates resolved.'][index]);
    }
    if(this.stage===4){
      if(this.destination.id==='jupiter'){
        this.log(target.name,['Induced secondary magnetic dipole confirms subsurface ocean.','Surface magnesium sulfate salts indicate warm ocean upwelling.','Plume water vapor venting detected along surface ice fractures.'][index]||'Europa science measurement recorded.');
      }else if(this.destination.id==='earth'){
        this.log(target.name,['Sentinel-7 Primary Telemetry Bus recovered with flight computer diagnostics.','Decadal ocean color & sea surface temperature records secured.','CALIOP Atmospheric Lidar vertical aerosol & cloud profiles downloaded.'][index]||'Satellite climate archive retrieved.');
      }else{
        this.log(target.name,['Mineral spectrum and sample position recorded.','Context documented. Sample sealed for later analysis.',this.destination.discovery][index]);
      }
    }
    if(this.targetIndex>=this.targets.length){
      if(this.campaign&&this.stage===2&&!this.campaign.completed.survey){this.operation='survey';this.mode='operation';this.emit('operation',{kind:'survey'});return;}
      if(this.campaign&&this.stage===4&&!this.campaign.completed.analysis){this.operation='analysis';this.mode='operation';this.emit('operation',{kind:'analysis'});return;}
      if(this.stage===4&&!this.eventFlags.recorder){this.eventFlags.recorder=true;this.mode='event';this.emit('event',{id:'recorder'});}else this.finishStage();
    }
  }
  step(rawDt,keys={}){
    if(this.mode!=='flight')return;
    const dt=clamp(rawDt,0,.06);this.time+=dt;this.stageTime+=dt;this.immunity=Math.max(0,this.immunity-dt);this.pulse=Math.max(0,this.pulse-dt);
    const destAnomaly=this.destination?.anomalyId||'flare';
    if(this.stage===1&&this.stageTime>12&&!this.eventFlags.flare&&!this.eventFlags[destAnomaly]){
      this.eventFlags.flare=true;
      this.eventFlags[destAnomaly]=true;
      this.mode='event';
      this.emit('event',{id:destAnomaly, dsn:this.getDsnTelemetry()});
      return;
    }
    if(this.campaign&&this.stage===1&&this.eventFlags.flare&&this.stageTime>24&&!this.campaign.completed.repair){this.operation='repair';this.mode='operation';this.emit('operation',{kind:'repair'});return;}
    const t=this.target;if(!t)return;
    const beforeZ=this.position.z;const surface=this.isSurface;
    const boost=keys.boost&&this.fuel>0&&this.heat<98&&!surface;
    const thrust=this.stats.thrust*(this.route==='engine'?1.25:1)*(this.hull<25?.65:1);
    this.heat=clamp(this.heat+(boost?24:-17*this.stats.cooling)*dt,0,100);
    if(surface){
      let drive=(keys.forward?1:0)-(keys.brake?1:0),turn=(keys.right?1:0)-(keys.left?1:0);
      if(this.assist){const desired=Math.atan2(t.x-this.position.x,-(t.z-this.position.z));let difference=((desired-this.heading+Math.PI*3)%(Math.PI*2))-Math.PI;turn=clamp(difference*2,-1,1);drive=this.range>17?1:0;}
      let traction=clamp(Math.sqrt(this.destination.gravity/3.71),.35,1.3);
      if(this.destination.id==='mars'){
        if(this.position.x>25)traction*=.65;
        if(this.position.x<-60||this.position.z<-180)traction*=.82;
      }
      this.heading+=turn*dt*1.45*(.7+.3*traction);
      this.speedCommand=clamp(this.speedCommand+drive*dt*12*traction,-7,19);
      if(!drive)this.speedCommand*=Math.exp(-dt*3*traction);
      if((keys.interact||this.interactionQueued)&&this.range<35)this.speedCommand*=Math.exp(-dt*7);
      this.velocity.x=Math.sin(this.heading)*this.speedCommand;this.velocity.z=-Math.cos(this.heading)*this.speedCommand;this.velocity.y=0;
    }else{
      let forward=(keys.forward?1:0),brake=(keys.brake?1:0),sx=(keys.right?1:0)-(keys.left?1:0),sy=(keys.up?1:0)-(keys.down?1:0);
      if(this.assist){
        if(this.destination.id==='moon'&&this.stage===3){
          sx=clamp((t.x-this.position.x)*.07-this.velocity.x*.15,-1,1);
          sy=clamp((t.y-this.position.y)*.08-this.velocity.y*.25+.28,-1,1);
          const desired=clamp((this.range-22)*.32,0,28);
          const direction=t.z<this.position.z?1:-1;
          const diff=desired*direction-this.speedCommand;
          forward=diff>1?1:0;brake=diff<-.6?1:0;
        }else{
          sx=clamp((t.x-this.position.x)*.07-this.velocity.x*.11,-1,1);sy=clamp((t.y-this.position.y)*.07-this.velocity.y*.11,-1,1);
          const desired=this.stage<2?43:clamp((this.range-27)*.38,0,43);
          const direction=t.z<this.position.z?1:-1;
          const diff=desired*direction-this.speedCommand;
          forward=diff>1?1:0;brake=diff<-.8?1:0;
        }
      }
      this.throttle=this.fuel>0?(boost?2:forward?.8:0):0;
      const accel=16*thrust;
      if(forward&&this.fuel>0)this.speedCommand+=accel*dt;
      if(brake)this.speedCommand-=accel*1.8*dt;
      if(boost)this.speedCommand+=accel*2.3*dt;
      this.speedCommand=clamp(this.speedCommand,-18,boost?100:62);
      if(this.interactionQueued&&this.range<(this.stage===2||this.stage===4?75:45)){
        this.speedCommand=clamp(this.speedCommand,-6,6);
        this.velocity.x*=Math.exp(-dt*8);this.velocity.y*=Math.exp(-dt*8);
      }
      if(!boost&&this.speedCommand>62)this.speedCommand-=18*dt;
      this.velocity.x=(this.velocity.x+sx*27*thrust*this.stats.handling*dt)*Math.exp(-dt*1.7);
      this.velocity.y=(this.velocity.y+sy*25*thrust*this.stats.handling*dt)*Math.exp(-dt*1.7);
      if(this.destination.id==='moon'&&this.stage===3){
        // Lunar gravity pulling down towards Shackleton Crater rim
        this.velocity.y-=1.62*dt*2.5;
      }
      if(this.destination.id==='asteroid'&&this.stage>=1&&this.stage<=4){
        const inLamo=this.currentOrbitRegime==='LAMO';
        if(inLamo){
          // Irregular gravitational harmonics from Vesta triaxial shape
          const perturbX=Math.sin(this.time*1.8)*2.4;
          const perturbY=Math.cos(this.time*2.2)*1.8;
          this.velocity.x+=perturbX*dt;
          this.velocity.y+=perturbY*dt;
          this.irregularGravityPerturbation=Math.hypot(perturbX,perturbY);
          let nearBoulder=false;
          for(const h of this.hazards){
            if(distance(this.position,h)<h.radius+16){nearBoulder=true;break;}
          }
          this.boulderProximity=nearBoulder?1:Math.max(0,this.boulderProximity-dt*2);
        }else{
          this.irregularGravityPerturbation=0;
          this.boulderProximity=0;
        }
      }
      this.velocity.z=-this.speedCommand;
      if(forward||brake||boost||sx||sy)this.fuel=clamp(this.fuel-dt*this.stats.efficiency*(boost?1.05:.075),0,100);
    }
    for(const axis of ['x','y','z'])this.position[axis]+=this.velocity[axis]*dt;
    if(surface)this.position.y=0;
    else{this.position.x=clamp(this.position.x,-360,360);this.position.y=clamp(this.position.y,-150,220);}
    let powerDrain=(surface?.035:.019)+(this.route==='shield'?.05:this.route==='science'?.035:0);
    if(surface&&Math.abs(this.speedCommand)>.5){
      powerDrain+=.025;
      if(this.destination.id==='mars'&&this.position.x>25)powerDrain+=.035;
    }
    if(this.loadout[1]===0&&this.destination.id==='jupiter')powerDrain*=3;
    this.power=clamp(this.power-powerDrain*dt*(110/this.stats.power),0,100);
    if(this.power<=0){this.fail('BATTERY EXHAUSTED','All operating reserves have been used. Choose a stronger power system or conserve scanning power.');return;}
    if(this.fuel<=0&&!surface){this.stranded=(this.stranded||0)+dt;if(this.stranded>12){this.fail('PROPELLANT DEPLETED','You can coast, but cannot control the approach. Restart from the last checkpoint and reduce boost usage.');return;}}
    if(this.immunity<=0)for(const h of this.hazards){if(distance(this.position,h)<h.radius+4){this.damage(18+this.speed*.15);break;}}
    if(this.mode!=='flight')return;
    const range=this.range;
    if(this.stage<2){
      const crossed=beforeZ>=t.z&&this.position.z<=t.z;
      if((range<25)||(crossed&&Math.hypot(this.position.x-t.x,this.position.y-t.y)<30))this.completeTarget();
      else if(this.position.z<t.z-55){t.z=this.position.z-200;this.score=Math.max(0,this.score-2);this.emit('miss');}
    }else{
      const {range:maxRange,speed:maxSpeed}=interactionLimits(this);
      this.canInteract=range<maxRange&&this.speed<maxSpeed;
      if((keys.interact||this.interactionQueued)&&this.canInteract){
        const scanRate=this.stage===2?this.stats.scan*this.stats.link:this.stage===4?this.stats.scan*(this.equipmentDamaged?.65:1):1;
        const inLamo=this.destination.id==='asteroid'&&this.currentOrbitRegime==='LAMO';
        const orbitRateBonus=inLamo?1.35:1;
        const instrumentRate=this.destination.id==='jupiter'?(0.4+0.6*(this.instrumentHealth/100)):1;
        this.scan+=dt/(surface?3.4:4)*scanRate*(this.route==='science'?1.55:1)*orbitRateBonus*instrumentRate;
        this.power=clamp(this.power-dt*(this.equipmentDamaged?.34:.16),0,100);

        if(this.destination.id==='asteroid'&&this.stage>=2&&this.stage<=4){
          const angleDeg=Math.round((Math.atan2(this.position.x-t.x,-(this.position.z-t.z))*180/Math.PI+360)%360);
          const sector=Math.floor(angleDeg/30);
          this.viewAnglesAcquired.add(sector);
          if(this.viewAnglesAcquired.size>=3&&!t.multiAngleBonus){
            t.multiAngleBonus=true;
            this.score+=15;
            this.emit('multiAngleLock',{targetName:t.name,count:this.viewAnglesAcquired.size});
          }
        }
        if(this.destination.id==='jupiter'&&this.stage>=2&&this.stage<=4){
          if(this.route!=='shield'&&this.radiationFlux>0.4){
            this.instrumentHealth=clamp(this.instrumentHealth-dt*2.2*this.radiationFlux,10,100);
            this.radiationDose=clamp(this.radiationDose+dt*1.2*this.radiationFlux,0,100);
          }
        }
        if(this.scan>=1)this.completeTarget();
      }else this.scan=Math.max(0,this.scan-dt*.11);
      if(this.destination.id==='jupiter'&&this.heat>75){
        this.instrumentHealth=clamp(this.instrumentHealth-dt*1.2,10,100);
      }
      if(!surface&&this.position.z<t.z-100){t.z=this.position.z-180;this.emit('miss');}

      if(this.bonusAnomaly&&!this.bonusAnomaly.scanned){
        const distBonus=distance(this.position,this.bonusAnomaly);
        if(distBonus<35&&this.speed<12&&(keys.interact||this.interactionQueued)){
          this.bonusAnomaly.scanProgress=(this.bonusAnomaly.scanProgress||0)+dt*0.8*(this.route==='science'?1.5:1);
          if(this.bonusAnomaly.scanProgress>=1){
            this.bonusAnomaly.scanned=true;
            this.score+=this.bonusAnomaly.yield;
            if(this.destination.id==='mars'&&this.isSurface&&this.sampleTubesUsed<this.maxSampleTubes){
              this.sampleTubesUsed++;
              this.emit('sampleStored',{tubeIndex:this.sampleTubesUsed,maxTubes:this.maxSampleTubes,sampleName:this.bonusAnomaly.name});
            }
            this.log('BONUS DISCOVERY',this.bonusAnomaly.name);
            const anomalyProv = getTargetProvenance(this.destination.id, this.bonusAnomaly.name);
            this.emit('bonusAnomaly',{name:this.bonusAnomaly.name,score:this.bonusAnomaly.yield,provenance:anomalyProv});
          }
        }
      }
    }
    this.update(dt);
    if(this.power<=0&&this.mode==='flight'){this.fail('BATTERY EXHAUSTED','All operating reserves have been used. Choose a stronger power system or conserve scanning power.');return;}
  }
  update(dt){
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
    const prevStormActive = this.stormActive;
    if (this.isSurface && this.destination.id === 'mars') {
      if (this.stageTime >= 20 && this.stageTime <= 65) {
        this.stormActive = true;
        this.stormIntensity = clamp(this.stormIntensity + dt * 0.25, 0, 1);
        const isSolar = this.loadout[1] === 0;
        const stormDrainRate = isSolar ? 1.15 : 0.45;
        this.power = clamp(this.power - dt * stormDrainRate * this.stormIntensity, 0, 100);
      } else {
        this.stormIntensity = Math.max(0, this.stormIntensity - dt * 0.2);
        if (this.stormIntensity === 0) this.stormActive = false;
      }
    } else {
      this.stormActive = false;
      this.stormIntensity = 0;
    }
    if (prevStormActive !== this.stormActive) {
      this.emit('stormStateChange', {active: this.stormActive, intensity: this.stormIntensity});
    }

    // Dynamic Deep Space Solar Storm / Coronal Mass Ejection (CME)
    const inDeepSpace = !this.isSurface && this.stage >= 0 && this.stage <= 5;
    if (inDeepSpace) {
      if (this.solarStormWarning > 0) {
        this.solarStormWarning = Math.max(0, this.solarStormWarning - dt);
        if (this.solarStormWarning === 0 && !this.solarStormActive) {
          this.solarStormActive = true;
          this.solarStormDuration = 14;
          this.emit('solarStormStart', { duration: 14 });
        }
      } else if (this.solarStormActive) {
        this.solarStormDuration -= dt;
        this.solarStormIntensity = clamp(this.solarStormIntensity + dt * 0.9, 0, 1);
        if (this.route === 'shield') {
          // Energetic magnetic shield absorbs and deflects CME plasma wind
          this.score += dt * 3.5;
          if (Math.random() < 0.25) {
            this.emit('shieldDeflect', { type: 'solar_plasma' });
          }
        } else {
          // Unshielded spacecraft takes coronal radiation, heating, and power drain
          this.heat = clamp(this.heat + dt * 15 * this.solarStormIntensity, 0, 100);
          this.power = clamp(this.power - dt * 1.6 * this.solarStormIntensity, 0, 100);
          this.damage(dt * 2.2 * this.solarStormIntensity, false);
        }
        if (this.solarStormDuration <= 0) {
          this.solarStormIntensity = Math.max(0, this.solarStormIntensity - dt * 0.45);
          if (this.solarStormIntensity === 0) {
            this.solarStormActive = false;
            this.nextSolarStormTime = this.stageTime + 55 + Math.random() * 30;
            this.emit('solarStormEnd');
          }
        }
      } else {
        this.solarStormIntensity = 0;
        if (this.stageTime >= this.nextSolarStormTime && this.solarStormWarning === 0) {
          this.solarStormWarning = 5.0;
          this.emit('solarStormWarning', { timeToImpact: 5 });
        }
      }
    } else {
      this.solarStormActive = false;
      this.solarStormIntensity = 0;
      this.solarStormWarning = 0;
    }

    // Jupiter Radiation Field in Chapters 02, 03, 04, 05
    if (this.destination.id === 'jupiter' && this.stage >= 1 && this.stage <= 4) {
      const cycleTime = this.stageTime % 24;
      const isSurge = cycleTime >= 14;
      const prevSurge = this.radiationSurge;
      this.radiationSurge = isSurge;
      if (prevSurge !== isSurge) {
        this.emit('radiationSurgeChange', { surge: isSurge, flux: this.radiationFlux });
      }

      if (this.stage === 4) {
        const commsCycle = this.stageTime % 20;
        this.commsWindowActive = commsCycle < 14;
      } else {
        this.commsWindowActive = true;
      }

      const baseRad = isSurge
        ? (this.stage === 4 ? 2.2 : this.stage === 3 ? 1.9 : 1.7)
        : (this.stage === 1 ? 0.7 : this.stage === 2 ? 0.95 : this.stage === 3 ? 1.35 : 0.6);

      const shieldMitigation = this.route === 'shield' ? 0.25 : this.route === 'science' ? 1.25 : 1.0;
      const armorMitigation = this.loadout[2] === 2 ? 0.35 : this.loadout[2] === 1 ? 0.6 : 1.0;
      this.radiationFlux = clamp(baseRad * shieldMitigation * armorMitigation, 0, 3.5);

      if (this.radiationFlux > 0.6) {
        if (this.route !== 'shield' && this.loadout[2] === 0) {
          this.damage(dt * 0.4 * this.radiationFlux, false);
        }
      }

      if (this.stage === 4) {
        const doseRate = this.route === 'shield' ? 0.15 : this.route === 'science' ? 0.65 : 0.4;
        this.radiationDose = clamp(this.radiationDose + dt * doseRate * this.radiationFlux, 0, 100);
        if (this.radiationDose >= 100 && this.mode === 'flight') {
          this.fail('RADIATION BURNOUT', 'Critical radiation dosage exceeded 100 Sv! Spacecraft computers and avionics suffered irreversible radiation failure.');
          return;
        }
      }
    } else {
      this.radiationFlux = 0;
      this.radiationSurge = false;
      this.commsWindowActive = true;
    }

    // Moon Cold-Trap Shadowing in Surface Basin
    if (this.destination.id === 'moon' && this.isSurface) {
      const inBasinShadow = this.position.z < -130;
      if (inBasinShadow !== this.inShadow) {
        this.inShadow = inBasinShadow;
        this.emit('shadowStateChange', { inShadow: this.inShadow });
      }
      if (this.inShadow) {
        const isSolar = this.loadout[1] === 0;
        const shadowDrainRate = isSolar ? 0.65 : 0.15;
        this.power = clamp(this.power - dt * shadowDrainRate * (this.equipmentDamaged ? 1.4 : 1.0), 0, 100);
      }
    } else {
      this.inShadow = false;
    }

    // Earth / LEO Real-Time Traffic Control & Orbital Conjunctions
    if (this.destination.id === 'earth') {
      const passCycle = this.stageTime % 22;
      const isAos = passCycle < 15;
      const prevAos = this.groundStationPass;
      this.groundStationPass = isAos;
      this.trackingUncertainty = isAos ? 5 : 35;
      if (prevAos !== isAos) {
        this.emit('groundStationPassChange', { aos: isAos, uncertainty: this.trackingUncertainty });
      }

      let minTca = Infinity;
      let worstHazard = null;
      let worstMissDist = Infinity;
      let worstProb = 0;

      for (const h of this.hazards) {
        if (h.vx || h.vy || h.vz) {
          h.x += (h.vx || 0) * dt;
          h.y += (h.vy || 0) * dt;
          if (h.x > 180) h.vx = -Math.abs(h.vx);
          if (h.x < -180) h.vx = Math.abs(h.vx);
          if (h.y > 60) h.vy = -Math.abs(h.vy);
          if (h.y < -30) h.vy = Math.abs(h.vy);
        }

        const dz = h.z - this.position.z;
        if (dz < 0 && dz > -240) {
          const relVz = Math.max(1, -this.velocity.z - (h.vz || 0));
          const tca = Math.abs(dz) / relVz;
          const projX = h.x + (h.vx || 0) * tca;
          const projY = h.y + (h.vy || 0) * tca;
          const shipProjX = this.position.x + this.velocity.x * tca;
          const shipProjY = this.position.y + this.velocity.y * tca;
          const missDist = Math.hypot(projX - shipProjX, projY - shipProjY);

          if (tca < 10 && missDist < 60) {
            if (missDist < worstMissDist) {
              worstMissDist = missDist;
              minTca = tca;
              worstHazard = h;
              worstProb = clamp(Math.round((1 - missDist / 60) * 100), 5, 99);
            }
          }
        }
      }

      const prevRisk = this.conjunctionRisk;
      if (worstHazard && worstMissDist < 20 && minTca < 6) {
        this.conjunctionRisk = 'critical';
      } else if (worstHazard && worstMissDist < 45 && minTca < 9) {
        this.conjunctionRisk = 'elevated';
      } else {
        this.conjunctionRisk = 'nominal';
      }

      if (worstHazard) {
        this.closestApproach = {
          name: worstHazard.name || 'FRAGMENT',
          tca: minTca,
          missDistance: worstMissDist,
          probability: worstProb,
          uncertainty: this.trackingUncertainty,
          risk: this.conjunctionRisk,
          x: worstHazard.x,
          y: worstHazard.y,
          z: worstHazard.z
        };
      } else {
        this.closestApproach = null;
      }

      if (prevRisk !== this.conjunctionRisk) {
        this.emit('conjunctionRiskChange', { risk: this.conjunctionRisk, closestApproach: this.closestApproach });
      }
    } else {
      this.groundStationPass = true;
      this.trackingUncertainty = 0;
      this.conjunctionRisk = 'nominal';
      this.closestApproach = null;
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
  }
  serialize(){return {version:2,destination:this.destination.id,loadout:[...this.loadout],difficulty:this.difficulty,stage:this.stage,hull:this.hull,fuel:this.fuel,power:this.power,score:this.score,repairs:this.repairs,time:this.time,collisions:this.collisions,eventFlags:{...this.eventFlags},journal:[...this.journal],fullArchive:this.fullArchive,campaign:this.campaign?JSON.parse(JSON.stringify(this.campaign)):null,radiationFlux:this.radiationFlux,inShadow:this.inShadow,bonusScanned:this.bonusAnomaly?.scanned||false,equipmentDamaged:this.equipmentDamaged,touchdownQuality:this.touchdownQuality,flawlessLanding:this.flawlessLanding,sampleTubesUsed:this.sampleTubesUsed,maxSampleTubes:this.maxSampleTubes,orbitMode:this.orbitMode,radiationDose:this.radiationDose,instrumentHealth:this.instrumentHealth,measurementsCollected:this.measurementsCollected,retreatedSafely:this.retreatedSafely,conjunctionsAvoided:this.conjunctionsAvoided,groundStationPass:this.groundStationPass,trackingUncertainty:this.trackingUncertainty,conjunctionRisk:this.conjunctionRisk};}
  static restore(saved,onEvent){
    if(!saved||saved.version!==2||!Number.isInteger(saved.stage)||saved.stage<0||saved.stage>5||!Array.isArray(saved.loadout)||![4,SYSTEMS.length].includes(saved.loadout.length)||saved.loadout.some(x=>!Number.isInteger(x)||x<0||x>2))throw new Error('Invalid checkpoint');
    const sim=new Simulation({...saved,onEvent});
    for(const key of ['stage','hull','fuel','power','score','repairs','time','collisions','fullArchive'])if(saved[key]!==undefined)sim[key]=saved[key];
    if(sim.campaign?.repair==='isolate')sim.stats.scan*=.8;
    if(saved.radiationFlux!==undefined)sim.radiationFlux=saved.radiationFlux;
    if(saved.inShadow!==undefined)sim.inShadow=saved.inShadow;
    if(saved.bonusScanned&&sim.bonusAnomaly)sim.bonusAnomaly.scanned=true;
    if(saved.equipmentDamaged!==undefined)sim.equipmentDamaged=saved.equipmentDamaged;
    if(saved.touchdownQuality!==undefined)sim.touchdownQuality=saved.touchdownQuality;
    if(saved.flawlessLanding!==undefined)sim.flawlessLanding=saved.flawlessLanding;
    if(saved.sampleTubesUsed!==undefined)sim.sampleTubesUsed=saved.sampleTubesUsed;
    if(saved.maxSampleTubes!==undefined)sim.maxSampleTubes=saved.maxSampleTubes;
    if(saved.orbitMode!==undefined)sim.orbitMode=saved.orbitMode;
    if(saved.radiationDose!==undefined)sim.radiationDose=saved.radiationDose;
    if(saved.instrumentHealth!==undefined)sim.instrumentHealth=saved.instrumentHealth;
    if(saved.measurementsCollected!==undefined)sim.measurementsCollected=saved.measurementsCollected;
    if(saved.retreatedSafely!==undefined)sim.retreatedSafely=saved.retreatedSafely;
    if(saved.conjunctionsAvoided!==undefined)sim.conjunctionsAvoided=saved.conjunctionsAvoided;
    if(saved.groundStationPass!==undefined)sim.groundStationPass=saved.groundStationPass;
    if(saved.trackingUncertainty!==undefined)sim.trackingUncertainty=saved.trackingUncertainty;
    if(saved.conjunctionRisk!==undefined)sim.conjunctionRisk=saved.conjunctionRisk;
    sim.eventFlags={...saved.eventFlags};sim.journal=[...(saved.journal||[])];sim.setupStage();sim.mode='briefing';return sim;
  }
}
