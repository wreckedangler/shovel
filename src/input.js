// Eingabe: Tastatur, Touch-Knöpfe (mit Darübergleiten) und Gamepad.
const KEYS = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowDown: 'down', KeyS: 'down',
  Space: 'jump', KeyZ: 'jump', KeyK: 'jump', ArrowUp: 'jump', KeyW: 'jump',
  KeyX: 'attack', KeyJ: 'attack', KeyC: 'attack',
};
const NAMES = ['left', 'right', 'down', 'jump', 'attack'];
const kb = {}, touch = {}, prev = {}, latch = {};

export const input = { left: false, right: false, down: false, jump: false, attack: false, jumpP: false, attackP: false };

export function initInput(touchEl, onAny) {
  addEventListener('keydown', e => { const k = KEYS[e.code]; if (k) { if (!kb[k]) latch[k] = true; kb[k] = true; e.preventDefault(); } onAny && onAny(e); });
  addEventListener('keyup', e => { const k = KEYS[e.code]; if (k) kb[k] = false; });
  addEventListener('blur', () => { for (const k in kb) kb[k] = false; });

  const btns = [...touchEl.querySelectorAll('[data-k]')];
  const update = (e) => {
    e.preventDefault();
    const was = { ...touch };
    for (const n of NAMES) touch[n] = false;
    const rects = btns.map(b => [b, b.getBoundingClientRect()]);
    for (const t of e.touches) {
      let best = null, bd = 1e9;
      for (const [b, r] of rects) {
        const pad = 18, x = t.clientX, y = t.clientY;
        if (x < r.left - pad || x > r.right + pad || y < r.top - pad || y > r.bottom + pad) continue;
        const d = (x - (r.left + r.right) / 2) ** 2 + (y - (r.top + r.bottom) / 2) ** 2;
        if (d < bd) { bd = d; best = b; }
      }
      if (best) { if (!touch[best.dataset.k] && !was[best.dataset.k]) latch[best.dataset.k] = true; touch[best.dataset.k] = true; }
    }
    for (const b of btns) b.classList.toggle('on', !!touch[b.dataset.k]);
    onAny && onAny(e);
  };
  for (const ev of ['touchstart', 'touchmove', 'touchend', 'touchcancel']) touchEl.addEventListener(ev, update, { passive: false });
}

export function pollInput() {
  const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
  const gp = {};
  if (pad) {
    const ax = pad.axes[0] || 0, ay = pad.axes[1] || 0, b = i => pad.buttons[i] && pad.buttons[i].pressed;
    gp.left = ax < -0.4 || b(14); gp.right = ax > 0.4 || b(15); gp.down = ay > 0.5 || b(13);
    gp.jump = b(0); gp.attack = b(2) || b(1);
  }
  for (const n of NAMES) {
    const v = !!(kb[n] || touch[n] || gp[n]);
    input[n] = v;
    if (n === 'jump') input.jumpP = (v && !prev.jump) || !!latch.jump;
    if (n === 'attack') input.attackP = (v && !prev.attack) || !!latch.attack;
    latch[n] = false;
    prev[n] = v;
  }
  return input;
}
export function clearInput() { for (const n of NAMES) { kb[n] = false; touch[n] = false; prev[n] = true; latch[n] = false; } }
