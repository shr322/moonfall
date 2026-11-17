/* MOONFALL effects: procedural Canvas art, no third-party dependencies or assets. */
(function(root){
  'use strict';
  const TAU=Math.PI*2;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const random=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n)};
  function circle(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU)}
  function line(c,x1,y1,x2,y2){c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()}
  function diamond(c,x,y,r,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();c.moveTo(0,-r);c.lineTo(r*.45,0);c.lineTo(0,r);c.lineTo(-r*.45,0);c.closePath();c.fill();c.restore()}
  function star(c,x,y,r,rotation=0){c.save();c.translate(x,y);c.rotate(rotation);c.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.23:r;c.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}c.closePath();c.fill();c.restore()}
  function spokes(c,r,count,rotation,inner){for(let i=0;i<count;i++){const a=i/count*TAU+rotation;line(c,Math.cos(a)*r*inner,Math.sin(a)*r*inner,Math.cos(a)*r,Math.sin(a)*r)}}
  function draw(c,f,helpers={}){
    if(!f||!Number.isFinite(f.x)||!Number.isFinite(f.y)||f.life<=0)return;
    const p=clamp(1-f.life/Math.max(.001,f.max||1),0,1),fade=1-p;
    const r=Math.max(1,Number.isFinite(f.r)?f.r:45),h=helpers.hash||random;
    const seed=Number.isFinite(f.seed)?f.seed:f.x*.01+f.y*.03;
    const reduced=!!helpers.reducedMotion,color=f.color||'#d4edb4';
    c.save();c.translate(f.x,f.y);c.lineCap='round';c.lineJoin='round';
    c.strokeStyle=color;c.fillStyle=color;c.globalAlpha=fade;c.lineWidth=2;
    if(f.type==='slash'){
      c.translate(0,-8);c.rotate((f.angle||0)+(reduced?0:p*2.3));
      // Three nested crescents retain a clear center around the player.
      for(let layer=0;layer<(f.evolved?4:3);layer++){
        const rr=r*(1-layer*.085),start=-2.05+layer*.15,end=1.7-layer*.1;
        c.globalAlpha=fade*(layer===0?.8:.25);c.strokeStyle=layer===0?'#f2ffda':color;
        c.lineWidth=layer===0?Math.max(1,7*fade):2;
        c.beginPath();c.arc(0,0,rr,start,end);c.stroke();
      }
      c.globalAlpha=fade*.14;c.fillStyle=color;c.beginPath();
      c.arc(0,0,r,-2,1.7);c.arc(0,0,r*.78,1.7,-2,true);c.closePath();c.fill();
      c.globalAlpha=fade*.8;c.fillStyle='#f0ffce';
      const count=reduced?4:f.evolved?15:9;
      for(let i=0;i<count;i++){
        const a=-2+i/count*3.7,rr=r*(.9+p*.22+h(seed,i)*.12);
        diamond(c,Math.cos(a)*rr,Math.sin(a)*rr,(2+h(seed+2,i)*3)*fade,a);
      }
      if(f.evolved){c.globalAlpha=fade*.25;c.lineWidth=1;circle(c,0,0,r*.6);c.stroke()}
    }else if(f.type==='ring'){
      const spread=reduced?.88:Math.sqrt(p),rr=r*spread;
      c.globalAlpha=fade*.55;c.lineWidth=3;circle(c,0,0,rr);c.stroke();
      c.globalAlpha=fade*.22;c.lineWidth=1;circle(c,0,0,rr*.82);c.stroke();
      circle(c,0,0,rr*1.05);c.stroke();
      c.fillStyle='#ddffff';c.globalAlpha=fade*.7;
      const count=reduced?8:f.evolved?24:16;
      for(let i=0;i<count;i++){
        const a=i/count*TAU+(reduced?0:p*.12),radius=rr*(.94+h(seed,i)*.09);
        diamond(c,Math.cos(a)*radius,Math.sin(a)*radius,3+fade*(f.evolved?10:6),a+Math.PI/2);
      }
      c.strokeStyle=color;c.lineWidth=1;c.globalAlpha=fade*.2;
      c.rotate(p*.1);spokes(c,rr*.75,6,0,.3);
      if(f.evolved){circle(c,0,0,r*.55);c.stroke();spokes(c,r*.55,12,p*.15,.9)}
    }else if(f.type==='warning'){
      // Meteor's targeting ring and trailing fire make the incoming hit readable.
      const hostile=!!f.hostile;
      c.strokeStyle=hostile?'#ff6c7e':color;c.fillStyle=hostile?'#ff6c7e':color;
      c.globalAlpha=.07+p*.07;circle(c,0,0,r);c.fill();
      c.globalAlpha=.6;c.lineWidth=1.5;circle(c,0,0,r);c.stroke();
      c.globalAlpha=.7;circle(c,0,0,r*(1-p));c.stroke();
      c.lineWidth=2;line(c,-8,0,8,0);line(c,0,-8,0,8);
      if(!hostile&&!reduced){
        const y=-180*(1-p),x=60*(1-p);
        c.strokeStyle='#f0a25c';c.lineWidth=8;c.globalAlpha=.17;line(c,x+26,y-70,x,y);
        c.strokeStyle='#ffd197';c.lineWidth=3;c.globalAlpha=.65;line(c,x+14,y-37,x,y);
        c.fillStyle='#fff2c5';c.globalAlpha=.85;diamond(c,x,y,5+p*4,-.35);
        c.fillStyle=color;c.globalAlpha=.55;
        for(let i=0;i<4;i++)diamond(c,x+8+i*5,y-15-i*12,2,-.35);
      }
    }else if(f.type==='explosion'){
      const spread=reduced?.85:1-Math.pow(1-p,3),rr=r*(.35+.65*spread);
      c.fillStyle=color;c.globalAlpha=.1*fade;circle(c,0,0,rr);c.fill();
      c.strokeStyle=color;c.globalAlpha=.7*fade;c.lineWidth=4*fade+1;circle(c,0,0,rr);c.stroke();
      c.strokeStyle='#fff1c6';c.globalAlpha=.5*fade;c.lineWidth=1;circle(c,0,0,rr*.82);c.stroke();
      c.fillStyle='#ffe5a2';const count=reduced?7:f.evolved?23:15;
      for(let i=0;i<count;i++){
        const a=i/count*TAU+h(seed,i)*.22,rr2=rr*(.6+h(seed+1,i)*.6);
        c.globalAlpha=fade*(.35+h(seed+3,i)*.4);
        diamond(c,Math.cos(a)*rr2,Math.sin(a)*rr2-p*14,2+4*fade,a);
      }
      if(p<.3){c.globalAlpha=(.3-p)*1.2;c.fillStyle='#fff7d7';star(c,0,0,15+25*p,p)}
    }else if(f.type==='lightning'){
      // Stable jagged paths prevent rapid random flashing from frame to frame.
      const height=f.height||200,steps=7;
      const trace=(width,alpha,stroke)=>{
        c.lineWidth=width;c.globalAlpha=alpha;c.strokeStyle=stroke;c.beginPath();c.moveTo(-18,-height);
        for(let i=1;i<steps;i++)c.lineTo((h(seed,i)-.5)*35,-height+i*height/steps);
        c.lineTo(0,0);c.stroke();
      };
      trace(9,fade*.15,color);trace(3,fade*.8,color);trace(1,fade,'#fffde7');
      if(!reduced){
        c.lineWidth=1;c.globalAlpha=fade*.6;c.strokeStyle=color;
        for(let i=2;i<6;i+=2){const x=(h(seed,i)-.5)*35,y=-height+i*height/steps,d=i%4?-1:1;c.beginPath();c.moveTo(x,y);c.lineTo(x+d*20,y+12);c.lineTo(x+d*12,y+31);c.lineTo(x+d*34,y+47);c.stroke()}
      }
      c.strokeStyle=color;c.lineWidth=1;c.globalAlpha=fade*.45;circle(c,0,0,9+p*29);c.stroke();
      c.fillStyle='#fff4c9';c.globalAlpha=fade*.8;star(c,0,0,8+10*fade,p);
    }else if(f.type==='dashWarning'||f.type==='chargeWarning'){
      const length=Math.max(30,f.length||f.len||f.r||130),width=f.width||12;
      c.rotate(f.angle||0);c.strokeStyle='#ff7e8a';c.fillStyle='#ff6276';
      c.globalAlpha=.1+p*.08;c.fillRect(0,-width/2,length,width);
      c.globalAlpha=.65;c.lineWidth=1.5;
      line(c,8,-width/2,length,-width/2);line(c,8,width/2,length,width/2);
      const count=Math.min(7,Math.ceil(length/28));
      for(let i=1;i<=count;i++){const x=i*length/(count+1);c.beginPath();c.moveTo(x-5,-5);c.lineTo(x,0);c.lineTo(x-5,5);c.stroke()}
      c.globalAlpha=.9;c.fillStyle='#ffd9dc';circle(c,0,0,3);c.fill();
    }else if(f.type==='impact'){
      c.globalAlpha=fade*.75;c.lineWidth=1.5;
      const size=6+p*13;spokes(c,size,reduced?4:6,seed,.55);
      c.fillStyle='#fff6dd';star(c,0,0,7*fade,seed);
    }else if(f.type==='evolution'){
      const radius=r*(reduced?.8:.3+p*.9);
      c.globalAlpha=fade*.5;c.strokeStyle=color;c.lineWidth=2;circle(c,0,0,radius);c.stroke();
      c.lineWidth=1;c.globalAlpha=fade*.3;circle(c,0,0,radius*.8);c.stroke();
      c.fillStyle='#f5ffca';c.globalAlpha=fade*.8;
      for(let i=0;i<(reduced?6:16);i++){const a=i/(reduced?6:16)*TAU+p*.3;star(c,Math.cos(a)*radius,Math.sin(a)*radius,3+3*fade,a)}
    }else if(f.type==='death'){
      c.fillStyle=color;
      for(let i=0;i<(reduced?3:7);i++){
        const a=h(seed,i)*TAU,rr=(reduced?.5:p)*(12+h(seed+1,i)*18);
        c.globalAlpha=fade*.6;
        diamond(c,Math.cos(a)*rr,Math.sin(a)*rr-12-p*8,1+2*fade,a);
      }
    }
    c.restore();
  }
  function projectile(c,b,t=0){
    if(!b||!Number.isFinite(b.x)||!Number.isFinite(b.y))return;
    c.save();const color=b.color||(b.hostile?'#ef8798':'#c3b6ff'),r=b.r||5;
    const speed=Math.hypot(b.vx||0,b.vy||0)||1,dx=(b.vx||0)/speed,dy=(b.vy||0)/speed;
    c.fillStyle=color;c.strokeStyle=color;c.lineCap='round';
    if(b.hostile){
      c.globalAlpha=.2;circle(c,b.x,b.y,r+3);c.fill();
      c.globalAlpha=.95;circle(c,b.x,b.y,r);c.fill();
      c.fillStyle='#ffdedc';circle(c,b.x-dx*r*.2,b.y-dy*r*.2,r*.4);c.fill();
    }else{
      c.lineWidth=r*2;c.globalAlpha=.12;line(c,b.x-dx*25,b.y-dy*25,b.x,b.y);
      c.lineWidth=2;c.globalAlpha=.65;line(c,b.x-dx*18,b.y-dy*18,b.x,b.y);
      c.fillStyle=color;c.globalAlpha=.25;star(c,b.x,b.y,r*2.2,t*2);
      c.globalAlpha=.95;c.fillStyle='#efeaff';star(c,b.x,b.y,r*1.2,t*2);
      c.fillStyle=color;c.globalAlpha=.6;diamond(c,b.x-dx*26,b.y-dy*26,2,t);
    }
    c.restore();
  }
  function orbit(c,x,y,angle,evolved=false,t=0){
    c.save();c.translate(x,y);c.rotate(angle);c.strokeStyle=evolved?'#f7dfa2':'#d3e4b4';
    c.lineWidth=evolved?3:2;c.globalAlpha=.35;c.beginPath();c.arc(0,0,14,-2.5,-.3);c.stroke();
    c.lineWidth=1;c.globalAlpha=.2;c.beginPath();c.arc(0,0,19,-2.5,-.6);c.stroke();
    c.fillStyle='#fff0c2';c.globalAlpha=.7;star(c,7,-12,evolved?4:2,t);
    c.restore();
  }
  const api={draw,projectile,orbit};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.MoonFX=api;
})(typeof globalThis!=='undefined'?globalThis:this);
