export const DESTINATIONS = [
  {id:'earth', name:'EARTH / LEO', subtitle:'SENTINEL RECOVERY', type:'Real-Time Traffic Control', color:'#75cdff', texture:'earth.jpg', radius:6371, radiusKm:'6,371 km', diameter:'12,742 km', scaleRatio:'1.00× Earth', gravity:9.81, gravityLabel:'9.81 m/s² (1.00 g)', distance:'408 km orbit', distanceAU:0.0000027, owltSeconds:0.0014, owltDisplay:'1.4 ms', rtltDisplay:'2.8 ms', dsnStation:'TDRSS-WSC (White Sands)', dsnStations:['TDRSS-WSC (White Sands)','Goldstone DSS-11','Canberra DSS-34'], carrierBand:'S-Band / Ku-Band (13.8 GHz)', anomalyId:'micrometeoroid_breach', autonomyMode:'Ground Tele-command (Direct)', days:3, difficulty:1, intro:'Mission Sentinel Recovery: Track orbital debris in Low Earth Orbit, schedule collision-avoidance burns with limited propellant, and manage ground station comms passes. Recover damaged satellite telemetry and Earth-observation data while navigating incomplete radar tracking!', discovery:'Recovered multispectral telemetry reveals decadal shifts in ocean conveyor circulation and atmospheric water vapor dynamics.', science:'Low Earth Orbit satellites use radar altimeters and radiometric sensors to monitor planetary climate vital signs while navigating crowded orbital corridors.', source:'https://science.nasa.gov/earth/', target:'SENTINEL-7 OBSERVATORY', surface:false},
  {id:'moon', name:'MOON', subtitle:'ARTEMIS PROSPECTOR', type:'Precision Landing & PSR Survival', color:'#cdd8e9', texture:'moon.jpg', radius:1737.4, radiusKm:'1,737 km', diameter:'3,475 km', scaleRatio:'0.27× Earth', gravity:1.62, gravityLabel:'1.62 m/s² (0.17 g)', distance:'384,400 km', distanceAU:0.00257, owltSeconds:1.28, owltDisplay:'1.28 s', rtltDisplay:'2.56 s', dsnStation:'Goldstone DSS-14 70m', dsnStations:['Goldstone DSS-14 70m','Canberra DSS-43','Madrid DSS-63'], carrierBand:'X-Band DSN (8.4 GHz)', anomalyId:'dust_electrostatic', autonomyMode:'Semi-Autonomous Assist (2.5s Lag)', days:3, difficulty:2, intro:'Mission Artemis Prospector: Pilot Odyssey to a precision landing near Shackleton Crater, control descent thrust against lunar gravity, then explore permanently shadowed regions with your rover to verify suspected water ice.', discovery:'Drill samples confirm crystalline water ice preserved in Shackleton Crater permanently shadowed cold traps.', science:'Deep craters at the lunar poles remain in permanent darkness at -246°C, trapping ice that can provide drinking water and rocket propellant.', source:'https://science.nasa.gov/moon/', target:'SHACKLETON LZ-01', surface:true},
  {id:'mars', name:'MARS', subtitle:'PERSEVERANCE FOOTSTEPS', type:'Open-World Exploration', color:'#efa678', texture:'mars.jpg', radius:3389.5, radiusKm:'3,390 km', diameter:'6,779 km', scaleRatio:'0.53× Earth', gravity:3.71, gravityLabel:'3.71 m/s² (0.38 g)', distance:'225 million km · mean', distanceAU:1.524, owltSeconds:750, owltDisplay:'12m 30s', rtltDisplay:'25m 00s', dsnStation:'Madrid DSS-63 70m', dsnStations:['Madrid DSS-63 70m','Goldstone DSS-14 70m','Canberra DSS-43 70m'], carrierBand:'X/Ka-Band DSN (32.1 GHz)', anomalyId:'cme_surge', autonomyMode:'On-Board Autonomous FDIR (25m Lag)', days:214, difficulty:3, intro:'Mission Perseverance Footsteps: Explore Jezero Crater, navigate rocky terrain and sandy dunes, plan safe routes on your orbital map, and survive dust storms. You have limited energy and sample tubes—prioritize the most valuable geological targets!', discovery:'Cored rock samples from the Jezero ancient river delta confirm lacustrine clay mudstones and olivine-carbonate alteration formed in a persistent lake environment.', science:'Jezero Crater hosted an ancient lake and river delta 3.5 billion years ago, depositing clay minerals that can preserve signs of past microbial life.', source:'https://science.nasa.gov/mission/mars-2020-perseverance/', target:'OCTAVIA E. BUTLER LZ', surface:true},
  {id:'asteroid', name:'VESTA', subtitle:'DAWN PROTOCOL', type:'Orbital Strategy & Navigation', color:'#b4a995', texture:'asteroid.jpg', radius:262.7, radiusKm:'263 km', diameter:'525 km (triaxial)', scaleRatio:'0.04× Earth', gravity:0.25, gravityLabel:'0.25 m/s² (0.03 g)', distance:'2.36 AU · mean orbit', distanceAU:2.362, owltSeconds:1178, owltDisplay:'19m 38s', rtltDisplay:'39m 16s', dsnStation:'Canberra DSS-43 70m', dsnStations:['Canberra DSS-43 70m','Madrid DSS-65','Goldstone DSS-24'], carrierBand:'Ka-Band Deep Space (32.0 GHz)', anomalyId:'wheel_saturation', autonomyMode:'Autonomous Navigation & Attitude (39m Lag)', days:382, difficulty:4, intro:'Mission Dawn Protocol: Navigate into orbit around protoplanet Vesta. Plan orbital observation passes between High-Altitude Mapping Orbit (HAMO) and Low-Altitude Mapping Orbit (LAMO). Match velocities at scanning waypoints, avoid tumbling boulder ejecta, and map ancient impact structures from multiple viewing angles!', discovery:'High-resolution VIR spectrometry confirms that Vesta is a differentiated mini-planet with an iron core, volcanic eucrite crust, and deep mantle olivine exposed in the 22-km Rheasilvia central peak.', science:'Vesta has an irregular triaxial shape and a colossal south pole impact crater (Rheasilvia) whose central mound is two and a half times taller than Mount Everest.', source:'https://science.nasa.gov/mission/dawn/', target:'RHEASILVIA IMPACT BASIN', surface:false},
  {id:'jupiter', name:'EUROPA / JUPITER', subtitle:'JOVIAN DEEP-FIELD', type:'High-Stakes Survival', color:'#dfc2a4', texture:'europa.jpg', radius:1560.8, radiusKm:'1,561 km (Europa)', diameter:'3,122 km (Europa)', scaleRatio:'0.25× Earth', gravity:1.315, gravityLabel:'1.32 m/s² (0.13 g)', distance:'5.2 AU · Jovian System', distanceAU:5.204, owltSeconds:2595, owltDisplay:'43m 15s', rtltDisplay:'86m 30s', dsnStation:'Goldstone DSS-14 70m Array', dsnStations:['Goldstone DSS-14 70m Array','Canberra DSS-43 70m','Madrid DSS-63 70m'], carrierBand:'Ka-Band Arrayed (34.2 GHz)', anomalyId:'jovian_plasma_arc', autonomyMode:'Autonomous Radiation Hardened (86m Lag)', days:740, difficulty:5, intro:'Mission Jovian Deep-Field: Operate near icy moon Europa while managing radiation exposure, spacecraft temperature, and limited communication windows. Balance power between propulsion, instruments, and shields, time your observations during quiet windows, and measure Europa’s induced magnetic field and surface salts before radiation forces an emergency retreat!', discovery:'Induced magnetic dipole measurements and hydrated salt spectra confirm a global liquid saltwater ocean beneath Europa’s fractured ice shell.', science:'Jupiter’s rotating magnetic field sweeps charged radiation past Europa, inducing electric currents in its subsurface salty ocean that generate a secondary magnetic field.', source:'https://science.nasa.gov/mission/europa-clipper/', target:'EUROPA ENCOUNTER CORRIDOR', surface:false}
];
export const SYSTEMS = [
  {id:'engine', label:'01 • PROPULSION', icon:'↗', choices:[
    {name:'Chemical / LH2',description:'Responsive thrust. Higher propellant consumption.',cost:55,mass:6,isp:450,thrust:1.15,efficiency:1,tag:'BALANCED'},
    {name:'Ion / Xenon',description:'Efficient cruise. Lower maneuvering thrust.',cost:85,mass:5,isp:1800,thrust:.8,efficiency:.58,tag:'ENDURANCE'},
    {name:'Advanced chemical',description:'High thrust. Expensive, responsive maneuvering.',cost:110,mass:8,isp:465,thrust:1.4,efficiency:1.12,tag:'PERFORMANCE'}]},
  {id:'power',label:'02 • POWER SYSTEM',icon:'ϟ',choices:[
    {name:'Solar + battery',description:'Lightweight. Output decreases farther from the Sun.',cost:28,mass:3,capacity:88,tag:'LIGHTWEIGHT'},
    {name:'Radioisotope',description:'Steady output in shadow and deep space.',cost:62,mass:5,capacity:110,tag:'RECOMMENDED'},
    {name:'Fission demonstrator',description:'High output, with a significant mass penalty.',cost:94,mass:9,capacity:138,tag:'HIGH OUTPUT'}]},
  {id:'shield',label:'03 • VEHICLE PROTECTION',icon:'◇',choices:[
    {name:'Whipple shielding',description:'Light protection against small debris.',cost:24,mass:4,armor:1,tag:'STANDARD'},
    {name:'Reinforced shelter',description:'Reduces collision and radiation damage.',cost:48,mass:8,armor:.55,tag:'RESILIENT'},
    {name:'Heavy protection',description:'Maximum survivability. Less acceleration.',cost:75,mass:13,armor:.32,tag:'EXPEDITION'}]},
  {id:'payload',label:'04 • SCIENCE PAYLOAD',icon:'⌬',choices:[
    {name:'Imaging spectrometer',description:'Fast remote scans and mineral identification.',cost:34,mass:3,scan:1.5,yield:1,tag:'REMOTE SENSING'},
    {name:'Radar + sample kit',description:'Balanced subsurface surveys and sample collection.',cost:52,mass:6,scan:1,yield:1.3,tag:'EXPLORER'},
    {name:'Return laboratory',description:'Slower scans. Higher value from recovered material.',cost:82,mass:10,scan:.8,yield:1.6,tag:'DEEP SCIENCE'}]},
  {id:'communications',label:'05 • COMMUNICATIONS',icon:'⌁',choices:[
    {name:'Patch antenna array',description:'Light radio package. Standard relay acquisition.',cost:8,mass:1,demand:.08,link:1,tag:'LIGHTWEIGHT',bandwidth:'2.0 kbps',linkMargin:'+3.2 dB',carrierLock:'LOCKED (BEACON RATE)'},
    {name:'High-gain dish',description:'Larger aperture. Relay acquisition 12% faster.',cost:14,mass:1.5,demand:.12,link:1.12,tag:'DEEP SPACE',bandwidth:'28.5 kbps',linkMargin:'+8.7 dB',carrierLock:'LOCKED (HIGH RATE)'},
    {name:'Dish + relay mast',description:'Redundant radio package. Relay acquisition 25% faster.',cost:22,mass:2,demand:.18,link:1.25,tag:'REDUNDANT',bandwidth:'128 kbps',linkMargin:'+14.1 dB',carrierLock:'LOCKED (DUAL CARRIER)'}]},
  {id:'thermal',label:'06 • THERMAL CONTROL',icon:'≋',choices:[
    {name:'Passive radiator fins',description:'Radiates waste heat. Standard cooling rate.',cost:8,mass:1.5,demand:.04,cooling:1,tag:'PASSIVE'},
    {name:'Deployable radiator wings',description:'More radiator area. Cooling rate increased by 30%.',cost:14,mass:2,demand:.07,cooling:1.3,tag:'HIGH AREA'},
    {name:'Pumped radiator loop',description:'Active circulation. Cooling rate increased by 60%.',cost:20,mass:3,demand:.16,cooling:1.6,tag:'ACTIVE COOLING'}]},
  {id:'guidance',label:'07 • ATTITUDE CONTROL',icon:'⊕',choices:[
    {name:'RCS thruster pack',description:'Baseline lateral control and attitude actuators.',cost:7,mass:.7,demand:.05,handling:1,tag:'RCS'},
    {name:'Reaction wheels + RCS',description:'Fine pointing package. Lateral response improved by 15%.',cost:13,mass:1.2,demand:.09,handling:1.15,tag:'PRECISION'},
    {name:'Redundant navigation suite',description:'Dual star trackers and actuators. Lateral response improved by 30%.',cost:20,mass:1.8,demand:.14,handling:1.3,tag:'REDUNDANT'}]},
  {id:'recovery',label:'08 • RECOVERY BAY',icon:'▣',choices:[
    {name:'Compact field vehicle',description:'Light rover/drone package. Standard recovered science yield.',cost:10,mass:2,demand:.03,recovery:1,tag:'SCOUT'},
    {name:'Sample handling bay',description:'Adds a manipulator and sealed canisters. Recovery yield +10%.',cost:18,mass:3,demand:.07,recovery:1.1,tag:'SAMPLE RETURN'},
    {name:'Protected archive vault',description:'Larger handling bay and record vault. Recovery yield +20%.',cost:26,mass:4,demand:.11,recovery:1.2,tag:'ARCHIVE'}]},
  {id:'tanks',label:'09 • PROPELLANT STORAGE',icon:'◉',choices:[
    {name:'Standard tank pair',description:'28 t propellant. Light storage structure.',cost:8,mass:2,demand:.02,fuelMass:28,tag:'STANDARD'},
    {name:'Extended tank cluster',description:'34 t propellant. More reserve, more launch mass.',cost:16,mass:3,demand:.03,fuelMass:34,tag:'ENDURANCE'},
    {name:'Long-range tank assembly',description:'40 t propellant. Highest reserve; watch the 85 t limit.',cost:24,mass:5,demand:.05,fuelMass:40,tag:'LONG RANGE'}]}
];
export const DEFAULT_LOADOUT=[0,1,1,1,0,0,0,0,0];
// Shared concept specifications used by the catalog, engineering totals and simulation.
SYSTEMS[0].choices.forEach((p,i)=>{p.thrustN=[200000,.35,280000][i];p.demand=i===1?p.thrustN*p.isp*9.80665/(2*.6*1000):.15;});
SYSTEMS[1].choices.forEach((p,i)=>{p.outputKW=[18,2.4,20][i];p.solar=i===0;p.demand=0;});
SYSTEMS[2].choices.forEach(p=>p.demand=0);
SYSTEMS[3].choices.forEach((p,i)=>p.demand=[.25,.45,.8][i]);
export function normalizeLoadout(loadout=DEFAULT_LOADOUT){return SYSTEMS.map((s,i)=>Number.isInteger(loadout[i])&&s.choices[loadout[i]]?loadout[i]:DEFAULT_LOADOUT[i]);}
export const STAGES = [
  {title:'LEAVE THE BLUE BEHIND',short:'Departure',verb:'Fly through the glowing rings ahead',kind:'gates',color:'#77d9e9',chapter:'01',commander:'Flight Director Imani',message:'Odyssey, you are cleared for launch! Press W to fly forward, A and D to steer, and fly through the glowing rings ahead.',tip:'Press W to move forward · S to slow down · A and D to steer · Follow the glowing rings.',fact:'In space, objects keep moving even when engines turn off. Press S to brake and slow down.'},
  {title:'THE SPACE BETWEEN',short:'Transfer',verb:'Avoid space rocks and debris',kind:'gates',color:'#e5b876',chapter:'02',commander:'Flight Engineer Reyes',message:'Watch out, space rocks ahead! Watch your radar. Steer around floating rocks, or press 3 to turn on your shield.',tip:'Steer with A and D · Press SPACE to boost · Press 3 for shield · Press R to repair.',fact:'Space rocks move quickly. Turning on shields protects your ship from impacts.'},
  {title:'A VOICE IN THE STATIC',short:'Survey',verb:'Find and scan three signal beacons',kind:'scan',color:'#7ddec2',chapter:'03',commander:'Science Officer Sen',message:'Three radio signals detected ahead! Fly close to each beacon, slow down below 12 meters per second, and hold E to scan.',tip:'Fly close to the marker · Slow down below 12 m/s with S · Hold E to scan.',fact:'Sensors can identify minerals from orbit using reflected light and radio waves.'},
  {title:'THE POINT OF NO RETURN',short:'Approach',verb:'Fly down and land safely',kind:'land',color:'#e8b182',chapter:'04',commander:'Flight Director Imani',message:'We found the landing area! Fly into the green target box, slow down below 10 meters per second, and press E to land.',tip:'Slow down below 10 m/s · The box turns green when you are slow enough · Press E to land.',fact:'Landing safely requires coming in slow and steady so your craft does not crash.'},
  {title:'WHAT THE SILENCE KEPT',short:'Discovery',verb:'Drive rover and collect three science samples',kind:'explore',color:'#8adecc',chapter:'05',commander:'Science Officer Sen',message:'Your rover is on the surface! Drive to the markers with W and S. Stop near each sample and press E to collect it.',tip:'Drive forward with W · Reverse with S · Steer with A and D · Stop and press E to collect.',fact:'Rovers collect physical rock and soil samples to study planetary history up close.'},
  {title:'BRING THE STORY HOME',short:'Return',verb:'Fly to the space station and dock',kind:'dock',color:'#88ccec',chapter:'06',commander:'Flight Director Imani',message:'Welcome back, Odyssey! The space station is straight ahead. Fly close, slow down below 8 meters per second, and press E to dock.',tip:'Fly toward the docking ring · Slow down below 8 m/s · Press E to dock safely.',fact:'Docking in space is like gently parking your ship next to another moving spacecraft.'}
];

export const DESTINATION_STAGES = {
  mars: [
    {title:'JEZERO ORBITAL SURVEY',short:'Insertion',verb:'Fly through orbital approach rings',kind:'gates',color:'#efa678',chapter:'01',commander:'Perseverance Flight Director',message:'Welcome to Mars orbit! You are aligned with Jezero Crater. Press W to fly forward and steer through the glowing orbital rings.',tip:'Press W to move forward · S to brake · A and D to turn · Follow the rings.',fact:'Orbiting Mars takes high precision because its thin atmosphere requires exact entry angles.'},
    {title:'MARTIAN ENTRY & DUST CORRIDOR',short:'Entry Corridor',verb:'Fly through upper atmospheric dust layers',kind:'gates',color:'#e59a6c',chapter:'02',commander:'Flight Engineer Reyes',message:'Entering Mars upper atmosphere! Atmospheric friction and dust streams detected ahead. Steer around turbulent dust clouds or press 3 for shields.',tip:'Steer with A and D · Press 3 for shields · Press SPACE to boost · Press R to repair.',fact:'Mars experiences seasonal global dust storms where fine reddish silicate particles rise into the high stratosphere.'},
    {title:'HIRISE DELTA RECONNAISSANCE',short:'Delta Survey',verb:'Find and scan three orbital mapping beacons',kind:'scan',color:'#84d8cc',chapter:'03',commander:'Science Officer Sen',message:'Three orbital reconnaissance beacons located over the ancient Jezero river delta! Fly close, slow below 12 meters per second, and hold E to scan.',tip:'Fly close to the beacon · Slow below 12 m/s · Hold E to scan.',fact:'NASA High Resolution Imaging Science Experiment (HiRISE) camera maps meter-scale boulders and sand ripples from orbit.'},
    {title:'OCTAVIA E. BUTLER LZ DESCENT',short:'Crater Landing',verb:'Fly into the green target box and touch down safely',kind:'land',color:'#d88f62',chapter:'04',commander:'Perseverance Flight Director',message:'Octavia E. Butler Landing Zone inside Jezero Crater is in sight! Fly into the green target box, slow down below 10 meters per second, and press E to land.',tip:'Fly into the green zone · Slow down below 10 m/s · Press E to land.',fact:'Perseverance used Terrain-Relative Navigation to autonomously avoid hazard fields during descent.'},
    {title:'PERSEVERANCE FOOTSTEPS',short:'Jezero Traverse',verb:'Drive rover, survive dust storms, and core rock samples',kind:'explore',color:'#9ae0d6',chapter:'05',commander:'Science Officer Sen',message:'Perseverance rover is deployed on Jezero Crater floor! Drive with W and S across rocky terrain. Plan safe routes using your orbital map to reach priority targets, survive dust storms, and seal valuable rock cores. Press X when ready to depart.',tip:'Drive with W/S and A/D · Check orbital map route vectors · Limited battery & 2 sample tubes · Press E to sample.',fact:'Perseverance carries ultra-clean titanium sample tubes to seal drill cores for future retrieval by the Mars Sample Return campaign.'},
    {title:'MARS ASCENT & RETURN DOCKING',short:'Ascent & Dock',verb:'Dock with the Mars Sample Return orbiter',kind:'dock',color:'#88ccec',chapter:'06',commander:'Perseverance Flight Director',message:'Cored samples secured! Ascent stage is in rendezvous orbit. Fly toward the Mars return orbiter, slow below 8 meters per second, and press E to dock.',tip:'Fly to the return orbiter · Slow down below 8 m/s · Press E to dock safely.',fact:'The planned Mars Sample Return mission will use an automated orbital rendezvous to bring cached Jezero cores back to Earth.'}
  ],
  earth: [
    {title:'LOW EARTH ORBIT INSERTION',short:'LEO Insertion',verb:'Fly through orbital insertion gates',kind:'gates',color:'#75cdff',chapter:'01',commander:'Flight Director Imani',message:'Odyssey, you are in Low Earth Orbit! Press W to fly forward, A and D to steer, and guide your spacecraft through each glowing orbital ring.',tip:'Press W to move forward · S to brake · A/D to steer · Follow the glowing rings.',fact:'Objects in Low Earth Orbit circle Earth every 90 minutes at 7.8 km/s, requiring precise insertion angles.'},
    {title:'THE KESSLER TRAFFIC SWARM',short:'Debris Swarm',verb:'Track orbital debris and avoid conjunctions',kind:'gates',color:'#e5a876',chapter:'02',commander:'Flight Engineer Reyes',message:'Warning: entering crowded LEO debris corridor! Uncataloged fragments tracked on collision vectors. Monitor your radar, execute collision avoidance burns with B, or divert to shields.',tip:'Monitor radar · Press B for CAM burn · Steer with A/D · Press 3 for shields · Avoid conjunctions.',fact:'Over 25,000 tracked orbital debris objects circle Earth, requiring active orbital traffic monitoring to prevent collisions.'},
    {title:'ORBITING TELEMETRY BEACONS',short:'Radar Tracking',verb:'Scan three ground-linked tracking relays',kind:'scan',color:'#7dddec',chapter:'03',commander:'Science Officer Sen',message:'Three orbital tracking relays detected! Fly close, slow below 12 m/s, and hold E to scan satellite trajectories and ground station downlink codes.',tip:'Fly close to the beacon · Slow below 12 m/s with S · Hold E to scan.',fact:'Ground station networks track satellite passes using radar ranging to predict orbital decay and conjunction risks.'},
    {title:'SENTINEL-7 SYNCHRONOUS RENDEZVOUS',short:'Rendezvous',verb:'Catch up to the tumbling Sentinel-7 satellite',kind:'rendezvous',color:'#75cdff',chapter:'04',commander:'Flight Director Imani',message:'Visual contact with tumbling Sentinel-7! Fly into the green capture corridor, slow below 10 meters per second, and press E to lock relative orbital velocity.',tip:'Fly into the green corridor · Slow below 10 m/s · Press E to match speed.',fact:'Orbital rendezvous requires synchronizing both altitude and velocity vectors so spacecraft coast together in microgravity.'},
    {title:'SENTINEL RECOVERY: TRAFFIC MANAGEMENT',short:'Satellite Recovery',verb:'Retrieve telemetry and climate data while avoiding conjunctions',kind:'explore',color:'#a0e2dc',chapter:'05',commander:'Science Officer Sen',message:'Drone retrieval bay active on Sentinel-7! Recover primary telemetry, ocean color data, and atmospheric aerosol archives. Watch your orbital radar: debris conjunctions remain active! Schedule CAM burns with B when necessary, but manage your propellant margin.',tip:'Hold E to retrieve data · Press B for CAM burn during conjunction alerts · Manage propellant · Press X when complete.',fact:'Active debris avoidance and satellite servicing are crucial technologies for sustainable future orbital operations in congested LEO corridors.'},
    {title:'DE-ORBIT BURN & STATION DOCKING',short:'De-Orbit & Dock',verb:'Dock with the orbital recovery station',kind:'dock',color:'#88ccec',chapter:'06',commander:'Flight Director Imani',message:'Climate records safely secured! Firing de-orbit guidance burn. The orbital recovery station is straight ahead. Fly close, slow below 8 meters per second, and press E to dock.',tip:'Fly to the docking ring · Slow below 8 m/s · Press E to dock safely.',fact:'Spacecraft perform retrograde burns to lower their orbital perigee and dock with space stations or re-enter Earth’s atmosphere.'}
  ],
  moon: [
    {title:'TRANS-LUNAR INJECTION',short:'Departure',verb:'Fly through the lunar flight rings',kind:'gates',color:'#cdd8e9',chapter:'01',commander:'Artemis Flight Director',message:'You are on course for the Moon! Press W to fly forward and steer through the glowing rings ahead.',tip:'Press W to move forward · S to brake · A and D to turn · Follow the rings.',fact:'Traveling to the Moon takes about three days across 384,000 kilometers of space.'},
    {title:'CIS-LUNAR METEOROID VOID',short:'Transit',verb:'Avoid flying space pebbles',kind:'gates',color:'#e5c282',chapter:'02',commander:'Flight Engineer Reyes',message:'Watch out for tiny space pebbles! Steer around them, or press 3 to turn on your protective shields.',tip:'Steer with A and D · Press 3 for shields · Press SPACE to boost · Press R to repair.',fact:'Because the Moon has no atmosphere, space dust and small rocks fall straight toward its surface.'},
    {title:'POLAR SURVEY BEACONS',short:'Survey',verb:'Find and scan three moon ice beacons',kind:'scan',color:'#91e0d3',chapter:'03',commander:'Science Officer Sen',message:'Three sensor beacons detected near the Moon South Pole! Fly close, slow below 12 meters per second, and hold E to scan.',tip:'Fly close to the beacon · Slow below 12 m/s · Hold E to scan.',fact:'Special sensors measure hydrogen from orbit to find water ice hidden under lunar soil.'},
    {title:'SHACKLETON PRECISION DESCENT',short:'Precision Landing',verb:'Control descent thrust and land under 3.5 m/s',kind:'land',color:'#d2ddec',chapter:'04',commander:'Artemis Flight Director',message:'Mission Artemis Prospector: Control your descent thrusters against lunar gravity! Align your horizontal position with A/D, brake with S, and touch down under 3.5 m/s. Hard landings will buckle the gear and damage science equipment!',tip:'Control descent thrust with W/S · Steer horizontally with A/D · Land under 3.5 m/s to protect equipment.',fact:'Precision touchdown prevents landing leg damage and ensures sensitive optical spectrometers stay calibrated.'},
    {title:'SHACKLETON PERMANENT SHADOW',short:'PSR Exploration',verb:'Drive rover in dark crater and scan water ice deposits',kind:'explore',color:'#a5e7de',chapter:'05',commander:'Science Officer Sen',message:'Your rover is active on the Shackleton Crater floor! This permanently shadowed region never receives sunlight. Watch battery drain, use your headlights, and press Q for LIDAR terrain scans to find water ice deposits.',tip:'Drive with W/S and A/D · Headlights illuminate dark crater · Press Q for LIDAR terrain scan · Press E to sample.',fact:'Deep lunar cold traps sit at -246°C in eternal shadow, preserving pristine ice deposits for billions of years.'},
    {title:'LUNAR ASCENT & GATEWAY DOCK',short:'Ascent',verb:'Dock with the lunar Gateway station',kind:'dock',color:'#88ccec',chapter:'06',commander:'Artemis Flight Director',message:'Blasting off from the Moon! The Gateway space station is ahead. Fly close, slow below 8 meters per second, and press E to dock.',tip:'Fly to the Gateway station · Slow below 8 m/s · Press E to dock safely.',fact:'Astronauts will use lunar space stations like Gateway as outposts to travel between Earth and the Moon.'}
  ],
  asteroid: [
    {title:'VESTA GRAVITATIONAL INSERTION',short:'Insertion',verb:'Fly through orbital approach rings',kind:'gates',color:'#b4a995',chapter:'01',commander:'Dawn Mission Director',message:'Welcome to Asteroid Vesta! Vesta is an irregular protoplanet. Guide your spacecraft through the glowing orbital insertion rings to stabilize into initial survey orbit.',tip:'Press W to move forward · S to brake · A and D to turn · Follow the rings.',fact:'NASA Dawn spacecraft entered orbit around Vesta in 2011 using xenon ion propulsion, the first spacecraft to orbit a main belt asteroid.'},
    {title:'RHEASILVIA BOULDER EJECTA',short:'Ejecta Field',verb:'Dodge tumbling boulder ejecta from ancient impacts',kind:'gates',color:'#d6b885',chapter:'02',commander:'Flight Engineer Reyes',message:'Warning: Approaching the Rheasilvia impact ejecta stream! Massive tumbling boulders are orbiting at high speeds. Steer clear or press 3 for shields.',tip:'Steer with A and D · Press 3 for shields · Press SPACE to boost · Press R to repair.',fact:'The impact that gouged Rheasilvia crater ejected one percent of Vesta’s entire volume into space, creating the vestoid asteroids and HED meteorites.'},
    {title:'SURVEY ORBIT RECONNAISSANCE',short:'Survey Orbit',verb:'Find and scan three global mapping beacons',kind:'scan',color:'#84d8cc',chapter:'03',commander:'Science Officer Sen',message:'Three global reconnaissance beacons established in Survey Orbit! Fly close, slow below 12 m/s, and hold E to scan pyroxene and iron reflectance.',tip:'Fly close to the beacon · Slow below 12 m/s · Hold E to scan.',fact:'In Survey Orbit at 2,700 km altitude, Dawn mapped the overall shape, mass distribution, and global mineral patterns of Vesta.'},
    {title:'ORBIT TRANSITION (HAMO ➔ LAMO)',short:'Orbit Shift',verb:'Maneuver into the low-altitude mapping corridor',kind:'rendezvous',color:'#c4baa8',chapter:'04',commander:'Dawn Mission Director',message:'Initiating orbital descent! Match velocity in the capture corridor. Slow below 10 m/s and press E to lock into observation orbit.',tip:'Fly into the green corridor · Slow below 10 m/s · Press E to lock orbit.',fact:'Transitioning between orbits around an irregular asteroid requires careful thruster burns to avoid unstable gravitational resonance.'},
    {title:'DAWN PROTOCOL: RHEASILVIA MAPPING',short:'Basin Mapping',verb:'Navigate observation passes and map ancient mineral signatures',kind:'explore',color:'#a2ddd4',chapter:'05',commander:'Science Officer Sen',message:'Entering primary mapping passes over Rheasilvia crater! Choose your orbit: High Orbit (HAMO) is safe with standard scans; Low Orbit (LAMO) gives +80% high-resolution science but risks boulder ejecta and gravity shear! Match speed at waypoints and hold E to scan.',tip:'Altitude with ↑/↓ · Press T to toggle HAMO/LAMO · Slow under 12 m/s · Hold E to scan.',fact:'Low-Altitude Mapping Orbit (LAMO) orbited just 210 km above Vesta, providing sub-meter stereo imaging and elemental neutron mapping.'},
    {title:'ESCAPE BURN & CARRIER RENDEZVOUS',short:'Departure',verb:'Dock with the carrier ship for the journey home',kind:'dock',color:'#88ccec',chapter:'06',commander:'Dawn Mission Director',message:'Mapping protocol complete! Firing escape burn to leave Vesta orbit. Fly toward the carrier ship, slow below 8 m/s, and press E to dock.',tip:'Fly to the carrier ship · Slow below 8 m/s · Press E to dock safely.',fact:'Dawn was the first spacecraft ever to leave orbit around one extraterrestrial body (Vesta) and travel to orbit another (dwarf planet Ceres).'}
  ],
  jupiter: [
    {title:'JOVIAN GRAVITATIONAL INSERTION',short:'Insertion',verb:'Fly through outer magnetospheric approach gates',kind:'gates',color:'#dfc2a4',chapter:'01',commander:'Europa Mission Lead',message:'Welcome to the Jovian system! Jupiter’s colossal gravity field is pulling you in toward Europa. Press W to thrust forward, steer through the approach rings, and prepare for radiation belt insertion.',tip:'Press W to move forward · S to brake · A and D to turn · Follow the rings.',fact:'Jupiter’s magnetosphere is the largest structure in the solar system, spanning millions of kilometers across space.'},
    {title:'THE DEADLY RADIATION BELTS',short:'Radiation Belts',verb:'Survive intense radiation surges and flux tubes',kind:'gates',color:'#f29b7a',chapter:'02',commander:'Flight Engineer Reyes',message:'Warning: entering Jupiter’s lethal radiation belts! Radiation flux is spiking. Press 3 for SHIELDS to protect spacecraft electronics and minimize damage.',tip:'Press 3 for SHIELDS · Steer away from flux hazards · Press R to repair hull & instruments.',fact:'Jupiter’s trapped radiation belts deliver millions of times the radiation dose experienced near Earth, requiring titanium shielding vaults.'},
    {title:'EUROPA MAGNETIC & AURORAL SOUNDING',short:'Sounding Pass',verb:'Scan sensor relays and map induced magnetic dipoles',kind:'scan',color:'#76dbcc',chapter:'03',commander:'Science Officer Sen',message:'Three Jovian magnetospheric sensor relays detected! Fly close, slow below 12 m/s, and hold E to scan magnetic field vectors.',tip:'Fly close to each relay · Slow below 12 m/s · Hold E to scan.',fact:'Galileo spacecraft detected changes in Europa’s magnetic field, providing the first evidence of a subsurface saltwater ocean conducting electric currents.'},
    {title:'EUROPA CLOSE FLYBY ENCOUNTER',short:'Flyby Corridor',verb:'Maneuver into the close Europa observation corridor',kind:'rendezvous',color:'#e5a872',chapter:'04',commander:'Europa Mission Lead',message:'Entering Europa close flyby trajectory! Match orbital velocity in the capture corridor. Slow below 10 m/s and press E to lock into observation pass.',tip:'Fly into the green corridor · Slow below 10 m/s · Press E to lock encounter.',fact:'NASA Europa Clipper will execute dozens of close flybys rather than a permanent orbit to minimize radiation exposure while mapping the moon.'},
    {title:'JOVIAN DEEP-FIELD: HIGH-STAKES SCANNING',short:'Deep-Field',verb:'Map magnetic dipole and ice salts · Retreat before radiation burnout',kind:'explore',color:'#a5ded4',chapter:'05',commander:'Science Officer Sen',message:'Primary Europa deep-field pass active! Time scans during quiet radiation windows. Monitor your radiation dose and instrument health. Press X to retreat to safety once you have data, or risk extra scans for maximum science!',tip:'Time quiet windows · Route 3 for shields in surges · Scan with E · Press X to retreat to safety.',fact:'Every close pass over Europa accumulates radiation dose on instruments. Missions must strictly budget exposure before retreating to safe apoapsis.'},
    {title:'GRAVITY-ASSIST ESCAPE & CARRIER DOCK',short:'Escape Slingshot',verb:'Slingshot out of the radiation belts and dock with carrier',kind:'dock',color:'#88ccec',chapter:'06',commander:'Europa Mission Lead',message:'Retreating from Europa radiation belts! Using Jupiter’s gravity assist to slingshot toward the carrier ship. Slow below 8 m/s and press E to dock.',tip:'Fly to the carrier ship · Slow below 8 m/s · Press E to dock safely.',fact:'Gravity assists from Jupiter accelerate spacecraft onto high-speed interplanetary trajectories to return scientific data to Earth.'}
  ]
};

export function getDestinationStages(destId = 'mars') {
  return DESTINATION_STAGES[destId] || DESTINATION_STAGES[destId === 'asteroid' ? 'asteroid' : 'mars'] || STAGES;
}
export const EVENTS = {
  flare:{
    label:'SOLAR STORM WARNING',
    title:'A solar storm is approaching!',
    speaker:'REYES / FLIGHT ENGINEER',
    anomalyType:'SOLAR ENERGETIC PARTICLES',
    dsnDelay:'Speed-of-light delay active',
    body:'Solar radiation is rising fast! Choose what to do: turn on shields to protect the ship, or keep sensors open to study the storm at the cost of damage.',
    choices:[
      {label:'Turn on shields to protect ship',detail:'−6 power · ship stays safe',effect:'shelter',system:'Vehicle Protection'},
      {label:'Keep sensors open to study storm',detail:'+12 science · hull takes some damage',effect:'observe',system:'Science Payload'}
    ]
  },
  cme_surge:{
    label:'DEEP SPACE ANOMALY · CORONAL MASS EJECTION',
    title:'Interplanetary CME Proton Storm Surge',
    speaker:'AUTONOMOUS FAULT PROTECTION (FDIR)',
    anomalyType:'SOLAR PROTON EVENT (SPE > 10,000 pfu)',
    dsnDelay:'12m 30s OWLT · 25m 00s RTLT',
    body:'DSN Madrid DSS-63 reports an extreme Coronal Mass Ejection proton storm crossing our flight vector. With a 25-minute round-trip comms lag, Earth cannot send emergency commands in time! The spacecraft autonomous fault system requires your triage directive.',
    choices:[
      {label:'Autonomous Attitude Shadowing',detail:'Orient propulsion bell towards Sun as sacrificial cosmic shield · −5 power · +14 science · hull protected',effect:'autonomous_attitude',system:'Guidance & Attitude (Subsystem 07)'},
      {label:'Expose Spectrometers for Particle Science',detail:'Record unprecedented SPE coronal flux data · +24 science · hull takes 14 damage',effect:'observe',system:'Science Payload (Subsystem 04)'},
      {label:'Deploy Heavy Radiation Baffles',detail:'Stow solar arrays & divert bus into shields · −6 power · +10 science · zero damage',effect:'shelter',system:'Protection (Subsystem 03)'}
    ]
  },
  wheel_saturation:{
    label:'DEEP SPACE ANOMALY · MOMENTUM DUMP',
    title:'Reaction Wheel Momentum Saturation Limit',
    speaker:'AUTONOMOUS ATTITUDE CONTROL (ACS)',
    anomalyType:'ANGULAR MOMENTUM REDLINE (4,800 RPM)',
    dsnDelay:'19m 38s OWLT · 39m 16s RTLT',
    body:'Continuous gravitational torque gradients near Vesta have spun reaction wheels to 98% maximum rated speed. Pointing jitter threatens imaging science. Round-trip comms delay to DSN Canberra is 39 minutes—execute on-board desaturation triage!',
    choices:[
      {label:'Fire RCS Thrusters for Immediate Desaturation',detail:'Hydrazine pulses dump spin momentum · −6 fuel · attitude stability restored',effect:'rcs_desaturate',system:'Attitude Control (Subsystem 07)'},
      {label:'Leverage Triaxial Gravity Gradient Slingshot',detail:'Use Vesta irregular gravity torques to bleed spin · +16 science · safe recovery',effect:'gravity_dump',system:'Orbital Dynamics'},
      {label:'Emergency System Safe-Mode Coast',detail:'Idle scientific instruments and drift into dampening attitude · −6 power · safe recovery',effect:'shelter',system:'Autonomous Safe-Mode'}
    ]
  },
  jovian_plasma_arc:{
    label:'DEEP SPACE ANOMALY · PLASMA SURGE',
    title:'Io-Europa Flux Tube High-Voltage Plasma Arc',
    speaker:'JOVIAN RADIATION SHIELD COMPUTER',
    anomalyType:'ELECTROSTATIC INDUCTION (5.0 MA FLUX)',
    dsnDelay:'43m 15s OWLT · 86m 30s RTLT',
    body:'Crossing Jupiter’s rotating magnetic flux tube has built a massive 5-megavolt static potential across the spacecraft chassis. Comms round-trip to DSN Goldstone 70m array is 86.5 minutes! Choose autonomous triage before arc discharge.',
    choices:[
      {label:'Autonomous Main Bus Load Shedding',detail:'Isolate scientific instruments and shunt excess current · −8 power · +18 science · zero damage',effect:'load_shed',system:'Power System (Subsystem 02)'},
      {label:'Plasma Wake Charge Dissipation',detail:'Use vehicle shields and cold gas to bleed static into wake · −5 power · +12 science',effect:'shield_bleed',system:'Protection (Subsystem 03)'},
      {label:'Emergency System Safe Coast',detail:'Enter protected sleep state until flux tube transit completes · −6 power · safe coast',effect:'shelter',system:'Autonomous Safe-Mode'}
    ]
  },
  dust_electrostatic:{
    label:'DEEP SPACE ANOMALY · REGOLITH ACCUMULATION',
    title:'Levitated Photoelectric Lunar Dust Surge',
    speaker:'SURFACE ENVIRONMENT SENSOR',
    anomalyType:'PHOTOELECTRIC DUST CHARGING',
    dsnDelay:'1.28s OWLT · 2.56s RTLT',
    body:'Sub-micron lunar regolith grains charged by solar ultraviolet are clinging electrostatically to radiator panels and optical camera windows. Radiator efficiency is dropping.',
    choices:[
      {label:'High-Frequency Hull Repulsion Pulse',detail:'Electrostatically repel charged dust · −5 power · optics cleared · +14 science',effect:'dust_repel',system:'Power & Electronics'},
      {label:'Mechanical Purge & Array Sweeping',detail:'Cycle mechanical radiator wipers · −3 power · +10 science · thermal margin restored',effect:'purge_filter',system:'Thermal Control (Subsystem 06)'},
      {label:'Stow Optical Covers & Retract Radiator',detail:'Shelter delicate sensor lenses · −4 power · zero damage',effect:'shelter',system:'Protection (Subsystem 03)'}
    ]
  },
  micrometeoroid_breach:{
    label:'DEEP SPACE ANOMALY · DEBRIS BREACH',
    title:'Hypervelocity Debris Puncture in Cooling Loop',
    speaker:'THERMAL CONTROL TELEMETRY',
    anomalyType:'MICROMETEOROID / DEBRIS PENETRATION',
    dsnDelay:'1.4ms OWLT · 2.8ms RTLT',
    body:'A millimetric debris shard in LEO penetrated secondary radiator channel B. Freon coolant pressure is venting at 14 kPa/s. TDRSS White Sands uplink confirmed loss of pressure!',
    choices:[
      {label:'Actuate Pyrotechnic Isolation Valves',detail:'Quarantine damaged branch · −4 power · cooling stabilized · +12 science',effect:'isolate_loop',system:'Thermal Control (Subsystem 06)'},
      {label:'Deploy EVA Drone Sealant Patch',detail:'Expend 1 repair kit for robot patch · +18 science · +15 hull restored',effect:'drone_patch',system:'Recovery Bay (Subsystem 08)'},
      {label:'Reroute Power Bus to Emergency Cold Plates',detail:'Divert excess heat to auxiliary radiators · −6 power · safe recovery',effect:'shelter',system:'Power & Thermal'}
    ]
  },
  recorder:{
    label:'MISSION ARCHIVE FOUND',
    title:'“Please, bring the science home.”',
    speaker:'RECOVERED RADIO MESSAGE',
    anomalyType:'RECORDED TRANSMISSION',
    dsnDelay:'Direct Relay Uplink',
    body:'The station team left a final message: please save our discovery records! You can spend extra battery power to download everything, or save your fuel for the trip home.',
    choices:[
      {label:'Download all science data',detail:'−12 power · +22 science · full story ending',effect:'archive',system:'Communications & Storage'},
      {label:'Save fuel for safe return',detail:'+8 fuel · +8 science · safe return ending',effect:'return',system:'Propulsion Margin'}
    ]
  }
};
export const NASA_MISSION_CLASSES = [
  {
    id: 'discovery',
    name: 'NASA DISCOVERY PROGRAM',
    shortName: 'Discovery',
    costLimit: 500, // $500M budget cap
    baseMassLimit: 85, // 85 t payload mass cap
    tag: 'COST-CAPPED · COMPETITIVE',
    badge: 'DISCOVERY · $500M CAP',
    description: '💡 Smart-budget NASA mission ($500M cap). Great for lean robotic scouts like Dawn and Kepler!',
    icon: '🔭',
    examples: 'Dawn, Kepler, InSight, Psyche'
  },
  {
    id: 'new_frontiers',
    name: 'NASA NEW FRONTIERS PROGRAM',
    shortName: 'New Frontiers',
    costLimit: 1000, // $1.0B budget cap
    baseMassLimit: 110, // 110 t payload mass cap
    tag: 'DECADAL PRIORITY · MID-SCALE',
    badge: 'NEW FRONTIERS · $1.0B CAP',
    description: '💡 Mid-sized NASA missions ($1.0B cap). Balanced exploration like New Horizons and Juno!',
    icon: '🛰',
    examples: 'New Horizons, Juno, OSIRIS-REx'
  },
  {
    id: 'flagship',
    name: 'NASA FLAGSHIP PROGRAM',
    shortName: 'Flagship',
    costLimit: 3250, // $3.25B budget cap
    baseMassLimit: 150, // 150 t payload mass cap
    tag: 'LARGE STRATEGIC · MULTI-BILLION',
    badge: 'FLAGSHIP · $3.25B CAP',
    description: '💡 Mega NASA missions ($3.25B cap). Heavy rovers & deep-space labs like Perseverance and Europa Clipper!',
    icon: '🪐',
    examples: 'Europa Clipper, Perseverance, Cassini'
  }
];

export const LAUNCH_VEHICLES = [
  {
    id: 'falcon9_medium',
    name: 'Falcon 9 / Commercial Medium',
    shortName: 'Falcon 9 Medium',
    provider: 'Commercial Launch Services',
    cost: 85, // $85M procurement
    fairingDiameter: '5.2 m',
    fairingLength: '13.1 m',
    maxPayloadMass: 76, // 76 t max wet mass rating
    deltaVBonus: 0.0, // baseline trans-injection
    c3Capability: 'Standard C3 (Inner Solar System & LEO)',
    tag: '5.2m COMPOSITE FAIRING · 76 t',
    description: '💡 Reliable rocket with 5.2m cargo hood ($85M). Perfect for light & medium explorers.',
    icon: '🚀'
  },
  {
    id: 'heavy_workhorse',
    name: 'Falcon Heavy / Vulcan Centaur',
    shortName: 'Heavy-Lift Workhorse',
    provider: 'Commercial Heavy-Lift Services',
    cost: 160, // $160M procurement
    fairingDiameter: '5.4 m',
    fairingLength: '17.2 m',
    maxPayloadMass: 98, // 98 t max wet mass rating
    deltaVBonus: 0.65, // +0.65 km/s injection boost
    c3Capability: 'High C3 (Direct Mars & Asteroid Injection)',
    tag: '5.4m EXTENDED FAIRING · 98 t',
    description: '💡 Powerful triple-core booster ($160M). Extra turbo boost for far planets (+0.65 km/s).',
    icon: '⚡'
  },
  {
    id: 'sls_block1b',
    name: 'NASA SLS Block 1B Exploration',
    shortName: 'NASA SLS Block 1B',
    provider: 'NASA Deep Space Exploration Fleet',
    cost: 320, // $320M exploration allocation
    fairingDiameter: '8.4 m',
    fairingLength: '19.1 m',
    maxPayloadMass: 135, // 135 t max wet mass rating
    deltaVBonus: 1.45, // +1.45 km/s direct Jovian injection
    c3Capability: 'Ultra-High C3 (Direct Jovian Injection)',
    tag: '8.4m HEAVY FAIRING · 135 t',
    description: '💡 Giant NASA deep-space rocket ($320M). Maximum boost for distant Moon and Jupiter voyages.',
    icon: '🛸'
  },
  {
    id: 'nextgen_starship',
    name: 'Next-Gen Reusable Super Heavy',
    shortName: 'Starship HLS Architecture',
    provider: 'Artemis Deep-Space Architecture',
    cost: 210, // $210M flight operations
    fairingDiameter: '9.0 m',
    fairingLength: '22.0 m',
    maxPayloadMass: 160, // 160 t max wet mass rating
    deltaVBonus: 1.10, // +1.10 km/s injection boost
    c3Capability: 'Max Volume (Mega-Payloads & Habitats)',
    tag: '9.0m CAVERNOUS BAY · 160 t',
    description: 'Fully reusable super-heavy architecture with a massive 9.0m payload bay ($210M). Eliminates fairing volume bottlenecks for extreme mass-heavy expeditions (+1.10 km/s Δv).',
    icon: '🌌'
  }
];

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function designStats(loadout=DEFAULT_LOADOUT, destination="earth", missionClassId='discovery', launchVehicleId='falcon9_medium') {
  loadout=normalizeLoadout(loadout);
  const parts=SYSTEMS.map((s,i)=>s.choices[loadout[i]??0]);
  const missionClass=NASA_MISSION_CLASSES.find(c=>c.id===missionClassId)||NASA_MISSION_CLASSES[0];
  const launchVehicle=LAUNCH_VEHICLES.find(lv=>lv.id===launchVehicleId)||LAUNCH_VEHICLES[0];

  const hardwareCost=parts.reduce((n,p)=>n+p.cost,60);
  const launcherCost=launchVehicle.cost;
  const totalMissionCost=hardwareCost+launcherCost;

  const dryMass=parts.reduce((n,p)=>n+p.mass,12), fuelMass=parts[8].fuelMass;
  const wetMass=dryMass+fuelMass;

  const rawDeltaV=parts[0].isp*9.80665*Math.log((dryMass+fuelMass)/dryMass)/1000;
  const deltaV=rawDeltaV+launchVehicle.deltaVBonus;

  const sunDistance={earth:1,moon:1,mars:1.52,asteroid:2.36,jupiter:5.2}[destination]||1;
  const thrustN=parts[0].thrustN;
  const generatedKW=parts[1].outputKW/(parts[1].solar?sunDistance**2:1);
  const componentLoads=parts.map(p=>p.demand),demandKW=.55+componentLoads.reduce((n,p)=>n+p,0);
  const powerMargin=generatedKW-demandKW,issues=[];

  const costLimit=missionClass.costLimit;
  const launcherMassLimit=launchVehicle.maxPayloadMass;
  const classMassLimit=missionClass.baseMassLimit;
  const massLimit=Math.min(launcherMassLimit, classMassLimit);

  if(totalMissionCost>costLimit) issues.push(`Total mission cost ($${totalMissionCost}M) exceeds ${missionClass.shortName} cap ($${costLimit}M)`);
  if(wetMass>launcherMassLimit) issues.push(`Payload wet mass (${wetMass.toFixed(1)} t) exceeds ${launchVehicle.shortName} fairing limit (${launcherMassLimit} t)`);
  if(wetMass>classMassLimit) issues.push(`Payload wet mass (${wetMass.toFixed(1)} t) exceeds ${missionClass.shortName} mass cap (${classMassLimit} t)`);
  if(powerMargin<0) issues.push('Power deficit at destination: change power or propulsion');

  const acceleration=thrustN/(wetMass*1000),massFlow=thrustN/(parts[0].isp*9.80665),burnSeconds=fuelMass*1000/massFlow;

  return {
    sunDistance,thrustN,generatedKW,demandKW,componentLoads,powerMargin,acceleration,massFlow,burnSeconds,
    issues,parts,cost:hardwareCost,dryMass,fuelMass,mass:wetMass,rawDeltaV,deltaV,
    valid:issues.length===0,
    missionClass,launchVehicle,totalMissionCost,launcherCost,costLimit,massLimit,
    fairingDiameter:launchVehicle.fairingDiameter,deltaVBonus:launchVehicle.deltaVBonus,
    thrust:parts[0].thrust*(65/wetMass),efficiency:parts[0].efficiency*28/fuelMass,
    power:parts[1].capacity,armor:parts[2].armor,scan:parts[3].scan,yield:parts[3].yield,
    link:parts[4].link,cooling:parts[5].cooling,handling:parts[6].handling,recovery:parts[7].recovery
  };
}
