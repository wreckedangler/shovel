// Zusätzliche Begegnungen benutzen einen eigenen Zufallsstrom. Ein Replay
// ohne Begegnungs-Seed spielt weiterhin mit der ursprünglichen Besetzung.
import { T, GRAV, MAXFALL, cx, fsin, rng } from './core.js';
import { foeBase, hurtFoe, eproj } from './foes.js';
import { ROAMERS } from './roster.js';

function mote(g, e, x, y, vx, vy, life, path = 'line') {
  const p = { type: 'eproj', kind: 'mote', motif: e.design.id, color: e.colors[2], x, y, vx, vy, w: 5, h: 5, dmg: 1, age: 0,
    update(world, self) {
      if (++self.age >= life) { self.dead = true; return; }
      if (path === 'back' && self.age === Math.floor(life / 2)) self.vx *= -1;
      if (path === 'cross') self.vy += -vy * 0.055;
      self.x += self.vx; self.y += self.vy;
      if (world.solid(Math.floor((self.x + 2) / T), Math.floor((self.y + 2) / T))) self.dead = true;
    } };
  g.add(p);
}

function attack(g, e) {
  const x = cx(e), y = e.y + 5, d = e.face;
  const shot = (vx, vy, kind) => g.add(eproj(x, y, vx, vy, kind));
  switch (e.design.id) {
    case 'falter': mote(g, e, x, y, d * 2.1, -0.12, 74, 'back'); break;
    case 'kessel': for (const v of [-3.8, -2.3, -1]) shot(d * 1.5, v, 'spore'); break;
    case 'glocke': for (const dir of [-1, 1]) g.add(eproj(x, e.y + e.h - 10, dir * 2, 0, 'shock')); break;
    case 'regen': for (const dx of [-22, 0, 22]) mote(g, e, x + dx, y, 0, 2.2, 60); break;
    case 'docht': mote(g, e, x - d * 9, e.y + e.h - 6, 0, 0, 110); break;
    case 'uhr': {
      const landing = e.sites.reduce((best, s) => Math.abs(s.x - e.tx) < Math.abs(best.x - e.tx) ? s : best);
      e.x = landing.x; e.y = landing.y; e.vy = 0;
      break;
    }
    case 'seide': for (const dist of [17, 39]) mote(g, e, x + d * dist, y, 0, 0, 96); break;
    case 'prisma': for (const v of [-1, 1]) mote(g, e, x, y, d * 1.8, v, 64, 'cross'); break;
    case 'ritter': e.charge = 20; break;
    case 'kompass': e.pull = 35; break;
    case 'tinte': e.fade = 57; mote(g, e, x, y, d * 0.8, -0.06, 85); break;
    case 'pilz': {
      const ally = g.ents.find(a => a.foe && a !== e && !a.dead && a !== g.boss && a.hp < a.healCap && Math.hypot(cx(a) - x, a.y - y) < 80);
      if (ally) { ally.hp++; g.num(cx(ally), ally.y - 4, '+1', '#baffac'); }
      else shot(d * 1.5, -2.8, 'spore');
      break;
    }
    case 'kreide': mote(g, e, e.tx, e.ty + 9, 0, -2.4, 18); break;
    case 'saat': shot(d * 1.8, -3.9, 'gear'); break;
    case 'spiegel': for (const dir of [-1, 1]) shot(dir * 2.3, 0, 'arrow'); break;
    case 'maske':
      if (!e.copied) {
        e.copied = true;
        const twin = makeRoamer(e.design, e.sites, e.sites[0]);
        Object.assign(twin, { copied: true, w: 9, h: 9, hp: 1, healCap: 1, loot: 2 });
        g.add(twin);
      } else shot(d * 1.4, -2.4, 'spore');
      break;
    case 'anker': mote(g, e, x, y, d * 3.6, 0, 32, 'back'); break;
    case 'funke':
      for (let i = 0; i < 8; i++) mote(g, e, x, y, fsin(i * Math.PI / 4) * 1.5, fsin((i + 2) * Math.PI / 4) * 1.5, 47);
      break;
    case 'würfel': {
      const roll = Math.floor(g.rand() * 3);
      if (roll === 0) shot(d * 2.5, 0, 'arrow');
      if (roll === 1) shot(d * 1.4, -3.6, 'spore');
      if (roll === 2) shot(d * 1.6, -2.8, 'gear');
      break;
    }
    case 'stern': for (const dir of [-1, 1]) mote(g, e, e.tx - dir * 30, e.ty + 4, dir * 1.6, 0, 35); break;
  }
}

function update(g, e) {
  if (e.flash) e.flash--;
  if (e.iframe) e.iframe--;
  if (e.fade) e.fade--;
  if (g.p.dead || g.done || Math.abs(cx(g.p) - cx(e)) > 280 || Math.abs(g.p.y - e.y) > 170) return;
  const dx = cx(g.p) - cx(e), dir = Math.sign(dx) || 1, style = e.design.move;
  const near = Math.abs(dx) < 122 && Math.abs(g.p.y - e.y) < 66;
  if (e.pull > 0) {
    e.pull--;
    if (near) { const vx = g.p.vx; g.p.vx = -dir * 0.65; g.moveX(g.p); g.p.vx = vx; }
  }
  if (e.state === 'warn') {
    if (--e.t === 0) {
      attack(g, e);
      e.state = 'stalk'; e.t = 108;
    }
  } else if (near && --e.t <= 0 && (e.design.id !== 'glocke' || Math.abs(g.p.vx) < 0.2)) {
    if (!e.introduced) { g.num(cx(e), e.y - 10, e.design.name, e.colors[2]); e.introduced = true; }
    e.state = 'warn'; e.t = 35; e.face = dir; e.tx = cx(g.p); e.ty = g.p.y;
  }
  let speed = 0;
  if (e.charge > 0) { e.charge--; speed = e.face * 2.7; }
  else if (e.state !== 'warn') {
    e.face = dir;
    if (style === 'patrol') speed = e.patrol * 0.6;
    if (style === 'creep' || style === 'hop') speed = dir * 0.45;
    if (style === 'shy' && Math.abs(dx) < 75) speed = -dir * 0.7;
    if (style === 'mirror') speed = -g.p.vx * 0.55;
    if (style === 'hop' && e.onGround && g.frame % 49 === 0) e.vy = -3.9;
  }
  e.vx = speed;
  g.moveX(e);
  if (e.hitWall || e.x < e.left || e.x > e.right) e.patrol *= -1;
  e.x = Math.max(e.left, Math.min(e.right, e.x));
  if (style === 'float' || style === 'mirror') {
    e.vy = (e.homeY - 8 + fsin(g.frame / 23) * 6 - e.y) * 0.25;
  } else e.vy = Math.min(MAXFALL, e.vy + GRAV);
  g.moveY(e);
  if (e.y > g.h * T + 16) e.dead = true;
}

function makeRoamer(design, sites, site) {
  return foeBase({ type: 'roamer', design, colors: design.colors, x: site.x, y: site.y, homeY: site.y,
    sites, left: sites[0].x, right: sites[sites.length - 1].x, w: 14, h: 14, hp: 3, healCap: 3,
    state: 'stalk', face: 1, patrol: 1, t: 42, charge: 0, pull: 0, fade: 0, dmg: 1, loot: 12, update,
    hurtBy(g, e, damage, dir, source) {
      if (design.id === 'ritter' && e.state === 'warn' && source !== 'pogo' && dir === -e.face) {
        g.ev('clink'); return;
      }
      hurtFoe(g, e, damage, dir, source);
    } });
}

// Welche Arten wo heimisch sind
const THEME_ROAMERS = {
  wald: ['falter', 'saat', 'maske', 'pilz'], dornen: ['seide', 'saat', 'maske', 'falter'], hoehle: ['kreide', 'tinte', 'docht', 'würfel'],
  bau: ['anker', 'kessel', 'ritter', 'kompass'], uhrturm: ['uhr', 'kompass', 'funke', 'ritter'], glocke: ['glocke', 'stern', 'spiegel', 'seide'],
  pendel: ['funke', 'uhr', 'kompass', 'würfel'], pilz: ['pilz', 'regen', 'maske', 'saat'], grotte: ['prisma', 'regen', 'tinte', 'spiegel'], moder: ['docht', 'anker', 'tinte', 'kreide'],
};
// Wie viele Wandergegner höchstens: 1-1 bleibt ruhig, danach mehr je Welt bzw. Tiefe, nie in Bosskämpfen
export function roamerCap(level) {
  if (!level || level.boss || level.arena || level.duel != null || level.id === '1-1') return 0;
  if (level.gen) return level.depth < 3 ? 1 : level.depth < 8 ? 2 : 3;
  if (level.qual) return 3;
  const m = /^(\d+)-/.exec(level.id || '');
  return m ? Math.min(3, +m[1]) : 2;
}

// Nur zusammenhängende freie Standflächen verwenden. Start, Laternen und Ziele bleiben frei.
export function populateRoamers(g, seed) {
  const random = rng(seed), lanes = [];
  for (const e of g.ents) if (e.foe) e.healCap = e.hp;
  const reserved = g.ents.filter(e => ['goal', 'door', 'altar', 'lantern', 'brazier'].includes(e.type));
  for (let y = 2; y < g.h - 1; y++) {
    let lane = [];
    for (let x = 1; x < g.w; x++) {
      const px = x * T + 1, py = (y + 1) * T - 14;
      const free = x < g.w - 1 && ['#', '=', 'S', 'D'].includes(g.tile(x, y + 1)) &&
        g.tile(x, y) === '.' && g.tile(x, y - 1) === '.' && !g.isHidden(px + 7, py + 7) &&
        Math.hypot(px - g.p.x, py - g.p.y) > 58 &&
        !reserved.some(e => Math.abs(e.x - px) < 28 && Math.abs(e.y - py) < 32);
      if (free) lane.push({ x: px, y: py });
      else { if (lane.length) lanes.push(lane); lane = []; }
    }
  }
  const pool = [...ROAMERS];
  const cap = roamerCap(g.level);
  const count = cap ? 1 + Math.floor(random() * cap) : 0;
  const home = THEME_ROAMERS[g.level.theme] || [];
  for (let i = 0; i < count && lanes.length; i++) {
    const lane = lanes.splice(Math.floor(random() * lanes.length), 1)[0];
    const site = lane[Math.floor(random() * lane.length)];
    // meist eine Art, die zum Ort passt, manchmal ein Fremdling
    const local = pool.filter(d => home.includes(d.id)), from = local.length && random() < 0.7 ? local : pool;
    const design = from[Math.floor(random() * from.length)]; pool.splice(pool.indexOf(design), 1);
    g.add(makeRoamer(design, lane, site));
  }
}
