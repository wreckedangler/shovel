import { T, cx, fsin, fcos } from './core.js';
import { eproj, foeBase, hurtFoe } from './foes.js';
import { DUELS } from './duels.js';

function volley(g,b,kind,speeds) {
  for (const [vx,vy] of speeds) {
    const p = eproj(cx(b), b.y+b.h/2, vx, vy, kind);
    p.dmg = b.phase === 2 ? 3 : 2; g.add(p);
  }
}
function wave(g,b) {
  for (const dir of [-1,1]) {
    const p = eproj(cx(b),11*T-10,dir*2.8,0,'shock'); p.dmg = 2; g.add(p);
  }
}
function ring(g,b,offset) {
  for (let i=0;i<10;i++) {
    const a = i*Math.PI/5+offset;
    const p = eproj(cx(b),b.y+8,0,0,'spore');
    p.vx = fcos(a)*1.8; p.vy = fsin(a)*1.8; p.dmg = 2; p.life = 100;
    p.update = (game,s) => {
      s.x += s.vx; s.y += s.vy;
      if (--s.life <= 0 || game.solid(Math.floor((s.x+3)/T),Math.floor((s.y+3)/T))) s.dead = true;
    };
    g.add(p);
  }
}
function impact(g,b) {
  for (const x of b.marks) {
    const p = eproj(x, T+1, 0, 4.8,'bolt'); p.dmg = 3; g.add(p);
  }
}
function strike(g,b,t) {
  const d = b.face;
  switch (b.action) {
    case 'return': case 'lunge':
      if (t<21) b.x += d*4.6;
      if (b.action==='return' && t>=32 && t<51) b.x -= d*5;
      break;
    case 'anchor':
      if (t===0 || t===20) volley(g,b,'gear',[[d*(t?2.8:1.5),-4]]);
      break;
    case 'undertow':
      if (t<28) { const v=g.p.vx; g.p.vx=Math.sign(cx(b)-cx(g.p))*1.1; g.moveX(g.p); g.p.vx=v; }
      if (t===28) wave(g,b);
      break;
    case 'forge': case 'nova':
      if (t===0) { b.y=11*T-b.h; wave(g,b); g.shake=4; }
      if (t===23 && b.action==='nova') ring(g,b,0.16);
      break;
    case 'tide': if (t===0 || t===32) wave(g,b); break;
    case 'chime': case 'echo':
      if (t===0 || (t===26 && b.action==='echo')) ring(g,b,t ? Math.PI/10 : 0);
      break;
    case 'palimpsest': case 'record': case 'rain': case 'meteor':
      if (t===0 || (b.action==='meteor' && t===24)) impact(g,b);
      break;
    case 'fan': if (t===0) volley(g,b,'spore',[[d*1.5,-4],[d*2,-2.2],[d*2.6,-1]]); break;
  }
  b.x = Math.max(11*T,Math.min(43*T-b.w,b.x));
}
function update(g,b) {
  if (b.iframe) b.iframe--; if (b.flash) b.flash--;
  if (b.state==='idle') return;
  if (b.state==='dying') {
    if (--b.t<=0) {
      b.dead=true; g.setGate('.'); g.dropGems(cx(b), b.y, 450);
      g.add({type:'goal',x:41*T,y:11*T-48,w:12,h:48}); g.ev('win2');
    }
    return;
  }
  if (g.p.dead) return;
  if (b.phase===1 && b.hp*2<=b.maxhp) {
    b.phase=2; b.state='roar'; b.t=55; b.cyc=0; b.marks=[];
    g.banner={text:b.design.second.toUpperCase(),sub:b.design.name,col:b.colors[2],t:82};
    g.burst(cx(b),b.y+10,26,'star',2.4); g.ev('bossStart');
  }
  if (b.state==='roar' || b.state==='rest') {
    if (b.state==='rest') b.y=Math.min(11*T-b.h,b.y+2);
    if (--b.t>0) return;
    const pattern=b.design.patterns[b.phase-1];
    b.action=pattern[b.cyc++ % pattern.length]; b.face=cx(g.p)<cx(b)?-1:1;
    b.marks=[]; b.state='warn'; b.t=b.phase===1?46:36;
    if (b.action==='meteor' || b.action==='rain') b.marks=[cx(g.p)-26,cx(g.p),cx(g.p)+26];
    return;
  }
  if (b.state==='warn') {
    if (b.design.id==='D-2' || b.design.id==='D-4') {
      const pace=b.design.id==='D-2'?0.7:1.25;
      b.x=Math.max(11*T,Math.min(43*T-b.w,b.x+b.face*pace));
    }
    if (b.action==='nova' || b.action==='forge') b.y=Math.max(11*T-b.h-22,b.y-1);
    if (b.design.id==='D-3') b.y=Math.max(11*T-b.h-37,b.y-1.5);
    if (b.action==='record' && b.t===25 || b.action==='palimpsest' && [30,20,10].includes(b.t)) b.marks.push(cx(g.p));
    if (--b.t<=0) { b.state='strike'; b.t=0; }
    return;
  }
  strike(g,b,b.t++);
  if (b.t>=52) { b.state='rest'; b.t=b.phase===1?55:38; b.marks=[]; }
}

export function duelBoss(index) {
  const design=DUELS[index], x=31*T, y=11*T-design.h;
  return foeBase({type:'duelist',design,colors:design.colors,x,y,w:design.w,h:design.h,home:{x,y},hp:design.hp,maxhp:design.hp,
    dmg:3,face:-1,phase:1,cyc:0,marks:[],isChief:true,state:'idle',title:design.name.toUpperCase(),update,
    onWound(g,b) {
      if (design.id==='D-1' && b.phase===2 && b.state==='strike' && b.action==='return') {
        const gain=Math.min(5,b.maxhp-b.hp); b.hp+=gain;
        if (gain) g.num(cx(b),b.y-6,'+'+gain,b.colors[2]);
      }
    },
    hurtBy(g,b,damage,dir,source) {
      if (b.state==='idle' || b.state==='dying' || b.state==='roar') return;
      hurtFoe(g,b,b.state==='rest'?damage:Math.max(1,Math.floor(damage/3)),dir,source);
    }});
}
