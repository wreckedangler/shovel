// Tagesschacht: ein gemeinsamer Abstieg pro Tag für alle. Ein Versuch, ein Leben.
// Blutflecken (Todesstellen) und Botschaften anderer liegen im Schacht; ihre Seelen kann man bergen und tiefer tragen.
import { hashSeed, GEN_VERSION } from './gen.js';

const EPOCH = Date.UTC(2026, 10, 25); // Tagesschacht #1 = 25.11.2026
export function dayKey(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function dayNumber(d = new Date()) { return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 864e5) + 1); }
export const daySeed = key => 100000 + (hashSeed('tagesschacht:' + key) % 899999);
// Stufe k (1, 2, 3 …) wird mit der Generator-Tiefe 2k+2 erzeugt: schnell anspruchsvoll, Wächter auf Stufe 4, 9, 14 …
export const stageDepth = k => 2 * k + 2;
export const depthStage = d => (d - 2) / 2;
export function msUntilTomorrow(d = new Date()) { const t = new Date(d); t.setHours(24, 0, 0, 0); return t.getTime() - d.getTime(); }

// Botschaften aus festen Bausteinen (wie Elden Ring): keine freie Eingabe, nichts Anstössiges möglich
export const MSG_A = ['Achtung', 'Trollblock', 'Falle', 'Geheimnis', 'Abgrund', 'Springen', 'Schaufel-Sprung', 'Warten', 'Rennen', 'Schatz', 'Lüge', 'Mut', 'Kein Ausweg', 'Hier ruhte ich'];
export const MSG_B = ['voraus', 'hier', 'oben', 'unten', 'links', 'rechts', '!', '…', '?', 'nicht'];
export const msgText = (a, b) => `${MSG_A[a] || '?'} ${MSG_B[b] || ''}`.trim();

// Kurzer Teilen-Code: Name, Tag, Todesstufe und Stelle, optional eine Botschaft
export function encodeMark(m) {
  const s = JSON.stringify([m.date, m.name, m.k, Math.round(m.x), Math.round(m.y), m.ma ?? -1, m.mb ?? -1, m.mx ?? 0, m.my ?? 0, m.mk ?? 0, GEN_VERSION]);
  return 'SHT.' + btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function decodeMark(code) {
  try {
    const m = /SHT\.([A-Za-z0-9_-]+)/.exec(code); if (!m) return null;
    const b = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const a = JSON.parse(decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4)))));
    if (!Array.isArray(a) || typeof a[0] !== 'string') return null;
    return { date: a[0], name: String(a[1]).slice(0, 16), k: +a[2], x: +a[3], y: +a[4], ma: +a[5], mb: +a[6], mx: +a[7], my: +a[8], mk: +a[9], v: +(a[10] || 1) };
  } catch { return null; }
}

// Ergebnis als Emoji-Zeile: eine Spalte pro Stufe
export function shareText({ num, stage, time, path, carried, code, better }) {
  const row = path.map(p => ({ n: '⛏️', boss: '👑', chase: '🌊', lava: '🔥', dark: '🌑' }[p] || '⛏️')).join('') + '💀';
  return [`SCHAUFELHELD · Tagesschacht #${num}`, `Stufe ${stage} · ${time}${better != null ? ` · besser als ${better} %` : ''}`, row,
    carried ? `🕯️ ${carried} ${carried === 1 ? 'Seele' : 'Seelen'} getragen` : '', `Mein Blutfleck: ${code}`].filter(Boolean).join('\n');
}
