import {assembledVehicle,disposeModel} from './vehicle.js';
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {seeded} from './simulation.js';

const CYAN=0x81e6ff;
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const MARS_FOG_BASE=new THREE.Color(0x8a6753);
const MARS_FOG_STORM=new THREE.Color(0x522312);
export const groundHeight=(x,z)=>Math.sin(x*.017)*Math.cos(z*.011)*5+Math.sin(z*.023+x*.008)*2+Math.max(0,Math.abs(x)-170)*.14*(.7+Math.sin(z*.009+x*.004)*.3)+Math.max(0,-z-620)*.1*(.6+Math.cos(x*.01)*.3);
function detailTexture(kind='rock'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d'),random=seeded(kind==='hull'?121:925);
  if(kind==='hull'){
    c.fillStyle='#8b999e';c.fillRect(0,0,512,512);
    for(let y=0;y<512;y+=64)for(let x=0;x<512;x+=128){const v=130+Math.floor(random()*60);c.fillStyle=`rgb(${v},${v+5},${v+8})`;c.fillRect(x+2,y+2,123,59);c.fillStyle='#4a6068';c.fillRect(x+7,y+8,23,3);c.fillStyle='#d2d8d8';c.fillRect(x+91,y+48,23,1);for(let j=0;j<4;j++){c.fillStyle='#445963';c.fillRect(x+8+j*7,y+48,3,5);}}
  }else{
    const data=c.createImageData(512,512);
    for(let y=0;y<512;y++)for(let x=0;x<512;x++){const i=(y*512+x)*4;const wave=Math.sin(x*.17+Math.sin(y*.031)*8)*7+Math.sin(y*.052+x*.07)*9;const n=128+wave+(random()-.5)*70;data.data[i]=n;data.data[i+1]=n;data.data[i+2]=n;data.data[i+3]=255;}c.putImageData(data,0,0);
    for(let i=0;i<250;i++){const x=random()*512,y=random()*512,r=1+random()*5;c.fillStyle=`rgba(18,20,20,${random()*.3})`;c.beginPath();c.ellipse(x,y,r,r*.6,random()*6,0,7);c.fill();}
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function material(color,metalness=.5,roughness=.55){return new THREE.MeshStandardMaterial({color,metalness,roughness});}
function box(group,w,h,d,x,y,z,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);group.add(m);return m;}
function cylinder(group,r1,r2,h,x,y,z,mat,axis='z',segments=16){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat);if(axis==='z')m.rotation.x=Math.PI/2;m.position.set(x,y,z);group.add(m);return m;}
function ring(group,r,t,x,y,z,mat){const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,8,64),mat);m.position.set(x,y,z);group.add(m);return m;}
function glowTexture(){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(220,255,255,1)');g.addColorStop(.12,'rgba(100,225,255,.9)');g.addColorStop(.35,'rgba(40,150,255,.25)');g.addColorStop(1,'rgba(10,60,170,0)');ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(canvas);}
const EMISSIVE=new THREE.MeshStandardMaterial({color:CYAN,emissive:CYAN,emissiveIntensity:3,roughness:.2});
const EMISSIVE_GOLD=new THREE.MeshStandardMaterial({color:0xffbe26,emissive:0xff9900,emissiveIntensity:3.4,roughness:.2});
export function spacecraft(){
  const g=new THREE.Group(),white=material(0xc1ccd0,.55,.45),dark=material(0x152635,.8,.35),silver=material(0x627985,.8,.35),gold=material(0x9e7640,.75,.38),blue=material(0x113e65,.68,.4);
  white.map=detailTexture('hull');white.bumpMap=white.map;white.bumpScale=.025;
  cylinder(g,1.75,1.55,10,0,0,0,white);cylinder(g,1.6,.2,3.4,0,0,-6.4,white);
  box(g,2.4,1,2.2,0,1.4,-3.7,dark);box(g,1.95,.12,1.5,0,1.94,-3.7,blue);
  for(let z=-3;z<=4;z+=1.65){const band=ring(g,1.77,.095,0,0,z,silver);band.rotation.z=.2;}
  for(let side of [-1,1]){
    box(g,3.2,.4,2,side*2.8,-.15,1,silver);
    cylinder(g,.95,.95,7.7,side*3.25,-.05,1.2,silver);cylinder(g,.9,1.1,1.2,side*3.25,-.05,5.2,dark);
    for(let z=-1;z<=3.5;z+=2){cylinder(g,1,1,.32,side*3.25,-.05,z,gold);box(g,.6,.55,1.1,side*1.65,.9,z,dark);}
    cylinder(g,.9,.94,.4,side*3.25,-.05,5.9,dark);ring(g,.87,.08,side*3.25,-.05,6.12,silver);cylinder(g,.52,.65,.15,side*3.25,-.05,6.13,EMISSIVE);
    const wing=box(g,4.2,.13,4.8,side*6.25,0,.4,blue);wing.rotation.z=side*.08;
    for(let i=0;i<6;i++)box(g,.055,.16,4.8,side*(4.25+i*.78),.02,.4,gold);
    for(let i=0;i<5;i++)box(g,4.2,.16,.055,side*6.25,.02,-1.9+i*1.15,silver);
    box(g,.5,.55,2.6,side*2,-.9,-3.2,white);
    const nav=new THREE.Mesh(new THREE.SphereGeometry(.11,8,8),new THREE.MeshBasicMaterial({color:side>0?0x59f3b8:0xff625b}));nav.position.set(side*8.3,.2,-1.6);g.add(nav);
    for(let j=0;j<3;j++)box(g,.05,.16,.37,side*.62,1.54,-3.7+j*.42,EMISSIVE);
  }
  box(g,1.6,1.1,2.7,0,1.7,1.4,white);box(g,1.1,.1,2.1,0,2.3,1.4,gold);
  cylinder(g,.12,.12,3,0,3.4,2,silver,'y');const dish=new THREE.Mesh(new THREE.SphereGeometry(.9,16,8,0,Math.PI*2,0,Math.PI*.5),silver);dish.rotation.x=-Math.PI*.33;dish.position.set(0,4.8,2);g.add(dish);
  box(g,1.3,.7,1.8,0,-1.85,-.7,dark);
  const decalCanvas=document.createElement('canvas');decalCanvas.width=512;decalCanvas.height=128;const ctx=decalCanvas.getContext('2d');ctx.fillStyle='#d2dce0';ctx.fillRect(0,0,512,128);ctx.fillStyle='#152632';ctx.font='bold 48px monospace';ctx.fillText('ODYSSEY  07',32,75);
  const label=new THREE.Mesh(new THREE.PlaneGeometry(3.1,.78),new THREE.MeshStandardMaterial({map:new THREE.CanvasTexture(decalCanvas)}));label.position.set(1.69,.3,-.8);label.rotation.y=Math.PI/2;g.add(label);
  const flames=[];const glow=glowTexture();
  for(let x of [-3.25,3.25]){
    const core=new THREE.Mesh(new THREE.ConeGeometry(.7,6,20,1,true),new THREE.MeshBasicMaterial({color:0x62d7ff,transparent:true,opacity:.44,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));core.rotation.x=Math.PI/2;core.position.set(x,-.05,8.8);g.add(core);flames.push(core);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:glow,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));sprite.position.set(x,0,6);sprite.scale.set(5,5,1);g.add(sprite);flames.push(sprite);
  }
  for(let side of [-1,1])for(let j=0;j<5;j++){box(g,.16,.09,.7,side*1.4,1.06,-2+j*1.2,silver);box(g,.42,.11,.17,side*.66,1.69,-1+j*.58,dark);}
  const plasmaMat=new THREE.MeshBasicMaterial({color:0xffaa33,transparent:true,opacity:0,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false});
  const plasmaCone=new THREE.Mesh(new THREE.ConeGeometry(3.2,8,24,1,true),plasmaMat);
  plasmaCone.rotation.x=-Math.PI/2;
  plasmaCone.position.set(0,0,-8);
  plasmaCone.visible=false;
  g.add(plasmaCone);
  g.userData.plasmaCone=plasmaCone;
  g.userData.flames=flames;g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
function rover(){
  const g=new THREE.Group(),white=material(0xc2c6bc),dark=material(0x151d21),gold=material(0x9e793f),blue=material(0x113553);g.userData.wheels=[];
  box(g,4,1.2,5,0,1.6,0,white);box(g,3.8,.18,4.8,0,2.3,.2,gold);
  for(const side of [-1,1])for(let i=0;i<3;i++){const tire=cylinder(g,.87,.87,.65,side*2.5,.85,-1.8+i*1.8,dark,'y');tire.rotation.z=Math.PI/2;g.userData.wheels.push(tire);const hub=cylinder(g,.45,.45,.7,side*2.5,.85,-1.8+i*1.8,white,'y');hub.rotation.z=Math.PI/2;box(g,1.8,.15,.16,side*1.9,1.3,-1.8+i*1.8,gold);}
  cylinder(g,.1,.1,2.6,0,3.55,-1.3,white,'y');box(g,1.6,.65,.7,0,4.8,-1.3,white);box(g,1.25,.28,.08,0,4.86,-1.69,blue);
  box(g,4.7,.09,2,0,2.4,1.4,blue);for(let i=-2;i<=2;i++)box(g,.04,.1,2,i,2.46,1.4,gold);
  const sensor=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),EMISSIVE);sensor.position.set(-.5,4.8,-1.7);g.add(sensor);
  for(let side of [-1,1]){box(g,.6,.55,1.1,side*1.65,2.2,-1.7,gold);for(let j=0;j<6;j++)box(g,.06,.6,.06,side*2.86,.82,-1.8+(j%3)*1.8,dark);}
  // High-intensity exploration headlights for deep crater darkness
  for(let side of [-1.3,1.3]){
    box(g,.5,.35,.2,side,1.8,-2.55,material(0x222222));
    const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.18,.18,.1,12),new THREE.MeshBasicMaterial({color:0xe0f7ff}));
    lamp.rotation.x=Math.PI/2;lamp.position.set(side,1.8,-2.6);g.add(lamp);
  }
  const headlight=new THREE.SpotLight(0xe8f8ff,8,160,Math.PI/3.5,0.4,1.1);
  headlight.position.set(0,2.2,-2.5);
  const hlTarget=new THREE.Object3D();
  hlTarget.position.set(0,0,-45);
  g.add(hlTarget);
  headlight.target=hlTarget;
  g.add(headlight);
  g.userData.headlight=headlight;
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
function station(){const g=new THREE.Group(),white=material(0xb0c4ca),dark=material(0x243b4c),blue=material(0x173e62),gold=material(0xb09255);cylinder(g,5,5,18,0,0,0,white);const habitat=ring(g,21,2.2,0,0,4,white);for(let i=0;i<6;i++){const a=i*Math.PI/3;const arm=box(g,23,1.2,1.2,Math.cos(a)*10,Math.sin(a)*10,4,dark);arm.rotation.z=a;}ring(g,8,.5,0,0,13,EMISSIVE);for(const side of [-1,1]){box(g,30,.4,1,side*25,0,-3,dark);for(let j=0;j<3;j++){box(g,12,.16,19,side*(19+j*14),0,-3,blue);for(let k=-8;k<10;k+=3)box(g,12,.2,.07,side*(19+j*14),0,k-3,gold);}}return g;}
function satellite(){const g=new THREE.Group(),gold=material(0xb39459),blue=material(0x184b7a);box(g,4,3,4,0,0,0,gold);for(const side of [-1,1])box(g,9,.15,5,side*7,0,0,blue);cylinder(g,.08,.08,5,0,4,0,EMISSIVE,'y');return g;}
function outpost(){const g=new THREE.Group(),white=material(0xb5b5ac),dark=material(0x303333),blue=material(0x183454);for(let x of [-12,12]){cylinder(g,4,4,17,x,3,0,white);box(g,7,1,18,x,0,0,dark);box(g,7,.15,4,x,5,12,blue);}box(g,18,3,4,0,2,0,white);cylinder(g,.15,.2,13,18,7,-2,white,'y');const beacon=new THREE.Mesh(new THREE.SphereGeometry(.65,12,12),EMISSIVE);beacon.position.set(18,14,-2);g.add(beacon);return g;}

export class SpaceWorld {
  constructor(container){
    this.container=container;this.scene=new THREE.Scene();this.scene.background=new THREE.Color(0x02060d);
    this.camera=new THREE.PerspectiveCamera(46,innerWidth/innerHeight,.1,18000);this.camera.position.set(15,9,88);
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.16;container.appendChild(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Interactive 3D spacecraft and planetary simulation');
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.bloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),.4,.55,.91);this.composer.addPass(this.bloom);this.composer.addPass(new OutputPass());
    this.highQuality=true;this.time=0;this.cameraMode=0;this.mouse={x:0,y:0};this.shake=0;this.transitions=0;this.textures={};this.particles=[];this.sparkTimer=0;
    this.ambient=new THREE.AmbientLight(0x7ea7c9,1.1);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight(0xffe4c6,3.6);this.sun.position.set(-60,55,90);this.scene.add(this.sun);this.scene.add(this.sun.target);
    this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-100,right:100,top:100,bottom:-100,near:1,far:500});this.sun.shadow.bias=-.00015;this.sun.shadow.normalBias=.08;
    this.rim=new THREE.DirectionalLight(0x659fc8,1.5);this.rim.position.set(40,-10,20);this.scene.add(this.rim);
    this.cyberRim=new THREE.DirectionalLight(0x00e5ff,2.2);this.cyberRim.position.set(65,-15,-60);this.scene.add(this.cyberRim);
    this.space=new THREE.Group();this.scene.add(this.space);this.createStars();this.createSun();
    this.planet=new THREE.Mesh(new THREE.SphereGeometry(1,96,64),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.94,metalness:0}));this.space.add(this.planet);
    this.atmosphere=new THREE.Mesh(new THREE.SphereGeometry(1.025,64,48),new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide,uniforms:{glowColor:{value:new THREE.Color(0x6996b7)}},vertexShader:'varying vec3 vN; varying vec3 vV; void main(){vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 vN; varying vec3 vV; uniform vec3 glowColor; void main(){float f=pow(1.0-max(dot(vN,vV),0.0),4.5);gl_FragColor=vec4(glowColor,f*.55);}' }));this.space.add(this.atmosphere);
    this.orbits=new THREE.Group();this.space.add(this.orbits);for(let i=0;i<2;i++){const points=[];for(let j=0;j<=180;j++){const a=j/180*Math.PI*2;points.push(V(Math.cos(a)*(47+i*6),Math.sin(a)*10,Math.sin(a)*42));}const orbit=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0x00e5ff,transparent:true,opacity:i?.28:.72}));orbit.rotation.z=i?.38:-.22;this.orbits.add(orbit);}const sat=satellite();sat.scale.setScalar(0.42);this.orbitSatellite=sat;this.orbits.add(sat);
    this.ship=assembledVehicle();this.scene.add(this.ship);this.attachPlasmaCone();this.rover=rover();this.rover.visible=false;this.scene.add(this.rover);
    this.attachShieldSystem();
    this.stageGroup=new THREE.Group();this.scene.add(this.stageGroup);this.targets=[];this.debris=[];
    this.scanWave=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:CYAN,wireframe:true,transparent:true,opacity:0,depthWrite:false}));this.scene.add(this.scanWave);
    this.scanBeam=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),new THREE.LineBasicMaterial({color:CYAN,transparent:true,opacity:.65,depthWrite:false}));this.scanBeam.visible=false;this.scanBeam.frustumCulled=false;this.scene.add(this.scanBeam);
    this.createSensorSuite();
    this.createSolarStormVfx();
    this.loadTextures();this.menu=true;this.destination={id:'mars',color:'#efa678'};this.setDestination(this.destination);
    addEventListener('resize',()=>this.resize());addEventListener('pointermove',e=>{this.mouse.x=(e.clientX/innerWidth-.5)*2;this.mouse.y=(e.clientY/innerHeight-.5)*2;});
  }
  attachPlasmaCone(){
    if(this.plasmaCone){if(this.plasmaCone.parent)this.plasmaCone.parent.remove(this.plasmaCone);this.plasmaCone.geometry?.dispose();this.plasmaCone.material?.dispose();this.plasmaCone=null;}
    const plasmaMat=new THREE.MeshBasicMaterial({color:0xffaa33,transparent:true,opacity:0,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,depthWrite:false});
    this.plasmaCone=new THREE.Mesh(new THREE.ConeGeometry(3.2,8,24,1,true),plasmaMat);
    this.plasmaCone.rotation.x=-Math.PI/2;
    this.plasmaCone.position.set(0,0,-8);
    this.plasmaCone.visible=false;
    if(this.ship)this.ship.add(this.plasmaCone);
  }
  attachShieldSystem(){
    if(this.shieldGroup){
      if(this.shieldGroup.parent)this.shieldGroup.parent.remove(this.shieldGroup);
      this.shieldGroup.traverse(o=>{
        if(o.geometry)o.geometry.dispose();
        if(o.material){
          if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());
          else o.material.dispose();
        }
      });
      this.shieldGroup=null;
    }
    const group=new THREE.Group();
    group.name='shieldSystem';

    // 1. Inner energetic shell with glowing energy field
    const shellGeo=new THREE.IcosahedronGeometry(4.4,3);
    const shellMat=new THREE.MeshBasicMaterial({
      color:0x00e5ff,
      wireframe:false,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      depthWrite:false,
      side:THREE.DoubleSide
    });
    const shellMesh=new THREE.Mesh(shellGeo,shellMat);
    group.add(shellMesh);

    // 2. Geodesic / Hexagonal Energy Lattice Cage
    const latticeGeo=new THREE.IcosahedronGeometry(4.48,2);
    const latticeMat=new THREE.MeshBasicMaterial({
      color:0x73f7ff,
      wireframe:true,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const latticeMesh=new THREE.Mesh(latticeGeo,latticeMat);
    group.add(latticeMesh);

    // 3. Rotating Dual Magnetic Containment Rings
    const ringGeo1=new THREE.TorusGeometry(4.65,0.05,12,64);
    const ringMat1=new THREE.MeshBasicMaterial({
      color:0x00ffff,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const ring1=new THREE.Mesh(ringGeo1,ringMat1);
    group.add(ring1);

    const ringGeo2=new THREE.TorusGeometry(4.65,0.05,12,64);
    const ringMat2=new THREE.MeshBasicMaterial({
      color:0x38bdf8,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const ring2=new THREE.Mesh(ringGeo2,ringMat2);
    ring2.rotation.x=Math.PI/2;
    group.add(ring2);

    // 4. Inner dynamic shield point light
    const shieldLight=new THREE.PointLight(0x00e5ff,0,16);
    group.add(shieldLight);

    group.visible=false;
    this.shieldGroup=group;
    this.shieldSystem={
      group,
      shellMesh,
      latticeMesh,
      ring1,
      ring2,
      shieldLight,
      currentOpacity:0
    };
    if(this.ship)this.ship.add(group);
  }
  createSensorSuite(){
    // Secondary harmonic pulse wave for multi-band lidar
    this.scanWave2=new THREE.Mesh(
      new THREE.RingGeometry(0.9,1.0,32),
      new THREE.MeshBasicMaterial({color:0x8cffcd,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false})
    );
    this.scanWave2.rotation.x=Math.PI/2;
    this.scanWave2.visible=false;
    this.scene.add(this.scanWave2);

    // Volumetric dual-layer sensor scan beam sheath:
    const beamGeo=new THREE.CylinderGeometry(0.3,2.2,1,16,1,true);
    beamGeo.translate(0,0.5,0);
    beamGeo.rotateX(Math.PI/2);
    const beamMat=new THREE.MeshBasicMaterial({
      color:0x00e5ff,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      side:THREE.DoubleSide,
      depthWrite:false
    });
    this.scanBeamSheath=new THREE.Mesh(beamGeo,beamMat);
    this.scanBeamSheath.visible=false;
    this.scene.add(this.scanBeamSheath);

    // Streaming holographic telemetry data particles (target -> spacecraft)
    const count=90;
    const positions=new Float32Array(count*3);
    const colors=new Float32Array(count*3);
    const random=seeded(5124);
    for(let i=0;i<count;i++){
      positions[i*3]=0;
      positions[i*3+1]=0;
      positions[i*3+2]=0;
      const isGold=random()>0.65;
      const c=isGold?new THREE.Color(0xffea79):new THREE.Color(0x00ffff);
      colors[i*3]=c.r;
      colors[i*3+1]=c.g;
      colors[i*3+2]=c.b;
    }
    const dataGeo=new THREE.BufferGeometry();
    dataGeo.setAttribute('position',new THREE.BufferAttribute(positions,3));
    dataGeo.setAttribute('color',new THREE.BufferAttribute(colors,3));
    const dataMat=new THREE.PointsMaterial({
      size:2.0,
      vertexColors:true,
      transparent:true,
      opacity:0.92,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    this.sensorDataParticles=new THREE.Points(dataGeo,dataMat);
    this.sensorDataParticles.visible=false;
    this.scene.add(this.sensorDataParticles);

    // Target holographic analysis reticle
    const reticleGroup=new THREE.Group();
    const ring1=new THREE.Line(
      new THREE.RingGeometry(3.6,3.8,32),
      new THREE.LineBasicMaterial({color:0x00e5ff,transparent:true,opacity:0.85})
    );
    const ring2=new THREE.Line(
      new THREE.RingGeometry(4.4,4.55,16),
      new THREE.LineBasicMaterial({color:0x38ef7d,transparent:true,opacity:0.6})
    );
    const cage=new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.6,1),
      new THREE.MeshBasicMaterial({color:0x00e5ff,wireframe:true,transparent:true,opacity:0.3})
    );
    reticleGroup.add(ring1);
    reticleGroup.add(ring2);
    reticleGroup.add(cage);
    reticleGroup.visible=false;
    this.targetScanReticle=reticleGroup;
    this.scene.add(reticleGroup);
  }
  createSolarStormVfx(){
    const count=380;
    const pos=[];
    const colors=[];
    const random=seeded(9941);
    for(let i=0;i<count;i++){
      pos.push(
        (random()-0.5)*180,
        (random()-0.5)*90,
        (random()-0.5)*220
      );
      const rVal=random();
      const col=rVal>0.7?new THREE.Color(0x38efaa):rVal>0.35?new THREE.Color(0xffaa22):new THREE.Color(0xffe066);
      colors.push(col.r,col.g,col.b);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({
      size:2.2,
      vertexColors:true,
      transparent:true,
      opacity:0,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    this.solarStormParticles=new THREE.Points(geo,mat);
    this.solarStormParticles.visible=false;
    this.scene.add(this.solarStormParticles);
  }
  createDustStorm(){
    if(this.dustStorm)return;
    const count=180,pos=[],random=seeded(9412);
    for(let i=0;i<count;i++)pos.push((random()-.5)*70,random()*7+.5,(random()-.5)*70);
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({color:0xb0552b,size:.7,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
    this.dustStorm=new THREE.Points(geo,mat);
    this.dustStorm.visible=false;
    this.stageGroup.add(this.dustStorm);
  }
  spawnSparks(sim){
    const surface=sim.isSurface,origin=surface?this.rover:this.ship;
    if(!origin)return;
    const count=5+Math.floor(Math.random()*4),pos=[],vel=[];
    const rearZ=surface?2.2:3.8;
    for(let i=0;i<count;i++){
      const p=new THREE.Vector3((Math.random()-.5)*1.4,surface?.8+Math.random()*.6:(Math.random()-.5)*1.4,rearZ+Math.random()*1.5);
      origin.localToWorld(p);
      pos.push(p.x,p.y,p.z);
      const v=new THREE.Vector3((Math.random()-.5)*8,(Math.random()-.2)*6,surface?Math.random()*6+2:Math.random()*8+3);
      v.applyEuler(origin.rotation);
      vel.push(v.x,v.y,v.z);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({color:Math.random()>.35?0xffaa22:0xff5511,size:.35,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    const points=new THREE.Points(geo,mat);
    this.scene.add(points);
    this.particles.push({object:points,velocity:vel,life:.35,maxLife:.35});
  }
  createRadiationStorm(){
    if(this.radiationField)return;
    const count=240,pos=[],colors=[],random=seeded(7712);
    for(let i=0;i<count;i++){
      pos.push((random()-.5)*120,(random()-.5)*120,(random()-.5)*120);
      const c=new THREE.Color().setHSL(.78+random()*.12,.95,.65);
      colors.push(c.r,c.g,c.b);
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const mat=new THREE.PointsMaterial({size:1.4,vertexColors:true,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
    this.radiationField=new THREE.Points(geo,mat);
    this.radiationField.visible=false;
    this.stageGroup.add(this.radiationField);
  }
  updateDestinationLighting(destId,isSurface=false){
    if(destId==='jupiter'){
      this.ambient.color.setHex(0x352840);
      this.ambient.intensity=0.35;
      this.sun.color.setHex(0xfff0dd);
      this.sun.intensity=0.85;
      this.rim.color.setHex(0x9d4edd);
      this.rim.intensity=1.8;
      this.cyberRim.color.setHex(0xc77dff);
      this.cyberRim.intensity=2.4;
    }else if(destId==='moon'){
      this.ambient.color.setHex(0x10141a);
      this.ambient.intensity=isSurface?0.2:0.35;
      this.sun.color.setHex(0xffffff);
      this.sun.intensity=isSurface?4.8:4.2;
      this.rim.color.setHex(0x708090);
      this.rim.intensity=0.6;
      this.cyberRim.color.setHex(0x00e5ff);
      this.cyberRim.intensity=1.2;
    }else if(destId==='asteroid'){
      this.ambient.color.setHex(0x283038);
      this.ambient.intensity=isSurface?0.4:0.5;
      this.sun.color.setHex(0xfff5e6);
      this.sun.intensity=isSurface?2.2:2.4;
      this.rim.color.setHex(0x8a9ba8);
      this.rim.intensity=1.0;
      this.cyberRim.color.setHex(0x70d6ff);
      this.cyberRim.intensity=1.6;
    }else if(destId==='mars'){
      this.ambient.color.setHex(0x8c6b58);
      this.ambient.intensity=isSurface?1.05:0.75;
      this.sun.color.setHex(0xffd5b8);
      this.sun.intensity=isSurface?2.8:3.2;
      this.rim.color.setHex(0x659fc8);
      this.rim.intensity=1.5;
      this.cyberRim.color.setHex(0x00e5ff);
      this.cyberRim.intensity=2.0;
    }else{
      this.ambient.color.setHex(0x7ea7c9);
      this.ambient.intensity=isSurface?1.05:0.85;
      this.sun.color.setHex(0xffe4c6);
      this.sun.intensity=3.6;
      this.rim.color.setHex(0x659fc8);
      this.rim.intensity=1.6;
      this.cyberRim.color.setHex(0x00e5ff);
      this.cyberRim.intensity=2.2;
    }
  }
  loadTextures(){let remaining=6;this.ready=new Promise(resolve=>{const done=()=>{if(--remaining===0)resolve();};const loader=new THREE.TextureLoader();for(const [key,file] of Object.entries({earth:'earth.jpg',mars:'mars.jpg',moon:'moon.jpg',asteroid:'asteroid.jpg',jupiter:'jupiter.jpg',europa:'europa.jpg'})){loader.load(`./textures/${file}`,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());this.textures[key]=texture;if(this.planetKey===key){this.setPlanet(key);}done();},undefined,()=>{loader.load(`/src/game/dist/textures/${file}`,texture=>{texture.colorSpace=THREE.SRGBColorSpace;this.textures[key]=texture;if(this.planetKey===key){this.setPlanet(key);}done();},undefined,()=>{console.warn('Texture unavailable:',file);done();});});}});}
  createStars(){
    const random=seeded(4086),positions=[],colors=[];
    for(let i=0;i<4200;i++){const theta=random()*Math.PI*2,u=random()*2-1,r=6000+random()*5000;positions.push(r*Math.sqrt(1-u*u)*Math.cos(theta),r*u,r*Math.sqrt(1-u*u)*Math.sin(theta));const c=new THREE.Color().setHSL(.55+random()*.15,.12+random()*.3,.45+random()*.5);colors.push(c.r,c.g,c.b);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));this.stars=new THREE.Points(geo,new THREE.PointsMaterial({size:9,vertexColors:true,transparent:true,opacity:.82,sizeAttenuation:true}));this.scene.add(this.stars);
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const ctx=canvas.getContext('2d');ctx.fillStyle='#02050c';ctx.fillRect(0,0,1024,512);
    for(let i=0;i<40;i++){const x=random()*1024,y=210+Math.sin(x*.009)*85+(random()-.5)*80,r=40+random()*140;const grad=ctx.createRadialGradient(x,y,0,x,y,r);grad.addColorStop(0,i%3?'rgba(21,42,64,.16)':'rgba(60,38,60,.13)');grad.addColorStop(1,'transparent');ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2);}
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sky=new THREE.Mesh(new THREE.SphereGeometry(14000,32,16),new THREE.MeshBasicMaterial({map:texture,side:THREE.BackSide,depthWrite:false}));this.scene.add(sky);this.sky=sky;
  }
  createSun(){
    this.sunGroup = new THREE.Group();
    this.sunDir = new THREE.Vector3(-0.38, 0.26, -0.89).normalize();

    // 1. Incandescent Core Photosphere
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(new THREE.SphereGeometry(110, 32, 32), coreMat);
    this.sunGroup.add(core);

    // 2. Solar Chromosphere Glow
    const chromoMat = new THREE.MeshBasicMaterial({
      color: 0xffe070,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sunGroup.add(new THREE.Mesh(new THREE.SphereGeometry(132, 32, 32), chromoMat));

    // 3. Solar Corona Canvas Sprite
    const coronaCanvas = document.createElement('canvas');
    coronaCanvas.width = coronaCanvas.height = 512;
    const cCtx = coronaCanvas.getContext('2d');
    const cGrad = cCtx.createRadialGradient(256, 256, 0, 256, 256, 256);
    cGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    cGrad.addColorStop(0.12, 'rgba(255, 246, 185, 0.96)');
    cGrad.addColorStop(0.26, 'rgba(255, 190, 50, 0.76)');
    cGrad.addColorStop(0.48, 'rgba(255, 120, 20, 0.34)');
    cGrad.addColorStop(0.72, 'rgba(235, 60, 10, 0.12)');
    cGrad.addColorStop(1.0, 'rgba(180, 20, 0, 0.0)');
    cCtx.fillStyle = cGrad;
    cCtx.fillRect(0, 0, 512, 512);

    const coronaTex = new THREE.CanvasTexture(coronaCanvas);
    coronaTex.colorSpace = THREE.SRGBColorSpace;
    const coronaMat = new THREE.SpriteMaterial({
      map: coronaTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sunCorona = new THREE.Sprite(coronaMat);
    this.sunCorona.scale.set(1950, 1950, 1);
    this.sunGroup.add(this.sunCorona);

    // 4. Diffraction Optics & Anamorphic Glare Sprite
    const flareCanvas = document.createElement('canvas');
    flareCanvas.width = flareCanvas.height = 512;
    const fCtx = flareCanvas.getContext('2d');

    // Horizontal anamorphic flare streak
    const hGrad = fCtx.createLinearGradient(0, 256, 512, 256);
    hGrad.addColorStop(0.0, 'rgba(255, 200, 100, 0)');
    hGrad.addColorStop(0.35, 'rgba(255, 220, 140, 0.20)');
    hGrad.addColorStop(0.5, 'rgba(255, 255, 240, 0.90)');
    hGrad.addColorStop(0.65, 'rgba(255, 220, 140, 0.20)');
    hGrad.addColorStop(1.0, 'rgba(255, 200, 100, 0)');
    fCtx.fillStyle = hGrad;
    fCtx.fillRect(0, 251, 512, 10);

    // 4 diffraction spikes
    fCtx.save();
    fCtx.translate(256, 256);
    for (let angle of [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) {
      fCtx.save();
      fCtx.rotate(angle);
      const sGrad = fCtx.createLinearGradient(-256, 0, 256, 0);
      sGrad.addColorStop(0.0, 'rgba(255, 210, 120, 0)');
      sGrad.addColorStop(0.38, 'rgba(255, 225, 140, 0.28)');
      sGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      sGrad.addColorStop(0.62, 'rgba(255, 225, 140, 0.28)');
      sGrad.addColorStop(1.0, 'rgba(255, 210, 120, 0)');
      fCtx.fillStyle = sGrad;
      fCtx.fillRect(-256, -2, 512, 4);
      fCtx.restore();
    }
    fCtx.restore();

    const flareTex = new THREE.CanvasTexture(flareCanvas);
    flareTex.colorSpace = THREE.SRGBColorSpace;
    const flareMat = new THREE.SpriteMaterial({
      map: flareTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sunFlare = new THREE.Sprite(flareMat);
    this.sunFlare.scale.set(3600, 3600, 1);
    this.sunGroup.add(this.sunFlare);

    this.scene.add(this.sunGroup);
  }
  setDestination(destination){this.scanBeam.visible=false;this.scanWave.visible=false;if(this.scanWave2)this.scanWave2.visible=false;if(this.scanBeamSheath)this.scanBeamSheath.visible=false;if(this.sensorDataParticles)this.sensorDataParticles.visible=false;if(this.targetScanReticle)this.targetScanReticle.visible=false;if(this.solarStormParticles)this.solarStormParticles.visible=false;this.destination=destination;this.setPlanet(destination.id);this.orbits.visible=true;this.menu=true;this.stageGroup.visible=false;this.rover.visible=false;this.ship.visible=true;if(this.plasmaCone)this.plasmaCone.visible=false;if(this.dustStorm)this.dustStorm.visible=false;this.scene.fog=null;this.ambient.intensity=.65;this.sun.intensity=3.5;this.renderer.shadowMap.enabled=false;this.sun.target.position.set(0,0,0);this.sun.position.set(-60,55,90);}
  setPlanet(id){this.planetKey=id;const tex=this.textures[id]||null;this.planet.material.map=tex;this.planet.material.roughness=id==='earth'?0.42:id==='moon'?0.88:0.75;this.planet.material.metalness=id==='earth'?0.08:0.02;if(id==='mars'){this.planet.material.color.set(tex?0xffccaa:0xba7753);this.atmosphere.material.uniforms.glowColor.value.set(0x00e5ff);}else if(id==='earth'){this.planet.material.color.set(0xffffff);this.atmosphere.material.uniforms.glowColor.value.set(0x00c8ff);}else if(id==='moon'){this.planet.material.color.set(tex?0xffffff:0xd0d8e0);this.atmosphere.material.uniforms.glowColor.value.set(0x7dd3fc);}else if(id==='jupiter'){this.planet.material.color.set(0xffffff);this.atmosphere.material.uniforms.glowColor.value.set(0xe0a560);}else{this.planet.material.color.set(0x819daa);this.atmosphere.material.uniforms.glowColor.value.set(0x38bdf8);}this.planet.material.needsUpdate=true;}
  clearStage(){if(this.dustStorm){this.dustStorm.geometry?.dispose();this.dustStorm.material?.dispose();this.dustStorm=null;}for(const p of this.particles){this.scene.remove(p.object);p.object.geometry?.dispose();p.object.material?.dispose();}this.particles=[];this.stageGroup.traverse(o=>{if(o.isMesh){o.geometry?.dispose();if(o.material!==EMISSIVE&&o.material!==EMISSIVE_GOLD){if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}}});this.stageGroup.clear();this.targets=[];this.debris=[];}
  setupStage(sim){
    const configuration=sim.loadout.join(',');
    if(this.ship.userData.configuration!==configuration){
      if(this.plasmaCone){if(this.plasmaCone.parent)this.plasmaCone.parent.remove(this.plasmaCone);this.plasmaCone.geometry?.dispose();this.plasmaCone.material?.dispose();this.plasmaCone=null;}
      this.scene.remove(this.ship);disposeModel(this.ship);this.ship=assembledVehicle(sim.loadout);
      this.ship.userData.configuration=configuration;this.scene.add(this.ship);
      this.attachPlasmaCone();
      this.attachShieldSystem();
    }
    if(!this.plasmaCone)this.attachPlasmaCone();
    if(this.plasmaCone)this.plasmaCone.visible=false;
    if(!this.shieldGroup)this.attachShieldSystem();
    if(!this.ship.userData.faultBeacon){
      const beacon=new THREE.Group();beacon.position.set(0,2.6,-1);
      beacon.add(new THREE.Mesh(new THREE.SphereGeometry(.28,12,8),new THREE.MeshBasicMaterial({color:0xff735e})));
      beacon.add(new THREE.PointLight(0xff513a,5,9));beacon.visible=false;
      this.ship.add(beacon);this.ship.userData.faultBeacon=beacon;
    }
    this.menu=false;this.clearStage();this.stageGroup.visible=true;this.orbits.visible=false;this.ship.visible=!sim.isSurface;this.rover.visible=sim.isSurface;this.scene.fog=null;this.planet.visible=true;this.atmosphere.visible=true;
    const destId=sim.destination.id;
    const surface=(sim.stage===3||sim.stage===4)&&sim.destination.surface;
    this.surfaceScene=surface;this.terrainBase=sim.stage===3?-48:0;
    this.setPlanet(sim.stage===0||sim.stage===5?'earth':destId);
    this.updateDestinationLighting(sim.stage===0||sim.stage===5?'earth':destId,surface);
    this.renderer.shadowMap.enabled=surface&&this.highQuality;this.sun.castShadow=surface;
    if(surface){
      this.buildTerrain(sim);this.planet.visible=false;this.atmosphere.visible=false;
      if(destId==='mars'){
        this.scene.fog=new THREE.FogExp2(0x8a6753,0.00065);
      }else if(destId==='asteroid'){
        this.scene.fog=new THREE.FogExp2(0x1a2028,0.00035);
      }else{
        this.scene.fog=null;
      }
    }
    const isStage0 = sim.stage === 0;
    const ringColorHex = isStage0 ? 0xffaa00 : (destId==='jupiter'?0xc77dff:destId==='earth'?0x00c8ff:destId==='moon'?0x7dd3fc:destId==='asteroid'?0xffd166:CYAN);
    const targetMarkColor = new THREE.Color(ringColorHex);
    sim.targets.forEach((t,i)=>{
      const group=new THREE.Group();group.position.set(t.x,t.y,t.z);
      const color=new THREE.MeshBasicMaterial({color:i?(isStage0?new THREE.Color(0xaa7700):targetMarkColor.clone().multiplyScalar(0.6)):targetMarkColor,transparent:true,opacity:i?.34:.87});
      let mark;
      if(sim.stage<2){
        mark=ring(group,25,.22,0,0,0,color);
        const armMat = isStage0 ? EMISSIVE_GOLD : EMISSIVE;
        for(let j=0;j<4;j++){const arm=box(group,2.5,.45,.4,Math.cos(j*Math.PI/2)*25,Math.sin(j*Math.PI/2)*25,0,armMat);arm.rotation.z=j*Math.PI/2;}
      }else if(sim.isSurface){
        group.position.y=groundHeight(t.x,t.z);mark=ring(group,11,.14,0,.3,0,color);mark.rotation.x=-Math.PI/2;
        const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(i===2?2.5:1.8,1),material(destId==='moon'?(i===2?0x3a4045:0x555c62):destId==='asteroid'?(i===2?0x7a6f5d:0x8f8270):(i===2?0x688085:0x957a58)));
        rock.position.y=1.3;group.add(rock);cylinder(group,.055,.055,13,0,7,0,EMISSIVE,'y');
      }else if(sim.stage===3&&surface){
        group.position.y=-10;cylinder(group,20,21,1.2,0,-11,0,material(0x4c5050),'y',48);
        for(const x of [-12,12])for(const z of [-12,12])cylinder(group,.6,.9,23,x,-23,z,material(0x656c69),'y');
        mark=ring(group,22,.23,0,0,0,color);const base=outpost();base.position.set(34,-28,-12);group.add(base);
      }else if(sim.stage===5){
        const dock=station();dock.position.z=-20;group.add(dock);mark=ring(group,14,.23,0,0,0,color);
      }else{
        group.add(satellite());mark=ring(group,15,.17,0,0,0,color);
      }
      group.userData.mark=mark;this.stageGroup.add(group);this.targets.push(group);
    });
    const isEarthDebris = !surface && (destId==='earth' || sim.stage===0 || sim.stage===5);
    const rockGeo=new THREE.IcosahedronGeometry(1,2);
    const rockMat=material(destId==='moon'?0x3e4247:destId==='jupiter'?0x5a4860:destId==='asteroid'?0x6b6359:0x686964,.05,1);
    rockMat.map=detailTexture();rockMat.bumpMap=rockMat.map;rockMat.bumpScale=.18;
    const rp=rockGeo.attributes.position;
    for(let i=0;i<rp.count;i++){const x=rp.getX(i),y=rp.getY(i),z=rp.getZ(i),n=1+.14*Math.sin(x*12+y*4)*Math.cos(z*7)+.1*Math.sin(y*13+z*3);rp.setXYZ(i,x*n,y*n,z*n);}
    rockGeo.computeVertexNormals();
    for(const h of sim.hazards){
      let rock;
      if(isEarthDebris && Math.random() > 0.45){
        rock = new THREE.Group();
        box(rock, 1.8, 1.2, 2.2, 0, 0, 0, material(0xc2cdd6, 0.85, 0.25));
        box(rock, 3.8, 0.08, 1.4, 0, 0, 0, material(0x184b7a, 0.7, 0.4));
      }else{
        rock = new THREE.Mesh(rockGeo, rockMat);
      }
      rock.position.set(h.x,surface?groundHeight(h.x,h.z)+h.radius*.4:h.y,h.z);
      rock.scale.set(h.radius,h.radius*.8,h.radius*1.18);
      rock.rotation.set(h.rotation,h.rotation*.7,h.rotation*1.3);
      if(rock.isMesh){rock.castShadow=surface;rock.receiveShadow=surface;}
      this.stageGroup.add(rock);this.debris.push(rock);
    }
    this.camera.position.set(sim.position.x,sim.position.y+7,sim.position.z+30);this.camera.lookAt(sim.position.x,sim.position.y,sim.position.z-40);
  }
  buildTerrain(sim){
    const geo=new THREE.PlaneGeometry(2400,2400,120,120);geo.rotateX(-Math.PI/2);const a=geo.attributes.position;const colors=[];
    const destId=sim.destination.id;
    const base=new THREE.Color(destId==='mars'?0x85604a:destId==='moon'?0x484b4f:0x6b6359);
    for(let i=0;i<a.count;i++){
      const x=a.getX(i),z=a.getZ(i)-450,y=groundHeight(x,z);
      a.setY(i,y+this.terrainBase);a.setZ(i,z);
      const c=base.clone().multiplyScalar(destId==='moon'?(0.5+(y+7)/16):destId==='asteroid'?(0.65+(y+7)/22):(.7+(y+7)/20));
      colors.push(c.r,c.g,c.b);
    }
    geo.computeVertexNormals();geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const terrainTexture=detailTexture(destId==='moon'?'rock':'rock');
    terrainTexture.repeat.set(100,100);terrainTexture.anisotropy=8;
    const ground=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({vertexColors:true,roughness:destId==='moon'?0.96:1,map:terrainTexture,bumpMap:terrainTexture,bumpScale:destId==='moon'?.8:.6}));
    ground.receiveShadow=true;this.stageGroup.add(ground);

    const skyTop = new THREE.Color(destId==='mars'?0x122032:destId==='asteroid'?0x020508:0x000103);
    const skyHorizon = new THREE.Color(destId==='mars'?0x9a755d:destId==='asteroid'?0x091016:0x000103);
    const sky=new THREE.Mesh(new THREE.SphereGeometry(12000,32,16),new THREE.ShaderMaterial({
      side:THREE.BackSide,depthWrite:false,
      uniforms:{top:{value:skyTop},horizon:{value:skyHorizon},isAirless:{value:destId==='moon'?1.0:0.0}},
      vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'varying vec3 vP;uniform vec3 top;uniform vec3 horizon;uniform float isAirless;void main(){vec3 d=normalize(vP);float h=clamp(d.y*2.,0.,1.);vec3 c=mix(horizon,top,pow(h,.65));if(isAirless>0.5){c=vec3(0.002,0.003,0.005);}else{float s=max(dot(d,normalize(vec3(-.5,.24,-1.))),0.);c+=vec3(1.,.75,.48)*(pow(s,2000.)*2.+pow(s,35.)*.15);}gl_FragColor=vec4(c,1.);}'
    }));
    this.stageGroup.add(sky);

    const random=seeded(destId==='moon'?3311:destId==='asteroid'?6622:8802);
    const rockGeo=new THREE.DodecahedronGeometry(1,0);
    const rockMat=material(destId==='mars'?0x665348:destId==='moon'?0x2f3338:0x524b42,0,destId==='moon'?0.92:1);
    const rocks=new THREE.InstancedMesh(rockGeo,rockMat,260);const dummy=new THREE.Object3D();
    rockMat.map=detailTexture();rockMat.bumpMap=rockMat.map;rockMat.bumpScale=.35;
    for(let i=0;i<260;i++){
      const x=(random()-.5)*2000,z=(random()-.7)*2000,s=1+random()*9;
      dummy.position.set(x,groundHeight(x,z)+this.terrainBase+s*.2,z);
      dummy.scale.set(s,s*.7,s*1.15);dummy.rotation.set(random(),random()*6,random());dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    }
    rocks.castShadow=true;rocks.receiveShadow=true;this.stageGroup.add(rocks);
    if(sim.stage===4){const base=outpost();base.position.set(34,groundHeight(34,50),50);this.stageGroup.add(base);}
  }
  impact(){this.shake=1;const geometry=new THREE.BufferGeometry(),pos=[],vel=[];for(let i=0;i<55;i++){pos.push(this.ship.position.x,this.ship.position.y,this.ship.position.z);vel.push((Math.random()-.5)*30,(Math.random()-.5)*30,(Math.random()-.5)*30);}geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));const p=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xffbf72,size:.25,transparent:true,blending:THREE.AdditiveBlending}));this.scene.add(p);this.particles.push({object:p,velocity:vel,life:1.2,maxLife:1.2});}
  setQuality(high){this.highQuality=high;this.renderer.shadowMap.enabled=high&&!!this.surfaceScene;this.renderer.setPixelRatio(Math.min(devicePixelRatio,high?1.6:1));this.resize();}
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer.setSize(innerWidth,innerHeight);}
  projectTarget(sim){if(!sim?.target)return null;const t=sim.target;const p=V(t.x,sim.isSurface?groundHeight(t.x,t.z)+10:t.y,t.z).project(this.camera);return {x:(p.x*.5+.5)*innerWidth,y:(-.5*p.y+.5)*innerHeight,behind:p.z>1};}
  update(dt,sim){
    this.time+=dt;const t=this.time;this.stars.rotation.y=t*.0007;this.planet.rotation.y+=dt*.018;
    if(this.sunGroup){
      this.sunGroup.position.copy(this.camera.position).addScaledVector(this.sunDir,6200);
      this.sunGroup.visible=!this.surfaceScene;
      if(this.sunCorona){
        const pulse=1.0+Math.sin(t*1.6)*0.035;
        this.sunCorona.scale.set(1950*pulse,1950*pulse,1);
      }
      if(this.sunFlare){
        this.sunFlare.material.rotation+=dt*0.012;
      }
      if(!this.surfaceScene){
        this.sun.position.copy(this.camera.position).addScaledVector(this.sunDir,350);
        this.sun.target.position.copy(this.camera.position);
      }
    }
    if(this.menu){
      const destId = this.destination?.id || 'mars';
      // Real planetary proportions based on NASA physical radii:
      // Earth = 6371 km (scale: 36)
      // Mars = 3389.5 km (~53% Earth) -> scale: 22.0
      // Moon = 1737.4 km (~27% Earth) -> scale: 14.2
      // Europa = 1560.8 km (~24.5% Earth) -> scale: 13.6
      // Vesta = 262.7 km (~4% Earth) -> scale: 9.2 (triaxial)
      let pScale = 36;
      let pScaleY = 36;
      let pScaleZ = 36;
      let orbitScale = 1.0;
      if(destId === 'mars'){
        pScale = 22.0; pScaleY = 22.0; pScaleZ = 22.0; orbitScale = 0.65;
      }else if(destId === 'moon'){
        pScale = 14.2; pScaleY = 14.2; pScaleZ = 14.2; orbitScale = 0.44;
      }else if(destId === 'asteroid'){
        pScale = 9.2; pScaleY = 7.6; pScaleZ = 8.6; orbitScale = 0.32;
      }else if(destId === 'jupiter'){
        pScale = 13.6; pScaleY = 13.6; pScaleZ = 13.6; orbitScale = 0.42;
      }
      this.planet.position.set(0,0,-45);
      this.planet.scale.set(pScale, pScaleY, pScaleZ);
      this.atmosphere.position.copy(this.planet.position);
      this.atmosphere.scale.copy(this.planet.scale);
      this.planet.visible = true;
      this.atmosphere.visible = destId !== 'asteroid' && destId !== 'moon';
      this.orbits.position.copy(this.planet.position);
      this.orbits.scale.setScalar(orbitScale);
      this.orbits.rotation.y += dt * 0.015;
      if(this.orbitSatellite){
        const a = t * 0.22;
        this.orbitSatellite.position.set(Math.cos(a) * (54 * orbitScale), Math.sin(a) * (10 * orbitScale), Math.sin(a) * (42 * orbitScale));
        this.orbitSatellite.rotation.y = a + Math.PI / 2;
      }
      this.ship.position.set(14+Math.sin(t*.17)*1.2,-10+Math.sin(t*.65)*.5,4);this.ship.rotation.set(.12,1.05+Math.sin(t*.15)*.06,-.08);
      if(this.plasmaCone)this.plasmaCone.visible=false;if(this.dustStorm)this.dustStorm.visible=false;
      const destination=V(8+this.mouse.x*2,7-this.mouse.y*1.4,94);this.camera.position.lerp(destination,1-Math.exp(-dt*1.3));this.camera.lookAt(0,-1,-38);
    }else if(sim){
      const p=sim.position,surface=sim.isSurface;
      this.ship.position.set(p.x,p.y,p.z);this.ship.rotation.set(-sim.velocity.y*.007,-sim.velocity.x*.012,-sim.velocity.x*.025);
      if(this.ship.userData.faultBeacon)this.ship.userData.faultBeacon.visible=sim.stage===1&&!!sim.eventFlags.flare&&!sim.campaign?.completed?.repair&&Math.sin(t*12)>.1;

      // High-Tech 3D Shield Animation
      if(this.shieldSystem&&this.ship){
        const s=this.shieldSystem;
        const isShieldRouted=sim.route==='shield';
        const isDeflecting=isShieldRouted&&((sim.solarStormActive&&sim.solarStormIntensity>0.08)||sim.immunity>0);
        let desiredOpacity=0;
        if(isShieldRouted){
          desiredOpacity=isDeflecting?0.95:(0.46+Math.sin(t*7.5)*0.12);
        }
        s.currentOpacity=THREE.MathUtils.lerp(s.currentOpacity,desiredOpacity,dt*9);
        s.group.visible=s.currentOpacity>0.01&&!surface;

        if(s.group.visible){
          const pulse=Math.sin(t*9)*0.025+(isDeflecting?Math.sin(t*36)*0.06:0);
          s.group.scale.setScalar(1.0+pulse);
          s.shellMesh.material.opacity=s.currentOpacity*0.48;
          s.latticeMesh.material.opacity=s.currentOpacity*0.85;
          s.ring1.material.opacity=s.currentOpacity*0.82;
          s.ring2.material.opacity=s.currentOpacity*0.82;

          s.ring1.rotation.x+=dt*1.6;
          s.ring1.rotation.y+=dt*2.2;
          s.ring2.rotation.y+=dt*-1.8;
          s.ring2.rotation.z+=dt*2.5;

          if(isDeflecting){
            s.shellMesh.material.color.setHex(Math.sin(t*28)>0?0x88ffff:0xffea78);
            s.latticeMesh.material.color.setHex(0xffffff);
            s.shieldLight.color.setHex(0x73f7ff);
            s.shieldLight.intensity=5.0+Math.sin(t*40)*2.2;
          }else{
            s.shellMesh.material.color.setHex(0x00e5ff);
            s.latticeMesh.material.color.setHex(0x73f7ff);
            s.shieldLight.color.setHex(0x00e5ff);
            s.shieldLight.intensity=s.currentOpacity*2.4;
          }
        }
      }

      // Solar Storm / Coronal Mass Ejection (CME) Environmental Changes
      const stormIntensity=sim.solarStormIntensity||0;
      if(this.solarStormParticles){
        if(stormIntensity>0.01&&!surface){
          this.solarStormParticles.visible=true;
          this.solarStormParticles.material.opacity=stormIntensity*(0.72+Math.sin(t*18)*0.16);
          const a=this.solarStormParticles.geometry.attributes.position;
          const pCam=this.camera.position;
          for(let j=0;j<a.count;j++){
            let px=a.getX(j)+dt*120;
            let py=a.getY(j)+Math.sin(t*3+j)*0.25;
            let pz=a.getZ(j)+dt*260;
            if(pz>pCam.z+80){
              pz=pCam.z-140-(j%30)*4;
              px=pCam.x+(Math.sin(j)*70);
              py=pCam.y+(Math.cos(j)*35);
            }
            a.setXYZ(j,px,py,pz);
          }
          a.needsUpdate=true;

          if(this.sunFlare){
            const scale=3600*(1.0+stormIntensity*1.8+Math.sin(t*12)*0.15);
            this.sunFlare.scale.set(scale,scale,1);
          }
          if(this.sunCorona){
            const cScale=1950*(1.0+stormIntensity*1.5);
            this.sunCorona.scale.set(cScale,cScale,1);
          }
          this.sun.intensity=THREE.MathUtils.lerp(this.sun.intensity,3.6+stormIntensity*2.6+Math.sin(t*32)*0.4,dt*6);
          this.ambient.color.lerp(new THREE.Color(0xb06830),stormIntensity*dt*2.5);
          this.shake=Math.max(this.shake,stormIntensity*0.32);
        }else{
          this.solarStormParticles.visible=false;
          if(this.sunFlare)this.sunFlare.scale.lerp(new THREE.Vector3(3600,3600,1),dt*3);
          if(this.sunCorona)this.sunCorona.scale.lerp(new THREE.Vector3(1950,1950,1),dt*3);
        }
      }
      if(surface){this.rover.position.set(p.x,groundHeight(p.x,p.z),p.z);this.rover.rotation.y=-sim.heading;this.rover.rotation.z=Math.sin(t*12)*Math.min(sim.speed*.0015,.025);if(sim.mode==='flight')this.rover.userData.wheels.forEach(w=>w.rotateY(sim.speed*dt/.87));}
      if(this.surfaceScene){this.sun.position.set(p.x-100,160,p.z+80);this.sun.target.position.set(p.x,0,p.z);if(sim.stage===3&&sim.scan>0&&sim.target){this.ship.position.lerp(V(sim.target.x,sim.target.y-8,sim.target.z),sim.scan);}}
      this.ship.visible=!surface&&this.cameraMode!==1;this.rover.visible=surface;
      const focal=V(p.x,p.y,p.z);const cam=V();
      if(surface){focal.y=groundHeight(p.x,p.z)+2;cam.set(p.x-Math.sin(sim.heading)*26,focal.y+7,p.z+Math.cos(sim.heading)*26);focal.add(V(Math.sin(sim.heading)*16,0,-Math.cos(sim.heading)*16));}
      else if(this.cameraMode===1){cam.set(p.x,p.y+1.7,p.z-6.5);focal.z-=90;}
      else if(this.cameraMode===2){cam.set(p.x+23,p.y+9,p.z+14);focal.z-=15;}
      else{cam.set(p.x*.98,p.y+8,p.z+35);focal.z-=28;focal.y+=2;}
      if(!surface&&sim.throttle>1&&sim.mode==='flight'){cam.x+=Math.sin(t*57)*.08;cam.y+=Math.cos(t*43)*.05;}
      this.camera.position.lerp(cam,1-Math.exp(-dt*(this.cameraMode===1?18:5)));this.camera.lookAt(focal);
      if(sim.stage===3&&sim.reentryIntensity>0&&this.ship){
        if(this.plasmaCone){
          this.plasmaCone.visible=true;
          this.plasmaCone.material.opacity=sim.reentryIntensity*(.6+Math.sin(t*35)*.15);
          this.plasmaCone.scale.set(1+Math.sin(t*20)*.08,sim.reentryIntensity*1.4,1+Math.cos(t*20)*.08);
        }
        this.shake=Math.max(this.shake,sim.reentryIntensity*.85);
      }else if(this.plasmaCone){
        this.plasmaCone.visible=false;
      }
      if(this.shake>0){this.camera.position.add(V((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake,0));this.shake=Math.max(0,this.shake-dt*2);}
      this.camera.fov=THREE.MathUtils.lerp(this.camera.fov,sim.speed>65?59:46,dt*2);this.camera.updateProjectionMatrix();
      this.stars.position.copy(this.camera.position);this.sky.position.copy(this.camera.position);
      if(this.surfaceScene&&sim.destination?.id==='mars'&&this.scene.fog){
        if(sim.stormIntensity>0){
          const baseDensity=0.00065;
          this.scene.fog.density=baseDensity+sim.stormIntensity*.0035;
          this.scene.fog.color.copy(MARS_FOG_BASE).lerp(MARS_FOG_STORM,sim.stormIntensity);
          if(!this.dustStorm)this.createDustStorm();
          if(this.dustStorm){
            this.dustStorm.visible=true;
            this.dustStorm.material.opacity=sim.stormIntensity*.45;
            const targetPos=sim.isSurface?this.rover.position:this.ship.position;
            this.dustStorm.position.copy(targetPos);
            const p=this.dustStorm.geometry.attributes.position;
            for(let i=0;i<p.count;i++){
              let x=p.getX(i)+dt*40*sim.stormIntensity;
              if(x>35)x-=70;
              let y=p.getY(i)+Math.sin(t*4+i)*dt*1.5;
              if(y<.5)y=.5;if(y>8)y=8;
              p.setXY(i,x,y);
            }
            p.needsUpdate=true;
          }
        }else{
          this.scene.fog.density=0.00065;
          this.scene.fog.color.setHex(0x8a6753);
          if(this.dustStorm)this.dustStorm.visible=false;
        }
      }
      if(this.surfaceScene&&sim.destination?.id==='moon'){
        if(this.rover.userData.headlight){
          const inShadow = !!sim.inShadow || p.z < -130;
          const targetIntensity = inShadow ? 24 : 8;
          this.rover.userData.headlight.intensity = THREE.MathUtils.lerp(this.rover.userData.headlight.intensity, targetIntensity, dt * 3.5);
          if(inShadow){
            // Shackleton PSR deep darkness: ambient light drops dramatically
            this.ambient.intensity = THREE.MathUtils.lerp(this.ambient.intensity, 0.04, dt * 2.5);
            this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, 0.05, dt * 2.5);
          }else{
            this.ambient.intensity = THREE.MathUtils.lerp(this.ambient.intensity, 0.55, dt * 2.5);
            this.sun.intensity = THREE.MathUtils.lerp(this.sun.intensity, 3.2, dt * 2.5);
          }
        }
      }
      if(sim.destination?.id==='jupiter'){
        const flux=sim.radiationFlux||0;
        if(flux>0.08){
          if(!this.radiationField)this.createRadiationStorm();
          if(this.radiationField){
            this.radiationField.visible=true;
            this.radiationField.material.opacity=Math.min(0.7,flux*0.75);
            this.radiationField.position.copy(this.ship.position);
            const p=this.radiationField.geometry.attributes.position;
            for(let i=0;i<p.count;i++){
              let y=p.getY(i)+dt*25*flux;
              if(y>60)y-=120;
              p.setY(i,y);
            }
            p.needsUpdate=true;
          }
        }else if(this.radiationField){
          this.radiationField.visible=false;
        }
      }
      if(sim.hull<50){
        this.sparkTimer+=dt;
        const interval=sim.hull<25?.08:.16;
        if(this.sparkTimer>=interval){
          this.sparkTimer=0;
          this.spawnSparks(sim);
        }
      }else{
        this.sparkTimer=0;
      }
      const isJup = sim.destination?.id==='jupiter';
      const isEarth = sim.destination?.id==='earth' || sim.stage===0 || sim.stage===5;
      const targetDestId = (sim.stage===0 || sim.stage===5) ? 'earth' : (sim.destination?.id || 'mars');

      // Authentic planetary sizes for in-flight background:
      // Earth = 1250, Mars = 680, Moon = 380, Europa = 350, Asteroid = 160, Jupiter = 1850
      let flightScale = 1250;
      if (targetDestId === 'mars') flightScale = 680;
      else if (targetDestId === 'moon') flightScale = 380;
      else if (targetDestId === 'asteroid') flightScale = 160;
      else if (targetDestId === 'jupiter') flightScale = 1850;

      if(sim.stage===0){
        this.planet.position.set(380,-1950,-2600);
        this.planet.scale.setScalar(1100);
      }else if(sim.stage===1){
        this.planet.position.set(750,180,-2600);
        this.planet.scale.setScalar(flightScale * 0.65);
      }else if(sim.stage===5){
        this.planet.position.set(-550,-830,-1800);
        this.planet.scale.setScalar(flightScale * 0.85);
      }else{
        if(isEarth){
          this.planet.position.set(380,-1950,-2600);
          this.planet.scale.setScalar(1100);
        }else if(isJup){
          this.planet.position.set(450,-350,-1650);
          this.planet.scale.setScalar(1850);
        }else if(targetDestId==='asteroid'){
          this.planet.position.set(280,-140,-1600);
          this.planet.scale.set(160, 130, 150);
        }else{
          this.planet.position.set(350,-180,-1850);
          this.planet.scale.setScalar(flightScale);
        }
      }
      this.atmosphere.position.copy(this.planet.position);
      this.atmosphere.scale.copy(this.planet.scale);
      this.atmosphere.visible = targetDestId !== 'asteroid' && targetDestId !== 'moon';
      this.targets.forEach((group,i)=>{
        group.visible=!sim.targets[i]?.done;
        const mark=group.userData.mark;
        if(mark){
          if(!surface)mark.rotation.z=t*.1;
          const isCur = i===sim.targetIndex;
          mark.material.opacity = isCur ? 0.88 : 0.35;
          if(sim.stage===0){
            const activeCol = sim.canInteract ? 0x38ef7d : 0xffaa00;
            mark.material.color.setHex(isCur ? activeCol : 0xaa7700);
          } else {
            mark.material.color.set(isCur ? (sim.canInteract?0x8cffcd:CYAN) : 0x719bb0);
          }
        }
      });
      if(!surface)this.debris.forEach((rock,i)=>{rock.rotation.x+=dt*sim.hazards[i].spin;rock.rotation.y+=dt*.05;});

      // Sensor LiDAR pulse wave animation
      const scanOrigin=surface?this.rover.position:this.ship.position;
      this.scanWave.position.copy(scanOrigin);
      if(this.scanWave2)this.scanWave2.position.copy(scanOrigin);
      if(sim.pulse>0){
        this.scanWave.visible=true;
        this.scanWave.scale.setScalar((4-sim.pulse)*52);
        this.scanWave.material.opacity=sim.pulse/8;
        if(this.scanWave2){
          this.scanWave2.visible=true;
          this.scanWave2.scale.setScalar((4-sim.pulse)*44);
          this.scanWave2.material.opacity=sim.pulse/6;
          this.scanWave2.rotation.z+=dt*3;
        }
      }else if(sim.mode==='flight'&&sim.scan>0){
        this.scanWave.visible=true;
        this.scanWave.scale.setScalar(4+sim.scan*10);
        this.scanWave.material.opacity=0.18+Math.sin(t*10)*0.06;
        if(this.scanWave2)this.scanWave2.visible=false;
      }else{
        this.scanWave.visible=false;
        if(this.scanWave2)this.scanWave2.visible=false;
      }

      // Sensor Beam & Streaming Holographic Telemetry Data Particles
      const isScanning=sim.mode==='flight'&&sim.scan>0&&!!sim.target;
      this.scanBeam.visible=isScanning;
      if(this.scanBeamSheath)this.scanBeamSheath.visible=isScanning;
      if(this.sensorDataParticles)this.sensorDataParticles.visible=isScanning;
      if(this.targetScanReticle)this.targetScanReticle.visible=isScanning;

      if(isScanning){
        const originV=new THREE.Vector3(scanOrigin.x,scanOrigin.y+1,scanOrigin.z);
        const targetV=new THREE.Vector3(sim.target.x,surface?groundHeight(sim.target.x,sim.target.z)+2:sim.target.y,sim.target.z);
        const dist=originV.distanceTo(targetV);

        // Core laser line
        const beamPos=this.scanBeam.geometry.attributes.position;
        beamPos.setXYZ(0,originV.x,originV.y,originV.z);
        beamPos.setXYZ(1,targetV.x,targetV.y,targetV.z);
        beamPos.needsUpdate=true;
        this.scanBeam.material.opacity=0.65+0.3*Math.sin(t*16);

        // Volumetric sheath cone
        if(this.scanBeamSheath){
          this.scanBeamSheath.position.copy(originV);
          this.scanBeamSheath.lookAt(targetV);
          this.scanBeamSheath.scale.set(1.2+Math.sin(t*14)*0.18,1.2+Math.sin(t*14)*0.18,dist);
          this.scanBeamSheath.material.opacity=0.38+0.16*Math.sin(t*18);
        }

        // Streaming data particles (flowing from target -> sensor array)
        if(this.sensorDataParticles){
          const pAttr=this.sensorDataParticles.geometry.attributes.position;
          for(let i=0;i<pAttr.count;i++){
            const alpha=((t*2.2+i/pAttr.count)%1.0);
            const pt=new THREE.Vector3().lerpVectors(targetV,originV,alpha);
            const swirlRadius=(1.0-alpha)*1.5*Math.sin(alpha*Math.PI);
            const angle=t*8+i*0.45;
            pt.x+=Math.cos(angle)*swirlRadius;
            pt.y+=Math.sin(angle)*swirlRadius;
            pAttr.setXYZ(i,pt.x,pt.y,pt.z);
          }
          pAttr.needsUpdate=true;
        }

        // Holographic analysis reticle on target
        if(this.targetScanReticle){
          this.targetScanReticle.position.copy(targetV);
          this.targetScanReticle.children[0].rotation.z=t*2.0;
          this.targetScanReticle.children[1].rotation.z=-t*2.8;
          this.targetScanReticle.children[2].rotation.y=t*1.2;
          this.targetScanReticle.children[2].rotation.x=t*0.6;
          const progressCol=new THREE.Color().lerpColors(new THREE.Color(0x00e5ff),new THREE.Color(0x38ef7d),sim.scan);
          this.targetScanReticle.children[0].material.color.copy(progressCol);
        }
      }
    }
    const engineScale=this.menu?.5:sim?.mode==='flight'?(sim.throttle||0):0;this.ship.userData.flames.forEach((flame,i)=>{flame.visible=engineScale>.02;if(i%2===0)flame.scale.set(1,engineScale*(.9+Math.sin(t*42)*.1),1);else flame.material.opacity=.45+Math.sin(t*22)*.12;});
    for(let i=this.particles.length-1;i>=0;i--){const particle=this.particles[i];particle.life-=dt;const a=particle.object.geometry.attributes.position;for(let j=0;j<a.count;j++){a.setXYZ(j,a.getX(j)+particle.velocity[j*3]*dt,a.getY(j)+particle.velocity[j*3+1]*dt,a.getZ(j)+particle.velocity[j*3+2]*dt);}a.needsUpdate=true;particle.object.material.opacity=Math.max(0,particle.life/(particle.maxLife||1.2));if(particle.life<=0){this.scene.remove(particle.object);particle.object.geometry.dispose();particle.object.material.dispose();this.particles.splice(i,1);}}
    if(this.highQuality)this.composer.render();else this.renderer.render(this.scene,this.camera);
  }
}
