// Kern: Konstanten und kleine Helfer, gemeinsam für Spiel und Gegner.

export const T = 16;
export const SOLID = new Set(['#', 'D', 'S', 'B', '^', 'X', 'V', 'R', 'F', 'J', 'c', 'A', 'K', 'I']);
export const GRAV = 0.36, MAXFALL = 6.5, BOUNCE = 5.5;

export const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export const cx = e => e.x + e.w / 2;
export const sign = v => (v < 0 ? -1 : 1);

// kleiner deterministischer Zufall, damit Geister-Läufe reproduzierbar aussehen
// Deterministische Winkelfunktionen: Math.sin darf je nach Browser im letzten Bit abweichen,
// damit wären aufgezeichnete Läufe nicht auf jedem Gerät gleich. Tabelle, auf 1e-7 gerundet.
const SIN_N = 8192, SIN_T = new Float64Array(SIN_N);
for (let i = 0; i < SIN_N; i++) SIN_T[i] = Math.round(Math.sin(i / SIN_N * Math.PI * 2) * 1e7) / 1e7;
export function fsin(a) { let i = Math.round(a / (Math.PI * 2) * SIN_N) % SIN_N; if (i < 0) i += SIN_N; return SIN_T[i]; }
export const fcos = a => fsin(a + Math.PI / 2);
export const fdist = (a, b) => Math.sqrt(a * a + b * b);
// Liste an Ort und Stelle aufräumen (keine neue Liste pro Bild, weniger Arbeit für die Speicherbereinigung)
export function compact(a, keep) { let j = 0; for (let i = 0; i < a.length; i++) if (keep(a[i])) a[j++] = a[i]; a.length = j; }
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
