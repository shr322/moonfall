/* Original low-poly characters and environment composition; nature meshes: Kenney CC0. */
(function(){
  'use strict';
  const T=THREE, TAU=Math.PI*2;
  class ForestRenderer{
    constructor(container){
      this.container=container;this.scene=new T.Scene();this.scene.background=new T.Color('#becfad');this.scene.fog=new T.Fog('#becfad',38,118);
      this.camera=new T.PerspectiveCamera(43,innerWidth/innerHeight,.1,190);
      this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.8));this.renderer.setSize(innerWidth,innerHeight);this.renderer.outputEncoding=T.sRGBEncoding;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.13;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.setClearColor('#becfad');container.appendChild(this.renderer.domElement);
      this.scene.add(new T.HemisphereLight('#fff9dd','#5f8059',.75));const sun=new T.DirectionalLight('#fff2cf',1.05);sun.position.set(-18,35,10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-28;sun.shadow.camera.right=28;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.far=100;sun.shadow.bias=-.001;sun.shadow.normalBias=.04;this.scene.add(sun);sun.target.position.set(0,0,-15);this.scene.add(sun.target);
      this.materials={};this.geometry={};this.models={};this.sharedGeometry=new WeakSet();this.sharedMaterials=new WeakSet();this.entities=new Map();this.particles=[];this.floaters=[];this.scenery=[];this.roadMarks=[];this.time=0;this.scroll=0;this.menuBlend=1;this.shake=0;this.dogLunge=0;this.swordLunge=0;
      this.makeEnvironment();this.hero=this.makeArcher();this.scene.add(this.hero);this.dogs=[];this.swords=[];
      this.demoEnemies=[];for(let i=0;i<5;i++){const e=this.makeEnemy(i%3===0?'goblin':'slime');e.position.set([-2,2,0,-3,3][i],0,-15-i*8);this.scene.add(e);this.demoEnemies.push(e);}
      this.resize=()=>{this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);};window.addEventListener('resize',this.resize);
    }
    mat(color,extra={}){const k=color+JSON.stringify(extra);if(!this.materials[k]){this.materials[k]=new T.MeshStandardMaterial({color,roughness:.9,flatShading:true,...extra});this.materials[k].color.convertSRGBToLinear();this.sharedMaterials.add(this.materials[k]);}return this.materials[k];}
    basic(color,extra={}){const k='basic:'+color+JSON.stringify(extra);if(!this.materials[k]){this.materials[k]=new T.MeshBasicMaterial({color,...extra});this.materials[k].color.convertSRGBToLinear();this.sharedMaterials.add(this.materials[k]);}return this.materials[k];}
    geometryFor(key,create){if(!this.geometry[key]){this.geometry[key]=create();this.sharedGeometry.add(this.geometry[key]);}return this.geometry[key];}
    mesh(geo,mat,x=0,y=0,z=0){const o=new T.Mesh(geo,typeof mat==='string'?this.mat(mat):mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;return o;}
    box(parent,w,h,d,c,x=0,y=0,z=0){const m=this.mesh(this.geometryFor('box:'+w+','+h+','+d,()=>new T.BoxGeometry(w,h,d)),c,x,y,z);parent.add(m);return m;}
    sphere(parent,r,c,x=0,y=0,z=0){const m=this.mesh(this.geometryFor('sphere:'+r,()=>new T.IcosahedronGeometry(r,1)),c,x,y,z);parent.add(m);return m;}
    cyl(parent,rt,rb,h,c,x=0,y=0,z=0,n=8){const m=this.mesh(this.geometryFor('cylinder:'+rt+','+rb+','+h+','+n,()=>new T.CylinderGeometry(rt,rb,h,n)),c,x,y,z);parent.add(m);return m;}
    shadow(parent,r=1){const s=new T.Mesh(this.geometryFor('shadow:'+r,()=>new T.CircleGeometry(r,20)),this.basic('#243f27',{transparent:true,opacity:.15,depthWrite:false}));s.rotation.x=-Math.PI/2;s.position.y=.028;parent.add(s);return s;}
    nature(name){
      const data=(window.KENNEY_MODELS||{})[name];if(!data)return null;
      if(!this.models[name]){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));const colors=[];for(let i=0;i<data.colors.length;i+=3){let r=data.colors[i],v=data.colors[i+1],b=data.colors[i+2];let c=new T.Color(r,v,b);if(v>r*2&&b>r*2)c.set(v>.82?'#7b985d':v>.72?'#668853':'#496b4b');else if(r>v*1.3&&v>b*1.05)c.set(r>.85?'#88694d':'#71543d');c.convertSRGBToLinear();colors.push(c.r,c.g,c.b);}g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.computeVertexNormals();const b=data.bounds;g.translate(-(b[0][0]+b[0][1])/2,-b[1][0],-(b[2][0]+b[2][1])/2);this.models[name]=g;this.sharedGeometry.add(g);}
      const o=this.mesh(this.models[name],this.mat('#ffffff',{vertexColors:true}));return o;
    }
    tree(kind=0){
      const names=Object.keys(window.KENNEY_MODELS||{}).filter(n=>/tree/i.test(n));let m=names.length?this.nature(names[kind%names.length]):null;
      if(m){const size=new T.Box3().setFromObject(m).getSize(new T.Vector3());m.scale.setScalar((kind%2?6.2:5.1)/Math.max(size.y,.1));return m;}
      const g=new T.Group();this.cyl(g,.2,.35,2.5,'#766345',0,1.25,0);this.sphere(g,2.1,['#537e4b','#709356','#608445'][kind%3],0,3.3,0);this.sphere(g,1.4,'#88a264',.8,4.4,.4);return g;
    }
    rock(){const names=Object.keys(window.KENNEY_MODELS||{}).filter(n=>/rock/i.test(n));let m=names.length?this.nature(names[0]):null;if(m){const size=new T.Box3().setFromObject(m).getSize(new T.Vector3());m.scale.setScalar(1.2/Math.max(size.x,.1));return m;}const g=new T.Group();const r=this.sphere(g,.75,'#89917c',0,.4,0);r.scale.set(1.4,.75,1);return g;}
    bush(){const names=Object.keys(window.KENNEY_MODELS||{}).filter(n=>/bush|plant/i.test(n));let m=names.length?this.nature(names[0]):null;if(m){const size=new T.Box3().setFromObject(m).getSize(new T.Vector3());m.scale.setScalar(1.5/Math.max(size.x,.1));return m;}const g=new T.Group();this.sphere(g,.7,'#7f9b56',0,.35,0);return g;}
    makeEnvironment(){
      const ground=this.mesh(new T.PlaneGeometry(300,280), '#8ca567',0,-.08,-60);ground.rotation.x=-Math.PI/2;ground.castShadow=false;this.scene.add(ground);
      const road=this.mesh(new T.PlaneGeometry(10.4,180),'#d3c396',0,-.015,-62);road.rotation.x=-Math.PI/2;road.castShadow=false;this.scene.add(road);
      for(let side of [-1,1]){const verge=this.mesh(new T.PlaneGeometry(.35,180),'#b2b67c',side*5.35,.005,-62);verge.rotation.x=-Math.PI/2;verge.castShadow=false;this.scene.add(verge);}
      let seed=7913;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
      for(let i=0;i<96;i++){const side=i%2?-1:1;const g=this.tree(i%5);const x=side*(8+rand()*25),z=15-rand()*145,s=.65+rand()*.65;g.position.set(x,0,z);g.scale.multiplyScalar(s);g.rotation.y=rand()*TAU;this.scene.add(g);this.scenery.push(g);}
      for(let i=0;i<95;i++){const g=i%3===0?this.rock():this.bush();const side=i%2?-1:1;g.position.set(side*(5.9+rand()*15),0,16-rand()*140);g.scale.multiplyScalar(.45+rand()*.8);g.rotation.y=rand()*TAU;this.scene.add(g);this.scenery.push(g);}
      // Broken edging and little grass islands anchor the long road in the forest.
      for(let i=0;i<56;i++){const s=i%2?-1:1;const stone=this.mesh(new T.DodecahedronGeometry(.34,0),'#b3b298',s*(5.12+rand()*.15),.1,10-i*2.3);stone.scale.set(.8,.45,2.2);stone.rotation.y=rand()*.15;this.scene.add(stone);this.scenery.push(stone);}
      for(let i=0;i<70;i++){const g=this.mesh(new T.PlaneGeometry(.04+rand()*.22,.12+rand()*.5),i%2?'#b7aa7b':'#e1d5ae',(rand()-.5)*9.6,.01,12-rand()*140);g.rotation.x=-Math.PI/2;g.rotation.z=rand()*TAU;g.castShadow=false;this.scene.add(g);this.roadMarks.push(g);}
      for(let side of [-1,1])for(let i=0;i<6;i++){const hill=this.mesh(new T.IcosahedronGeometry(1,1),i%2?'#8ea17d':'#9caf8b',side*(32+i*10),2,-60-i*12);hill.scale.set(17,8+rand()*9,24);hill.castShadow=false;this.scene.add(hill);}
      const dustGeo=new T.BufferGeometry();const pos=[];for(let i=0;i<90;i++)pos.push((rand()-.5)*45,rand()*9+.4,-rand()*75);dustGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));this.dust=new T.Points(dustGeo,new T.PointsMaterial({color:'#fff5c7',size:.075,transparent:true,opacity:.65}));this.scene.add(this.dust);
    }
    makeArcher(){
      const g=new T.Group();this.shadow(g,.68);
      const torso=new T.Group();g.add(torso);g.userData.torso=torso;
      const body=this.cyl(torso,.3,.43,.76,'#37634a',0,1.05,0);this.cyl(torso,.435,.43,.12,'#a87842',0,.76,0);
      const cape=this.mesh(new T.ConeGeometry(.46,.93,5),'#b96b43',0,1.13,.22);cape.rotation.x=.15;cape.scale.z=.45;torso.add(cape);
      this.sphere(torso,.39,'#3c6b4a',0,1.75,0);const face=this.sphere(torso,.28,'#e9c294',0,1.73,-.19);face.scale.set(.8,1,.7);
      this.box(torso,.12,.07,.05,'#343e2f',-.12,1.77,-.39);this.box(torso,.12,.07,.05,'#343e2f',.12,1.77,-.39);
      this.cyl(torso,.25,.33,.13,'#d9b462',0,1.46,0);const hat=this.mesh(new T.ConeGeometry(.37,.4,6),'#43774e',0,2.01,.05);hat.rotation.z=-.2;torso.add(hat);
      const feather=this.box(torso,.08,.45,.07,'#e2c272',.23,2.13,.08);feather.rotation.z=-.35;
      for(let s of [-1,1]){const arm=this.cyl(torso,.115,.1,.64,'#47734f',s*.38,1.19,-.11);arm.rotation.x=-.7;arm.rotation.z=s*.15;this.sphere(torso,.12,'#e8bf91',s*.4,1.0,-.32);}
      const bow=new T.Group();const curve=new T.EllipseCurve(0,0,.35,.61,-Math.PI/2,Math.PI/2,false,0);const points=curve.getPoints(18).map(p=>new T.Vector3(p.x,p.y,0));bow.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#98623a'})));bow.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0,-.6,0),new T.Vector3(0,.6,0)]),new T.LineBasicMaterial({color:'#f9e8b5'})));bow.position.set(.47,1.25,-.48);bow.rotation.y=.8;torso.add(bow);
      const quiver=this.cyl(torso,.18,.15,.7,'#79563d',-.23,1.18,.31);quiver.rotation.z=-.25;for(let i=0;i<3;i++)this.cyl(torso,.018,.018,.65,'#ddc897',-.34+i*.09,1.59,.34);
      g.userData.legs=[];for(let s of [-1,1]){const leg=new T.Group();leg.position.set(s*.2,.7,0);this.cyl(leg,.12,.1,.43,'#ddd0a4',0,-.22,0);this.box(leg,.25,.23,.4,'#5c4e39',0,-.53,-.06);g.add(leg);g.userData.legs.push(leg);}return g;
    }
    makeEnemy(type){
      const g=new T.Group();g.userData.type=type;this.shadow(g,type==='boss'?2.5:type==='brute'?1:.7);
      if(type==='slime'){
        const body=this.sphere(g,.7,'#87b761',0,.55,0);body.scale.set(1,.85,1);g.userData.body=body;
        for(let s of [-1,1]){this.sphere(g,.11,'#f2edcc',s*.22,.71,.48);this.sphere(g,.05,'#334c33',s*.22,.72,.58);}this.sphere(g,.17,'#b5ce80',-.22,.88,-.08);
      }else if(type==='boss'){
        this.cyl(g,1.3,1.8,3.1,'#6c7d66',0,2.2,0,6);this.sphere(g,1.16,'#87967a',0,4.35,0);for(let s of [-1,1]){const shoulder=this.sphere(g,1.07,'#75896a',s*1.6,3.3,0);shoulder.scale.set(1,.9,1);this.cyl(g,.52,.7,2.7,'#5b705a',s*2.05,2.05,.1,5);this.box(g,1.1,1.1,1.25,'#56654e',s*.83,.55,0);const horn=this.cyl(g,.07,.23,1.5,'#c3af7b',s*.9,5.3,0,5);horn.rotation.z=-s*.4;this.sphere(g,.17,this.mat('#e5bf58',{emissive:'#b0791c',emissiveIntensity:.7}),s*.42,4.42,.98);}
        const gem=this.sphere(g,.55,this.mat('#c3e193',{emissive:'#7ea862',emissiveIntensity:.7}),0,2.9,1.25);gem.scale.set(.7,1.1,.5);this.sphere(g,.8,'#6b914f',.7,4.95,-.2);this.sphere(g,.63,'#85a462',-1.7,3.95,-.2);
      }else{
        const brute=type==='brute',c=type==='archer'?'#89728d':brute?'#a88c68':'#a87356';this.cyl(g,brute?.53:.3,brute?.65:.4,brute?1.2:.85,c,0,brute?1.2:.9,0);this.sphere(g,brute?.57:.39,brute?'#aeb09b':'#b5b479',0,brute?2.05:1.62,0);
        for(let s of [-1,1]){this.box(g,.12,.08,.07,'#343b2a',s*(brute?.2:.14),brute?2.07:1.64,brute?.49:.34);this.box(g,brute?.36:.23,.55,.34,'#655d43',s*(brute?.34:.2),.3,0);this.cyl(g,.12,.16,brute?1.1:.7,c,s*(brute?.65:.4),1,.03);}
        if(brute){const club=this.cyl(g,.17,.14,1.6,'#6d573a',.9,.95,.1);club.rotation.z=-.2;this.sphere(g,.43,'#8a8a76',1.05,1.6,.1);}else{const hat=this.cyl(g,.12,.48,.37,type==='archer'?'#645774':'#756e42',0,1.93,0,5);hat.rotation.z=.15;this.box(g,.07,.8,.07,'#a7a585',.5,1,.15);}
      }
      const h=type==='boss'?6.3:type==='brute'?2.8:type==='slime'?1.55:2.45;
      if(type!=='boss'){const plane=this.geometryFor('healthbar',()=>new T.PlaneGeometry(1,.075));const bg=this.mesh(plane,this.basic('#354f37',{transparent:true,opacity:.45}),0,h,0);const bar=this.mesh(plane,this.basic('#ecdc93'),0,h,.006);g.add(bg,bar);g.userData.hpBg=bg;g.userData.hpBar=bar;}
      return g;
    }
    makeArrow(critical=false){const g=new T.Group();const shaft=this.cyl(g,.023,.023,.9,critical?'#ffdd70':'#f0dfad',0,.95,0,4);shaft.rotation.x=Math.PI/2;const tip=this.mesh(this.geometryFor('arrowhead',()=>new T.ConeGeometry(.075,.23,4)),critical?'#ffe5a0':'#dde4c2',0,.95,-.55);tip.rotation.x=-Math.PI/2;g.add(tip);this.box(g,.17,.035,.18,'#fbf2cc',0,.95,.3);return g;}
    makeDog(){const g=new T.Group();this.shadow(g,.42);this.box(g,.43,.46,.8,'#a69b80',0,.58,0);this.sphere(g,.29,'#c7bd9d',0,.87,-.36);this.box(g,.24,.18,.3,'#d5c8a5',0,.79,-.6);this.sphere(g,.07,'#3d4438',0,.8,-.76);for(let s of [-1,1]){this.cyl(g,0,.13,.3,'#8a856f',s*.18,1.14,-.34,3);this.box(g,.12,.32,.13,'#8b826e',s*.19,.22,.25);this.box(g,.12,.32,.13,'#8b826e',s*.19,.22,-.24);}const tail=this.cyl(g,.07,.12,.48,'#8f896f',0,.76,.5);tail.rotation.x=.8;return g;}
    makeSword(){const g=new T.Group();this.box(g,.13,.07,1.1,this.mat('#bdede0',{emissive:'#347c6d',emissiveIntensity:.3}),0,1.8,-.3);this.box(g,.47,.09,.1,'#cdb979',0,1.8,.25);this.box(g,.09,.1,.34,'#648471',0,1.8,.45);return g;}
    label(upgrade,side){
      const c=document.createElement('canvas');c.width=512;c.height=224;const ctx=c.getContext('2d');ctx.fillStyle=side?'#e9e6c9':'#d8ead9';ctx.beginPath();ctx.roundRect(3,3,506,218,24);ctx.fill();ctx.strokeStyle=side?'#aa9e67':'#79a182';ctx.lineWidth=4;ctx.stroke();ctx.fillStyle=side?'#7f744a':'#538268';ctx.font='17px sans-serif';ctx.textAlign='center';ctx.fillText(side?'FOREST BLESSING':'FOREST BLESSING',256,43);ctx.fillStyle='#304b38';ctx.font='bold 43px "Malgun Gothic", sans-serif';ctx.fillText(upgrade.label||upgrade.title,256,112);ctx.font='19px sans-serif';ctx.fillStyle='#74816a';ctx.fillText(side?'오른쪽 길로 선택  →':'←  왼쪽 길로 선택',256,173);const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;const s=new T.Sprite(new T.SpriteMaterial({map:tex,depthWrite:false}));s.scale.set(4.25,1.86,1);s.position.set(side?2.55:-2.55,3.15,0);return s;
    }
    makeGate(gate){const g=new T.Group();for(let s of [-1,1]){const color=s<0?'#82bea0':'#c7b979';for(let x of [s*.27,s*4.9]){const p=this.cyl(g,.055,.08,2.75,color,x,1.37,0,6);p.material=this.mat(color,{emissive:color,emissiveIntensity:.12});}const threshold=this.mesh(new T.PlaneGeometry(4.5,.65),this.mat(color,{transparent:true,opacity:.48,side:T.DoubleSide}),s*2.55,.04,0);threshold.rotation.x=-Math.PI/2;g.add(threshold);const line=this.box(g,4.6,.05,.06,color,s*2.55,2.2,0);line.castShadow=false;g.add(this.label(s<0?gate.left:gate.right,s>0));}return g;}
    createEntity(kind,data){
      let m;if(kind==='enemy')m=this.makeEnemy(data.type);else if(kind==='arrow')m=this.makeArrow(data.critical);else if(kind==='hostile'){m=new T.Group();this.sphere(m,.25,this.mat('#e8a06d',{emissive:'#d86f38',emissiveIntensity:.8}),0,.95,0);const halo=this.sphere(m,.37,this.basic('#ffd29a',{transparent:true,opacity:.25}),0,.95,0);}else if(kind==='obstacle'){m=this.rock();m.scale.multiplyScalar(1.35);}else if(kind==='gate')m=this.makeGate(data);else{m=new T.Group();const coin=this.cyl(m,.16,.16,.07,this.mat('#e4bb57',{metalness:.45,roughness:.4}),0,.65,0,10);coin.rotation.x=Math.PI/2;}
      this.scene.add(m);return m;
    }
    syncEntities(kind,array,active){for(const d of array){const k=kind+d.id;active.add(k);let m=this.entities.get(k);if(!m){m=this.createEntity(kind,d);this.entities.set(k,m);}m.position.x=d.x||0;m.position.z=-d.z;if(kind==='enemy'){m.rotation.z=Math.sin(d.age*6)*.035;m.position.y=d.type==='slime'?Math.abs(Math.sin(d.age*4))*.12:Math.abs(Math.sin(d.age*6))*.04;if(m.userData.hpBar){const b=m.userData.hpBar;b.scale.x=Math.max(0,d.hp/d.maxHp);b.position.x=-(1-b.scale.x)/2;b.quaternion.copy(this.camera.quaternion);m.userData.hpBg.quaternion.copy(this.camera.quaternion);b.visible=m.userData.hpBg.visible=d.hp<d.maxHp;}if(d.hit>0)m.scale.setScalar(1+Math.min(d.hit,.12)*.5);else m.scale.setScalar(1);}else if(kind==='arrow')m.rotation.y=-Math.atan2(d.vx,d.vz);else if(kind==='coin'){m.rotation.y=this.time*3;m.position.y=Math.sin(this.time*5+d.id)*.1;}}
    }
    removeEntity(m){
      if(m.parent)m.parent.remove(m);
      const geometries=new Set(),materials=new Set(),textures=new Set();
      m.traverse(o=>{
        // Sprite geometry belongs to THREE globally; nature and cached primitives
        // are shared by live objects. Only dispose resources owned by this entity.
        if(o.geometry&&!o.isSprite&&!this.sharedGeometry.has(o.geometry))geometries.add(o.geometry);
        for(const material of (Array.isArray(o.material)?o.material:[o.material]))if(material&&!this.sharedMaterials.has(material))materials.add(material);
      });
      for(const material of materials)for(const value of Object.values(material))if(value&&value.isTexture)textures.add(value);
      textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
    }
    effect(type,x,z,color,count=9){for(let i=0;i<count;i++){const g=this.geometryFor('particle',()=>new T.IcosahedronGeometry(.07,0));const m=this.mesh(g,this.mat(color),x,.8,-z);m.castShadow=false;m.receiveShadow=false;this.scene.add(m);this.particles.push({m,vx:(Math.random()-.5)*5,vy:2+Math.random()*3,vz:(Math.random()-.5)*5,life:type==='upgrade'?1.1:.55,max:type==='upgrade'?1.1:.55});}}
    floating(text,x,z,color='#fff5d6'){if(this.floaters.length>30)return;const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d');ctx.font='bold 33px sans-serif';ctx.textAlign='center';ctx.strokeStyle='#35543b';ctx.lineWidth=5;ctx.strokeText(text,64,43);ctx.fillStyle=color;ctx.fillText(text,64,43);const tex=new T.CanvasTexture(c);const m=new T.Sprite(new T.SpriteMaterial({map:tex,depthTest:false,transparent:true}));m.position.set(x,1.8,-z);m.scale.set(1.6,.8,1);this.scene.add(m);this.floaters.push({m,life:.65});}
    event(e){if(e.type==='hit'){this.effect('hit',e.x,e.z,e.critical?'#ffe49a':'#ecedc3',4);this.floating(Math.round(e.damage).toString(),e.x,e.z,e.critical?'#ffe29b':'#fff8dd');}if(e.type==='kill')this.effect('kill',e.x,e.z,'#b6cd7e',14);if(e.type==='upgrade'){this.effect('upgrade',e.x,0,'#f7df87',24);this.floating('↑',e.x,0,'#fff1a5');}if(e.type==='damage'){this.shake=.23;this.effect('damage',e.x,0,'#cf9471',12);}if(e.type==='companion'){if(e.kind==='dog')this.dogLunge=.4;else this.swordLunge=.4;this.companionTarget={x:e.x,z:e.z};}if(e.type==='coin')this.effect('coin',e.x||0,e.z||0,'#f1d178',3);if(e.type==='shield')this.effect('upgrade',e.x,0,'#bce6de',20);}
    render(game,dt){
      this.time+=dt;const menu=game.state==='menu',moving=game.state==='running'||game.state==='boss';this.menuBlend+=(Number(menu)-this.menuBlend)*Math.min(1,dt*3);
      const blend=this.menuBlend;this.camera.position.set(-6*blend,16-blend*1.5,18);const aspect=this.camera.aspect;if(aspect<.85){this.camera.position.y+=7;this.camera.position.z+=8;}this.camera.lookAt(-2.8*blend,0,-12-4*blend);if(this.shake>0){this.shake-=dt;this.camera.position.x+=(Math.random()-.5)*this.shake*.9;this.camera.position.y+=(Math.random()-.5)*this.shake*.6;}
      const speed=menu?1.5:moving&&game.state!=='boss'?12:0;this.scroll+=speed*dt;
      for(const m of [...this.scenery,...this.roadMarks]){m.position.z+=speed*dt;if(m.position.z>19)m.position.z-=142;}
      this.dust.rotation.y=Math.sin(this.time*.06)*.04;this.dust.position.z=(this.time*.3)%10;
      this.hero.position.set(menu?2.2:game.player.x,0,0);this.hero.rotation.z=moving?Math.sin(this.time*11)*.025:0;this.hero.userData.torso.position.y=Math.sin(this.time*(moving?15:2))*(moving?.045:.025);this.hero.userData.legs.forEach((l,i)=>l.rotation.x=moving||menu?Math.sin(this.time*(moving?15:4)+i*Math.PI)*.5:0);this.hero.visible=!(game.player.invulnerable>0&&Math.floor(this.time*15)%2===0);
      for(let i=0;i<this.demoEnemies.length;i++){this.demoEnemies[i].visible=menu;this.demoEnemies[i].position.y=Math.sin(this.time*3+i)*.06;}
      const active=new Set();this.syncEntities('enemy',game.enemies,active);this.syncEntities('arrow',game.projectiles,active);this.syncEntities('hostile',game.hostileProjectiles,active);this.syncEntities('obstacle',game.obstacles,active);this.syncEntities('gate',game.gates,active);this.syncEntities('coin',game.pickups,active);for(const [k,m]of this.entities)if(!active.has(k)){this.removeEntity(m);this.entities.delete(k);}
      const dogCount=menu?1:game.stats.dogs;while(this.dogs.length<dogCount){const d=this.makeDog();this.scene.add(d);this.dogs.push(d);}this.dogLunge=Math.max(0,this.dogLunge-dt);for(let i=0;i<this.dogs.length;i++){const d=this.dogs[i];d.visible=i<dogCount;const s=i%2?1:-1,baseX=this.hero.position.x+s*(1.15+Math.floor(i/2)*.5);const l=this.dogLunge>0?Math.sin(this.dogLunge/.4*Math.PI):0;d.position.set(baseX+(this.companionTarget?this.companionTarget.x-baseX:0)*l,Math.abs(Math.sin(this.time*13+i))*.12,-.5-l*Math.min(this.companionTarget?this.companionTarget.z:0,21));}
      while(this.swords.length<game.stats.swords){const s=this.makeSword();this.scene.add(s);this.swords.push(s);}this.swordLunge=Math.max(0,this.swordLunge-dt);for(let i=0;i<this.swords.length;i++){const s=this.swords[i];s.visible=i<game.stats.swords;const a=this.time*1.5+i*TAU/Math.max(game.stats.swords,1),l=this.swordLunge>0?Math.sin(this.swordLunge/.4*Math.PI):0;s.position.set(this.hero.position.x+Math.cos(a)*1.5,Math.sin(a*2)*.16,-Math.sin(a)*1.1-l*Math.min(this.companionTarget?this.companionTarget.z:0,30));s.rotation.y=-a;}
      for(let i=this.particles.length-1;i>=0;i--){const p=this.particles[i];p.life-=dt;p.vy-=9*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;p.m.scale.setScalar(Math.max(0,p.life/p.max));if(p.life<=0){this.scene.remove(p.m);this.particles.splice(i,1);}}
      for(let i=this.floaters.length-1;i>=0;i--){const f=this.floaters[i];f.life-=dt;f.m.position.y+=dt*1.5;f.m.material.opacity=Math.min(1,f.life*3);if(f.life<=0){this.removeEntity(f.m);this.floaters.splice(i,1);}}
      this.renderer.render(this.scene,this.camera);
    }
    dispose(){
      if(this.disposed)return;this.disposed=true;window.removeEventListener('resize',this.resize);
      const geometries=new Set([...Object.values(this.geometry),...Object.values(this.models)]),materials=new Set(Object.values(this.materials)),textures=new Set();
      this.scene.traverse(o=>{if(o.geometry&&!o.isSprite)geometries.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)materials.add(m);if(o.shadow&&o.shadow.map)o.shadow.map.dispose();});
      for(const m of materials)for(const value of Object.values(m))if(value&&value.isTexture)textures.add(value);
      textures.forEach(t=>t.dispose());materials.forEach(m=>m.dispose());geometries.forEach(g=>g.dispose());
      this.scene.clear();this.entities.clear();this.particles.length=0;this.floaters.length=0;this.scenery.length=0;this.roadMarks.length=0;this.dogs.length=0;this.swords.length=0;this.demoEnemies.length=0;this.materials={};this.geometry={};this.models={};this.renderer.dispose();this.renderer.domElement.remove();
    }
  }
  window.ForestRenderer=ForestRenderer;
})();
