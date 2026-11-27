import { T, cx, fsin, fcos } from './core.js';
import { eproj, foeBase, hurtFoe } from './foes.js';
import { clearLegend, legendStep } from './legend-duels.js';
import { DUELS } from './duels.js';
import { sense, predictX, choose, dodgeDir, windT, restT, steer } from './brain.js';

// Neue Fassung (enemyRevision 2): weniger Leben, dafür wählt das Boss-Gehirn die Attacke nach Lage,
// die Meister bewegen sich in den Pausen, halten ihren Lieblingsabstand und weichen Schaufel-Sprüngen aus.
export const DUEL_HP2 = { 'D-1': 60, 'D-2': 66, 'D-3': 62, 'D-4': 70, 'D-5': 84 };
const PREF = { 'D-1': 110, 'D-2': 90, 'D-3': 120, 'D-4': 100, 'D-5': 95 };
const clampX = (b, x) => Math.max(11 * T, Math.min(43 * T - b.w, x));
function weight(a, s, b, sig) {
  const ground = !s.air, d = s.dist;
  let w = 0.6;
  if (a === 'lunge' || a === 'return') w = (ground ? 1.4 : 0.5) * (d < 40 ? 0.5 : d > 190 ? 0.6 : 1);
  else if (a === 'fan') w = (d > 100 ? 1.3 : 0.6) + (s.air ? 0.3 : 0);
  else if (a === 'tide' || a === 'forge' || a === 'nova') w = ground ? 1.2 : 0.4;
  else if (a === 'undertow') w = (ground ? 0.8 : 0.4) + (d > 120 ? 0.8 : 0);
  else if (a === 'anchor') w = d > 60 && d < 170 ? 1.1 : 0.6;
  else if (a === 'chime' || a === 'echo') w = d < 110 ? 1.3 : 0.7;
  else if (['rain', 'meteor', 'record', 'palimpsest'].includes(a)) w = 0.9 + (ground && Math.abs(s.vx) < 0.6 ? 0.5 : 0) + (d > 140 ? 0.4 : 0);
  return w + (sig ? 0.3 : 0);
}
function think(g, b) {
  const s = sense(g, b);
  if (b.state === 'rest') {
    b.y = Math.min(11 * T - b.h, b.y + 2);
    const pref = PREF[b.design.id] || 100, want = s.dist < pref - 30 ? -1 : s.dist > pref + 40 ? 1 : 0;
    b.vx = steer(b.vx || 0, s.dir * want * 1.2 * s.A.speed, 0.15);
    const d = dodgeDir(g, b, s);
    if (d && !b.hopT) { b.vx = (b.x - 11 * T < 30 ? 1 : 43 * T - b.w - b.x < 30 ? -1 : d) * 3.2; b.hopT = b.hopN = 16; b.hopH = 20; g.ev('boing'); }
    // Fassung 3: steht der Held auf einem Sims, springt der Meister hinauf und wieder herab (wie der Held)
    else if (g.enemyRevision >= 3 && !b.hopT && s.ground && s.dy < -24 && s.dist < 160 && (b.jumpCd || 0) < g.frame && g.rand() < s.A.leap) {
      b.jumpCd = g.frame + 50; b.hopT = b.hopN = 30; b.hopH = Math.min(96, -s.dy + 18); b.vx = Math.max(-3.4, Math.min(3.4, (predictX(s, 15) - cx(b)) / 15)); g.ev('boing');
    }
    if (b.hopT > 0) { b.hopT--; b.y = 11 * T - b.h - Math.round(fsin(Math.PI * b.hopT / (b.hopN || 16)) * (b.hopH || 20)); if (b.hopT > (b.hopN || 16) / 2 && Math.abs(s.dx) < 8) b.vx *= 0.7; }
    b.x = clampX(b, b.x + b.vx);
  }
  if (--b.t > 0) return;
  b.vx = 0; b.hopT = 0; b.y = Math.min(b.y, 11 * T - b.h);
  const P = b.design.patterns, pool = b.phase === 1 ? P[0] : [...new Set([...P[1], ...P[0]])];
  const W = {}; for (const a of pool) W[a] = weight(a, s, b, b.phase === 2 && !P[0].includes(a));
  b.action = choose(g, b, W);
  const warn = windT(g, b.phase === 1 ? 46 : 36, 26);
  b.face = predictX(s, warn) < cx(b) ? -1 : 1;
  b.marks = []; b.state = 'warn'; b.t = warn;
  if (b.action === 'meteor' || b.action === 'rain') { const at = predictX(s, warn); b.marks = [at - 26, at, at + 26]; }
}

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
    if (b.legend) clearLegend(b);
    b.phase=2; b.state='roar'; b.t=55; b.cyc=0; b.marks=[];
    g.banner={text:b.design.second.toUpperCase(),sub:b.design.name,col:b.colors[2],t:82};
    g.burst(cx(b),b.y+10,26,'star',2.4); g.ev('bossStart');
  }
  if (b.legend) { legendStep(g,b); return; }
  if ((b.state==='roar' || b.state==='rest') && g.enemyRevision >= 2) return think(g,b);
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
  if (b.t>=52) { b.state='rest'; b.t=b.phase===1?55:38; b.marks=[]; if (g.enemyRevision >= 2) b.t=restT(g,b.t,24); }
}

export function duelBoss(index) {
  const design=DUELS[index], x=31*T, y=11*T-design.h;
  return foeBase({type:'duelist',design,colors:design.colors,x,y,w:design.w,h:design.h,home:{x,y},hp:design.hp,maxhp:design.hp,
    legend:['D-6','D-7'].includes(design.id),clock:0,dmg:3,face:-1,phase:1,cyc:0,marks:[],isChief:true,state:'idle',title:design.name.toUpperCase(),update,
    onWound(g,b) {
      if (design.id==='D-1' && b.phase===2 && b.state==='strike' && b.action==='return') {
        const gain=Math.min(5,b.maxhp-b.hp); b.hp+=gain;
        if (gain) g.num(cx(b),b.y-6,'+'+gain,b.colors[2]);
      }
    },
    hurtBy(g,b,damage,dir,source) {
      if (b.state==='idle' || b.state==='dying' || b.state==='roar') return;
      if (b.legend) { g.ev('clink'); return; }
      hurtFoe(g,b,b.state==='rest'?damage:Math.max(1,Math.floor(damage/(g.enemyRevision >= 2 ? 2 : 3))),dir,source);
    }});
}
