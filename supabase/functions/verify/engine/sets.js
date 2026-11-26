// Meister-Sets und Signaturwaffen: Laufzeit (deterministisch, ohne DOM) und Darstellung.
// Anknüpfung in game.js: setPre() vor dem Heldenschritt, setPost() danach, setHit() bei jedem Hieb-Treffer.
// Zustand liegt in g.sx; kein Math.random, damit Wiederholungen und Live-Duelle gleich bleiben.
import { T, cx, overlap, fdist } from './core.js';
import { proj } from './foes.js';

const normal = (g, e) => e.foe && !e.hidden && !e.dead && e !== g.boss && !e.isChief;
const target = (g, e) => e.foe && !e.hidden && !e.dead;
const swingBox = (g, p) => ({ x: p.face > 0 ? p.x + p.w : p.x - g.reach, y: p.y + 2, w: g.reach, h: 10 });
const gap = (a, b) => Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w), Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
const inTri = (pt, [a, b, c]) => {
  const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = s(pt, a, b), d2 = s(pt, b, c), d3 = s(pt, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
function pullToward(g, e, x, step) {
  const d = x - cx(e); if (Math.abs(d) < 2) return;
  const vx = e.vx; e.vx = Math.sign(d) * Math.min(step, Math.abs(d)); g.moveX(e); e.vx = vx;
}

export function setsActive(g) { return !!(g.ar.set || (g.gear.weapon && SIG_IDS.has(g.gear.weapon)) || g.level.duel != null); }
const SIG_IDS = new Set(['rosenschliff', 'kielbrecher', 'zwillingsstimme', 'blindzirkel', 'sternamboss', 'letztesoehr', 'elfenbein']);

/* ---------- vor dem Heldenschritt: Eingaben umlenken ---------- */
export function setPre(g, inp) {
  const p = g.p, S = g.sx || (g.sx = { cd: {}, pts: [] });
  S.pre = { vy: p.vy, ground: p.onGround, plat: p.plat, face: p.face, atk: p.atk, x: p.x };
  if (p.dead || g.done) return inp;
  const set = g.ar.set;
  if (set === 'ebbe') {
    // Gürtelanker: Ducken am Boden hält dich fest
    if (inp.down && !inp.jumpP && (p.onGround || S.anchor != null)) { if (S.anchor == null) { S.anchor = p.x; g.burst(cx(p), p.y + p.h, 6, 'stone', 1, 0.05, 14); } return { ...inp, left: false, right: false, jump: false }; }
    S.anchor = null;
  }
  if (set === 'naht' && S.thread && inp.jumpP && inp.down) {
    // Faden: zurück an den Rand der Plattform
    const pl = S.thread.pl;
    p.x = p.x + p.w / 2 < pl.x + pl.w / 2 ? pl.x : pl.x + pl.w - p.w; p.y = pl.y - p.h; p.vy = 0; p.vx = 0;
    S.thread = null; S.cd.naht = 360; g.ev('dash'); g.burst(cx(p), p.y + p.h, 10, 'spark', 1.4, 0, 16);
    return { ...inp, jumpP: false, jump: false, down: false };
  }
  return inp;
}

/* ---------- nach dem Heldenschritt ---------- */
export function setPost(g, inp) {
  const p = g.p, S = g.sx, pre = S.pre, cd = S.cd;
  for (const k in cd) if (cd[k] > 0) cd[k]--;
  if (g.level.duel != null) duelTrack(g);
  if (p.dead) return;
  const landed = !pre.ground && p.onGround, hard = landed && pre.vy > 4.2, swingStart = pre.atk === 0 && p.atk > 0;
  const swingEnd = pre.atk > 0 && p.atk === 0, bounced = g.events.some(e => e.name === 'bounce');
  switch (g.ar.set) {
    case 'glasrose':
      if (!pre.ground && !p.onGround && pre.face !== p.face && !(cd.glass > 0)) { S.glass = { x: p.x, y: p.y, face: p.face, t: 27 }; cd.glass = 480; g.ev('clink'); }
      if (S.glass) {
        const box = { x: S.glass.x, y: S.glass.y, w: 10, h: 14 };
        for (const e of g.ents) if (e.type === 'eproj' && e.kind === 'arrow' && !e.dead && overlap(box, e)) { e.dead = true; S.glass.t = 0; g.burst(box.x + 5, box.y + 7, 12, 'ice', 1.8, 0.1, 18); g.ev('crack'); break; }
        if (--S.glass.t <= 0) S.glass = null;
      }
      break;
    case 'ebbe':
      if (S.anchor != null) { p.x = S.anchor; p.vx = 0; }
      break;
    case 'vesper':
      for (const e of g.ents) if (e.type === 'eproj' && e.kind === 'shock' && !e.dead && !e.grazed) {
        const d = gap(p, e);
        if (d > 0 && d <= 8) { e.grazed = true; S.wing = Math.min(2, (S.wing || 0) + 1); g.num(cx(p), p.y - 8, S.wing === 2 ? 'SCHWINGEN' : 'FLÜGEL', '#ffde84'); }
      }
      if (S.wing >= 2 && !p.onGround && inp.jump && p.vy > 0 && !S.hover) { S.hover = 30; S.wing = 0; }
      if (S.hover > 0) { S.hover--; p.vy = Math.min(p.vy, 0.15); if (g.frame % 3 === 0) g.parts.push({ x: cx(p) - p.face * 5, y: p.y + 6, vx: -p.face * 0.4, vy: 0.3, life: 14, col: 'spark', grav: 0 }); }
      if (p.onGround) S.hover = 0;
      break;
    case 'kreide':
      if (hard && !S.tri) {
        S.pts.push({ x: cx(p), y: p.y + p.h - 4 });
        if (S.pts.length > 3) S.pts.shift();
        const P = S.pts;
        if (P.length === 3 && [[0, 1], [1, 2], [0, 2]].every(([a, b]) => fdist(P[a].x - P[b].x, P[a].y - P[b].y) <= 96)) {
          const area = Math.abs((P[1].x - P[0].x) * (P[2].y - P[0].y) - (P[2].x - P[0].x) * (P[1].y - P[0].y)) / 2;
          // Auf flachem Boden liegen die Punkte auf einer Linie: dann spannt sich das Dreieck nach oben auf
          const xs = P.map(q => q.x), lo = Math.min(...xs), hi = Math.max(...xs), yb = Math.max(...P.map(q => q.y));
          const pts = area >= 120 ? P.slice() : [{ x: lo, y: yb }, { x: hi, y: yb }, { x: (lo + hi) / 2, y: yb - 48 }];
          if (hi - lo >= 24 || area >= 120) {
            S.tri = { pts, t: 120 }; S.pts = [];
            for (const e of g.ents) if (normal(g, e) && inTri({ x: cx(e), y: e.y + e.h / 2 }, S.tri.pts)) e.slowT = 120;
            g.ev('secret');
          }
        }
      }
      if (S.tri && --S.tri.t <= 0) S.tri = null;
      break;
    case 'esse':
      if (p.atk > 0) {
        const box = swingBox(g, p);
        for (const e of g.ents) if (e.type === 'eproj' && e.kind !== 'shock' && !e.dead && overlap(box, e)) { e.dead = true; S.heat = Math.min(3, (S.heat || 0) + 1); g.burst(e.x + 2, e.y + 2, 8, 'fire', 1.6, 0, 14); g.ev('clink'); }
      }
      if (hard && S.heat >= 3) {
        S.heat = 0; S.ring = { x: cx(p), y: p.y + p.h - 6, t: 18 };
        for (const e of g.ents) if (e.type === 'eproj' && !e.dead && fdist(e.x + 2 - cx(p), e.y + 2 - (p.y + 8)) < 32) { e.dead = true; g.burst(e.x + 2, e.y + 2, 6, 'fire', 1.4, 0, 12); }
        g.ev('boom'); g.shake = Math.max(g.shake, 3);
      }
      if (S.ring && --S.ring.t <= 0) S.ring = null;
      break;
    case 'naht':
      if (pre.plat && !p.plat && !p.onGround && !(cd.naht > 0)) S.thread = { pl: pre.plat, t: 42 };
      if (S.thread && (--S.thread.t <= 0 || p.onGround)) S.thread = null;
      break;
    case 'schatten':
      if (p.onGround && inp.down) S.shade = { x: p.x, y: p.y, face: p.face, t: 60 };
      else if (S.shade && --S.shade.t <= 0) S.shade = null;
      if (swingEnd && S.shade && !(cd.shade > 0) && p.hits && [...p.hits].every(h => h === 'fx')) {
        let best = null, bd = 120;
        for (const e of g.ents) if (normal(g, e)) { const d = fdist(cx(e) - cx(p), e.y - p.y); if (d < bd) { bd = d; best = e; } }
        if (best) { S.pull = { e: best, t: 36 }; cd.shade = 300; S.shade = null; g.ev('swing'); }
      }
      if (S.pull) { if (S.pull.e.dead || --S.pull.t <= 0) S.pull = null; else pullToward(g, S.pull.e, cx(p), 1.6); }
      break;
  }
  weaponPost(g, p, S, swingStart, bounced);
}

/* ---------- Signaturwaffen ---------- */
export function setHit(g, e) {
  const S = g.sx; if (!S) return;
  const p = g.p, w = g.gear.weapon;
  if (w === 'rosenschliff' && !S.tip && !S.ret) S.tip = { x: cx(e) + p.face * 14, y: e.y + e.h / 2, t: 72, age: 0 };
  if (w === 'zwillingsstimme') {
    const d = Math.abs(cx(e) - cx(p));
    if (d >= g.reach * 0.6 + 6) S.note = { x: cx(e), y: e.y + e.h / 2, t: 60 };
    else if (S.note && d < g.reach * 0.6 + 6) {
      const a = S.note, b = { x: cx(e), y: e.y + e.h / 2 }, L = Math.max(1, fdist(b.x - a.x, b.y - a.y));
      for (const o of g.ents) if (target(g, o)) {
        const q = { x: cx(o), y: o.y + o.h / 2 }, k = Math.max(0, Math.min(1, ((q.x - a.x) * (b.x - a.x) + (q.y - a.y) * (b.y - a.y)) / (L * L)));
        if (fdist(q.x - (a.x + (b.x - a.x) * k), q.y - (a.y + (b.y - a.y) * k)) < 10) o.hurtBy(g, o, 3, Math.sign(q.x - cx(p)) || p.face, 'res');
      }
      S.res = { ...a, x2: b.x, y2: b.y, t: 14 }; S.note = null; g.ev('chime'); g.ev('zap', a.x, a.y);
    }
  }
  if (w === 'letztesoehr') {
    if (!S.st1) S.st1 = { e, ax: e === g.boss || e.isChief ? { x: cx(e), y: e.y + e.h / 2 } : null, t: 300 };
    else if (!S.st2 && S.st1.e !== e && normal(g, e) && !S.st1.ax) S.st2 = e;
  }
}
function weaponPost(g, p, S, swingStart, bounced) {
  const w = g.gear.weapon; if (!SIG_IDS.has(w)) return;
  switch (w) {
    case 'rosenschliff':
      if (S.tip) { S.tip.age++; if (swingStart && S.tip.age > 3) { S.ret = { x: S.tip.x, y: S.tip.y, hit: new Set(), t: 40 }; S.tip = null; } else if (--S.tip.t <= 0) S.tip = null; }
      if (S.ret) {
        const r = S.ret, tx = cx(p), ty = p.y + 7, d = fdist(tx - r.x, ty - r.y);
        if (d < 7 || --r.t <= 0) S.ret = null;
        else {
          r.x += (tx - r.x) / d * 6; r.y += (ty - r.y) / d * 6;
          const box = { x: r.x - 3, y: r.y - 3, w: 6, h: 6 };
          for (const e of g.ents) if (target(g, e) && !r.hit.has(e) && overlap(box, e)) { r.hit.add(e); e.hurtBy(g, e, 2, Math.sign(tx - r.x), 'tip'); }
        }
      }
      break;
    case 'kielbrecher':
      if (swingStart && p.onGround) { S.anch = { x: cx(p) + p.face * 16, y: p.y + p.h }; g.ev('clink'); }
      else if (swingStart && !p.onGround && S.anch) {
        const d = S.anch.x - cx(p), vx = p.vx; p.vx = Math.sign(d) * Math.min(48, Math.abs(d)); g.moveX(p); p.vx = vx;
        S.chain = { x1: cx(p), y1: p.y + 7, x2: S.anch.x, y2: S.anch.y, t: 10 }; S.anch = null; g.ev('dash');
      }
      if (S.chain && --S.chain.t <= 0) S.chain = null;
      break;
    case 'zwillingsstimme':
      if (S.note && --S.note.t <= 0) S.note = null;
      if (S.res && --S.res.t <= 0) S.res = null;
      break;
    case 'blindzirkel':
      if (swingStart && S.piv) {
        const c = S.piv; S.arc = { ...c, t: 14 }; S.piv = null;
        for (const e of g.ents) if (target(g, e)) { const d = fdist(cx(e) - c.x, e.y + e.h / 2 - c.y); if (d >= 14 && d <= 34 && e.y + e.h / 2 <= c.y + 4) e.hurtBy(g, e, g.dmg, Math.sign(cx(e) - c.x) || 1, 'arc'); }
        g.ev('swing');
      } else if (swingStart && p.onGround) { S.piv = { x: cx(p), y: p.y + p.h - 2, t: 120 }; g.ev('clink'); }
      if (S.piv && --S.piv.t <= 0) S.piv = null;
      if (S.arc && --S.arc.t <= 0) S.arc = null;
      break;
    case 'sternamboss':
      if (swingStart && p.onGround && !S.shard) { S.shard = { x: cx(p) + p.face * 16, y: p.y + p.h - 6 }; g.ev('clink'); g.burst(S.shard.x, S.shard.y, 6, 'spark', 1.2, 0, 12); }
      if (S.shard && bounced && Math.abs(cx(p) - S.shard.x) < 16 && Math.abs(p.y + p.h - S.shard.y) < 22) {
        g.add(proj(S.shard.x - 3, S.shard.y - 6, p.face * 4.2, 0, 3, 'star')); g.ev('zap'); S.shard = null;
      }
      break;
    case 'letztesoehr': {
      const s1 = S.st1;
      if (s1 && (s1.e.dead || --s1.t <= 0)) { S.st1 = null; S.st2 = null; break; }
      if (s1) {
        const a = s1.e, b = s1.ax || S.st2, bx = b ? (s1.ax ? b.x : cx(b)) : 0, by = b ? (s1.ax ? b.y : b.y + b.h / 2) : 0;
        if (b && fdist(cx(a) - bx, a.y + a.h / 2 - by) > 48) {
          a.hurtBy(g, a, 2, 0, 'naht'); if (!s1.ax && S.st2 && !S.st2.dead) S.st2.hurtBy(g, S.st2, 2, 0, 'naht');
          S.snap = { x: cx(a), y: a.y + a.h / 2, x2: bx, y2: by, t: 12 }; S.st1 = null; S.st2 = null; g.ev('crack');
        }
      }
      if (S.snap && --S.snap.t <= 0) S.snap = null;
      break;
    }
    case 'elfenbein':
      if (bounced && !S.mark) S.mark = { x: cx(p), y: p.y + p.h, t: 60 };
      if (S.mark && --S.mark.t <= 0) {
        const m = S.mark; S.mark = null;
        if (Math.abs(cx(p) - m.x) > 12) {
          for (const e of g.ents) if (target(g, e) && Math.abs(cx(e) - m.x) < 10 && e.y + e.h > m.y - 56 && e.y < m.y + 8) e.hurtBy(g, e, 3, 0, 'blade');
          S.blade = { x: m.x, y: m.y, t: 12 }; g.ev('crack'); g.shake = Math.max(g.shake, 2);
        }
      }
      if (S.blade && --S.blade.t <= 0) S.blade = null;
      break;
  }
}

/* ---------- Meisterduelle: Fundbedingungen der Signaturwaffen mitschreiben ---------- */
function duelTrack(g) {
  const b = g.boss, p = g.p, D = g.dl || (g.dl = { hp: b ? b.hp : 0, healed: false, seg: null, ok: {}, p2hurt: false, cut: new Set(), bx: [] });
  if (!b) return;
  if (b.hp > D.hp && b.state !== 'idle') D.healed = true;
  D.hp = b.hp;
  const hurt = p.hurt > 0 && !D.wasHurt; D.wasHurt = p.hurt > 0;
  if (b.phase === 2 && hurt) D.p2hurt = true;
  // Abschnitte = einzelne Angriffe des Meisters (neue Aktion = neuer Abschnitt)
  if (b.action && (!D.seg || D.seg.cyc !== b.cyc || D.seg.action !== b.action)) {
    const s = D.seg; if (s && !s.hurt && s.phase === 2) D.ok[s.action] = D.ok[s.action] || (s.action !== 'tide' || s.ledge);
    D.seg = { action: b.action, cyc: b.cyc, phase: b.phase, hurt: false, ledge: false };
  }
  if (D.seg) { if (hurt) D.seg.hurt = true; if (p.onGround && p.groundC === '=') D.seg.ledge = true; }
  if (b.phase === 2 && b.hands) for (const h of b.hands) if (h.cut) D.cut.add(h.index);
  if (b.phase === 2 && g.events.some(e => e.name === 'bounce') && D.bx.length < 12) D.bx.push(cx(p));
}
export function duelDeeds(g) {
  const id = g.level.id, D = g.dl; if (!D || !g.done) return [];
  const s = D.seg; if (s && !s.hurt && s.phase === 2) D.ok[s.action] = D.ok[s.action] || (s.action !== 'tide' || s.ledge);
  const out = [];
  if (id === 'D-1' && !D.healed) out.push('rosenschliff');
  if (id === 'D-2' && D.ok.tide) out.push('kielbrecher');
  if (id === 'D-3' && D.ok.echo) out.push('zwillingsstimme');
  if (id === 'D-4' && D.ok.palimpsest) out.push('blindzirkel');
  if (id === 'D-5' && D.ok.nova) out.push('sternamboss');
  if (id === 'D-6' && D.cut.size >= 6 && !D.p2hurt) out.push('letztesoehr');
  if (id === 'D-7') { const xs = []; for (const x of D.bx) if (xs.every(o => Math.abs(o - x) >= 32)) xs.push(x); if (xs.length >= 3) out.push('elfenbein'); }
  return out;
}

/* ---------- Darstellung (im Weltkoordinatensystem) ---------- */
export function drawSetFx(x, g, t) {
  const S = g.sx; if (!S) return;
  const line = (x1, y1, x2, y2, col, w = 1) => { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke(); };
  x.save();
  if (S.glass) { x.globalAlpha = 0.55 * S.glass.t / 27 + 0.2; x.fillStyle = '#ffc8dc'; x.fillRect(Math.round(S.glass.x), Math.round(S.glass.y), 10, 14); x.fillStyle = '#c5ffff'; x.fillRect(Math.round(S.glass.x) + 2, Math.round(S.glass.y) + 2, 2, 10); x.globalAlpha = 1; }
  if (S.anchor != null) { const p = g.p; line(cx(p), p.y + 8, cx(p) - p.face * 6, p.y + p.h + 2, '#f3bd72'); x.fillStyle = '#5caeaf'; x.fillRect(Math.round(cx(p) - p.face * 6) - 2, Math.round(p.y + p.h), 5, 2); }
  if (S.wing) { const p = g.p; x.fillStyle = '#ffde84'; for (let k = 0; k < S.wing; k++) x.fillRect(Math.round(cx(p) - 6 + k * 9), Math.round(p.y - 5), 3, 2); }
  for (const pt of S.pts || []) { x.fillStyle = '#ffa293'; x.fillRect(Math.round(pt.x) - 1, Math.round(pt.y) - 1, 3, 3); }
  if (S.tri) { const [a, b, c] = S.tri.pts; x.globalAlpha = 0.25; x.fillStyle = '#d0cdc3'; x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.lineTo(c.x, c.y); x.closePath(); x.fill(); x.globalAlpha = 1; x.strokeStyle = '#f4f0e4'; x.setLineDash([3, 3]); x.stroke(); x.setLineDash([]); }
  if (S.heat) { const p = g.p; x.fillStyle = '#ff8a2a'; for (let k = 0; k < S.heat; k++) x.fillRect(Math.round(cx(p) - 4 + k * 4), Math.round(p.y + 9), 2, 2); }
  if (S.ring) { x.strokeStyle = '#a8efff'; x.globalAlpha = S.ring.t / 18; x.beginPath(); x.arc(S.ring.x, S.ring.y, 32 - S.ring.t, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1; }
  if (S.thread) { const p = g.p, pl = S.thread.pl; line(cx(p), p.y + 6, cx(p) < pl.x + pl.w / 2 ? pl.x : pl.x + pl.w, pl.y, '#fa4055'); }
  if (S.shade) { x.globalAlpha = 0.45; x.fillStyle = '#181320'; x.fillRect(Math.round(S.shade.x) - 2, Math.round(S.shade.y) - 8, 14, 22); x.fillStyle = '#f4dfaf'; x.fillRect(Math.round(S.shade.x) + 2, Math.round(S.shade.y) - 10, 6, 2); x.globalAlpha = 1; }
  if (S.pull && !S.pull.e.dead) { const p = g.p, e = S.pull.e; x.setLineDash([2, 2]); line(cx(p), p.y + 7, cx(e), e.y + e.h / 2, '#48354f', 2); x.setLineDash([]); }
  if (S.tip) { x.fillStyle = (t >> 2) & 1 ? '#ffc8dc' : '#ffffff'; x.fillRect(Math.round(S.tip.x) - 2, Math.round(S.tip.y) - 1, 5, 2); }
  if (S.ret) { x.fillStyle = '#ffffff'; x.fillRect(Math.round(S.ret.x) - 3, Math.round(S.ret.y) - 1, 6, 2); }
  if (S.anch) { x.fillStyle = '#f3bd72'; x.fillRect(Math.round(S.anch.x) - 3, Math.round(S.anch.y) - 4, 7, 4); x.fillStyle = '#3c7a74'; x.fillRect(Math.round(S.anch.x), Math.round(S.anch.y) - 8, 1, 4); }
  if (S.chain) line(S.chain.x1, S.chain.y1, S.chain.x2, S.chain.y2, '#f3bd72');
  if (S.note) { x.strokeStyle = '#ffde84'; x.beginPath(); x.arc(S.note.x, S.note.y, 4 + ((t >> 2) & 1), 0, Math.PI * 2); x.stroke(); }
  if (S.res) line(S.res.x, S.res.y, S.res.x2, S.res.y2, (t >> 1) & 1 ? '#ffde84' : '#ffffff', 2);
  if (S.piv) { x.fillStyle = '#f4f0e4'; x.fillRect(Math.round(S.piv.x) - 1, Math.round(S.piv.y) - 6, 2, 6); }
  if (S.arc) { x.strokeStyle = '#f4f0e4'; x.lineWidth = 2; x.globalAlpha = S.arc.t / 14; x.beginPath(); x.arc(S.arc.x, S.arc.y, 24, Math.PI, Math.PI * 2); x.stroke(); x.globalAlpha = 1; x.lineWidth = 1; }
  if (S.shard) { x.fillStyle = (t >> 3) & 1 ? '#a8efff' : '#ffffff'; x.fillRect(Math.round(S.shard.x) - 2, Math.round(S.shard.y), 5, 6); x.fillRect(Math.round(S.shard.x), Math.round(S.shard.y) - 2, 1, 10); }
  if (S.st1 && !S.st1.e.dead) { const a = S.st1.e, b = S.st1.ax || S.st2; if (b) line(cx(a), a.y + a.h / 2, S.st1.ax ? b.x : cx(b), S.st1.ax ? b.y : b.y + b.h / 2, '#fa4055'); else { x.fillStyle = '#fa4055'; x.fillRect(Math.round(cx(a)) - 1, Math.round(a.y) - 4, 3, 3); } }
  if (S.snap) { x.globalAlpha = S.snap.t / 12; line(S.snap.x, S.snap.y, S.snap.x2, S.snap.y2, '#ffffff', 2); x.globalAlpha = 1; }
  if (S.mark) { x.fillStyle = S.mark.t < 20 && (t >> 1) & 1 ? '#f4dfaf' : '#48354f'; x.fillRect(Math.round(S.mark.x) - 8, Math.round(S.mark.y) - 1, 16, 2); x.globalAlpha = 0.2; x.fillRect(Math.round(S.mark.x) - 8, Math.round(S.mark.y) - 56, 16, 56); x.globalAlpha = 1; }
  if (S.blade) { x.fillStyle = '#f4dfaf'; x.fillRect(Math.round(S.blade.x) - 2, Math.round(S.blade.y) - 56 + (12 - S.blade.t) * 4, 4, 14); }
  x.restore();
}
