/**
 * MISSION FORGE: PROJECT AURORA
 * 4-Player Multi-Crew Collaboration System (NASA Mission Control)
 * Path: src/game/src/crew.js
 *
 * Implements full collaborative team play for up to 4 participants:
 * - 4 Authentic NASA Roles:
 *   [1] FLIGHT DIRECTOR (FLIGHT) - Mission Architecture, Trajectory Profile & Go/No-Go Launch Approval
 *   [2] SPACECRAFT SYSTEMS ENGINEER (SYSTEMS / EECOM) - Subsystems, Power Bus & Mass Budgeting
 *   [3] SCIENCE PAYLOAD SPECIALIST (SCIENCE) - Instruments, Spectral Absorption Bands & Planetary Claims
 *   [4] COMMS & FLIGHT DYNAMICS (COMMS / FIDO) - DSN Link, Real-time Power Routing & Emergency Triage
 * - Features:
 *   - Local Pass-and-Play / Shared Terminal seat switching
 *   - Cross-Tab / Multi-Window real-time P2P synchronization via BroadcastChannel ('mission_aurora_crew')
 *   - Interactive Pre-Launch Roll-Call (NASA GO / NO-GO Flight Readiness Poll)
 *   - Multi-Station Anomaly Triage with role-specific advisory recommendations
 *   - 4-Crew Team Debrief & multi-signature NASA Certificate
 */

export const CREW_ROLES = [
  {
    id: 'flight',
    code: 'FLIGHT',
    title: 'Flight Director',
    callsign: 'FLIGHT',
    icon: '🚀',
    color: '#00e5ff',
    badgeClass: 'role-flight',
    domain: 'Mission Architecture & Flight Authority',
    responsibilities: 'NASA Program budget cap, launch vehicle selection, trajectory profile, and final launch authorization.',
    defaultName: 'Commander Alex'
  },
  {
    id: 'systems',
    code: 'SYSTEMS',
    title: 'Spacecraft Systems Engineer',
    callsign: 'EECOM',
    icon: '🛠️',
    color: '#ffaa00',
    badgeClass: 'role-systems',
    domain: 'Spacecraft Systems & Mass/Power Balance',
    responsibilities: 'Vehicle assembly, propulsion, power generation vs. hotel loads, armor plating, and thermal cooling loops.',
    defaultName: 'Engineer Maya'
  },
  {
    id: 'science',
    code: 'SCIENCE',
    title: 'Science Payload Specialist',
    callsign: 'SCIENCE',
    icon: '🔬',
    color: '#00ffaa',
    badgeClass: 'role-science',
    domain: 'Planetary Science & Investigation',
    responsibilities: 'Instrument suite configuration, spectral absorption band tuning, landing site analysis, and scientific claim verification.',
    defaultName: 'Dr. Jordan'
  },
  {
    id: 'comms',
    code: 'COMMS',
    title: 'Comms & Flight Dynamics Officer',
    callsign: 'FIDO / CAPCOM',
    icon: '📡',
    color: '#bb88ff',
    badgeClass: 'role-comms',
    domain: 'DSN Telemetry, Power Grid & Triage',
    responsibilities: 'Deep Space Network links, speed-of-light delays, real-time power bus routing (Engines/Science/Shields), and anomaly defense.',
    defaultName: 'Officer Sam'
  }
];

class CrewManager {
  constructor() {
    this.storageKey = 'aurora-crew-manifest';
    this.modeKey = 'aurora-mission-mode';
    this.channelName = 'mission_aurora_crew_broadcast';
    
    // Load persisted state or defaults
    this.mode = this.loadMode();
    this.roster = this.loadRoster();
    this.activeRole = 'flight';
    this.pollVotes = { flight: false, systems: false, science: false, comms: false };
    this.listeners = new Set();

    // BroadcastChannel for seamless multi-window/multi-tab local networking
    this.channel = null;
    this.initBroadcast();
  }

  initBroadcast() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.onmessage = (event) => {
          if (!event?.data) return;
          this.handleBroadcastMessage(event.data);
        };
      } catch (err) {
        console.warn('BroadcastChannel unavailable:', err);
      }
    }
  }

  broadcast(type, payload = {}) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload, timestamp: Date.now() });
      } catch (err) {
        console.warn('Broadcast send error:', err);
      }
    }
  }

  handleBroadcastMessage(msg) {
    const { type, payload } = msg;
    if (type === 'ROSTER_UPDATE') {
      this.roster = payload.roster;
      this.saveRoster();
      this.emit('rosterChanged', this.roster);
    } else if (type === 'MODE_UPDATE') {
      this.mode = payload.mode;
      this.saveMode();
      this.emit('modeChanged', this.mode);
    } else if (type === 'ROLE_SWITCH') {
      this.activeRole = payload.roleId;
      this.emit('roleSwitched', this.activeRole);
    } else if (type === 'POLL_VOTE') {
      this.pollVotes[payload.roleId] = payload.vote;
      this.emit('pollUpdated', this.pollVotes);
    } else if (type === 'POLL_RESET') {
      this.resetPoll();
      this.emit('pollReset');
    }
  }

  loadMode() {
    try {
      return localStorage.getItem(this.modeKey) || 'solo';
    } catch {
      return 'solo';
    }
  }

  saveMode(mode = this.mode) {
    this.mode = mode;
    try {
      localStorage.setItem(this.modeKey, mode);
    } catch {}
    this.broadcast('MODE_UPDATE', { mode });
  }

  isCrewMode() {
    return this.mode === 'crew';
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    this.saveMode(mode);
    this.emit('modeChanged', mode);
  }

  loadRoster() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      if (Array.isArray(saved) && saved.length === 4) {
        return saved;
      }
    } catch {}
    return CREW_ROLES.map(r => ({
      id: r.id,
      name: r.defaultName,
      title: r.title,
      callsign: r.callsign,
      roleId: r.id
    }));
  }

  saveRoster(roster = this.roster) {
    this.roster = roster;
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(roster));
    } catch {}
    this.broadcast('ROSTER_UPDATE', { roster });
  }

  getMember(roleId) {
    return this.roster.find(m => m.id === roleId) || {
      id: roleId,
      name: 'Officer',
      title: 'Specialist'
    };
  }

  getActiveRoleMeta() {
    return CREW_ROLES.find(r => r.id === this.activeRole) || CREW_ROLES[0];
  }

  setActiveRole(roleId) {
    if (this.activeRole === roleId) return;
    this.activeRole = roleId;
    this.broadcast('ROLE_SWITCH', { roleId });
    this.emit('roleSwitched', roleId);
  }

  // --- GO / NO-GO Flight Readiness Poll ---
  resetPoll() {
    this.pollVotes = { flight: false, systems: false, science: false, comms: false };
  }

  castVote(roleId, isGo = true) {
    this.pollVotes[roleId] = isGo;
    this.broadcast('POLL_VOTE', { roleId, vote: isGo });
    this.emit('pollUpdated', this.pollVotes);
  }

  isAllStationsGo() {
    return Object.values(this.pollVotes).every(Boolean);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (err) { console.error('Crew event error:', err); }
    });
  }
}

export const crew = new CrewManager();

/* =========================================================================
   UI RENDERING HELPERS (NASA MISSION CONTROL CONSOLE)
   ========================================================================= */

/**
 * Renders the illuminated 4-station crew console bar
 */
export function renderCrewConsoleStrip(container, onRoleSelect) {
  if (!container) return;
  if (!crew.isCrewMode()) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.className = 'crew-console-strip';

  const memberMap = {};
  crew.roster.forEach(m => { memberMap[m.id] = m.name; });

  container.innerHTML = `
    <div class="crew-strip-banner">
      <span class="crew-pulse-dot"></span>
      <span class="crew-agency-tag">NASA 4-CREW CONSOLE</span>
      <span class="crew-active-indicator">ACTIVE STATION: <b>${crew.getActiveRoleMeta().callsign}</b></span>
    </div>
    <div class="crew-station-pills">
      ${CREW_ROLES.map(role => {
        const isActive = crew.activeRole === role.id;
        const name = memberMap[role.id] || role.defaultName;
        return `
          <button class="crew-station-tab ${isActive ? 'active' : ''} ${role.badgeClass}" data-crew-role="${role.id}" title="${role.title} — ${role.responsibilities}">
            <span class="station-icon">${role.icon}</span>
            <div class="station-text">
              <strong class="station-callsign">${role.callsign}</strong>
              <span class="station-officer">${name}</span>
            </div>
            ${isActive ? '<span class="station-active-badge">CONTROLLING</span>' : ''}
          </button>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('[data-crew-role]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const rId = btn.dataset.crewRole;
      crew.setActiveRole(rId);
      renderCrewConsoleStrip(container, onRoleSelect);
      if (onRoleSelect) onRoleSelect(rId);
    };
  });
}

/**
 * Renders an authority badge above a specific subsystem or architecture panel
 */
export function renderRoleAuthorityTag(roleId, customNote = '') {
  const role = CREW_ROLES.find(r => r.id === roleId);
  if (!role || !crew.isCrewMode()) return '';
  const member = crew.getMember(roleId);

  return `
    <div class="role-authority-tag ${role.badgeClass}">
      <span class="auth-icon">${role.icon}</span>
      <div class="auth-details">
        <span class="auth-role">${role.title.toUpperCase()} // ${role.callsign}</span>
        <strong class="auth-name">${member.name}</strong>
      </div>
      ${customNote ? `<span class="auth-note">${customNote}</span>` : ''}
    </div>
  `;
}

/**
 * Modal to configure Crew Manifest (Names & Roles)
 */
export function showCrewSetupModal(onConfirm) {
  let modal = document.querySelector('#crew-setup-dialog');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'crew-setup-dialog';
  modal.className = 'dialog-backdrop crew-modal-backdrop active';

  const memberMap = {};
  crew.roster.forEach(m => { memberMap[m.id] = m.name; });

  modal.innerHTML = `
    <div class="dialog-box crew-setup-box">
      <div class="dialog-header crew-modal-header">
        <div class="crew-header-strip">
          <span class="crew-modal-tag"><i class="pulse-dot"></i> NASA MISSION CONTROL</span>
          <span class="crew-station-count">4 PARTICIPANT STATIONS</span>
        </div>
        <h2>COLLABORATIVE FLIGHT CREW MANIFEST</h2>
        <p class="dialog-lead">Assign crew members to the four NASA mission control positions. Each specialist commands distinct engineering and flight decisions throughout the mission.</p>
      </div>

      <div class="crew-roles-grid">
        ${CREW_ROLES.map(role => `
          <div class="crew-role-card ${role.badgeClass}">
            <div class="role-card-header">
              <span class="role-card-icon">${role.icon}</span>
              <div class="role-card-titles">
                <span class="role-callsign">${role.callsign}</span>
                <h3>${role.title}</h3>
              </div>
            </div>
            <p class="role-card-desc">${role.responsibilities}</p>
            <div class="role-input-group">
              <label for="crew-name-${role.id}">OFFICER NAME / CALLSIGN</label>
              <input type="text" id="crew-name-${role.id}" class="crew-input" value="${memberMap[role.id] || role.defaultName}" maxlength="24" placeholder="Enter name..." />
            </div>
          </div>
        `).join('')}
      </div>

      <div class="crew-coop-info-box">
        <div class="coop-info-icon">💡</div>
        <p><strong>HOW TO PLAY AS A TEAM:</strong> Share this screen in a classroom or seat, or open 4 tabs / windows to simulate a distributed NASA mission control room via local cross-window sync!</p>
      </div>

      <div class="dialog-footer crew-modal-footer">
        <button id="crewCancelBtn" class="outline-button">CANCEL</button>
        <button id="crewSaveBtn" class="primary-button hero-start-btn">
          <span>INITIALIZE CREW TERMINAL</span>
          <b>✦</b>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector('#crewCancelBtn').onclick = () => modal.remove();

  modal.querySelector('#crewSaveBtn').onclick = () => {
    const updated = CREW_ROLES.map(role => {
      const input = modal.querySelector(`#crew-name-${role.id}`);
      return {
        id: role.id,
        name: (input?.value.trim()) || role.defaultName,
        title: role.title,
        callsign: role.callsign,
        roleId: role.id
      };
    });

    crew.saveRoster(updated);
    crew.setMode('crew');
    modal.remove();
    if (onConfirm) onConfirm(updated);
  };
}

/**
 * Pre-Launch NASA GO / NO-GO Roll-Call Polling Verification Modal
 */
export function showGoNoGoPollModal(onAllGo) {
  crew.resetPoll();
  let modal = document.querySelector('#gonogo-poll-dialog');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'gonogo-poll-dialog';
  modal.className = 'dialog-backdrop crew-modal-backdrop active';

  const memberMap = {};
  crew.roster.forEach(m => { memberMap[m.id] = m.name; });

  const renderPollContent = () => {
    const isReady = crew.isAllStationsGo();

    modal.innerHTML = `
      <div class="dialog-box gonogo-poll-box">
        <div class="dialog-header gonogo-header">
          <div class="gonogo-header-top">
            <span class="poll-alert-tag"><i class="pulse-dot"></i> FLIGHT READINESS ROLL CALL</span>
            <span class="poll-protocol-tag">NASA LAUNCH COMMIT PROTOCOL</span>
          </div>
          <h2>TERMINAL COUNTDOWN: GO / NO-GO POLL</h2>
          <p class="dialog-lead">Flight Director is polling all console stations for launch commit. Each station must verify their readiness criteria and cast a <b>GO</b> vote.</p>
        </div>

        <div class="poll-stations-grid">
          <!-- 1. SYSTEMS -->
          <div class="poll-card ${crew.pollVotes.systems ? 'voted-go' : ''}">
            <div class="poll-card-left">
              <span class="poll-icon">🛠️</span>
              <div>
                <span class="poll-role-badge">SYSTEMS / EECOM</span>
                <strong class="poll-name">${memberMap.systems}</strong>
                <p class="poll-check">Vehicle assembled, power bus &amp; payload mass verified within limits.</p>
              </div>
            </div>
            <button class="poll-vote-btn ${crew.pollVotes.systems ? 'active' : ''}" data-vote-role="systems">
              ${crew.pollVotes.systems ? '✓ GO' : 'REPORT GO'}
            </button>
          </div>

          <!-- 2. SCIENCE -->
          <div class="poll-card ${crew.pollVotes.science ? 'voted-go' : ''}">
            <div class="poll-card-left">
              <span class="poll-icon">🔬</span>
              <div>
                <span class="poll-role-badge">SCIENCE SPECIALIST</span>
                <strong class="poll-name">${memberMap.science}</strong>
                <p class="poll-check">Scientific instruments initialized, target exploration priorities logged.</p>
              </div>
            </div>
            <button class="poll-vote-btn ${crew.pollVotes.science ? 'active' : ''}" data-vote-role="science">
              ${crew.pollVotes.science ? '✓ GO' : 'REPORT GO'}
            </button>
          </div>

          <!-- 3. COMMS / FIDO -->
          <div class="poll-card ${crew.pollVotes.comms ? 'voted-go' : ''}">
            <div class="poll-card-left">
              <span class="poll-icon">📡</span>
              <div>
                <span class="poll-role-badge">COMMS &amp; DYNAMICS (FIDO)</span>
                <strong class="poll-name">${memberMap.comms}</strong>
                <p class="poll-check">DSN telemetry stations tracking, carrier lock and comms delays calibrated.</p>
              </div>
            </div>
            <button class="poll-vote-btn ${crew.pollVotes.comms ? 'active' : ''}" data-vote-role="comms">
              ${crew.pollVotes.comms ? '✓ GO' : 'REPORT GO'}
            </button>
          </div>

          <!-- 4. FLIGHT DIRECTOR -->
          <div class="poll-card ${crew.pollVotes.flight ? 'voted-go' : ''}">
            <div class="poll-card-left">
              <span class="poll-icon">🚀</span>
              <div>
                <span class="poll-role-badge">FLIGHT DIRECTOR</span>
                <strong class="poll-name">${memberMap.flight}</strong>
                <p class="poll-check">Range safety clear, mission architecture and budget verified.</p>
              </div>
            </div>
            <button class="poll-vote-btn ${crew.pollVotes.flight ? 'active' : ''}" data-vote-role="flight">
              ${crew.pollVotes.flight ? '✓ GO' : 'REPORT GO'}
            </button>
          </div>
        </div>

        <div class="poll-readiness-banner ${isReady ? 'all-go' : 'waiting'}">
          ${isReady 
            ? '<span>🚀 ALL STATIONS REPORT GO // FLIGHT DIRECTOR AUTHORIZES LAUNCH</span>' 
            : '<span>⏳ AWAITING CONSOLE VOTES // ALL 4 STATIONS MUST REPORT GO</span>'}
        </div>

        <div class="dialog-footer gonogo-footer">
          <button id="pollAbortBtn" class="outline-button">STAND DOWN / ABORT</button>
          <button id="pollLaunchBtn" class="primary-button hero-start-btn" ${!isReady ? 'disabled' : ''}>
            <span>${isReady ? 'COMMIT ALL STATIONS &amp; LAUNCH' : 'STATIONS POLLING...'}</span>
            <b>🚀</b>
          </button>
        </div>
      </div>
    `;

    // Event listeners
    modal.querySelectorAll('[data-vote-role]').forEach(btn => {
      btn.onclick = () => {
        const rId = btn.dataset.voteRole;
        crew.castVote(rId, !crew.pollVotes[rId]);
        renderPollContent();
      };
    });

    modal.querySelector('#pollAbortBtn').onclick = () => {
      modal.remove();
    };

    const launchBtn = modal.querySelector('#pollLaunchBtn');
    if (launchBtn) {
      launchBtn.onclick = () => {
        if (!crew.isAllStationsGo()) return;
        modal.remove();
        if (onAllGo) onAllGo();
      };
    }
  };

  renderPollContent();
  document.body.appendChild(modal);

  // Subscribe to real-time sync across multiple tabs/windows
  const unsub = crew.subscribe((event) => {
    if (event === 'pollUpdated') {
      renderPollContent();
    }
  });

  const origRemove = modal.remove.bind(modal);
  modal.remove = () => {
    unsub();
    origRemove();
  };
}
