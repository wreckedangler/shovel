import {Game} from '../src/game.js';
import {Renderer} from '../src/render.js';
import {setPieces,uniqueById} from '../src/armor.js';

const suits = [
  ['Laternenhelm','Rostbeil','rostbeil',['laternenhelm','soeldnerhemd','wanderermantel','eisenschienen']],
  ['Ornat der Glasrose','Rosenschliff','rosenschliff',setPieces('glasrose')],
  ['Lotse der Ebbe','Kielbrecher','kielbrecher',setPieces('ebbe')],
  ['Hofstaat eines Schattens','Elfenbein der Stille','elfenbein',setPieces('schatten')],
  ['Gegensonne','Sonnbruch',null,[]],
  ['Wandernde Kathedrale','Vesperblatt',null,[]],
];
// Anker pro gezeichneter Pose: Körpermitte und Bodenlinie in der jeweiligen Atlaszelle.
const anchors = [
  [[190,314],[170,315],[193,289],[157,314]],
  [[184,287],[166,284],[184,276],[152,287]],
  [[179,288],[166,286],[180,262],[151,287]],
  [[187,295],[175,287],[192,285],[158,295]],
  [[179,291],[166,288],[189,281],[153,289]],
  [[185,287],[168,285],[192,276],[154,286]]
];
// Hüftmitte (x) und Sohlenlinie (y) in den vier Zellen jeder Aktion.
// Die Waffenspitze darf den Bildschwerpunkt verschieben, ohne die Figur zu versetzen.
const runFeet=[
  [[191,292],[175,304],[175,304],[167,304]],
  [[182,273],[165,285],[166,286],[163,286]],
  [[180,263],[168,275],[170,275],[166,275]],
  [[196,275],[174,281],[175,273],[171,281]],
  [[184,277],[184,283],[185,280],[178,283]],
  [[185,271],[174,279],[178,276],[174,279]]
];
const swingFeet=[
  [[191,314],[165,314],[151,314],[154,314]],
  [[207,286],[166,286],[150,286],[151,286]],
  [[180,281],[157,280],[143,280],[149,280]],
  [[183,291],[148,291],[139,291],[143,291]],
  [[190,288],[158,287],[145,285],[148,287]],
  [[183,285],[144,285],[134,285],[139,285]]
];
const strideLength=[24,27,22,28,23,25];
const breathPeriod=[145,165,185,186,205,178];
const $=s=>document.querySelector(s);
const canvas=$('canvas'), ctx=canvas.getContext('2d');
const images=await Promise.all(['helden-a','helden-b','sternwarte','lauf-a','lauf-b','hieb-a','hieb-b'].map(async name=>{
  const img=new Image(); img.src=new URL(name+'.webp',import.meta.url); await img.decode(); return img;
})).catch(()=>{ $('#message').textContent='Die Spielgrafik konnte nicht laden. Bitte die Seite neu öffnen.';throw Error('Bild fehlt'); });
const rows=Array.from({length:13},()=>Array(72).fill('.'));
function put(x,y,s){for(const c of s) rows[y][x++]=c;}
for(let y=10;y<13;y++)rows[y].fill('#');
put(2,9,'P');put(7,9,'DD');put(11,9,'b');put(14,7,'===');put(15,6,'O');
put(18,9,'B');put(21,6,'====');put(22,5,'G');put(26,9,'C');put(29,9,'q');
put(32,8,'===');put(36,6,'====');put(37,5,'O');put(42,9,'f');put(46,9,'h');
put(49,9,'DDD');put(53,9,'B');put(55,6,'====');put(57,5,'O');put(61,9,'b');put(67,9,'E');
const level={id:'V-1',name:'Die versunkene Sternwarte',theme:'wald',map:rows.map(r=>r.join('')),signs:[],par:60};
const select=$('#suit');
suits.forEach(([s,w],i)=>select.add(new Option(s+' · '+w,i)));
let current=4,game,until=0,renderer;
function message(s,t=1800){$('#message').textContent=s;until=performance.now()+t;}
function start(i,keep=false){
  const old=game;
  current=i;select.value=String(i);
  const gear={armor:0,shovel:2,weapon:suits[i][2]};
  for(const id of suits[i][3])gear[uniqueById(id).slot]=id;
  game=new Game(level,gear,{seed:17,autoPogo:true});
  if(keep&&old&&!old.done&&!old.p.dead){
    // Gleiche Position und Welt beim Anprobieren, frische Zustände für die neue Waffe.
    for(const k of ['tiles','ents','coins','gems','check','deaths','frame','parts'])game[k]=old[k];
    for(const k of ['x','y','vx','vy','face','onGround'])game.p[k]=old.p[k];
    game.p.hp=Math.min(game.p.maxhp,old.p.hp);
  }
  renderer.distance=0;
  renderer.lastStep=0;
  renderer.snapCamera(game);
  $('#status').textContent=suits[i][0]+' · '+suits[i][1];
  message(keep?'Ausrüstung gewechselt':'Erreiche die Fahne rechts · 3 Münzen im oberen Weg');
}
class PreviewRenderer extends Renderer{
  tiles(g,theme,cx,cy){
    const c=this.x,bg=images[2];
    const h=Math.max(this.H,this.W*bg.height/bg.width),w=h*bg.width/bg.height;
    const scroll=Math.min(1,Math.max(0,cx/Math.max(1,g.w*16-this.W)));
    c.drawImage(bg,cx-(w-this.W)*scroll,cy-(h-this.H)*.45,w,h);
    c.fillStyle='rgba(7,19,26,.18)';c.fillRect(cx,cy,this.W,this.H);
    super.tiles(g,theme,cx,cy);
    const start=Math.max(0,Math.floor(cx/16)),end=Math.min(g.w,Math.ceil((cx+this.W)/16));
    for(let col=start;col<end;col++){
      const x=col*16;
      for(let row=10;row<13;row++){
        if(g.tile(col,row)!=='#')continue;
        const y=row*16;
        c.fillStyle=['#233439','#2a3c40','#26373d'][(col*5+row)%3];
        c.fillRect(x,y,16,16);
        c.fillStyle='#102127';c.fillRect(x,y+15,16,1);
        const seam=x+(row%2?8:0);
        c.fillRect(seam,y,0.75,16);
        c.fillStyle='#526467';c.fillRect(x,y+1,15,.5);
        if(row===10){
          c.fillStyle='#9a7959';c.fillRect(x,y,16,1.7);
          c.fillStyle='#d8bc85';c.fillRect(x,y,15,.55);
          c.fillStyle='#ad8c61';c.beginPath();c.arc(x+8,y+4,.8,0,Math.PI*2);c.fill();
        }
      }
    }
  }
  player(g){
    const p=g.p;if(p.dead||p.inv>0&&(p.inv>>2)%2)return;
    const group=Math.floor(current/3),row=current%3;
    const walking=p.onGround&&Math.abs(p.vx)>.25;
    const landing=p.onGround?Math.min(.09,(p.land||0)*.016):0;
    const distance=this.distance-this.lastStep*(1-(this.alpha??1));
    const stride=distance/strideLength[current];
    let img=images[group],feet=anchors[current],frame=0;
    let lift=0,compression=landing,lean=0,reach=0;
    if(p.atk>0){
      const remaining=p.atk/p.atkLen;
      img=images[5+group];feet=swingFeet[current];
      // swing() prüft im selben Tick 0.30 <= atk/atkLen <= 0.75.
      if(remaining>.75){
        frame=remaining>.86?0:1;
        compression+=.028;
      }else if(remaining>=.30){
        frame=2;
        reach=.55*Math.sin(Math.PI*(.75-remaining)/.45);
      }else{
        frame=3;
        compression+=.025*remaining/.30;
      }
    }else if(!p.onGround){
      frame=p.pogo?2:1;
      lean=p.pogo?0:Math.max(-.035,Math.min(.035,p.vy*.007));
    }else if(walking){
      img=images[3+group];feet=runFeet[current];
      frame=Math.floor(stride*4)%4;
      lift=.48*Math.pow(Math.sin(2*Math.PI*stride),2);
    }else{
      // Brust und Schulter bewegen sich um die stehende Fußachse.
      const phase=2*Math.PI*p.anim/breathPeriod[current];
      compression+=.011*(1-Math.cos(phase));
      lean=.011*Math.sin(phase);
    }
    const cw=img.width/4,sy=Math.round(row*img.height/3);
    const ch=Math.round((row+1)*img.height/3)-sy;
    const [ax,ay]=feet[frame];
    const factor=[.086,.086,.089,.084,.080,.075][current];
    const c=this.x;c.save();c.translate(p.x+p.w/2,p.y+p.h-lift);
    c.scale(p.face,1);
    c.transform(1+compression*.2,0,lean,1-compression,reach,0);
    c.drawImage(img,frame*cw,sy,cw,ch,-ax*factor,-ay*factor,cw*factor,ch*factor);
    c.restore();
  }
  hud(){} // Status und Eingaben haben außerhalb der Spielfläche eigenen Platz.
}
renderer=new PreviewRenderer(ctx);
function resize(){
  const w=canvas.clientWidth,h=canvas.clientHeight,d=Math.min(devicePixelRatio||1,2);
  canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
  const detail=$('#zoom').getAttribute('aria-pressed')==='true';
  const units=Math.min(detail?210:330,Math.max(detail?96:122,(detail?76:113)*w/h)),height=units*h/w;
  renderer.resize(units,height);ctx.setTransform(canvas.width/units,0,0,canvas.height/height,0,0);
  if(game)renderer.snapCamera(game);
}
$('#zoom').onclick=()=>{
  const button=$('#zoom'),on=button.getAttribute('aria-pressed')==='true';
  button.setAttribute('aria-pressed',String(!on));button.textContent=on?'Nahansicht':'Übersicht';resize();button.blur();
};
new ResizeObserver(resize).observe(canvas);resize();
select.onchange=()=>{start(+select.value,true);select.blur();};$('#reset').onclick=()=>start(current);
const pressed=new Map(),edges=new Set();
function press(id,key){if(pressed.has(id))return;pressed.set(id,key);edges.add(key);}
function release(id){pressed.delete(id);}
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',ArrowDown:'down',KeyS:'down',Space:'jump',ArrowUp:'jump',KeyW:'jump',KeyX:'attack',KeyJ:'attack'};
addEventListener('keydown',e=>{if(e.target===select||e.target.tagName==='BUTTON'&&e.code==='Space')return;if(keys[e.code]){e.preventDefault();press(e.code,keys[e.code]);}});
addEventListener('keyup',e=>release(e.code));
for(const b of document.querySelectorAll('[data-k]')){
  b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);press(e.pointerId,b.dataset.k);b.classList.add('held');};
  b.onlostpointercapture=e=>{release(e.pointerId);b.classList.remove('held');};
}
function clear(){pressed.clear();edges.clear();document.querySelectorAll('.held').forEach(e=>e.classList.remove('held'));}
addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
start(current);
let last=performance.now(),acc=0;
function loop(now){
  acc+=Math.min(now-last,80);last=now;
  while(acc>=1000/60){
    acc-=1000/60;const held=new Set(pressed.values());
    const previousX=game.p.x;
    if(!game.done)game.step({left:held.has('left'),right:held.has('right'),down:held.has('down'),jump:held.has('jump'),attack:held.has('attack'),jumpP:edges.has('jump'),attackP:edges.has('attack')});
    const dx=Math.abs(game.p.x-previousX);
    renderer.lastStep=game.p.onGround&&dx<8?dx:0;
    renderer.distance+=renderer.lastStep;
    edges.clear();
    if(game.events.some(e=>e.name==='check'))message('Laterne entzündet');
  }
  renderer.alpha=acc*60/1000;renderer.draw(game);
  if(game.done)$('#message').textContent='Sternwarte erreicht · '+game.coins.length+'/3 Münzen · Noch einmal?';
  else if(now>until)$('#message').textContent='';
  $('#progress').textContent='♥ '+game.p.hp+'/'+game.p.maxhp+'   ·   ◈ '+game.coins.length+'/3';
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
