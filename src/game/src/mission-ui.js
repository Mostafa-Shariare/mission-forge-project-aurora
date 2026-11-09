import {FLIGHT_PLANS,projectedReserves,SITES,SCIENCE_SOURCE,flightPlan,getCampaignData} from './campaign.js';
import {NASA_MISSION_CLASSES,LAUNCH_VEHICLES} from './data.js';
import {renderRoleAuthorityTag} from './crew.js';

const button=(text,attrs='')=>`<button class="outline-button" ${attrs}>${text}</button>`;
export function plannerMarkup(stats, destination='mars', missionClassId='discovery', launchVehicleId='falcon9_medium'){
  const destData = getCampaignData(destination);
  const missionClass = stats.missionClass || NASA_MISSION_CLASSES.find(c=>c.id===missionClassId) || NASA_MISSION_CLASSES[0];
  const launchVehicle = stats.launchVehicle || LAUNCH_VEHICLES.find(lv=>lv.id===launchVehicleId) || LAUNCH_VEHICLES[0];
  const totalCost = stats.totalMissionCost || (stats.cost + launchVehicle.cost);

  const planBadges = {
    reserve: { icon: '[SAFE]', title: 'RESERVE PROFILE', tag: 'FUEL CONSERVATIVE', color: 'green' },
    balanced: { icon: '[NOMINAL]', title: 'BALANCED TRANSFER', tag: 'RECOMMENDED', color: 'cyan' },
    rapid: { icon: '[EXPRESS]', title: 'RAPID RESPONSE', tag: 'HIGH VELOCITY', color: 'amber' }
  };

  return `<div class="mission-planner">
    <div class="planner-authority-strip">${renderRoleAuthorityTag('flight', 'AUTHORITY: TRAJECTORY &amp; FLIGHT COMMIT')}</div>
    <div class="planner-arch-banner">
      <div class="arch-badge-item">
        <span class="arch-badge-label">LAUNCH VEHICLE</span>
        <b>${launchVehicle.shortName} (${launchVehicle.fairingDiameter} FAIRING)</b>
      </div>
      <div class="arch-badge-item">
        <span class="arch-badge-label">TOTAL MISSION BUDGET</span>
        <b class="${totalCost <= missionClass.costLimit ? 'cost-ok' : 'cost-warn'}">$${totalCost}M / $${missionClass.costLimit}M</b>
      </div>
      <div class="arch-badge-item">
        <span class="arch-badge-label">C₃ INJECTION BOOST</span>
        <b>${launchVehicle.deltaVBonus > 0 ? `+${launchVehicle.deltaVBonus.toFixed(1)} km/s Δv` : 'STANDARD DIRECT'}</b>
      </div>
    </div>

    <div class="transfer-map">
      <svg viewBox="0 0 760 270" role="img" aria-label="Earth to destination transfer trajectory">
        <defs>
          <radialGradient id="sun-glow">
            <stop stop-color="#ffe299"/>
            <stop offset="0.6" stop-color="#ff9922" stop-opacity="0.35"/>
            <stop offset="1" stop-color="#473c2c" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <circle cx="320" cy="135" r="105" fill="url(#sun-glow)"/>
        <ellipse cx="320" cy="135" rx="180" ry="72"/>
        <ellipse cx="320" cy="135" rx="310" ry="119"/>
        <circle cx="320" cy="135" r="14" class="map-sun"/>
        <path class="transfer-arc" d="M140 135 C180 10 530 0 630 135"/>
        <circle cx="140" cy="135" r="12" class="map-earth"/>
        <circle cx="630" cy="135" r="15" class="map-mars"/>
        <text x="96" y="172">EARTH</text>
        <text x="560" y="177">${destination.toUpperCase()}</text>
      </svg>
      <div class="planner-story">
        <span class="eyebrow">FLIGHT TRAJECTORY // ${destination.toUpperCase()}</span>
        <h3>Select Transit Profile: ${destination.toUpperCase()}</h3>
        <p>Higher transit velocity reduces flight duration but demands larger delta-V and propellant margin.</p>
      </div>
    </div>

    <div class="route-cards">
      ${FLIGHT_PLANS.map((p,i)=>{
        const r = projectedReserves(stats,p);
        const meta = planBadges[p.id] || { icon: '[ROUTE]', title: p.name, tag: 'FLIGHT ROUTE', color: 'cyan' };
        return `
        <button class="route-choice-card" data-plan="${p.id}" aria-pressed="${i===1}">
          <div class="route-card-top">
            <span class="route-plan-tag tag-${meta.color}">${meta.icon} ${meta.tag}</span>
            <span class="route-num">0${i+1}</span>
          </div>
          <h3 class="route-title">${meta.title}</h3>
          <div class="route-days-badge">
            <b>${p.days}</b>
            <span>DAYS IN TRANSIT</span>
          </div>
          <p class="route-desc">${p.description}</p>
          <div class="route-meters-box">
            <div class="meter-line">
              <span>FUEL MARGIN</span>
              <strong class="${r.fuel >= 80 ? 'good' : r.fuel >= 60 ? 'mid' : 'warn'}">${Math.round(r.fuel)}%</strong>
            </div>
            <div class="meter-line">
              <span>POWER MARGIN</span>
              <strong class="${r.power >= 90 ? 'good' : 'mid'}">${Math.round(r.power)}%</strong>
            </div>
          </div>
        </button>`;
      }).join('')}
    </div>

    <div class="dialog-footer planner-footer">
      <span id="plan-status" aria-live="polite">BALANCED FLIGHT SELECTED · SIX CHAPTERS</span>
      <button id="commit-plan" class="primary-button hero-start-btn tactical-btn">
        <span>COMMIT PLAN &amp; LAUNCH ROCKET</span>
        <span class="btn-arrow">↗</span>
      </button>
    </div>
  </div>`;
}
export function bindPlanner(root,onCommit){let plan='balanced';root.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{plan=b.dataset.plan;root.querySelectorAll('[data-plan]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));root.querySelector('#plan-status').textContent=FLIGHT_PLANS.find(p=>p.id===plan).name+' SELECTED';});root.querySelector('#commit-plan').onclick=()=>onCommit(plan);}

export function operationMarkup(sim,kind){
  const destData = getCampaignData(sim?.destination?.id || 'mars');
  const activeSites = destData.sites || SITES;

  if(kind==='repair')return `<div class="operation-grid"><div><span class="eyebrow">REYES / ENGINEERING CHANNEL</span><div class="op-authority-tag">${renderRoleAuthorityTag('comms', 'AUTHORITY: CIRCUIT BUS DIAGNOSTICS &amp; RECOVERY')}</div><p class="dialog-lead">A power switch tripped during the storm. Follow 3 easy steps below to turn science power back on.</p><div class="power-diagram"><div>GENERATOR <b>${sim.stats.generatedKW.toFixed(2)} kW</b></div><span>↓</span><div>POWER LINE <b class="fault-text">SWITCH TRIPPED</b></div><span>↓</span><div>SCIENCE SENSORS <b>OFFLINE</b></div></div><p class="model-caption">Follow the 3 numbered steps in order to reset the circuit safely.</p></div><div class="procedure-panel"><h3>TURN POWER BACK ON</h3><p>Safe order: 1. Turn off damaged line → 2. Turn on backup power → 3. Reconnect sensors.</p>${['TURN OFF DAMAGED LINE','TURN ON BACKUP POWER','RECONNECT SENSORS'].map((t,i)=>`<button class="circuit-switch" data-circuit="${i}" aria-pressed="false"><span>0${i+1}</span>${t}<b>CLICK TO TOGGLE</b></button>`).join('')}<p id="operation-feedback" role="status" aria-live="polite">Click step 1 to turn off the damaged line.</p><button class="primary-button" id="repair-confirm" disabled>RESTORE SCIENCE POWER · −4 POWER</button>${button('SKIP REPAIR · SCANS 20% SLOWER','id="repair-isolate"')}<p>Skipping repair saves power, but scanning will take a little longer.</p></div></div>`;
  if(kind==='survey')return `<div class="survey-intro"><div class="op-authority-tag">${renderRoleAuthorityTag('science', 'AUTHORITY: SPECTRAL ANALYSIS &amp; SITE SELECTION')}</div><p class="dialog-lead">Step 1: Click the two guide buttons to tune your scanner. Step 2: Compare the 3 landing sites below. Step 3: Choose your landing site and click Confirm.</p><span class="data-badge">${destData.agency}</span></div><div class="spectrum-console"><div class="spectrum-plot"><svg viewBox="0 0 700 160" role="img" aria-label="Mineral sensor wavelength guides"><path class="plot-grid" d="M40 20V130H670 M40 50H670 M40 90H670 M245 20V130 M450 20V130 M655 20V130"/><path class="clay-trace" d="M40 45 Q180 35 290 48 Q325 50 342 100 Q355 130 392 52 Q560 40 670 46"/><path class="sulfate-trace" d="M40 68 Q200 60 450 67 Q485 68 504 116 Q513 140 553 68 L670 66"/><line id="band-cursor" x1="40" x2="40" y1="15" y2="132"/><text x="40" y="152">1.8 μm</text><text x="360" y="152">2.2 / GUIDE 1</text><text x="515" y="152">2.4 / GUIDE 2</text></svg></div><div class="spectrum-presets" aria-label="Quick tune scanner"><button type="button" data-tune="2.20">① SCAN GUIDE 1 · 2.20 μm</button><button type="button" data-tune="2.40">② SCAN GUIDE 2 · 2.40 μm</button></div><label for="band-tuner">FREQUENCY TUNER <b id="band-value">1.80 μm</b></label><input id="band-tuner" type="range" min="1.8" max="2.6" value="1.8" step=".01" aria-label="Scanner wavelength in micrometers"><div class="spectrum-actions">${button('ACQUIRE SCAN','id="acquire-band"')}<span id="operation-feedback" role="status" aria-live="polite">Click SCAN GUIDE 1, then click ACQUIRE SCAN. Repeat with SCAN GUIDE 2.</span></div></div><div class="site-cards">${activeSites.map(s=>`<button data-site="${s.id}" aria-pressed="false"><small>TRAVERSE / ${s.slope}° SLOPE</small><h3>${s.name}</h3><div class="mineral-bar">GUIDE 1 <i style="--mineral:${s.clay}%"></i><b class="site-clay">LOCKED</b></div><div class="mineral-bar sulfate">GUIDE 2 <i style="--mineral:${s.sulfate}%"></i><b class="site-sulfate">LOCKED</b></div><p>${s.description}</p><strong>−${s.power} POWER · +${s.yield} SCIENCE</strong></button>`).join('')}</div><p class="model-caption">NASA Scientific Reference: ${destData.pdsCitation}. Sensor accuracy: ±${sim.loadout[3]===0?6:10} units.</p><a class="science-link" href="${destData.source || SCIENCE_SOURCE}" target="_blank" rel="noopener">NASA science reference archive ↗</a><div class="dialog-footer"><span id="site-status">1 / TUNE BOTH GUIDES → 2 / PICK A LANDING SITE</span><button class="primary-button" id="survey-confirm" disabled>COMMIT LANDING SITE ↗</button></div>`;
  const recovered=new Set(sim.campaign.evidence.map(e=>e.kind));
  const currentSiteName = activeSites.find(s=>s.id===sim.campaign.site)?.name || 'the landing site';
  return `<div class="op-authority-tag">${renderRoleAuthorityTag('science', 'AUTHORITY: SCIENTIFIC HYPOTHESIS FORMULATION')}</div><p class="dialog-lead">The mission recorder is saved! Review the evidence you collected. Which scientific conclusion can you support?</p><div class="evidence-grid"><article class="${recovered.has('mineral')?'':'missing-evidence'}"><span>01 / ROCK SAMPLE · ${recovered.has('mineral')?'COLLECTED':'NOT COLLECTED'}</span><h3>Rock Sample</h3><p>${recovered.has('mineral')?`The ${currentSiteName.toLowerCase()} rock sample contains minerals formed in water.`:'No ground rock sample was collected. Orbital readings alone leave it unconfirmed.'}</p></article><article class="${recovered.has('context')?'':'missing-evidence'}"><span>02 / PHOTO MOSAIC · ${recovered.has('context')?'COLLECTED':'NOT COLLECTED'}</span><h3>Surrounding Layers</h3><p>${recovered.has('context')?'Photos link the sample to surrounding rock layers, showing how the environment changed over time.':'No surrounding photo mosaic was saved. Layer history remains uncertain.'}</p></article><article><span>03 / DATA RECORDER · SAVED</span><h3>Mission Recorder</h3><p>The recorder contains data and sensor readings saved from the surface station.</p></article></div><h3>WHICH CONCLUSION CAN YOU SUPPORT?</h3><div class="claim-options">${[['water','Water was present here in ancient times.','Supported by your collected rock and mineral samples.'],['life','Confirmed alien biological life.','Not supported: rock samples do not prove extraterrestrial life.'],['ocean','A global planetary ocean covered the whole world.','Not supported: observations from one local spot do not prove a global ocean.']].map(([id,title,detail])=>`<button data-claim="${id}" aria-pressed="false"><strong>${title}</strong><span>${detail}</span></button>`).join('')}</div><p id="operation-feedback" aria-live="polite" role="status">Click a conclusion above, then click Submit Finding.</p><a class="science-link" href="${destData.source || SCIENCE_SOURCE}" target="_blank" rel="noopener">Read the real NASA science ↗</a><div class="dialog-footer"><span>TRUE SCIENCE DEPENDS ON REAL EVIDENCE</span><button class="primary-button" id="analysis-confirm" disabled>SUBMIT FINDING ↗</button></div>`;
}
export function bindOperation(root,sim,kind,resolve,sound){
  const destData = getCampaignData(sim?.destination?.id || 'mars');
  const activeSites = destData.sites || SITES;

  if(kind==='repair'){let step=0;root.querySelectorAll('[data-circuit]').forEach(b=>b.onclick=()=>{const n=+b.dataset.circuit;const feedback=root.querySelector('#operation-feedback');if(n!==step){feedback.textContent='Step order: '+['Turn off the damaged line first (Step 1).','Turn on backup power before reconnecting (Step 2).','Reconnect sensors after backup power is on (Step 3).'][step];sound('alert');return;}b.setAttribute('aria-pressed','true');b.querySelector('b').textContent='DONE';b.disabled=true;step++;sound('click');feedback.textContent=step===3?'All 3 steps complete! Click the button below to finish.':['','Damaged line off! Now click step 2 to turn on backup power.','Backup power is on! Now click step 3 to reconnect sensors.'][step];root.querySelector('#repair-confirm').disabled=step!==3;});root.querySelector('#repair-confirm').onclick=()=>resolve('bypass');root.querySelector('#repair-isolate').onclick=()=>resolve('isolate');return;}
  if(kind==='survey'){let site=null;const acquired=new Set(),slider=root.querySelector('#band-tuner'),feedback=root.querySelector('#operation-feedback');const refresh=()=>{root.querySelector('#survey-confirm').disabled=acquired.size!==2||!site;root.querySelector('#site-status').textContent=acquired.size===2?(site?(activeSites.find(s=>s.id===site)?.name || site)+' SELECTED':'PICK A LANDING SITE'):acquired.size+'/2 GUIDES ACQUIRED';};slider.oninput=()=>{root.querySelector('#band-value').textContent=(+slider.value).toFixed(2)+' μm';const x=40+(+slider.value-1.8)/.8*630;root.querySelector('#band-cursor').setAttribute('x1',x);root.querySelector('#band-cursor').setAttribute('x2',x);};root.querySelectorAll('[data-tune]').forEach(b=>b.onclick=()=>{slider.value=b.dataset.tune;slider.dispatchEvent(new Event('input'));feedback.textContent='Tuned to '+(b.dataset.tune==='2.20'?'GUIDE 1':'GUIDE 2')+'. Now click ACQUIRE SCAN.';sound('click');});root.querySelector('#acquire-band').onclick=()=>{const wave=+slider.value,band=Math.abs(wave-2.2)<.055?'clay':Math.abs(wave-2.4)<.055?'sulfate':null;if(!band){feedback.textContent='Move the slider closer to a guide line (near 2.20 or 2.40).';sound('click');return;}acquired.add(band);root.querySelector(`[data-tune="${band==='clay'?'2.20':'2.40'}"]`).classList.add('acquired');root.querySelectorAll('[data-site]').forEach(b=>{const s=activeSites.find(s=>s.id===b.dataset.site) || SITES.find(s=>s.id===b.dataset.site);if(s){b.querySelector('.site-'+band).textContent=s[band]+' ± '+(sim.loadout[3]===0?6:10);b.classList.add('has-'+band);}});feedback.textContent=acquired.size===2?'Both guides acquired! Compare the 3 landing sites below, click one, and confirm.':band.toUpperCase()+' acquired! Now tune and acquire the second guide.';sound('scan');refresh();};root.querySelectorAll('[data-site]').forEach(b=>b.onclick=()=>{site=b.dataset.site;root.querySelectorAll('[data-site]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));feedback.textContent=acquired.size===2?'Site selected! Click COMMIT LANDING SITE below.':'Site selected! Tune both scanner guides above to unlock.';refresh();});root.querySelector('#survey-confirm').onclick=()=>resolve(site);return;}
  let claim=null;root.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>{claim=b.dataset.claim;root.querySelectorAll('[data-claim]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));root.querySelector('#analysis-confirm').disabled=false;root.querySelector('#operation-feedback').textContent=claim===destData.hypothesis.key?(sim.campaign.evidence.length===3?'Great job! Your rock samples and photos support this conclusion.':'Good choice, but missing some samples makes the conclusion provisional.'):'Warning: your collected evidence does not support this claim. Submit if you wish, but the reward will be lower.';});root.querySelector('#analysis-confirm').onclick=()=>resolve(claim);
}
export function campaignDebrief(sim){
  if(!sim.campaign)return '';
  const c=sim.campaign;
  const destData=getCampaignData(sim.destination?.id||'mars');
  const siteName=(destData.sites.find(s=>s.id===c.site)||SITES.find(s=>s.id===c.site))?.name||'No site selected';
  const missionClass = NASA_MISSION_CLASSES.find(mc=>mc.id===c.missionClass) || NASA_MISSION_CLASSES[0];
  const launchVehicle = LAUNCH_VEHICLES.find(lv=>lv.id===c.launchVehicle) || LAUNCH_VEHICLES[0];
  const totalCost = (sim.stats?.totalMissionCost || (sim.stats?.cost + launchVehicle.cost)) || 360;

  const costCommendation = c.missionClass === 'discovery' 
    ? 'COMMENDATION: NASA DISCOVERY EFFICIENCY MEDAL — Mission executed under strict $500M competitive cost cap!' 
    : c.missionClass === 'new_frontiers' 
      ? 'COMMENDATION: NASA NEW FRONTIERS AWARD — Decadal planetary survey objectives successfully achieved!' 
      : 'COMMENDATION: NASA FLAGSHIP STRATEGIC CITATION — Multi-billion dollar strategic exploration mandate accomplished!';

  return `<section class="engineering-debrief">
    <span class="eyebrow">NASA SCIENCE EVALUATION // ${destData.agency}</span>
    <h3>${c.confidence==='supported'?'A DEFENSIBLE DISCOVERY':c.confidence==='provisional'?'A PROVISIONAL FINDING':'OBSERVATIONS SAVED · CLAIM CORRECTED'}</h3>
    <div class="debrief-arch-pills">
      <span class="debrief-pill">${missionClass.badge}</span>
      <span class="debrief-pill">${launchVehicle.shortName} (${launchVehicle.fairingDiameter} Fairing)</span>
      <span class="debrief-pill">Total Mission Cost: $${totalCost}M / $${missionClass.costLimit}M</span>
    </div>
    <p class="debrief-commendation">${costCommendation}</p>
    <p>${flightPlan(c).name} · ${flightPlan(c).days} planned days · ${siteName} · ${c.evidence.length}/3 field records</p>
    <div>${c.decisions.map(d=>`<article><b>${d.title}</b><p>${d.detail}</p></article>`).join('')}</div>
    <p class="model-caption">Signal fragments recovered: ${c.clues?.length||0}/3. ${c.confidence==='provisional'?'A second science stop would have strengthened the conclusion.':'Compare another route and evidence set to see how the outcome changes.'}</p>
    <p class="model-caption">PDS Dataset Reference: ${destData.pdsCitation}.</p>
  </section>`;
}
