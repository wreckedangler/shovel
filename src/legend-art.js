import { shadowBox } from './legend-duels.js';
export function drawLegend(ctx,b,frame) {
  if (b.design.id==='D-6') {
    for (const h of b.hands || []) {
      if (h.age<0 || h.cut || b.state!=='weave') continue;
      const y=h.y-7, start=b.x+b.w/2, end=h.x+h.w/2, loose=h.age>=44 && h.age<88;
      ctx.save(); ctx.strokeStyle=loose?'#ffaf95':'#fa4055'; ctx.lineWidth=h.age>=88?2:1;
      ctx.beginPath(); ctx.moveTo(start,b.y+12+(h.index%3)*5);ctx.lineTo(start,y);
      if (h.age<26) ctx.setLineDash([2,5]);
      if (loose) ctx.quadraticCurveTo((start+end)/2,y+16,end,y);
      else ctx.lineTo(h.age<26 || h.age>=43 ?end:h.needleX,y);
      ctx.stroke();ctx.restore();
      ctx.fillStyle='#fff3d6';ctx.fillRect(h.needleX-6,y-1,12,2);
      if (loose) {ctx.strokeStyle='#ffd6a6';ctx.strokeRect(end-3,y-3,6,6);}
    }
    return;
  }
  const e=b.echo, x=b.x-17, y=b.y-44;
  // Der Zwerg wirft einen viel größeren Schatten, dessen Werkzeug unabhängig ausholt.
  ctx.save(); ctx.fillStyle='#201831';ctx.strokeStyle='#ac99cf';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x-3,y+11);ctx.lineTo(x-8,y-4);ctx.lineTo(x+5,y+2);
  ctx.lineTo(x+12,y-9);ctx.lineTo(x+18,y+2);ctx.lineTo(x+31,y-5);ctx.lineTo(x+28,y+14);
  ctx.lineTo(x+33,y+37);ctx.lineTo(x+23,y+55);ctx.lineTo(x+8,y+47);ctx.lineTo(x-10,y+56);ctx.lineTo(x-6,y+27);ctx.closePath();ctx.fill();ctx.stroke();
  const lift=e?Math.min(28,e.age*0.8):5;
  ctx.save();ctx.translate(x+22,y+23);ctx.rotate((lift-12)*0.06);ctx.fillRect(0,-4,20,7);
  ctx.fillRect(17,-21,3,30);ctx.fillRect(13,-25,11,9);ctx.restore();
  if (b.stroke) {ctx.fillStyle='#fff0cc';ctx.fillRect(b.face>0?b.x+b.w:b.x-16,b.y+5,16,3);}
  if (b.phase===1) {ctx.fillStyle='#e3bc52';ctx.fillRect(b.x+2,b.y-2,8,3);}
  if (e) {
    const r=shadowBox(e);
    ctx.strokeStyle=e.age<37?'#b19cc8':'#f3dfae';ctx.setLineDash(e.age<37?[2,4]:[]);
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    if (e.age>=46) {ctx.globalAlpha=0.7;ctx.fillStyle='#4d366e';ctx.fillRect(r.x,r.y,r.w,r.h);}
  }
  ctx.restore();
}
