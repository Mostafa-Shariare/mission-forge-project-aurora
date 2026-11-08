/**
 * MISSION FORGE: PROJECT AURORA
 * 4-Player Multi-Crew Collaboration & Room-Based Networking System
 * Path: src/game/src/crew.js
 *
 * Implements:
 * 1. Pre-Game Gateway Mode Selector (Solo vs. Team)
 * 2. Team Operations: Create Team (generates Room Code) & Join Team (connects via Code)
 * 3. Segment-by-Segment Flight Command: The designated specialist controls the ship
 *    during their segment, while all other team members observe in Spectator Mode!
 * 4. Cross-window / multi-screen real-time synchronization via BroadcastChannel & LocalStorage.
 * 5. Pre-Launch NASA GO / NO-GO Roll-Call Verification Poll.
 * 6. Multi-Officer Debrief & NASA Flight Certification Manifest.
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
    domain: 'Mission Architecture & Trajectory',
    responsibilities: 'NASA budget cap, launch vehicle & fairing selection, trajectory flight plan, and final launch commit authority.',
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
    domain: 'Subsystems, Power & Mass Balance',
    responsibilities: 'Propulsion, power generators, shields, hull armor, RCS thrusters, and precision landing burns.',
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
    domain: 'Planetary Science & Surface Ops',
    responsibilities: 'Scientific instruments, spectrometers, multi-angle orbital scans, rover driving, and rock core drill sampling.',
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
    domain: 'DSN Telemetry, Cruise & Power Grid',
    responsibilities: 'Deep Space Network links, speed-of-light delays, interplanetary cruise burns, real-time power bus routing, and anomaly triage.',
    defaultName: 'Officer Sam'
  }
];

export function getSubsystemRole(slot) {
  if (slot === 3 || slot === 7) return 'science'; // Scanners, Rover/Landers
  if (slot === 4) return 'comms';                 // Communications
  return 'systems';                               // Propulsion, Power, Shields, Cooling, Steering, Tanks
}

export function getStageRole(stage) {
  // Stage 0: Ascent / Trans-Injection Burn -> FLIGHT
  // Stage 1: Interplanetary Cruise & Trajectory Burn -> COMMS / FIDO
  // Stage 2: Target Approach & Orbital Insertion Sweep -> SCIENCE
  // Stage 3: Atmospheric Descent & Precision Touchdown -> SYSTEMS / EECOM
  // Stage 4: Surface Exploration, Rover Driving & Core Drilling -> SCIENCE
  // Stage 5: Departure Burn & Earth Atmospheric Re-entry -> FLIGHT
  switch (Number(stage)) {
    case 0: return 'flight';
    case 1: return 'comms';
    case 2: return 'science';
    case 3: return 'systems';
    case 4: return 'science';
    case 5: return 'flight';
    default: return 'flight';
  }
}

export function getStageTitle(stage) {
  switch (Number(stage)) {
    case 0: return 'LAUNCH & INJECTION BURN';
    case 1: return 'CRUISE & FLIGHT DYNAMICS';
    case 2: return 'ORBITAL INSERTION & SENSING';
    case 3: return 'DESCENT & PRECISION TOUCHDOWN';
    case 4: return 'SURFACE SCIENCE & ROVER OPS';
    case 5: return 'DEPARTURE & EARTH RE-ENTRY';
    default: return 'ORBITAL FLIGHT';
  }
}

class CrewManager {
  constructor() {
    this.storageManifestKey = 'aurora-crew-manifest';
    this.storageModeKey = 'aurora-mission-mode';
    this.storageRoomKey = 'aurora-room-code';
    this.storageMyRoleKey = 'aurora-my-role';
    this.storageMyNameKey = 'aurora-my-name';

    this.mode = this.loadMode();
    this.roomCode = this.loadRoomCode();
    this.myRole = this.loadMyRole();
    this.myName = this.loadMyName();
    this.isHost = false;
    this.roster = this.loadRoster();

    this.activeRole = this.myRole;
    this.activeSegmentRole = 'flight'; // Who has active flight control
    this.activeSegmentTitle = 'MISSION INITIALIZATION';
    this.overrideAuthority = false;

    this.pollVotes = { flight: false, systems: false, science: false, comms: false };
    this.listeners = new Set();
    this.channel = null;

    this.initBroadcast();
    this.initStorageListener();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'AUR-';
    for (let i = 0; i < 3; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  loadMode() {
    try {
      return localStorage.getItem(this.storageModeKey) || 'solo';
    } catch {
      return 'solo';
    }
  }

  saveMode(mode = this.mode) {
    this.mode = mode;
    try {
      localStorage.setItem(this.storageModeKey, mode);
    } catch {}
  }

  loadRoomCode() {
    try {
      return localStorage.getItem(this.storageRoomKey) || '';
    } catch {
      return '';
    }
  }

  saveRoomCode(code = this.roomCode) {
    this.roomCode = code;
    try {
      localStorage.setItem(this.storageRoomKey, code);
    } catch {}
  }

  loadMyRole() {
    try {
      return localStorage.getItem(this.storageMyRoleKey) || 'flight';
    } catch {
      return 'flight';
    }
  }

  saveMyRole(role = this.myRole) {
    this.myRole = role;
    this.activeRole = role;
    try {
      localStorage.setItem(this.storageMyRoleKey, role);
    } catch {}
  }

  loadMyName() {
    try {
      return localStorage.getItem(this.storageMyNameKey) || 'Commander Alex';
    } catch {
      return 'Commander Alex';
    }
  }

  saveMyName(name = this.myName) {
    this.myName = name;
    try {
      localStorage.setItem(this.storageMyNameKey, name);
    } catch {}
  }

  loadRoster() {
    try {
      if (this.roomCode) {
        const roomData = JSON.parse(localStorage.getItem(`aurora_room_${this.roomCode}`));
        if (roomData && Array.isArray(roomData.roster)) return roomData.roster;
      }
      const saved = JSON.parse(localStorage.getItem(this.storageManifestKey));
      if (Array.isArray(saved) && saved.length === 4) return saved;
    } catch {}
    return CREW_ROLES.map(r => ({
      id: r.id,
      name: r.defaultName,
      title: r.title,
      callsign: r.callsign,
      roleId: r.id,
      isAssigned: false
    }));
  }

  saveRoster(roster = this.roster) {
    this.roster = roster;
    try {
      localStorage.setItem(this.storageManifestKey, JSON.stringify(roster));
      if (this.roomCode) {
        localStorage.setItem(`aurora_room_${this.roomCode}`, JSON.stringify({
          roomCode: this.roomCode,
          roster: this.roster,
          activeSegmentRole: this.activeSegmentRole,
          activeSegmentTitle: this.activeSegmentTitle,
          pollVotes: this.pollVotes,
          updatedAt: Date.now()
        }));
      }
    } catch {}
  }

  initBroadcast() {
    if (typeof window === 'undefined') return;
    if (this.channel) {
      try { this.channel.close(); } catch {}
      this.channel = null;
    }
    const chName = this.roomCode ? `mission_aurora_room_${this.roomCode}` : 'mission_aurora_crew_broadcast';
    try {
      this.channel = new BroadcastChannel(chName);
      this.channel.onmessage = (event) => {
        if (!event?.data) return;
        this.handleBroadcastMessage(event.data);
      };
    } catch (err) {
      console.warn('BroadcastChannel unavailable:', err);
    }
  }

  initStorageListener() {
    if (typeof window === 'undefined') return;
    window.addEventListener('storage', (e) => {
      if (!this.roomCode) return;
      if (e.key === `aurora_room_${this.roomCode}` && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          if (data?.roster) {
            this.roster = data.roster;
            this.emit('rosterChanged', this.roster);
          }
          if (data?.activeSegmentRole) {
            this.activeSegmentRole = data.activeSegmentRole;
            this.activeSegmentTitle = data.activeSegmentTitle || '';
            this.emit('segmentChanged', { roleId: this.activeSegmentRole, title: this.activeSegmentTitle });
          }
          if (data?.pollVotes) {
            this.pollVotes = data.pollVotes;
            this.emit('pollUpdated', this.pollVotes);
          }
        } catch {}
      }
    });
  }

  broadcast(type, payload = {}) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload, senderRole: this.myRole, timestamp: Date.now() });
      } catch (err) {
        console.warn('Broadcast send error:', err);
      }
    }
  }

  handleBroadcastMessage(msg) {
    const { type, payload } = msg;
    if (type === 'ROOM_SYNC') {
      this.roster = payload.roster || this.roster;
      this.activeSegmentRole = payload.activeSegmentRole || this.activeSegmentRole;
      this.activeSegmentTitle = payload.activeSegmentTitle || this.activeSegmentTitle;
      this.saveRoster();
      this.emit('roomSynced', payload);
      this.emit('rosterChanged', this.roster);
    } else if (type === 'PEER_JOINED') {
      const idx = this.roster.findIndex(m => m.id === payload.roleId);
      if (idx !== -1) {
        this.roster[idx].name = payload.name;
        this.roster[idx].isAssigned = true;
        this.saveRoster();
        this.emit('rosterChanged', this.roster);
      }
      if (this.isHost) {
        this.broadcast('ROOM_SYNC', {
          roster: this.roster,
          activeSegmentRole: this.activeSegmentRole,
          activeSegmentTitle: this.activeSegmentTitle,
          pollVotes: this.pollVotes
        });
      }
    } else if (type === 'ROSTER_UPDATE') {
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
    } else if (type === 'SEGMENT_CHANGE') {
      this.activeSegmentRole = payload.roleId;
      this.activeSegmentTitle = payload.title || '';
      this.overrideAuthority = false;
      this.saveRoster();
      this.emit('segmentChanged', { roleId: this.activeSegmentRole, title: this.activeSegmentTitle });
    } else if (type === 'TAKEOVER') {
      this.emit('takeoverRequested', payload);
    } else if (type === 'POLL_VOTE') {
      this.pollVotes[payload.roleId] = payload.vote;
      this.emit('pollUpdated', this.pollVotes);
    } else if (type === 'POLL_RESET') {
      this.resetPoll();
      this.emit('pollReset');
    } else if (type === 'LAUNCH_EXPEDITION') {
      this.emit('expeditionLaunched', payload);
    } else if (type === 'MODULE_EQUIP') {
      this.emit('moduleEquipped', payload);
    } else if (type === 'FLIGHT_TELEMETRY') {
      this.emit('flightTelemetry', payload);
    } else if (type === 'ANOMALY_CHOICE') {
      this.emit('anomalyChoice', payload);
    }
  }

  createRoom(hostName, hostRole = 'flight') {
    const code = this.generateRoomCode();
    this.saveMode('crew');
    this.saveRoomCode(code);
    this.saveMyRole(hostRole);
    this.saveMyName(hostName);
    this.isHost = true;

    // Initialize fresh roster with host occupying chosen role
    this.roster = CREW_ROLES.map(r => ({
      id: r.id,
      name: r.id === hostRole ? hostName : r.defaultName,
      title: r.title,
      callsign: r.callsign,
      roleId: r.id,
      isAssigned: r.id === hostRole
    }));
    this.activeSegmentRole = 'flight';
    this.activeSegmentTitle = 'MISSION ARCHITECTURE & ASSEMBLY';
    this.saveRoster();

    this.initBroadcast();
    this.broadcast('ROOM_SYNC', {
      roster: this.roster,
      activeSegmentRole: this.activeSegmentRole,
      activeSegmentTitle: this.activeSegmentTitle,
      pollVotes: this.pollVotes
    });

    this.emit('roomCreated', { roomCode: code, roleId: hostRole, name: hostName });
    return code;
  }

  joinRoom(code, playerName, playerRole) {
    const cleanCode = (code || '').toUpperCase().trim();
    if (!cleanCode) return false;

    this.saveMode('crew');
    this.saveRoomCode(cleanCode);
    this.saveMyRole(playerRole);
    this.saveMyName(playerName);
    this.isHost = false;

    // Load any existing room data from local storage
    this.roster = this.loadRoster();
    const idx = this.roster.findIndex(m => m.id === playerRole);
    if (idx !== -1) {
      this.roster[idx].name = playerName;
      this.roster[idx].isAssigned = true;
    }
    this.saveRoster();

    this.initBroadcast();
    this.broadcast('PEER_JOINED', { roleId: playerRole, name: playerName });
    this.emit('roomJoined', { roomCode: cleanCode, roleId: playerRole, name: playerName });
    return true;
  }

  leaveRoom() {
    this.broadcast('PEER_LEFT', { roleId: this.myRole, name: this.myName });
    this.saveMode('solo');
    this.saveRoomCode('');
    this.isHost = false;
    this.initBroadcast();
    this.emit('modeChanged', 'solo');
  }

  setMode(mode) {
    if (mode === 'solo') {
      this.leaveRoom();
    } else {
      this.saveMode('crew');
    }
    this.emit('modeChanged', this.mode);
  }

  isCrewMode() {
    return this.mode === 'crew';
  }

  /**
   * Authority Check: Returns true if it is this player's turn to control the segment.
   * If in solo mode, always true.
   * If in crew mode, true only if myRole matches the activeSegmentRole (or override active).
   */
  isMyTurn() {
    if (!this.isCrewMode()) return true;
    if (this.overrideAuthority) return true;
    return this.myRole === this.activeSegmentRole;
  }

  /**
   * Check if player has authority over a specific role domain (e.g. subsystem in assembly)
   */
  canControlRole(roleId) {
    if (!this.isCrewMode()) return true;
    if (this.overrideAuthority) return true;
    return this.myRole === roleId;
  }

  setSegment(roleId, title = '') {
    this.activeSegmentRole = roleId;
    this.activeSegmentTitle = title;
    this.overrideAuthority = false;
    this.saveRoster();
    this.broadcast('SEGMENT_CHANGE', { roleId, title });
    this.emit('segmentChanged', { roleId, title });
  }

  takeoverAuthority() {
    this.overrideAuthority = true;
    this.broadcast('TAKEOVER', { byRole: this.myRole, byName: this.myName });
    this.emit('authorityChanged', { roleId: this.myRole, name: this.myName });
  }

  getMember(roleId) {
    return this.roster.find(m => m.id === roleId) || {
      id: roleId,
      name: 'Officer',
      title: 'Specialist',
      callsign: roleId.toUpperCase()
    };
  }

  getActiveRoleMeta() {
    return CREW_ROLES.find(r => r.id === this.activeRole) || CREW_ROLES[0];
  }

  getMyRoleMeta() {
    return CREW_ROLES.find(r => r.id === this.myRole) || CREW_ROLES[0];
  }

  getActiveSegmentRoleMeta() {
    return CREW_ROLES.find(r => r.id === this.activeSegmentRole) || CREW_ROLES[0];
  }

  setActiveRole(roleId) {
    this.activeRole = roleId;
    this.emit('roleSwitched', roleId);
  }

  // --- GO / NO-GO Flight Readiness Poll ---
  resetPoll() {
    this.pollVotes = { flight: false, systems: false, science: false, comms: false };
    this.broadcast('POLL_RESET');
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
   START SCREEN GATEWAY (SOLO vs. TEAM -> CREATE / JOIN)
   ========================================================================= */

/**
 * Displays the initial pre-game Gateway Mode Selector (Solo vs. 4-Player Team)
 */
export function showModeSelectScreen(container, { onSolo, onTeamLaunch } = {}) {
  let root = container;
  if (!root) {
    let el = document.querySelector('#mode-select-screen');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mode-select-screen';
      document.body.prepend(el);
    }
    root = el;
  }

  root.className = 'mode-select-screen active';
  root.style.display = 'flex';

  let currentView = 'select-mode'; // 'select-mode' | 'create-team' | 'join-team' | 'team-lobby'
  let genCode = crew.roomCode || crew.generateRoomCode();
  let selectedRole = crew.myRole || 'flight';

  const render = () => {
    if (currentView === 'select-mode') {
      root.innerHTML = `
        <div class="mode-select-container">
          <div class="mode-select-hero">
            <div class="mode-nasa-tag">
              <span class="pulse-dot"></span>
              <span>NASA MISSION ARCHITECTURE // PROJECT AURORA</span>
            </div>
            <h1 class="mode-main-title">MISSION FORGE</h1>
            <p class="mode-subtitle">DEEP-SPACE EXPEDITION &amp; SPACECRAFT ENGINEERING SIMULATOR</p>
            <div class="mode-prompt-pill">SELECT FLIGHT COMMAND MODE</div>
          </div>

          <div class="mode-cards-grid">
            <!-- 1. SOLO MODE -->
            <div class="mode-option-card solo-card" id="btnChooseSolo">
              <div class="mode-card-badge">SINGLE-PLAYER AUTONOMOUS</div>
              <div class="mode-card-header">
                <span class="mode-card-icon">🚀</span>
                <div>
                  <h2>SOLO EXPLORER</h2>
                  <span class="mode-card-kicker">AUTONOMOUS COMMAND</span>
                </div>
              </div>
              <p class="mode-card-copy">
                Take sole helm of the Odyssey 07. Personally configure all 9 spacecraft subsystems, pilot every orbital maneuver, and conduct planetary exploration individually.
              </p>
              <ul class="mode-features-list">
                <li><span>✓</span> Full autonomous control of all flight stages</li>
                <li><span>✓</span> Solo engineering &amp; planetary sample drilling</li>
                <li><span>✓</span> Quick-start with zero setup needed</li>
              </ul>
              <button class="primary-button mode-cta-btn">
                <span>LAUNCH SOLO EXPEDITION</span>
                <b>→</b>
              </button>
            </div>

            <!-- 2. TEAM MODE -->
            <div class="mode-option-card team-card" id="btnChooseTeam">
              <div class="mode-card-badge team-badge">4-PLAYER COLLABORATIVE</div>
              <div class="mode-card-header">
                <span class="mode-card-icon">👥</span>
                <div>
                  <h2>4-PLAYER MULTI-CREW</h2>
                  <span class="mode-card-kicker">DISTRIBUTED MISSION CONTROL</span>
                </div>
              </div>
              <p class="mode-card-copy">
                Form a collaborative NASA flight squad. Take turns piloting your assigned segment while teammates observe live telemetry from their console stations!
              </p>
              <ul class="mode-features-list">
                <li><span>★</span> 4 NASA Stations: Flight, Systems, Science &amp; Comms</li>
                <li><span>★</span> Turn-based segment command with live spectator feeds</li>
                <li><span>★</span> Join instantly with a generated Room Code</li>
              </ul>
              <button class="primary-button hero-start-btn mode-cta-btn">
                <span>ENTER TEAM OPERATIONS</span>
                <b>✦</b>
              </button>
            </div>
          </div>

          <div class="mode-select-footer">
            <span>NASA Space Apps Challenge · Educational Space Mission Architecture Simulation</span>
          </div>
        </div>
      `;

      root.querySelector('#btnChooseSolo').onclick = () => {
        crew.setMode('solo');
        root.classList.remove('active');
        setTimeout(() => { root.style.display = 'none'; }, 400);
        if (onSolo) onSolo();
      };

      root.querySelector('#btnChooseTeam').onclick = () => {
        currentView = 'team-hub';
        render();
      };
    } else if (currentView === 'team-hub') {
      root.innerHTML = `
        <div class="mode-select-container team-hub-container">
          <div class="team-hub-header">
            <button class="ghost-back-btn" id="btnBackToModes">‹ BACK TO MODE SELECT</button>
            <div class="mode-nasa-tag">
              <span class="pulse-dot"></span>
              <span>4-PLAYER NASA MISSION CONTROL</span>
            </div>
            <h2>TEAM OPERATIONS HUB</h2>
            <p class="mode-subtitle">Create a new mission team or join an existing flight squad with an access code.</p>
          </div>

          <div class="team-hub-grid">
            <!-- CREATE TEAM -->
            <div class="team-hub-card create-card">
              <div class="team-hub-badge">HOST A MISSION</div>
              <h3>CREATE NEW TEAM</h3>
              <p>Generate an access code and invite up to 3 crew members to join your mission control room.</p>
              
              <div class="code-generator-box">
                <span class="code-label">MISSION ACCESS CODE:</span>
                <div class="code-display-row">
                  <span class="code-val">${genCode}</span>
                  <button class="copy-code-btn" id="btnCopyCode" title="Copy Room Code">COPY CODE 📋</button>
                </div>
              </div>

              <div class="team-input-group">
                <label>YOUR OFFICER NAME / CALLSIGN</label>
                <input type="text" id="hostOfficerName" class="crew-input" value="${crew.myName || 'Commander Alex'}" maxlength="24" placeholder="Enter callsign..." />
              </div>

              <div class="team-input-group">
                <label>YOUR PRIMARY FLIGHT STATION</label>
                <div class="role-selector-pills">
                  ${CREW_ROLES.map(r => `
                    <button class="role-select-pill ${selectedRole === r.id ? 'active' : ''} ${r.badgeClass}" data-select-role="${r.id}">
                      <span>${r.icon}</span>
                      <b>${r.callsign}</b>
                    </button>
                  `).join('')}
                </div>
              </div>

              <button class="primary-button hero-start-btn team-hub-action-btn" id="btnConfirmCreateTeam">
                <span>CREATE &amp; OPEN LOBBY</span>
                <b>🚀</b>
              </button>
            </div>

            <!-- JOIN TEAM -->
            <div class="team-hub-card join-card">
              <div class="team-hub-badge join-badge">JOIN WITH CODE</div>
              <h3>JOIN EXISTING TEAM</h3>
              <p>Enter the 6-character Mission Access Code provided by your Flight Director to connect.</p>

              <div class="team-input-group">
                <label>ENTER 6-CHAR ROOM CODE</label>
                <input type="text" id="joinRoomCode" class="crew-input code-input" placeholder="e.g. AUR-782" maxlength="10" />
              </div>

              <div class="team-input-group">
                <label>YOUR OFFICER NAME / CALLSIGN</label>
                <input type="text" id="joinOfficerName" class="crew-input" value="Officer Sam" maxlength="24" placeholder="Enter your name..." />
              </div>

              <div class="team-input-group">
                <label>CHOOSE YOUR STATION</label>
                <div class="role-selector-pills" id="joinRoleSelector">
                  ${CREW_ROLES.map(r => `
                    <button class="role-select-pill ${selectedRole === r.id ? 'active' : ''} ${r.badgeClass}" data-join-role="${r.id}">
                      <span>${r.icon}</span>
                      <b>${r.callsign}</b>
                    </button>
                  `).join('')}
                </div>
              </div>

              <button class="outline-button team-hub-action-btn" id="btnConfirmJoinTeam">
                <span>CONNECT TO MISSION CONTROL</span>
                <b>✦</b>
              </button>
            </div>
          </div>
        </div>
      `;

      root.querySelector('#btnBackToModes').onclick = () => {
        currentView = 'select-mode';
        render();
      };

      // Role selection for Create Team
      root.querySelectorAll('[data-select-role]').forEach(btn => {
        btn.onclick = () => {
          selectedRole = btn.dataset.selectRole;
          root.querySelectorAll('[data-select-role]').forEach(b => b.classList.toggle('active', b === btn));
        };
      });

      // Role selection for Join Team
      root.querySelectorAll('[data-join-role]').forEach(btn => {
        btn.onclick = () => {
          selectedRole = btn.dataset.joinRole;
          root.querySelectorAll('[data-join-role]').forEach(b => b.classList.toggle('active', b === btn));
        };
      });

      // Copy code button
      root.querySelector('#btnCopyCode').onclick = () => {
        try {
          navigator.clipboard.writeText(genCode);
          const btn = root.querySelector('#btnCopyCode');
          btn.textContent = 'COPIED! ✓';
          setTimeout(() => { if (btn) btn.textContent = 'COPY CODE 📋'; }, 2000);
        } catch {}
      };

      // Create Team action
      root.querySelector('#btnConfirmCreateTeam').onclick = () => {
        const name = (root.querySelector('#hostOfficerName')?.value.trim()) || 'Commander Alex';
        crew.createRoom(name, selectedRole);
        currentView = 'team-lobby';
        render();
      };

      // Join Team action
      root.querySelector('#btnConfirmJoinTeam').onclick = () => {
        const codeInput = root.querySelector('#joinRoomCode')?.value.trim();
        const nameInput = (root.querySelector('#joinOfficerName')?.value.trim()) || 'Officer';
        if (!codeInput) {
          alert('Please enter a valid Mission Access Code (e.g. AUR-782).');
          return;
        }
        crew.joinRoom(codeInput, nameInput, selectedRole);
        currentView = 'team-lobby';
        render();
      };
    } else if (currentView === 'team-lobby') {
      const activeCode = crew.roomCode;
      const myMeta = crew.getMyRoleMeta();

      root.innerHTML = `
        <div class="mode-select-container team-lobby-container">
          <div class="team-lobby-header">
            <div class="lobby-code-badge">
              <span>MISSION ACCESS CODE:</span>
              <strong id="lobbyCodeVal">${activeCode}</strong>
              <button class="copy-small-btn" id="btnCopyLobbyCode">COPY 📋</button>
            </div>
            <h2>FLIGHT SQUADRON LOBBY</h2>
            <p class="mode-subtitle">4 Flight Stations Active. Share the Room Code with team members to join via split-screen or separate tabs.</p>
          </div>

          <div class="lobby-roster-grid">
            ${CREW_ROLES.map(role => {
              const member = crew.getMember(role.id);
              const isMe = crew.myRole === role.id;
              return `
                <div class="lobby-station-card ${role.badgeClass} ${isMe ? 'my-station' : ''}">
                  <div class="lobby-station-header">
                    <span class="station-icon">${role.icon}</span>
                    <div>
                      <span class="station-callsign">${role.callsign}</span>
                      <h4>${role.title}</h4>
                    </div>
                  </div>
                  <div class="lobby-officer-row">
                    <span class="officer-label">ASSIGNED OFFICER:</span>
                    <strong class="officer-name">${member.name}</strong>
                  </div>
                  <div class="lobby-station-status">
                    ${isMe ? '<span class="status-pill my-pill">YOU ARE CONTROLLING</span>' : '<span class="status-pill connected-pill">ACTIVE CONSOLE</span>'}
                  </div>
                  <p class="station-duty-desc">${role.responsibilities}</p>
                </div>
              `;
            }).join('')}
          </div>

          <div class="lobby-instructions-box">
            <span class="info-icon">💡</span>
            <div>
              <strong>SEGMENT-BASED MISSION COMMAND:</strong>
              <p>During flight, when a specific chapter or subsystem begins, that designated officer takes the helm with full controls. All other team members watch live telemetry in Observer Mode!</p>
            </div>
          </div>

          <div class="lobby-actions-footer">
            <button class="outline-button" id="btnLeaveLobby">LEAVE TEAM (SOLO)</button>
            <button class="primary-button hero-start-btn" id="btnStartExpedition">
              <span>ENTER ASSEMBLY BAY &amp; LAUNCH</span>
              <b>🚀</b>
            </button>
          </div>
        </div>
      `;

      root.querySelector('#btnCopyLobbyCode').onclick = () => {
        try {
          navigator.clipboard.writeText(activeCode);
          const btn = root.querySelector('#btnCopyLobbyCode');
          btn.textContent = 'COPIED!';
          setTimeout(() => { if (btn) btn.textContent = 'COPY 📋'; }, 2000);
        } catch {}
      };

      root.querySelector('#btnLeaveLobby').onclick = () => {
        crew.leaveRoom();
        currentView = 'select-mode';
        render();
      };

      root.querySelector('#btnStartExpedition').onclick = () => {
        crew.broadcast('LAUNCH_EXPEDITION', { roomCode: crew.roomCode });
        root.classList.remove('active');
        setTimeout(() => { root.style.display = 'none'; }, 400);
        if (onTeamLaunch) onTeamLaunch();
      };

      // Listen for peer joins and launches
      const unsub = crew.subscribe((event) => {
        if (event === 'rosterChanged' || event === 'roomSynced') {
          render();
        } else if (event === 'expeditionLaunched') {
          root.classList.remove('active');
          setTimeout(() => { root.style.display = 'none'; }, 400);
          if (onTeamLaunch) onTeamLaunch();
        }
      });
    }
  };

  render();
}

/* =========================================================================
   UI RENDERING HELPERS (NASA MISSION CONTROL CONSOLE & SPECTATOR HUD)
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

  const activeSegmentMeta = crew.getActiveSegmentRoleMeta();
  const segmentController = crew.getMember(crew.activeSegmentRole);

  container.innerHTML = `
    <div class="crew-strip-banner">
      <span class="crew-pulse-dot"></span>
      <span class="crew-agency-tag">NASA 4-CREW TEAM // ${crew.roomCode || 'LOCAL'}</span>
      <span class="crew-active-indicator">FLIGHT HELM: <b style="color:${activeSegmentMeta.color}">${activeSegmentMeta.callsign} (${segmentController.name})</b></span>
    </div>
    <div class="crew-station-pills">
      ${CREW_ROLES.map(role => {
        const isMyStation = crew.myRole === role.id;
        const hasHelm = crew.activeSegmentRole === role.id;
        const name = memberMap[role.id] || role.defaultName;
        return `
          <button class="crew-station-tab ${isMyStation ? 'my-tab' : ''} ${hasHelm ? 'active' : ''} ${role.badgeClass}" data-crew-role="${role.id}" title="${role.title} — ${role.responsibilities}">
            <span class="station-icon">${role.icon}</span>
            <div class="station-text">
              <strong class="station-callsign">${role.callsign}</strong>
              <span class="station-officer">${name}</span>
            </div>
            ${hasHelm ? '<span class="station-active-badge">AT HELM</span>' : isMyStation ? '<span class="station-my-badge">YOU</span>' : ''}
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
 * Renders the Spectator / Controller Flight HUD banner during missions
 */
export function renderSpectatorHud(container) {
  if (!container) return;
  if (!crew.isCrewMode()) {
    container.innerHTML = '';
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  const isMyTurn = crew.isMyTurn();
  const segmentRole = crew.getActiveSegmentRoleMeta();
  const controller = crew.getMember(crew.activeSegmentRole);

  if (isMyTurn) {
    container.innerHTML = `
      <div class="crew-flight-banner controller-banner">
        <div class="banner-pill">
          <span class="pulse-dot green-dot"></span>
          <span class="banner-status-tag">FLIGHT CONTROL ACTIVE</span>
          <span class="banner-station-tag" style="border-color:${segmentRole.color}; color:${segmentRole.color}">
            ${segmentRole.icon} ${segmentRole.callsign} // ${segmentRole.title}
          </span>
        </div>
        <div class="banner-instruction">
          <strong>YOU ARE AT THE CONTROLS!</strong> Crew members are observing your flight telemetry live.
        </div>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div class="crew-flight-banner spectator-banner">
        <div class="banner-pill">
          <span class="live-rec-dot"></span>
          <span class="banner-status-tag">LIVE SPECTATOR FEED</span>
          <span class="banner-station-tag" style="border-color:${segmentRole.color}; color:${segmentRole.color}">
            ${segmentRole.icon} ${segmentRole.callsign} (${controller.name})
          </span>
        </div>
        <div class="banner-instruction">
          <strong>OBSERVER MODE:</strong> Controls assigned to ${segmentRole.title.toUpperCase()}. Watch telemetry!
          <button class="takeover-btn" id="crewEmergencyTakeoverBtn" title="Request manual emergency takeover if officer is away">TAKEOVER</button>
        </div>
      </div>
    `;

    const takeoverBtn = container.querySelector('#crewEmergencyTakeoverBtn');
    if (takeoverBtn) {
      takeoverBtn.onclick = () => {
        crew.takeoverAuthority();
        renderSpectatorHud(container);
      };
    }
  }
}

/**
 * Renders an authority badge above a specific subsystem or architecture panel
 */
export function renderRoleAuthorityTag(roleId, customNote = '') {
  const role = CREW_ROLES.find(r => r.id === roleId);
  if (!role || !crew.isCrewMode()) return '';
  const member = crew.getMember(roleId);
  const isMyAuthority = crew.canControlRole(roleId);

  return `
    <div class="role-authority-tag ${role.badgeClass} ${isMyAuthority ? 'my-authority' : 'observer-authority'}">
      <span class="auth-icon">${role.icon}</span>
      <div class="auth-details">
        <span class="auth-role">${role.title.toUpperCase()} // ${role.callsign}</span>
        <strong class="auth-name">${member.name}</strong>
      </div>
      <span class="auth-status-badge">${isMyAuthority ? '🟢 YOUR COMMAND' : '👁️ OBSERVER MODE'}</span>
      ${customNote ? `<span class="auth-note">${customNote}</span>` : ''}
    </div>
  `;
}

/**
 * Modal to configure Crew Manifest (Names & Roles)
 */
export function showCrewSetupModal(onConfirm) {
  showModeSelectScreen(null, {
    onSolo: () => { if (onConfirm) onConfirm(); },
    onTeamLaunch: () => { if (onConfirm) onConfirm(); }
  });
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
            <span class="poll-protocol-tag">NASA LAUNCH COMMIT PROTOCOL // ${crew.roomCode || 'SOLO'}</span>
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
