// Weltbosse, neue Fassung (enemyRevision 2): gesteuert vom Boss-Gehirn (brain.js).
// Sie lesen deine Position mit Reaktionszeit, zielen auf die vorhergesagte Stelle, halten Abstand,
// weichen Schaufel-Sprüngen aus und verketten Attacken, wenn sie angeschlagen sind.
// Jede Attacke hat weiterhin eine sichtbare Ausholzeit; nach den grossen Attacken folgt eine Strafpause.
import { T, GRAV, MAXFALL, cx, sign } from './core.js';
import { eproj, rock, blorbAt } from './foes.js';
import { sense, predictX, choose, dodgeDir, windT, restT, steer, brain, chaseJump, airJump } from './brain.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Flugzeit bis zur Höhe dy unter dem Start (Wurf mit Anfangsgeschwindigkeit vy, Schwerkraft a)
const flight = (vy, a, dy) => (-vy + Math.sqrt(Math.max(0, vy * vy + 2 * a * dy))) / a;
const bounds = (g, e) => [(g.level.gate + 1) * T, (g.w - 1) * T - e.w];
function grav(g, e) { e.vy = Math.min(MAXFALL, e.vy + GRAV); g.moveX(e); g.moveY(e); }
function dying(g, e, kind, gems, goalY) {
  e.vx = 0; grav(g, e);
  if (e.t % 8 === 0) { g.burst(e.x + g.rand() * e.w, e.y + g.rand() * e.h, 10, kind, 2.5, 0, 24); g.ev('boom'); g.shake = 6; }
  if (--e.t <= 0) {
    e.dead = true; g.dropGems(cx(e), e.y, gems);
    g.add({ type: 'goal', x: Math.round(cx(e) / T) * T + 2, y: goalY(e), w: 12, h: 48 });
    g.setGate('.'); g.ev('win2');
  }
}
// Seitlicher Ausweichhüpfer (gemeinsam für alle Weltbosse)
function evade(g, e, d) {
  const [lo, hi] = bounds(g, e);
  if ((d < 0 && e.x - lo < 30) || (d > 0 && hi - e.x < 30)) d = -d;   // nicht in die Wand ausweichen
  e.state = 'evade'; e.vx = d * 2.7; e.vy = -3.4; e.face = -d; e.t = 0; g.ev('boing'); g.burst(cx(e), e.y + e.h, 8, 'dust', 1.6);
}

// Nachspringen (Fassung 3): wie der Held auf Absätze, mit Doppelsprung ab Meister
function jumpState(g, e, s) {
  grav(g, e); airJump(g, e, s);
  if (e.onGround && e.vy >= 0) { e.vx = 0; e.state = 'walk'; e.t = Math.min(e.t || 30, restT(g, 16, 8)); g.shake = Math.max(g.shake, 3); }
}
/* ---------- Rostmaulwurf ---------- */
export function moleAI(g, e) {
  if (e.iframe) e.iframe--; if (e.flash) e.flash--;
  const s = sense(g, e), A = s.A, rage = e.hp <= e.maxhp / 2, sp = A.speed * (rage ? 1.25 : 1);
  switch (e.state) {
    case 'idle': grav(g, e); return;
    case 'roar': e.vx = 0; grav(g, e); if (e.t % 10 === 0) g.shake = 3; if (--e.t <= 0) { e.state = 'walk'; e.t = 50; } return;
    case 'walk': {
      e.face = s.dir;
      // Abstand halten: nah genug für den Ansturm, nicht so nah, dass man ihn einfach bespringt
      const want = s.dist > 120 ? 1 : s.dist < 44 ? -0.8 : 0.35;
      e.vx = steer(e.vx, s.dir * want * 0.9 * sp, 0.1); grav(g, e);
      const d = dodgeDir(g, e, s); if (d && e.onGround) return evade(g, e, d);
      if (chaseJump(g, e, s)) { e.state = 'jump'; return; }
      if (--e.t <= 0 && e.onGround) {
        const act = choose(g, e, {
          charge: (s.air ? 0.4 : 1.4) + (s.dist > 70 ? 0.6 : 0),
          dig: 0.7 + (s.air ? 0.9 : 0) + (s.dist < 50 ? 0.5 : 0),
          slam: 0.5 + (s.dist > 110 ? 0.9 : 0) + (rage ? 0.4 : 0),
          pounce: g.enemyRevision >= 3 ? 0.6 + (s.air || s.dy < -16 ? 1.2 : 0) + (s.dist < 90 ? 0.4 : 0) : 0,
        });
        if (act === 'pounce') { const air = 2 * 7 / GRAV; e.state = 'pounce'; e.vy = -7; e.vx = clamp((predictX(s, air) - cx(e)) / air, -3, 3); e.air2 = brain(g).level >= 3; g.ev('charge'); return; }
        if (act === 'charge') { e.state = 'wind'; e.t = windT(g, 34, 20); }
        else if (act === 'dig') { e.state = 'sink'; e.t = windT(g, 34, 22); }
        else { e.state = 'slamwind'; e.t = windT(g, 30, 20); e.vy = -4.2; }
      }
      return;
    }
    case 'evade': grav(g, e); if (e.onGround) { e.vx = 0; e.state = 'walk'; e.t = Math.min(e.t || 99, restT(g, 22, 12)); } return;
    case 'jump': return jumpState(g, e, s);
    case 'pounce':
      // Sprungangriff wie ein Schaufel-Sprung: hoch über den Helden und mit Wucht herab
      grav(g, e); airJump(g, e, s);
      if (e.vy > 0 && Math.abs(s.dx) < 10) e.vx *= 0.6;
      if (e.onGround && e.vy >= 0) { e.vx = 0; g.shake = 8; g.ev('thud'); for (const dd of [-1, 1]) g.add(eproj(cx(e) - 6 + dd * 12, e.y + e.h - 10, dd * 2.8, 0, 'shock')); e.state = 'stun'; e.t = restT(g, 40, 22); }
      return;
    case 'wind':
      e.vx = 0; grav(g, e);
      // Bis kurz vor dem Ansturm wird nachgezielt, danach steht die Richtung fest
      if (e.t > 10) e.face = sign(predictX(s, 24) - cx(e)) || e.face;
      if (--e.t <= 0) { e.state = 'charge'; e.t = 0; e.feint = A.level >= 3 && g.rand() < 0.3; g.ev('charge'); }
      return;
    case 'charge':
      e.vx = e.face * 3.3 * (rage ? 1.3 : 1); grav(g, e); e.t++;
      // Finte: bremst kurz ab und setzt in deine neue Richtung nach
      if (e.feint && e.t === 22) { e.feint = false; e.state = 'wind'; e.t = windT(g, 16, 12); e.vx = 0; g.burst(cx(e), e.y + e.h, 10, 'dust', 2); return; }
      if (e.hitWall) {
        e.state = 'stun'; e.t = restT(g, 70, 40); g.shake = 9; g.ev('thud');
        for (let k = 0; k < (rage ? 5 : 3); k++) {
          const near = k < 2 ? predictX(s, 40) + (k ? 30 : -30) : (g.level.gate + 2 + Math.floor(g.rand() * 22)) * T;
          g.add(rock(clamp(near, (g.level.gate + 1) * T, (g.w - 2) * T), 2 * T + 2, 16 + k * 14));
        }
      }
      return;
    case 'stun': e.vx = 0; grav(g, e); if (--e.t <= 0) { e.state = 'walk'; e.t = restT(g, 40, 20); } return;
    case 'slamwind':
      grav(g, e); e.vx = 0;
      if (e.onGround && e.vy >= 0) {
        g.shake = 7; g.ev('thud'); g.burst(cx(e), e.y + e.h, 16, 'dirt', 2.4);
        // Gesteinsregen gezielt auf deine Laufbahn
        const at = predictX(s, 45);
        for (let k = 0; k < (rage ? 4 : 3); k++) g.add(rock(clamp(at + (k - 1) * 34, (g.level.gate + 1) * T, (g.w - 2) * T), 2 * T + 2, 10 + k * 12));
        e.state = 'stun'; e.t = restT(g, 46, 26);
      }
      return;
    case 'sink':
      e.vx = 0; if (e.t % 4 === 0) g.burst(cx(e), e.y + e.h, 3, 'dirt', 1.5);
      if (--e.t <= 0) { e.state = 'under'; e.hidden = true; e.t = 64; }
      return;
    case 'under':
      // folgt deinem Schatten unter der Erde und taucht dort auf, wo du landen wirst
      e.tx = clamp(predictX(s, 30), (g.level.gate + 1) * T, (g.w - 1) * T);
      if (e.t < 34 && e.t % 3 === 0) g.burst(e.tx, 11 * T, 2, 'dirt', 1.4);
      if (e.t === 34) { g.ev('rumble'); e.lock = e.tx; }
      if (e.t < 34) e.tx = e.lock;   // ab dem Grollen steht die Stelle fest
      if (--e.t <= 0) {
        e.hidden = false; e.x = clamp(e.tx - e.w / 2, (g.level.gate + 1) * T, (g.w - 1) * T - e.w);
        e.y = 11 * T - e.h; e.vy = -6.5; e.state = 'pop'; g.shake = 7; g.ev('pop');
        g.burst(cx(e), 11 * T, 20, 'dirt', 3);
      }
      return;
    case 'pop':
      grav(g, e);
      if (e.onGround) { e.vx = 0; if (rage && g.rand() < 0.5) { e.state = 'wind'; e.t = windT(g, 26, 18); } else { e.state = 'stun'; e.t = restT(g, 40, 24); } }
      return;
    case 'dying': return dying(g, e, 'poof', 300, () => 11 * T - 48);
  }
}

/* ---------- Pendelwerk ---------- */
export function golemAI(g, e) {
  if (e.iframe) e.iframe--; if (e.flash) e.flash--;
  const s = sense(g, e), A = s.A, rage = e.hp <= e.maxhp / 2, sp = A.speed * (rage ? 1.2 : 1);
  switch (e.state) {
    case 'idle': grav(g, e); return;
    case 'roar': e.vx = 0; grav(g, e); if (e.t % 10 === 0) g.shake = 3; if (--e.t <= 0) { e.state = 'walk'; e.t = 50; } return;
    case 'walk': {
      e.face = s.dir;
      const want = s.dist > 130 ? 0.9 : s.dist < 50 ? -0.9 : 0.25;
      e.vx = steer(e.vx, s.dir * want * 0.8 * sp, 0.08); grav(g, e);
      const d = dodgeDir(g, e, s); if (d && e.onGround) return evade(g, e, d);
      if (chaseJump(g, e, s)) { e.state = 'jump'; return; }
      if (--e.t <= 0 && e.onGround) {
        const act = choose(g, e, {
          leap: 0.8 + (s.dist > 90 ? 0.6 : 0) + (s.air ? 0 : 0.4),
          throw: 0.6 + (s.dist > 70 ? 0.9 : 0),
          sweep: (s.air ? 0.2 : 1.1) + (s.dist < 120 ? 0.5 : 0) + (rage ? 0.3 : 0),
        });
        e.state = act === 'leap' ? 'crouch' : act === 'throw' ? 'throw' : 'swing';
        e.t = act === 'leap' ? windT(g, 26, 18) : act === 'throw' ? 36 : windT(g, 28, 20);
      }
      return;
    }
    case 'evade': grav(g, e); if (e.onGround) { e.vx = 0; e.state = 'walk'; e.t = restT(g, 20, 10); } return;
    case 'jump': return jumpState(g, e, s);
    case 'crouch':
      e.vx = 0; grav(g, e);
      if (--e.t <= 0) {
        // Sprung auf die Stelle, an der du in 40 Frames sein wirst
        const air = 2 * 7.2 / GRAV, tx = predictX(s, air);
        e.state = 'leap'; e.vy = -7.2; e.vx = clamp((tx - cx(e)) / air, -2.8, 2.8); g.ev('charge');
      }
      return;
    case 'leap':
      grav(g, e); if (e.hitWall) e.vx = 0;
      if (e.onGround) {
        e.state = 'tired'; e.t = restT(g, 72, 40); g.shake = 9; g.ev('thud'); g.freeze = Math.max(g.freeze, 4);
        for (const d of [-1, 1]) g.add(eproj(cx(e) - 6 + d * 12, e.y + e.h - 10, d * 3 * (rage ? 1.3 : 1), 0, 'shock'));
      }
      return;
    case 'throw':
      e.vx = 0; e.face = s.dir; grav(g, e);
      if (e.t % 10 === 0 && e.t > 0 && (e.t <= 30 || rage)) {
        // Zahnräder im Bogen auf deine vorhergesagte Position, leicht gestreut
        const vy = -3.8, a = GRAV * 0.8, fly = flight(vy, a, Math.max(4, s.y - (e.y + 2))), k = (e.t / 10) % 3;
        const tx = predictX(s, fly) + (k - 1) * 18;
        g.add(eproj(cx(e) - 6, e.y + 2, clamp((tx - cx(e)) / fly, -3.2, 3.2), vy, 'gear')); g.ev('swing');
      }
      if (--e.t <= 0) { e.state = 'walk'; e.t = restT(g, 60, 30); }
      return;
    case 'swing':
      // Pendelschlag: Ausholen, dann ein schneller Schwung quer durch die Halle
      e.vx = 0; grav(g, e); if (e.t > 8) e.face = s.dir;
      if (--e.t <= 0) { e.state = 'sweep'; e.t = 46; g.ev('charge'); }
      return;
    case 'sweep':
      e.vx = e.face * 3.4 * (rage ? 1.15 : 1); grav(g, e);
      if (e.hitWall || --e.t <= 0) { e.vx = 0; e.state = 'tired'; e.t = restT(g, 52, 30); if (e.hitWall) { g.shake = 6; g.ev('thud'); } }
      return;
    case 'tired': e.vx = 0; grav(g, e); if (--e.t <= 0) { e.state = 'walk'; e.t = restT(g, 36, 18); } return;
    case 'dying': return dying(g, e, 'spark', 400, b => b.y + b.h - 48);
  }
}

/* ---------- Morchelmutter ---------- */
export function morchelAI(g, e) {
  if (e.iframe) e.iframe--; if (e.flash) e.flash--;
  const s = sense(g, e), A = s.A, rage = e.hp <= e.maxhp / 2, sp = A.speed * (rage ? 1.2 : 1);
  switch (e.state) {
    case 'idle': grav(g, e); return;
    case 'roar': e.vx = 0; grav(g, e); if (e.t % 10 === 0) g.shake = 3; if (--e.t <= 0) { e.state = 'walk'; e.t = 40; } return;
    case 'walk': {
      e.face = s.dir;
      // die Morchelmutter hüpft beim Laufen und hält lieber etwas Abstand
      const want = s.dist > 140 ? 0.8 : s.dist < 60 ? -0.9 : 0;
      e.vx = steer(e.vx, s.dir * want * 0.7 * sp, 0.08); grav(g, e);
      if (e.onGround && g.frame % 28 === 0) { e.vy = -2.2; }
      const d = dodgeDir(g, e, s); if (d && e.onGround) return evade(g, e, d);
      if (chaseJump(g, e, s)) { e.state = 'jump'; return; }
      if (--e.t <= 0 && e.onGround) {
        const blorbs = g.ents.filter(o => o.type === 'blorb' && !o.dead).length;
        const act = choose(g, e, {
          hop: 0.9 + (s.air ? 0 : 0.6) + (s.dist > 80 ? 0.4 : 0),
          volley: 0.7 + (s.dist > 90 ? 0.8 : 0),
          summon: blorbs < 2 ? 0.5 + (s.dist > 120 ? 0.6 : 0) : 0,
          retreat: s.dist < 50 ? 1.6 : 0,
        });
        e.state = act; e.t = act === 'summon' ? 30 : act === 'volley' ? 30 : act === 'retreat' ? 0 : windT(g, 16, 10);
        e.hops = rage ? 4 : 3;
        if (act === 'retreat') { e.vy = -5.6; e.vx = -s.dir * 2.4; g.ev('boing'); }
      }
      return;
    }
    case 'jump': return jumpState(g, e, s);
    case 'evade': case 'retreat':
      grav(g, e);
      if (e.onGround) {
        e.vx = 0;
        // nach dem Rückzug sofort eine Sporensalve hinterher
        if (e.state === 'retreat') { e.state = 'volley'; e.t = 30; } else { e.state = 'walk'; e.t = restT(g, 18, 8); }
      }
      return;
    case 'hop':
      grav(g, e);
      if (e.onGround) {
        e.vx = 0;
        if (e.landed) {
          e.landed = false; g.shake = 6; g.ev('thud');
          for (const d of [-1, 1]) g.add(eproj(cx(e) - 6 + d * 12, e.y + e.h - 10, d * 2.6 * (rage ? 1.3 : 1), 0, 'shock'));
          if (--e.hops <= 0) { e.state = 'tired'; e.t = restT(g, 62, 34); return; }
        }
        if (--e.t <= 0) {
          const air = 2 * 6.4 / GRAV, tx = predictX(s, air);
          e.vy = -6.4; e.vx = clamp((tx - cx(e)) / air, -2.6, 2.6); e.landed = true; e.t = windT(g, 14, 8); g.ev('boing');
        }
      }
      return;
    case 'volley':
      e.vx = 0; grav(g, e);
      if (e.t % 6 === 0 && e.t > 0) {
        // Fächer um die Stelle, an der du sein wirst
        const k = (30 - e.t) / 6, vy = -4.4, fly = flight(vy, 0.18, Math.max(4, s.y - e.y));
        const tx = predictX(s, fly) + (k - 2) * 22 * (rage ? 1.2 : 1);
        g.add(eproj(cx(e) - 3, e.y, clamp((tx - cx(e)) / fly, -3, 3), vy, 'spore')); g.ev('blob');
      }
      if (--e.t <= 0) { e.state = 'walk'; e.t = restT(g, 56, 28); }
      return;
    case 'summon':
      e.vx = 0; grav(g, e);
      if (e.t === 15) for (const d of [-1, 1]) { const b = blorbAt(cx(e) + d * 24, e.y + 10); b.vy = -3; g.add(b); }
      if (--e.t <= 0) { e.state = 'walk'; e.t = restT(g, 50, 24); }
      return;
    case 'tired': e.vx = 0; grav(g, e); if (--e.t <= 0) { e.state = 'walk'; e.t = restT(g, 40, 20); } return;
    case 'dying': return dying(g, e, 'spore', 500, b => b.y + b.h - 48);
  }
}

// Lebenspunkte der neuen Fassung (vor der Stärke-Anpassung): weniger Leben, dafür klügere Bosse
export const BOSS_HP2 = { mole: 20, golem: 26, morchel: 30 };
export const bossHpMul = g => brain(g).hp;
