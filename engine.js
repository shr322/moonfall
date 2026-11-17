(function(root){
'use strict';
const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const HEROES=[{id:'warden',name:'잿빛 기사',title:'THE WARDEN',desc:'월광검 · 강인한 생명력',tile:96,weapon:'blade',hp:125,speed:124,power:1,color:'#cfe2ae'},{id:'witch',name:'별의 마녀',title:'THE STARGAZER',desc:'별빛 탄환 · 빠른 시전',tile:84,weapon:'bolt',hp:90,speed:128,power:1,color:'#d5b4f1'},{id:'ranger',name:'황혼 추적자',title:'THE WAYFARER',desc:'회전 단검 · 날렵한 이동',tile:112,weapon:'orbit',hp:100,speed:148,power:1,color:'#addec3'}];
const WEAPONS={blade:{name:'월광검',icon:'☾',color:'#d8efaa',desc:'주변 적을 넓게 베어냅니다.',evolution:'만월의 심판'},bolt:{name:'별빛 탄환',icon:'✦',color:'#c7b9ff',desc:'가까운 적을 향해 별빛을 발사합니다.',evolution:'유성우'},orbit:{name:'회전 단검',icon:'✧',color:'#e7caa0',desc:'당신의 주위를 도는 칼날입니다.',evolution:'황혼의 톱니'},frost:{name:'서리 고리',icon:'❄',color:'#a5e8ea',desc:'냉기 파동으로 적을 느리게 합니다.',evolution:'영원의 겨울'},meteor:{name:'잿불',icon:'♨',color:'#f4ad7d',desc:'적이 있는 곳에 폭발을 일으킵니다.',evolution:'태양의 잔해'},lightning:{name:'낙뢰',icon:'ϟ',color:'#f3e9a0',desc:'여러 적에게 즉시 번개를 내립니다.',evolution:'천둥의 왕관'}};
const PASSIVES={power:{name:'힘의 룬',icon:'⚔',desc:'모든 피해량 +15%'},haste:{name:'시간의 모래',icon:'⌛',desc:'공격 재사용 시간 -8%'},speed:{name:'바람의 장화',icon:'➶',desc:'이동 속도 +10%'},magnet:{name:'영혼 자석',icon:'◈',desc:'경험치 수집 범위 +40%'},heart:{name:'생명의 씨앗',icon:'♡',desc:'최대 체력 +20, 체력 30 회복'}};
const ENEMIES={
 slime:{name:'숲의 망령',tile:108,size:32,color:'#81ddb1',hp:14,speed:42,r:11,damage:7,xp:1},
 bat:{name:'밤날개',tile:120,size:29,color:'#cba6e0',hp:9,speed:81,r:9,damage:6,xp:1},
 ghost:{name:'떠도는 영혼',tile:121,size:34,color:'#c5b5ed',hp:22,speed:47,r:11,damage:9,xp:2},
 skeleton:{name:'뼈의 군단',tile:124,size:32,color:'#ded5ad',hp:25,speed:55,r:11,damage:9,xp:2},
 brute:{name:'숲의 거인',tile:122,size:43,color:'#c99772',hp:62,speed:34,r:16,damage:14,xp:4},
 wolf:{name:'붉은 돌진자',tile:123,size:35,color:'#f5aa7b',hp:38,speed:68,r:12,damage:12,xp:3},
 cultist:{name:'밤의 주술사',tile:111,size:36,color:'#bf9be8',hp:44,speed:40,r:12,damage:10,xp:4},
 sentinel:{name:'철갑 파수병',tile:97,size:42,color:'#9cbccf',hp:85,speed:31,r:15,damage:17,xp:6,armor:.7},
 boss:{name:'숲의 수호자',tile:110,size:83,color:'#f19d9f',hp:350,speed:38,r:27,damage:25,xp:30}
};
// Pool weights change alongside spawn cadence, so each part of a run feels distinct.
const WAVES=[
 {at:0,name:'밤의 속삭임',interval:.72,batch:1,cap:45,pool:{slime:9,bat:1}},
 {at:30,name:'밤날개의 습격',interval:.48,batch:1,cap:70,pool:{slime:6,bat:5,ghost:1}},
 {at:60,name:'뼈의 행진',interval:.42,batch:2,cap:100,pool:{slime:3,bat:3,ghost:2,skeleton:6}},
 {at:90,name:'붉은 추격',interval:.34,batch:2,cap:135,pool:{slime:2,bat:3,ghost:2,skeleton:4,wolf:3}},
 {at:120,name:'거인의 발자국',interval:.30,batch:2,cap:170,pool:{bat:4,ghost:2,skeleton:5,wolf:3,brute:3}},
 {at:165,name:'금지된 의식',interval:.27,batch:3,cap:210,pool:{bat:4,ghost:3,skeleton:5,wolf:3,brute:3,cultist:2}},
 {at:210,name:'철갑 군단',interval:.24,batch:3,cap:250,pool:{bat:5,ghost:2,skeleton:6,wolf:4,brute:3,cultist:2,sentinel:3}},
 {at:255,name:'끝없는 포위',interval:.21,batch:4,cap:290,pool:{slime:2,bat:6,ghost:4,skeleton:7,wolf:4,brute:3,cultist:3,sentinel:3}},
 {at:300,name:'칠흑의 대행진',interval:.18,batch:4,cap:330,pool:{bat:7,ghost:4,skeleton:8,wolf:5,brute:4,cultist:3,sentinel:4}},
 {at:330,name:'마지막 밤',interval:.16,batch:4,cap:360,pool:{bat:7,ghost:5,skeleton:9,wolf:5,brute:4,cultist:3,sentinel:4}}
];
const MAX_ENEMIES=363,MAX_PROJECTILES=256,MAX_HOSTILE_PROJECTILES=144;
class Game{
 constructor(hero='warden',meta={},rng=Math.random,stage='grove'){this.rng=rng;this.stage=['grove','crypt','ember'].includes(stage)?stage:'grove';this.waveIndex=0;this.spawnedTypes=new Set();this.hero=HEROES.find(h=>h.id===hero)||HEROES[0];this.time=0;this.status='playing';this.kills=0;this.coins=0;this.level=1;this.xp=0;this.need=6;this.enemies=[];this.gems=[];this.projectiles=[];this.effects=[];this.numbers=[];this.events=[];this.spawnClock=0;this.sequence=1;this.bosses=new Set();this.finalDead=false;this.passives={power:0,haste:0,speed:0,magnet:0,heart:0};this.meta={power:clamp(Number(meta.power)||0,0,5),heart:clamp(Number(meta.heart)||0,0,5),magnet:clamp(Number(meta.magnet)||0,0,5)};this.weapons={[this.hero.weapon]:1};this.cooldowns={};this.p={x:0,y:0,hp:this.hero.hp+this.meta.heart*10,maxHp:this.hero.hp+this.meta.heart*10,invuln:0,face:1,moving:0};this.choices=[];this.orbitTick=0;this.hitFlash=0;this.chestCount=0;this.lastAim={x:1,y:0};}
 random(a,b){return a+this.rng()*(b-a)}
 power(){return (1+this.passives.power*.15+this.meta.power*.06)*this.hero.power}
 event(type,data={}){this.events.push({type,...data});if(this.events.length>60)this.events.shift()}
 nearest(x=this.p.x,y=this.p.y){let target=null,min=Infinity;for(const e of this.enemies){if(e.hp<=0)continue;const d=(e.x-x)**2+(e.y-y)**2;if(d<min){min=d;target=e}}return target}
 get wave(){return WAVES[this.waveIndex]}
 enemyType(){const weights={...this.wave.pool};if(this.stage==='crypt'){if(weights.skeleton)weights.skeleton*=1.5;if(weights.ghost)weights.ghost*=1.4}if(this.stage==='ember'){if(weights.wolf)weights.wolf*=1.4;if(weights.cultist)weights.cultist*=1.5}let roll=this.rng()*Object.values(weights).reduce((a,b)=>a+b,0);for(const [type,weight] of Object.entries(weights)){roll-=weight;if(roll<=0)return type}return 'slime'}
 spawn(boss=false,final=false,forcedType=null){
  // Normal enemies leave three slots reserved for scheduled bosses.
  if(this.enemies.length>=(boss?MAX_ENEMIES:this.wave.cap))return null;
  const a=this.random(0,TAU),r=boss?380:this.random(360,510),tier=Math.floor(this.time/75),type=boss?'boss':forcedType&&ENEMIES[forcedType]&&forcedType!=='boss'?forcedType:this.enemyType(),def=ENEMIES[type];
  const elite=!boss&&type!=='bat'&&this.time>=135&&this.rng()<Math.min(.14,.04+(this.time-135)/2000);
  let hp=def.hp*(1+this.time/220)*(elite?1.8:1);if(final)hp=1800;
  const e={id:this.sequence++,type,x:this.p.x+Math.cos(a)*r,y:this.p.y+Math.sin(a)*r,hp,maxHp:hp,r:def.r*(elite?1.18:1),speed:def.speed*(1+this.time/1200)*(elite?1.08:1),damage:(def.damage+tier)*(elite?1.3:1),phase:this.random(0,TAU),hit:0,slow:0,final,elite,shoot:this.random(2.4,4.5),chargeCooldown:this.random(2.5,4.5),telegraph:0,dash:0,dashAngle:0};
  this.enemies.push(e);this.spawnedTypes.add(type);return e;
 }
 hostileBullet(x,y,angle,speed=108,r=5,color='#dca2ef',damage=10){if(this.projectiles.length>=MAX_PROJECTILES||this.projectiles.filter(b=>b.hostile).length>=MAX_HOSTILE_PROJECTILES)return;this.projectiles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:5,r,hostile:true,color,damage})}
 updateEnemy(e,dt){
  const p=this.p;let dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
  e.hit=Math.max(0,e.hit-dt);e.slow=Math.max(0,e.slow-dt);const slow=e.slow>0?.4:1;
  let vx=dx/d,vy=dy/d,moveSpeed=e.speed;
  if(e.type==='wolf'){
   e.chargeCooldown-=dt;
   if(e.telegraph>0){e.telegraph-=dt;moveSpeed=0;if(e.telegraph<=0)e.dash=.48}
   else if(e.dash>0){e.dash-=dt;vx=Math.cos(e.dashAngle);vy=Math.sin(e.dashAngle);moveSpeed=325}
   else if(e.chargeCooldown<=0&&d<255&&d>65){e.chargeCooldown=5.3;e.telegraph=.68;e.dashAngle=Math.atan2(dy,dx);moveSpeed=0;this.fx('dashWarning',e.x,e.y,.68,{angle:e.dashAngle,r:165,color:'#ffb47e'})}
  }else if(e.type==='bat'){
   const weave=Math.sin(this.time*5+e.phase)*.4;vx=(dx/d-dy/d*weave)/Math.hypot(1,weave);vy=(dy/d+dx/d*weave)/Math.hypot(1,weave);
  }else if(e.type==='cultist'){
   if(d<145){vx=-vx;vy=-vy;moveSpeed*=.65}else if(d<220)moveSpeed=0;
   e.shoot-=dt;if(e.shoot<=0&&d<420){e.shoot=e.elite?3.3:4.7;const a=Math.atan2(dy,dx);this.hostileBullet(e.x,e.y-9,a,105,5,'#d7a4ef',10);if(e.elite){this.hostileBullet(e.x,e.y-9,a-.22,100,4,'#d7a4ef',10);this.hostileBullet(e.x,e.y-9,a+.22,100,4,'#d7a4ef',10)}}
  }
  e.x+=vx*moveSpeed*slow*dt;e.y+=vy*moveSpeed*slow*dt;
  if(dist(e,p)<e.r+10)this.hitPlayer(e.damage);
  if(e.type==='boss'){
   e.shoot-=dt;if(e.shoot<=0){e.shoot=e.final?2.5:4;for(let i=0;i<8;i++)this.hostileBullet(e.x,e.y,i*TAU/8+this.time*.2,100,7,'#ed8f93',12)}
  }else if(d>850){const a=this.random(0,TAU);e.x=p.x+Math.cos(a)*500;e.y=p.y+Math.sin(a)*500;e.telegraph=0;e.dash=0}
 }

 damage(e,n,kx=0,ky=0){if(e.hp<=0)return;const armor=ENEMIES[e.type]?.armor||1;n*=armor;kx*=armor;ky*=armor;e.hp-=n;e.hit=.13;e.x+=kx;e.y+=ky;if(this.effects.length<150)this.fx('impact',e.x,e.y-15,.16,{r:e.elite?15:9,color:ENEMIES[e.type]?.color||'#e6eac3',seed:e.id});if(this.numbers.length<60)this.numbers.push({x:e.x,y:e.y-14,text:Math.round(n),life:.65,color:'#f1e5c4'});if(e.hp<=0){this.kills++;this.coins+=e.type==='boss'?25:e.elite?4:this.rng()<.18?1:0;this.gems.push({x:e.x,y:e.y,value:(ENEMIES[e.type]?.xp||1)*(e.elite?3:1),kind:'xp'});if(this.rng()<.025)this.gems.push({x:e.x+10,y:e.y,kind:'heal',value:20});if(e.type==='boss'){this.gems.push({x:e.x,y:e.y-15,kind:'chest',value:0});if(e.final)this.finalDead=true;this.event('bossKill')}this.effects.push({type:'death',x:e.x,y:e.y,life:.3,max:.3,color:e.type==='ghost'?'#b6a7d7':'#9fb88e',seed:e.id});}}
 hitPlayer(n){if(this.p.invuln>0||this.status!=='playing')return;this.p.hp=Math.max(0,this.p.hp-n);this.p.invuln=.75;this.hitFlash=.25;this.event('hurt');if(this.p.hp<=0){this.status='dead';this.event('end')}}
 fx(type,x,y,life,extra={}){this.effects.push({type,x,y,life,max:life,...extra})}
 attack(key){const lv=this.weapons[key],p=this.p,power=this.power(),target=this.nearest(),evolved=lv>=5;let cooldown=1;if(key==='blade'){cooldown=.95;const radius=65+lv*12;this.fx('slash',p.x,p.y,.28,{r:radius,color:WEAPONS[key].color,angle:target?Math.atan2(target.y-p.y,target.x-p.x):0,evolved});for(const e of this.enemies)if(dist(e,p)<radius+e.r){const a=Math.atan2(e.y-p.y,e.x-p.x);this.damage(e,(16+lv*9)*power,Math.cos(a)*15,Math.sin(a)*15)}}
 if(key==='bolt'){cooldown=this.hero.id==='witch'?.7:.85;if(target){const angle=Math.atan2(target.y-p.y,target.x-p.x),count=1+Math.floor(lv/2);for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.15;if(this.projectiles.length<MAX_PROJECTILES)this.projectiles.push({x:p.x,y:p.y-7,vx:Math.cos(a)*330,vy:Math.sin(a)*330,life:2,r:5,damage:(16+lv*8)*power,pierce:evolved?4:1+Math.floor(lv/3),hit:new Set(),color:'#c0b3ff',evolved})}this.event('cast')}}
 if(key==='frost'){cooldown=3;const radius=95+lv*18;this.fx('ring',p.x,p.y,.65,{r:radius,color:'#a5e8ea',evolved});for(const e of this.enemies)if(dist(e,p)<radius+e.r){e.slow=evolved?4:2.4;this.damage(e,(9+lv*7)*power)}}
 if(key==='meteor'){cooldown=2.4;if(target){const count=evolved?3:lv>=3?2:1;for(let i=0;i<count;i++){const e=i===0?target:this.enemies[Math.floor(this.rng()*this.enemies.length)];if(e&&e.hp>0)this.fx('warning',e.x,e.y,.65,{r:45+lv*9,damage:(25+lv*16)*power,color:'#ef9a69',explode:true,evolved})}}}
 if(key==='lightning'){cooldown=2.7;const targets=this.enemies.filter(e=>e.hp>0).sort((a,b)=>dist(a,p)-dist(b,p)).slice(0,evolved?9:1+lv);for(const e of targets){this.fx('lightning',e.x,e.y,.4,{color:'#f4eaa9',seed:e.id,evolved});this.damage(e,(22+lv*14)*power)}}
 this.cooldowns[key]=cooldown*Math.max(.45,1-this.passives.haste*.08);}
 offer(){this.level++;this.xp-=this.need;this.need=Math.floor(6+this.level*3.4);this.p.hp=Math.min(this.p.maxHp,this.p.hp+5);this.status='levelup';this.choices=[];let pool=[...Object.keys(WEAPONS).filter(k=>(this.weapons[k]||0)<5).map(k=>({kind:'weapon',key:k})),...Object.keys(PASSIVES).filter(k=>this.passives[k]<5).map(k=>({kind:'passive',key:k}))];for(let i=0;i<3&&pool.length;i++){const index=Math.floor(this.rng()*pool.length);this.choices.push(pool.splice(index,1)[0])}if(!this.choices.length)this.choices=[{kind:'heal',key:'heal'}];this.event('levelup')}
 choose(index){if(this.status!=='levelup'||!this.choices[index])return false;const c=this.choices[index];if(c.kind==='weapon'){this.weapons[c.key]=(this.weapons[c.key]||0)+1;this.cooldowns[c.key]=0;if(this.weapons[c.key]===5){this.event('evolve',{name:WEAPONS[c.key].evolution});this.fx('evolution',this.p.x,this.p.y,.8,{r:120,color:WEAPONS[c.key].color})}}else if(c.kind==='passive'){this.passives[c.key]++;if(c.key==='heart'){this.p.maxHp+=20;this.p.hp=Math.min(this.p.maxHp,this.p.hp+30)}}else this.p.hp=this.p.maxHp;this.status='playing';this.choices=[];if(this.xp>=this.need)this.offer();return true}
 chest(){this.chestCount++;this.coins+=15;this.p.hp=Math.min(this.p.maxHp,this.p.hp+25);const choices=Object.keys(this.weapons).filter(k=>this.weapons[k]<5);if(choices.length){const k=choices[Math.floor(this.rng()*choices.length)];this.weapons[k]++;if(this.weapons[k]===5){this.event('evolve',{name:WEAPONS[k].evolution});this.fx('evolution',this.p.x,this.p.y,.8,{r:120,color:WEAPONS[k].color})}this.event('chest',{name:this.weapons[k]>=5?WEAPONS[k].evolution:WEAPONS[k].name})}else this.event('chest',{name:'생명력과 황금'})}
 update(dt,input={x:0,y:0}){if(this.status!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;const p=this.p;p.invuln=Math.max(0,p.invuln-dt);this.hitFlash=Math.max(0,this.hitFlash-dt);let len=Math.hypot(input.x,input.y),mx=len?input.x/Math.max(1,len):0,my=len?input.y/Math.max(1,len):0;const speed=this.hero.speed*(1+this.passives.speed*.1);p.x+=mx*speed*dt;p.y+=my*speed*dt;p.moving=Math.hypot(mx,my);if(mx)p.face=Math.sign(mx);if(len)this.lastAim={x:mx,y:my};
 const nextWave=WAVES.reduce((index,w,i)=>this.time>=w.at?i:index,0);if(nextWave!==this.waveIndex){this.waveIndex=nextWave;this.event('wave',{index:nextWave,name:this.wave.name});this.spawnClock=0;const surge=Math.min(12+nextWave*3,this.wave.cap-this.enemies.length);for(let i=0;i<surge;i++)this.spawn(false,false,nextWave%2===1?'bat':nextWave>=2?'skeleton':'slime')}
 this.spawnClock-=dt;if(this.spawnClock<=0){this.spawnClock=this.wave.interval;for(let i=0;i<this.wave.batch;i++)this.spawn()}

 for(const t of [120,240,330])if(this.time>=t&&!this.bosses.has(t)){this.bosses.add(t);this.spawn(true,t===330);this.event('boss',{final:t===330})}
 for(const key of Object.keys(this.weapons)){if(key==='orbit')continue;this.cooldowns[key]=(this.cooldowns[key]||0)-dt;if(this.cooldowns[key]<=0)this.attack(key)}
 this.orbitTick-=dt;if(this.weapons.orbit&&this.orbitTick<=0){this.orbitTick=.17;const lv=this.weapons.orbit,count=lv>=5?7:lv+1;for(let i=0;i<count;i++){const a=this.time*2.5+i*TAU/count;const point={x:p.x+Math.cos(a)*(60+lv*5),y:p.y+Math.sin(a)*(60+lv*5)};for(const e of this.enemies)if(dist(point,e)<e.r+19)this.damage(e,(9+lv*5)*this.power())}}
 for(const e of this.enemies)if(e.hp>0)this.updateEnemy(e,dt);
 // Local grid separates crowds without an O(n²) pass.
 const grid=new Map();for(const e of this.enemies){if(e.hp<=0)continue;let gx=Math.floor(e.x/40),gy=Math.floor(e.y/40);for(let ox=-1;ox<=1;ox++)for(let oy=-1;oy<=1;oy++){for(const b of grid.get((gx+ox)+','+(gy+oy))||[]){const dx=e.x-b.x,dy=e.y-b.y,d=Math.hypot(dx,dy),min=(e.r+b.r)*.65;if(d>0&&d<min){let push=(min-d)*.4;e.x+=dx/d*push;e.y+=dy/d*push;b.x-=dx/d*push;b.y-=dy/d*push}}}const key=gx+','+gy;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(e)}
 for(const b of this.projectiles){b.life-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.hostile){if(dist(b,p)<b.r+10){this.hitPlayer(b.damage||12);b.life=0}}else for(const e of this.enemies)if(e.hp>0&&!b.hit.has(e.id)&&dist(e,b)<e.r+b.r){b.hit.add(e.id);this.damage(e,b.damage);if(--b.pierce<=0){b.life=0;break}}}
 for(const f of this.effects){f.life-=dt;if(f.explode&&f.life<=0){f.explode=false;this.fx('explosion',f.x,f.y,.45,{r:f.r,color:'#efac70',evolved:f.evolved});for(const e of this.enemies)if(dist(e,f)<f.r+e.r)this.damage(e,f.damage)}}
 const magnet=48*(1+this.passives.magnet*.4+this.meta.magnet*.15);for(const g of this.gems){const d=dist(g,p);if(d<(g.kind==='xp'?magnet:45)||g.pulled){g.pulled=true;let step=Math.min(d,dt*(230+Math.max(0,160-d)*3));g.x+=(p.x-g.x)/(d||1)*step;g.y+=(p.y-g.y)/(d||1)*step;if(d<15){g.taken=true;if(g.kind==='xp')this.xp+=g.value;else if(g.kind==='heal'){p.hp=Math.min(p.maxHp,p.hp+g.value);this.event('heal')}else this.chest()}}}
 for(const n of this.numbers){n.life-=dt;n.y-=dt*28}this.enemies=this.enemies.filter(e=>e.hp>0);this.projectiles=this.projectiles.filter(b=>b.life>0);this.effects=this.effects.filter(f=>f.life>0);if(this.effects.length>240){const important=this.effects.filter(f=>f.explode||f.type==='dashWarning');const slots=Math.max(0,240-important.length);this.effects=important.concat(slots?this.effects.filter(f=>!f.explode&&f.type!=='dashWarning').slice(-slots):[]);}this.numbers=this.numbers.filter(n=>n.life>0);this.gems=this.gems.filter(g=>!g.taken);
 // Merge experience drops without losing rewards; transient pickups have a strict budget.
 while(this.gems.length>450){const gem=this.gems.find(g=>g.kind==='xp');const idx=this.gems.findIndex(g=>g.kind==='xp'&&g!==gem);if(gem&&idx>=0){gem.value+=this.gems[idx].value;this.gems.splice(idx,1)}else{const heal=this.gems.findIndex(g=>g.kind==='heal');if(heal>=0)this.gems.splice(heal,1);else break}}

 if(this.status==='playing'){if(this.time>=360&&this.finalDead){this.status='won';this.event('end')}else if(this.xp>=this.need)this.offer()}
 }
}
const api={Game,HEROES,WEAPONS,PASSIVES,ENEMIES,WAVES,MAX_ENEMIES,MAX_PROJECTILES,MAX_HOSTILE_PROJECTILES,clamp,dist};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Moonfall=api;
})(typeof globalThis!=='undefined'?globalThis:this);
