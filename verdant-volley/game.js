/* Verdant Volley — dependency-free game simulation.
 * new VolleyGame({onEvent:event=>{}, seed:123}); game.start();
 * reset({damage:0,health:0,fortune:0}) returns to menu; values are permanent levels.
 * update(seconds, horizontalInput[-1..1]=0, optionalWorldTargetX=null).
 * pause()/resume(); chooseUpgrade(id); continueEndless(); snapshot().
 * State: menu|running|paused|choice|boss|victory|defeat. stage 1..3 describes
 * the forest region; boss has phase 1..3. First boss arrives at 750m (~150s).
 * World axes: player z=0; forward is +z; arriving objects move toward zero.
 * Public arrays: enemies, projectiles (friendly), hostileProjectiles, obstacles,
 * gates [{id,z,left:{id,title,description,icon},right:{...}}], pickups.
 * player:{x,hp,maxHp,invulnerable,shield}; stats:{damage,rate,arrows,pierce,
 * crit,dogs,swords}; boss is also a member of enemies while alive.
 * Events are objects with type and associated x,z,amount,enemy,upgrade etc.
 * Rendering/sound/persistence belong to the consumer. No DOM access required.
 */
(function(root){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const CHOICES={
    multishot:{id:'multishot',title:'화살 +1',label:'화살 +1',description:'한 번에 발사하는 화살이 늘어납니다.',icon:'arrows',color:'#88d9f7'},
    rapid:{id:'rapid',title:'공격 속도 +20%',label:'공속 +20%',description:'화살을 더 빠르게 발사합니다.',icon:'bolt',color:'#f9d97d'},
    damage:{id:'damage',title:'공격력 +30%',label:'공격력 +30%',description:'모든 화살과 동료의 피해가 증가합니다.',icon:'sword',color:'#ffb594'},
    heal:{id:'heal',title:'생명력 회복',label:'생명력 +35',description:'생명력을 35 회복합니다.',icon:'heart',color:'#ed9fbc'},
    pierce:{id:'pierce',title:'관통 +1',label:'관통 +1',description:'화살이 적 하나를 더 관통합니다.',icon:'pierce',color:'#aca9f6'},
    crit:{id:'crit',title:'치명타 +12%',label:'치명타 +12%',description:'확률적으로 두 배의 피해를 줍니다.',icon:'star',color:'#ffe48d'},
    dog:{id:'dog',title:'늑대 동료',label:'늑대 +1',description:'동료가 적을 찾아 돌진합니다.',icon:'paw',color:'#e9cd98'},
    sword:{id:'sword',title:'떠도는 비검',label:'비검 +1',description:'마법 검이 가까운 적을 공격합니다.',icon:'sword',color:'#a9f1e0'},
    health:{id:'health',title:'최대 생명력 +25',label:'최대 체력 +25',description:'최대 생명력과 현재 생명력이 증가합니다.',icon:'heart',color:'#c5e9a4'},
    shield:{id:'shield',title:'수호의 축복',label:'보호막 +2',description:'다음 두 번의 피해를 막아 줍니다.',icon:'shield',color:'#a7d9ed'}
  };
  class VolleyGame{
    constructor(options={}){
      this.onEvent=typeof options.onEvent==='function'?options.onEvent:()=>{};
      this.initialSeed=(options.seed==null?Date.now():options.seed)>>>0;
      this._seed=this.initialSeed||1; this._serial=0; this.meta={};
      this.reset();
    }
    random(){let x=this._seed;x^=x<<13;x^=x>>>17;x^=x<<5;this._seed=x>>>0;return this._seed/4294967296;}
    emit(type,data={}){this.onEvent({type,...data});}
    setState(state){if(this.state!==state){this.state=state;this.emit('state',{state});}}
    reset(meta=this.meta){
      this.meta={damage:Math.max(0,Number(meta.damage)||0),health:Math.max(0,Number(meta.health)||0),fortune:Math.max(0,Number(meta.fortune)||0)};
      this._seed=this.initialSeed||1;this._serial=0;this.time=0;this.distance=0;this.stage=1;this.coins=0;this.kills=0;this.score=0;this.loop=0;
      this.player={x:0,hp:100+this.meta.health*15,maxHp:100+this.meta.health*15,invulnerable:0,shield:0};
      this.stats={damage:12*(1+this.meta.damage*.12),rate:2.8,arrows:1,pierce:0,crit:.05,dogs:0,swords:0};
      this.enemies=[];this.projectiles=[];this.hostileProjectiles=[];this.obstacles=[];this.gates=[];this.pickups=[];this.boss=null;this.choices=[];
      this._nextGate=60;this._spawnTimer=.7;this._obstacleTimer=11;this._shotTimer=.1;this._dogTimer=0;this._swordTimer=0;this._bossDistance=750;this._pendingReward=false;
      this.upgrades=[];this.setState('menu');return this;
    }
    start(){if(['menu','defeat','victory'].includes(this.state)){if(this.state!=='menu')this.reset();this.setState('running');}return this;}
    pause(){if(this.state==='running'||this.state==='boss'){this._beforePause=this.state;this.setState('paused');}}
    resume(){if(this.state==='paused')this.setState(this._beforePause||'running');}
    chooseUpgrade(id){if(this.state!=='choice'||!this.choices.some(u=>u.id===id))return false;this.applyUpgrade(id);this.choices=[];this.setState('running');return true;}
    continueEndless(){
      if(this.state!=='victory')return false;
      this.loop++;this._bossDistance=this.distance+500;this._nextGate=this.distance+45;this._spawnTimer=2;this._obstacleTimer=8;
      this.player.hp=Math.min(this.player.maxHp,this.player.hp+50);this.player.invulnerable=2;this.boss=null;this.enemies=[];this.hostileProjectiles=[];
      this.choices=this.pickUpgrades(3);this.setState('choice');this.emit('choice',{choices:this.choices});return true;
    }
    upgrade(id){return {...CHOICES[id]};}
    pickUpgrades(count=2){
      let ids=['multishot','rapid','damage','pierce','crit','dog','sword','health','shield'];
      if(this.player.hp<this.player.maxHp*.72)ids.push('heal','heal');
      ids=ids.filter(id=>!(id==='multishot'&&this.stats.arrows>=7)&&!(id==='rapid'&&this.stats.rate>=8)&&!(id==='pierce'&&this.stats.pierce>=4)&&!(id==='crit'&&this.stats.crit>=.8)&&!(id==='dog'&&this.stats.dogs>=3)&&!(id==='sword'&&this.stats.swords>=4));
      const result=[];for(let i=0;i<count;i++){let id=ids[Math.floor(this.random()*ids.length)];result.push(this.upgrade(id));ids=ids.filter(x=>x!==id);}return result;
    }
    applyUpgrade(id){
      if(!CHOICES[id])return false;
      const s=this.stats,p=this.player;
      switch(id){case'multishot':s.arrows=Math.min(7,s.arrows+1);break;case'rapid':s.rate=Math.min(8,s.rate*1.2);break;case'damage':s.damage*=1.3;break;case'heal':p.hp=Math.min(p.maxHp,p.hp+35);break;case'pierce':s.pierce=Math.min(4,s.pierce+1);break;case'crit':s.crit=Math.min(.85,s.crit+.12);break;case'dog':s.dogs=Math.min(3,s.dogs+1);break;case'sword':s.swords=Math.min(4,s.swords+1);break;case'health':p.maxHp+=25;p.hp+=25;break;case'shield':p.shield+=2;break;}
      this.upgrades.push(id);this.emit('upgrade',{upgrade:this.upgrade(id),id,x:p.x,z:0});return true;
    }
    id(){return ++this._serial;}
    spawnEnemy(type,x,z=60){
      const scale=1+(this.stage-1)*.45+this.loop*.75;
      const specs={slime:[18,1.2,.57,3],goblin:[30,2.3,.57,5],brute:[74,.8,.9,10],archer:[30,1,.57,7]};
      const a=specs[type]||specs.slime;
      const e={id:this.id(),type,x,z,hp:a[0]*scale,maxHp:a[0]*scale,speed:a[1],radius:a[2],reward:a[3],age:0,attackTimer:1.8+this.random()*1.5,hit:0};
      this.enemies.push(e);return e;
    }
    spawnWave(){
      const lanes=[-3.3,-1.65,0,1.65,3.3];const n=this.random();let count=this.stage===1?(n<.68?1:2):(n<.35?2:3);
      for(let i=0;i<count;i++){
        const pick=Math.floor(this.random()*lanes.length),x=lanes.splice(pick,1)[0];
        const roll=this.random();let type=roll<.48?'slime':roll<.82?'goblin':this.stage>1&&roll<.93?'archer':'brute';
        this.spawnEnemy(type,x,56+i*2.5);
      }
    }
    spawnBoss(){
      this.enemies=[];this.obstacles=[];this.gates=[];this.hostileProjectiles=[];this.projectiles=[];
      const hp=4800*(1+this.loop*.9);this.boss={id:this.id(),type:'boss',x:0,z:32,hp,maxHp:hp,speed:0,radius:1.7,reward:180,age:0,attackTimer:2.8,phase:1,hit:0};
      this.enemies.push(this.boss);this.player.hp=Math.min(this.player.maxHp,this.player.hp+25);this.player.invulnerable=2;
      this.setState('boss');this.emit('boss',{boss:this.boss});
    }
    fire(){
      const s=this.stats;for(let i=0;i<s.arrows;i++){
        const offset=(i-(s.arrows-1)/2)*.34,critical=this.random()<s.crit;
        this.projectiles.push({id:this.id(),x:this.player.x+offset,z:.7,vx:offset*.16,vz:47,damage:s.damage*(critical?2:1),kind:'arrow',critical,pierce:s.pierce,hits:[],life:2.2});
      }this.emit('shoot',{x:this.player.x,z:.7,count:s.arrows});
    }
    nearestEnemy(maxZ=45){let best=null,bestD=Infinity;for(const e of this.enemies){if(e.hp<=0||e.z<1||e.z>maxZ)continue;const d=e.z+Math.abs(e.x-this.player.x)*3;if(d<bestD){best=e;bestD=d;}}return best;}
    companionAttack(kind,count){
      const target=this.nearestEnemy(kind==='dog'?22:40);if(!target)return;
      const damage=this.stats.damage*(kind==='dog'?1.4:1.1)*count;
      this.emit('companion',{kind,count,fromX:this.player.x,fromZ:1,x:target.x,z:target.z,targetId:target.id});this.hitEnemy(target,damage,kind,false);
    }
    hitEnemy(e,damage,kind='arrow',critical=false){
      if(e.hp<=0)return;e.hp-=damage;e.hit=.13;this.emit('hit',{x:e.x,z:e.z,damage,critical,kind,enemyId:e.id});
      if(e.hp<=0){
        this.kills++;this.score+=e.type==='boss'?1000:e.reward*10;const amount=Math.round(e.reward*(1+this.meta.fortune*.15));
        this.pickups.push({id:this.id(),x:e.x,z:e.z,amount,age:0});this.emit('kill',{enemy:e,x:e.x,z:e.z,amount});
        if(e.type==='boss'){
          this.coins+=this.pickups.filter(c=>!c.collected).reduce((sum,c)=>sum+c.amount,0);this.pickups=[];this.enemies=[];this.projectiles=[];this.hostileProjectiles=[];this.score+=Math.floor(this.distance);this.setState('victory');this.emit('victory',{coins:this.coins,kills:this.kills,distance:this.distance,score:this.score});
        }
      }
    }
    hurt(amount,x=this.player.x,z=0){
      const p=this.player;if(p.invulnerable>0||!['running','boss'].includes(this.state))return false;
      if(p.shield>0){p.shield--;p.invulnerable=1;this.emit('shield',{x:p.x,z:0});return false;}
      p.hp=Math.max(0,p.hp-amount);p.invulnerable=1.2;this.emit('damage',{amount,x,z,hp:p.hp});
      if(p.hp<=0){this.setState('defeat');this.emit('defeat',{coins:this.coins,kills:this.kills,distance:this.distance,score:this.score});}return true;
    }
    fireHostile(e,angle=0,speed=16){
      const dx=this.player.x-e.x, dz=-e.z,len=Math.hypot(dx,dz)||1;
      const a=Math.atan2(dx,dz)+angle;
      this.hostileProjectiles.push({id:this.id(),x:e.x,z:e.z-.9,vx:Math.sin(a)*speed,vz:Math.cos(a)*speed,radius:e.type==='boss'?.28:.19,damage:e.type==='boss'?14:10,kind:e.type==='boss'?'orb':'thorn',life:8});
    }
    update(dt,inputX=0,targetX=null){
      if(!['running','boss'].includes(this.state))return;
      dt=clamp(Number(dt)||0,0,.1);if(!dt)return;
      // Small substeps preserve collisions and gate crossings at irregular frame rates.
      const count=Math.ceil(dt/.025),step=dt/count;for(let i=0;i<count;i++){if(!['running','boss'].includes(this.state))break;this.step(step,inputX,targetX);}
    }
    step(dt,inputX,targetX){
      this.time+=dt;const p=this.player;p.invulnerable=Math.max(0,p.invulnerable-dt);
      const movement=targetX==null?clamp(Number(inputX)||0,-1,1)*9:clamp((clamp(targetX,-4.35,4.35)-p.x)*13,-12,12);
      p.x=clamp(p.x+movement*dt,-4.35,4.35);
      const scroll=12,travel=scroll*dt;
      if(this.state==='running'){
        this.distance+=5*dt;
        const stage=this.distance>=500?3:this.distance>=250?2:1;if(stage!==this.stage){this.stage=stage;this.emit('stage',{stage});}
        if(this.distance>=this._bossDistance){this.spawnBoss();return;}
        this._spawnTimer-=dt;if(this._spawnTimer<=0){this.spawnWave();this._spawnTimer=Math.max(1.25,2.8-this.stage*.25-this.loop*.15)+this.random()*.55;}
        this._obstacleTimer-=dt;if(this._obstacleTimer<=0){const x=(Math.floor(this.random()*3)-1)*2.8;this.obstacles.push({id:this.id(),type:'rock',x,z:65,radius:.75});this._obstacleTimer=9+this.random()*7;}
        if(this.distance>=this._nextGate-25&&this._nextGate<this._bossDistance-15){
          const pair=this.pickUpgrades(2);this.gates.push({id:this.id(),z:(this._nextGate-this.distance)*2.4,left:pair[0],right:pair[1]});this._nextGate+=70;
          this.emit('gateAhead',{left:pair[0],right:pair[1]});
        }
        for(const g of this.gates){g.z-=travel;if(g.z<=0&&!g.used){g.used=true;const chosen=p.x<=0?g.left:g.right;this.applyUpgrade(chosen.id);this.emit('gate',{upgrade:chosen,x:p.x,z:0});}}
        this.gates=this.gates.filter(g=>g.z>-6);
      }
      this._shotTimer-=dt;if(this._shotTimer<=0){this.fire();this._shotTimer+=1/this.stats.rate;}
      this._dogTimer-=dt;if(this.stats.dogs&&this._dogTimer<=0){this.companionAttack('dog',this.stats.dogs);this._dogTimer=1.5;if(!['running','boss'].includes(this.state))return;}
      this._swordTimer-=dt;if(this.stats.swords&&this._swordTimer<=0){this.companionAttack('sword',this.stats.swords);this._swordTimer=1.15;if(!['running','boss'].includes(this.state))return;}
      for(const e of this.enemies){
        if(e.hp<=0)continue;e.age+=dt;e.hit=Math.max(0,e.hit-dt);
        if(e.type==='boss'){
          const phase=e.hp>e.maxHp*.67?1:e.hp>e.maxHp*.34?2:3;
          if(phase!==e.phase){e.phase=phase;e.attackTimer=.9;this.emit('bossPhase',{phase});}
          e.x=Math.sin(e.age*(.38+phase*.07))*2.7;e.z=29+Math.sin(e.age*.55)*2;
          e.attackTimer-=dt;if(e.attackTimer<=0){
            const n=phase===1?3:phase===2?5:7;for(let i=0;i<n;i++)this.fireHostile(e,(i-(n-1)/2)*.095,14+phase*1.5);
            this.emit('bossAttack',{phase,x:e.x,z:e.z});e.attackTimer=phase===1?2.6:phase===2?2.1:1.7;
            if(phase>=2&&this.enemies.length<5&&this.random()<.6)this.spawnEnemy('slime',this.random()<.5?-3.5:3.5,40);
          }
        }else{
          e.z-=(scroll+e.speed)*dt;
          if(e.type==='goblin')e.x+=Math.sin(e.age*2+e.id)*.2*dt;
          if(e.type==='archer'&&e.z>12&&e.z<43){e.attackTimer-=dt;if(e.attackTimer<=0){this.fireHostile(e);e.attackTimer=2.5;}}
          if(e.z<.8&&e.z>-.7&&Math.abs(e.x-p.x)<e.radius+.4){this.hurt(e.type==='brute'?24:14,e.x,e.z);e.z=-3;if(this.state==='defeat')return;}
        }
      }
      for(const b of this.projectiles){
        const oldZ=b.z;b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;
        for(const e of this.enemies){
          if(e.hp<=0||b.hits.includes(e.id)||b.life<=0)continue;
          if(Math.abs(b.x-e.x)<e.radius+.11&&oldZ<=e.z+e.radius&&b.z>=e.z-e.radius){
            b.hits.push(e.id);this.hitEnemy(e,b.damage,b.kind,b.critical);if(b.hits.length>b.pierce)b.life=0;if(this.state==='victory')return;
          }
        }
      }
      for(const b of this.hostileProjectiles){const oldZ=b.z;b.x+=b.vx*dt;b.z+=b.vz*dt;b.life-=dt;if(oldZ>.45&&b.z<=.45&&b.z>-.9&&Math.abs(b.x-p.x)<b.radius+.36){this.hurt(b.damage,b.x,b.z);b.life=0;if(this.state==='defeat')return;}}
      for(const o of this.obstacles){o.z-=travel;if(o.z<.75&&o.z>-.75&&Math.abs(o.x-p.x)<o.radius+.34){this.hurt(18,o.x,o.z);o.z=-3;if(this.state==='defeat')return;}}
      for(const c of this.pickups){
        c.age+=dt;c.z-=travel;const attract=c.z<13||c.age>1.4;
        if(attract){c.x+=(p.x-c.x)*Math.min(1,dt*5);c.z-=dt*17;}
        if(c.z<1&&!c.collected){c.collected=true;this.coins+=c.amount;this.emit('coin',{amount:c.amount,x:c.x,z:0,total:this.coins});}
      }
      this.enemies=this.enemies.filter(e=>e.hp>0&&e.z>-5);
      this.projectiles=this.projectiles.filter(b=>b.life>0&&b.z<85);
      this.hostileProjectiles=this.hostileProjectiles.filter(b=>b.life>0&&b.z>-4&&Math.abs(b.x)<15);
      this.obstacles=this.obstacles.filter(o=>o.z>-5);
      this.pickups=this.pickups.filter(c=>!c.collected);
    }
    snapshot(){return {state:this.state,time:this.time,distance:this.distance,stage:this.stage,coins:this.coins,kills:this.kills,score:this.score,player:{...this.player},stats:{...this.stats},loop:this.loop,boss:this.boss?{...this.boss}:null,enemies:this.enemies.map(e=>({...e})),gates:this.gates.map(g=>({...g})),upgrades:[...this.upgrades]};}
  }
  VolleyGame.UPGRADES=CHOICES;root.VolleyGame=VolleyGame;
  if(typeof module!=='undefined'&&module.exports)module.exports=VolleyGame;
})(typeof window!=='undefined'?window:globalThis);
