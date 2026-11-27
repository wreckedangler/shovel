// Boss-KI: ein gemeinsames Gehirn für alle Endgegner (Weltbosse, Meisterduelle, Jagd-Anführer).
// Der Boss sieht den Helden mit Reaktionszeit, sagt seine Bewegung voraus, wählt die Attacke, die zur Lage passt,
// hält Abstand oder rückt nach und weicht Schaufel-Sprüngen von oben aus.
// Alles ist deterministisch (Frames und g.rand), damit Wiederholungen und Geister exakt gleich ablaufen.
// Stärke 0–4 kommt aus den Spieloptionen (opt.ai) und steht in jeder Wiederholung.
import { cx } from './core.js';

export const AI_LEVELS = ['Lehrling', 'Knappe', 'Ritter', 'Meister', 'Albtraum'];
export const AI_DEFAULT = 2;
export const AI_HINT = [
  'Langsam, rät oft falsch, weicht nie aus.',
  'Reagiert spät, weicht selten aus.',
  'Standard: liest deine Sprünge, wählt meist die passende Attacke.',
  'Schnelle Reaktion, kurze Pausen, weicht oft aus.',
  'Sieht fast alles voraus. Nur für Tests und Wahnsinnige.',
];
// Fassung 2 (enemyRevision 2) bleibt für alte Wiederholungen eingefroren
const TABLE2 = {
  react: [26, 18, 12, 8, 4],          // so viele Frames alt ist das Bild, das der Boss vom Helden hat
  lead: [0, 0.35, 0.65, 0.85, 1],     // wie weit er deine Bewegung vorausdenkt
  smart: [0.3, 0.55, 0.78, 0.9, 0.97], // wie oft er die passendste Attacke wählt (sonst zufällig gewichtet)
  dodge: [0, 0.2, 0.45, 0.65, 0.8],   // Chance, einem Schaufel-Sprung von oben auszuweichen
  pace: [1.4, 1.18, 1, 0.86, 0.74],   // Erholungszeit nach Attacken
  wind: [1.25, 1.1, 1, 0.92, 0.85],   // Ausholzeit (nie unter der Fairness-Grenze)
  speed: [0.8, 0.9, 1, 1.08, 1.16],   // Laufen und Nachrücken
  hp: [0.8, 0.9, 1, 1.1, 1.2],        // Lebenspunkte der Bosse
};
// Fassung 3: deutlich stärker auf allen Stufen, Bosse springen und verfolgen wie der Held
const TABLE = {
  react: [22, 14, 8, 5, 3],
  lead: [0.2, 0.5, 0.8, 0.95, 1],
  smart: [0.4, 0.65, 0.85, 0.95, 0.99],
  dodge: [0.1, 0.35, 0.6, 0.8, 0.92],
  pace: [1.25, 1.05, 0.88, 0.75, 0.62],
  wind: [1.2, 1.05, 0.94, 0.86, 0.8],
  speed: [0.9, 1, 1.12, 1.22, 1.32],
  hp: [0.8, 0.9, 1, 1.1, 1.2],
  leap: [0.15, 0.35, 0.6, 0.8, 0.95],  // Chance, dem Helden auf höhere Absätze nachzuspringen
};
const clampLevel = l => (Number.isInteger(l) && l >= 0 && l < AI_LEVELS.length ? l : AI_DEFAULT);
export function brain(g) {
  const l = clampLevel(g.aiLevel), v = g.enemyRevision >= 3 ? 3 : 2;
  if (g._ai && g._ai.level === l && g._ai.v === v) return g._ai;
  const o = { level: l, v }, T = v >= 3 ? TABLE : TABLE2;
  for (const k in T) o[k] = T[k][l];
  if (!o.leap) o.leap = 0;
  return (g._ai = o);
}
export const aiLevelOf = v => clampLevel(v);

// Wahrnehmung mit Verzögerung: der Verlauf wird einmal pro Frame fortgeschrieben
export function sense(g, e) {
  const A = brain(g), p = g.p;
  if (g._aiF !== g.frame) {
    g._aiF = g.frame;
    const h = g._aiH || (g._aiH = []);
    h.push({ x: cx(p), y: p.y + p.h / 2, top: p.y, vx: p.vx, vy: p.vy, ground: !!p.onGround, pogo: !!p.pogo, atk: p.atk > 0 });
    if (h.length > 40) h.shift();
  }
  const h = g._aiH, s = h[Math.max(0, h.length - 1 - A.react)];
  const dx = s.x - cx(e), dist = Math.abs(dx);
  const above = dist < e.w / 2 + 14 && s.top + 14 < e.y + 4;
  return { ...s, dx, dist, dy: s.y - (e.y + e.h / 2), above, air: !s.ground, A, dir: dx < 0 ? -1 : 1 };
}
// Wo ist der Held in n Frames? (horizontal, mit der Vorhersage-Stärke gewichtet)
export const predictX = (s, n) => s.x + s.vx * n * s.A.lead;

// Attacke wählen: opts = { id: Gewicht } (Zahl ≥ 0, aus der Lage berechnet).
// Dieselbe Attacke dreimal hintereinander wird stark abgewertet, damit Bosse nicht stur wirken.
export function choose(g, e, opts) {
  const A = brain(g);
  const list = [];
  for (const id in opts) {
    let s = Math.max(0, +opts[id] || 0);
    if (id === e.lastAct) s *= id === e.lastAct2 ? 0.15 : 0.6;
    if (s > 0) list.push({ id, s });
  }
  if (!list.length) return Object.keys(opts)[0];
  let pick = list[0];
  if (g.rand() < A.smart) { for (const o of list) if (o.s > pick.s) pick = o; }
  else {
    let r = g.rand() * list.reduce((a, o) => a + o.s, 0);
    for (const o of list) { r -= o.s; if (r <= 0) { pick = o; break; } }
  }
  e.lastAct2 = e.lastAct; e.lastAct = pick.id;
  return pick.id;
}
// Ausweichen: der Held fällt mit der Schaufel voran auf den Boss zu. Pro Anflug wird nur einmal gewürfelt.
export function dodgeDir(g, e, s) {
  const coming = s.above && s.air && s.vy > 0 && (s.pogo || s.vy > 1.5);
  if (!coming) { e.dodgeRoll = false; return 0; }
  if (e.dodgeRoll) return 0;
  e.dodgeRoll = true;
  if ((e.dodgeCd || 0) > g.frame || g.rand() >= s.A.dodge) return 0;
  e.dodgeCd = g.frame + 70;
  return s.dx > 0 ? -1 : 1;
}
// Zeiten an die Stärke anpassen
export const windT = (g, t, min = 14) => Math.max(min, Math.round(t * brain(g).wind));
export const restT = (g, t, min = 10) => Math.max(min, Math.round(t * brain(g).pace));
// Weich auf eine Zielgeschwindigkeit zusteuern (Beschleunigen statt Ruckeln)
export const steer = (v, target, acc = 0.12) => (Math.abs(target - v) <= acc ? target : v + Math.sign(target - v) * acc);

// Sprung wie der Held: steht der Held auf einem höheren Absatz, springt der Boss hinterher (Fassung 3).
// Gibt true zurück, wenn gesprungen wurde. Höhe: so viel, dass er knapp über dem Absatz landet (höchstens etwa 5 Kacheln).
export function chaseJump(g, e, s, power = 1) {
  if (g.enemyRevision < 3 || !e.onGround || !s.ground || s.dy > -20 || s.dist > 150) return false;
  if ((e.jumpCd || 0) > g.frame) return false;
  e.jumpCd = g.frame + 40;
  if (g.rand() >= s.A.leap) return false;
  const rise = -s.dy + e.h / 2 + 10, vy = Math.min(8.4, Math.sqrt(2 * 0.36 * rise)) * power, air = 2 * vy / 0.36;
  e.vy = -vy; e.vx = Math.max(-3.2, Math.min(3.2, (predictX(s, air * 0.6) - (e.x + e.w / 2)) / (air * 0.6)));
  e.air2 = s.A.level >= 3;   // ab Meister: Doppelsprung in der Luft
  g.ev('boing'); return true;
}
// Zweiter Sprung in der Luft, falls der erste nicht reicht (wie der Held)
export function airJump(g, e, s) {
  if (!e.air2 || e.onGround || e.vy < 0 || s.dy > -8) return;
  e.air2 = false; e.vy = -5.2; e.vx += Math.sign(s.dx) * 0.8; g.burst(e.x + e.w / 2, e.y + e.h, 8, 'dust', 1.4);
}
