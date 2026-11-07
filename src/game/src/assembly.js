import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SYSTEMS,designStats,normalizeLoadout,NASA_MISSION_CLASSES,LAUNCH_VEHICLES} from './data.js';
import {vehicleBus,vehicleModule,disposeModel} from './vehicle.js';
import {componentPreview,suggestedBuild} from './experience.js';

const SUBSYSTEM_TABS = [
  { icon: '🚀', name: 'PROPULSION' },
  { icon: '⚡', name: 'POWER' },
  { icon: '🛡️', name: 'SHIELDS' },
  { icon: '🔬', name: 'SCANNERS' },
  { icon: '📡', name: 'COMMS' },
  { icon: '❄️', name: 'COOLING' },
  { icon: '🎯', name: 'STEERING' },
  { icon: '🚜', name: 'ROVER' },
  { icon: '⛽', name: 'TANKS' }
];

function getPrimarySpec(slot, choice, p) {
  switch (slot) {
    case 0: return choice === 1 ? '⚡ 0.35 N' : (choice === 2 ? '⚡ 280 kN' : '⚡ 200 kN');
    case 1: return choice === 0 ? '☀️ 18 kW' : (choice === 1 ? '🔋 2.4 kW' : '⚡ 20 kW');
    case 2: return choice === 0 ? '🛡️ Whipple' : (choice === 1 ? '🛡️ Shield 0.55×' : '🛡️ Vault 0.32×');
    case 3: return choice === 0 ? '📷 Spectrometer' : (choice === 1 ? '🔬 Radar 1.3×' : '🌟 Lab 1.6×');
    case 4: return choice === 0 ? '📡 Patch 2k' : (choice === 1 ? '📡 Dish 28k' : '⚡ Laser 128k');
    case 5: return choice === 0 ? '❄️ Passive' : (choice === 1 ? '❄️ Wings +30%' : '❄️ Pump +60%');
    case 6: return choice === 0 ? '🎯 RCS' : (choice === 1 ? '🎯 Wheels +15%' : '🎯 Dual +30%');
    case 7: return choice === 0 ? '🚜 Scout 1.0×' : (choice === 1 ? '🚜 Arm 1.1×' : '🚜 Vault 1.2×');
    case 8: return choice === 0 ? '⛽ 28 t Fuel' : (choice === 1 ? '⛽ 34 t Fuel' : '⛽ 40 t Fuel');
    default: return `${p.mass} t`;
  }
}

function componentCard(hangar, slot, choice) {
  const preview = componentPreview(hangar.loadout, hangar.destination.id, slot, choice),
        p = preview.part,
        installed = hangar.installed[slot] && hangar.loadout[slot] === choice;
  Object.assign(preview.after, hangar.buildCheck(preview.after));
  const cardTitle = p.name;
  const primarySpec = getPrimarySpec(slot, choice, p);

  return `<button class="compact-part-card ${installed ? 'selected' : ''}" data-part="${choice}" data-demand="${p.demand}" data-margin="${preview.after.powerMargin}" aria-label="Install ${cardTitle}" aria-pressed="${installed}" title="${p.description}">
    <div class="part-header-line">
      <span class="part-pill-num">0${choice + 1}</span>
      <span class="part-tag-badge">${p.tag}</span>
    </div>
    <div class="part-preview-stage" aria-hidden="true">
      <div class="pedestal-halo"></div>
      <div class="pedestal-disc"></div>
    </div>
    <strong class="part-title">${cardTitle}</strong>
    <div class="part-stats-row">
      <span class="stat-badge spec" title="Primary Specification">${primarySpec}</span>
      <span class="stat-badge mass" title="Dry Mass">⚖️ ${p.mass} t</span>
      <span class="stat-badge cost" title="Hardware Cost">💰 $${p.cost}M</span>
    </div>
  </button>`;
}

const OFFSETS = [[0,0,11],[11,0,0],[0,-8,0],[0,9,0],[0,-9,-7],[8,8,7],[0,6,-12],[0,-10,7],[-10,-4,5]];
const MOUNTS = [[2,0,6],[3.5,0,0],[1.9,0,-1],[0,3,-1],[0,-3,-3],[3,2,3],[1.7,1,-5],[0,-2.5,1],[-3,-1,1]];

export class AssemblyHangar {
  constructor(root, loadout, destination, onChange, onSound) {
    this.root = root;
    this.loadout = normalizeLoadout(loadout);
    this.destination = destination;
    this.onChange = onChange;
    this.onSound = onSound;
    this.slot = 0;
    this.installed = SYSTEMS.map(() => false);
    this.modules = [];
    this.animations = [];
    this.exploded = false;
    this.time = 0;
    this.disposed = false;
    this.missionClass = 'discovery';
    this.launchVehicle = 'falcon9_medium';

    root.innerHTML = `<div class="hangar-layout">
      <!-- Left/Center: Primary 3D Spacecraft Viewport & Workbench -->
      <section class="hangar-workbench">
        <!-- Sleek Topline Header -->
        <div class="hangar-topline">
          <div class="hangar-brand-line">
            <span class="hangar-title-tag">ORBITAL ASSEMBLY BAY</span>
            <span class="hangar-sep">//</span>
            <span class="hangar-vessel-name">ODYSSEY 07</span>
          </div>
          <div class="hangar-stage-badge" id="hangar-stage-badge">STAGE 01 / 09 • PROPULSION</div>
          <div class="hangar-quick-actions">
            <button type="button" data-hangar="suggested" class="quick-act-btn cta" title="Auto-build recommended balanced spacecraft">✨ AUTO-BUILD</button>
            <button type="button" data-hangar="remove" class="quick-act-btn" title="Remove current module">✕ REMOVE</button>
            <button type="button" data-hangar="explode" class="quick-act-btn" aria-pressed="false" title="Toggle exploded view">💥 EXPLODED</button>
            <button type="button" data-hangar="reset" class="quick-act-btn" title="Reset camera view">↺ RESET</button>
          </div>
        </div>

        <!-- Centerpiece 3D Viewport (Expanded!) -->
        <div class="hangar-stage">
          <div class="hangar-canvas"></div>
          <div class="hangar-overlay">
            <div class="viewport-mission-tag">
              <span class="live-dot"></span>
              <span class="dest-label">${destination.name} EXPEDITION</span>
              <span class="dest-dist">${designStats(loadout,destination.id).sunDistance} AU</span>
            </div>
            <p id="assembly-message" class="assembly-hud-msg" role="status" aria-live="polite">STAGE 01 / 09 • SELECT PROPULSION MODULE</p>
          </div>
          <div class="hangar-tools">
            <button data-hangar="left" aria-label="Rotate left">↶</button>
            <button data-hangar="right" aria-label="Rotate right">↷</button>
            <button data-hangar="zoom" aria-label="Zoom in">＋</button>
            <button data-hangar="out" aria-label="Zoom out">−</button>
          </div>
          <span class="hangar-hint">DRAG TO ROTATE · SCROLL TO ZOOM</span>
        </div>

        <!-- Sleek 9-Subsystem Stepper Navigation (All 9 Modules Visible) -->
        <div class="hangar-section-nav">
          <button data-hangar="previous-section" aria-label="Previous subsystem" class="nav-chevron">‹</button>
          <div class="hangar-slots" role="group" aria-label="Assembly subsystems">
            ${SYSTEMS.map((s,i)=>{
              const tab = SUBSYSTEM_TABS[i] || { icon: '⚙️', name: s.label.replace(/^\d+\s*[\/•]\s*/,'') };
              return `<button data-slot="${i}" aria-pressed="${i===0}" class="slot-pill-btn" title="${tab.name}">
                <div class="slot-header-line">
                  <span class="slot-icon">${tab.icon}</span>
                  <span class="slot-num">0${i+1}</span>
                </div>
                <span class="slot-title">${tab.name}</span>
                <span class="slot-check" id="check-${i}"></span>
              </button>`;
            }).join('')}
          </div>
          <button data-hangar="next-section" aria-label="Next subsystem" class="nav-chevron">›</button>
        </div>

        <!-- Component Selection Dock -->
        <div class="hangar-catalog">
          <div class="part-previews" aria-hidden="true"></div>
          <div class="hangar-options"></div>
        </div>
      </section>

      <!-- Right: Sleek Modern Aerospace Flight Readiness HUD -->
      <aside class="hangar-readiness">
        <div class="readiness-header">
          <div class="dest-badge-row">
            <span class="dest-pill">${destination.name}</span>
            <span class="status-pill" id="hud-readiness-pill">IN PROGRESS</span>
          </div>
          <h3 class="readiness-headline">FLIGHT READINESS</h3>
        </div>

        <!-- Telemetry Gauges -->
        <div id="hangar-stats" class="readiness-stats-hud"></div>

        <!-- Collapsible Mission Architecture Configuration -->
        <details class="readiness-accordion" id="arch-accordion">
          <summary><span class="acc-icon">⚙️</span> MISSION ARCHITECTURE <span class="acc-caret">▾</span></summary>
          <div class="accordion-body">
            <div class="arch-control-group">
              <label for="mission-class-select">MISSION CLASS &amp; BUDGET</label>
              <select id="mission-class-select" aria-label="Select NASA Mission Class">
                ${NASA_MISSION_CLASSES.map(c=>`<option value="${c.id}" ${c.id===this.missionClass?'selected':''}>${c.icon} ${c.badge} — ${c.tag}</option>`).join('')}
              </select>
            </div>
            <div class="arch-control-group">
              <label for="launch-vehicle-select">LAUNCH VEHICLE &amp; FAIRING</label>
              <select id="launch-vehicle-select" aria-label="Select Launch Vehicle">
                ${LAUNCH_VEHICLES.map(lv=>`<option value="${lv.id}" ${lv.id===this.launchVehicle?'selected':''}>${lv.icon} ${lv.name} [${lv.maxPayloadMass} t] — +$${lv.cost}M</option>`).join('')}
              </select>
            </div>
            <div class="arch-control-group">
              <label for="difficulty-select">FLIGHT DIFFICULTY</label>
              <select id="difficulty-select">
                <option value="explorer">EXPLORER · Forgiving damage</option>
                <option value="expedition">EXPEDITION · Realistic damage</option>
              </select>
            </div>
          </div>
        </details>

        <!-- Collapsible Advanced Science -->
        <details class="readiness-accordion" id="science-accordion">
          <summary><span class="acc-icon">🔬</span> ADVANCED ORBITAL READOUTS <span class="acc-caret">▾</span></summary>
          <div class="accordion-body" id="advanced-stats-body"></div>
        </details>

        <!-- Primary Launch Action Button -->
        <div class="sidebar-launch-bay">
          <button class="primary-button launch-action-btn" id="launch-button" disabled>
            <span>COMMIT &amp; LAUNCH</span>
            <span class="btn-arrow">↗</span>
          </button>
          <span class="launch-subtext" id="assembly-readiness">INSTALL 9 MODULES TO LAUNCH</span>
        </div>
      </aside>
    </div>`;

    this.change = e => {
      if (e.target.id === 'mission-class-select') {
        this.missionClass = e.target.value;
        this.refresh();
      }
      if (e.target.id === 'launch-vehicle-select') {
        this.launchVehicle = e.target.value;
        this.refresh();
      }
    };
    root.addEventListener('change', this.change);

    // Three.js 3D Scene Initialization
    this.scene = new T.Scene();
    this.scene.background = new T.Color(0x030712);
    this.scene.fog = new T.FogExp2(0x030712, 0.008);

    // Subtle background stars
    const starGeo = new T.BufferGeometry();
    const starCount = 350;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 220;
      starPositions[i + 1] = (Math.random() - 0.5) * 220;
      starPositions[i + 2] = (Math.random() - 0.5) * 220;
    }
    starGeo.setAttribute('position', new T.BufferAttribute(starPositions, 3));
    const starMat = new T.PointsMaterial({
      color: 0x88ccff,
      size: 0.8,
      transparent: true,
      opacity: 0.65
    });
    this.scene.add(new T.Points(starGeo, starMat));

    // Orbital Lighting
    this.scene.add(new T.HemisphereLight(0xc3eaff, 0x162539, 2.4));
    const mainLight = new T.DirectionalLight(0xffffff, 3.8);
    mainLight.position.set(14, 24, 12);
    this.scene.add(mainLight);
    const rimLight = new T.PointLight(0x00E5FF, 180, 80);
    rimLight.position.set(-10, 6, -10);
    this.scene.add(rimLight);

    this.ship = vehicleBus();
    this.scene.add(this.ship);

    // Orbital Drydock Rings
    const grid = new T.GridHelper(140, 70, 0x1c5969, 0x091824);
    grid.position.y = -5;
    this.scene.add(grid);
    for (let r = 13; r <= 17; r += 2) {
      const ring = new T.Mesh(new T.TorusGeometry(r, 0.035, 6, 128), new T.MeshBasicMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.55 }));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -4.95;
      this.scene.add(ring);
    }

    // Robotic Assembly Arm
    this.robot = new T.Group();
    this.scene.add(this.robot);
    const armMat = new T.MeshStandardMaterial({ color: 0x617b8a, metalness: 0.75, roughness: 0.28 });
    const jointMat = new T.MeshStandardMaterial({ color: 0x00E5FF, emissive: 0x0088aa, emissiveIntensity: 1.2 });
    this.armLinks = [0, 1].map(() => {
      const m = new T.Mesh(new T.CylinderGeometry(0.17, 0.22, 1, 12), armMat);
      this.robot.add(m);
      return m;
    });
    this.armJoints = [0, 1, 2].map(() => {
      const m = new T.Mesh(new T.SphereGeometry(0.38, 12, 12), jointMat);
      this.robot.add(m);
      return m;
    });
    this.armTip = new T.Vector3(9, -2, 3);

    this.camera = new T.PerspectiveCamera(40, 1, 0.1, 200);
    this.camera.position.set(13, 9.8, 15.5);

    this.renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setClearColor(0x030712);
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    this.host = root.querySelector('.hangar-canvas');
    this.host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label', '3D spacecraft assembly viewport');

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.minDistance = 16;
    this.controls.maxDistance = 65;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.enablePan = false;

    // Component preview renderer
    this.previewHost = root.querySelector('.part-previews');
    this.previewRenderer = new T.WebGLRenderer({ antialias: true, alpha: true });
    this.previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.3));
    this.previewHost.append(this.previewRenderer.domElement);
    this.previewScenes = [];
    this.previewCamera = new T.PerspectiveCamera(34, 1, 0.1, 150);
    this.previewCamera.position.set(0, 3.2, 23);
    this.previewCamera.lookAt(0, 0, 0);

    this.resize = new ResizeObserver(() => this.size());
    this.resize.observe(this.host);
    this.resize.observe(this.previewHost);

    this.click = e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.slot !== undefined) this.selectSlot(+b.dataset.slot);
      if (b.dataset.part !== undefined) this.install(+b.dataset.part);
      if (b.dataset.hangar) this.action(b.dataset.hangar);
    };
    root.addEventListener('click', this.click);

    this.navigate = e => {
      if (!e.target.closest('.hangar-section-nav') || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      e.preventDefault();
      this.selectSlot(Math.max(0, Math.min(SYSTEMS.length - 1, this.slot + (e.key === 'ArrowRight' ? 1 : -1))));
      this.root.querySelector(`[data-slot="${this.slot}"]`)?.focus({ preventScroll: true });
    };
    root.addEventListener('keydown', this.navigate);

    this.selectSlot(0);
    this.size();
    this.autoEquipAll();
  }

  autoEquipAll() {
    try {
      const build = suggestedBuild(this.destination.id);
      for (let i = 0; i < SYSTEMS.length; i++) {
        const choice = (build && build.loadout && build.loadout[i] !== undefined) ? build.loadout[i] : 0;
        this.loadout[i] = choice;
        this.installed[i] = true;
        if (this.modules[i]) {
          this.ship.remove(this.modules[i]);
          disposeModel(this.modules[i]);
        }
        const part = vehicleModule(i, choice);
        part.userData.flames.forEach(f => f.visible = false);
        part.position.fromArray(OFFSETS[i]);
        this.ship.add(part);
        this.modules[i] = part;
        this.animations[i] = 0;
      }
      this.animations = this.animations.map(() => 0);
      this.onChange([...this.loadout]);
      this.selectSlot(0);
      this.ready = true;
      this.refresh();
      const lb = this.root.querySelector('#launch-button');
      if (lb) lb.disabled = false;
    } catch (err) {
      console.error('autoEquipAll error:', err);
    }
  }

  size() {
    if (this.disposed) return;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (w && h) {
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.render(this.scene, this.camera);
    }
    const pw = this.previewHost.clientWidth, ph = this.previewHost.clientHeight;
    if (pw && ph) {
      this.previewRenderer.setSize(pw, ph);
      const vpH = Math.max(40, Math.round(ph * 0.62));
      this.previewCamera.aspect = (pw / 3) / vpH;
      this.previewCamera.updateProjectionMatrix();
    }
  }

  revealSlot() {
    const strip = this.root.querySelector('.hangar-slots'),
          button = strip.querySelector(`[data-slot="${this.slot}"]`);
    if (button) {
      strip.scrollTo({ left: button.offsetLeft - strip.offsetLeft - (strip.clientWidth - button.offsetWidth) / 2, behavior: 'auto' });
    }
    this.root.querySelector('[data-hangar="previous-section"]').disabled = this.slot === 0;
    this.root.querySelector('[data-hangar="next-section"]').disabled = this.slot === SYSTEMS.length - 1;
  }

  selectSlot(slot) {
    this.slot = slot;
    this.revealSlot();
    this.root.querySelectorAll('[data-slot]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.slot === slot)));
    const slotNum = String(slot + 1).padStart(2, '0');
    const tab = SUBSYSTEM_TABS[slot] || { icon: '⚙️', name: SYSTEMS[slot].label.replace(/^\d+\s*[\/•]\s*/,'') };
    
    const stageBadge = this.root.querySelector('#hangar-stage-badge');
    if (stageBadge) stageBadge.textContent = `STAGE ${slotNum} / 09 • ${tab.name}`;

    const msgEl = this.root.querySelector('#assembly-message');
    if (msgEl) {
      msgEl.textContent = this.installed[slot]
        ? `${tab.name} // ${SYSTEMS[slot].choices[this.loadout[slot]].name.toUpperCase()} INSTALLED`
        : `STAGE ${slotNum} / 09 • SELECT ${tab.name} MODULE`;
    }

    this.root.querySelector('.hangar-options').innerHTML = SYSTEMS[slot].choices.map((p, i) => componentCard(this, slot, i)).join('');
    this.previewScenes.forEach(s => disposeModel(s));
    this.previewScenes = [];

    for (let i = 0; i < 3; i++) {
      const s = new T.Scene();
      s.add(new T.HemisphereLight(0xffffff, 0x09253d, 3.2));
      const l = new T.DirectionalLight(0xd9f8ff, 4.2);
      l.position.set(4, 9, 11);
      s.add(l);
      const rim = new T.PointLight(0x00E5FF, 7, 28);
      rim.position.set(0, -2.6, 5);
      s.add(rim);
      const part = vehicleModule(slot, i);
      part.userData.flames.forEach(f => f.visible = false);
      const bounds = new T.Box3().setFromObject(part),
            center = bounds.getCenter(new T.Vector3()),
            size = bounds.getSize(new T.Vector3());
      part.position.sub(center);
      const pivot = new T.Group();
      pivot.add(part);
      pivot.scale.setScalar(18 / Math.max(size.x, size.y, size.z));
      s.add(pivot);
      s.userData.pivot = pivot;
      this.previewScenes.push(s);
    }
    this.refresh();
  }

  install(choice) {
    const slot = this.slot;
    this.loadout[slot] = choice;
    this.installed[slot] = true;
    if (this.modules[slot]) {
      this.ship.remove(this.modules[slot]);
      disposeModel(this.modules[slot]);
    }
    const part = vehicleModule(slot, choice);
    part.userData.flames.forEach(f => f.visible = false);
    part.position.fromArray(OFFSETS[slot]);
    part.position.multiplyScalar(1.5);
    this.ship.add(part);
    this.modules[slot] = part;
    this.animations[slot] = 1;
    this.onChange([...this.loadout]);
    this.onSound();
    this.selectSlot(slot);
    this.root.querySelector('#assembly-message').textContent = `${SYSTEMS[slot].choices[choice].name.toUpperCase()} SECURED`;
    this.root.querySelector(`[data-part="${choice}"]`)?.focus({ preventScroll: true });
  }

  action(action) {
    if (action === 'suggested') {
      const build = suggestedBuild(this.destination.id);
      for (let i = 0; i < SYSTEMS.length; i++) {
        this.selectSlot(i);
        this.install(build.loadout[i]);
      }
      this.selectSlot(0);
      this.root.querySelector('#assembly-message').textContent = 'BALANCED CONFIGURATION VERIFIED // READY FOR LAUNCH';
    }
    if (action === 'previous-section' || action === 'next-section') {
      this.selectSlot(Math.max(0, Math.min(SYSTEMS.length - 1, this.slot + (action === 'next-section' ? 1 : -1))));
    }
    if (action === 'left' || action === 'right') {
      const v = this.camera.position.clone().applyAxisAngle(new T.Vector3(0, 1, 0), action === 'left' ? -0.25 : 0.25);
      this.camera.position.copy(v);
    }
    if (action === 'zoom' || action === 'out') {
      this.camera.position.multiplyScalar(action === 'zoom' ? 0.85 : 1.15).clampLength(16, 65);
    }
    if (action === 'reset') {
      this.camera.position.set(13, 9.8, 15.5);
      this.controls.target.set(0, 0, 0);
    }
    if (action === 'explode') {
      this.exploded = !this.exploded;
      this.root.querySelector('[data-hangar="explode"]').setAttribute('aria-pressed', String(this.exploded));
    }
    if (action === 'remove' && this.installed[this.slot]) {
      this.ship.remove(this.modules[this.slot]);
      disposeModel(this.modules[this.slot]);
      this.modules[this.slot] = null;
      this.installed[this.slot] = false;
      this.animations[this.slot] = 0;
      this.root.querySelector('#assembly-message').textContent = `STAGE ${this.slot + 1} / 09 • MODULE DISENGAGED`;
      this.selectSlot(this.slot);
    }
    this.refresh();
  }

  getArchitecture() {
    return {
      missionClass: this.missionClass,
      launchVehicle: this.launchVehicle
    };
  }

  buildCheck(stats) {
    const issues = [];
    const missionClass = NASA_MISSION_CLASSES.find(c => c.id === this.missionClass) || NASA_MISSION_CLASSES[0];
    const launchVehicle = LAUNCH_VEHICLES.find(lv => lv.id === this.launchVehicle) || LAUNCH_VEHICLES[0];
    const costLimit = missionClass.costLimit;
    const launcherMassLimit = launchVehicle.maxPayloadMass;
    const classMassLimit = missionClass.baseMassLimit;
    const massLimit = Math.min(launcherMassLimit, classMassLimit);
    const totalCost = stats.cost + launchVehicle.cost;

    if (totalCost > costLimit) issues.push(`Total cost ($${totalCost}M) exceeds ${missionClass.shortName} cap ($${costLimit}M)`);
    if (stats.mass > launcherMassLimit) issues.push(`Payload mass (${stats.mass.toFixed(1)} t) exceeds ${launchVehicle.shortName} fairing limit (${launcherMassLimit} t)`);
    if (stats.mass > classMassLimit) issues.push(`Payload mass (${stats.mass.toFixed(1)} t) exceeds ${missionClass.shortName} mass cap (${classMassLimit} t)`);
    if (stats.powerMargin < 0) issues.push('Power deficit: choose a stronger power generator or lower-demand parts');
    return { issues, valid: issues.length === 0, massLimit, costLimit, totalCost, missionClass, launchVehicle };
  }

  refresh() {
    const stats = designStats(this.loadout, this.destination.id, this.missionClass, this.launchVehicle);
    Object.assign(stats, this.buildCheck(stats));
    const count = this.installed.filter(Boolean).length,
          complete = count === SYSTEMS.length,
          busy = this.animations.some(n => n > 0);
    this.ready = complete && stats.valid;

    // Update 9 slot buttons and check indicators
    this.root.querySelectorAll('[data-slot]').forEach((b, i) => {
      b.classList.toggle('socket-installed', this.installed[i]);
      const checkEl = this.root.querySelector('#check-' + i);
      if (checkEl) checkEl.textContent = this.installed[i] ? '✓' : '';
    });

    const installedParts = stats.parts.filter((_, i) => this.installed[i]);
    const currentHardwareCost = 60 + installedParts.reduce((n, p) => n + p.cost, 0);
    const currentTotalCost = currentHardwareCost + stats.launchVehicle.cost;
    const currentMass = 12 + (this.installed[8] ? stats.fuelMass : 0) + installedParts.reduce((n, p) => n + p.mass, 0);

    // Calculate progress ratios
    const budgetRatio = currentTotalCost / stats.missionClass.costLimit;
    const budgetPercent = Math.min(100, Math.round(budgetRatio * 100));
    const budgetStatus = currentTotalCost <= stats.missionClass.costLimit ? 'UNDER BUDGET' : 'OVER BUDGET';
    const budgetClass = currentTotalCost <= stats.missionClass.costLimit ? (budgetRatio > 0.88 ? 'warn' : 'good') : 'bad';

    const massRatio = currentMass / stats.launchVehicle.maxPayloadMass;
    const massPercent = Math.min(100, Math.round(massRatio * 100));
    const massStatus = currentMass <= stats.launchVehicle.maxPayloadMass ? 'NOMINAL' : 'OVER LIMIT';
    const massClass = currentMass <= stats.launchVehicle.maxPayloadMass ? (massRatio > 0.9 ? 'warn' : 'good') : 'bad';

    const powerStatus = stats.powerMargin >= 0 ? 'OPTIMAL' : 'DEFICIT';
    const powerClass = stats.powerMargin >= 0 ? 'good' : 'bad';
    const powerPercent = stats.powerMargin >= 0 ? 100 : Math.max(15, Math.round(100 + stats.powerMargin * 25));

    const speedPercent = Math.min(100, Math.round((stats.deltaV / 3.0) * 100));

    const sysPercent = Math.round((count / SYSTEMS.length) * 100);
    const sysStatus = complete && stats.valid ? 'ALL SYSTEMS VERIFIED' : `${count} / ${SYSTEMS.length} INSTALLED`;
    const sysClass = complete && stats.valid ? 'good' : 'warn';

    const hudReadinessPill = this.root.querySelector('#hud-readiness-pill');
    if (hudReadinessPill) {
      hudReadinessPill.textContent = complete && stats.valid ? 'READY FOR LAUNCH' : `ASSEMBLY: ${count}/9`;
      hudReadinessPill.className = `status-pill ${complete && stats.valid ? 'good' : 'warn'}`;
    }

    // Render Compact Visual Telemetry Gauges in Sidebar
    const gaugesHtml = `
      <div class="hud-telemetry-cluster">
        <div class="hud-gauge-card ${budgetClass}">
          <div class="gauge-head">
            <span class="gauge-label"><span class="icon">💰</span> MISSION BUDGET</span>
            <b class="gauge-val">$${currentTotalCost}M <span class="cap">/ $${stats.missionClass.costLimit}M</span></b>
          </div>
          <div class="gauge-track"><div class="gauge-bar ${budgetClass}" style="width: ${budgetPercent}%"></div></div>
          <div class="gauge-foot"><span class="status-indicator ${budgetClass}">${budgetStatus}</span></div>
        </div>

        <div class="hud-gauge-card ${massClass}">
          <div class="gauge-head">
            <span class="gauge-label"><span class="icon">⚖️</span> PAYLOAD MASS</span>
            <b class="gauge-val">${currentMass.toFixed(1)} t <span class="cap">/ ${stats.launchVehicle.maxPayloadMass} t</span></b>
          </div>
          <div class="gauge-track"><div class="gauge-bar ${massClass}" style="width: ${massPercent}%"></div></div>
          <div class="gauge-foot"><span class="status-indicator ${massClass}">${massStatus}</span></div>
        </div>

        <div class="hud-gauge-card ${powerClass}">
          <div class="gauge-head">
            <span class="gauge-label"><span class="icon">⚡</span> POWER STATUS</span>
            <b class="gauge-val">${stats.powerMargin >= 0 ? '+' : ''}${stats.powerMargin.toFixed(2)} kW</b>
          </div>
          <div class="gauge-track"><div class="gauge-bar ${powerClass}" style="width: ${powerPercent}%"></div></div>
          <div class="gauge-foot"><span class="status-indicator ${powerClass}">POWER: ${powerStatus}</span></div>
        </div>

        <div class="hud-gauge-card speed">
          <div class="gauge-head">
            <span class="gauge-label"><span class="icon">🚀</span> PROJECTED Δv</span>
            <b class="gauge-val">${stats.deltaV.toFixed(2)} km/s</b>
          </div>
          <div class="gauge-track"><div class="gauge-bar speed" style="width: ${speedPercent}%"></div></div>
          <div class="gauge-foot"><span class="status-indicator speed">ORBITAL TRANSFER SPEED</span></div>
        </div>

        <div class="hud-gauge-card ${sysClass}">
          <div class="gauge-head">
            <span class="gauge-label"><span class="icon">🛡️</span> SYSTEMS CHECK</span>
            <b class="gauge-val">${count} / ${SYSTEMS.length}</b>
          </div>
          <div class="gauge-track"><div class="gauge-bar ${sysClass}" style="width: ${sysPercent}%"></div></div>
          <div class="gauge-foot"><span class="status-indicator ${sysClass}">${sysStatus}</span></div>
        </div>
      </div>
    `;

    this.root.querySelector('#hangar-stats').innerHTML = gaugesHtml;

    // Advanced Stats Body
    const advRows = [
      ['SPACECRAFT HARDWARE', `$${currentHardwareCost}M`],
      ['LAUNCH PROCUREMENT', `$${stats.launchVehicle.cost}M`],
      ['INITIAL ACCEL.', stats.acceleration < 0.001 ? stats.acceleration.toExponential(2) + ' m/s²' : stats.acceleration.toFixed(2) + ' m/s²'],
      ['GENERATED POWER', `${stats.generatedKW.toFixed(2)} kW`],
      ['POWER DEMAND', `${stats.demandKW.toFixed(2)} kW`],
      ['PROPELLANT BURN', stats.burnSeconds > 86400 ? (stats.burnSeconds / 86400).toFixed(0) + ' days' : (stats.burnSeconds / 60).toFixed(1) + ' min'],
      ['RELAY SPEED', '×' + stats.link.toFixed(2)],
      ['COOLING RATE', '×' + stats.cooling.toFixed(1)],
      ['ATTITUDE RESPONSE', '×' + stats.handling.toFixed(2)],
      ['SCIENCE MULTIPLIER', '×' + (stats.yield * stats.recovery).toFixed(2)]
    ];
    const advEl = this.root.querySelector('#advanced-stats-body');
    if (advEl) {
      advEl.innerHTML = advRows.map(([lbl, val]) => `<div class="adv-stat-row"><span>${lbl}</span><b>${val}</b></div>`).join('');
    }

    const readinessText = this.ready
      ? 'READY FOR LAUNCH // ALL SYSTEMS NOMINAL'
      : !complete
      ? `STAGE ${count + 1} / 09 • ${SYSTEMS.length - count} MODULES REMAINING`
      : busy
      ? 'SECURING MODULE MOUNT...'
      : stats.issues[0];

    const readinessEl = this.root.querySelector('#assembly-readiness');
    if (readinessEl) readinessEl.textContent = readinessText;

    const lb = this.root.querySelector('#launch-button');
    if (lb) lb.disabled = !this.ready;

    this.renderer.render(this.scene, this.camera);
    const rmBtn = this.root.querySelector('[data-hangar="remove"]');
    if (rmBtn) rmBtn.disabled = !this.installed[this.slot];
  }

  update(dt) {
    if (this.disposed) return;
    this.time += dt;
    let finished = false;
    this.modules.forEach((m, i) => {
      if (!m) return;
      if (this.animations[i] > 0) {
        this.animations[i] = Math.max(0, this.animations[i] - dt * 0.8);
        if (!this.animations[i]) finished = true;
      }
      const target = new T.Vector3().fromArray(OFFSETS[i]).multiplyScalar(this.exploded ? 0.65 : 0);
      if (this.animations[i] > 0) target.add(new T.Vector3().fromArray(OFFSETS[i]).multiplyScalar(this.animations[i] ** 3 * 1.5));
      m.position.lerp(target, Math.min(1, dt * 10));
    });
    if (finished) {
      this.refresh();
    }
    const active = this.animations.findIndex(n => n > 0);
    const target = active >= 0 ? new T.Vector3().fromArray(MOUNTS[active]).add(this.modules[active].position) : new T.Vector3(9, -2, 3);
    this.armTip.lerp(target, Math.min(1, dt * 4));
    const base = new T.Vector3(12, -4.7, 4), elbow = base.clone().lerp(this.armTip, 0.45);
    elbow.y += 4;
    const points = [base, elbow, this.armTip];
    this.armJoints.forEach((m, i) => m.position.copy(points[i]));
    this.armLinks.forEach((m, i) => {
      const a = points[i], b = points[i + 1], direction = b.clone().sub(a);
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.scale.y = direction.length();
      m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction.normalize());
    });
    this.controls.update();
    this.renderer.render(this.scene, this.camera);

    const w = this.previewHost.clientWidth, h = this.previewHost.clientHeight;
    if (w && h) {
      const btns = this.root.querySelectorAll('.hangar-options button');
      this.previewRenderer.setScissorTest(true);
      // In WebGL bottom-left is (0,0). Restrict rotating 3D preview strictly to the upper 62% of the card,
      // leaving the bottom 38% exclusively for the part title and 3-stat telemetry chips.
      const vpH = Math.max(40, Math.round(h * 0.62));
      const vpY = Math.max(30, Math.round(h * 0.38));
      this.previewScenes.forEach((s, i) => {
        s.userData.pivot.rotation.set(0.18, this.time * 0.35 + i * 0.7, 0);
        let left = i * w / 3, width = w / 3;
        if (btns && btns[i]) {
          left = btns[i].offsetLeft;
          width = btns[i].offsetWidth;
        }
        this.previewRenderer.setViewport(left, vpY, width, vpH);
        this.previewRenderer.setScissor(left, vpY, width, vpH);
        this.previewRenderer.render(s, this.previewCamera);
      });
      this.previewRenderer.setScissorTest(false);
    }
  }

  dispose() {
    this.disposed = true;
    this.resize.disconnect();
    this.root.removeEventListener('click', this.click);
    this.root.removeEventListener('keydown', this.navigate);
    this.root.removeEventListener('change', this.change);
    this.controls.dispose();
    disposeModel(this.scene);
    this.previewScenes.forEach(disposeModel);
    this.renderer.dispose();
    this.previewRenderer.dispose();
    this.renderer.forceContextLoss();
    this.previewRenderer.forceContextLoss();
  }
}
