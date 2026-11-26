// Schatten-Arena: Duell gegen den Schatten eines anderen Spielers.
// Beide Kämpfer laufen als vollwertige Spiele mit voller Physik nebeneinander. Im Spiel des einen
// steht der andere als „Rivale“: Hiebe, Schaufel-Sprünge und Geschosse treffen ihn wie einen Gegner,
// der Schaden landet aber beim echten Kämpfer im anderen Spiel. So wirken alle Waffen und Rüstungen,
// nur mit den PvP-Obergrenzen (pvpNormalize). Ohne Zufall von aussen: gleicher Seed, gleicher Kampf.
import { Game } from './game.js';
import { T, cx, fsin, rng } from './core.js';
import { UNIQUES, SLOT_IDS } from './armor.js';
import { WEAPONS } from './weapons.js';

export const ARENA_VERSION = 1;
export const ROUND = { sudden: 45 * 60, end: 90 * 60, intro: 110, outro: 150, maxRounds: 5 };

/* ---------- Die drei Arenen (21 Kacheln breit, spiegelgleich) ---------- */
export const ARENAS = [
  {
    id: 'aschenhof', name: 'Aschenhof', sub: 'Wo die ersten Klingen sich kreuzten', theme: 'dornen',
    desc: 'Offener Hof, drei Ebenen, Sprungpilze in den Ecken. Ehrlicher Kampf.',
    map: [
      '#####################',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#..===.........===..#',
      '#...................#',
      '#.......=====.......#',
      '#...................#',
      '#...===.......===...#',
      '#.P.................#',
      '#B#################B#',
      '#####################',
    ],
    hazards: [],
  },
  {
    id: 'glockenstuhl', name: 'Glockenstuhl', sub: 'Unter der Totenglocke', theme: 'glocke',
    desc: 'Aufwind in der Mitte, Stachelgruben, Hebebühnen zu den hohen Simsen.',
    map: [
      '#####################',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#.......=====.......#',
      '#...................#',
      '#==...............==#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#....===.....===....#',
      '#.P.................#',
      '####^^###VVV###^^####',
      '#####################',
    ],
    hazards: [{ kind: 'plat', axis: 'y', x: 16, y: 172, amp: 34, spd: 0.028, ph: 0, mirror: true }],
  },
  {
    id: 'saegeschlund', name: 'Sägeschlund', sub: 'Die Grube frisst die Zögernden', theme: 'pendel',
    desc: 'Stachelgrube in der Mitte, eine Fähre in der Höhe, Sägen über den Köpfen.',
    map: [
      '#####################',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#...................#',
      '#===.............===#',
      '#...................#',
      '#...===..===..===...#',
      '#.P.................#',
      '#B######^^^^^######B#',
      '#####################',
    ],
    hazards: [
      { kind: 'plat', axis: 'x', x: 144, y: 110, amp: 70, spd: 0.018, ph: 0 },
      { kind: 'saw', axis: 'y', x: 161, y: 70, amp: 34, spd: 0.045, ph: 0 },
      { kind: 'saw', axis: 'x', x: 34, y: 60, amp: 24, spd: 0.035, ph: 1.2, mirror: true },
    ],
  },
];
export const arenaById = id => ARENAS.find(a => a.id === id) || ARENAS[0];
export function arenaLevel(a) {
  return { id: 'A:' + a.id, name: a.name, theme: a.theme, map: a.map, signs: [], arena: true, par: 999 };
}
const W_PX = 21 * T;
function addHazards(g, a) {
  // Aufwinde im Gleichtakt (sonst bläst die linke Düse früher als die rechte)
  g.ventOn = () => g.frame % 120 < 70;
  const list = [];
  for (const h of a.hazards) {
    list.push({ ...h, sg: 1 });
    if (h.mirror) list.push({ ...h, x: W_PX - h.x - (h.kind === 'plat' ? 48 : 14), sg: h.axis === 'x' ? -1 : 1 });
  }
  for (const h of list) {
    if (h.kind === 'plat') {
      g.plats.push({ type: 'plat', axis: h.axis, ox: h.x, oy: h.y, x: h.x, y: h.y, w: 48, h: 8, dx: 0, dy: 0,
        update(gg, e) { const d = fsin(gg.frame * h.spd + h.ph) * h.amp * h.sg, nx = h.axis === 'x' ? e.ox + d : e.ox, ny = h.axis === 'y' ? e.oy + d : e.oy; e.dx = nx - e.x; e.dy = ny - e.y; e.x = nx; e.y = ny; } });
    } else {
      g.add({ type: 'saw', axis: h.axis, ox: h.x, oy: h.y, x: h.x, y: h.y, w: 14, h: 14, rot: 0,
        update(gg, e) { const d = fsin(gg.frame * h.spd + h.ph) * h.amp * h.sg; if (h.axis === 'x') e.x = e.ox + d; else e.y = e.oy + d; e.rot += 0.3; } });
    }
  }
}

/* ---------- Ränge und Wertung ---------- */
export const RANKS = [
  { min: 0, name: 'Aschenwandler', col: '#9a8f80' },
  { min: 900, name: 'Knappe', col: '#b98a52' },
  { min: 1050, name: 'Klingenträger', col: '#a9b5c2' },
  { min: 1200, name: 'Schattenritter', col: '#9a7aff' },
  { min: 1350, name: 'Blutfürst', col: '#ff5a4a' },
  { min: 1500, name: 'Leerenwächter', col: '#ff4fd8' },
  { min: 1700, name: 'Ewiger Champion', col: '#ffd84a' },
];
export const rankOf = r => { let k = RANKS[0]; for (const x of RANKS) if (r >= x.min) k = x; return k; };
export const START_RATING = 1000;
// Elo: Erwartung gegen den Gegner, Faktor sinkt mit der Erfahrung
export function eloDelta(me, foe, score, games = 0) {
  const k = games < 10 ? 40 : games < 40 ? 28 : 20, e = 1 / (1 + Math.pow(10, (foe - me) / 400));
  return Math.round(k * (score - e));
}
export const skillOf = rating => Math.max(0.12, Math.min(0.95, (rating - 650) / 1300));

/* ---------- Ausrüstung prüfen (Daten vom Server sind nie vertrauenswürdig) ---------- */
const UNIQ = new Set(UNIQUES.map(u => u.id)), WEAP = new Set(WEAPONS.map(w => w.id));
const tierOk = n => Number.isInteger(n) && n >= 0 && n <= 11;
export function cleanGear(g) {
  const o = { shovel: tierOk(g && g.shovel) ? g.shovel : 0, weapon: g && WEAP.has(g.weapon) ? g.weapon : null };
  for (const s of SLOT_IDS) {
    const v = g && g[s];
    if (tierOk(v)) o[s] = v;
    else if (typeof v === 'string') { const [id, t] = v.split('@'); o[s] = UNIQ.has(id) ? (t !== undefined && tierOk(+t) ? `${id}@${+t}` : id) : 0; }
    else o[s] = 0;
  }
  return o;
}
const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
export const cleanStyle = s => ({ aggr: clamp01(s?.aggr ?? 0.55), pogo: clamp01(s?.pogo ?? 0.3), air: clamp01(s?.air ?? 0.4) });

/* ---------- Wächter: eingebaute Schatten, solange (noch) wenige Spieler da sind ---------- */
const G = (shovel, weapon, helm, brust, umhang, hose) => ({ shovel, weapon, helm, brust, umhang, hose });
export const WARDENS = [
  { id: 'w1', name: 'Grauer Knappe', rating: 800, gear: G(1, null, 1, 1, 1, 1), style: { aggr: 0.45, pogo: 0.1, air: 0.2 } },
  { id: 'w2', name: 'Moorhexe Ilsa', rating: 900, gear: G(2, 'moorsense', 2, 'federleib', 'stillemantel', 2), style: { aggr: 0.35, pogo: 0.2, air: 0.5 } },
  { id: 'w3', name: 'Rostritter Gerold', rating: 1000, gear: G(3, 'rostbeil', 'wachthelm', 'soeldnerhemd', 3, 'eisenschienen'), style: { aggr: 0.75, pogo: 0.15, air: 0.2 } },
  { id: 'w4', name: 'Die Aschenwitwe', rating: 1100, gear: G(4, 'aschenschaufel', 'dornenkrone', 'dornenpanzer', 'aschenschleppe', 'dornensohlen'), style: { aggr: 0.6, pogo: 0.35, air: 0.4 } },
  { id: 'w5', name: 'Bruder Widerhall', rating: 1200, gear: G(5, 'echoschaufel', 'langewacht', 'runenplatte', 'wanderermantel', 'sprungfeder'), style: { aggr: 0.55, pogo: 0.45, air: 0.55 } },
  { id: 'w6', name: 'Käferkönig Ruprecht', rating: 1300, gear: G(5, 'bumerangschaufel', 'kaeferkrone', 'igelbrust', 'jaegerumhang', 'stampfer'), style: { aggr: 0.7, pogo: 0.6, air: 0.35 } },
  { id: 'w7', name: 'Sturmreiterin Vela', rating: 1400, gear: G(6, 'windfaecher', 'raserkopf', 'federleib', 'sturmschwingen', 'wolkenhose'), style: { aggr: 0.5, pogo: 0.5, air: 0.9 } },
  { id: 'w8', name: 'Der Schädelpriester', rating: 1500, gear: G(7, 'knochenhaken', 'knochenreisser', 'schaedelpanzer', 'rabenschwingen', 'knochenkoenig'), style: { aggr: 0.65, pogo: 0.55, air: 0.6 } },
  { id: 'w9', name: 'Glutfürst Azhar', rating: 1600, gear: G(8, 'glutdreizack', 'visier', 'glutkern', 'glutschleppe', 'glutsohlen'), style: { aggr: 0.85, pogo: 0.4, air: 0.45 } },
  { id: 'w10', name: 'Mondsichel Selene', rating: 1700, gear: G(9, 'sternensichel', 'mondkrone', 'sternenherz', 'sternenschleier', 'himmelsstufen'), style: { aggr: 0.5, pogo: 0.75, air: 0.8 } },
  { id: 'w11', name: 'Der Gefallene König', rating: 1850, gear: G(10, 'koenigsklinge', 'gefallenerkoenig', 'drachenschuppe', 'ewigerkoenig', 'drachenklauen'), style: { aggr: 0.8, pogo: 0.6, air: 0.5 } },
  { id: 'w12', name: 'Leerenwandler', rating: 2000, gear: G(11, 'leerensense', 'leerenblick', 'herzderleere', 'mantelderleere', 'siebenmeilen'), style: { aggr: 0.7, pogo: 0.7, air: 0.75 } },
].map(w => ({ ...w, warden: true }));

// Gegner passend zur Wertung: echte Schatten zuerst, Wächter füllen auf
export function pickOpponent(list, rating, rand, skip = new Set()) {
  const pool = list.filter(o => !skip.has(o.id));
  const near = pool.filter(o => Math.abs(o.rating - rating) <= 180);
  const real = near.filter(o => !o.warden);
  const from = real.length && rand() < 0.8 ? real : near.length ? near : pool;
  if (!from.length) return null;
  from.sort((a, b) => Math.abs(a.rating - rating) - Math.abs(b.rating - rating));
  return from[Math.floor(rand() * Math.min(from.length, 4))];
}

/* ---------- Schaden im Duell ---------- */
const SPLASH = new Set(['thorn', 'gift', 'chain', 'shard', 'fire']);
export const pvpDamage = (raw, src) => SPLASH.has(src) ? 1 : raw >= 8 ? 3 : 2;

/* ---------- Schatten-KI: kämpft im Stil ihres Spielers ---------- */
const sgn = v => v > 0 ? 1 : v < 0 ? -1 : 0;
export class ShadeAI {
  constructor(seed, style, skill) {
    this.r = rng(seed); this.st = cleanStyle(style); this.skill = skill;
    this.react = Math.round(17 - 11 * skill);   // Reaktionszeit in Bildern
    this.hist = []; this.intent = 'press'; this.intentT = 0; this.jumpHold = 0; this.stuck = 0; this.lastX = 0; this.evade = 0;
  }
  think(g, og) {
    const p = g.p, q = og.p, R = this.r, st = this.st, sk = this.skill, inp = {};
    this.hist.push({ x: q.x, y: q.y, vy: q.vy, atk: q.atk, dead: q.dead, ground: q.onGround });
    if (this.hist.length > 40) this.hist.shift();
    const o = this.hist[Math.max(0, this.hist.length - 1 - this.react)];
    if (p.dead || o.dead) return inp;
    const dx = o.x - p.x, dy = o.y - p.y, adx = Math.abs(dx), dir = sgn(dx) || -p.face, reach = g.reach + 3;
    if (--this.intentT <= 0) {
      const r = R(), low = p.hp / p.maxhp < 0.35 && q.hp / q.maxhp > 0.5;
      this.intent = low && r < 0.5 * (1 - st.aggr) ? 'kite' : r < st.pogo * 0.55 ? 'pogo' : r < 0.55 * (1 - st.aggr) ? 'bait' : 'press';
      this.intentT = 24 + Math.floor(R() * 42);
    }
    let move = 0;
    switch (this.intent) {
      case 'press': move = adx > reach - 2 ? dir : adx < 7 ? -dir : 0; break;
      case 'kite': move = adx < 72 ? -dir : 0; break;
      case 'bait': move = adx < 34 ? -dir : adx > 64 ? dir : 0; break;
      case 'pogo':
        move = dir;
        if (p.onGround && adx < 60 && adx > 18 && dy > -24 && R() < 0.12 + 0.2 * sk) this.jump(12);
        break;
    }
    // Nach oben folgen, nach unten durchfallen
    if (p.onGround && dy < -30 && adx < 64 && R() < 0.05 + 0.08 * st.air) this.jump(13);
    if (p.onGround && dy > 28 && p.groundC === '=' && adx < 90 && !this.spikesBelow(g, cx(p)) && R() < 0.06) { inp.down = true; inp.jumpP = true; }
    // Ausweichen, wenn der Gegner gerade zuschlägt
    if (o.atk > 0 && adx < reach + 12 && Math.abs(dy) < 18 && p.onGround && R() < 0.06 + 0.3 * sk) {
      if (R() < 0.5 + 0.3 * st.air) this.jump(12); else this.evade = 10;
    }
    if (this.evade > 0) { this.evade--; move = -dir; }
    // Zuschlagen: auf gleicher Höhe und in Reichweite
    if (adx < reach + 2 && Math.abs(dy) < 13 && p.atk === 0 && p.atkCd === 0) {
      if (p.face !== dir) move = dir;
      else if (R() < 0.18 + 0.5 * sk) inp.attackP = true;
    }
    // Luft: über dem Kopf → Schaufel-Sprung, sonst Luftsprung zum Nachsetzen
    if (!p.onGround) {
      if (dy > 4 && adx < 12 + 6 * sk) { inp.down = true; move = Math.abs(dx) > 3 ? dir : 0; }
      else if (dy < -20 && p.airLeft > 0 && p.vy > -1 && adx < 50 && R() < 0.05 + 0.1 * st.air) this.jump(10);
      else if (dy > 4 && adx < 40) move = dir;
    }
    move = this.safeMove(g, p, move, dir);
    // Festgefahren: springen
    if (move && Math.abs(p.x - this.lastX) < 0.2 && p.onGround) { if (++this.stuck > 25) { this.jump(13); this.stuck = 0; } } else this.stuck = 0;
    this.lastX = p.x;
    inp.left = move < 0; inp.right = move > 0;
    if (this.jumpHold > 0) { if (this.jumpStart) { inp.jumpP = true; this.jumpStart = false; } inp.jump = true; this.jumpHold--; }
    return inp;
  }
  jump(hold) { if (this.jumpHold > 0) return; this.jumpHold = hold; this.jumpStart = true; }
  spikesBelow(g, x) { const tx = Math.floor(x / T); for (let ty = Math.floor((g.p.y + g.p.h + 2) / T); ty < g.h; ty++) { const c = g.tile(tx, ty); if (c === '^') return true; if (c === '#' || c === 'B' || c === 'V' || c === '=') return false; } return false; }
  // Stacheln, Gruben und Sägen meiden, Plattformen über Gruben nutzen
  safeMove(g, p, move, dir) {
    for (const e of g.ents) if (e.type === 'saw') {
      const rx = cx(e) - cx(p), ry = (e.y + 7) - (p.y + 7);
      if (Math.abs(ry) < 20 && Math.abs(rx) < 30 && (sgn(rx) === move || Math.abs(rx) < 16)) return -sgn(rx) || -dir;
      if (!p.onGround && ry < 0 && ry > -40 && Math.abs(rx) < 20) return -sgn(rx) || move;
    }
    if (!move) return 0;
    const ahead = cx(p) + move * 9;
    if (p.onGround) {
      if (p.plat) { const pl = p.plat; if (ahead < pl.x + 2 || ahead > pl.x + pl.w - 2) return this.spikesBelow(g, ahead) ? 0 : move; return move; }
      const ty = Math.floor((p.y + p.h + 2) / T), c = g.tile(Math.floor(ahead / T), ty);
      if (c === '^' || (c === '.' && this.spikesBelow(g, ahead))) {
        // Grube voraus: sicheren Landeplatz in Sprungweite suchen (Steg, Sims oder Boden dahinter)
        const fx = Math.floor(cx(p) / T), fr = Math.floor((p.y + p.h - 1) / T);
        for (let d = 1; d <= 4; d++) {
          const tx = fx + move * d;
          for (let r = fr - 1; r <= fr + 3; r++) {
            const t = g.tile(tx, r);
            if (t === '^') break;
            if (t === '=' || t === '#' || t === 'B') { if (r >= fr - 1 && !(t === '#' && g.tile(tx, r - 1) !== '.')) { this.jump(13); return move; } break; }
          }
        }
        for (const pl of g.plats) if (Math.abs(pl.y - (p.y + p.h)) < 40 && Math.abs((pl.x + pl.w / 2) - cx(p)) < 60) { this.jump(13); return move; }
        return 0;
      }
    } else if (this.spikesBelow(g, cx(p)) && p.vy > 0) {
      // in der Luft über Stacheln: zum nächsten sicheren Rand
      for (let d = 1; d < 6; d++) for (const s of [move || dir, -(move || dir)]) if (!this.spikesBelow(g, cx(p) + s * d * T)) return s;
    }
    return move;
  }
}

/* ---------- Ein Duell (bis zwei Runden gewonnen) ---------- */
export class Match {
  // o.view: 'A' (Standard, eigener Kämpfer links) oder 'B' (Live-Duell als Gast: eigener Kämpfer ist B)
  // o.live: beide Kämpfer menschlich, Eingaben kommen über step(ia, ib)
  constructor(o) {
    this.o = { ...o, arena: arenaById(o.arena), meGear: cleanGear(o.meGear), foe: { ...o.foe, gear: cleanGear(o.foe.gear), style: cleanStyle(o.foe.style) } };
    this.view = o.view === 'B' ? 'B' : 'A'; this.live = !!o.live;
    this.score = [0, 0]; this.round = 0; this.events = []; this.over = false; this.result = null;
    this.stats = { frames: 0, approach: 0, atk: 0, airF: 0, pogoF: 0, jumps: 0, dealt: 0, taken: 0, pogoHits: 0 };
    this.newRound();
  }
  newRound() {
    const o = this.o, L = arenaLevel(o.arena), seed = (o.seed >>> 0) + this.round * 7919;
    const mine = this.view === 'A';
    const A = this.A = new Game(L, mine ? o.meGear : o.foe.gear, { seed, pvp: true, autoPogo: mine ? o.autoPogo !== false : o.foe.autoPogo !== false });
    const B = this.B = new Game(L, mine ? o.foe.gear : o.meGear, { seed, pvp: true, autoPogo: this.live ? (mine ? o.foe.autoPogo !== false : o.autoPogo !== false) : false });
    B.p.x = W_PX - A.p.x - B.p.w; B.p.face = -1; B.check = { x: B.p.x, y: B.p.y }; A.p.face = 1;
    for (const g of [A, B]) addHazards(g, o.arena);
    A.add(this.rival(A, B)); B.add(this.rival(B, A));
    this.V = mine ? A : B; this.O = mine ? B : A;
    this.V.camFocus = { x: 0, y: 0, w: 0, h: 14, face: 0, vx: 0 };
    this.V.drawExtra = (r, th) => this.drawFoe(r, th);
    this.ai = this.live ? null : new ShadeAI(seed ^ 0x5bd1, o.foe.style, o.skill ?? skillOf(o.foe.rating || START_RATING));
    this.state = 'intro'; this.t = 0; this.fightT = 0; this.roundWinner = null;
    this.ev('arenaRound', this.round + 1);
    this.camUpdate();
  }
  // Der andere Kämpfer, wie ihn dieses Spiel sieht
  rival(g, og) {
    const m = this;
    return { type: 'rival', foe: true, rival: true, x: og.p.x, y: og.p.y, w: 10, h: 14, hp: 99, maxhp: 99, dmg: 0, vx: 0, vy: 0, iframe: 0, flash: 0, hidden: true,
      update(gg, e) { const q = og.p; e.x = q.x; e.y = q.y; e.vx = q.vx; e.vy = q.vy; e.hidden = !!q.dead || m.state !== 'fight'; },
      hurtBy(gg, e, dmg, dir, src) { if (m.state === 'fight' && !e.hidden) m.hit(gg, og, dmg, dir, src); } };
  }
  hit(from, to, raw, dir, src) {
    const q = to.p, hp0 = q.hp, d = pvpDamage(raw, src), fz = to.freeze;
    to.hurtPlayer(d, dir || (cx(q) > cx(from.p) ? 1 : -1), src === 'pogo');
    // Standbild erst nach beiden Schritten (sonst verliert der Getroffene seinen Zug)
    this.pendFreeze = Math.max(this.pendFreeze || 0, to.freeze); to.freeze = fz;
    if (q.hp < hp0) {
      const mine = from === this.V;
      this.ev('pvpHit', mine ? 'foe' : 'me');
      this.pendFreeze = Math.max(this.pendFreeze || 0, 6);
      from.num(cx(q), q.y - 8, '-' + (hp0 - q.hp), mine ? '#ffd84a' : '#ff5a4a');
      if (mine) { this.stats.dealt += hp0 - q.hp; if (src === 'pogo') this.stats.pogoHits++; } else this.stats.taken += hp0 - q.hp;
    } else if (q.inv > 0) this.ev('clink');
  }
  ev(name, v) { this.events.push({ name, v }); }
  camUpdate() {
    const a = this.V.p, b = this.O.p, f = this.V.camFocus;
    // Mitte zwischen beiden, aber der eigene Held bleibt immer im Bild
    f.x = (a.x + b.x) / 2; f.y = (a.y + b.y) / 2;
    if (b.dead) { f.x = a.x; f.y = a.y; }
  }
  // Ein Bild weiter. Gegen den Schatten: step(eigene Eingabe). Live: step(Eingabe A, Eingabe B).
  step(inp, inpB) {
    this.events.length = 0;
    const A = this.A, B = this.B, V = this.V, idle = {};
    if (this.over) return;
    this.frame = (this.frame || 0) + 1;
    if (this.state === 'fight') {
      const ib = this.live ? inpB || idle : this.ai.think(B, A);
      // Reihenfolge wechselt jedes Bild: keiner hat den ersten Zug fest
      if (this.fightT & 1) { B.step(ib); A.step(inp); } else { A.step(inp); B.step(ib); }
      // Ereignisse aus Sicht des eigenen Kämpfers (Treffer des Gegners landen erst nach seinem Schritt)
      for (const e of V.events) this.events.push(e);
      for (const e of this.O.events) if (FOE_SOUNDS.has(e.name)) this.events.push({ name: e.name, v: e.v, foe: true });
      this.learn(V === A ? inp : ib);
      this.fightT++;
      this.sudden();
      const aDown = A.p.dead || A.p.hp <= 0, bDown = B.p.dead || B.p.hp <= 0;
      if (aDown || bDown) this.endRound(aDown && bDown ? 0 : aDown ? 2 : 1);
      else if (this.fightT >= ROUND.end) { const fa = A.p.hp / A.p.maxhp, fb = B.p.hp / B.p.maxhp; this.endRound(Math.abs(fa - fb) < 0.01 ? 0 : fa > fb ? 1 : 2); }
    } else {
      A.step(idle); B.step(idle);
      for (const e of V.events) if (e.name !== 'step') this.events.push(e);
      this.t++;
      if (this.state === 'intro' && this.t === ROUND.intro) { this.state = 'fight'; this.ev('arenaFight'); }
      if (this.state === 'outro' && this.t >= ROUND.outro) {
        if (this.score[0] >= 2 || this.score[1] >= 2 || this.round + 1 >= ROUND.maxRounds) this.finish();
        else { this.round++; this.newRound(); }
      }
    }
    const f = Math.max(A.freeze, B.freeze, this.pendFreeze || 0); A.freeze = B.freeze = f; this.pendFreeze = 0;
    this.camUpdate();
  }
  // Schattenwand: ab 45 s rücken dunkle Wände zur Mitte vor
  zone() {
    if (this.fightT < ROUND.sudden) return null;
    const k = Math.min(1, (this.fightT - ROUND.sudden) / (ROUND.end - ROUND.sudden - 300)), half = W_PX / 2 - 16;
    const hw = half - (half - 20) * k;
    return { l: W_PX / 2 - hw, r: W_PX / 2 + hw };
  }
  sudden() {
    const z = this.zone(); if (!z) return;
    if (this.fightT === ROUND.sudden) this.ev('arenaSudden');
    for (const g of [this.A, this.B]) {
      const p = g.p, c = cx(p);
      if (!p.dead && (c < z.l || c > z.r) && p.inv <= 0) g.hurtPlayer(1, c < z.l ? 1 : -1);
    }
  }
  endRound(w) {
    this.state = 'outro'; this.t = 0; this.roundWinner = w;
    if (w) this.score[w - 1]++;
    for (const g of [this.A, this.B]) if (g.p.dead) g.p.dead = 1e9;
    const mw = this.view === 'A' ? w : w ? 3 - w : 0;
    this.ev(mw === 1 ? 'roundWin' : mw === 2 ? 'roundLose' : 'roundDraw');
  }
  finish() {
    this.over = true;
    const [a, b] = this.myScore(), s = this.stats, n = Math.max(1, s.frames);
    this.result = { won: a > b, draw: a === b, score: [a, b], rounds: this.round + 1,
      style: { aggr: s.approach / n, pogo: Math.min(1, s.pogoF / Math.max(1, s.airF) * 2.5), air: Math.min(1, s.jumps / (n / 60) / 1.2) }, stats: s };
    this.ev(a > b ? 'matchWin' : a < b ? 'matchLose' : 'matchDraw');
  }
  // Punkte und Rundensieger aus Sicht des eigenen Kämpfers
  myScore() { return this.view === 'A' ? [...this.score] : [this.score[1], this.score[0]]; }
  myRoundWinner() { const w = this.roundWinner; return this.view === 'A' ? w : w ? 3 - w : 0; }
  // Prüfsumme des Zustands (Live-Duell: beide Geräte müssen dasselbe rechnen)
  checksum() {
    let h = 2166136261 >>> 0;
    const mix = v => { h = Math.imul(h ^ (Math.round(v * 64) | 0), 16777619) >>> 0; };
    for (const g of [this.A, this.B]) { const p = g.p; mix(p.x); mix(p.y); mix(p.vx); mix(p.vy); mix(p.hp); mix(p.inv); mix(g.frame); }
    mix(this.score[0]); mix(this.score[1]); mix(this.fightT); mix(this.round);
    return h;
  }
  // Den eigenen Stil mitschreiben: So kämpft später der eigene Schatten
  learn(i) {
    const s = this.stats, p = this.V.p, q = this.O.p; s.frames++;
    const toward = cx(q) > cx(p) ? i.right : i.left;
    if (toward) s.approach++;
    if (i.attackP) s.atk++;
    if (!p.onGround) { s.airF++; if (p.pogo) s.pogoF++; }
    if (i.jumpP) s.jumps++;
  }
  /* ----- Zeichnen ----- */
  drawFoe(r, th) {
    const B = this.O, p = B.p, al = r.alpha ?? 1, x = r.x;
    // eigene Geschosse und Funken des Gegners (Hindernisse zeichnet schon das eigene Spiel)
    for (const e of B.ents) if (e.type === 'proj') r.ent(B, e, th);
    for (const q of B.parts) { x.fillStyle = q.col === 'fire' ? '#ff8a2a' : q.col === 'ghost' ? '#c9b8ff' : '#ffe6a0'; x.fillRect(Math.round(q.x), Math.round(q.y), q.life > 12 ? 2 : 1, q.life > 12 ? 2 : 1); }
    if (p.dead > 0 && this.state !== 'outro') return;
    const rx = p.x, ry = p.y;
    if (p.ox !== undefined && Math.abs(p.x - p.ox) < 24 && Math.abs(p.y - p.oy) < 24) { p.x = p.ox + (p.x - p.ox) * al; p.y = p.oy + (p.y - p.oy) * al; }
    try {
      // dunkle Aura: der Schatten eines anderen Spielers
      const gx = p.x + 5, gy = p.y + 8, gr = x.createRadialGradient(gx, gy, 2, gx, gy, 18);
      gr.addColorStop(0, 'rgba(150,20,40,0.45)'); gr.addColorStop(1, 'rgba(150,20,40,0)');
      x.fillStyle = gr; x.fillRect(gx - 18, gy - 18, 36, 36);
      if (!(p.dead > 0)) r.playerBody(B, p, r.heroOf(B));
      const name = this.o.foe.name || 'Schatten';
      r.label(name, Math.round(p.x + 5), Math.round(p.y) - 14, '#ff8a8a');
    } finally { p.x = rx; p.y = ry; }
  }
}
const FOE_SOUNDS = new Set(['swing', 'jump', 'bounce', 'dash', 'shield', 'boing']);
