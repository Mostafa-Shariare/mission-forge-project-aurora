import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SYSTEMS,designStats,normalizeLoadout,NASA_MISSION_CLASSES,LAUNCH_VEHICLES} from './data.js';
import {vehicleBus,vehicleModule,disposeModel} from './vehicle.js';
import {componentPreview,suggestedBuild} from './experience.js';

const signed=(n,precision=1)=>(n>=0?'+':'')+n.toFixed(precision);

// Kid-friendly punchy highlights for each component choice
const KID_PART_HIGHLIGHTS = [
  // 0: Propulsion
  [
    { tag: '🚀 QUICK BURST', hint: 'Powerful rocket engine with quick burst speed!' },
    { tag: '⚡ ULTRA RANGE', hint: 'Glowing ion drive that sips fuel forever!' },
    { tag: '🔥 TURBO BOOST', hint: 'Extreme turbo power for heavy deep-space missions!' }
  ],
  // 1: Power
  [
    { tag: '☀️ SOLAR WINGS', hint: 'Unfolds wide solar wings to soak up bright sunlight!' },
    { tag: '🔋 SPACE BATTERY', hint: 'Nuclear battery that never runs out in the dark!' },
    { tag: '⚡ MEGA REACTOR', hint: 'Giant fission reactor for endless high-power experiments!' }
  ],
  // 2: Protection
  [
    { tag: '🛡️ LIGHT BUMPER', hint: 'Light bumper that stops tiny space dust & pebbles!' },
    { tag: '🛡️ TOUGH ARMOR', hint: 'Reinforced plating that blocks space rocks & debris!' },
    { tag: '🛡️ TITANIUM BUNKER', hint: 'Super-heavy bunker for extreme radiation & storms!' }
  ],
  // 3: Science
  [
    { tag: '📷 RECON CAMERA', hint: 'Quick camera to spot craters and map planets!' },
    { tag: '🔬 LASER SCANNER', hint: 'Infrared spectrometer to scan deep minerals!' },
    { tag: '🌟 ROBOTIC LAB', hint: 'Full science laboratory for maximum discovery stars!' }
  ],
  // 4: Comms
  [
    { tag: '📡 WHIP ANTENNA', hint: 'Light radio antenna for close-range signals!' },
    { tag: '📡 DISH ANTENNA', hint: 'High-gain dish to beam pictures back to Earth!' },
    { tag: '⚡ LASER OPTICS', hint: 'Space laser transmitter for lightning-fast downloads!' }
  ],
  // 5: Thermal
  [
    { tag: '❄️ COOLING FINS', hint: 'Simple metal fins to bleed off engine heat!' },
    { tag: '❄️ RADIATOR WINGS', hint: 'Unfolding wings that cool 30% faster in space!' },
    { tag: '❄️ PUMPED LOOP', hint: 'Active pumped cooling loop for heavy thruster burns!' }
  ],
  // 6: Guidance
  [
    { tag: '🎯 GAS THRUSTERS', hint: 'Nitrogen gas jets for fast attitude turns!' },
    { tag: '🎯 REACTION WHEELS', hint: 'Spinning gyro wheels for super-precise aiming!' },
    { tag: '🎯 STAR TRACKER', hint: 'Dual star-tracker cameras for pro navigation!' }
  ],
  // 7: Recovery
  [
    { tag: '🚜 SCOUT DRONE', hint: 'Nimble scout drone for quick terrain checks!' },
    { tag: '🚜 ROBOTIC ARM', hint: 'Rover with robotic arm and sealed rock tubes!' },
    { tag: '🚜 SCIENCE VAULT', hint: 'Armored vault that brings home maximum rock samples!' }
  ],
  // 8: Tanks
  [
    { tag: '⛽ TWIN TANKS', hint: 'Lightweight tanks (28 t) for agile maneuvering!' },
    { tag: '⛽ EXTENDED CLUSTER', hint: 'Balanced tanks (34 t) with great extra flight range!' },
    { tag: '⛽ DEEP SPACE TANKS', hint: 'Giant fuel supply (40 t) for the longest interplanetary trips!' }
  ]
];

function componentCard(hangar,slot,choice){
  const preview=componentPreview(hangar.loadout,hangar.destination.id,slot,choice),p=preview.part,installed=hangar.installed[slot]&&hangar.loadout[slot]===choice;
  Object.assign(preview.after,hangar.buildCheck(preview.after));
  const cardTitle = p.name;
  const kidMeta = (KID_PART_HIGHLIGHTS[slot] && KID_PART_HIGHLIGHTS[slot][choice]) || { tag: p.tag, hint: p.description };

  let specsLabel = '';
  if (slot === 0) {
    if (choice === 1) {
      specsLabel = '⚡ 5.15 kW · Thrust 0.35 N';
    } else {
      specsLabel = '⚡ 0.15 kW · Thrust 200 kN';
    }
  } else {
    specsLabel = preview.specs.slice(0, 2).map(([lbl, val]) => `${lbl} ${val}`).join(' · ');
  }

  const powerText = p.demand > 0 ? `${p.demand.toFixed(2)} kW` : (p.supply > 0 ? `+${p.supply.toFixed(2)} kW` : '0.00 kW');

  return `<button data-part="${choice}" data-demand="${p.demand}" data-margin="${preview.after.powerMargin}" aria-label="Install ${cardTitle}" aria-pressed="${installed}">
    <span class="part-number"><span class="cyber-num-pill">0${choice+1}</span><span class="part-tag-text">${kidMeta.tag}</span></span>
    <div class="part-preview-stage" aria-hidden="true"><div class="pedestal-halo"></div><div class="pedestal-disc"></div><div class="pedestal-ring"></div></div>
    <strong class="part-title">${cardTitle}</strong>
    <span class="part-description kid-part-desc">${kidMeta.hint}</span>
    <div class="component-specs-label">${specsLabel}</div>
    <div class="part-bottom-icons">
      <span class="part-icon-item" title="Dry Mass"><svg class="meta-icon" viewBox="0 0 12 12" fill="none"><path d="M2.5 10.5H9.5L8 4.5H4L2.5 10.5Z" stroke="currentColor" stroke-width="1.1"/><circle cx="6" cy="3" r="1.3" stroke="currentColor" stroke-width="1.1"/></svg><span class="icon-label">${p.mass} t</span></span>
      <span class="part-icon-item" title="Hardware Cost"><span class="currency-tag">$</span><span class="icon-label">$${p.cost}M</span></span>
      <span class="part-icon-item" title="Electrical Power"><svg class="meta-icon spark-icon" viewBox="0 0 12 12" fill="none"><path d="M6 1L2.5 6.5H5.8L5 11L9.5 5H6.2L6 1Z" fill="currentColor"/></svg><span class="icon-label">${powerText}</span></span>
    </div>
  </button>`;
}

const OFFSETS=[[0,0,11],[11,0,0],[0,-8,0],[0,9,0],[0,-9,-7],[8,8,7],[0,6,-12],[0,-10,7],[-10,-4,5]];
const MOUNTS=[[2,0,6],[3.5,0,0],[1.9,0,-1],[0,3,-1],[0,-3,-3],[3,2,3],[1.7,1,-5],[0,-2.5,1],[-3,-1,1]];

const LESSONS=[
  'Propulsion sets the trade-off between thrust and propellant efficiency. Ion propulsion offers high ideal Δv but extremely slow acceleration; chemical engines deliver short, powerful burns.',
  'Solar arrays produce less power farther from the Sun. Radioisotope generators supply steady electricity; a fission concept supports larger loads but adds cost and mass.',
  'Protection adds dry mass. A Whipple bumper disperses small impactors; a heavier shelter improves the game’s damage resistance, but reduces ideal Δv. No shield makes a spacecraft invulnerable.',
  'Your instruments determine scanning speed and scientific return. Larger laboratories collect richer records but consume more mass, budget and electrical power.',
  'Communication antennas exchange commands and science records. Larger apertures help deep-space links; the game represents this with faster relay acquisition, not a calculated radio link budget.',
  'Spacecraft reject internal waste heat by radiation. More radiator area and pumped circulation improve cooling, at the cost of mass and electrical demand. The heat model is scaled for play.',
  'Reaction wheels rotate the spacecraft; RCS thrusters also provide translation. Star trackers estimate orientation. This game combines their benefit into a lateral response multiplier.',
  'A recovery bay houses the field vehicle, sample handling equipment and sealed records. Larger handling systems increase the game science yield, while adding mass and power demand.',
  'More propellant raises ideal delta-v but also raises initial mass and reduces acceleration. Tank structure adds dry mass; compare both values before choosing the largest tank.'
];

const CADET_TIPS = [
  '💡 Cadet Tip: Chemical rockets give quick burst thrust! Ion engines save fuel for ultra-long space journeys.',
  '💡 Cadet Tip: Solar panels love bright sunlight! Nuclear batteries work anywhere — even in deep dark space.',
  '💡 Cadet Tip: Strong shields bounce space rocks away! But remember: heavier shields take more fuel to push.',
  '💡 Cadet Tip: Bigger scanners discover alien secrets and earn you more mission science stars!',
  '💡 Cadet Tip: Big dish antennas beam pictures and videos back to Earth in a flash!',
  '💡 Cadet Tip: Spaceships get super hot in the sun! Radiator wings blow extra heat out into cold space.',
  '💡 Cadet Tip: Thruster nozzles spin and turn your ship so you can dodge flying space rocks easily!',
  '💡 Cadet Tip: A sturdy rover lets you drive around on alien ground and collect valuable rock samples!',
  '💡 Cadet Tip: Extra fuel lets you travel further, but makes your rocket heavier to lift into orbit!'
];

const STEP_PROMPTS = [
  '🚀 Step 1 of 9: Choose an Engine to fly Odyssey!',
  '⚡ Step 2 of 9: Choose a Power Source for electricity!',
  '🛡️ Step 3 of 9: Choose a Shield to block space rocks!',
  '🔬 Step 4 of 9: Choose Science Scanners for bonus stars!',
  '📡 Step 5 of 9: Choose an Antenna to call Mission Control!',
  '❄️ Step 6 of 9: Choose Radiators to keep your ship cool!',
  '🎯 Step 7 of 9: Choose Thrusters to steer and turn!',
  '🚜 Step 8 of 9: Choose a Rover to explore the surface!',
  '⛽ Step 9 of 9: Choose Fuel Tanks for maximum flight range!'
];

const SUBSYSTEM_TABS = [
  { icon: '🚀', name: 'ENGINES' },
  { icon: '⚡', name: 'POWER' },
  { icon: '🛡️', name: 'SHIELDS' },
  { icon: '🔬', name: 'SCANNERS' },
  { icon: '📡', name: 'ANTENNAS' },
  { icon: '❄️', name: 'COOLING' },
  { icon: '🎯', name: 'STEERING' },
  { icon: '🚜', name: 'ROVER' },
  { icon: '⛽', name: 'TANKS' }
];

export class AssemblyHangar {
  constructor(root,loadout,destination,onChange,onSound){
    this.root=root;this.loadout=normalizeLoadout(loadout);this.destination=destination;this.onChange=onChange;this.onSound=onSound;
    this.slot=0;this.installed=SYSTEMS.map(()=>false);this.modules=[];this.animations=[];this.exploded=false;this.time=0;this.disposed=false;
    this.missionClass='discovery';
    this.launchVehicle='falcon9_medium';
    this.uiMode='cadet'; // Default to kid-friendly Cadet Mode!

    root.innerHTML=`<div class="hangar-layout">
      <section class="hangar-workbench">
        <div class="hangar-topline">
          <span class="assembly-subheader">ORBITAL ASSEMBLY BAY • VESSEL ODYSSEY 07</span>
          <span>PHASE 00 • BUILD YOUR VEHICLE <button data-hangar="engineering" aria-expanded="false">ENGINEERING</button></span>
        </div>
        <div class="hangar-stage">
          <div class="hangar-canvas"></div>
          <div class="hangar-overlay">
            <span class="eyebrow">ODYSSEY • MODULAR EXPLORER</span>
            <p id="assembly-message" role="status" aria-live="polite">🚀 Step 1 of 9: Choose an Engine to fly Odyssey!</p>
          </div>
          <div class="hangar-tools">
            <button data-hangar="left" aria-label="Rotate spacecraft left">↶</button>
            <button data-hangar="right" aria-label="Rotate spacecraft right">↷</button>
            <button data-hangar="zoom" aria-label="Zoom in">＋</button>
            <button data-hangar="out" aria-label="Zoom out">−</button>
            <button data-hangar="reset">RESET VIEW</button>
            <button data-hangar="explode" aria-pressed="false">💥 EXPLODED VIEW</button>
          </div>
          <span class="hangar-hint">DRAG TO ORBIT · SCROLL TO ZOOM · TAB + ENTER TO ASSEMBLE</span>
        </div>
        <div class="hangar-section-nav">
          <button data-hangar="previous-section" aria-label="Previous subsystem">‹</button>
          <div class="hangar-slots" role="group" aria-label="Assembly subsystems">
            ${SYSTEMS.map((s,i)=>{
              const tab = SUBSYSTEM_TABS[i] || { icon: '⚙️', name: s.label.replace(/^\d+\s*[\/•]\s*/,'') };
              return `<button data-slot="${i}" aria-pressed="${i===0}">
                <div class="slot-header-row">
                  <span class="slot-pill"><b class="slot-num">0${i+1}</b></span>
                  <b class="slot-title">${tab.icon} ${tab.name}</b>
                </div>
                <div class="slot-sub-row">
                  <span class="slot-slash">/</span>
                  <small id="socket-${i}" class="slot-sub">EMPTY SOCKET</small>
                </div>
              </button>`;
            }).join('')}
          </div>
          <button data-hangar="next-section" aria-label="Next subsystem">›</button>
        </div>
        <div class="hangar-catalog">
          <div class="catalog-heading">
            <h3 id="catalog-title"></h3>
            <button data-hangar="suggested" class="btn-suggested-build">✨ ONE-CLICK AUTO-BUILD</button>
            <button data-hangar="remove">✕ REMOVE</button>
          </div>
          <div class="part-previews" aria-hidden="true"></div>
          <div class="hangar-options"></div>
          <p class="engineering-lesson"></p>
        </div>
      </section>
      <aside class="hangar-readiness">
        <div class="readiness-header-row">
          <div>
            <span class="eyebrow">MISSION ENGINEERING</span>
            <h3>${destination.name} EXPEDITION</h3>
          </div>
          <button class="cyber-hamburger-btn" data-hangar="engineering" aria-label="Toggle Flight Engineering" title="Toggle Engineering Panel"><span class="cyber-hamburger"><i></i><i></i><i></i></span></button>
        </div>
        <div class="cadet-mode-switcher">
          <button type="button" class="mode-toggle-btn active" data-hangar="mode-cadet">🚀 CADET MODE</button>
          <button type="button" class="mode-toggle-btn" data-hangar="mode-engineer">🔬 PRO ENGINEER</button>
        </div>
        <p class="hangar-subtitle">Solar Distance: ${designStats(loadout,destination.id).sunDistance} AU</p>
        <div class="readiness-card nasa-architecture-card">
          <div class="readiness-card-header">
            <span class="readiness-card-tag arch-tag">NASA</span>
            <h4 class="readiness-card-title">MISSION ARCHITECTURE</h4>
          </div>
          <div class="readiness-card-body">
            <div class="arch-control-group">
              <label for="mission-class-select">MISSION CLASS &amp; BUDGET CAP</label>
              <select id="mission-class-select" aria-label="Select NASA Mission Class">
                ${NASA_MISSION_CLASSES.map(c=>`<option value="${c.id}" ${c.id===this.missionClass?'selected':''}>${c.icon} ${c.badge} — ${c.tag}</option>`).join('')}
              </select>
              <p id="mission-class-desc" class="arch-hint">${NASA_MISSION_CLASSES[0].description}</p>
            </div>
            <div class="arch-control-group">
              <label for="launch-vehicle-select">LAUNCH VEHICLE &amp; FAIRING</label>
              <select id="launch-vehicle-select" aria-label="Select Launch Vehicle">
                ${LAUNCH_VEHICLES.map(lv=>`<option value="${lv.id}" ${lv.id===this.launchVehicle?'selected':''}>${lv.icon} ${lv.name} [${lv.maxPayloadMass} t] — +$${lv.cost}M</option>`).join('')}
              </select>
              <p id="launch-vehicle-desc" class="arch-hint">${LAUNCH_VEHICLES[0].description}</p>
            </div>
          </div>
        </div>
        <div id="hangar-stats"></div>
        <div class="assembly-checklist" aria-live="polite"></div>
        <details class="quick-components">
          <summary>⚡ QUICK SELECT (ALL 9 SYSTEMS)</summary>
          ${SYSTEMS.map((s,i)=>`<label for="quick-system-${i}">${s.label}</label><select id="quick-system-${i}" data-quick-slot="${i}" aria-label="${s.label} component"><option value="-1">Choose a component…</option>${s.choices.map((p,j)=>`<option value="${j}">${p.name} · ${p.mass} t · $${p.cost}M</option>`).join('')}</select>`).join('')}
        </details>
        <details class="hangar-science">
          <summary>🔬 REAL ROCKET SCIENCE &amp; EQUATIONS (ADVANCED)</summary>
          <p>Δv = Isp × g₀ × ln(wet / dry mass) + Launcher C₃ Boost. Acceleration = thrust / wet mass. Mass flow = thrust / (Isp × g₀). Solar output = output at 1 AU / distance².</p>
          <p>12 t bus + selected propellant (28–40 t) + installed modules. Total mission budget = Spacecraft Hardware + Launch Procurement. Fairing size restricts maximum wet payload mass envelope.</p>
          <a href="https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/specific-impulse/" target="_blank" rel="noopener">NASA: specific impulse ↗</a>
          <a href="https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems/" target="_blank" rel="noopener">NASA: spacecraft power ↗</a>
        </details>
        <label for="difficulty-select">FLIGHT DIFFICULTY</label>
        <select id="difficulty-select">
          <option value="explorer">EXPLORER · Forgiving damage (Recommended for Cadets)</option>
          <option value="expedition">EXPEDITION · Realistic full damage</option>
        </select>
      </aside>
    </div>
    <div class="dialog-footer hangar-footer">
      <span id="assembly-readiness"></span>
      <button class="primary-button" id="launch-button" disabled><span>COMMIT & LAUNCH</span><b>↗</b></button>
    </div>`;

    this.change=e=>{
      if(e.target.id==='mission-class-select'){
        this.missionClass=e.target.value;
        const cls=NASA_MISSION_CLASSES.find(c=>c.id===this.missionClass);
        const desc=this.root.querySelector('#mission-class-desc');
        if(desc&&cls)desc.textContent=cls.description;
        this.refresh();
      }
      if(e.target.id==='launch-vehicle-select'){
        this.launchVehicle=e.target.value;
        const lv=LAUNCH_VEHICLES.find(l=>l.id===this.launchVehicle);
        const desc=this.root.querySelector('#launch-vehicle-desc');
        if(desc&&lv)desc.textContent=lv.description;
        this.refresh();
      }
      if(e.target.dataset.quickSlot!==undefined&&Number(e.target.value)>=0){
        this.selectSlot(Number(e.target.dataset.quickSlot));
        this.install(Number(e.target.value));
        e.target.focus({preventScroll:true});
      }
    };
    root.addEventListener('change',this.change);

    this.scene=new T.Scene();this.scene.background=new T.Color(0x07131f);this.scene.fog=new T.Fog(0x07131f,55,130);
    this.scene.add(new T.HemisphereLight(0xc3eaff,0x263549,2.3));
    const light=new T.DirectionalLight(0xffffff,3.5);light.position.set(12,22,10);this.scene.add(light);
    const rim=new T.PointLight(0x2bcbff,160);rim.position.set(-9,4,-9);this.scene.add(rim);
    this.ship=vehicleBus();this.scene.add(this.ship);
    const grid=new T.GridHelper(140,70,0x1c5969,0x102634);grid.position.y=-5;this.scene.add(grid);
    for(let r=13;r<=17;r+=2){
      const ring=new T.Mesh(new T.TorusGeometry(r,.035,6,128),new T.MeshBasicMaterial({color:0x2d8192}));
      ring.rotation.x=Math.PI/2;ring.position.y=-4.95;this.scene.add(ring);
    }
    this.robot=new T.Group();this.scene.add(this.robot);
    const armMaterial=new T.MeshStandardMaterial({color:0x617b8a,metalness:.75,roughness:.28});
    const jointMaterial=new T.MeshStandardMaterial({color:0x79ded6,emissive:0x167770,emissiveIntensity:1.2});
    this.armLinks=[0,1].map(()=>{const m=new T.Mesh(new T.CylinderGeometry(.17,.22,1,12),armMaterial);this.robot.add(m);return m;});
    this.armJoints=[0,1,2].map(()=>{const m=new T.Mesh(new T.SphereGeometry(.38,12,12),jointMaterial);this.robot.add(m);return m;});
    this.armTip=new T.Vector3(9,-2,3);
    this.camera=new T.PerspectiveCamera(40,1,.1,200);this.camera.position.set(13,9.8,15.5);
    this.renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setClearColor(0x07131f);this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.3;
    this.host=root.querySelector('.hangar-canvas');this.host.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','3D spacecraft assembly viewport');
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.minDistance=17;this.controls.maxDistance=65;this.controls.maxPolarAngle=Math.PI*.85;this.controls.enablePan=false;
    this.previewHost=root.querySelector('.part-previews');this.previewRenderer=new T.WebGLRenderer({antialias:true,alpha:true});this.previewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.3));this.previewHost.append(this.previewRenderer.domElement);
    this.previewScenes=[];this.previewCamera=new T.PerspectiveCamera(34,1,.1,150);this.previewCamera.position.set(0,3.2,23);this.previewCamera.lookAt(0,0,0);
    this.resize=new ResizeObserver(()=>this.size());this.resize.observe(this.host);this.resize.observe(this.previewHost);

    this.click=e=>{
      const b=e.target.closest('button');
      if(!b)return;
      if(b.dataset.slot!==undefined)this.selectSlot(+b.dataset.slot);
      if(b.dataset.part!==undefined)this.install(+b.dataset.part);
      if(b.dataset.hangar){
        if(b.dataset.hangar==='mode-cadet'){
          this.uiMode='cadet';
          this.root.querySelectorAll('.mode-toggle-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.hangar==='mode-cadet'));
          this.selectSlot(this.slot);
          return;
        }
        if(b.dataset.hangar==='mode-engineer'){
          this.uiMode='engineer';
          this.root.querySelectorAll('.mode-toggle-btn').forEach(btn=>btn.classList.toggle('active',btn.dataset.hangar==='mode-engineer'));
          this.selectSlot(this.slot);
          return;
        }
        this.action(b.dataset.hangar);
      }
    };
    root.addEventListener('click',this.click);

    this.navigate=e=>{
      if(!e.target.closest('.hangar-section-nav')||!['ArrowLeft','ArrowRight'].includes(e.key))return;
      e.preventDefault();
      this.selectSlot(Math.max(0,Math.min(SYSTEMS.length-1,this.slot+(e.key==='ArrowRight'?1:-1))));
      this.root.querySelector(`[data-slot="${this.slot}"]`).focus({preventScroll:true});
    };
    root.addEventListener('keydown',this.navigate);

    this.selectSlot(0);
    this.root.querySelector('#assembly-message').textContent=STEP_PROMPTS[0];
    this.size();
    this.autoEquipAll();
  }

  autoEquipAll(){
    try {
      const build = suggestedBuild(this.destination.id);
      for(let i=0;i<SYSTEMS.length;i++){
        const choice = (build && build.loadout && build.loadout[i] !== undefined) ? build.loadout[i] : 0;
        this.loadout[i]=choice;
        this.installed[i]=true;
        if(this.modules[i]){this.ship.remove(this.modules[i]);disposeModel(this.modules[i]);}
        const part=vehicleModule(i,choice);
        part.userData.flames.forEach(f=>f.visible=false);
        part.position.fromArray(OFFSETS[i]);
        this.ship.add(part);
        this.modules[i]=part;
        this.animations[i]=0;
      }
      this.animations=this.animations.map(()=>0);
      this.onChange([...this.loadout]);
      this.selectSlot(0);
      this.ready=true;
      this.refresh();
      const lb=this.root.querySelector('#launch-button');
      if(lb) lb.disabled=false;
    } catch(err) {
      console.error('autoEquipAll error:', err);
    }
  }

  size(){
    if(this.disposed)return;
    const w=this.host.clientWidth,h=this.host.clientHeight;
    if(w&&h){
      this.renderer.setSize(w,h);
      this.camera.aspect=w/h;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene,this.camera);
    }
    const pw=this.previewHost.clientWidth,ph=this.previewHost.clientHeight;
    if(pw&&ph){
      this.previewRenderer.setSize(pw,ph);
      this.previewCamera.aspect=pw/3/ph;
      this.previewCamera.updateProjectionMatrix();
    }
  }

  revealSlot(){
    const strip=this.root.querySelector('.hangar-slots'),button=strip.querySelector(`[data-slot="${this.slot}"]`);
    strip.scrollTo({left:button.offsetLeft-strip.offsetLeft-(strip.clientWidth-button.offsetWidth)/2,behavior:'auto'});
    this.root.querySelector('[data-hangar="previous-section"]').disabled=this.slot===0;
    this.root.querySelector('[data-hangar="next-section"]').disabled=this.slot===SYSTEMS.length-1;
  }

  selectSlot(slot){
    this.slot=slot;
    this.revealSlot();
    this.root.querySelectorAll('[data-slot]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.slot===slot)));
    const slotNum = String(slot + 1).padStart(2, '0');
    const tab = SUBSYSTEM_TABS[slot] || { icon: '⚙️', name: SYSTEMS[slot].label.replace(/^\d+\s*[\/•]\s*/,'') };
    this.root.querySelector('#catalog-title').textContent = `SUBSYSTEM ${slotNum} / 09 · ${tab.icon} ${tab.name} · SELECT MODULE`;
    if(!this.installed[slot]){
      this.root.querySelector('#assembly-message').textContent = STEP_PROMPTS[slot] || `Step ${slot+1} of 9: Select a module below!`;
    }
    this.root.querySelector('.engineering-lesson').textContent = (this.uiMode === 'engineer') ? LESSONS[slot] : CADET_TIPS[slot];
    this.root.querySelector('.hangar-options').innerHTML = SYSTEMS[slot].choices.map((p,i)=>componentCard(this,slot,i)).join('');
    this.previewScenes.forEach(s=>disposeModel(s));
    this.previewScenes=[];
    for(let i=0;i<3;i++){
      const s=new T.Scene();
      s.add(new T.HemisphereLight(0xffffff,0x09253d,3.2));
      const l=new T.DirectionalLight(0xd9f8ff,4.2);
      l.position.set(4,9,11);
      s.add(l);
      const rim=new T.PointLight(0x00e5ff,7,28);
      rim.position.set(0,-2.6,5);
      s.add(rim);
      const part=vehicleModule(slot,i);
      part.userData.flames.forEach(f=>f.visible=false);
      const bounds=new T.Box3().setFromObject(part),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
      part.position.sub(center);
      const pivot=new T.Group();
      pivot.add(part);
      pivot.scale.setScalar(18/Math.max(size.x,size.y,size.z));
      s.add(pivot);
      s.userData.pivot=pivot;
      this.previewScenes.push(s);
    }
    this.refresh();
  }

  install(choice){
    const slot=this.slot;
    this.loadout[slot]=choice;
    this.installed[slot]=true;
    if(this.modules[slot]){this.ship.remove(this.modules[slot]);disposeModel(this.modules[slot]);}
    const part=vehicleModule(slot,choice);
    part.userData.flames.forEach(f=>f.visible=false);
    part.position.fromArray(OFFSETS[slot]);
    part.position.multiplyScalar(1.5);
    this.ship.add(part);
    this.modules[slot]=part;
    this.animations[slot]=1;
    this.onChange([...this.loadout]);
    this.onSound();
    this.selectSlot(slot);
    this.root.querySelector('#assembly-message').textContent='✨ ' + SYSTEMS[slot].choices[choice].name+' locked in! Installing module...';
    this.root.querySelector(`[data-part="${choice}"]`)?.focus({preventScroll:true});
  }

  action(action){
    if(action==='suggested'){
      const build=suggestedBuild(this.destination.id);
      for(let i=0;i<SYSTEMS.length;i++){
        this.selectSlot(i);
        this.install(build.loadout[i]);
      }
      this.selectSlot(0);
      this.root.querySelector('#assembly-message').textContent='✨ Auto-build complete! All 9 modules locked in and ready for launch! 🚀';
    }
    if(action==='previous-section'||action==='next-section')this.selectSlot(Math.max(0,Math.min(SYSTEMS.length-1,this.slot+(action==='next-section'?1:-1))));
    if(action==='engineering'){
      const open=this.root.dataset.engineering!=='true';
      this.root.dataset.engineering=String(open);
      this.root.querySelector('[data-hangar="engineering"]').setAttribute('aria-expanded',String(open));
    }
    if(action==='left'||action==='right'){
      const v=this.camera.position.clone().applyAxisAngle(new T.Vector3(0,1,0),action==='left'?-.25:.25);
      this.camera.position.copy(v);
    }
    if(action==='zoom'||action==='out')this.camera.position.multiplyScalar(action==='zoom'?.85:1.15).clampLength(17,65);
    if(action==='reset'){
      this.camera.position.set(13,9.8,15.5);
      this.controls.target.set(0,0,0);
    }
    if(action==='explode'){
      this.exploded=!this.exploded;
      this.root.querySelector('[data-hangar="explode"]').setAttribute('aria-pressed',String(this.exploded));
    }
    if(action==='remove'&&this.installed[this.slot]){
      this.ship.remove(this.modules[this.slot]);
      disposeModel(this.modules[this.slot]);
      this.modules[this.slot]=null;
      this.installed[this.slot]=false;
      this.animations[this.slot]=0;
      this.root.querySelector('#assembly-message').textContent=SYSTEMS[this.slot].label+' removed. Pick a replacement below!';
      this.selectSlot(this.slot);
    }
    this.refresh();
  }

  getArchitecture(){
    return {
      missionClass: this.missionClass,
      launchVehicle: this.launchVehicle
    };
  }

  buildCheck(stats){
    const issues=[];
    const missionClass = NASA_MISSION_CLASSES.find(c=>c.id===this.missionClass)||NASA_MISSION_CLASSES[0];
    const launchVehicle = LAUNCH_VEHICLES.find(lv=>lv.id===this.launchVehicle)||LAUNCH_VEHICLES[0];
    const costLimit = missionClass.costLimit;
    const launcherMassLimit = launchVehicle.maxPayloadMass;
    const classMassLimit = missionClass.baseMassLimit;
    const massLimit = Math.min(launcherMassLimit, classMassLimit);
    const totalCost = stats.cost + launchVehicle.cost;

    if(totalCost>costLimit) issues.push(`Total mission cost ($${totalCost}M) exceeds ${missionClass.shortName} cap ($${costLimit}M). Reduce vehicle cost or upgrade class.`);
    if(stats.mass>launcherMassLimit) issues.push(`Payload wet mass (${stats.mass.toFixed(1)} t) exceeds ${launchVehicle.shortName} fairing limit (${launcherMassLimit} t). Reduce mass or upgrade launcher.`);
    if(stats.mass>classMassLimit) issues.push(`Payload wet mass (${stats.mass.toFixed(1)} t) exceeds ${missionClass.shortName} mass cap (${classMassLimit} t).`);
    if(stats.powerMargin<0) issues.push('Power deficit: choose a stronger power system or lower-demand components');
    return {issues,valid:issues.length===0,massLimit,costLimit,totalCost,missionClass,launchVehicle};
  }

  refresh(){
    const stats=designStats(this.loadout,this.destination.id,this.missionClass,this.launchVehicle);
    Object.assign(stats,this.buildCheck(stats));
    const count=this.installed.filter(Boolean).length,complete=count===SYSTEMS.length,busy=this.animations.some(n=>n>0);
    this.ready=complete&&stats.valid;
    this.root.querySelectorAll('[data-quick-slot]').forEach(s=>{const i=Number(s.dataset.quickSlot);s.value=this.installed[i]?String(this.loadout[i]):'-1';});
    const nextSlot=this.installed.findIndex(connected=>!connected);
    this.root.querySelectorAll('[data-slot]').forEach((b,i)=>{
      b.classList.toggle('socket-installed',this.installed[i]);
      b.classList.toggle('socket-next',i===nextSlot);
      this.root.querySelector('#socket-'+i).textContent=this.installed[i]?SYSTEMS[i].choices[this.loadout[i]].name:i===nextSlot?'NEXT: SELECT A MODULE':'EMPTY SOCKET';
    });
    const installedParts=stats.parts.filter((_,i)=>this.installed[i]);
    const currentHardwareCost=60+installedParts.reduce((n,p)=>n+p.cost,0);
    const currentTotalCost=currentHardwareCost+stats.launchVehicle.cost;
    const currentMass=12+(this.installed[8]?stats.fuelMass:0)+installedParts.reduce((n,p)=>n+p.mass,0);

    const rows=[
      ['SPACECRAFT WET MASS',`${currentMass.toFixed(1)} t • Cap ${stats.launchVehicle.maxPayloadMass} t`,currentMass<=stats.launchVehicle.maxPayloadMass],
      ['PAYLOAD FAIRING',`${stats.launchVehicle.fairingDiameter} (${stats.launchVehicle.shortName})`,true],
      ['SPACECRAFT HARDWARE',`$${currentHardwareCost}M`,true],
      ['LAUNCH PROCUREMENT',`$${stats.launchVehicle.cost}M (${stats.launchVehicle.shortName})`,true],
      ['TOTAL MISSION BUDGET',`$${currentTotalCost}M • Cap $${stats.missionClass.costLimit}M`,currentTotalCost<=stats.missionClass.costLimit],
      ['PROJECTED IDEAL Δv',`${stats.deltaV.toFixed(2)} km/s ${stats.launchVehicle.deltaVBonus>0?`(+$${stats.launchVehicle.deltaVBonus.toFixed(2)} C₃)`:''}`,true],
      ['REAL INITIAL ACCEL.',stats.acceleration<.001?stats.acceleration.toExponential(2)+' m/s²':stats.acceleration.toFixed(2)+' m/s²',true],
      ['DESTINATION POWER',`${stats.generatedKW.toFixed(2)} kW`,true],
      ['PROJECTED DEMAND',`${stats.demandKW.toFixed(2)} kW`,true],
      ['POWER MARGIN',(stats.powerMargin>=0?'+':'')+stats.powerMargin.toFixed(2)+' kW',stats.powerMargin>=0],
      ['FULL PROPELLANT BURN',stats.burnSeconds>86400?(stats.burnSeconds/86400).toFixed(0)+' days':(stats.burnSeconds/60).toFixed(1)+' min',true],
      ['RELAY ACQUISITION','×'+stats.link.toFixed(2),true],
      ['COOLING RATE','×'+stats.cooling.toFixed(1),true],
      ['CONTROL RESPONSE','×'+stats.handling.toFixed(2),true],
      ['SCIENCE YIELD','×'+(stats.yield*stats.recovery).toFixed(2),true],
      ['PROPELLANT LOAD',stats.fuelMass+' t',true]
    ];

    if (this.uiMode === 'cadet') {
      // CADET MODE: Visual progress gauges, kid-friendly feedback, clean cards
      const speedPercent = Math.min(100, Math.round((stats.deltaV / 3.2) * 100));
      const speedStatus = stats.deltaV >= 2.0 ? '⚡ Super Fast!' : '🚀 Normal Cruise';

      const powerPercent = stats.powerMargin >= 0 ? 100 : Math.max(15, Math.round(100 + stats.powerMargin * 25));
      const powerStatus = stats.powerMargin >= 0 ? '🔋 Fully Powered! ⚡' : '⚠️ Need More Power!';
      const powerClass = stats.powerMargin >= 0 ? 'good' : 'bad';

      const budgetPercent = Math.min(100, Math.round((currentTotalCost / stats.missionClass.costLimit) * 100));
      const budgetStatus = currentTotalCost <= stats.missionClass.costLimit ? '💰 Under Budget! 👍' : '🚨 Over Budget!';
      const budgetClass = currentTotalCost <= stats.missionClass.costLimit ? 'good' : 'bad';

      const massPercent = Math.min(100, Math.round((currentMass / stats.launchVehicle.maxPayloadMass) * 100));
      const massStatus = currentMass <= stats.launchVehicle.maxPayloadMass ? '✈️ Fits in Rocket! ✅' : '⚠️ Too Heavy for Rocket!';
      const massClass = currentMass <= stats.launchVehicle.maxPayloadMass ? 'good' : 'bad';

      const sysPercent = Math.round((count / SYSTEMS.length) * 100);
      const sysStatus = complete && stats.valid ? '🎉 All Systems GO! 🚀' : !complete ? `🔧 ${SYSTEMS.length - count} more to install!` : '⚠️ Check warnings below';
      const sysClass = complete && stats.valid ? 'good' : 'warn';

      const cadetMetersHtml = `
        <div class="cadet-meters-grid">
          <div class="cadet-meter-card">
            <div class="cadet-meter-header">
              <span>🚀 FLIGHT SPEED &amp; BOOST</span>
              <b class="cadet-meter-val">${stats.deltaV.toFixed(2)} km/s</b>
            </div>
            <div class="cadet-progress-bar"><div class="cadet-fill speed-fill" style="width: ${speedPercent}%;"></div></div>
            <div class="cadet-meter-footer"><span class="cadet-tag good">${speedStatus}</span></div>
          </div>

          <div class="cadet-meter-card">
            <div class="cadet-meter-header">
              <span>🔋 SPACECRAFT POWER</span>
              <b class="cadet-meter-val ${powerClass}">${stats.powerMargin >= 0 ? '+' : ''}${stats.powerMargin.toFixed(2)} kW</b>
            </div>
            <div class="cadet-progress-bar"><div class="cadet-fill ${powerClass}-fill" style="width: ${powerPercent}%;"></div></div>
            <div class="cadet-meter-footer"><span class="cadet-tag ${powerClass}">${powerStatus}</span></div>
          </div>

          <div class="cadet-meter-card">
            <div class="cadet-meter-header">
              <span>💰 NASA MISSION BUDGET</span>
              <b class="cadet-meter-val ${budgetClass}">$${currentTotalCost}M / $${stats.missionClass.costLimit}M</b>
            </div>
            <div class="cadet-progress-bar"><div class="cadet-fill ${budgetClass}-fill" style="width: ${budgetPercent}%;"></div></div>
            <div class="cadet-meter-footer"><span class="cadet-tag ${budgetClass}">${budgetStatus}</span></div>
          </div>

          <div class="cadet-meter-card">
            <div class="cadet-meter-header">
              <span>⚖️ ROCKET PAYLOAD WEIGHT</span>
              <b class="cadet-meter-val ${massClass}">${currentMass.toFixed(1)} t / ${stats.launchVehicle.maxPayloadMass} t</b>
            </div>
            <div class="cadet-progress-bar"><div class="cadet-fill ${massClass}-fill" style="width: ${massPercent}%;"></div></div>
            <div class="cadet-meter-footer"><span class="cadet-tag ${massClass}">${massStatus}</span></div>
          </div>

          <div class="cadet-meter-card highlight">
            <div class="cadet-meter-header">
              <span>🛠️ SPACECRAFT MODULES</span>
              <b class="cadet-meter-val ${sysClass}">${count} / ${SYSTEMS.length} INSTALLED</b>
            </div>
            <div class="cadet-progress-bar"><div class="cadet-fill ${sysClass}-fill" style="width: ${sysPercent}%;"></div></div>
            <div class="cadet-meter-footer"><span class="cadet-tag ${sysClass}">${sysStatus}</span></div>
          </div>
        </div>
      `;

      this.root.querySelector('#hangar-stats').innerHTML = cadetMetersHtml;
    } else {
      // PRO ENGINEER MODE: Classic full detailed aerospace telemetry tables
      const statItem = ([label, value, ok]) => `<div class="readiness-item ${ok ? '' : 'invalid'}"><span class="readiness-item-label">${label}</span><b class="readiness-item-val">${value}</b></div>`;
      const card1 = `<div class="readiness-card"><div class="readiness-card-header"><span class="readiness-card-tag">01</span><h4 class="readiness-card-title">MASS &amp; FAIRING</h4></div><div class="readiness-card-body">${statItem(rows[0])}${statItem(rows[1])}</div></div>`;
      const card2 = `<div class="readiness-card"><div class="readiness-card-header"><span class="readiness-card-tag">02</span><h4 class="readiness-card-title">NASA MISSION BUDGET</h4></div><div class="readiness-card-body">${statItem(rows[2])}${statItem(rows[3])}${statItem(rows[4])}</div></div>`;
      const card3 = `<div class="readiness-card"><div class="readiness-card-header"><span class="readiness-card-tag">03</span><h4 class="readiness-card-title">PROPULSION &amp; C₃ BOOST</h4></div><div class="readiness-card-body">${statItem(rows[5])}${statItem(rows[6])}</div></div>`;
      const card4 = `<div class="readiness-card"><div class="readiness-card-header"><span class="readiness-card-tag">04</span><h4 class="readiness-card-title">POWER &amp; THERMAL</h4></div><div class="readiness-card-body">${statItem(rows[7])}${statItem(rows[8])}${statItem(rows[9])}</div></div>`;
      const statusText = !complete ? 'Install one component in every socket.' : busy ? 'Securing module mounts…' : stats.valid ? `✓ Passed ${stats.missionClass.shortName} class budget ($${currentTotalCost}M / $${stats.missionClass.costLimit}M) and ${stats.launchVehicle.shortName} fairing limits (${currentMass.toFixed(1)} t / ${stats.launchVehicle.maxPayloadMass} t).` : stats.issues.join('<br>');
      const card5 = `<div class="readiness-card systems-verification-card"><div class="readiness-card-header"><span class="readiness-card-tag ${complete && stats.valid ? 'verified' : ''}">05</span><h4 class="readiness-card-title">SYSTEMS VERIFICATION</h4></div><div class="readiness-card-body"><b class="systems-count-text">${count} • ${SYSTEMS.length} SYSTEMS CONNECTED</b><p class="systems-status-copy">${statusText}</p></div></div>`;
      this.root.querySelector('#hangar-stats').innerHTML=`<div class="readiness-cards-container">${card1}${card2}${card3}${card4}${card5}</div><details class="engineering-extra"><summary>MORE ENGINEERING READOUTS</summary>${rows.slice(10).map(([label,value,ok])=>`<div class="hangar-stat ${ok?'':'invalid'}"><span>${label}</span><b>${value}</b></div>`).join('')}</details><p class="projection-note">${complete?'All modules installed.':'Performance projects all nine selected modules. Assembled mass/cost count installed parts only.'}</p>`;
    }

    const oldChecklist = this.root.querySelector('.assembly-checklist');
    if (oldChecklist) {
      oldChecklist.innerHTML = stats.issues.join('<br>');
      oldChecklist.style.display = 'none';
    }
    this.root.querySelector('#assembly-readiness').textContent = this.ready ? '🎉 SPACECRAFT READY! READY FOR LIFTOFF! 🚀' : !complete ? '🔧 STEP '+(count+1)+' of 9: '+(SYSTEMS.length-count)+' MODULES LEFT' : busy ? '⚙️ SECURING MODULE...' : stats.issues[0];
    this.root.querySelector('#launch-button').disabled = !this.ready;
    this.renderer.render(this.scene,this.camera);
    this.root.querySelector('[data-hangar="remove"]').disabled = !this.installed[this.slot];
  }

  update(dt){
    if(this.disposed)return;
    this.time+=dt;
    let finished=false;
    this.modules.forEach((m,i)=>{
      if(!m)return;
      if(this.animations[i]>0){
        this.animations[i]=Math.max(0,this.animations[i]-dt*.8);
        if(!this.animations[i])finished=true;
      }
      const target=new T.Vector3().fromArray(OFFSETS[i]).multiplyScalar(this.exploded?.65:0);
      if(this.animations[i]>0)target.add(new T.Vector3().fromArray(OFFSETS[i]).multiplyScalar(this.animations[i]**3*1.5));
      m.position.lerp(target,Math.min(1,dt*10));
    });
    if(finished){
      this.root.querySelector('#assembly-message').textContent='✨ Module secured! Select the next subsystem below or launch now! 🚀';
      this.refresh();
    }
    const active=this.animations.findIndex(n=>n>0);
    const target=active>=0?new T.Vector3().fromArray(MOUNTS[active]).add(this.modules[active].position):new T.Vector3(9,-2,3);
    this.armTip.lerp(target,Math.min(1,dt*4));
    const base=new T.Vector3(12,-4.7,4),elbow=base.clone().lerp(this.armTip,.45);elbow.y+=4;
    const points=[base,elbow,this.armTip];
    this.armJoints.forEach((m,i)=>m.position.copy(points[i]));
    this.armLinks.forEach((m,i)=>{
      const a=points[i],b=points[i+1],direction=b.clone().sub(a);
      m.position.copy(a).add(b).multiplyScalar(.5);
      m.scale.y=direction.length();
      m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());
    });
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
    const w=this.previewHost.clientWidth,h=this.previewHost.clientHeight;
    if(w&&h){
      const btns=this.root.querySelectorAll('.hangar-options button');
      this.previewRenderer.setScissorTest(true);
      this.previewScenes.forEach((s,i)=>{
        s.userData.pivot.rotation.set(.18,this.time*.35+i*.7,0);
        let left=i*w/3,width=w/3;
        if(btns&&btns[i]){
          left=btns[i].offsetLeft;
          width=btns[i].offsetWidth;
        }
        this.previewRenderer.setViewport(left,0,width,h);
        this.previewRenderer.setScissor(left,0,width,h);
        this.previewRenderer.render(s,this.previewCamera);
      });
      this.previewRenderer.setScissorTest(false);
    }
  }

  dispose(){
    this.disposed=true;
    this.resize.disconnect();
    this.root.removeEventListener('click',this.click);
    this.root.removeEventListener('keydown',this.navigate);
    this.root.removeEventListener('change',this.change);
    this.controls.dispose();
    disposeModel(this.scene);
    this.previewScenes.forEach(disposeModel);
    this.renderer.dispose();
    this.previewRenderer.dispose();
    this.renderer.forceContextLoss();
    this.previewRenderer.forceContextLoss();
  }
}
