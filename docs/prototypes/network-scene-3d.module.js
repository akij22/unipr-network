import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/controls/OrbitControls.js';
// Three.js scene for the throwaway UI study. The simulation state is supplied by
// the existing interface through networkLab; it does not depend on camera state.
async function mountNetworkScene() {
 const mount=document.querySelector('#network-scene');
 const status=document.querySelector('#scene-status');
 try {
  const bridge=window.networkLab;
  const scene=new THREE.Scene();
  const css=getComputedStyle(document.documentElement);
  const swatch=document.createElement('canvas');swatch.width=swatch.height=1;
  const swatchContext=swatch.getContext('2d',{willReadFrequently:true});
  const colorCache=new Map();
  function color(token){
   if(colorCache.has(token))return colorCache.get(token).clone();
   swatchContext.fillStyle=css.getPropertyValue(token).trim();swatchContext.fillRect(0,0,1,1);
   const [r,g,b]=swatchContext.getImageData(0,0,1,1).data;
   const value=new THREE.Color().setRGB(r/255,g/255,b/255,THREE.SRGBColorSpace);
   colorCache.set(token,value);return value.clone();
  }
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(color('--color-panel'));
  renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('role','img');
  renderer.domElement.setAttribute('aria-label','Interactive 3D network. Drag to orbit, scroll to zoom. Arrow keys rotate, plus and minus zoom, Home resets the camera.');
  mount.prepend(renderer.domElement);
  const camera=new THREE.OrthographicCamera(-10,10,5,-5,.1,100);
  const homePosition=new THREE.Vector3(9,12,17),homeTarget=new THREE.Vector3(0,.4,0);
  camera.position.copy(homePosition);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.copy(homeTarget);controls.enableDamping=false;
  controls.minZoom=.6;controls.maxZoom=3;controls.minPolarAngle=.22;controls.maxPolarAngle=Math.PI*.47;
  controls.screenSpacePanning=true;controls.update();
  scene.add(new THREE.HemisphereLight(color('--color-ink'),color('--color-paper'),2.2));
  const key=new THREE.DirectionalLight(color('--color-ink'),3.4);key.position.set(-5,12,8);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-12;key.shadow.camera.right=12;
  key.shadow.camera.top=10;key.shadow.camera.bottom=-10;key.shadow.normalBias=.025;scene.add(key);
  const rim=new THREE.DirectionalLight(color('--color-blue'),1.4);rim.position.set(7,6,-7);scene.add(rim);
  const material=(token,extra={})=>new THREE.MeshStandardMaterial({color:color(token),roughness:.58,metalness:.22,...extra});
  const shell=material('--color-device-shell'),face=material('--color-device-face'),metal=material('--color-device-edge');
  const dark=material('--color-field'),blue=material('--color-blue'),amber=material('--color-amber');
  const screen=new THREE.MeshStandardMaterial({color:color('--color-blue-bg'),emissive:color('--color-blue'),emissiveIntensity:.22,roughness:.22,metalness:.15});
  function box(parent,x,y,z,w,h,d,mat){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(parent,x,y,z,r,h,mat){const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,48),mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  const ground=box(scene,0,-.22,0,26,.12,17,material('--color-panel',{roughness:1,metalness:0}));
  ground.receiveShadow=true;
  const grid=new THREE.GridHelper(26,26,color('--color-rule'),color('--color-rule'));grid.position.y=-.145;grid.material.transparent=true;grid.material.opacity=.17;scene.add(grid);
  const zones=[];
  function zone(x,z,w,d,token,line){
   const platform=box(scene,x,-.02,z,w,.18,d,material(token,{roughness:.88,metalness:.08}));
   const edges=new THREE.LineSegments(new THREE.EdgesGeometry(platform.geometry),new THREE.LineBasicMaterial({color:color(line),transparent:true,opacity:.8}));
   edges.position.copy(platform.position);scene.add(edges);zones.push(platform);return platform;
  }
  zone(-3.7,0,6.2,5.7,'--color-network-a','--color-network-a-line');
  zone(3.7,0,6.2,5.7,'--color-network-b','--color-network-b-line');
  function port(parent,x,y,z,w=.16){box(parent,x,y,z,w,.13,.035,dark);box(parent,x,y-.028,z+.024,w*.65,.022,.025,metal);}
  function hostModel(){
   const g=new THREE.Group();
   box(g,-.16,.15,0,1.13,.1,.65,metal);box(g,-.16,.58,-.07,.13,.82,.13,metal);
   box(g,-.16,1.28,-.07,1.4,.98,.16,shell);box(g,-.16,1.3,.023,1.23,.78,.024,screen);
   box(g,-.4,1.4,.04,.48,.025,.012,blue);box(g,-.25,1.24,.04,.78,.021,.012,blue);
   box(g,.8,.57,.03,.35,1.03,.7,face);box(g,.8,.94,.394,.23,.025,.018,metal);
   box(g,.8,.84,.394,.23,.025,.018,metal);box(g,.8,.45,.397,.06,.06,.02,blue);
   box(g,-.16,.16,.85,1.2,.07,.39,face);for(let i=0;i<4;i++)box(g,-.16,.202,.72+i*.075,.99,.008,.015,metal);
   return g;
  }
  function appliance(kind){
   const g=new THREE.Group(),isSwitch=kind==='switch',isHub=kind==='hub';
   const width=isSwitch?1.95:isHub?1.35:1.6;
   box(g,0,.37,0,width,.43,1.06,shell);box(g,0,.58,0,width*.97,.04,1,face);
   box(g,0,.38,.544,width*.94,.29,.034,dark);
   for(const x of [-width*.36,width*.36])box(g,x,.1,.2,.18,.18,.25,dark);
   const count=isSwitch?8:isHub?4:2;
   for(let i=0;i<count;i++)port(g,(i-(count-1)/2)*(isSwitch?.21:isHub?.26:.75),.4,.57,isSwitch?.14:.2);
   for(let i=0;i<4;i++)box(g,-width*.3+i*.08,.2,.566,.025,.026,.018,blue);
   if(kind==='router'){
    box(g,0,.616,0,.64,.015,.045,blue);
    const arrow=new THREE.Mesh(new THREE.ConeGeometry(.08,.18,3),blue);arrow.rotation.z=-Math.PI/2;arrow.position.set(.4,.632,0);g.add(arrow);
    const other=arrow.clone();other.rotation.z=Math.PI/2;other.position.x=-.4;g.add(other);
   }
   if(kind==='bridge'){box(g,0,.62,0,.66,.05,.36,blue);box(g,0,.654,0,.43,.02,.16,face);}
   if(kind==='hub')for(const x of [-.35,0,.35])box(g,x,.62,0,.025,.018,.5,blue);
   return g;
  }
  const objects=new Map(),labels=[];
  const positions={hostA:new THREE.Vector3(-5.1,.12,1.15),switch:new THREE.Vector3(-2.55,.12,-1.05),router:new THREE.Vector3(.15,.12,.65),hostB:new THREE.Vector3(4.75,.12,-.25)};
  function label(text,subtext,kind='node'){
   const el=document.createElement(kind==='node'?'button':'div');el.className=kind==='node'?'scene-node-label':'scene-subnet-label';
   if(kind==='node')el.type='button';
   const strong=document.createElement('strong');strong.textContent=text;el.append(strong);
   if(subtext){const small=document.createElement('span');small.textContent=subtext;el.append(small);}
   document.querySelector('#scene-labels').append(el);return el;
  }
  function addDevice(id,kind,position,preview=false){
   const model=kind==='host'?hostModel():appliance(kind);model.position.copy(position);model.userData.deviceId=id;
   scene.add(model);objects.set(id,model);
   const d=bridge.getDevice(id),el=label(d.name,preview?'Unconnected setup preview':d.ip||d.role.split(' · ').pop());
   el.dataset.sceneDevice=id;el.setAttribute('aria-label','Inspect '+d.name+' in the 3D network');el.onclick=()=>bridge.selectDevice(id);
   labels.push({element:el,object:model,offset:new THREE.Vector3(0,kind==='host'?2.23:1.19,0),id});
   return model;
  }
  addDevice('hostA','host',positions.hostA);addDevice('switch','switch',positions.switch);
  addDevice('router','router',positions.router);addDevice('hostB','host',positions.hostB);
  labels.push({element:label('Network A','192.168.1.0/24','subnet'),point:new THREE.Vector3(-4.25,.19,3.05)});
  const labelB=label('Network B','192.168.2.0/24','subnet');labelB.classList.add('subnet-b');
  labels.push({element:labelB,point:new THREE.Vector3(4.35,.19,3.05)});
  const pairs=[['hostA','switch'],['switch','router'],['router','hostB']];
  const curves=[],cables=[];
  for(let i=0;i<pairs.length;i++){
   const [from,to]=pairs[i].map(id=>positions[id].clone().add(new THREE.Vector3(0,.25,.43)));
   const middle=from.clone().lerp(to,.5);middle.y=.5;
   const curve=new THREE.CatmullRomCurve3([from,middle,to]);curves.push(curve);
   const cable=new THREE.Mesh(new THREE.TubeGeometry(curve,40,.032,8,false),material('--color-rule-strong',{roughness:.7,metalness:.1}));
   cable.userData.linkIndex=i;scene.add(cable);cables.push(cable);
  }
  const packet=new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.25),new THREE.MeshStandardMaterial({color:color('--color-blue'),emissive:color('--color-blue'),emissiveIntensity:.55,roughness:.25,metalness:.15}));
  packet.castShadow=true;packet.userData.packet=true;scene.add(packet);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.022,8,64),new THREE.MeshBasicMaterial({color:color('--color-blue')}));ring.rotation.x=Math.PI/2;scene.add(ring);
  let previewDevice=null,lastEvent=-1,eventStarted=performance.now(),queued=false,renderCount=0;
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function positionLabels(){
   const placed=[];
   for(const item of labels){
    const p=item.point?item.point.clone():item.object.position.clone().add(item.offset);
    p.project(camera);item.element.hidden=p.z<-1||p.z>1||Math.abs(p.x)>1.08||Math.abs(p.y)>1.08;
    let labelX=(p.x+1)/2*mount.clientWidth,labelY=(-p.y+1)/2*mount.clientHeight;
    if(item.id&&!item.element.hidden){
     const width=item.element.offsetWidth,height=item.element.offsetHeight;
     labelX=THREE.MathUtils.clamp(labelX,width/2+6,mount.clientWidth-width/2-6);
     for(let attempt=0;attempt<5;attempt++){
      const overlap=placed.find(r=>Math.abs(labelX-r.x)<(width+r.w)/2+5&&Math.abs(labelY-r.y)<(height+r.h)/2+5);
      if(!overlap)break;
      labelY=overlap.y-overlap.h/2-height/2-6;
     }
     labelY=Math.max(55+height/2,labelY);placed.push({x:labelX,y:labelY,w:width,h:height});
    }
    item.element.style.left=labelX+'px';item.element.style.top=labelY+'px';
    if(item.id)item.element.setAttribute('aria-pressed',String(item.id===bridge.getState().selected));
   }
  }
  function sync(){
   const snapshot=bridge.getState();
   if(snapshot.step!==lastEvent){lastEvent=snapshot.step;eventStarted=performance.now();}
   cables.forEach((c,i)=>{const active=i===snapshot.edge;c.material.color.copy(color(active?'--color-blue':'--color-rule-strong'));c.material.emissive.copy(color(active?'--color-blue':'--color-paper'));c.material.emissiveIntensity=active?.32:0;});
   if(['bridge','hub'].includes(snapshot.selected)&&previewDevice!==snapshot.selected){
    removePreview();previewDevice=snapshot.selected;addDevice(previewDevice,previewDevice,new THREE.Vector3(1.8,.12,3.7),true);
   }else if(!['bridge','hub'].includes(snapshot.selected))removePreview();
   const selected=objects.get(snapshot.selected);ring.visible=!!selected;
   if(selected){ring.position.copy(selected.position);ring.position.y=.17;ring.scale.setScalar(snapshot.selected.startsWith('host')?1.12:1);}
   packet.visible=snapshot.edge>=0;
   const f=snapshot.frame;
   document.querySelector('#scene-packet-status').textContent=snapshot.edge<0?'No frame in transit':snapshot.frameLabel+(f.hasIp?' · TTL '+f.ttl:' · Ethernet');
   mount.dataset.event=String(snapshot.step+1);requestDraw();
  }
  function removePreview(){if(!previewDevice)return;const group=objects.get(previewDevice);scene.remove(group);group.traverse(o=>{if(o.isMesh)o.geometry.dispose();});objects.delete(previewDevice);const index=labels.findIndex(l=>l.id===previewDevice);if(index>=0){labels[index].element.remove();labels.splice(index,1);}previewDevice=null;}
  function draw(){
   queued=false;const snapshot=bridge.getState();
   if(packet.visible){let progress=snapshot.playing?(performance.now()-eventStarted)/1600:.56;progress=Math.min(1,Math.max(0,progress));if([3,4,9,11,12,13].includes(snapshot.step))progress=1-progress;packet.position.copy(curves[snapshot.edge].getPoint(progress));packet.position.y+=.17;packet.rotation.set(.3,.5,.25);}
   positionLabels();renderer.render(scene,camera);renderCount++;
   if(snapshot.playing&&!document.hidden)requestDraw();
  }
  function requestDraw(){if(!queued){queued=true;requestAnimationFrame(draw);}}
  function resize(){const w=mount.clientWidth,h=mount.clientHeight,aspect=w/h;const height=Math.max(8.2,16.5/aspect);camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);requestDraw();}
  new ResizeObserver(resize).observe(mount);
  controls.addEventListener('change',requestDraw);
  function orbit(amount){const offset=camera.position.clone().sub(controls.target);const spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=amount;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));camera.lookAt(controls.target);controls.update();requestDraw();}
  function zoom(factor){camera.zoom=THREE.MathUtils.clamp(camera.zoom*factor,.6,3);camera.updateProjectionMatrix();controls.update();requestDraw();}
  function reset(){camera.position.copy(homePosition);camera.zoom=1;controls.target.copy(homeTarget);camera.updateProjectionMatrix();controls.update();requestDraw();}
  document.querySelector('#orbit-left').onclick=()=>orbit(-Math.PI/8);
  document.querySelector('#orbit-right').onclick=()=>orbit(Math.PI/8);
  document.querySelector('#zoom-in').onclick=()=>zoom(1.2);document.querySelector('#zoom-out').onclick=()=>zoom(1/1.2);
  document.querySelector('#reset-camera').onclick=reset;
  renderer.domElement.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')reset();else if(['+','='].includes(e.key))zoom(1.2);else if(e.key==='-')zoom(1/1.2);else if(e.key==='ArrowLeft'||e.key==='ArrowRight')orbit(e.key==='ArrowLeft'?-.15:.15);else{const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.1:.1),.22,Math.PI*.47);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();requestDraw();}});
  function pick(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const found=raycaster.intersectObjects([...objects.values(),...cables,...(packet.visible?[packet]:[])],true)[0];if(!found)return null;let o=found.object;while(o){if(o.userData.deviceId||o.userData.linkIndex!==undefined||o.userData.packet)return o.userData;o=o.parent;}return null;}
  let pointerStart=null;
  renderer.domElement.addEventListener('pointerdown',e=>pointerStart={x:e.clientX,y:e.clientY});
  renderer.domElement.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>5)return;const hit=pick(e);if(hit?.deviceId)bridge.selectDevice(hit.deviceId);else if(hit?.linkIndex!==undefined)bridge.inspectLink(hit.linkIndex);else if(hit?.packet)bridge.inspectPacket();pointerStart=null;});
  renderer.domElement.addEventListener('pointermove',e=>{if(e.buttons)return;const hit=pick(e);const hover=document.querySelector('#scene-hover');hover.textContent=hit?.deviceId?bridge.getDevice(hit.deviceId).name+' · select to inspect':hit?.linkIndex!==undefined?'Ethernet link · select for frame details':hit?.packet?'Packet in transit · select to inspect':'Drag to orbit · scroll to zoom · right-drag to pan';});
  renderer.domElement.addEventListener('pointerleave',()=>document.querySelector('#scene-hover').textContent='Drag to orbit · scroll to zoom · right-drag to pan');
  document.addEventListener('network-lab-state',sync);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestDraw();});
  window.networkScene3D={getInfo:()=>({engine:'Three.js',revision:THREE.REVISION,webgl:true,objects:objects.size,step:bridge.getState().step+1,activeLink:bridge.getState().edge,camera:camera.position.toArray(),zoom:camera.zoom,renders:renderCount})};
  mount.dataset.ready='true';status.hidden=true;resize();sync();draw();
  console.log('3D network ready: Three.js '+THREE.REVISION+', WebGL, orbit and picking enabled.');
 } catch(error) {
  status.hidden=false;status.setAttribute('role','alert');status.textContent='The 3D view could not load. Check your connection and WebGL support, then reload this page.';
  mount.dataset.ready='error';console.error('3D view failed:',error);
 }
}
mountNetworkScene();
