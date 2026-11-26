// Live-Duelle: zwei Spieler, ein Kampf, über Supabase Realtime (Broadcast + Presence).
// Netzmodell „Lockstep mit Eingabeverzögerung“: Beide Geräte rechnen exakt dasselbe Duell
// (deterministische Engine) und tauschen nur die Tasteneingaben aus. Eine Eingabe gilt erst
// D Bilder später, damit sie rechtzeitig beim Gegner ankommt. Fehlt sie trotzdem, wartet das Spiel kurz.
import { Match } from './arena.js';
import { cleanName } from './names.js';
// Angaben des Gegners kommen ungeprüft übers Netz: Name filtern, Wertung begrenzen
const safePeer = p => ({ ...p, name: (cleanName(p && p.name).name || 'Namenlos'), rating: Math.max(0, Math.min(3000, Math.round(+(p && p.rating) || 1000))) });

export const LIVE_PROTOCOL = 1;
const pack = i => (i.left ? 1 : 0) | (i.right ? 2 : 0) | (i.down ? 4 : 0) | (i.jump ? 8 : 0) | (i.attack ? 16 : 0) | (i.jumpP ? 32 : 0) | (i.attackP ? 64 : 0);
export const unpack = b => ({ left: !!(b & 1), right: !!(b & 2), down: !!(b & 4), jump: !!(b & 8), attack: !!(b & 16), jumpP: !!(b & 32), attackP: !!(b & 64) });
export const randomId = (n = 10) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map(v => 'abcdefghijkmnpqrstuvwxyz23456789'[v % 32]).join(''); };
export const roomCode = () => { const a = new Uint8Array(4); crypto.getRandomValues(a); return [...a].map(v => 'ABCDEFGHJKLMNPQRSTUVWXYZ'[v % 24]).join(''); };

/* ---------- Verbindung: Supabase Realtime (Phoenix-Protokoll über WebSocket) ---------- */
export class RealtimeSocket {
  constructor(url, key) {
    this.url = url.replace(/^http/, 'ws') + `/realtime/v1/websocket?apikey=${encodeURIComponent(key)}&vsn=1.0.0`;
    this.key = key; this.ref = 0; this.chans = new Map(); this.open = false; this.queue = []; this.closed = false;
  }
  connect() {
    if (this.ws) return this.ready;
    this.ready = new Promise((res, rej) => {
      const ws = this.ws = new WebSocket(this.url);
      const to = setTimeout(() => rej(new Error('Zeitüberschreitung')), 8000);
      ws.onopen = () => { clearTimeout(to); this.open = true; for (const m of this.queue) ws.send(m); this.queue = []; res(); };
      ws.onerror = () => { clearTimeout(to); rej(new Error('Keine Verbindung')); };
      ws.onclose = () => { this.open = false; if (!this.closed) for (const c of this.chans.values()) c.onClose && c.onClose(); };
      ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch { return; } const c = this.chans.get(m.topic); if (c) c.handle(m); };
    });
    this.hb = setInterval(() => this.raw({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++this.ref) }), 25000);
    return this.ready;
  }
  raw(m) { const s = JSON.stringify(m); if (this.open) this.ws.send(s); else this.queue.push(s); }
  channel(name, opts = {}) { const c = new Channel(this, 'realtime:' + name, opts); this.chans.set(c.topic, c); return c; }
  close() { this.closed = true; clearInterval(this.hb); for (const c of this.chans.values()) c.leave(); try { this.ws && this.ws.close(); } catch {} }
}
class Channel {
  constructor(sock, topic, opts) { this.s = sock; this.topic = topic; this.opts = opts; this.handlers = {}; this.presence = {}; this.joined = false; }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); return this; }
  emit(ev, p) { for (const fn of this.handlers[ev] || []) fn(p); }
  join() {
    return new Promise((res, rej) => {
      const ref = String(++this.s.ref); this.joinRef = ref;
      this.waitJoin = { res, rej, t: setTimeout(() => rej(new Error('Kanal antwortet nicht')), 8000) };
      this.s.raw({ topic: this.topic, event: 'phx_join', ref, join_ref: ref, payload: { config: { broadcast: { self: false, ack: false }, presence: { key: this.opts.key || '' }, private: false }, access_token: this.s.key } });
    });
  }
  handle(m) {
    if (m.event === 'phx_reply' && this.waitJoin && m.ref === this.joinRef) {
      clearTimeout(this.waitJoin.t);
      if (m.payload && m.payload.status === 'ok') { this.joined = true; this.waitJoin.res(); } else this.waitJoin.rej(new Error('Beitritt abgelehnt'));
      this.waitJoin = null; return;
    }
    if (m.event === 'broadcast' && m.payload) return this.emit(m.payload.event, m.payload.payload || {});
    if (m.event === 'presence_state') { this.presence = {}; for (const [k, v] of Object.entries(m.payload || {})) this.presence[k] = (v.metas || [])[0] || {}; return this.emit('presence', this.presence); }
    if (m.event === 'presence_diff') {
      for (const [k, v] of Object.entries((m.payload || {}).joins || {})) this.presence[k] = (v.metas || [])[0] || {};
      for (const k of Object.keys((m.payload || {}).leaves || {})) delete this.presence[k];
      return this.emit('presence', this.presence);
    }
    if (m.event === 'phx_error' || m.event === 'phx_close') this.onClose && this.onClose();
  }
  send(event, payload) { this.s.raw({ topic: this.topic, event: 'broadcast', ref: String(++this.s.ref), join_ref: this.joinRef, payload: { type: 'broadcast', event, payload } }); }
  track(meta) { this.s.raw({ topic: this.topic, event: 'presence', ref: String(++this.s.ref), join_ref: this.joinRef, payload: { type: 'presence', event: 'track', payload: meta } }); }
  untrack() { this.s.raw({ topic: this.topic, event: 'presence', ref: String(++this.s.ref), join_ref: this.joinRef, payload: { type: 'presence', event: 'untrack' } }); }
  leave() { if (!this.joined) return; this.joined = false; this.s.raw({ topic: this.topic, event: 'phx_leave', ref: String(++this.s.ref), join_ref: this.joinRef, payload: {} }); this.s.chans.delete(this.topic); }
}

/* ---------- Ersatzverbindung zum Testen (zwei Tabs im selben Browser) ---------- */
export class LocalSocket {
  constructor() { this.chans = new Map(); }
  connect() { return Promise.resolve(); }
  channel(name, opts = {}) {
    const bc = new BroadcastChannel('sh-' + name), me = opts.key || randomId(), c = { handlers: {}, presence: {}, joined: false };
    const emit = (ev, p) => { for (const fn of c.handlers[ev] || []) fn(p); };
    let meta = null;
    bc.onmessage = ({ data: d }) => {
      if (d.k === 'b') emit(d.ev, d.p);
      else if (d.k === 'track') { c.presence[d.id] = d.meta; emit('presence', c.presence); if (meta && !d.echo) bc.postMessage({ k: 'track', id: me, meta, echo: true }); }
      else if (d.k === 'untrack') { delete c.presence[d.id]; emit('presence', c.presence); }
    };
    Object.assign(c, {
      on(ev, fn) { (c.handlers[ev] = c.handlers[ev] || []).push(fn); return c; },
      join() { c.joined = true; return Promise.resolve(); },
      send(ev, p) { bc.postMessage({ k: 'b', ev, p }); },
      track(m) { meta = m; c.presence[me] = m; bc.postMessage({ k: 'track', id: me, meta: m }); emit('presence', c.presence); },
      untrack() { meta = null; delete c.presence[me]; bc.postMessage({ k: 'untrack', id: me }); },
      leave() { if (meta) c.untrack(); c.joined = false; bc.close(); },
    });
    return c;
  }
  close() {}
}

/* ---------- Halle: passende Gegner finden ---------- */
// Wer die kleinere Kennung hat, lädt ein. Der Eingeladene nimmt an, wenn er frei ist.
export class Lobby {
  constructor(sock, me, cb) { this.s = sock; this.me = me; this.cb = cb; this.pending = null; this.done = false; }
  async start() {
    const ch = this.ch = this.s.channel(`sh-lobby-${LIVE_PROTOCOL}`, { key: this.me.id });
    ch.on('presence', p => { this.cb.count && this.cb.count(Object.keys(p).length); this.think(); });
    ch.on('invite', m => {
      if (m.to !== this.me.id || this.done) return;
      if (this.pending && this.pending.to !== m.from) { ch.send('decline', { to: m.from, from: this.me.id }); return; }
      this.done = true; clearTimeout(this.pending && this.pending.t);
      ch.send('accept', { to: m.from, from: this.me.id, room: m.room });
      this.finish({ room: m.room, host: false, peer: m.from });
    });
    ch.on('accept', m => { if (m.to === this.me.id && this.pending && this.pending.to === m.from && !this.done) { this.done = true; clearTimeout(this.pending.t); this.finish({ room: this.pending.room, host: true, peer: m.from }); } });
    ch.on('decline', m => { if (m.to === this.me.id && this.pending && this.pending.to === m.from) { clearTimeout(this.pending.t); this.pending = null; } });
    await ch.join();
    ch.track({ name: this.me.name, rating: this.me.rating, v: this.me.v, t: Date.now() });
    this.iv = setInterval(() => this.think(), 1500);
  }
  think() {
    if (this.done || this.pending || !this.ch) return;
    const others = Object.entries(this.ch.presence).filter(([id, m]) => id !== this.me.id && m && m.v === this.me.v)
      .sort((a, b) => Math.abs(a[1].rating - this.me.rating) - Math.abs(b[1].rating - this.me.rating));
    const best = others.find(([id]) => this.me.id < id);
    if (!best) return;
    const room = `${this.me.id}-${best[0]}`;
    this.pending = { to: best[0], room, t: setTimeout(() => { this.pending = null; }, 4000) };
    this.ch.send('invite', { to: best[0], from: this.me.id, room });
  }
  finish(r) { clearInterval(this.iv); try { this.ch.untrack(); this.ch.leave(); } catch {} this.cb.found(r); }
  stop() { this.done = true; clearInterval(this.iv); clearTimeout(this.pending && this.pending.t); try { this.ch && this.ch.untrack(); this.ch && this.ch.leave(); } catch {} }
}

/* ---------- Raum: Begrüssung, Direktverbindung, Start, Eingaben, Prüfsummen ---------- */
// Supabase vermittelt nur. Die Eingaben laufen wenn möglich direkt von Gerät zu Gerät (WebRTC),
// sonst gebündelt über den Supabase-Kanal.
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
// cb: { status(text), start(duel, info), end(reason) }
export class Room {
  constructor(sock, code, host, me, cb) {
    this.s = sock; this.code = code; this.host = host; this.me = me; this.cb = cb; this.peer = null; this.duel = null; this.closed = false; this.again = { me: false, peer: false };
    this.pipe = { send: (ev, p) => { if (this.dc && this.dc.readyState === 'open') { try { this.dc.send(JSON.stringify([ev, p])); return; } catch {} } this.ch.send(ev, p); }, direct: () => !!(this.dc && this.dc.readyState === 'open') };
  }
  async open() {
    const ch = this.ch = this.s.channel(`sh-room-${LIVE_PROTOCOL}-${this.code}`, { key: this.me.id });
    ch.onClose = () => this.lost('Verbindung getrennt');
    const H = this.H = {
      hello: m => {
        if (!this.host || this.peer) return;
        if (m.v !== this.me.v) { ch.send('bye', { reason: 'Andere Spielversion – bitte beide die App neu laden' }); return; }
        this.peer = m; this.cb.status && this.cb.status(`${safePeer(m).name} ist da. Verbinde direkt …`);
        ch.send('welcome', { id: this.me.id });
        this.rtc(m.rtc && typeof RTCPeerConnection !== 'undefined').then(() => this.pingStart());
      },
      welcome: () => { clearInterval(this.helloIv); this.cb.status && this.cb.status('Verbinde direkt …'); },
      rtc: m => this.rtcSignal(m), ice: m => { if (this.pc && m.c) this.pc.addIceCandidate(m.c).catch(() => {}); },
      ping: m => this.pipe.send('pong', { t: m.t }), pong: m => this.pong(m),
      start: m => { if (this.host) return; clearInterval(this.helloIv); this.peer = m.host; this.begin(m); },
      in: m => this.duel && this.duel.recv(m), nak: m => this.duel && this.duel.resend(m.from), sum: m => this.duel && this.duel.peerSum(m),
      bye: m => this.lost(m.reason || 'Der Gegner hat aufgegeben', true),
      again: () => { this.again.peer = true; this.cb.status && this.cb.status('Der Gegner will eine Revanche'); this.tryAgain(); },
    };
    for (const ev of Object.keys(H)) ch.on(ev, H[ev]);
    await ch.join();
    if (!this.host) { const hi = () => ch.send('hello', { ...this.me, rtc: typeof RTCPeerConnection !== 'undefined' }); hi(); this.helloIv = setInterval(hi, 1000); }
    this.waitT = setTimeout(() => { if (!this.duel) this.lost(this.host ? 'Niemand ist gekommen' : 'Kein offener Raum mit diesem Code'); }, this.host ? 300000 : 15000);
  }
  bindDc(dc) {
    this.dc = dc;
    dc.onmessage = e => { let a; try { a = JSON.parse(e.data); } catch { return; } const fn = this.H[a[0]]; if (fn) fn(a[1] || {}); };
    dc.onopen = () => this.dcOpen && this.dcOpen();
  }
  // Direktverbindung aufbauen (höchstens 5 s), sonst über Supabase weiter
  rtc(ok) {
    return new Promise(res => {
      if (!ok) return res(false);
      const done = v => { clearTimeout(t); this.dcOpen = null; res(v); }, t = setTimeout(() => done(false), 5000);
      this.dcOpen = () => done(true);
      try {
        const pc = this.pc = new RTCPeerConnection({ iceServers: ICE });
        pc.onicecandidate = e => { if (e.candidate) this.ch.send('ice', { c: e.candidate.toJSON() }); };
        this.bindDc(pc.createDataChannel('duel', { ordered: true }));
        pc.createOffer().then(o => pc.setLocalDescription(o)).then(() => this.ch.send('rtc', { sdp: pc.localDescription.toJSON() })).catch(() => done(false));
      } catch { done(false); }
    });
  }
  async rtcSignal(m) {
    try {
      if (!this.host && m.sdp && m.sdp.type === 'offer') {
        const pc = this.pc = new RTCPeerConnection({ iceServers: ICE });
        pc.onicecandidate = e => { if (e.candidate) this.ch.send('ice', { c: e.candidate.toJSON() }); };
        pc.ondatachannel = e => this.bindDc(e.channel);
        await pc.setRemoteDescription(m.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        this.ch.send('rtc', { sdp: pc.localDescription.toJSON() });
      } else if (this.host && this.pc && m.sdp && m.sdp.type === 'answer') await this.pc.setRemoteDescription(m.sdp);
    } catch {}
  }
  // Laufzeit messen, daraus die Eingabeverzögerung bestimmen
  pingStart() {
    if (this.closed) return;
    this.rtts = []; this.cb.status && this.cb.status(`${safePeer(this.peer).name} ist da. ${this.pipe.direct() ? 'Direktverbindung steht.' : 'Verbunden über den Server.'}`);
    const go = () => this.pipe.send('ping', { t: performance.now() }); go(); this.pingIv = setInterval(go, 200);
  }
  pong(m) {
    if (!this.host || this.duel || !this.rtts) return;
    this.rtts.push(performance.now() - m.t);
    if (this.rtts.length >= 5) {
      clearInterval(this.pingIv);
      const rtt = this.rtts.sort((a, b) => a - b)[2], direct = this.pipe.direct();
      const delay = Math.max(4, Math.min(16, Math.ceil(rtt / 2 / 16.7) + (direct ? 3 : 5)));
      this.startNew(delay, rtt);
    }
  }
  startNew(delay, rtt) {
    const s = { seed: 1 + Math.floor(Math.random() * 1e9), arena: this.me.arena, delay, rtt: Math.round(rtt || 0), host: this.me, guest: this.peer, direct: this.pipe.direct() };
    this.lastDelay = delay; this.lastRtt = rtt;
    this.pipe.send('start', s); this.begin(s);
  }
  begin(s) {
    clearTimeout(this.waitT); this.again = { me: false, peer: false };
    const host = s.host, guest = s.guest, mine = this.host ? host : guest, foe = safePeer(this.host ? guest : host);
    const match = new Match({ arena: s.arena, seed: s.seed, live: true, view: this.host ? 'A' : 'B', meGear: mine.gear, autoPogo: mine.autoPogo,
      foe: { name: foe.name, gear: foe.gear, rating: foe.rating, autoPogo: foe.autoPogo, style: {} } });
    this.duel = new LiveDuel(match, this.host, s.delay, this.pipe, this);
    this.cb.start(this.duel, { foe, rtt: s.rtt, delay: s.delay, direct: this.pipe.direct() });
  }
  lost(reason, byPeer) {
    if (this.closed) return;
    if (this.duel && !this.duel.ended && !this.duel.m.over) this.duel.abort(reason, byPeer);
    else { this.close(); this.cb.end(reason); }
  }
  askAgain() { this.again.me = true; this.pipe.send('again', {}); this.tryAgain(); }
  tryAgain() { if (this.again.me && this.again.peer && this.host) this.startNew(this.lastDelay || 6, this.lastRtt || 0); }
  quit() { if (this.closed) return; try { this.pipe.send('bye', { reason: 'Der Gegner hat das Duell verlassen' }); } catch {} setTimeout(() => this.close(), 300); this.closed = true; }
  close() { this.closed = true; clearInterval(this.helloIv); clearInterval(this.pingIv); clearTimeout(this.waitT); try { this.dc && this.dc.close(); this.pc && this.pc.close(); } catch {} try { this.ch && this.ch.leave(); } catch {} }
}

/* ---------- Lockstep: ein Duell zwischen zwei Geräten ---------- */
const STALL_LIMIT = 8 * 60;      // so lange (in Bildern) auf den Gegner warten, dann gilt er als weg
const SUM_EVERY = 90;
export class LiveDuel {
  constructor(match, host, delay, ch, room) {
    this.m = match; this.host = host; this.D = delay; this.ch = ch; this.room = room;
    this.f = 0;                 // nächstes zu rechnendes Bild
    this.loc = new Map(); this.rem = new Map(); this.sent = -1; this.lastSendF = -9; this.lastVal = -1;
    this.stall = 0; this.events = []; this.sums = new Map(); this.ended = false; this.abortReason = null; this.waiting = false;
    for (let k = 0; k < delay; k++) { this.loc.set(k, 0); this.rem.set(k, 0); }
    this.sent = delay - 1; this.locMax = delay - 1;
  }
  // Einmal pro Bild der Hauptschleife aufrufen
  tick(inp) {
    this.events.length = 0;
    if (this.ended) return;
    const target = this.f + this.D, v = pack(inp);
    // eigene Eingabe für alle neuen Bilder bis „jetzt + Verzögerung“ festlegen (auch nach Aufholen)
    for (let k = this.locMax + 1; k <= target; k++) this.loc.set(k, v);
    if (target > this.locMax) this.locMax = target;
    this.flush(target);
    // rechnen, solange die Eingaben beider da sind (höchstens 3 Bilder aufholen)
    let n = 0;
    while (n < 3 && this.rem.has(this.f) && this.loc.has(this.f) && !this.m.over) {
      const a = unpack(this.host ? this.loc.get(this.f) : this.rem.get(this.f)), b = unpack(this.host ? this.rem.get(this.f) : this.loc.get(this.f));
      this.m.step(a, b);
      for (const e of this.m.events) this.events.push(e);
      this.loc.delete(this.f - 120); this.rem.delete(this.f - 120);
      this.f++; n++;
      if (this.f % SUM_EVERY === 0) this.sum();
      if (n === 1 && this.rem.has(this.f + this.D + 2)) continue;  // weit hinten: aufholen
      else break;
    }
    this.waiting = n === 0 && !this.m.over;
    if (this.waiting) { if (++this.stall === 60) this.ch.send('nak', { from: this.f }); if (this.stall > STALL_LIMIT) this.abort('Der Gegner antwortet nicht mehr', true); }
    else this.stall = 0;
  }
  // Eingaben senden: bei Änderung oder spätestens alle 4 Bilder, höchstens jedes 2. Bild
  flush(upTo) {
    const v = this.loc.get(upTo), changed = v !== this.lastVal;
    if (upTo <= this.sent) return;
    const direct = this.ch.direct && this.ch.direct(), gap = direct ? 1 : 2, every = direct ? 3 : 4;
    if (!(changed && upTo - this.lastSendF >= gap) && upTo - this.sent < every) return;
    const from = this.sent + 1, i = [];
    for (let k = from; k <= upTo; k++) i.push(this.loc.get(k) || 0);
    this.ch.send('in', { s: from, i });
    this.sent = upTo; this.lastSendF = upTo; this.lastVal = v;
  }
  resend(from) { const i = []; for (let k = from; k <= this.sent; k++) { if (!this.loc.has(k)) return; i.push(this.loc.get(k)); } if (i.length) this.ch.send('in', { s: from, i }); }
  recv(m) {
    if (!Array.isArray(m.i) || !Number.isInteger(m.s)) return;
    for (let k = 0; k < m.i.length && k < 600; k++) { const f = m.s + k; if (f >= this.f && !this.rem.has(f)) this.rem.set(f, m.i[k] & 127); }
  }
  sum() { const c = this.m.checksum(); this.sums.set(this.f, c); this.ch.send('sum', { f: this.f, c }); const p = this.peerSums && this.peerSums.get(this.f); if (p !== undefined && p !== c) this.abort('Die Geräte rechnen verschieden – Duell abgebrochen (ohne Wertung)', false, true); }
  peerSum(m) {
    (this.peerSums = this.peerSums || new Map()).set(m.f, m.c);
    const mine = this.sums.get(m.f);
    if (mine !== undefined && mine !== m.c) this.abort('Die Geräte rechnen verschieden – Duell abgebrochen (ohne Wertung)', false, true);
  }
  abort(reason, peerGone, desync) { if (this.ended) return; this.ended = true; this.abortReason = reason; this.peerGone = !!peerGone; this.desync = !!desync; }
}
