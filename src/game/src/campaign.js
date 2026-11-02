// Authored mission scenarios with authentic NASA science data integration.
// Resource units are gameplay reserves, not joules or kg.

export const FLIGHT_PLANS=[
  {id:'reserve',name:'RESERVE FIRST',days:286,burn:.86,housekeeping:1.08,hazards:.7,description:'A longer, safer flight. Saves fuel and avoids heavy space debris.'},
  {id:'balanced',name:'BALANCED TRANSFER',days:224,burn:1,housekeeping:1,hazards:1,description:'A balanced flight speed. Moderate fuel use and normal hazards.'},
  {id:'rapid',name:'RAPID RESPONSE',days:168,burn:1.18,housekeeping:.9,hazards:1.3,description:'Reach the destination fast, but burns more fuel and crosses more space debris.'}
];

export const SCIENCE_SOURCE='https://www.nasa.gov/missions/mars-science-laboratory/curiosity-rover/cracks-in-ancient-martian-mud-surprise-nasas-curiosity-rover-team/';

// Dedicated multi-world scientific data and NASA PDS datasets
export const DESTINATION_CAMPAIGNS = {
  mars: {
    agency: 'NASA Mars Exploration Program // Mars 2020 Perseverance & Ingenuity',
    source: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
    pdsCitation: 'NASA Planetary Data System (PDS) M2020-PIXL-2-EDR-V1.0 / Jezero Crater Delta Mudstone & Séítah Olivine',
    instruments: [
      { name: 'CRISM', full: 'Compact Reconnaissance Imaging Spectrometer for Mars', spec: 'Visible/Near-Infrared (0.36–3.92 µm)', pdsId: 'MRO-M-CRISM-3-RDR-V1.0' },
      { name: 'PIXL', full: 'Planetary Instrument for X-ray Lithochemistry', spec: 'X-ray Fluorescence Spectrometer (0.12 mm beam)', pdsId: 'M2020-PIXL-2-EDR-V1.0' },
      { name: 'HiRISE', full: 'High Resolution Imaging Science Experiment', spec: '0.25 m/pixel stereo DTM reconnaissance', pdsId: 'MRO-M-HIRISE-3-RDR-V1.0' },
      { name: 'RIMFAX', full: 'Radar Imager for Mars Subsurface Experiment', spec: '150–1200 MHz GPR (15 m depth penetration)', pdsId: 'M2020-RIMFAX-2-EDR-V1.0' },
      { name: 'Mastcam-Z', full: 'Multispectral Stereoscopic Imaging System', spec: 'Zoom optical array with 11 science filters', pdsId: 'M2020-MCZ-2-EDR-V1.0' }
    ],
    spectralBands: [
      { element: 'Si', nm: 288.1, label: 'Silicon (SiO2 46.2%)' },
      { element: 'Fe', nm: 259.9, label: 'Iron (FeO 19.8%)' },
      { element: 'Al', nm: 309.3, label: 'Aluminum (Al2O3 9.4%)' },
      { element: 'Mg', nm: 279.5, label: 'Magnesium (MgO 6.2%)' },
      { element: 'H2O', nm: 656.3, label: 'Hydrated Mineral Hydroxyl (1.9 µm absorption)' }
    ],
    signals: [
      {label:'PACKET 01 / POWER',speaker:'REYES · FLIGHT ENGINEER',message:'The station radio is running on emergency power! The main radio broke during a storm, but backup battery power stayed alive long enough to guide us here.',finding:'This is an emergency rescue signal sent by the station backup battery.'},
      {label:'PACKET 02 / SCIENCE',speaker:'SEN · SCIENCE OFFICER',message:'Orbital MRO scans detected clay delta mudstones and olivine-carbonate sands in Jezero Crater. The best exploration route cuts right between them.',finding:'Orbital scans mapped ancient water-deposited delta clays and carbonate rocks.'},
      {label:'PACKET 03 / CREW NOTE',speaker:'IMANI · FLIGHT DIRECTOR',message:'Good news: the surface station crew cached their science data recorder onto the rover! Drive your rover to the target and bring the records home.',finding:'The science recorder is on the surface waiting for your rover.'}
    ],
    sites: [
      {id:'basin',name:'JEZERO DELTA FAN',clay:78,sulfate:19,slope:4,power:3,yield:8,x:-45,z:-75,description:'Fine-grained mudstones rich in clay minerals. Smooth ground; prime astrobiology preservation target.'},
      {id:'boundary',name:'SÉÍTAH OLIVINE DUNES',clay:56,sulfate:61,slope:11,power:7,yield:18,x:68,z:-110,description:'Ancient olivine and carbonate bedrock. High scientific yield, but rough sand dunes and higher power draw.'},
      {id:'ridge',name:'NERETVA VALLIS SCARP',clay:14,sulfate:86,slope:18,power:11,yield:11,x:-95,z:-150,description:'Ancient river canyon breach wall. Rich sulfate and boulder layers; steep slope requires careful route planning.'}
    ],
    hypothesis: {
      key: 'water',
      options: ['water','life','ocean'],
      supported: 'The mineral samples and rock layers confirm that water was present in an ancient lake bed.',
      provisional: 'Water is likely, but missing rock samples make the conclusion uncertain.',
      unsupported: 'The evidence collected does not support this claim.'
    }
  },
  moon: {
    agency: 'NASA Artemis Program // Lunar Reconnaissance Orbiter (LRO)',
    source: 'https://science.nasa.gov/moon/',
    pdsCitation: 'NASA PDS LRO-L-LEND-4-EDR-V1.0 / Shackleton Crater Epithermal Neutron Flux & Diviner Thermal Radiometry',
    instruments: [
      { name: 'LEND', full: 'Lunar Exploration Neutron Detector', spec: 'Epithermal neutron suppression (1.5 wt% WEH)', pdsId: 'LRO-L-LEND-4-EDR-V1.0' },
      { name: 'Diviner', full: 'Diviner Lunar Radiometer Experiment (DLRE)', spec: '9-channel infrared radiometer (down to 27 K)', pdsId: 'LRO-L-DLRE-4-GDR-V1.0' },
      { name: 'LOLA', full: 'Lunar Orbiter Laser Altimeter', spec: '1064 nm 5-beam pulse laser topography', pdsId: 'LRO-L-LOLA-4-GDR-V1.0' },
      { name: 'Mini-RF', full: 'Miniature Radio Frequency Synthetic Aperture Radar', spec: 'S/X-band SAR Circular Polarization Ratio', pdsId: 'LRO-L-MRFLRO-4-CDR-V1.0' },
      { name: 'M3', full: 'Moon Mineralogy Mapper (Chandrayaan-1 / NASA)', spec: '0.43–3.0 µm imaging spectrometer (ice triplets)', pdsId: 'CH1-ORB-L-M3-4-L2' }
    ],
    spectralBands: [
      { element: 'H', nm: 121.6, label: 'Lyman-Alpha Hydrogen Albedo' },
      { element: 'WEH', nm: 450.0, label: 'Water Equivalent Hydrogen (1.5 wt%)' },
      { element: 'Ti', nm: 334.9, label: 'Titanium Ilmenite (TiO2 8.1%)' },
      { element: 'Fe', nm: 259.9, label: 'Lunar Basalt Iron (FeO 14.2%)' }
    ],
    signals: [
      {label:'PACKET 01 / TEMPERATURE',speaker:'VASQUEZ · LUNAR OPERATIONS',message:'Sensors show freezing cold temperatures inside Shackleton Crater. These dark craters have kept water ice frozen for billions of years.',finding:'Super-cold temperatures confirmed. Water ice can stay frozen here forever.'},
      {label:'PACKET 02 / WATER SENSOR',speaker:'SEN · SCIENCE OFFICER',message:'The neutron detector found lots of hydrogen in the soil! This shows there is real water ice mixed into the Moon dirt.',finding:'Water ice detected in the soil near the crater wall.'},
      {label:'PACKET 03 / RELAY BEACON',speaker:'IMANI · FLIGHT DIRECTOR',message:'The Moon relay lost its connection after a dust storm. Its raw ice discovery data is still safely saved on the surface rover!',finding:'Surface rover holds the complete Moon water ice records.'}
    ],
    sites: [
      {id:'basin',name:'SHACKLETON RIM',clay:42,sulfate:28,slope:5,power:3,yield:9,x:-45,z:-75,description:'Sunlit crater rim. Safe place to land; detects water ice near the edge.'},
      {id:'boundary',name:'SHADOW CONTACT ZONE',clay:68,sulfate:72,slope:12,power:8,yield:19,x:68,z:-110,description:'Border between sun and shadow. Great spot to drill ice-rich soil cores.'},
      {id:'ridge',name:'CRYO-CRATER FLOOR',clay:25,sulfate:91,slope:19,power:12,yield:12,x:-95,z:-150,description:'Super-cold dark floor. Highest amount of ice, but no sunlight for solar power.'}
    ],
    hypothesis: {
      key: 'water',
      options: ['water','life','ocean'],
      supported: 'Soil tests and sensor readings confirm water ice trapped in the cold dark crater.',
      provisional: 'Hydrogen was detected, but missing ground samples leave the ice depth uncertain.',
      unsupported: 'The Moon does not have an underground liquid ocean.'
    }
  },
  earth: {
    agency: 'NASA Earth Science Division // Terra, Aqua, CALIPSO & Jason-3',
    source: 'https://science.nasa.gov/earth/',
    pdsCitation: 'NASA Earthdata / MODIS Sea Surface Temperature & CALIOP Atmospheric Lidar Profiling',
    instruments: [
      { name: 'MODIS', full: 'Moderate Resolution Imaging Spectroradiometer (Terra/Aqua)', spec: '36 spectral bands (0.4–14.4 µm) SST & Ocean Color', pdsId: 'NASA Earthdata: MODISA_L3m_SST_4km' },
      { name: 'CALIOP', full: 'Cloud-Aerosol Lidar with Orthogonal Polarization (CALIPSO)', spec: 'Dual-wavelength (532 nm/1064 nm) polarization lidar', pdsId: 'NASA ASDC: CAL_LID_L2_05kmAPro-Standard' },
      { name: 'Poseidon-4', full: 'Dual-Frequency Synthetic Aperture Radar Altimeter', spec: 'Ku/C-band sea surface height anomaly (1.2 cm precision)', pdsId: 'NASA PO.DAAC: S6A_P4_2__LR_STD' },
      { name: 'TDRSS', full: 'Tracking and Data Relay Satellite System Ground Bus', spec: 'S/Ku/Ka-band space communication & tracking network', pdsId: 'NASA SCaN: SN-TLM-V2.1' }
    ],
    spectralBands: [
      { element: 'Chl-a', nm: 443.0, label: 'Ocean Chlorophyll-a Absorption' },
      { element: 'O3', nm: 300.0, label: 'Stratospheric Ozone Hartley Band' },
      { element: 'CO2', nm: 2000.0, label: 'Tropospheric Carbon Dioxide Band' },
      { element: 'H2O', nm: 940.0, label: 'Atmospheric Water Vapor Column' }
    ],
    signals: [
      {label:'PACKET 01 / ORBIT FALL',speaker:'TANAKA · EARTH OBSERVATION',message:'The Aurora climate satellite is falling too low! We must recover its weather data before it burns up in the atmosphere.',finding:'Urgent satellite rescue: recover data before the orbit decays.'},
      {label:'PACKET 02 / OCEAN MAP',speaker:'SEN · SCIENCE OFFICER',message:'The satellite memory holds ten years of ocean temperature records, showing how ocean currents and climate are changing.',finding:'Ten years of ocean and weather history saved on the main recorder.'},
      {label:'PACKET 03 / RADIO LINK',speaker:'IMANI · FLIGHT DIRECTOR',message:'The satellite is sending out a locator ping. Fly close to download the full climate archive.',finding:'Close approach needed to download the complete climate records.'}
    ],
    sites: [
      {id:'basin',name:'LEO RECOVERY SECTOR',clay:65,sulfate:30,slope:3,power:2,yield:8,x:-45,z:-75,description:'Quiet orbit area with minimal debris. Fast data download.'},
      {id:'boundary',name:'THERMOSPHERE DRIFT',clay:58,sulfate:65,slope:9,power:6,yield:18,x:68,z:-110,description:'Upper air zone. Higher drag, but captures complete weather records.'},
      {id:'ridge',name:'DEBRIS TRAIN CORRIDOR',clay:20,sulfate:85,slope:15,power:10,yield:11,x:-95,z:-150,description:'Busy space junk zone. Requires careful steering to avoid collisions.'}
    ],
    hypothesis: {
      key: 'water',
      options: ['water','life','ocean'],
      supported: 'The ocean data successfully explains warming trends and changing weather currents.',
      provisional: 'Partial data collected. Ocean currents are visible, but some records are missing.',
      unsupported: 'The data collected was incomplete or unverified.'
    }
  },
  asteroid: {
    agency: 'NASA Discovery Program // Dawn Mission at Vesta',
    source: 'https://science.nasa.gov/mission/dawn/',
    pdsCitation: 'NASA PDS DAWN-A-VIR-2-EDR-V1.0 / Rheasilvia Impact Basin Pyroxene & Framing Camera',
    instruments: [
      { name: 'VIR', full: 'Visible and Infrared Spectrometer', spec: '0.25–5.0 µm high-resolution mapping spectrometer', pdsId: 'DAWN-A-VIR-2-EDR-V1.0' },
      { name: 'FC2', full: 'Framing Camera 2 Optical Stereo Imager', spec: '1024×1024 CCD stereo shape model & geology', pdsId: 'DAWN-A-FC2-3-EDR-V1.0' },
      { name: 'GRaND', full: 'Gamma Ray and Neutron Detector', spec: 'Elemental composition (Fe, Si, O, H) mapping', pdsId: 'DAWN-A-GRAND-2-EDR-V1.0' },
      { name: 'RSS', full: 'Radio Science Subsystem Gravity Harmonics', spec: 'X-band doppler tracking for core mass & gravity', pdsId: 'DAWN-A-RSS-1-EDR-V1.0' }
    ],
    spectralBands: [
      { element: 'Pyroxene-I', nm: 930.0, label: 'Band I Pyroxene (Basaltic Crust)' },
      { element: 'Pyroxene-II', nm: 1980.0, label: 'Band II Pyroxene Reflectance Dip' },
      { element: 'Olivine', nm: 1050.0, label: 'Mantle Forsterite Olivine Clasts' },
      { element: 'Fe-Ni', nm: 550.0, label: 'Metallic Iron-Nickel Ratio' }
    ],
    signals: [
      {label:'PACKET 01 / ORBIT GRAVITY',speaker:'KOWALSKI · DAWN NAVIGATION',message:'Dawn navigation lock confirmed in orbit! Vesta has an irregular triaxial shape that creates gravity harmonics and lateral drift.',finding:'Irregular protoplanet gravity confirmed. Altitude affects orbit stability.'},
      {label:'PACKET 02 / VIR SPECTROMETRY',speaker:'SEN · SCIENCE OFFICER',message:'VIR spectrometer mapped pyroxene and olivine absorption bands. Low-altitude observation passes increase spectral resolution by 80%!',finding:'Deep mantle olivine and volcanic pyroxene exposed in the Rheasilvia central peak.'},
      {label:'PACKET 03 / EJECTA HAZARDS',speaker:'IMANI · FLIGHT DIRECTOR',message:'High-velocity boulder ejecta detected near the crater rim. Close passes yield pristine data but require careful velocity matching!',finding:'Low-altitude passes risk boulder collisions but yield pristine high-resolution data.'}
    ],
    sites: [
      {id:'basin',name:'RHEASILVIA CENTRAL MOUND',clay:70,sulfate:22,slope:6,power:3,yield:9,x:-45,z:-75,description:'Colossal 22-km mountain peak exposing deep mantle olivine crystals.'},
      {id:'boundary',name:'DIVALIA FOSSAE GRABEN',clay:54,sulfate:68,slope:14,power:7,yield:18,x:68,z:-110,description:'Equatorial canyon fracture network; safe wide-field survey pass.'},
      {id:'ridge',name:'MATRONALIA RUPES SCARP',clay:18,sulfate:88,slope:22,power:11,yield:12,x:-95,z:-150,description:'15-km high crater wall cliff exposing pristine volcanic crust layers.'}
    ],
    hypothesis: {
      key: 'water',
      options: ['water','life','ocean'],
      supported: 'The spectral data proves Vesta formed a volcanic crust and differentiated iron core early in solar system history.',
      provisional: 'Basaltic minerals mapped, but missing deep olivine clasts leave core differentiation unproven.',
      unsupported: 'The orbital observations collected were incomplete or unverified.'
    }
  },
  jupiter: {
    agency: 'NASA Planetary Science // Europa Clipper & Galileo Ocean Exploration',
    source: 'https://science.nasa.gov/mission/europa-clipper/',
    pdsCitation: 'NASA PDS GO-J-MAG-3-RDR-V1.0 / Europa Induced Dipole Magnetic Sounding & PIMS Plasma',
    instruments: [
      { name: 'MAG', full: 'Galileo Magnetometer / Europa Clipper Magnetometer (ECM)', spec: 'Triaxial fluxgate magnetometer (sub-nT sensitivity)', pdsId: 'GO-J-MAG-3-RDR-HIGHRES-V1.0' },
      { name: 'MISE', full: 'Mapping Imaging Spectrometer for Europa', spec: '0.8–5.0 µm infrared mapping of surface salts & ice', pdsId: 'EC-MISE-TRDR-V1.0' },
      { name: 'PIMS', full: 'Plasma Instrument for Magnetic Sounding', spec: 'Faraday cup plasma spectrometers for ion currents', pdsId: 'EC-PIMS-EDR-V1.0' },
      { name: 'REASON', full: 'Radar for Europa Assessment and Sounding', spec: 'Dual-frequency (9 MHz / 60 MHz) ice-penetrating radar', pdsId: 'EC-REASON-RAW-V1.0' },
      { name: 'MASPEX', full: 'Mass Spectrometer for Planetary Exploration', spec: 'High-resolution gas & plume volatile mass spectrometer', pdsId: 'EC-MASPEX-RAW-V1.0' }
    ],
    spectralBands: [
      { element: 'H2O-Ice', nm: 1500.0, label: 'Crystalline Surface Water Ice' },
      { element: 'Hydrated Salts', nm: 1730.0, label: 'Endogenic Magnesium Sulfate Salts' },
      { element: 'SO2 Frost', nm: 280.0, label: 'Radiolytic Sulfur Dioxide Frost' },
      { element: 'B-Induction', nm: 420.0, label: 'Induced Dipole Magnetic Moment (428 nT)' }
    ],
    signals: [
      {label:'PACKET 01 / RADIATION SWELL',speaker:'STERLING · JOVIAN DYNAMICS',message:'Jupiter’s rotating magnetosphere sweeps radiation belts across Europa every 10 hours. Time your observation passes during quiet windows!',finding:'Periodic Jovian radiation surge cycle identified.'},
      {label:'PACKET 02 / INDUCED MAGNETIC DIPOLE',speaker:'SEN · SCIENCE OFFICER',message:'Our magnetometer detected a secondary magnetic field signature opposing Jupiter’s field. This proves an electrical conductor exists beneath the ice!',finding:'Induced magnetic dipole confirms liquid subsurface ocean.'},
      {label:'PACKET 03 / CHAOS TERRAIN SALTS',speaker:'IMANI · FLIGHT DIRECTOR',message:'Infrared reflection shows hydrated magnesium salts concentrated in fractured ice plates. Warm ocean water is rising through the crust!',finding:'Endogenic oceanic salts mapped across surface fractures.'}
    ],
    sites: [
      {id:'basin',name:'CONAMARA CHAOS',clay:75,sulfate:18,slope:2,power:3,yield:8,x:-45,z:-75,description:'Fractured ice raft plates exposing subsurface salts; moderate radiation exposure.'},
      {id:'boundary',name:'THERA MACULA PLUME',clay:55,sulfate:64,slope:8,power:7,yield:18,x:68,z:-110,description:'Active cryovolcanic warm thermal ice ridge; high science yield, intense radiation surge.'},
      {id:'ridge',name:'PELASGIAN LINEA',clay:15,sulfate:88,slope:16,power:12,yield:11,x:-95,z:-150,description:'Equatorial fracture belt with induced magnetic sounding; open communication window.'}
    ],
    hypothesis: {
      key: 'water',
      options: ['water','life','ocean'],
      supported: 'The induced magnetic dipole field and surface sea salts confirm a global saltwater ocean beneath Europa’s ice crust.',
      provisional: 'Magnetic induction observed, but incomplete composition scans leave ocean depth unconstrained.',
      unsupported: 'Insufficient scientific scans were returned before emergency retreat.'
    }
  }
};

// Target-Specific NASA Open Data Provenance Index
export const TARGET_DATA_PROVENANCE = {
  mars: {
    default: {
      instrument: 'NASA MRO CRISM & HiRISE / Perseverance PIXL',
      datasetId: 'NASA PDS: M2020-PIXL-2-EDR-V1.0 / CRISM-TRDR-V3',
      agency: 'NASA Mars Exploration Program // JPL-Caltech',
      finding: 'Identified 2.2 µm clay absorption and 1.05 µm olivine-carbonate alteration indicating ancient lacustrine delta waters.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/'
    },
    'JEZERO DELTA FAN': {
      instrument: 'MRO CRISM Imaging Spectrometer & Perseverance PIXL',
      datasetId: 'NASA PDS: CRISM-TRDR-V3 / M2020-PIXL-2-EDR-V1.0',
      agency: 'NASA MRO & Mars 2020 // JHU-APL & JPL',
      finding: 'Fine-grained phyllosilicate clay mudstones preserving ancient organic biomarkers in delta deposits.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/'
    },
    'SÉÍTAH OLIVINE': {
      instrument: 'Perseverance PIXL & SuperCam Raman Spectrometer',
      datasetId: 'NASA PDS: M2020-PIXL-2-EDR-V1.0 / SUPERCAM-LIBS-V1',
      agency: 'NASA Mars 2020 // JPL-Caltech & LANL',
      finding: 'Cumulate olivine grains altered by carbonated water, providing isotopic age constraints on Jezero lake formation.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/'
    },
    'NERETVA VALLIS': {
      instrument: 'MRO HiRISE Stereo Digital Terrain Model',
      datasetId: 'NASA PDS: MRO-M-HIRISE-3-RDR-V1.0 / PSP_001415_1985',
      agency: 'NASA MRO Mission // University of Arizona',
      finding: 'Meter-scale boulder conglomerates and incision terraces carved by catastrophic outflow flooding into Jezero.',
      archiveName: 'NASA PDS Imaging Node',
      url: 'https://hirise.lpl.arizona.edu/'
    },
    'LAYER CONTEXT': {
      instrument: 'Perseverance Mastcam-Z & SuperCam RMI',
      datasetId: 'NASA PDS: M2020-MCZ-2-EDR-V1.0',
      agency: 'NASA Mars 2020 // Arizona State University',
      finding: 'Centimeter-scale cross-stratification and sedimentary bedding documenting rapid delta deposition sequence.',
      archiveName: 'NASA PDS Imaging Node',
      url: 'https://pds-imaging.jpl.nasa.gov/data/mars2020/'
    },
    'STATION RECORDER': {
      instrument: 'RIMFAX Ground-Penetrating Radar & MEDA Sensors',
      datasetId: 'NASA PDS: M2020-RIMFAX-2-EDR-V1.0 / MEDA-ENV-EDR',
      agency: 'NASA Mars 2020 // FFI (Norway) & CAB (Spain)',
      finding: 'Subsurface dielectric permittivity reflections probing 15m depth below delta fan floor.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/'
    },
    'HYDROTHERMAL CHIMNEY': {
      instrument: 'Perseverance SHERLOC Deep-UV Fluorescence Spectrometer',
      datasetId: 'NASA PDS: M2020-SHERLOC-2-EDR-V1.0',
      agency: 'NASA Mars 2020 // JPL-Caltech',
      finding: 'Deep-UV 248 nm Raman signature confirming aromatic organic compounds in hydrothermal silica crust.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/mars2020/'
    }
  },
  moon: {
    default: {
      instrument: 'LRO LEND Neutron Detector & Diviner Thermal Radiometer',
      datasetId: 'NASA PDS: LRO-L-LEND-4-EDR-V1.0 / LRO-L-DLRE-4-GDR-V1.0',
      agency: 'NASA Artemis Program // Goddard Space Flight Center',
      finding: 'Epithermal neutron suppression signature confirming 1.5 wt% Water Equivalent Hydrogen (WEH) in polar regolith.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/lro/'
    },
    'SHACKLETON': {
      instrument: 'LRO LEND (Lunar Exploration Neutron Detector) & LOLA',
      datasetId: 'NASA PDS: LRO-L-LEND-4-EDR-V1.0 / LRO-L-LOLA-4-GDR-V1.0',
      agency: 'NASA Artemis Program // Goddard Space Flight Center',
      finding: 'Neutron flux deficits mapping hydrogen concentrations exceeding 1.5 wt% inside cold traps.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/lro/'
    },
    'COLD-TRAP': {
      instrument: 'LRO Diviner Lunar Radiometer Experiment (DLRE)',
      datasetId: 'NASA PDS: LRO-L-DLRE-4-GDR-V1.0 / DIVINER_L2_TB',
      agency: 'NASA LRO Mission // UCLA',
      finding: 'Permanently shadowed crater floor thermal brightness recorded at 27 K (-246°C), creating stable cryogenic cold-trap conditions.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://diviner.ucla.edu/'
    },
    'POLAR STATION RECORDER': {
      instrument: 'LRO Mini-RF Synthetic Aperture Radar & LROC NAC',
      datasetId: 'NASA PDS: LRO-L-MRFLRO-4-CDR-V1.0 / LROC-NAC-EDR-V1',
      agency: 'NASA LRO // JHU-APL & Arizona State University',
      finding: 'Circular Polarization Ratio (CPR > 1.2) indicating volume coherent backscattering from subsurface water ice deposits.',
      archiveName: 'NASA PDS Imaging Node',
      url: 'https://pds-imaging.jpl.nasa.gov/data/lro/'
    },
    'CRYOGENIC ICE CRYSTAL': {
      instrument: 'Moon Mineralogy Mapper (M3) Chandrayaan-1 / NASA SMD',
      datasetId: 'NASA PDS: CH1-ORB-L-M3-4-L2-REFLECTANCE-V1.0',
      agency: 'NASA Science Mission Directorate // JPL',
      finding: 'Near-infrared absorption triplets at 1.3, 1.5, and 2.0 µm conclusively identifying exposed surface water ice crystals.',
      archiveName: 'NASA PDS Imaging Node',
      url: 'https://pds-imaging.jpl.nasa.gov/data/m3/'
    }
  },
  earth: {
    default: {
      instrument: 'NASA Terra & Aqua MODIS / CALIPSO CALIOP Lidar',
      datasetId: 'NASA Earthdata GIBS: MODIS_Aqua_L3m_SST_Monthly_4km / CALIOP-APro',
      agency: 'NASA Earth Science Division // Ocean Biology Processing Group',
      finding: 'Decadal sea surface temperature gradients and aerosol optical depth profiles tracking global climate circulation.',
      archiveName: 'NASA Earthdata GIBS',
      url: 'https://earthdata.nasa.gov/'
    },
    'SENTINEL-7 PRIMARY TELEMETRY BUS': {
      instrument: 'NASA SCaN TDRSS Ground & Orbital Relay Network',
      datasetId: 'NASA Earthdata / Space Communications & Navigation SN-TLM-V2.1',
      agency: 'NASA SCaN // Goddard Space Flight Center',
      finding: 'Sub-milliradian orbital state vector and reaction wheel telemetry recovered across TDRSS polar contact arcs.',
      archiveName: 'NASA Space Communications',
      url: 'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/'
    },
    'OCEAN COLOR': {
      instrument: 'NASA Terra & Aqua MODIS (Moderate Resolution Imaging Spectroradiometer)',
      datasetId: 'NASA Earthdata GIBS / MODIS_Aqua_L3m_SST_Monthly_4km_R2022 / Chlorophyll-a MODISA_L3m_CHL',
      agency: 'NASA Earth Science Division // Ocean Biology Processing Group',
      finding: 'Decadal sea surface temperature gradients and chlorophyll-a bloom biomass tracking Atlantic meridional overturning circulation.',
      archiveName: 'NASA Earthdata GIBS',
      url: 'https://earthdata.nasa.gov/'
    },
    'CALIOP': {
      instrument: 'CALIPSO CALIOP (Cloud-Aerosol Lidar with Orthogonal Polarization)',
      datasetId: 'NASA Earthdata / CAL_LID_L2_05kmAPro-Standard-V4-21',
      agency: 'NASA Earth Science Division // Langley Research Center',
      finding: 'Dual-wavelength 532 nm / 1064 nm vertical depolarization profiles measuring stratospheric aerosol layers and cirrus clouds.',
      archiveName: 'NASA Atmospheric Science Data Center',
      url: 'https://asdc.larc.nasa.gov/project/CALIPSO'
    },
    'SENTINEL-7 HIGH-RESOLUTION ALTIMETRY': {
      instrument: 'Jason-3 / Sentinel-6 Michael Freilich Poseidon-4 SAR Altimeter',
      datasetId: 'NASA PO.DAAC / JASON3_L2_OST_OST_NRT_GPS',
      agency: 'NASA PO.DAAC // JPL & CNES',
      finding: 'Sub-centimeter sea surface height anomaly (SSHA) precision detecting thermal expansion and steric sea level rise.',
      archiveName: 'NASA PO.DAAC',
      url: 'https://podaac.jpl.nasa.gov/'
    }
  },
  asteroid: {
    default: {
      instrument: 'NASA Dawn VIR Spectrometer & Framing Camera (FC2)',
      datasetId: 'NASA PDS: DAWN-A-VIR-2-EDR-V1.0 / DAWN-A-FC2-3-EDR-V1.0',
      agency: 'NASA Discovery Program // INAF-IAPS & Max Planck Institute',
      finding: 'High-resolution pyroxene and olivine absorption spectra matching howardite-eucrite-diogenite (HED) meteorites.',
      archiveName: 'NASA PDS Atmospheres Node',
      url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/DAWN/vir.html'
    },
    'PYROXENE': {
      instrument: 'NASA Dawn VIR (Visible and Infrared Spectrometer)',
      datasetId: 'NASA PDS: DAWN-A-VIR-2-EDR-V1.0 / VIR-IR-L2B',
      agency: 'NASA Discovery Program // INAF-IAPS & ASI',
      finding: 'Band I (0.93 µm) and Band II (1.98 µm) pyroxene absorption minima confirming basaltic eucrite-diogenite crust composition.',
      archiveName: 'NASA PDS Atmospheres Node',
      url: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/DAWN/vir.html'
    },
    'DIVALIA FOSSAE': {
      instrument: 'NASA Dawn Framing Camera (FC2) Stereo Imagery',
      datasetId: 'NASA PDS: DAWN-A-FC2-3-EDR-V1.0 / FC2-SHAPE-GDR-V1',
      agency: 'NASA Dawn Mission // Max Planck Institute & DLR',
      finding: 'Stereo digital elevation model of Divalia Fossae equatorial graben fault canyons measuring up to 22 km wide.',
      archiveName: 'NASA PDS Imaging Node',
      url: 'https://pds-imaging.jpl.nasa.gov/data/dawn/fc/'
    },
    'RHEASILVIA': {
      instrument: 'Dawn GRaND (Gamma Ray and Neutron Detector) & VIR Spectrometer',
      datasetId: 'NASA PDS: DAWN-A-GRAND-2-EDR-V1.0 / VIR-VIS-L2B',
      agency: 'NASA Discovery Program // Planetary Science Institute',
      finding: 'Exposed mantle forsteritic olivine and iron/neutron ratios in the 22-km high Rheasilvia central peak, proving core differentiation.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/dawn/'
    },
    'EXCAVATED EUCRITE': {
      instrument: 'Dawn Radio Science Experiment (RSS) Gravity Investigation',
      datasetId: 'NASA PDS: DAWN-A-RSS-1-EDR-V1.0',
      agency: 'NASA Dawn // JPL-Caltech',
      finding: 'Gravity harmonics (J2, C22) confirming an iron-nickel metallic core of 110-140 km diameter at Vesta’s center.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/dawn/'
    }
  },
  jupiter: {
    default: {
      instrument: 'Galileo Magnetometer (MAG) & Europa Clipper MISE Spectrometer',
      datasetId: 'NASA PDS: GO-J-MAG-3-RDR-HIGHRES-V1.0 / EC-MISE-TRDR',
      agency: 'NASA Planetary Science // UCLA & JPL-Caltech',
      finding: 'Induced secondary magnetic dipole and hydrated sulfate salt signatures confirming a global subsurface saltwater ocean.',
      archiveName: 'NASA PDS Planetary Plasma Interactions (PPI) Node',
      url: 'https://pds-ppi.igpp.ucla.edu/mission/Galileo/'
    },
    'DIPOLE': {
      instrument: 'Galileo Orbiter Magnetometer (MAG) & Europa Clipper PIMS',
      datasetId: 'NASA PDS: GO-J-MAG-3-RDR-HIGHRES-V1.0 / EC-PIMS-EDR',
      agency: 'NASA Planetary Science // UCLA & JHU-APL',
      finding: '428 nT secondary induced dipole magnetic field matching conducting subsurface liquid saltwater ocean.',
      archiveName: 'NASA PDS Planetary Plasma Interactions Node',
      url: 'https://pds-ppi.igpp.ucla.edu/mission/Galileo/'
    },
    'CHAOS TERRAIN': {
      instrument: 'Europa Clipper MISE (Mapping Imaging Spectrometer) & Galileo NIMS',
      datasetId: 'NASA PDS: GO-J-NIMS-3-EDR-V1.0 / EC-MISE-TRDR',
      agency: 'NASA Europa Clipper // JPL-Caltech',
      finding: 'Hydrated magnesium sulfate (MgSO4·nH2O) endogenic salts concentrated along fractured chaos plate margins.',
      archiveName: 'NASA PDS Imaging Node',
      url: 'https://pds-imaging.jpl.nasa.gov/data/galileo/'
    },
    'CRYOPLUME': {
      instrument: 'Europa Clipper SUDA (Surface Dust Analyzer) & MASPEX Spectrometer',
      datasetId: 'NASA PDS: EC-MASPEX-RAW-V1.0 / HST-ACS-UV-V2',
      agency: 'NASA Europa Clipper // SwRI & LASP',
      finding: 'Mass spectrometry detection of water vapor and sodium-chloride dust grains vented from surface fractures.',
      archiveName: 'NASA PDS Atmospheres Node',
      url: 'https://europa.nasa.gov/'
    },
    'CONAMARA SUBSURFACE': {
      instrument: 'Europa Clipper REASON (Radar for Europa Assessment and Sounding)',
      datasetId: 'NASA PDS: EC-REASON-RAW-V1.0',
      agency: 'NASA Europa Clipper // Univ. of Texas at Austin',
      finding: 'Dual-frequency (9 MHz / 60 MHz) radar reflection sounding detecting subsurface brine pocket at 4.5 km depth.',
      archiveName: 'NASA PDS Geosciences Node',
      url: 'https://pds-geosciences.wustl.edu/missions/europa_clipper/'
    }
  }
};

export function getTargetProvenance(destinationId = 'mars', targetName = '') {
  const destIndex = TARGET_DATA_PROVENANCE[destinationId] || TARGET_DATA_PROVENANCE.mars;
  if (!targetName) return destIndex.default;
  const upper = targetName.toUpperCase();
  for (const [key, data] of Object.entries(destIndex)) {
    if (key !== 'default' && upper.includes(key)) {
      return data;
    }
  }
  return destIndex.default;
}

// Backward-compatible default exports (Mars campaign)
export const SIGNAL_FRAGMENTS = DESTINATION_CAMPAIGNS.mars.signals;
export const SITES = DESTINATION_CAMPAIGNS.mars.sites;

export function getCampaignData(destinationId = 'mars') {
  return DESTINATION_CAMPAIGNS[destinationId] || DESTINATION_CAMPAIGNS.mars;
}

export function makeCampaign(plan='balanced', destination='mars', missionClass='discovery', launchVehicle='falcon9_medium'){
  const destKey = DESTINATION_CAMPAIGNS[destination] ? destination : 'mars';
  return {
    plan: FLIGHT_PLANS.some(p=>p.id===plan)?plan:'balanced',
    destination: destKey,
    missionClass,
    launchVehicle,
    site: null,
    repair: null,
    conclusion: null,
    confidence: null,
    clues: [],
    evidence: [],
    decisions: [],
    completed: {}
  };
}

export function flightPlan(campaign){return FLIGHT_PLANS.find(p=>p.id===campaign?.plan)||FLIGHT_PLANS[1];}
export function projectedReserves(loadoutStats,plan){return {fuel:100-55*loadoutStats.efficiency*plan.burn,power:100-34*(110/loadoutStats.power)*plan.housekeeping};}
export function recordDecision(sim,title,detail){sim.campaign.decisions.push({title,detail});sim.log(title,detail);}

export function resolveOperation(sim,kind,value){
  const c=sim.campaign;if(!c||sim.mode!=='operation'||sim.operation!==kind||c.completed[kind])return false;
  const destData = getCampaignData(sim.destination?.id || c.destination || 'mars');

  if(kind==='repair'){
    if(!['bypass','isolate'].includes(value))return false;
    c.repair=value;
    if(value==='bypass'){sim.power=Math.max(0,sim.power-4);recordDecision(sim,'Power bus restored','Isolated the shorted science branch and cross-fed the redundant bus. −4 power; full instrument capability restored.');}
    else {sim.stats.scan*=.8;recordDecision(sim,'Instrument redundancy lost','Preserved reserves by isolating the failed branch. Scanning is 20% slower for the remaining expedition.');}
  }
  if(kind==='survey'){
    const site=destData.sites.find(s=>s.id===value) || SITES.find(s=>s.id===value);
    if(!site)return false;
    c.site=site.id;
    sim.power=Math.max(0,sim.power-site.power);sim.score+=site.yield;
    recordDecision(sim,'Landing site selected',`${site.name}: allocated ${site.power} power reserves to the traverse. Survey index: clay ${site.clay}, sulfate ${site.sulfate}.`);
  }
  if(kind==='analysis'){
    if(!destData.hypothesis.options.includes(value))return false;
    c.conclusion=value;
    const kinds=new Set(c.evidence.map(e=>e.kind));
    const complete=kinds.has('mineral')&&kinds.has('context');
    const isTargetKey = value === destData.hypothesis.key;
    c.confidence = isTargetKey ? (complete ? 'supported' : 'provisional') : 'unsupported';
    sim.score += c.confidence==='supported' ? 20 : c.confidence==='provisional' ? 9 : 4;
    recordDecision(sim,'Scientific interpretation',
      c.confidence==='supported' ? destData.hypothesis.supported :
      c.confidence==='provisional' ? destData.hypothesis.provisional :
      destData.hypothesis.unsupported
    );
  }
  c.completed[kind]=true;sim.operation=null;sim.mode='flight';sim.emit('operationResolved',{kind,value});
  if(kind==='survey')sim.finishStage();
  if(kind==='analysis'){sim.eventFlags.recorder=true;sim.mode='event';sim.emit('event',{id:'recorder'});}
  return true;
}

