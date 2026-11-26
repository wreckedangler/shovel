import { T, cx, overlap, GRAV, MAXFALL } from './core.js';
import { hurtFoe } from './foes.js';

const floor = 11*T;
const rhythms = [157,181,193,211,229,251];
const platforms = [[16,9],[21,7],[26,9],[32,7],[37,9],[27,5]];
const active = b => b.state === 'weave' || b.state === 'mirror';

export function prepareLoom(g) {
  g.boss.hands = platforms.map(([tx,ty], i) => {
    const x = tx*T, y = ty*T;
    const hand = { x, y, ox:x, oy:y, w:48, h:8, dx:0, dy:0, age:-1, index:i, cut:false, needleX:x,
      update(world, pl) {
        const boss = world.boss;
        let target = pl.ox;
        if (boss.state === 'weave') {
          const distance = cx(boss) - (pl.ox + pl.w/2);
          if (pl.cut) target += distance * Math.min(1, (pl.age-pl.cutAt+1)/14);
          else if (pl.age >= 88 && pl.age < 126) target += Math.sign(distance)*Math.min(36,(pl.age-88)*3);
        }
        const speed = pl.cut ? 24 : 5;
        pl.dx = Math.max(-speed,Math.min(speed,target-pl.x));
        const targetY = pl.cut && boss.state==='weave' ? boss.y+12 : pl.oy;
        pl.dy = Math.max(-speed,Math.min(speed,targetY-pl.y)); pl.y += pl.dy;
        pl.x += pl.dx;
        if (pl.cut && !pl.landed && Math.abs(pl.x+pl.w/2-cx(boss)) < 24 && Math.abs(pl.y-boss.y-12)<12 && boss.state==='weave') {
          if (boss.iframe) return;
          pl.landed=true; pl.spent=true;
          hurtFoe(world,boss,boss.phase===1?36:18,0,'mask');
          world.burst(cx(boss),boss.y+12,20,'spark',2);
        }
      } };
    g.plats.push(hand);
    return hand;
  });
}
export function clearLegend(b) {
  b.echo=null; b.clock=0; b.stroke=0;
  for (const h of b.hands || []) Object.assign(h,{x:h.ox,y:h.oy,dy:0,dx:0,age:-1,cut:false,landed:false,spent:false});
}

function weave(g,b) {
  const count=b.phase===2?6:3;
  for (const h of b.hands.slice(0,count)) {
    if (h.spent && h.age<0) continue;
    if (h.age<0) {
      if ((b.clock+rhythms[h.index]-h.index*19)%rhythms[h.index]===0) {
        h.age=0; h.cut=false; h.landed=false;
      } else continue;
    }
    const start=cx(b), end=h.x+h.w/2, y=h.y-7;
    h.needleX=start+(end-start)*Math.min(1,Math.max(0,(h.age-26)/16));
    if (!h.cut) {
      if (h.age>=26 && h.age<43 && overlap(g.p,{x:h.needleX-5,y:y-2,w:10,h:4})) g.hurtPlayer(3,Math.sign(end-start));
      if (h.age>=88 && h.age<115 && overlap(g.p,{x:Math.min(start,end),y:y-1,w:Math.abs(start-end)+1,h:3})) g.hurtPlayer(4,Math.sign(end-start));
    }
    if (++h.age>=140) { h.age=-1; h.cut=false; }
  }
}
export function cutThread(g,box) {
  const b=g.boss;
  if (b?.state!=='weave') return;
  for (const h of b.hands) {
    if (h.age<44 || h.age>=88 || h.cut) continue;
    const knot={x:h.x+h.w/2-5,y:h.y-13,w:10,h:12};
    if (!overlap(box,knot)) continue;
    h.cut=true; h.cutAt=h.age; g.ev('clink'); g.burst(knot.x+5,knot.y+5,8,'spark',1.4);
  }
}
export function recordShadow(g,pogo) {
  const b=g.boss;
  if (b?.state!=='mirror' || (b.echo && b.echo.age>=19)) return;
  // Vor dem ersten Schlag kann die jÃ¼ngste Aktion das Echo ersetzen, danach steht sein Ziel fest.
  const p=g.p;
  b.echo={age:b.echo?.age || 0,pogo,face:p.face,x:cx(p),y:p.y+p.h};
}
export function shadowBox(e) {
  return e.pogo ? {x:e.x-17,y:e.y-12,w:34,h:Math.max(28,floor-e.y+12)} :
    {x:e.face>0?e.x:e.x-52,y:e.y-18,w:52,h:20};
}
function mirror(g,b) {
  const p=g.p, delta=cx(p)-cx(b);
  const cycle=b.clock%(b.phase===2?75:96);
  if (cycle<53) b.face=Math.sign(delta)||b.face;
  b.stroke=cycle>=53 && cycle<66 ? cycle-52 : 0;
  b.vx=b.stroke ? b.face*2.5 : Math.abs(delta)>9 ? b.face*1.45 : 0;
  if (b.onGround && (p.y+12<b.y || cycle===24)) b.vy=-5.6;
  b.vy=Math.min(MAXFALL,b.vy+GRAV);
  g.moveX(b); g.moveY(b);
  b.x=Math.max(11*T,Math.min(43*T-b.w,b.x));
  if (b.stroke && overlap(p,{x:b.face>0?b.x+b.w:b.x-16,y:b.y+4,w:16,h:9})) g.hurtPlayer(3,b.face);
  const e=b.echo;
  if (!e) return;
  e.age++;
  if (b.phase===1 && (e.age===19 || e.age===37)) g.ev('clink');
  if (e.age===46) {
    const hit=shadowBox(e);
    if (overlap(hit,p)) g.hurtPlayer(4,-e.face);
    if (e.pogo && overlap(hit,b) && !overlap(hit,p)) { hurtFoe(g,b,32,0,'shadow'); g.shake=5; }
  }
  if (e.age>=55) b.echo=null;
}
export function legendStep(g,b) {
  if (b.state==='roar') {
    if (--b.t<=0) { b.state=b.design.id==='D-6'?'weave':'mirror'; b.clock=0; }
    return;
  }
  if (!active(b)) return;
  if (b.state==='weave') weave(g,b); else mirror(g,b);
  b.clock++;
}
