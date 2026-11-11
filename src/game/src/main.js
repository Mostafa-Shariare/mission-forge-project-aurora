import {makeCampaign,flightPlan,SITES,getCampaignData,getTargetProvenance,DESTINATION_CAMPAIGNS} from './campaign.js';
import {plannerMarkup,bindPlanner,operationMarkup,bindOperation,campaignDebrief} from './mission-ui.js';
import {crew, CREW_ROLES, renderCrewConsoleStrip, renderRoleAuthorityTag, showCrewSetupModal, showGoNoGoPollModal, showModeSelectScreen, renderSpectatorHud, getStageRole, getStageTitle} from './crew.js';
let lastTelemetrySend=0;
let committedPlan=null;
let lastGamepadInteract=false;
let selectedMissionClass='discovery';
let selectedLaunchVehicle='falcon9_medium';
import '@fontsource/rajdhani/latin-400.css';
import '@fontsource/rajdhani/latin-500.css';
import '@fontsource/rajdhani/latin-600.css';
import '@fontsource/rajdhani/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import '@fontsource/inter/latin-400.css';
import './style.css';
import '../aurora-theme.css';
import {DESTINATIONS,SYSTEMS,STAGES,DESTINATION_STAGES,getDestinationStages,EVENTS,DEFAULT_LOADOUT,designStats,clamp} from './data.js';
import {Simulation} from './simulation.js';
import {SpaceWorld} from './world.js';
import {FlightAudio} from './audio.js';
import {AssemblyHangar} from './assembly.js';
import {FlightCoach,missionGuidance,interactionLimits} from './experience.js';
import {startRocketLaunch} from './launch.js';
let assembly=null;
let coach=null;
let activeLaunchSim=null;

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z??0)-(b.z??0));
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const getSaved=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('Storage unavailable. This expedition can still be completed.','warning');}};
let selected=2,loadout=[...DEFAULT_LOADOUT],difficulty='explorer',sim=null,world,view='menu',dialogKind=null,restoreFocus=null,extraPaused=false;
let lastJournal=getSaved('odyssey-journal',[]),records=getSaved('odyssey-records',{}),savedCheckpoint=getSaved('odyssey-checkpoint');
const audio=new FlightAudio();let keys={},transcript='',typed=0,accumulator=0,lastFrame=performance.now(),lastHud=0,scanSound=0,hazardTipActive=false,reentryCommsSent=false;
const settings=getSaved('odyssey-settings',{voice:true,quality:true,muted:false});
  const storedMuted = (typeof localStorage !== 'undefined') ? localStorage.getItem('aurora_audio_muted') : null;
  audio.voice = settings.voice;
  audio.muted = (storedMuted !== null) ? (storedMuted === 'true') : settings.muted;
  const storedMaster = getSaved('odyssey-master-vol', 0.8);
  const storedBgm = getSaved('odyssey-bgm-vol', 0.35);
  if(audio.setMasterVolume) audio.setMasterVolume(storedMaster);
  if(audio.setBgmVolume) audio.setBgmVolume(storedBgm);
  const storedBgmMode = (typeof localStorage !== 'undefined') ? localStorage.getItem('aurora-bgm-mode') : null;
  if(storedBgmMode && audio.setBgmMode) audio.setBgmMode(storedBgmMode);
const radar=$('#radar').getContext('2d');

function notify(message,type='info'){const item=document.createElement('div');item.className='notification'+(type==='warning'?' warning':'');item.textContent=message;$('#notifications').append(item);setTimeout(()=>item.remove(),3600);}

let scanCardTimeout = null;
function showScanProvenanceCard(targetName, prov) {
  const card = $('#nasa-scan-provenance-card');
  if (!card || !targetName) return;
  const isMuted = (typeof localStorage !== 'undefined') && localStorage.getItem('aurora-mute-pds-card') === 'true';
  if (isMuted) {
    notify(`NASA PDS: ${targetName} telemetry verified`, 'info');
    return;
  }
  const destinationId = sim?.destination?.id || DESTINATIONS[selected].id;
  const data = prov || getTargetProvenance(destinationId, targetName);
  const targetEl = $('#nasa-card-target');
  if (targetEl) targetEl.textContent = targetName.toUpperCase();
  const instEl = $('#nasa-card-instrument');
  if (instEl) instEl.textContent = data.instrument || 'NASA PDS Instrument Suite';
  const dataEl = $('#nasa-card-dataset');
  if (dataEl) dataEl.textContent = data.datasetId || 'NASA PDS Level-2/3 Archive';
  const agencyEl = $('#nasa-card-agency');
  if (agencyEl) agencyEl.textContent = data.agency || 'NASA Science Mission Directorate';
  const findEl = $('#nasa-card-finding');
  if (findEl) findEl.textContent = data.finding || 'Atmospheric & geological measurement verified.';
  const link = $('#nasa-card-pds-link');
  if (link) {
    link.href = data.url || 'https://pds.nasa.gov/';
    link.textContent = `ACCESS ${data.archiveName ? data.archiveName.toUpperCase() : 'NASA PDS ARCHIVE'} ↗`;
  }
  card.classList.add('compact');
  const toggleBtn = $('#nasa-card-toggle');
  if (toggleBtn) toggleBtn.textContent = 'DETAILS ▾';
  card.hidden = false;
  card.classList.add('visible');
  
  clearTimeout(scanCardTimeout);
  scanCardTimeout = setTimeout(() => {
    card.classList.remove('visible');
    setTimeout(() => { card.hidden = true; }, 300);
  }, 4000);
}

function openNasaDataDrawer() {
  const drawer = $('#nasa-data-drawer');
  const backdrop = $('#nasa-drawer-backdrop');
  if (!drawer) return;
  const destId = sim?.destination?.id || DESTINATIONS[selected].id;
  const campaign = getCampaignData(destId);
  const destMeta = DESTINATIONS.find(d => d.id === destId) || DESTINATIONS[0];
  
  const agencyEl = $('#nasa-drawer-agency');
  if (agencyEl) agencyEl.textContent = (campaign.agency || 'NASA Science Mission Directorate').toUpperCase();
  const titleEl = $('#nasa-drawer-title');
  if (titleEl) titleEl.textContent = `${destMeta.name} // NASA OPEN DATA & PDS PROVENANCE`;
  
  const content = $('#nasa-drawer-content');
  if (content) {
    const instruments = campaign.instruments || [];
    const bands = campaign.spectralBands || [];
    const evidenceList = sim?.campaign?.evidence || [];
    
    content.innerHTML = `
      <section class="drawer-section">
        <span class="eyebrow">OFFICIAL NASA PDS / EARTHDATA CATALOG REPOSITORY</span>
        <div class="pds-highlight-banner">
          <div class="pds-code"><code>${campaign.pdsCitation}</code></div>
          <a href="${campaign.source || 'https://pds.nasa.gov/'}" target="_blank" rel="noopener" class="primary-button small">
            <span>BROWSE NASA OPEN DATA PORTAL</span><b>↗</b>
          </a>
        </div>
      </section>

      <section class="drawer-section">
        <span class="eyebrow">ACTIVE MISSION FLIGHT SCIENTIFIC INSTRUMENT SUITE</span>
        <div class="instruments-grid">
          ${instruments.map(inst => `
            <div class="instrument-card">
              <div class="inst-top">
                <strong>${inst.name}</strong>
                <code>${inst.pdsId}</code>
              </div>
              <p class="inst-full">${inst.full}</p>
              <div class="inst-spec"><b>SPECTRAL / PHYSICAL SPEC:</b> ${inst.spec}</div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="drawer-section">
        <span class="eyebrow">DIAGNOSTIC SPECTRAL BANDS & PHYSICAL ABSORPTION WAVELENGTHS</span>
        <div class="bands-pills">
          ${bands.map(b => `
            <div class="band-pill">
              <b>${b.element}</b>
              <span>${b.nm} nm</span>
              <small>${b.label}</small>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="drawer-section">
        <span class="eyebrow">EXPEDITION DATA ACQUISITION LOG (VERIFIED OPEN DATA ATTRIBUTIONS)</span>
        <div class="evidence-provenance-list">
          ${evidenceList.length > 0 ? evidenceList.map((e, idx) => {
            const p = e.provenance || getTargetProvenance(destId, e.name);
            return `
              <div class="provenance-log-entry">
                <div class="entry-header">
                  <span class="entry-tag">SAMPLE 0${idx+1}</span>
                  <strong>${e.name}</strong>
                  <code>${p.datasetId}</code>
                </div>
                <div class="entry-inst"><b>INSTRUMENT:</b> ${p.instrument}</div>
                <p class="entry-finding">${p.finding}</p>
                <a href="${p.url}" target="_blank" rel="noopener" class="link-small">Access ${p.archiveName} ↗</a>
              </div>
            `;
          }).join('') : `
            <div class="empty-log-box">
              <p>No field samples cored yet in this session. Explore waypoints and scan targets to log verified NASA PDS dataset accessions!</p>
            </div>
          `}
        </div>
      </section>
    `;
  }

  drawer.hidden = false;
  if (backdrop) backdrop.hidden = false;
  drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('visible');
  audio?.cue?.('click');
}

function closeNasaDataDrawer() {
  const drawer = $('#nasa-data-drawer');
  const backdrop = $('#nasa-drawer-backdrop');
  if (!drawer) return;
  drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('visible');
  setTimeout(() => {
    drawer.hidden = true;
    if (backdrop) backdrop.hidden = true;
  }, 250);
}

function toggleNasaDataDrawer() {
  const drawer = $('#nasa-data-drawer');
  if (drawer && !drawer.hidden && drawer.classList.contains('open')) {
    closeNasaDataDrawer();
  } else {
    openNasaDataDrawer();
  }
}
function persistSettings(){
    save('odyssey-settings',{voice:audio.voice,quality:world?.highQuality??true,muted:audio.muted});
    try { if(typeof localStorage !== 'undefined') localStorage.setItem('aurora_audio_muted', String(audio.muted)); } catch(e){}
  }
function updateAudioButton(){
    const b=$('#sound-button');
    if(!b)return;
    const isMuted = !!audio.muted;
    b.setAttribute('aria-pressed',String(!isMuted));
    b.title=isMuted?'Enable audio (M)':'Mute audio (M)';
    b.classList.toggle('active',!isMuted);
    b.classList.toggle('muted',isMuted);
    if(!isMuted){
      b.innerHTML = '<svg class="sound-svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h3l4-3v10l-4-3H2V6z"/><path d="M12 5a4.5 4.5 0 010 6"/><path d="M14 3a7.5 7.5 0 010 10"/></svg><span class="sound-label">AUDIO ON</span>';
    } else {
      b.innerHTML = '<svg class="sound-svg muted-svg" viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 6h3l4-3v10l-4-3H2V6z"/><line x1="2" y1="2" x2="14" y2="14" stroke="#ef4444" stroke-width="1.8"/></svg><span class="sound-label muted-label">MUTED</span>';
    }
  }
function updateBgmButton(){
    const b=$('#bgm-track-button');
    if(!b)return;
    b.textContent = audio.getBgmButtonLabel ? audio.getBgmButtonLabel() : 'BGM';
    b.title = `Current Soundtrack: ${audio.getBgmTrackTitle ? audio.getBgmTrackTitle() : 'BGM'} (Press B to cycle)`;
  }
async function soundToggle(){
  try {
    await audio.start();
  } catch(e){}
  audio.toggle();
  updateAudioButton();
  updateBgmButton();
  persistSettings();
}
function bgmToggle(){
    audio.start();
    if(audio.cycleBgmMode){
      audio.cycleBgmMode();
      updateBgmButton();
      notify(`SOUNDTRACK: ${audio.getBgmTrackTitle()}`);
    }
  }
function showDialog(kind,html,wide=false){
  restoreFocus=document.activeElement;keys={};dialogKind=kind;$('#dialog').className='dialog'+(wide?' wide':'');$('#dialog').classList.add(kind+'-dialog');$('#dialog').innerHTML=html;$('#modal-layer').hidden=false;
  requestAnimationFrame(()=>$('#dialog').querySelector('button:not(:disabled),select,a')?.focus({preventScroll:true}));
}
function closeDialog(){
  assembly?.dispose();assembly=null;
  $('#modal-layer').hidden=true;dialogKind=null;keys={};if(extraPaused){sim?.resume();extraPaused=false;}
  if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});
}
function pauseForDialog(){extraPaused=sim?.pause()||false;}
function header(kicker,title,close=false){return `<span class="eyebrow">${kicker}</span><h2 id="dialog-title">${title}</h2>${close?'<button class="close-dialog" data-close aria-label="Close dialog">×</button>':''}`;}
function selectDestination(index, broadcast = true){
  selected=(index+DESTINATIONS.length)%DESTINATIONS.length;const d=DESTINATIONS[selected];world?.setDestination(d);
  if($('#planet-name')) $('#planet-name').textContent=d.name;if($('#mission-subtitle')) $('#mission-subtitle').textContent=d.subtitle;if($('#mission-type')) $('#mission-type').textContent=d.type.toUpperCase();if($('#mission-code')) $('#mission-code').textContent=`0${selected+1} • 05`;
  if($('#risk-label')) { const riskTag = d.surface ? 'HABITABLE VOID' : d.id === 'earth' ? 'ORBITAL ZONE' : 'DEEP SPACE'; $('#risk-label').textContent='CLASS '+['I','II','III','IV','V'][d.difficulty-1]+' • '+riskTag; } if($('#mission-description')) $('#mission-description').textContent=d.intro;
  if($('#destination-range')) $('#destination-range').textContent=d.distance;if($('#transfer-time')) $('#transfer-time').textContent=d.days+' DAYS';
  if($('#planet-radius')) $('#planet-radius').textContent=d.radiusKm?`${d.radiusKm} • ${d.scaleRatio}`:`${d.radius} km`;
  if($('#planet-gravity')) $('#planet-gravity').textContent=d.gravityLabel||`${d.gravity} m/s²`;
  if($('#primary-goal')) $('#primary-goal').textContent='LOCATE '+d.target;if($('#trajectory-target')) $('#trajectory-target').textContent=d.name;
  $$('.destination-card').forEach((b,i)=>{b.classList.toggle('selected',i===selected);b.setAttribute('aria-pressed',String(i===selected));});
  if($('#record-label')) $('#record-label').textContent=records[d.id]?`BEST EXPEDITION: ${records[d.id].score} SCIENCE · RANK ${records[d.id].rank}`:'THE NEXT FRONTIER IS YOURS TO EXPLORE.';
  if (broadcast && crew.isCrewMode()) {
    crew.broadcast('DESTINATION_SELECT', { index: selected });
  }
}
function buildCards(){
  $('#destination-cards').innerHTML=DESTINATIONS.map((d,i)=>`<button class="destination-card ${i===selected?'selected':''}" data-destination="${i}" aria-pressed="${i===selected}" aria-label="Select ${d.name} mission"><span class="card-index">0${i+1} / ${d.id==='earth'?'LOW ORBIT':d.id==='jupiter'?'DEEP SPACE':'EXPEDITION'}</span><span class="card-planet" style="background-image:url('./textures/${d.id==='earth'?'earth.jpg':d.texture}')"></span><span class="card-text">${d.name}<small>${d.subtitle}</small></span><span class="card-corner">${records[d.id]?'[OK]':'[SELECT]'}</span></button>`).join('');
}
function designDialog(broadcast = true){
  assembly?.dispose();assembly=null;
  const d=DESTINATIONS[selected];
  showDialog('design',`${header('MISSION FORGE / '+d.name,'BUILD THE ODYSSEY 07.',true)}<div id="assembly-root"></div>`,true);
  $('#dialog').classList.add('assembly-dialog');
  assembly=new AssemblyHangar($('#assembly-root'),loadout,d,value=>{
    loadout=value;
  },()=>audio.cue('success'));
  $('#difficulty-select').value=difficulty;
  $('#difficulty-select').onchange=e=>{difficulty=e.target.value;};
  if (broadcast && crew.isCrewMode()) {
    crew.broadcast('OPEN_DESIGN_BAY', { destination: selected });
  }
}
function flightPlanDialog(arch={}){
  closeDialog();
  const d = DESTINATIONS[selected];
  const mClass = arch.missionClass || selectedMissionClass || 'discovery';
  const lVehicle = arch.launchVehicle || selectedLaunchVehicle || 'falcon9_medium';
  selectedMissionClass = mClass;
  selectedLaunchVehicle = lVehicle;
  const stats = designStats(loadout, d.id, mClass, lVehicle);
  showDialog('planning',`${header('MISSION PLANNING / '+d.name.toUpperCase(),'TRAJECTORY & SCIENCE PROTOCOLS.',true)}${plannerMarkup(stats, d.id, mClass, lVehicle)}`,true);
  bindPlanner($('#dialog'),plan=>{
    committedPlan=makeCampaign(plan, d.id, mClass, lVehicle);
    closeDialog();
    if (crew.isCrewMode()) {
      crew.broadcast('START_ROCKET_LAUNCH', {
        destinationIndex: selected,
        loadout: [...loadout],
        plan,
        missionClass: mClass,
        launchVehicle: lVehicle
      });
    }
    activeLaunchSim=startRocketLaunch({
      destination: d,
      loadout,
      campaign: committedPlan,
      missionClass: mClass,
      launchVehicle: lVehicle,
      audio,
      onComplete: () => {
        activeLaunchSim = null;
        initializeFlight();
      },
      onCancel: () => {
        activeLaunchSim = null;
        returnMenu();
      }
    });
  });
}
function operationDialog(kind){
  keys={};audio.stopVoice();audio.cue('alert');
  const title={repair:'THE SCIENCE BUS IS DOWN.',survey:'FOLLOW THE EVIDENCE.',analysis:'WHAT CAN WE ACTUALLY CLAIM?'}[kind];
  showDialog('operation',`${header('FIELD OPERATIONS / '+kind.toUpperCase(),title)}${operationMarkup(sim,kind)}`,true);
  bindOperation($('#dialog'),sim,kind,value=>{closeDialog();sim.resolveOperation(kind,value);},name=>audio.cue(name));
}
function initializeFlight(checkpoint=null){
  closeDialog();audio.start();audio.fadeInBgm(1.8);audio.stopKlaxon();audio.updateWind(0);document.body.classList.remove('hud-alert-critical','hud-alert-warning');sim=checkpoint?Simulation.restore(checkpoint,handleEvent):new Simulation({destination:DESTINATIONS[selected].id,loadout,difficulty,campaign:committedPlan,onEvent:handleEvent});
  view='flight';$('#menu-view').hidden=true;$('#flight-view').hidden=false;document.body.classList.add('in-flight');
  coach=new FlightCoach(getSaved('odyssey-coach-complete',false));
  $('#touch-controls').hidden=!matchMedia('(pointer: coarse)').matches;world.setupStage(sim);saveCheckpoint();buildFlightHud();showBriefing();
  if (crew.isCrewMode()) {
    const stageRole = getStageRole(sim.stage);
    crew.setSegment(stageRole, getStageTitle(sim.stage));
    const flightHud = $('#crew-flight-hud');
    if (flightHud) renderSpectatorHud(flightHud);
  }
}
function saveCheckpoint(){savedCheckpoint=sim.checkpoint;save('odyssey-checkpoint',savedCheckpoint);if($('#resume-button'))$('#resume-button').hidden=false;}
function returnMenu(){
  if(activeLaunchSim){
    activeLaunchSim.dispose();
    activeLaunchSim=null;
    const lv=$('#launch-view');
    if(lv)lv.hidden=true;
    document.body.classList.remove('in-launch-simulation');
  }
  if(sim){lastJournal=sim.journal;save('odyssey-journal',lastJournal);selected=DESTINATIONS.findIndex(d=>d.id===sim.destination.id);}
  closeDialog();audio.stopVoice();audio.stopKlaxon();audio.updateWind(0);audio.fadeOutBgm(1.8);document.body.classList.remove('hud-alert-critical','hud-alert-warning');hazardTipActive=false;reentryCommsSent=false;sim=null;view='menu';keys={};$('#menu-view').hidden=false;$('#flight-view').hidden=true;$('#touch-controls').hidden=true;document.body.classList.remove('in-flight');buildCards();selectDestination(selected);if($('#resume-button'))$('#resume-button').hidden=!savedCheckpoint;
}
function stageInfo(){
  const destStage = sim?.currentStageInfo || (sim?.destination ? getDestinationStages(sim.destination.id)[sim.stage] : null) || STAGES[sim.stage];
  const stage={...destStage};
  return stage;
}
function campaignBriefing(stage){
  if(!sim.campaign)return stage;
  const destData = getCampaignData(sim.destination?.id || 'mars');
  const activeSites = destData.sites || SITES;
  const site=activeSites.find(s=>s.id===sim.campaign.site)?.name||'the landing area';
  if(sim.stage===0)stage.message=`Mission control: You are flying to ${sim.destination.name}! Press W to fly forward, A and D to steer, and S to slow down. Fly through the glowing rings ahead.`;
  if(sim.stage===2)stage.message=`Three sensor beacons are detected nearby. Fly close to each beacon, slow down below 12 meters per second, and hold E to scan them.`;
  if(sim.stage===3)stage.message='Approaching '+site+'! Slow down below 10 meters per second. When the box turns green, press E to touch down.';
  if(sim.stage===4)stage.message=sim.destination.surface
    ? 'Rover ready near '+site+'! Drive to the markers with W and S. Stop near a marker and press E to collect samples. Press X when you want to leave.'
    : 'Retrieval drone ready near '+site+'! Fly to the markers with W and S. Stop near each package and press E to collect it. Press X when finished.';
  return stage;
}
function showBriefing(){
  const s = campaignBriefing(stageInfo());
  const destData = getCampaignData(sim?.destination?.id || 'mars');
  const site = (destData.sites || SITES).find(st => st.id === sim?.campaign?.site)?.name || 'the landing area';
  const stageIdx = sim?.stage ?? 0;
  const isRover = stageIdx === 4 && sim?.destination?.surface;
  const isDrone = stageIdx === 4 && !sim?.destination?.surface;

  // Clear, punchy kid-friendly objective
  let goal = '';
  if (stageIdx === 0) goal = `Fly through the glowing navigation rings towards ${sim?.destination?.name || 'your target'}!`;
  else if (stageIdx === 1) goal = `Fire short thruster burns to maintain your interplanetary trajectory!`;
  else if (stageIdx === 2) goal = `Fly close to the 3 sensor beacons, slow below 12 m/s, and hold [E] to scan!`;
  else if (stageIdx === 3) goal = `Approach ${site}, slow down below 10 m/s, and press [E] on green to touch down!`;
  else if (stageIdx === 4) goal = isRover
    ? `Drive your rover to target markers, stop, and hold [E] to drill rock samples!`
    : `Fly your recovery drone to science canisters and hold [E] to collect them!`;
  else if (stageIdx === 5) goal = `Fire orbital departure thrusters to begin the voyage back to Earth!`;
  else goal = s.verb || 'Follow flight waypoints and complete mission milestones!';

  // Visual Chapter Progress Stepper
  const stageStepsHtml = STAGES.map((st, i) => {
    const isPast = i < stageIdx;
    const isCur = i === stageIdx;
    return `
      <div class="stepper-step ${isCur ? 'active' : ''} ${isPast ? 'done' : ''}">
        <span class="stepper-num">${isPast ? 'OK' : '0' + (i + 1)}</span>
        <span class="stepper-label">${st.short || ('CH 0' + (i + 1))}</span>
      </div>
    `;
  }).join('');

  // Visual Keyboard Controls Keycaps
  const keysHtml = isRover ? `
    <div class="briefing-key-group">
      <div class="keycap-combo"><kbd>W</kbd><kbd>S</kbd></div>
      <span>DRIVE FORWARD / BACK</span>
    </div>
    <div class="briefing-key-group">
      <div class="keycap-combo"><kbd>A</kbd><kbd>D</kbd></div>
      <span>STEER WHEELS</span>
    </div>
    <div class="briefing-key-group action">
      <kbd class="key-action">E</kbd>
      <span>DRILL ROCK SAMPLE</span>
    </div>
    <div class="briefing-key-group finish">
      <kbd class="key-subtle">X</kbd>
      <span>FINISH STAGE</span>
    </div>
  ` : isDrone ? `
    <div class="briefing-key-group">
      <div class="keycap-combo"><kbd>W</kbd><kbd>S</kbd></div>
      <span>FLY FORWARD / BACK</span>
    </div>
    <div class="briefing-key-group">
      <div class="keycap-combo"><kbd>A</kbd><kbd>D</kbd></div>
      <span>STEER FLIGHT</span>
    </div>
    <div class="briefing-key-group action">
      <kbd class="key-action">E</kbd>
      <span>COLLECT CANISTER</span>
    </div>
    <div class="briefing-key-group finish">
      <kbd class="key-subtle">X</kbd>
      <span>FINISH STAGE</span>
    </div>
  ` : `
    <div class="briefing-key-group">
      <kbd>W</kbd>
      <span>FORWARD THRUST</span>
    </div>
    <div class="briefing-key-group">
      <div class="keycap-combo"><kbd>A</kbd><kbd>D</kbd></div>
      <span>STEER SHIP</span>
    </div>
    <div class="briefing-key-group">
      <kbd>S</kbd>
      <span>BRAKE / REVERSE</span>
    </div>
    ${stageIdx === 2 || stageIdx === 3 ? `
    <div class="briefing-key-group action">
      <kbd class="key-action">E</kbd>
      <span>${stageIdx === 2 ? 'HOLD TO SCAN' : 'TOUCHDOWN ON GREEN'}</span>
    </div>` : ''}
  `;

  // Dynamic button label
  const btnText = stageIdx === 0
    ? 'TAKE THE CONTROLS'
    : isRover
      ? 'DEPLOY THE ROVER'
      : isDrone
        ? 'LAUNCH RECOVERY DRONE'
        : stageIdx === 3
          ? 'BEGIN DESCENT'
          : 'START CHAPTER';

  showDialog('briefing', `
    <div class="briefing-modal-header">
      <div class="briefing-meta-pill">
        <span class="briefing-ch-tag">CHAPTER 0${stageIdx + 1} OF 06</span>
        <span class="briefing-dest-tag">TARGET // ${(sim?.destination?.name || 'MISSION').toUpperCase()}</span>
      </div>
      <h2 id="dialog-title" class="briefing-title">${s.title}</h2>
      <div class="briefing-stepper-wrap">
        ${stageStepsHtml}
      </div>
    </div>

    <div class="briefing-objective-card">
      <div class="objective-header-strip">
        <span class="objective-target-icon">[DIRECTIVE]</span>
        <span class="objective-header-label">MISSION DIRECTIVE</span>
      </div>
      <div class="objective-main-goal">${goal}</div>
    </div>

    <div class="briefing-controls-section">
      <span class="controls-section-title">FLIGHT CONTROLS</span>
      <div class="briefing-keys-row">
        ${keysHtml}
      </div>
    </div>

    ${s.fact ? `
    <div class="briefing-discovery-card">
      <span class="discovery-icon">[INSIGHT]</span>
      <div class="discovery-body">
        <strong>NASA SCIENCE FACT</strong>
        <p>${s.fact}</p>
      </div>
    </div>` : ''}

    <div class="dialog-footer briefing-footer">
      <span class="checkpoint-saved-pill"><span class="pip-dot"></span> CHECKPOINT COMMITTED</span>
      <button class="primary-button hero-start-btn tactical-btn" id="begin-stage">
        <span>${btnText}</span>
        <span class="btn-arrow">↗</span>
      </button>
    </div>
  `);
}
function buildFlightHud(){
  hazardTipActive=false;reentryCommsSent=false;
  if(!$('#mission-guidance'))$('.objective-panel').insertAdjacentHTML('beforeend','<details id="mission-guidance" class="mission-guidance"><summary aria-label="Show flight guidance and pilot practice"><span>FLIGHT HELP</span><span class="help-chevron">⌄</span></summary><div class="guidance-content"><h3 id="guidance-title"></h3><p id="guidance-detail"></p><div id="pilot-practice"><b id="practice-title"></b><p id="practice-detail"></p><button id="skip-practice">SKIP PRACTICE</button></div></div></details>');
  const s=stageInfo();$('#flight-chapter').textContent=`${s.chapter} / ${s.short.toUpperCase()} · ${sim.destination.name}`;$('#flight-title').textContent=s.title;$('#objective-main').textContent=s.verb;
  $('#resource-bars').innerHTML=[['hull','HULL INTEGRITY','#a0dbd7'],['fuel','PROPELLANT','#e4bb82'],['power','POWER RESERVE','#87bedb']].map(([key,name,color])=>`<div class="resource-row" id="resource-${key}" style="--bar-color:${color}"><div><span>${name}</span><b><span id="value-${key}">100</span><small>%</small></b></div><span class="resource-track"><i id="bar-${key}" style="width:100%"></i></span></div>`).join('');
  $('#resource-bars').insertAdjacentHTML('beforeend','<div class="resource-row" style="--bar-color:#a8abdf"><div><span>COMMS LINK</span><b><span id="value-comms">82</span><small>%</small></b></div><span class="resource-track"><i id="bar-comms" style="width:82%"></i></span></div>');
  if(!$('#dsn-telemetry-badge')){
    const telemetryPanel = $('.hud-panel.telemetry');
    if(telemetryPanel){
      telemetryPanel.insertAdjacentHTML('afterend',`
        <section class="hud-panel dsn-panel" id="dsn-telemetry-badge">
          <div class="panel-caption">
            <span>DSN SPEED-OF-LIGHT COMMS</span>
            <span class="dsn-carrier-badge"><i class="dsn-pulse-dot"></i> <span id="dsn-lock-status">CARRIER LOCK</span></span>
          </div>
          <div class="dsn-metrics-grid">
            <div class="dsn-metric">
              <span class="dsn-metric-label">TRACKING STATION</span>
              <b class="dsn-metric-value" id="dsn-station-val">MADRID DSS-63</b>
            </div>
            <div class="dsn-metric">
              <span class="dsn-metric-label">SIGNAL LAG (OWLT)</span>
              <b class="dsn-metric-value highlight" id="dsn-owlt-val">12m 30s</b>
            </div>
            <div class="dsn-metric">
              <span class="dsn-metric-label">ROUND-TRIP (RTLT)</span>
              <b class="dsn-metric-value" id="dsn-rtlt-val">25m 00s</b>
            </div>
            <div class="dsn-metric">
              <span class="dsn-metric-label">BITRATE · MARGIN</span>
              <b class="dsn-metric-value" id="dsn-margin-val">28.5 kbps · +8.7 dB</b>
            </div>
          </div>
          <div class="dsn-mode-pill" id="dsn-mode-pill">
            <span class="dsn-mode-icon">[FDIR]</span>
            <span id="dsn-mode-text">AUTONOMOUS FAULT PROTECTION ACTIVE</span>
          </div>
        </section>
      `);
    }
  }
  const destStages = sim?.destination ? getDestinationStages(sim.destination.id) : STAGES;
  $('#flight-progress').innerHTML=destStages.map((st,i)=>`<span class="${i===sim.stage?'active':i<sim.stage?'done':''}"><b>0${i+1}</b>${st.short.toUpperCase()}</span>`).join('');
  $('#flight-tip').innerHTML=sim.isSurface&&sim.campaign?(sim.destination.id==='mars'?`DRIVE <kbd>W</kbd><kbd>S</kbd> · ORBITAL MAP: PLAN SAFE ROUTES · TUBES: ${sim.sampleTubesUsed}/${sim.maxSampleTubes} · DEPART <kbd>X</kbd>`:'DRIVE <kbd>W</kbd><kbd>S</kbd> · STEER <kbd>A</kbd><kbd>D</kbd> · CYCLE SITE <kbd>Z</kbd> · COLLECT <kbd>E</kbd> · DEPART <kbd>X</kbd>'):sim.destination.id==='asteroid'?`ORBIT: <kbd>T</kbd> HAMO/LAMO · THRUST <kbd>W</kbd><kbd>S</kbd> · STEER <kbd>A</kbd><kbd>D</kbd> · ALTITUDE <kbd>↑</kbd><kbd>↓</kbd>`:sim.destination.id==='jupiter'&&sim.stage===4?`QUIET WINDOWS: SCAN <kbd>E</kbd> · SURGE: SHIELDS <kbd>3</kbd> · RETREAT <kbd>X</kbd>`:sim.isSurface?'DRIVE <kbd>W</kbd><kbd>S</kbd> &nbsp; STEER <kbd>A</kbd><kbd>D</kbd> &nbsp; STOP & COLLECT <kbd>E</kbd>':'THRUST <kbd>W</kbd> &nbsp; BRAKE <kbd>S</kbd> &nbsp; STEER <kbd>A</kbd><kbd>D</kbd> &nbsp; ALTITUDE <kbd>↑</kbd><kbd>↓</kbd>';
  if($('#bottom-context')) $('#bottom-context').textContent=sim.isSurface?'SURFACE OPERATIONS · TIME & DISTANCE SCALED':'FLIGHT OPERATIONS · TIME & DISTANCE SCALED';
  updateObjectives();updateHud();
}
function updateObjectives(){
  if(!sim)return;
  const freeRover=sim.isSurface&&!!sim.campaign;
  let tubesHtml = '';
  if(freeRover&&sim.destination.id==='mars'){
    tubesHtml = `<div class="mars-tubes-counter" style="display:flex;justify-content:space-between;align-items:center;padding:5px 8px;margin-bottom:8px;background:#18100bc0;border:1px solid #9e5b3280;font:8px var(--mono);color:#f2b68c;"><span>CORE SAMPLE STORAGE</span><b>${sim.sampleTubesUsed}/${sim.maxSampleTubes} TUBES</b></div>`;
  }
  $('#objective-list').innerHTML=tubesHtml+sim.targets.map((t,i)=>freeRover?`<li class="${t.done?'done':i===sim.targetIndex?'active':''}"><button class="rover-target" data-rover-target="${i}" aria-pressed="${i===sim.targetIndex&&!t.done}" ${t.done?'disabled':''}><span>${t.done?'OK':'0'+(i+1)}</span>${t.name}</button></li>`:`<li class="${i<sim.targetIndex?'done':i===sim.targetIndex?'active':''}">${t.name}</li>`).join('');
  $('#objective-fraction').textContent=`${String(freeRover?sim.targets.filter(t=>t.done).length:Math.min(sim.targetIndex+1,sim.targets.length)).padStart(2,'0')} / ${String(sim.targets.length).padStart(2,'0')}`;
  if(freeRover&&!$('#rover-map')){
    $('#objective-list').insertAdjacentHTML('afterend','<canvas id="rover-map" width="190" height="100" aria-label="Surface map showing the rover and three selectable evidence sites"></canvas>');
    $('#rover-map').onclick=e=>{const box=e.currentTarget.getBoundingClientRect(),x=(e.clientX-box.left)*190/box.width,y=(e.clientY-box.top)*100/box.height;let nearest=-1,minDist=Infinity;sim.targets.forEach((t,i)=>{if(t.done)return;const p=roverMapPoint(t),d=Math.hypot(x-p.x,y-p.y);if(d<minDist){minDist=d;nearest=i;}});if(minDist<17)sim.selectSurfaceTarget(nearest);};
  }
  if(!freeRover)$('#rover-map')?.remove();
  $('#rover-depart')?.remove();
  if(freeRover){$('#objective-list').insertAdjacentHTML('afterend',`<button id="rover-depart" class="rover-depart" ${sim.canDepartSurface?'':'disabled'}>${sim.canDepartSurface?'DEPART WITH EVIDENCE <kbd>X</kbd>':'RECOVER RECORDER + ONE RECORD TO DEPART'}</button>`);$('#objective-main').textContent='Choose your traverse. More evidence strengthens the conclusion.';}
}
function roverMapPoint(point){return {x:10+(point.x+155)/310*170,y:10+(65-point.z)/390*80};}
function drawRoverMap(){
  const canvas=$('#rover-map');if(!canvas||!sim?.isSurface)return;const c=canvas.getContext('2d');c.clearRect(0,0,190,100);
  const isMars = sim.destination.id === 'mars';
  c.fillStyle = isMars ? '#120b08' : '#0a202b';
  c.fillRect(0,0,190,100);
  c.strokeStyle = isMars ? '#482a1b' : '#305666';
  c.lineWidth = .7;
  for(let x=10;x<190;x+=25){c.beginPath();c.moveTo(x,0);c.lineTo(x,100);c.stroke();}
  for(let y=10;y<100;y+=25){c.beginPath();c.moveTo(0,y);c.lineTo(190,y);c.stroke();}

  if(isMars){
    // Séítah Dunes hazard zone on the right (x > 25)
    c.fillStyle = 'rgba(180, 85, 30, 0.16)';
    c.fillRect(108, 10, 76, 78);
    c.strokeStyle = 'rgba(220, 105, 35, 0.45)';
    c.setLineDash([2, 2]);
    c.strokeRect(108, 10, 76, 78);
    c.setLineDash([]);
    c.fillStyle = '#e58f5c';
    c.font = '6px monospace';
    c.fillText('SÉÍTAH DUNES', 112, 20);
    c.fillText('(SAND SLIP)', 112, 27);

    // Delta Fan geological region on the left
    c.fillStyle = 'rgba(45, 125, 140, 0.12)';
    c.beginPath();
    c.arc(52, 48, 36, 0, Math.PI*2);
    c.fill();
    c.fillStyle = '#65bdc9';
    c.fillText('DELTA FAN', 22, 20);
  }

  const rover=roverMapPoint(sim.position);
  if(sim.target){
    const goal=roverMapPoint(sim.target);
    const d=Math.round(distance(sim.position,sim.target));
    const inDunes = sim.target.x > 25;
    const estPwr = Math.max(3, Math.round((d / 18) * 0.45 + (inDunes ? 12 : 0)));
    c.strokeStyle = isMars ? '#e89f6b' : '#8ddbdc';
    c.setLineDash([3,4]);
    c.beginPath();
    c.moveTo(rover.x,rover.y);
    c.lineTo(goal.x,goal.y);
    c.stroke();
    c.setLineDash([]);

    // Vector telemetry
    c.fillStyle = isMars ? '#ffd2b0' : '#a0e8dd';
    c.font = '7px monospace';
    c.fillText(`ROUTE: ${d}m · ~${estPwr}% PWR${inDunes?' (DUNES)':''}`, 10, 95);
  }

  sim.targets.forEach((t,i)=>{
    const p=roverMapPoint(t);
    c.fillStyle=t.done?'#689a7e':i===sim.targetIndex?(isMars?'#ffe3c7':'#b3fff1'):(isMars?'#e09865':'#d6ad7c');
    c.beginPath();
    c.arc(p.x,p.y,i===sim.targetIndex?5:4,0,Math.PI*2);
    c.fill();
    c.font='9px monospace';
    c.fillText(String(i+1),p.x+7,p.y+3);
  });

  c.fillStyle='#e4faff';
  c.beginPath();
  c.arc(rover.x,rover.y,3,0,Math.PI*2);
  c.fill();

  if(isMars && sim.stormActive){
    c.fillStyle = 'rgba(215, 60, 25, 0.88)';
    c.fillRect(0, 0, 190, 12);
    c.fillStyle = '#ffffff';
    c.font = 'bold 7px monospace';
    c.fillText('ALERT // DUST STORM ACTIVE · SOLAR GEN -85%', 6, 9);
  }
}
function communicate(speaker,message,speak=true){transcript=message;typed=0;$('#comm-speaker').textContent=speaker.toUpperCase();$('#comm-state').textContent='INCOMING TRANSMISSION';audio.playQuindar('intro');if(speak){audio.speak(message,()=>{setTimeout(()=>audio.playQuindar('outro'),200);});}else{setTimeout(()=>{audio.playQuindar('outro');},Math.min(2400,Math.max(800,message.length*36)));}}
function handleEvent(event){
  if(event.type==='operation')operationDialog(event.kind);
  if(event.type==='operationResolved'){audio.cue('success');notify('DECISION LOGGED · YOUR MISSION HAS CHANGED');}
  if(event.type==='begin'){const s=stageInfo();communicate(s.commander,s.message);audio.playLaunchSequence();}
  if(event.type==='target'){audio.playWaypointChime();notify('LOGGED // '+event.name+' COMPLETE');updateObjectives();showScanProvenanceCard(event.name, event.provenance);}
  if(event.type==='sampleStored'){
    audio.cue('success');
    notify(`SAMPLE TUBE ${event.tubeIndex}/${event.maxTubes} SEALED: ${event.sampleName}`);
    communicate('Science Officer Sen',`Sample tube ${event.tubeIndex} sealed and hermetically stored! Rock core registered for Earth return.`);
    updateObjectives();
    showScanProvenanceCard(event.sampleName, event.provenance);
  }
  if(event.type==='bonusAnomaly'){
    audio.cue('success');
    notify('DISCOVERY BONUS: '+event.name+' (+'+event.score+' PTS)');
    communicate('Science Officer Sen','Bonus discovery analyzed! Valuable science data recovered: '+event.name+'.');
    updateHud();
    showScanProvenanceCard(event.name, event.provenance);
  }
  if(event.type==='orbitModeChange'){
    audio.cue('click');
    const isLamo=event.mode==='LAMO';
    notify(isLamo?'ORBIT TRANSITION: LAMO (210 KM) · Image detail +80% · Watch for ejecta!':'ORBIT TRANSITION: HAMO (700 KM) · Safe survey orbit');
    communicate('Flight Dynamics',isLamo?'Spacecraft inserted into Low-Altitude Mapping Orbit. High-resolution sensors active. Beware irregular gravity and boulder ejecta.':'Ascended to High-Altitude Mapping Orbit. Global survey mode active.');
    updateHud();
  }
  if(event.type==='multiAngleLock'){
    audio.cue('scan');
    notify(`SPECTRAL LOCK: Sector ${event.count}/3 acquired for ${event.targetName}`);
  }
  if(event.type==='lamoObservationBonus'){
    audio.cue('discovery');
    notify(`CLOSE ORBIT BONUS: +${event.bonus} Science points for low-altitude pass over ${event.targetName}!`);
    communicate('Science Officer Sen',`Low-altitude pass captured ultra-high-resolution mineral signatures! +${event.bonus} bonus science points awarded.`);
  }
  if(event.type==='retreatSuccess'){
    audio.cue('discovery');
    notify(`TACTICAL RETREAT SUCCESSFUL: +${event.bonus} Survival Margin Bonus! (Dose: ${event.dose}%)`);
    communicate('Flight Director',`Excellent decision! Spacecraft retreated to safe orbit with ${event.measurements} critical measurement(s). Radiation dose held to ${event.dose}%.`);
  }
  if(event.type==='radiationSurgeChange'){
    if(event.surge){
      audio.startKlaxon();
      notify('RADIATION SURGE ACTIVE · Divert power to Shields (3) immediately!','warning');
      communicate('Flight Engineer Reyes','Radiation surge incoming! Magnetic flux spiking. Route power to shields now!');
    }else{
      audio.stopKlaxon();
      notify('OBSERVATION WINDOW OPEN · Radiation quiet · Safe to scan','info');
      communicate('Science Officer Sen','Entering quiet radiation window. Magnetic field stable—begin scientific observation passes.');
    }
    updateHud();
  }
  if(event.type==='measurementRecorded'){
    audio.cue('success');
    notify(`MEASUREMENT ${event.count}/3 LOGGED: ${event.name} (Dose: ${event.dose}%)`);
    communicate('Science Officer Sen',`Measurement ${event.count} secured! Data saved. Cumulative radiation dose is now ${event.dose}%. Choose whether to risk another scan or press X to retreat.`);
    updateObjectives();
    updateHud();
  }
  if(event.type==='camBurnSuccess'){
    audio.cue('discovery');
    notify(`COLLISION AVOIDED: CAM burn cleared conjunction! +15 Pts (Total cleared: ${event.avoided})`);
    communicate('Flight Engineer Reyes',`CAM maneuver nominal! Trajectory altered. Debris conjunction cleared with positive separation.`);
    updateHud();
  }
  if(event.type==='conjunctionRiskChange'){
    if(event.risk==='critical'){
      audio.startKlaxon();
      const miss = event.closestApproach ? event.closestApproach.missDistance.toFixed(1) : '15';
      notify(`CRITICAL CONJUNCTION: Debris on collision course (Miss ${miss}m)! Press B for CAM burn`,'warning');
      communicate('Flight Director',`Traffic Alert! Conjunction warning on radar. Object closing fast. Press B to execute a collision avoidance burn!`);
    } else if(event.risk==='elevated'){
      audio.stopKlaxon();
      notify('CONJUNCTION MONITOR: Close approach predicted within 45m','info');
    } else {
      audio.stopKlaxon();
    }
    updateHud();
  }
  if(event.type==='groundStationPassChange'){
    if(event.aos){
      notify('GROUND STATION AOS: TDRSS downlink active · High precision radar (±5m)','info');
    } else {
      notify('GROUND STATION LOS: In orbital shadow · Tracking uncertainty ±35m','warning');
    }
    updateHud();
  }
  if(event.type==='solarStormWarning'){
    audio.startKlaxon();
    notify(`CORONAL MASS EJECTION DETECTED: Impact in ${event.timeToImpact}s! Press 3 for SHIELDS`,'warning');
    communicate('Flight Dynamics',`Coronal Mass Ejection detected from the Sun! Plasma wave incoming in ${event.timeToImpact} seconds. Route power to shields immediately!`);
    updateHud();
  }
  if(event.type==='solarStormStart'){
    audio.cue('solar_storm');
    notify('SOLAR STORM ACTIVE · Hold SHIELDS (3) to deflect coronal plasma!','warning');
    communicate('Flight Engineer Reyes','Solar storm has reached the ship! Hold shields up to absorb the coronal blast!');
    updateHud();
  }
  if(event.type==='shieldDeflect'){
    audio.cue('shield_deflect');
  }
  if(event.type==='solarStormEnd'){
    audio.stopKlaxon();
    audio.cue('success');
    notify('SOLAR STORM PASSED · Coronal plasma receding · Telemetry nominal','info');
    communicate('Flight Director','Coronal Mass Ejection has cleared our sector. Spacecraft systems and radiation levels returning to nominal.');
    updateHud();
  }
  if(event.type==='route'){
    if(event.route==='shield'){
      audio.cue('shield');
      notify('SHIELDS ENERGIZED · 360° Magnetic Deflection Grid Online','info');
    }else if(event.route==='science'){
      audio.cue('sensor_stream');
      notify('SCIENCE PRIORITY · Sensor array amplified +55%','info');
    }else if(event.route==='engine'){
      audio.cue('click');
      notify('ENGINES PRIORITY · Propulsion thrust boosted +25%','info');
    }
    updateHud();
  }
  if(event.type==='pulse'){
    audio.cue('scan');
    notify('LIDAR RADAR SWEEP ACTIVE · 360° Sensor Pulse Deployed','info');
  }
  if(event.type==='interactionHint')notify(event.message);
  if(event.type==='selection'){audio.cue('click');updateObjectives();communicate('Rover navigation','New marker selected: '+event.name+'. Drive to the marker.',false);}
  if(event.type==='expeditionReady'){audio.cue('success');updateObjectives();communicate('Science Officer Sen','The recorder and samples are on board! Press X to return to space, or keep exploring for extra samples.');notify('RETURN UNLOCKED · PRESS X TO DEPART OR KEEP EXPLORING');}
  if(event.type==='clue'){keys={};audio.cue('scan');showDialog('clue',`${header(event.clue.label,'A PIECE OF THE SIGNAL.')}<p class="eyebrow">${event.clue.speaker}</p><p class="dialog-lead">${event.clue.message}</p><div class="briefing-fact"><span>⌬</span><p><b>MISSION LOG UPDATED</b><br>${event.clue.finding}</p></div><div class="dialog-footer"><span>FRAGMENT ${event.index+1} / 3 RECOVERED</span><button class="primary-button" id="ack-clue"><span>RETURN TO THE CONTROLS</span><b>↗</b></button></div>`);}
  if(event.type==='impact'){
    audio.impact(event.amount);world.impact();const flash=$('#impact-flash');flash.classList.remove('flash');void flash.offsetWidth;flash.classList.add('flash');
    const worldEl=$('#world');worldEl.classList.remove('screen-glitch');void worldEl.offsetWidth;worldEl.classList.add('screen-glitch');setTimeout(()=>worldEl.classList.remove('screen-glitch'),300);
    notify('IMPACT · Hull damage! Steer clear or press R to repair.','warning');
  }
  if(event.type==='alertStateChange'){
    if(event.level==='critical')audio.startKlaxon();
    else audio.stopKlaxon();
    document.body.classList.toggle('hud-alert-critical',event.level==='critical');
    document.body.classList.toggle('hud-alert-warning',event.level==='warning');
  }
  if(event.type==='stormStateChange'){
    if(event.active){
      communicate('Flight Director','Dust storm detected! Solar battery charging is reduced.');
      notify('DUST STORM DETECTED · Solar charging reduced','warning');
    }
  }
  if(event.type==='touchdownRating'){
    if(event.quality==='damaged'){
      audio.cue('damage');
      communicate('Flight Director','Hard touchdown! Impact speed damaged scientific instruments and buckled landing gear.');
      notify(`HARD TOUCHDOWN (${event.speed.toFixed(1)} M/S) · EQUIPMENT DAMAGED`,'warning');
    }else if(event.quality==='flawless'){
      audio.cue('discovery');
      communicate('Flight Director','Flawless precision landing! Lunar touchdown nominal, scientific equipment pristine.');
      notify(`FLAWLESS PRECISION TOUCHDOWN (${event.speed.toFixed(1)} M/S) · +30 SCIENCE`,'info');
    }else{
      audio.cue('advance');
      communicate('Flight Director','Touchdown confirmed on Shackleton rim. Instruments operational.');
      notify(`NOMINAL TOUCHDOWN (${event.speed.toFixed(1)} M/S)`,'info');
    }
  }
  if(event.type==='miss'){notify('TARGET PASSED · Turn around and slow down with S.','warning');communicate('Navigation','You passed the target. Turn around and slow down with S.');}
  if(event.type==='repair'){audio.cue('success');notify('FIELD REPAIR COMPLETE · +30 HULL');}
  if(event.type==='pulse')audio.cue('scan');
  if(event.type==='route'){audio.cue('click');notify('POWER ROUTED TO '+event.route.toUpperCase());updateHud();}
  if(event.type==='assist'){audio.cue('click');notify(event.active?'AUTOPILOT ON · Computer steers to the target.':'MANUAL FLIGHT · You are steering.');updateHud();}
  if(event.type==='log'){lastJournal=sim.journal;save('odyssey-journal',lastJournal);}

  function formatEventDetail(detail) {
    const parts = (detail || '').split('·').map(s => s.trim());
    let badges = [];
    let description = '';

    for (const part of parts) {
      const lower = part.toLowerCase();
      if (lower.includes('science')) {
        badges.push(`<span class="choice-badge badge-cyan">[SCI] ${part.toUpperCase()}</span>`);
      } else if (lower.includes('power')) {
        badges.push(`<span class="choice-badge badge-amber">[PWR] ${part.toUpperCase()}</span>`);
      } else if (lower.includes('fuel')) {
        badges.push(`<span class="choice-badge badge-blue">[PROP] ${part.toUpperCase()}</span>`);
      } else if (lower.includes('hull safe') || lower.includes('protected') || lower.includes('safe recovery') || lower.includes('zero damage') || lower.includes('stays safe')) {
        badges.push(`<span class="choice-badge badge-green">[HULL NOMINAL]</span>`);
      } else if (lower.includes('damage')) {
        badges.push(`<span class="choice-badge badge-red">[HULL DAMAGE]</span>`);
      } else if (lower.includes('restored') || lower.includes('repaired')) {
        badges.push(`<span class="choice-badge badge-green">[REPAIRED]</span>`);
      } else {
        description = part;
      }
    }

    return {
      description: description || parts[0] || 'Take emergency action',
      badgesHtml: badges.join('')
    };
  }

  if(event.type==='event'){
    keys={};audio.cue('alert');
    const e=EVENTS[event.id]||EVENTS.flare;
    const dsn=event.dsn||(sim?sim.getDsnTelemetry():null);
    audio.speak(e.body);
    
    showDialog('event',`
      <div class="anomaly-header">
        <div class="anomaly-top-strip">
          <span class="anomaly-alert-tag"><i class="pulse-dot"></i> EMERGENCY DIRECTIVE</span>
          <span class="anomaly-station-tag">DSN // ${dsn?.activeStation || 'GROUND STATION'}</span>
        </div>
        <h2 id="dialog-title" class="anomaly-title">${e.title}</h2>
      </div>

      <div class="anomaly-dilemma-card">
        <div class="dilemma-badge">COMMUNICATION DELAY: ${dsn?.owltDisplay || '12m 30s'}</div>
        <p class="dilemma-text">Earth is millions of miles away—Houston cannot send commands in time. <strong>Commander, choose your spacecraft's emergency defense!</strong></p>
      </div>

      <div class="event-choices tactical-event-choices">
        ${e.choices.map((c,i)=>{
          const f = formatEventDetail(c.detail);
          return `
          <button class="event-choice modern-choice-card tactical-choice-card" data-effect="${c.effect}">
            <div class="choice-card-left">
              <span class="choice-key-num">0${i+1}</span>
              <div class="choice-text-block">
                <div class="choice-head-row">
                  <strong class="choice-title">${c.label}</strong>
                  ${c.system ? `<span class="choice-system-tag">[SYS] ${c.system}</span>` : ''}
                </div>
                <p class="choice-desc">${f.description}</p>
                <div class="choice-badges-row">${f.badgesHtml}</div>
              </div>
            </div>
            <span class="choice-arrow-icon">→</span>
          </button>`;
        }).join('')}
      </div>
    `);
  }
  if(event.type==='choice'){audio.cue('click');communicate('Mission control','Decision logged. Your flight profile has been updated.',false);}
  if(event.type==='stageComplete'){
    keys={};audio.stopVoice();audio.stopKlaxon();audio.updateWind(0);audio.fadeOutBgm(1.8);document.body.classList.remove('hud-alert-critical','hud-alert-warning');hazardTipActive=false;reentryCommsSent=false;
    const destStages = sim?.destination ? getDestinationStages(sim.destination.id) : STAGES;
    const nextStage = (sim?.campaign ? flightPlan(sim.campaign)?.stages?.[sim.stage+1] : null) || destStages[sim.stage+1] || STAGES[sim.stage+1] || { title: 'MISSION ADVANCE' };
    $('#cinematic-kicker').textContent='CHAPTER '+String(sim.stage+1).padStart(2,'0')+' COMPLETE';
    $('#cinematic-title').textContent=nextStage.title;
    $('#cinematic-copy').textContent=sim.stage===0?`${sim.campaign?flightPlan(sim.campaign).days:sim.destination.days} days of coast, compressed into the next chapter.`:sim.stage===3?(sim.destination.surface?'Touchdown confirmed. Deploying the surface rover.':'Rendezvous confirmed. Deploying the recovery vehicle.'):sim.stage===4?'Departure burn complete. The long journey home begins.':'Trajectory confirmed. Reconfiguring flight systems.';
    let transitionTimer = null;
    const finishTransition = () => {
      if (transitionTimer) { clearTimeout(transitionTimer); transitionTimer = null; }
      const el = $('#cinematic');
      if (el) {
        el.hidden = true;
        el.onclick = null;
      }
      try {
        if (sim?.mode === 'transition') {
          sim.advance();
          if (crew.isCrewMode()) {
            crew.broadcast('STAGE_ADVANCE', { stage: sim.stage });
            const stageRole = getStageRole(sim.stage);
            crew.setSegment(stageRole, getStageTitle(sim.stage));
            const flightHud = $('#crew-flight-hud');
            if (flightHud) renderSpectatorHud(flightHud);
          }
        }
      } catch (err) {
        console.error('Error during stage advance:', err);
      } finally {
        if (el) el.hidden = true;
      }
    };
    const cinematicEl = $('#cinematic');
    if (cinematicEl) {
      cinematicEl.hidden = false;
      cinematicEl.style.cursor = 'pointer';
      cinematicEl.title = 'Click or tap to proceed immediately';
      cinematicEl.onclick = finishTransition;
    }
    transitionTimer = setTimeout(finishTransition, 3900);
  }
  if(event.type==='stage'){
    const cinematicEl = $('#cinematic');
    if (cinematicEl) {
      cinematicEl.hidden = true;
      cinematicEl.onclick = null;
    }
    try {
      world.setupStage(sim);
      saveCheckpoint();
      buildFlightHud();
      showBriefing();
    } catch (err) {
      console.error('Error during stage setup:', err);
    }
  }
  if(event.type==='complete')completeMission();
  if(event.type==='failed'){
    audio.cue('alert');audio.stopKlaxon();audio.updateWind(0);audio.fadeOutBgm(1.8);document.body.classList.remove('hud-alert-critical','hud-alert-warning');keys={};
    const finalScore = Math.round(sim ? sim.score : 0);
    const finalHull = Math.round(sim ? Math.max(0, sim.hull) : 0);
    const result = { score: finalScore, rank: 'F', time: sim ? sim.time : 0, hull: finalHull, destination: sim?.destination?.name, date: new Date().toISOString() };
    const html = buildDebriefCarousel(sim, true, event);
    showDialog('failed', html, true);
    initDebriefCarousel(sim, true, event, result);
  }
}
function buildDebriefCarousel(sim, isFailed, failEvent) {
  const finalScore = Math.round(sim ? sim.score : 0);
  const finalHull = Math.round(sim ? Math.max(0, sim.hull) : 0);
  const finalTime = sim ? formatTime(sim.time) : '00:00';
  const finalCollisions = sim ? sim.collisions : 0;
  const stageNum = sim ? (sim.stage + 1) : 1;
  const destName = (sim?.destination?.name || 'Mars').toUpperCase();
  const destSource = sim?.destination?.source || 'https://science.nasa.gov';
  const destScience = sim?.destination?.science || 'Transfer trajectories require continuous momentum management and precision capture.';

  const totalScoreVal = isFailed
    ? Math.round(finalScore * 20 + finalHull * 5)
    : Math.round(finalScore * 35 + finalHull * 15);
  const totalScoreStr = totalScoreVal.toLocaleString();

  let grade = 'C';
  if (isFailed) {
    grade = '!';
  } else if (finalScore >= 185 && finalHull >= 65) {
    grade = 'S';
  } else if (finalScore >= 155) {
    grade = 'A+';
  } else if (finalScore >= 130) {
    grade = 'A';
  } else if (finalScore >= 100) {
    grade = 'B';
  } else {
    grade = 'C';
  }

  const trajectoryAcc = Math.min(99.4, (86.0 + (finalScore / 25) + (finalHull / 30))).toFixed(1);
  const propEfficiency = Math.max(8, Math.round(sim?.fuel ?? 65));
  const dragPenalty = '+' + ((finalCollisions * 2.2) + 3.1).toFixed(1) + '%';
  const busDrop = (sim?.power ?? 100) < 45 ? '−12%' : '−5%';
  const vectorDrift = '0.' + (finalCollisions + 2) + '°';

  return `
  <div class="debrief-modal-wrapper ${isFailed ? 'failed-debrief' : ''}">
    <div class="debrief-top-banner">
      <div class="banner-left">
        <span class="banner-kicker">MISSION DEBRIEF • PROJECT AURORA</span>
        <h2>${isFailed ? 'MISSION INTERRUPTED • CHAPTER 0' + stageNum : 'EXPEDITION COMPLETE • ' + destName}</h2>
      </div>
      <div class="banner-score-box">
        <div class="score-metric">
          <span class="score-label">TOTAL SCORE</span>
          <strong class="score-num">${totalScoreStr} <small>PTS</small></strong>
        </div>
        <div class="grade-pill">
          <span class="grade-label">GRADE</span>
          <b class="grade-badge ${isFailed ? 'failure' : ''}">${grade}</b>
        </div>
      </div>
    </div>

    <div class="debrief-carousel-viewport" id="carouselViewport">
      <button class="carousel-nav-btn prev" id="carouselPrev" aria-label="Previous card">‹</button>
      <button class="carousel-nav-btn next" id="carouselNext" aria-label="Next card">›</button>

      <div class="debrief-carousel-ring" id="carouselRing">
        <div class="carousel-card active" data-index="0">
          <div class="card-topline">
            <span class="card-pill-tag">01 • TELEMETRY</span>
            <span class="card-corner-status"></span>
          </div>
          <h3 class="card-title">MISSION TELEMETRY</h3>
          <span class="card-subtitle">FLIGHT TRAJECTORY & METRICS</span>
          <div class="card-metric-list">
            <div class="card-metric-row">
              <span class="metric-label">Destination</span>
              <span class="metric-val">${destName} EXPEDITION</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Trajectory Accuracy</span>
              <span class="metric-val highlight">${trajectoryAcc}% OPTIMAL</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Flight Duration</span>
              <span class="metric-val">${finalTime}</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Propellant Remaining</span>
              <span class="metric-val highlight">${propEfficiency}% MARGIN</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Science Return</span>
              <span class="metric-val highlight">${finalScore} POINTS</span>
            </div>
          </div>
          <div class="card-desc-box">
            ${isFailed ? escape(failEvent?.message || 'Flight trajectory interrupted during approach corridor.') : (sim?.fullArchive ? 'The complete archive survived the journey. Every measurement and recorded voice is safely secured.' : 'The validated samples reached Earth. Your team preserved the essential mission record.')}
          </div>
        </div>

        <div class="carousel-card" data-index="1">
          <div class="card-topline">
            <span class="card-pill-tag">02 • DIAGNOSTICS</span>
            <span class="card-corner-status ${isFailed || finalCollisions > 0 ? 'warning-dot' : ''}"></span>
          </div>
          <h3 class="card-title">PERFORMANCE GAPS</h3>
          <span class="card-subtitle">ANOMALIES & DIVERGENCE</span>
          <div class="card-metric-list">
            <div class="card-metric-row">
              <span class="metric-label">Drag / Maneuver Penalty</span>
              <span class="metric-val warning">${dragPenalty} CONSUMPTION</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Energy Bus Fluctuation</span>
              <span class="metric-val warning">${busDrop} TRANSIENT</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Thruster Alignment</span>
              <span class="metric-val">${vectorDrift} VECTOR DRIFT</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Collisions / Hazards</span>
              <span class="metric-val ${finalCollisions > 0 ? 'warning' : ''}">${finalCollisions} SUSTAINED</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Vehicle Integrity</span>
              <span class="metric-val ${finalHull < 40 ? 'warning' : 'highlight'}">${finalHull}%</span>
            </div>
          </div>
          <div class="card-desc-box">
            ${isFailed ? 'Guidance lost or vehicle integrity depleted. Structural thresholds exceeded tolerance limit.' : 'Orbital insertion nominal with minor micrometeoroid drag encountered during the interplanetary coast.'}
          </div>
        </div>

        <div class="carousel-card" data-index="2">
          <div class="card-topline">
            <span class="card-pill-tag">03 • NASA SCIENCE</span>
            <span class="card-corner-status"></span>
          </div>
          <h3 class="card-title">AEROSPACE INSIGHTS</h3>
          <span class="card-subtitle">PROPULSION & ORBITAL LAWS</span>
          <div class="card-desc-box" style="margin-top: 0; margin-bottom: 8px;">
            <strong style="color:#00e5ff; display:block; margin-bottom:3px;">Specific Impulse (Isp) Tradeoff:</strong>
            Ion engines achieve ~3,000s Isp with low thrust, while Chemical LH2/LOX delivers 450s Isp with high instantaneous maneuverability.
          </div>
          <div class="card-desc-box" style="margin-top: 0; margin-bottom: 8px;">
            <strong style="color:#00e5ff; display:block; margin-bottom:3px;">Tsiolkovsky Trajectory Principle:</strong>
            Payload fraction decreases exponentially with delta-V demands. Efficient stage staging preserves critical return fuel.
          </div>
          <div class="card-desc-box" style="margin-top: 0;">
            <strong style="color:#00e5ff; display:block; margin-bottom:3px;">Planetary Mission Science:</strong>
            ${escape(destScience)}
          </div>
          <a href="${destSource}" target="_blank" rel="noopener" class="cyber-link">EXPLORE NASA DEEP SPACE SCIENCE ↗</a>
        </div>

        <div class="carousel-card" data-index="3">
          <div class="card-topline">
            <span class="card-pill-tag">04 • DIRECTIVES</span>
            <span class="card-corner-status"></span>
          </div>
          <h3 class="card-title">FLIGHT DIRECTIVE</h3>
          <span class="card-subtitle">ACTIONABLE REFINEMENTS</span>
          <div class="card-metric-list" style="margin-bottom: 12px;">
            <div class="card-metric-row">
              <span class="metric-label">Recommended Thruster</span>
              <span class="metric-val highlight">ION / XENON CLUSTER</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Shielding Requirement</span>
              <span class="metric-val">CLASS III COMPOSITE</span>
            </div>
            <div class="card-metric-row">
              <span class="metric-label">Solar Recharge Margin</span>
              <span class="metric-val highlight">+15% PHOTOVOLTAIC</span>
            </div>
          </div>
          <div class="card-actions">
            <button class="btn-action-primary" id="carouselBtnBay">RE-ENGINEER IN ASSEMBLY BAY ↗</button>
            <button class="btn-action-outline" id="carouselBtnRetry">RETRY FLIGHT CHECKPOINT ↺</button>
          </div>
        </div>
      </div>
    </div>

    <div class="debrief-bottom-bar">
      <div class="carousel-indicators" id="carouselIndicators">
        <button class="indicator-dot active" data-index="0" aria-label="Slide 1"></button>
        <button class="indicator-dot" data-index="1" aria-label="Slide 2"></button>
        <button class="indicator-dot" data-index="2" aria-label="Slide 3"></button>
        <button class="indicator-dot" data-index="3" aria-label="Slide 4"></button>
      </div>
      <div class="debrief-quick-actions">
        <button class="primary-button" id="carouselBtnNext" data-menu><span>CHOOSE THE NEXT FRONTIER</span><b>↗</b></button>
        <button class="outline-button" id="carouselBtnExport">EXPORT LOG ↓</button>
        <button class="outline-button" id="carouselBtnCert">OFFICIAL CERTIFICATE ↗</button>
      </div>
    </div>
  </div>
  `;
}

function initDebriefCarousel(sim, isFailed, failEvent, resultData) {
  const dialogEl = $('#dialog');
  if (!dialogEl) return;
  const cards = Array.from(dialogEl.querySelectorAll('.carousel-card'));
  const dots = Array.from(dialogEl.querySelectorAll('.indicator-dot'));
  const btnPrev = dialogEl.querySelector('#carouselPrev');
  const btnNext = dialogEl.querySelector('#carouselNext');
  const N = cards.length;
  let activeIndex = 0;

  function updateCylinder() {
    cards.forEach((card, i) => {
      let offset = (i - activeIndex) % N;
      if (offset > N / 2) offset -= N;
      if (offset < -N / 2) offset += N;

      card.classList.toggle('active', offset === 0);

      if (offset === 0) {
        card.style.transform = 'translateX(0px) translateZ(0px) rotateY(0deg) scale(1)';
        card.style.opacity = '1.0';
        card.style.zIndex = '30';
        card.style.pointerEvents = 'auto';
      } else if (offset === 1) {
        card.style.transform = 'translateX(400px) translateZ(-130px) rotateY(-36deg) scale(0.92)';
        card.style.opacity = '0.68';
        card.style.zIndex = '20';
        card.style.pointerEvents = 'auto';
      } else if (offset === -1) {
        card.style.transform = 'translateX(-400px) translateZ(-130px) rotateY(36deg) scale(0.92)';
        card.style.opacity = '0.68';
        card.style.zIndex = '20';
        card.style.pointerEvents = 'auto';
      } else {
        card.style.transform = 'translateX(0px) translateZ(-350px) rotateY(0deg) scale(0.82)';
        card.style.opacity = '0.15';
        card.style.zIndex = '5';
        card.style.pointerEvents = 'none';
      }

      card.onclick = (e) => {
        if (e.target.closest('button, a')) return;
        if (offset !== 0) goToCard(i);
      };
    });

    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === activeIndex);
    });
  }

  function goToCard(idx) {
    activeIndex = (idx % N + N) % N;
    updateCylinder();
  }

  if (btnPrev) btnPrev.onclick = () => goToCard(activeIndex - 1);
  if (btnNext) btnNext.onclick = () => goToCard(activeIndex + 1);

  dots.forEach((dot, i) => {
    dot.onclick = () => goToCard(i);
  });

  let isDragging = false;
  let startX = 0;
  const viewport = dialogEl.querySelector('#carouselViewport');
  if (viewport) {
    viewport.onmousedown = (e) => {
      if (e.target.closest('button, a')) return;
      isDragging = true;
      startX = e.clientX;
    };
    viewport.ontouchstart = (e) => {
      if (e.target.closest('button, a')) return;
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX;
      }
    };
  }

  const handleDragEnd = (clientX) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = clientX - startX;
    if (diff > 45) {
      goToCard(activeIndex - 1);
    } else if (diff < -45) {
      goToCard(activeIndex + 1);
    }
  };

  const onMouseUp = (e) => handleDragEnd(e.clientX);
  const onTouchEnd = (e) => {
    if (e.changedTouches && e.changedTouches[0]) {
      handleDragEnd(e.changedTouches[0].clientX);
    } else {
      isDragging = false;
    }
  };

  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('touchend', onTouchEnd);

  const onKey = (e) => {
    if (dialogKind === 'complete' || dialogKind === 'failed') {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goToCard(activeIndex - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goToCard(activeIndex + 1); }
    }
  };
  window.addEventListener('keydown', onKey);

  const btnBay = dialogEl.querySelector('#carouselBtnBay');
  if (btnBay) {
    btnBay.onclick = () => {
      closeDialog();
      designDialog();
    };
  }

  const btnRetry = dialogEl.querySelector('#carouselBtnRetry');
  if (btnRetry) {
    btnRetry.onclick = () => {
      closeDialog();
      if (savedCheckpoint) initializeFlight(savedCheckpoint);
      else initializeFlight();
    };
  }

  const btnNextAction = dialogEl.querySelector('#carouselBtnNext');
  if (btnNextAction) {
    btnNextAction.onclick = () => {
      returnMenu();
    };
  }

  const btnExport = dialogEl.querySelector('#carouselBtnExport');
  if (btnExport) {
    btnExport.onclick = () => {
      const exportData = resultData || {
        score: Math.round(sim ? sim.score : 0),
        time: sim ? sim.time : 0,
        hull: Math.round(sim ? sim.hull : 0),
        destination: sim?.destination?.name || 'Mission',
        date: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `odyssey-${sim?.destination?.id || 'mission'}-mission.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
  }

  const btnCert = dialogEl.querySelector('#carouselBtnCert');
  if (btnCert) {
    btnCert.onclick = () => {
      showCertificateModal(sim, resultData);
    };
  }

  updateCylinder();
}

function showCertificateModal(sim, resultData){
  const destName = (sim?.destination?.name || resultData?.destination || 'Mars').toUpperCase();
  const finalScore = Math.round(resultData?.score ?? sim?.score ?? 0);
  const finalHull = Math.round(resultData?.hull ?? sim?.hull ?? 100);
  const finalTime = resultData?.time ? formatTime(resultData.time) : (sim ? formatTime(sim.time) : '00:00');
  let grade = resultData?.rank || 'A';
  if(!grade || grade === '!'){
    grade = finalScore >= 185 && finalHull >= 65 ? 'S' : finalScore >= 155 ? 'A+' : finalScore >= 130 ? 'A' : finalScore >= 100 ? 'B' : 'C';
  }

  const certHtml = `
  <div class="nasa-certificate-modal">
    <div class="cert-border-outer">
      <div class="cert-border-inner">
        <div class="cert-header">
          <div class="cert-titles">
            <h3>NATIONAL AERONAUTICS AND SPACE ADMINISTRATION</h3>
            <h4>DEEP SPACE EXPLORATION &amp; SCIENCE ARCHIVE</h4>
            <span class="cert-directive">MISSION COMMENDATION &amp; FLIGHT CERTIFICATION</span>
          </div>
        </div>
        <p class="cert-intro">THIS OFFICIAL CITATION CERTIFIES THAT</p>
        <div class="cert-pilot-name" contenteditable="true" spellcheck="false" title="Click to edit pilot name">COMMANDER EXPLORER</div>
        <p class="cert-mission-statement">
          Has successfully navigated the <strong>${escape(destName)} Expedition</strong>, executing optimal orbital insertion, operating remote scientific payloads, and securing critical planetary observations for humanity's shared archive.
        </p>
        <div class="cert-metrics-grid">
          <div class="cert-metric-cell">
            <small>FINAL SCORE</small>
            <b>${finalScore} PTS</b>
          </div>
          <div class="cert-metric-cell">
            <small>MISSION GRADE</small>
            <b>${escape(grade)}</b>
          </div>
          <div class="cert-metric-cell">
            <small>HULL INTEGRITY</small>
            <b>${finalHull}%</b>
          </div>
          <div class="cert-metric-cell">
            <small>TRANSIT TIME</small>
            <b>${finalTime}</b>
          </div>
        </div>
        <div class="cert-signatures-row">
          <div class="cert-sign-col">
            <div class="cert-sign-line">FLIGHT DIRECTOR / JSC</div>
            <small>PROJECT AURORA FLIGHT DYNAMICS</small>
          </div>
          <div class="cert-hologram-seal">
            <span>NASA</span>
            <small>VERIFIED</small>
          </div>
          <div class="cert-sign-col">
            <div class="cert-sign-line">${new Date().toLocaleDateString()}</div>
            <small>DATE OF RECORDATION</small>
          </div>
        </div>
      </div>
    </div>
    <div class="cert-modal-actions">
      <button class="primary-button" id="certPrintBtn">PRINT / SAVE PDF</button>
      <button class="outline-button" id="certBackBtn">RETURN TO DEBRIEF ↗</button>
    </div>
  </div>
  `;

  showDialog('certificate', certHtml, true);
  const printBtn = $('#certPrintBtn');
  if(printBtn) printBtn.onclick = () => window.print();
  const backBtn = $('#certBackBtn');
  if(backBtn) backBtn.onclick = () => {
    const debriefHtml = buildDebriefCarousel(sim, false, null);
    showDialog('complete', debriefHtml, true);
    initDebriefCarousel(sim, false, null, resultData);
  };
}

function completeMission(){
  keys={};audio.cue('success');audio.stopVoice();audio.stopKlaxon();audio.updateWind(0);audio.fadeOutBgm(1.8);document.body.classList.remove('hud-alert-critical','hud-alert-warning');hazardTipActive=false;reentryCommsSent=false;
  const rank=sim.score>=185&&sim.hull>=65?'S':sim.score>=155?'A+':sim.score>=130?'A':sim.score>=100?'B':'C';
  const result={score:Math.round(sim.score),rank,time:sim.time,hull:Math.round(sim.hull),fullArchive:sim.fullArchive,destination:sim.destination.name,journal:sim.journal,campaign:sim.campaign,loadout:sim.loadout,date:new Date().toISOString()};
  if(!records[sim.destination.id]||records[sim.destination.id].score<result.score){records[sim.destination.id]=result;save('odyssey-records',records);}
  savedCheckpoint=null;try{localStorage.removeItem('odyssey-checkpoint');}catch{}if($('#resume-button'))$('#resume-button').hidden=true;lastJournal=sim.journal;save('odyssey-journal',lastJournal);
  const html = buildDebriefCarousel(sim, false, null);
  showDialog('complete', html, true);
  initDebriefCarousel(sim, false, null, result);
}
function pauseMenu(){
  if(!sim||!['flight','paused'].includes(sim.mode))return;sim.pause();audio.stopVoice();audio.fadeOutBgm(1.8);keys={};
  showDialog('pause',`${header('FLIGHT COMPUTER / PAUSED','HOLDING POSITION.')}<p>Your expedition is paused. Your last stage checkpoint is saved locally.</p><div class="dialog-actions"><button class="primary-button" id="resume-flight"><span>RESUME FLIGHT</span><b>↗</b></button><button class="outline-button" id="pause-controls">CONTROLS</button><button class="outline-button" id="retry-button">RETRY STAGE</button><button class="outline-button" data-menu>MISSION SELECTION</button></div>`);
}
function controlsDialog(){
  if(dialogKind==='briefing'||dialogKind==='event'||dialogKind==='complete'||dialogKind==='failed')return;
  pauseForDialog();showDialog('controls',`${header('PILOT FIELD MANUAL','YOU HAVE THE CONTROLS.',true)}<div class="controls-grid">${[
    ['Fly forward / Rover forward','W'],['Slow down / Rover reverse','S'],['Turn left & right','A D'],['Fly up & down','↑ ↓'],['Speed boost (uses extra fuel)','SPACE'],['Interact / Scan / Land / Dock','E'],['Autopilot on/off','G'],['Change camera view','C'],['Power: Engines (1) / Science (2) / Shields (3)','1 2 3'],['Use repair kit','R'],['Radar pulse','Q'],['Pause game','ESC'],['Controls & Manual','H'],['Flight log','L'],['Mute audio / Fullscreen','M F']].map(([label,key])=>`<div class="control-row"><span>${label}</span><span>${key.split(' ').map(k=>`<kbd>${k}</kbd>`).join('')}</span></div>`).join('')}</div><p>How to play: Press W to fly forward. Press S to brake and slow down. Press A and D to turn left or right. In space, your ship keeps moving forward until you brake. In the first two chapters, simply fly through the glowing rings ahead. In later chapters, fly close to the target, slow down, and press E to scan, land, or dock. Press G anytime for autopilot assistance!</p><div class="settings-row"><button class="outline-button" id="replay-practice">REPLAY PILOT PRACTICE</button><button class="outline-button" id="voice-toggle">VOICE ${audio.voice?'ON':'OFF'}</button><button class="outline-button" id="quality-toggle">GRAPHICS ${world.highQuality?'HIGH':'LOW'}</button><button class="primary-button" data-close><span>RETURN TO FLIGHT DECK</span><b>↗</b></button></div>`);
  $('#voice-toggle').onclick=e=>{audio.voice=!audio.voice;if(!audio.voice)audio.stopVoice();e.currentTarget.textContent='VOICE '+(audio.voice?'ON':'OFF');persistSettings();};
  $('#quality-toggle').onclick=e=>{world.setQuality(!world.highQuality);e.currentTarget.textContent='GRAPHICS '+(world.highQuality?'HIGH':'LOW');persistSettings();};
}
function journalDialog(){
  if(dialogKind&&dialogKind!=='pause')return;pauseForDialog();const entries=sim?.journal||lastJournal;
  showDialog('journal',`${header('EXPEDITION ARCHIVE','THE FLIGHT LOG.',true)}<div class="journal-list">${entries.length?entries.map(entry=>`<article class="journal-entry"><small>CHAPTER ${entry.stage+1} · ${formatTime(entry.time)}</small><h3>${escape(entry.title)}</h3><p>${escape(entry.text)}</p></article>`).join(''):'<p>Your mission log is empty. Relay scans and recovered samples will write the story of your expedition here.</p>'}</div><div class="dialog-footer"><span>RECORDS STORED ON THIS DEVICE</span><button class="outline-button" data-close>RETURN TO FLIGHT DECK</button></div>`);
}
function creditsDialog(){
  if(dialogKind)return;pauseForDialog();showDialog('credits',`${header('SCIENCE / ASSETS / MODEL','BUILT ON REAL CURIOSITY.',true)}<p>Mission Forge is an independent Space Apps game. Planet imagery is based on space-agency observations. The expedition, station, dialogue, and discoveries are authored fiction. This game does not imply NASA endorsement.</p><div class="source-list"><a href="https://science.nasa.gov/3d-resources/mars/" target="_blank" rel="noopener">MARS TEXTURE · NASA / JPL / Caltech · Viking imagery, USGS processing ↗</a><a href="https://science.nasa.gov/3d-resources/jupiter/" target="_blank" rel="noopener">JUPITER TEXTURE · NASA 3D Resources ↗</a><a href="https://github.com/mrdoob/three.js/tree/dev/examples/textures/planets" target="_blank" rel="noopener">EARTH & MOON TEXTURES · Three.js examples asset collection ↗</a><a href="${DESTINATIONS[selected].source}" target="_blank" rel="noopener">NASA PLANETARY SCIENCE · ${DESTINATIONS[selected].name} ↗</a><a href="https://www.spaceappschallenge.org/2026/" target="_blank" rel="noopener">NASA SPACE APPS CHALLENGE ↗</a></div><p>Simulation: local flight uses acceleration, inertial coasting, braking, collision spheres, and resource consumption. Journey distances and time are compressed. This is an arcade mission simulator, not an ephemeris, N-body solver, or certified trajectory planner. Vesta’s illustrative texture reuses lunar terrain. The ideal Δv display uses Tsiolkovsky’s rocket equation; ion-engine acceleration is intentionally exaggerated for play.</p><p>Three.js (MIT), Vite (MIT), bundled fonts (SIL OFL). Spacecraft, stations, terrain, interface, procedural soundscape, and mission narrative were created for this project. Optional browser speech synthesis provides crew voice, with captions always available.</p><button class="outline-button" data-close>BACK TO THE MISSION</button>`);
}
function settingsDialog(){
  if(dialogKind==='briefing'||dialogKind==='event'||dialogKind==='complete'||dialogKind==='failed')return;
  pauseForDialog();
  const masterVal = Math.round(audio.masterVolume !== undefined ? audio.masterVolume * 100 : 80);
  const bgmVal = Math.round(audio.bgmVolume !== undefined ? audio.bgmVolume * 100 : 35);

  const html = `
    ${header('SYSTEM SETTINGS &amp; ACCESSIBILITY','CONFIG &amp; AUDIO CONTROLS.',true)}
    <div class="settings-modal-content">
      <div class="setting-group">
        <label for="master-vol-slider">MASTER VOLUME <span id="master-vol-val">${masterVal}%</span></label>
        <input type="range" id="master-vol-slider" min="0" max="100" value="${masterVal}">
      </div>
      <div class="setting-group">
        <label for="bgm-vol-slider">BGM SOUNDTRACK VOLUME <span id="bgm-vol-val">${bgmVal}%</span></label>
        <input type="range" id="bgm-vol-slider" min="0" max="100" value="${bgmVal}">
      </div>
      <div class="setting-group" style="margin-top: 14px;">
        <label>BGM SOUNDTRACK PROFILE</label>
        <div class="bgm-mode-buttons" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 6px;">
          <button class="outline-button ${audio.bgmMode==='adaptive'?'active':''}" id="bgm-mode-adaptive">ADAPTIVE (AUTO)</button>
          <button class="outline-button ${audio.bgmMode==='main'?'active':''}" id="bgm-mode-main">THEME 1: PRIME</button>
          <button class="outline-button ${audio.bgmMode==='alt'?'active':''}" id="bgm-mode-alt">THEME 2: ALT</button>
          <button class="outline-button ${audio.bgmMode==='playlist'?'active':''}" id="bgm-mode-playlist">PLAYLIST LOOP</button>
        </div>
        <div id="bgm-mode-desc" style="margin-top: 6px; font-size: 0.75rem; color: #8EB7CD; line-height: 1.4;">${audio.getBgmDescription?audio.getBgmDescription():''}</div>
      </div>
      <div class="setting-row-toggles">
        <button class="outline-button" id="settings-voice-toggle">CREW VOICE ${audio.voice?'ON':'OFF'}</button>
        <button class="outline-button" id="settings-quality-toggle">GRAPHICS ${world.highQuality?'HIGH':'LOW'}</button>
        <button class="outline-button" id="settings-mute-toggle">AUDIO ${audio.muted?'MUTED':'ACTIVE'}</button>
      </div>
      <div class="setting-group" style="margin-top: 18px; border-top: 1px dashed rgba(255,255,255,0.15); padding-top: 12px;">
        <label>EXPEDITION DATA</label>
        <div style="display:flex; gap:10px;">
          <button class="outline-button" id="settings-reset-checkpoint">CLEAR CURRENT CHECKPOINT</button>
        </div>
      </div>
    </div>
    <div class="dialog-footer">
      <span>SETTINGS SAVED TO LOCAL DEVICE</span>
      <button class="primary-button" data-close><span>APPLY &amp; RETURN</span><b>↗</b></button>
    </div>
  `;
  showDialog('settings', html, false);

  const masterSlider = $('#master-vol-slider');
  if(masterSlider){
    masterSlider.oninput = e => {
      const val = Number(e.target.value);
      $('#master-vol-val').textContent = val + '%';
      if(audio.setMasterVolume) audio.setMasterVolume(val / 100);
      save('odyssey-master-vol', val / 100);
    };
  }

  const bgmSlider = $('#bgm-vol-slider');
  if(bgmSlider){
    bgmSlider.oninput = e => {
      const val = Number(e.target.value);
      $('#bgm-vol-val').textContent = val + '%';
      if(audio.setBgmVolume) audio.setBgmVolume(val / 100);
      save('odyssey-bgm-vol', val / 100);
    };
  }

  ['adaptive', 'main', 'alt', 'playlist'].forEach(mode => {
    const btn = $(`#bgm-mode-${mode}`);
    if(btn){
      btn.onclick = () => {
        if(audio.setBgmMode) audio.setBgmMode(mode);
        ['adaptive', 'main', 'alt', 'playlist'].forEach(m => {
          $(`#bgm-mode-${m}`)?.classList.toggle('active', m === mode);
        });
        const descEl = $('#bgm-mode-desc');
        if(descEl && audio.getBgmDescription) descEl.textContent = audio.getBgmDescription();
        updateBgmButton();
      };
    }
  });

  const voiceToggle = $('#settings-voice-toggle');
  if(voiceToggle){
    voiceToggle.onclick = e => {
      audio.voice = !audio.voice;
      if(!audio.voice) audio.stopVoice();
      e.currentTarget.textContent = 'CREW VOICE ' + (audio.voice ? 'ON' : 'OFF');
      persistSettings();
    };
  }

  const qualityToggle = $('#settings-quality-toggle');
  if(qualityToggle){
    qualityToggle.onclick = e => {
      world.setQuality(!world.highQuality);
      e.currentTarget.textContent = 'GRAPHICS ' + (world.highQuality ? 'HIGH' : 'LOW');
      persistSettings();
    };
  }

  const muteToggle = $('#settings-mute-toggle');
  if(muteToggle){
    muteToggle.onclick = e => {
      soundToggle();
      e.currentTarget.textContent = 'AUDIO ' + (audio.muted ? 'MUTED' : 'ACTIVE');
    };
  }

  const resetCheckpoint = $('#settings-reset-checkpoint');
  if(resetCheckpoint){
    resetCheckpoint.onclick = () => {
      savedCheckpoint = null;
      try { localStorage.removeItem('odyssey-checkpoint'); } catch(e){}
      if($('#resume-button')) $('#resume-button').hidden = true;
      notify('Saved checkpoint cleared.');
      closeDialog();
    };
  }
}
function formatTime(seconds){const n=Math.floor(seconds);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
function updateHud(){
  if(!sim)return;
  for(const key of ['hull','fuel','power']){$('#value-'+key).textContent=Math.round(sim[key]);$('#bar-'+key).style.width=sim[key]+'%';$('#resource-'+key).classList.toggle('warning',sim[key]<25);}
  $('#repair-count').textContent=String(sim.repairs).padStart(2,'0');$('#repair-button').disabled=sim.repairs===0||sim.hull>=99;
  let linkQuality=clamp(Math.round(100-sim.range*.055+(sim.route==='science'?5:0)),18,99);
  if(sim.destination.id==='jupiter'&&!sim.commsWindowActive){
    linkQuality=Math.max(8,Math.floor(linkQuality*0.12));
  }
  if(sim.destination.id==='earth'&&!sim.groundStationPass){
    linkQuality=Math.max(12,Math.floor(linkQuality*0.18));
  }
  $('#value-comms').textContent=linkQuality;$('#bar-comms').style.width=linkQuality+'%';
  const dsn = sim?.getDsnTelemetry?.();
  if(dsn && $('#dsn-station-val')){
    $('#dsn-station-val').textContent = dsn.activeStation;
    $('#dsn-owlt-val').textContent = dsn.owltDisplay;
    $('#dsn-rtlt-val').textContent = dsn.rtltDisplay;
    $('#dsn-margin-val').textContent = `${dsn.bandwidth} · ${dsn.linkMargin}`;
    const lockEl = $('#dsn-lock-status');
    if(lockEl){
      lockEl.textContent = dsn.carrierLocked ? 'CARRIER LOCK' : 'AOS SEARCH';
      lockEl.style.color = dsn.carrierLocked ? 'var(--mint)' : 'var(--amber)';
    }
    const modeText = $('#dsn-mode-text');
    if(modeText){
      modeText.textContent = dsn.isAutonomous ? 'AUTONOMOUS FDIR (EARTH LAG > 10S)' : 'GROUND TELE-COMMAND LINKED';
      $('#dsn-mode-pill')?.classList.toggle('autonomous', dsn.isAutonomous);
    }
  }
  $('#speed-value').textContent=sim.speed.toFixed(1);$('#heat-value').textContent=Math.round(sim.heat)+'%';$('#heat-value').style.color=sim.heat>80?'var(--red)':'';
  $('#range-value').innerHTML=Math.round(sim.range)+' <small>m</small>';$('#science-value').textContent=String(Math.round(sim.score)).padStart(3,'0');$('#elapsed').textContent=formatTime(sim.time);
  $('#assist-button').innerHTML=`GUIDANCE <b>${sim.assist?'ON':'OFF'}</b> <kbd>G</kbd>`;$('#assist-button').classList.toggle('active',sim.assist);
  const orbitBtn = $('#orbit-button');
  if(orbitBtn){
    orbitBtn.hidden = sim.destination.id !== 'asteroid' || sim.mode !== 'flight';
    if(!orbitBtn.hidden){
      const regime = sim.currentOrbitRegime;
      orbitBtn.innerHTML = `ORBIT: <b>${regime}</b> <kbd>T</kbd>`;
      orbitBtn.classList.toggle('active', regime === 'LAMO');
    }
  }
  const retreatBtn = $('#retreat-button');
  if(retreatBtn){
    retreatBtn.hidden = !(sim.destination.id === 'jupiter' && sim.stage === 4 && sim.mode === 'flight');
    if(!retreatBtn.hidden){
      retreatBtn.disabled = !sim.canRetreat;
      retreatBtn.innerHTML = `RETREAT (${sim.measurementsCollected}/3) <kbd>X</kbd>`;
      retreatBtn.classList.toggle('active', sim.canRetreat);
    }
  }
  const camBtn = $('#cam-button');
  if(camBtn){
    camBtn.hidden = sim.destination.id !== 'earth' || sim.mode !== 'flight';
    if(!camBtn.hidden){
      camBtn.disabled = !sim.canExecuteCamBurn;
      const isCritical = sim.conjunctionRisk === 'critical';
      camBtn.innerHTML = `CAM BURN <b>${isCritical ? 'ALERT' : 'READY'}</b> <kbd>B</kbd>`;
      camBtn.classList.toggle('warning', isCritical);
      camBtn.classList.toggle('active', sim.conjunctionRisk !== 'nominal');
    }
  }
  const conjKey = $('#radar-conjunction-key');
  if(conjKey){
    conjKey.style.display = (sim.destination.id === 'earth' && sim.closestApproach) ? 'inline-flex' : 'none';
  }
  const radarModeTag = $('#radar-mode-tag');
  if(radarModeTag && sim.destination.id === 'earth'){
    radarModeTag.textContent = sim.groundStationPass ? 'TDRSS AOS · ±5M' : 'LOS SHADOW · ±35M';
    radarModeTag.style.color = sim.groundStationPass ? 'var(--mint)' : 'var(--amber)';
  }
  $$('[data-route]').forEach(b=>b.classList.toggle('active',b.dataset.route===sim.route));$('#route-description').textContent={balanced:'Balanced allocation. Select a priority.',engine:'More thrust. Responsive maneuvering.',science:'Scanner speed increased by 55%.',shield:'Impact damage reduced by 55%.'}[sim.route];
  const guide=$('#approach-guide');guide.hidden=![3,5].includes(sim.stage)||sim.range>220||sim.mode!=='flight';
  if(!guide.hidden&&sim.target){const dx=sim.target.x-sim.position.x,dy=sim.target.y-sim.position.y;$('#approach-name').textContent=sim.stage===5?'DOCKING RING':'LANDING ZONE';$('#approach-state').textContent=sim.canInteract?'READY TO DOCK / LAND':sim.speed>10?'SLOW DOWN WITH S':'STEER INTO CENTER';guide.classList.toggle('ready',sim.canInteract);$('#approach-dot').setAttribute('cx',80+clamp(dx,-65,65));$('#approach-dot').setAttribute('cy',50-clamp(dy,-40,40));$('#approach-values').textContent=`LATERAL ${Math.hypot(dx,dy).toFixed(1)} m · SPEED ${sim.speed.toFixed(1)} m/s`;}
  const prompt=$('#interact-prompt');prompt.hidden=!sim.target||sim.range>140;
  prompt.querySelector('kbd').textContent=sim.stage<2?'→':'E';
  const {range:captureRange,speed:captureSpeed}=interactionLimits(sim);
  $('#interact-label').textContent=sim.stage<2?'FLY THROUGH THE RING':sim.canInteract?(sim.interactionQueued||keys.interact?`${Math.round(sim.scan*100)}% · SCANNING · HOLD STEADY`:sim.stage===5?'PRESS E TO DOCK':sim.stage===3?'PRESS E TO '+(sim.destination.surface?'LAND':'CAPTURE'):sim.isSurface?'PRESS E TO COLLECT':'PRESS E TO SCAN'):sim.range>=captureRange?`GET CLOSER (${captureRange} M) · PRESS E`:`SLOW DOWN (UNDER ${captureSpeed} M/S) · PRESS E`;
  if($('#mission-guidance')){const next=missionGuidance(sim),practice=coach?.prompt(sim);$('#mission-guidance').dataset.state=next.state;$('#guidance-title').textContent=next.title;$('#guidance-detail').textContent=next.detail;$('#pilot-practice').hidden=!practice;if(practice){$('#practice-title').textContent=practice.title;$('#practice-detail').textContent=practice.detail;}$('#mission-guidance').hidden=sim.mode!=='flight';}
  $('#scan-progress').style.width=clamp(sim.scan,0,1)*100+'%';
  if(sim.target){$('#marker-label').textContent=sim.target.name;$('#marker-range').textContent=Math.round(sim.range)+' M';$('#target-marker').classList.toggle('ready',!!sim.canInteract);$('#target-marker').classList.toggle('stage-departure',sim.stage===0);}
  drawRoverMap();
  if(sim.isSurface&&sim.stormActive){
    audio.updateWind(sim.stormIntensity);
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:var(--amber)">[ALERT] DUST STORM: Solar battery charging reduced by up to 85%</span>';
  } else if(sim.isSurface&&sim.destination.id==='mars'&&sim.position.x>25){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:var(--amber)">[ALERT] SÉÍTAH DUNES: Soft sand slippage · Motor power drain elevated</span>';
  } else if(sim.destination.id==='asteroid'&&sim.boulderProximity){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:var(--red)">[WARNING] LAMO HAZARD: Boulder ejecta proximity! Adjust velocity &amp; altitude</span>';
  } else if(sim.destination.id==='asteroid'&&sim.currentOrbitRegime==='LAMO'){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:#00e5ff">[REGIME] LAMO CLOSE ORBIT: Gravity shear active · Image detail +80% · Press <kbd>T</kbd> for HAMO</span>';
  } else if(sim.destination.id==='asteroid'){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span>ORBIT: HAMO (700 KM) · Safe survey orbit · Press <kbd>T</kbd> or dive <kbd>↓</kbd> for LAMO pass</span>';
  } else if(sim.stage===3&&sim.reentryIntensity>0.3){
    audio.updateWind(sim.reentryIntensity);
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:var(--red)">[WARNING] SLOW DOWN: Hold brake <kbd>S</kbd> to cool down</span>';
    if(!reentryCommsSent){
      reentryCommsSent=true;
      communicate('Flight Director','Going too fast! Hold S to slow down.');
      notify('HIGH SPEED · Hold brake S to slow down','warning');
    }
  } else if(sim.solarStormActive){
    hazardTipActive=true;
    if(sim.route==='shield'){
      $('#flight-tip').innerHTML='<span style="color:var(--mint)">[SHIELDS] MAGNETIC DEFLECTION ACTIVE · DEFLECTING CORONAL PLASMA STREAM · +SCIENCE TELEMETRY</span>';
    }else{
      $('#flight-tip').innerHTML='<span style="color:var(--red)">[ALERT] CORONAL MASS EJECTION ACTIVE: Divert power to SHIELDS <kbd>3</kbd> immediately!</span>';
    }
  } else if(sim.solarStormWarning>0){
    hazardTipActive=true;
    $('#flight-tip').innerHTML=`<span style="color:var(--amber)">[ALERT] CORONAL MASS EJECTION INCOMING: Impact in ${Math.ceil(sim.solarStormWarning)}s · Press <kbd>3</kbd> for SHIELDS</span>`;
  } else if(sim.destination.id==='jupiter'&&sim.stage===4){
    hazardTipActive=true;
    if(sim.radiationSurge){
      $('#flight-tip').innerHTML='<span style="color:var(--red)">[ALERT] RADIATION SURGE: Divert to SHIELDS <kbd>3</kbd>! · Instrument degradation</span>';
    } else if(sim.canRetreat){
      $('#flight-tip').innerHTML=`<span style="color:var(--mint)">OBSERVATION WINDOW: Scan <kbd>E</kbd> · Risk vs Reward · Press <kbd>X</kbd> to RETREAT (${sim.measurementsCollected}/3 scans · Dose ${Math.round(sim.radiationDose)}%)</span>`;
    } else {
      $('#flight-tip').innerHTML=`<span style="color:#00e5ff">OBSERVATION WINDOW: Scan <kbd>E</kbd> · Dose: ${Math.round(sim.radiationDose)}% · Divert to SHIELDS <kbd>3</kbd> in surge</span>`;
    }
  } else if(sim.destination.id==='jupiter'&&sim.radiationFlux>0.35){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:#00e5ff">[ALERT] RADIATION STORM: Press <kbd>3</kbd> for shields!</span>';
  } else if(sim.destination.id==='moon'&&sim.stage===3){
    hazardTipActive=true;
    const vSpeed = Math.abs(sim.velocity.y).toFixed(1);
    const hSpeed = Math.abs(sim.velocity.x).toFixed(1);
    const speedColor = Number(vSpeed) <= 3.5 ? 'var(--mint)' : Number(vSpeed) <= 6.0 ? 'var(--amber)' : 'var(--red)';
    $('#flight-tip').innerHTML=`<span style="color:${speedColor}">DESCENT: ${vSpeed} M/S (TARGET &lt; 3.5 M/S) · DRIFT: ${hSpeed} M/S · W/S THRUST</span>`;
  } else if(sim.destination.id==='moon'&&sim.isSurface&&sim.equipmentDamaged){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:var(--red)">[ALERT] EQUIPMENT DAMAGED: Scanner degraded · Battery drain +40%</span>';
  } else if(sim.destination.id==='moon'&&sim.inShadow){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:#75cdff">[SHADOW] SHACKLETON PSR: Extreme darkness · Headlights ON · Press <kbd>Q</kbd> for LIDAR</span>';
  } else if(sim.destination.id==='earth'&&sim.conjunctionRisk==='critical'){
    hazardTipActive=true;
    const ca = sim.closestApproach;
    const miss = ca ? ca.missDistance.toFixed(1) : '15';
    const tca = ca ? ca.tca.toFixed(1) : '4';
    $('#flight-tip').innerHTML=`<span style="color:var(--red)">[ALERT] CRITICAL CONJUNCTION: TCA ${tca}s · Miss ${miss}m! Press <kbd>B</kbd> for CAM burn!</span>`;
  } else if(sim.destination.id==='earth'&&sim.conjunctionRisk==='elevated'){
    hazardTipActive=true;
    const ca = sim.closestApproach;
    const miss = ca ? ca.missDistance.toFixed(1) : '35';
    $('#flight-tip').innerHTML=`<span style="color:var(--amber)">[ALERT] CONJUNCTION MONITOR: Close approach predicted (${miss}m) · Schedule CAM burn <kbd>B</kbd></span>`;
  } else if(sim.destination.id==='earth'&&!sim.groundStationPass){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:#75cdff">GROUND STATION LOS: Tracking uncertainty ±35m · Propellant: ' + Math.round(sim.fuel) + '%</span>';
  } else if(sim.destination.id==='earth'&&sim.stage===1){
    hazardTipActive=true;
    $('#flight-tip').innerHTML='<span style="color:var(--amber)">[ALERT] SPACE DEBRIS: Steer around floating fragments · Press <kbd>B</kbd> for CAM burn</span>';
  } else {
    audio.updateWind(0);
    if(sim.reentryIntensity<=0.1)reentryCommsSent=false;
    if(hazardTipActive){
      hazardTipActive=false;
      $('#flight-tip').innerHTML=sim.isSurface&&sim.campaign?(sim.destination.id==='mars'?`DRIVE <kbd>W</kbd><kbd>S</kbd> · ORBITAL MAP: PLAN SAFE ROUTES · TUBES: ${sim.sampleTubesUsed}/${sim.maxSampleTubes} · DEPART <kbd>X</kbd>`:'DRIVE <kbd>W</kbd><kbd>S</kbd> · STEER <kbd>A</kbd><kbd>D</kbd> · COLLECT <kbd>E</kbd> · DEPART <kbd>X</kbd>'):sim.destination.id==='asteroid'?`ORBIT: <kbd>T</kbd> HAMO/LAMO · THRUST <kbd>W</kbd><kbd>S</kbd> · STEER <kbd>A</kbd><kbd>D</kbd> · ALTITUDE <kbd>↑</kbd><kbd>↓</kbd>`:sim.destination.id==='jupiter'&&sim.stage===4?`QUIET WINDOWS: SCAN <kbd>E</kbd> · SURGE: SHIELDS <kbd>3</kbd> · RETREAT <kbd>X</kbd>`:sim.destination.id==='earth'?`LEO TRAFFIC: TRACK RADAR · CAM BURN <kbd>B</kbd> · RETRIEVE <kbd>E</kbd> · PROPELLANT: ${Math.round(sim.fuel)}%`:sim.isSurface?'DRIVE <kbd>W</kbd><kbd>S</kbd> · STEER <kbd>A</kbd><kbd>D</kbd> · COLLECT <kbd>E</kbd>':'FLY FORWARD <kbd>W</kbd> · SLOW DOWN <kbd>S</kbd> · STEER <kbd>A</kbd><kbd>D</kbd>';
    }
  }
}
function drawRadar(time){
  const c=radar,w=240,h=170,cx=120,cy=85;c.clearRect(0,0,w,h);c.strokeStyle='#709ea339';c.lineWidth=.7;
  for(const r of [23,46,69]){c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();}c.beginPath();c.moveTo(cx-78,cy);c.lineTo(cx+78,cy);c.moveTo(cx,cy-78);c.lineTo(cx,cy+78);c.stroke();
  c.save();c.translate(cx,cy);c.rotate(time*.65);const grad=c.createLinearGradient(0,0,70,0);grad.addColorStop(0,'#91dacc30');grad.addColorStop(1,'#91dacc02');c.fillStyle=grad;c.beginPath();c.moveTo(0,0);c.arc(0,0,69,-.35,0);c.closePath();c.fill();c.strokeStyle='#a3e0dc70';c.beginPath();c.moveTo(0,0);c.lineTo(69,0);c.stroke();c.restore();
  if(sim){
    const draw=(p,color,size)=>{let x=(p.x-sim.position.x)*.22,y=(p.z-sim.position.z)*.13;const len=Math.hypot(x,y);if(len>67){x=x/len*67;y=y/len*67;}c.fillStyle=color;c.shadowColor=color;c.shadowBlur=7;c.beginPath();c.arc(cx+x,cy+y,size,0,Math.PI*2);c.fill();c.shadowBlur=0;};
    sim.hazards.filter(h=>Math.abs(h.z-sim.position.z)<260).forEach(h=>{
      const isConjunction = sim.destination.id === 'earth' && sim.closestApproach && Math.hypot(h.x-sim.closestApproach.x, h.z-sim.closestApproach.z) < 8;
      const color = isConjunction ? (sim.conjunctionRisk==='critical'?'#ff4d4d':'#ffaa00') : '#e7ad74';
      draw(h, color, isConjunction ? 4 : 2);
      if(isConjunction && sim.trackingUncertainty > 10){
        let x=(h.x-sim.position.x)*.22, y=(h.z-sim.position.z)*.13;
        c.strokeStyle = '#ffaa0066';
        c.lineWidth = 1;
        c.beginPath();
        c.arc(cx+x, cy+y, 9, 0, Math.PI*2);
        c.stroke();
      }
    });
    if(sim.bonusAnomaly&&!sim.bonusAnomaly.scanned)draw(sim.bonusAnomaly,'#00e5ff',4);
    if(sim.target)draw(sim.target,'#baffdf',3);
  }
  c.fillStyle='#d6f4ef';c.beginPath();c.moveTo(cx,cy-5);c.lineTo(cx-3,cy+4);c.lineTo(cx+3,cy+4);c.closePath();c.fill();
}
function action(action){
  if(!sim||sim.mode!=='flight')return;
  if(action==='assist')sim.toggleAssist();if(action==='repair'&&!sim.repair())notify(sim.repairs?'HULL NOMINAL · No repair needed.':'NO REPAIR KITS REMAIN','warning');
  if(action==='pulse'&&!sim.scannerPulse())notify('SENSOR PULSE RECHARGING');
  if(action==='orbit'&&sim.destination.id==='asteroid')sim.toggleOrbitMode();
  if(action==='cam'&&sim.destination.id==='earth')sim.executeCamBurn();
  if(action==='camera'){world.cameraMode=(world.cameraMode+1)%3;$('#camera-button').innerHTML=['CHASE CAM','COCKPIT','ORBIT CAM'][world.cameraMode]+' <kbd>C</kbd>';audio.cue('click');}
}
export async function autoRequestFullscreen(){
  try{
    const doc=document;
    const docEl=doc.documentElement;
    const isFs=doc.fullscreenElement||doc.webkitFullscreenElement||doc.mozFullScreenElement||doc.msFullscreenElement;
    if(!isFs){
      const rfs=docEl.requestFullscreen||docEl.webkitRequestFullscreen||docEl.mozRequestFullScreen||docEl.msRequestFullscreen;
      if(rfs)await rfs.call(docEl);
    }
    // Automatically lock orientation to landscape on mobile & tablet devices
    if(screen.orientation && typeof screen.orientation.lock === 'function'){
      screen.orientation.lock('landscape').catch(() => {});
    }
  }catch(_){}
}
window.autoRequestFullscreen=autoRequestFullscreen;
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await autoRequestFullscreen();}catch{}}

document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;audio.start();autoRequestFullscreen();
  if(b.matches('[data-destination]')){selectDestination(Number(b.dataset.destination));audio.cue('click');}
  if(b.matches('[data-rover-target]'))sim?.selectSurfaceTarget(Number(b.dataset.roverTarget));
  if(b.id==='rover-depart')sim?.departSurface();
  if(b.id==='retreat-button'&&sim?.destination.id==='jupiter'&&sim.stage===4)sim.retreat();
  if(b.id==='cam-button'&&sim?.destination.id==='earth')sim.executeCamBurn();
  if(b.id==='ack-clue'){closeDialog();sim?.acknowledgeClue();}
  if(b.id==='skip-practice'){coach=new FlightCoach(true);save('odyssey-coach-complete',true);updateHud();}
  if(b.id==='replay-practice'){coach=new FlightCoach(false);save('odyssey-coach-complete',false);closeDialog();updateHud();$('#mission-guidance').open=true;}

  if(b.matches('[data-close]')){closeDialog();if(sim?.mode==='paused')sim.resume();}
  if(b.matches('[data-effect]')){
    const effect=b.dataset.effect;
    closeDialog();
    audio.stopVoice();
    if (crew.isCrewMode()) {
      crew.broadcast('ANOMALY_CHOICE', { effect });
    }
    sim?.choose(effect);
  }
  if(b.matches('[data-route]')&&sim?.mode==='flight')sim.setRoute(b.dataset.route);
  if(b.matches('[data-menu]'))returnMenu();
  if(b.id==='launch-button'){
    if(assembly&&!assembly.ready&&assembly.autoEquipAll)assembly.autoEquipAll();
    const arch = assembly?.getArchitecture ? assembly.getArchitecture() : { missionClass: selectedMissionClass, launchVehicle: selectedLaunchVehicle };
    selectedMissionClass = arch.missionClass;
    selectedLaunchVehicle = arch.launchVehicle;
    if (crew.isCrewMode()) {
      if (crew.myRole !== 'flight' && !crew.overrideAuthority) {
        alert('Station Authority Lock: Only Flight Director can commit the mission architecture and initiate the launch roll-call poll.');
        return;
      }
      crew.broadcast('OPEN_GONOGO_POLL', { arch });
      showGoNoGoPollModal((a) => flightPlanDialog(a || arch), arch);
    } else {
      flightPlanDialog(arch);
    }
  }
  if(b.id==='begin-stage'){closeDialog();audio.fadeInBgm(1.8);sim.begin();}
  if(b.id==='resume-flight'){closeDialog();audio.fadeInBgm(1.8);sim.resume();}
  if(b.id==='retry-button'){const checkpoint=sim.checkpoint;initializeFlight(checkpoint);}
  if(b.id==='pause-controls'){closeDialog();controlsDialog();}
});
if($('#design-button')) $('#design-button').onclick=()=>{ autoRequestFullscreen(); designDialog(); };
if($('#btnForceLandscape')) $('#btnForceLandscape').onclick=()=>{ autoRequestFullscreen(); };
window.addEventListener('orientationchange', ()=>{ if(window.innerWidth<=1024) autoRequestFullscreen(); });
if(window.screen?.orientation){
  window.screen.orientation.addEventListener('change', ()=>{
    if(!window.screen.orientation.type.includes('portrait')) {
      const p = $('#orientation-prompt');
      if(p) p.style.display = 'none';
    }
  });
}
if($('#resume-button')) $('#resume-button').onclick=()=>{try{initializeFlight(savedCheckpoint);}catch{notify('The saved checkpoint could not be loaded. Start a new expedition.','warning');savedCheckpoint=null;if($('#resume-button')) $('#resume-button').hidden=true;}};
if($('#home-button')) $('#home-button').onclick=()=>{if(view==='flight'){if(!dialogKind)pauseMenu();}else if(dialogKind)closeDialog();};
if($('#mission-nav')) $('#mission-nav').onclick=()=>{if(view==='flight'){if(!dialogKind)pauseMenu();}else if(dialogKind)closeDialog();};
if($('#sound-button')) $('#sound-button').onclick=soundToggle;
if($('#bgm-track-button')) $('#bgm-track-button').onclick=bgmToggle;
if($('#pause-button')) $('#pause-button').onclick=pauseMenu;
if($('#controls-button')) $('#controls-button').onclick=controlsDialog;
if($('#journal-button')) $('#journal-button').onclick=journalDialog;
if($('#credits-button')) $('#credits-button').onclick=creditsDialog;
if($('#settings-button')) $('#settings-button').onclick=settingsDialog;
if($('#auroraReturnBtn')) $('#auroraReturnBtn').onclick=(e)=>{
  e.preventDefault();
  if(window.parent && window.parent !== window){
    window.parent.postMessage({ type: 'RETURN_TO_DESTINATION_SELECTOR' }, '*');
    window.parent.postMessage({ type: 'RETURN_TO_CAROUSEL' }, '*');
  } else {
    // If standalone (npm run dev on :4173 directly), cycle through destinations
    selectDestination(selected + 1);
    audio.cue('click');
  }
};
if($('#assist-button')) $('#assist-button').onclick=()=>action('assist');if($('#orbit-button')) $('#orbit-button').onclick=()=>action('orbit');if($('#retreat-button')) $('#retreat-button').onclick=()=>{if(sim?.destination.id==='jupiter'&&sim.stage===4)sim.retreat();};if($('#cam-button')) $('#cam-button').onclick=()=>action('cam');if($('#camera-button')) $('#camera-button').onclick=()=>action('camera');if($('#repair-button')) $('#repair-button').onclick=()=>action('repair');if($('#pulse-button')) $('#pulse-button').onclick=()=>action('pulse');
if($('#nasa-provenance-toggle')) $('#nasa-provenance-toggle').onclick=toggleNasaDataDrawer;
if($('#nasa-drawer-close')) $('#nasa-drawer-close').onclick=closeNasaDataDrawer;
if($('#nasa-drawer-backdrop')) $('#nasa-drawer-backdrop').onclick=closeNasaDataDrawer;
if($('#nasa-card-close')) $('#nasa-card-close').onclick=()=>{const card=$('#nasa-scan-provenance-card');if(card){card.classList.remove('visible');clearTimeout(scanCardTimeout);setTimeout(()=>{card.hidden=true;},250);}};
if($('#nasa-card-toggle')) $('#nasa-card-toggle').onclick=()=>{const card=$('#nasa-scan-provenance-card'),btn=$('#nasa-card-toggle');if(!card)return;const isCompact=card.classList.toggle('compact');if(btn)btn.textContent=isCompact?'DETAILS ▾':'LESS ▴';clearTimeout(scanCardTimeout);if(!isCompact){scanCardTimeout=setTimeout(()=>{card.classList.remove('visible');setTimeout(()=>{card.hidden=true;},300);},8000);}};
if($('#nasa-card-mute')) $('#nasa-card-mute').onclick=()=>{try{localStorage.setItem('aurora-mute-pds-card','true');}catch(_){}const card=$('#nasa-scan-provenance-card');if(card){card.classList.remove('visible');clearTimeout(scanCardTimeout);setTimeout(()=>{card.hidden=true;},250);}notify('NASA PDS flight popups muted · Open anytime from topbar','info');};
if($('#nasa-card-open-drawer')) $('#nasa-card-open-drawer').onclick=openNasaDataDrawer;

function updateCrewModeUI() {
  const btn = $('#crew-mode-btn');
  const label = $('#crew-mode-label');
  if (btn && label) {
    const isCrew = crew.isCrewMode();
    btn.classList.toggle('active', isCrew);
    if (isCrew) {
      label.textContent = `TEAM: ${crew.roomCode || 'LOBBY'} (${crew.getMyRoleMeta().callsign})`;
      btn.title = `4-Player Multi-Crew Active (${crew.roomCode}) · Click to open Team Hub`;
    } else {
      label.textContent = 'SOLO';
      btn.title = 'Solo Explorer Mode · Click to open Team Hub';
    }
  }
  const globalBar = $('#global-crew-bar');
  if (globalBar) {
    if (crew.isCrewMode()) {
      globalBar.style.display = 'block';
      renderCrewConsoleStrip(globalBar);
    } else {
      globalBar.style.display = 'none';
      globalBar.innerHTML = '';
    }
  }
  const flightHud = $('#crew-flight-hud');
  if (flightHud && view === 'flight') {
    renderSpectatorHud(flightHud);
  }
}

if ($('#crew-mode-btn')) {
  $('#crew-mode-btn').onclick = () => {
    showModeSelectScreen($('#mode-select-screen'), {
      onSolo: () => updateCrewModeUI(),
      onTeamLaunch: () => {
        updateCrewModeUI();
        designDialog();
      }
    });
  };
}

crew.subscribe((event, data) => {
  if (event === 'modeChanged' || event === 'rosterChanged' || event === 'roomSynced' || event === 'roomCreated' || event === 'roomJoined') {
    updateCrewModeUI();
  } else if (event === 'destinationSelected' && data) {
    if (data.index !== undefined && data.index !== selected) {
      selectDestination(data.index, false);
    }
  } else if (event === 'openDesignBay') {
    if (dialogKind !== 'design') {
      designDialog(false);
    }
  } else if (event === 'openGoNoGoPoll' && data) {
    showGoNoGoPollModal((a) => {
      flightPlanDialog(a || data?.arch || {});
    }, data?.arch || {});
  } else if (event === 'startRocketLaunch' && data) {
    closeDialog();
    selected = data.destinationIndex;
    if (Array.isArray(data.loadout)) loadout = [...data.loadout];
    if (data.missionClass) selectedMissionClass = data.missionClass;
    if (data.launchVehicle) selectedLaunchVehicle = data.launchVehicle;
    const dest = DESTINATIONS[selected];
    committedPlan = makeCampaign(data.plan, dest.id, data.missionClass, data.launchVehicle);
    activeLaunchSim = startRocketLaunch({
      destination: dest,
      loadout,
      campaign: committedPlan,
      missionClass: data.missionClass,
      launchVehicle: data.launchVehicle,
      audio,
      onComplete: () => {
        activeLaunchSim = null;
        initializeFlight();
      },
      onCancel: () => {
        activeLaunchSim = null;
        returnMenu();
      }
    });
  } else if (event === 'stageAdvance' && sim) {
    const el = $('#cinematic');
    if (el) el.hidden = true;
    if (sim?.mode === 'transition') {
      sim.advance();
    }
  } else if (event === 'anomalyChoice' && data) {
    closeDialog();
    audio.stopVoice();
    sim?.choose(data.effect);
  } else if (event === 'segmentChanged' || event === 'authorityChanged') {
    updateCrewModeUI();
    const flightHud = $('#crew-flight-hud');
    if (flightHud && view === 'flight') renderSpectatorHud(flightHud);
    const meta = crew.getActiveSegmentRoleMeta();
    const officer = crew.getMember(crew.activeSegmentRole);
    notify(`FLIGHT STAGE HANDOFF: ${meta.callsign} (${officer.name}) HAS THE CONTROLS`, 'info');
  } else if (event === 'flightTelemetry' && data && sim && !crew.isMyTurn()) {
    if (data.pos) sim.ship.position.set(data.pos[0], data.pos[1], data.pos[2]);
    if (data.vel) sim.ship.velocity.set(data.vel[0], data.vel[1], data.vel[2]);
    if (data.rot) sim.ship.rotation.set(data.rot[0], data.rot[1], data.rot[2]);
    if (data.hull !== undefined) sim.hull = data.hull;
    if (data.propellant !== undefined) sim.propellant = data.propellant;
    if (data.power !== undefined) sim.power = data.power;
    if (data.score !== undefined) sim.score = data.score;
  }
});

const keymap={KeyW:'forward',KeyS:'brake',KeyA:'left',KeyD:'right',ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',Space:'boost',KeyE:'interact'};
document.addEventListener('keydown',e=>{
  if($('#cinematic') && !$('#cinematic').hidden && ['Space','Enter','KeyE'].includes(e.code) && !e.repeat){
    e.preventDefault();
    $('#cinematic').click();
    return;
  }
  if(e.code==='KeyP'&&!e.repeat&&!e.target?.matches?.('input,select,textarea')){
    e.preventDefault();
    toggleNasaDataDrawer();
    return;
  }
  if(e.code==='KeyB'&&!e.repeat&&!e.target?.matches?.('input,select,textarea')){
    if(sim?.mode==='flight'&&sim.destination.id==='earth'){
      e.preventDefault();
      sim.executeCamBurn();
      return;
    }
    e.preventDefault();
    bgmToggle();
    return;
  }
  if(e.code==='KeyM'&&!e.repeat&&!e.target?.matches?.('input,select,textarea')){e.preventDefault();soundToggle();return;}
  if(e.code==='KeyO'&&!e.repeat&&!e.target?.matches?.('input,select,textarea')){e.preventDefault();settingsDialog();return;}
  if(dialogKind==='design'&&/^Digit[1-9]$/.test(e.code)&&!e.target?.matches?.('input,select,textarea')){e.preventDefault();const slot=Number(e.code.slice(-1))-1;assembly?.selectSlot(slot);$(`[data-slot="${slot}"]`)?.focus();return;}
  if(e.code==='Tab'&&dialogKind){const buttons=[...$('#dialog').querySelectorAll('button:not(:disabled),select,a[href],summary,input')].filter(el=>el.getClientRects().length>0);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}return;}
  if(e.code==='Escape'){
    const drawer=$('#nasa-data-drawer');
    if(drawer&&!drawer.hidden&&drawer.classList.contains('open')){e.preventDefault();closeNasaDataDrawer();return;}
    e.preventDefault();if(dialogKind==='pause'){closeDialog();sim?.resume();}else if(['controls','journal','credits','design','planning','settings','certificate'].includes(dialogKind)){closeDialog();if(sim?.mode==='paused')sim.resume();}else if(!dialogKind&&view==='flight')pauseMenu();return;
  }
  if(dialogKind){if(dialogKind==='event'&&['Digit1','Digit2','Digit3'].includes(e.code)&&!e.repeat){e.preventDefault();$$('[data-effect]')[Number(e.code.slice(-1))-1]?.click();}return;}
  if(e.target?.matches?.('input,select,textarea'))return;
  if(!e.repeat){
    if(e.code==='KeyM'){e.preventDefault();soundToggle();return;}
    if(e.code==='KeyF'){e.preventDefault();fullscreen();return;}
    if(e.code==='KeyH'){e.preventDefault();controlsDialog();return;}
    if(e.code==='KeyL'){e.preventDefault();journalDialog();return;}
  }
  if(view==='menu'){
    if(['ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();selectDestination(selected+(e.code==='ArrowRight'?1:-1));audio.cue('click');}
    if(e.code==='Enter'&&(e.target===document.body||e.target?.matches?.('.destination-card,#design-button'))){e.preventDefault();designDialog();}return;
  }
  if(sim?.mode==='flight'){
    if(e.code==='KeyE'&&!e.repeat)sim.requestInteraction();
    if(!e.repeat){
      if(e.code==='KeyA'||e.code==='ArrowLeft')audio.rcsBurst(-0.8);
      if(e.code==='KeyD'||e.code==='ArrowRight')audio.rcsBurst(0.8);
    }
    if(keymap[e.code]){e.preventDefault();let mapped=keymap[e.code];if(sim.isSurface&&e.code==='ArrowUp')mapped='forward';if(sim.isSurface&&e.code==='ArrowDown')mapped='brake';keys[mapped]=true;}
    if(!e.repeat){const map={KeyG:'assist',KeyC:'camera',KeyR:'repair',KeyQ:'pulse',KeyT:'orbit'};if(map[e.code]){e.preventDefault();action(map[e.code]);}if(sim.isSurface&&sim.campaign&&e.code==='KeyZ'){e.preventDefault();for(let offset=1;offset<=sim.targets.length;offset++){const index=(Math.max(0,sim.targetIndex)+offset)%sim.targets.length;if(sim.selectSurfaceTarget(index))break;}}if(sim.isSurface&&sim.campaign&&e.code==='KeyX'){e.preventDefault();sim.departSurface();}if(sim.destination.id==='jupiter'&&sim.stage===4&&e.code==='KeyX'){e.preventDefault();sim.retreat();}if(sim.destination.id==='earth'&&e.code==='KeyB'){e.preventDefault();sim.executeCamBurn();}if(['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();sim.setRoute(['engine','science','shield'][Number(e.code.slice(-1))-1]);}}
  }
});
document.addEventListener('keyup',e=>{if(keymap[e.code]){keys[keymap[e.code]]=false;if(e.code==='ArrowUp')keys.forward=false;if(e.code==='ArrowDown')keys.brake=false;}});
addEventListener('blur',()=>{keys={};if(sim?.mode==='flight'&&!dialogKind)pauseMenu();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys={};audio.stopVoice();if(sim?.mode==='flight'&&!dialogKind)pauseMenu();}});
$$('[data-key]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();audio.start();b.setPointerCapture(e.pointerId);let key=b.dataset.key;if(sim?.isSurface&&key==='up')key='forward';if(sim?.isSurface&&key==='down')key='brake';if(key==='interact')sim?.requestInteraction();b.activeKey=key;keys[key]=true;};b.onpointerup=b.onpointercancel=()=>{keys[b.activeKey||b.dataset.key]=false;};});

function pollGamepad(keys){
  if(typeof navigator==='undefined'||!navigator.getGamepads)return;
  const gamepads=navigator.getGamepads();
  if(!gamepads)return;
  const gp=gamepads[0]||gamepads[1]||gamepads[2]||gamepads[3];
  if(!gp||!gp.connected)return;

  const axisX=gp.axes[0]??0, axisY=gp.axes[1]??0;
  const dpadLeft=gp.buttons[14]?.pressed, dpadRight=gp.buttons[15]?.pressed;
  const dpadUp=gp.buttons[12]?.pressed, dpadDown=gp.buttons[13]?.pressed;

  if(axisX<-0.28||dpadLeft){keys.left=true;keys.right=false;}
  else if(axisX>0.28||dpadRight){keys.right=true;keys.left=false;}

  const rTrigger=gp.buttons[7]?.pressed||gp.buttons[7]?.value>0.25;
  const lTrigger=gp.buttons[6]?.pressed||gp.buttons[6]?.value>0.25;
  const btnA=gp.buttons[0]?.pressed;
  const btnB=gp.buttons[1]?.pressed;
  const btnX=gp.buttons[2]?.pressed;
  const btnRB=gp.buttons[5]?.pressed;
  const btnStart=gp.buttons[9]?.pressed;

  if(rTrigger||btnA||axisY<-0.3||dpadUp)keys.forward=true;
  if(lTrigger||btnB||axisY>0.3||dpadDown)keys.brake=true;
  if(btnRB)keys.boost=true;

  if(btnX&&!lastGamepadInteract){sim?.requestInteraction();}
  lastGamepadInteract=!!btnX;

  if(btnStart&&!dialogKind&&view==='flight')pauseMenu();

  if(gp.vibrationActuator&&sim&&sim.mode==='flight'){
    const isColliding=sim.collisions>0;
    const isReentry=sim.reentryIntensity>0.4;
    const isBoosting=keys.boost;
    if(isColliding||isReentry){
      gp.vibrationActuator.playEffect('dual-rumble',{startDelay:0,duration:120,weakMagnitude:0.8,strongMagnitude:0.9}).catch(()=>{});
    }else if(isBoosting){
      gp.vibrationActuator.playEffect('dual-rumble',{startDelay:0,duration:80,weakMagnitude:0.3,strongMagnitude:0.1}).catch(()=>{});
    }
  }
}

function tick(now){
  const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;accumulator+=dt;
  if(view==='flight')pollGamepad(keys);
  if(crew.isCrewMode() && !crew.isMyTurn()){
    keys.forward=false;keys.brake=false;keys.left=false;keys.right=false;keys.boost=false;keys.interact=false;keys.up=false;keys.down=false;
  }
  while(accumulator>=1/60){sim?.step(1/60,keys);if(sim&&coach){const wasComplete=coach.basicComplete&&coach.scanComplete;coach.update(sim,keys,1/60);if(!wasComplete&&coach.basicComplete&&coach.scanComplete){save('odyssey-coach-complete',true);audio.cue('success');notify('PILOT PRACTICE COMPLETE · You control the mission.');}}accumulator-=1/60;}
  if(crew.isCrewMode() && crew.isMyTurn() && sim && sim.mode === 'flight'){
    if(now - lastTelemetrySend > 70){
      lastTelemetrySend = now;
      crew.broadcast('FLIGHT_TELEMETRY', {
        pos: [sim.ship.position.x, sim.ship.position.y, sim.ship.position.z],
        vel: [sim.ship.velocity.x, sim.ship.velocity.y, sim.ship.velocity.z],
        rot: [sim.ship.rotation.x, sim.ship.rotation.y, sim.ship.rotation.z],
        hull: sim.hull,
        propellant: sim.propellant,
        power: sim.power,
        score: sim.score,
        stage: sim.stage
      });
    }
  }
  assembly?.update(dt);if(!assembly)world.update(dt,view==='flight'?sim:null);audio.update(dt,sim,keys);
  if(view==='menu')$('#planet-rotation').textContent=(world.planet.rotation.y*180/Math.PI%360).toFixed(1).padStart(5,'0')+'°';
  else if(sim){
    if(now-lastHud>90){updateHud();drawRadar(now/1000);lastHud=now;}
    const p=world.projectTarget(sim);const marker=$('#target-marker');marker.hidden=!p||sim.mode!=='flight';
    if(p){marker.style.left=clamp(p.x,innerWidth<800?35:260,innerWidth-(innerWidth<800?35:275))+'px';marker.style.top=clamp(p.y,150,innerHeight-230)+'px';marker.style.opacity=p.behind?'.3':'1';}
    typed=Math.min(transcript.length,typed+dt*60);$('#comm-text').textContent=transcript.slice(0,Math.floor(typed));if(typed>=transcript.length)$('#comm-state').textContent='TRANSMISSION COMPLETE';
    if(sim.mode==='flight'&&sim.stage===0&&sim.campaign){$('#flight-tip').innerHTML=sim.assist?'AUTOPILOT ON · Ship tracks the glowing rings. Press <kbd>G</kbd> to steer yourself.':sim.stageTime<8?'FIRST STEP · Hold <kbd>W</kbd> to fly forward toward the glowing ring.':sim.stageTime<16?'COASTING · Let go of <kbd>W</kbd> to coast. Hold <kbd>S</kbd> to slow down.':'STEER · <kbd>A</kbd><kbd>D</kbd> steer left/right · <kbd>↑</kbd><kbd>↓</kbd> up/down · <kbd>G</kbd> autopilot';}
    if(sim.mode==='flight'&&sim.scan>0&&(keys.interact||sim.interactionQueued)){scanSound+=dt;if(scanSound>.5){audio.cue('scan');scanSound=0;}}
  }
  requestAnimationFrame(tick);
}
window.setGameDestination = function(destId) {
  if(!destId) return;
  const norm = String(destId).toLowerCase().trim();
  const foundIdx = DESTINATIONS.findIndex(d => d.id === norm || d.name.toLowerCase() === norm || (norm === 'vesta' && d.id === 'asteroid'));
  if(foundIdx !== -1) {
    selectDestination(foundIdx);
  }
};
window.completeMission = completeMission;
window.buildDebriefCarousel = buildDebriefCarousel;
window.initDebriefCarousel = initDebriefCarousel;
window.showDialog = showDialog;
window.handleEvent = handleEvent;
window.audio = audio;
Object.defineProperty(window, 'sim', { get: () => sim, configurable: true });
Object.defineProperty(window, 'world', { get: () => world, configurable: true });
window.addEventListener('message', ev => {
  if (ev?.data?.type === 'SET_DESTINATION' && ev.data.destination) {
    window.setGameDestination(ev.data.destination);
  }
});
try{
  world=new SpaceWorld($('#world'));
  world.setQuality(settings.quality!==false);
  buildCards();
  const urlParams = new URLSearchParams(window.location.search);
  const targetParam = urlParams.get('destination');
  let initIndex = 2;
  if(targetParam){
    const norm = targetParam.toLowerCase().trim();
    const foundIdx = DESTINATIONS.findIndex(d => d.id === norm || d.name.toLowerCase() === norm || (norm === 'vesta' && d.id === 'asteroid'));
    if(foundIdx !== -1) initIndex = foundIdx;
  }
  selectDestination(initIndex);
  window.startLaunchSimulation = function(destIndex = initIndex) {
    const d = DESTINATIONS[destIndex] || DESTINATIONS[2];
    const plan = makeCampaign(null, d.id);
    closeDialog();
    activeLaunchSim = startRocketLaunch({
      destination: d,
      loadout,
      campaign: plan,
      audio,
      onComplete: () => {
        activeLaunchSim = null;
        initializeFlight();
      },
      onCancel: () => {
        activeLaunchSim = null;
        returnMenu();
      }
    });
    return activeLaunchSim;
  };

  const launchParam = urlParams.get('launch');
  if (launchParam === 'true') {
    world.ready.then(() => {
      setTimeout(() => {
        window.startLaunchSimulation(initIndex);
      }, 600);
    });
  }

  updateAudioButton();
  updateBgmButton();
  updateCrewModeUI();
  if($('#resume-button')) $('#resume-button').hidden=!savedCheckpoint;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)world.mouse={x:0,y:0};
  world.ready.then(()=>{
    setTimeout(()=>{$('#loading').classList.add('done');setTimeout(()=>{$('#loading').hidden=true;},850);},400);
    // Show Gateway Mode Selection screen (Solo vs Team -> Create / Join) on clean boot
    if (!launchParam) {
      showModeSelectScreen($('#mode-select-screen'), {
        onSolo: () => updateCrewModeUI(),
        onTeamLaunch: () => {
          updateCrewModeUI();
          designDialog();
        }
      });
    }
  });
  requestAnimationFrame(tick);
}catch(error){$('#loading-text').textContent='3D INITIALIZATION FAILED';const details=document.createElement('pre');details.className='error-detail';details.textContent='This game needs WebGL 2 and a current Chrome, Edge, or Firefox browser. Enable hardware acceleration and reload.\n\n'+error.message;$('#loading').append(details);console.error(error);}
