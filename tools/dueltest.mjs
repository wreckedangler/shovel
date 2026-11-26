import assert from 'node:assert/strict';
import { Game } from '../src/game.js';
import { DUELS, DUEL_LEVELS } from '../src/duels.js';
import { SECRET_WORLD, levelById } from '../src/levels.js';
import { replayOf, simulate } from '../src/replay.js';
for (const l of DUEL_LEVELS) {
  assert(l.secret && SECRET_WORLD.levels.includes(l.id) && levelById(l.id) === l);
  const blank={coins:{},cleared:{},chests:{},stats:{bestChain:0}};
  assert(!DUELS[l.duel].open(blank));
  const full={coins:{'1-3':[0,1,2]},cleared:{'2-G':true,'Q-1':true,'Q-2':true,'Q-3':true,'4-10':true},chests:{'2-G:1:1':true},stats:{bestChain:12}};
  assert(DUELS[l.duel].open(full));
  const g=new Game(l,{armor:11,shovel:11,weapon:'urfunke'},{relics:{herz:3,phoenix:3},roamerSeed:303});
  let second=false;
  for (let t=0;t<12000 && !g.done;t++) {
    const b=g.boss, dx=(b.dead?41*16+6:b.x+b.w/2)-(g.p.x+5);
    const hop=!b.dead && Math.abs(dx)<65 && t%44<19;
    g.step({right:dx>(b.dead?2:15) || dx>0 && g.p.face<0,left:dx< -(b.dead?2:15) || dx<0 && g.p.face>0,jump:hop,jumpP:hop && t%44===0,attackP:t%8===0,down:hop && g.p.vy>0});
    second ||= b.phase===2;
  }
  assert(second,l.id+' Phase II');
  assert(g.done && g.boss.dead,l.id+' Ziel, HP '+g.boss.hp+' Tode '+g.deaths);
  const copy=simulate(replayOf(g));
  assert(copy.done && copy.frame===g.frame && copy.deaths===g.deaths);
  console.log(l.id,l.name,g.frame,'Frames',g.deaths,'Tode');
}

