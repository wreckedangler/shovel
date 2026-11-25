// Supabase Edge Function "verify": spielt eingereichte Läufe mit der echten Spiel-Engine nach
// und trägt nur Läufe ein, die genau so ausgehen, wie behauptet.
// Vorbereitung: `node tools/prep-edge.mjs` kopiert die Engine nach ./engine/
// Bereitstellen: `supabase functions deploy verify --no-verify-jwt`
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { decodeReplay, verify } from './engine/replay.js';
import { levelById } from './engine/levels.js';
import { daySeed, stageDepth } from './engine/daily.js';
import { GEN_VERSION } from './engine/gen.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, apikey, authorization', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const out = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return out({});
  try {
    const body = await req.json();
    if (body.kind === 'daily') {
      const run = body.run, codes = String(run.replay || '').split(' ').filter(Boolean);
      if (run.gv !== GEN_VERSION) return out({ ok: false, why: 'Andere Generator-Version' }, 409);
      if (codes.length !== run.k) return out({ ok: false, why: 'Anzahl Stufen passt nicht' }, 400);
      let frames = 0;
      for (let i = 0; i < codes.length; i++) {
        const r = await decodeReplay(codes[i]);
        const expect = `∞${stageDepth(i + 1)}-${daySeed(run.date)}`;
        if (!r || r.level !== expect || !r.opt.noCheck) return out({ ok: false, why: `Stufe ${i + 1}: falsches Level` }, 400);
        if (Object.values(r.opt.cheats || {}).some(Boolean)) return out({ ok: false, why: 'Cheats' }, 400);
        const v = verify(r, { level: levelById(expect) });
        const last = i === codes.length - 1;
        if (!v.ok || (!last && !v.game.done) || (last && v.game.done)) return out({ ok: false, why: `Stufe ${i + 1}: ${v.why || 'unpassend'}` }, 400);
        frames += v.game.frame;
      }
      const { error } = await db.from('daily_runs').insert({ ...run, frames, verified: true });
      return error ? out({ ok: false, why: error.message }, 400) : out({ ok: true });
    }
    if (body.kind === 'ghost') {
      const r = await decodeReplay(body.code);
      if (!r) return out({ ok: false, why: 'Kein gültiger Code' }, 400);
      const v = verify(r);
      if (!v.ok || !v.game.done || Object.values(r.opt.cheats || {}).some(Boolean)) return out({ ok: false, why: v.why || 'Ziel nicht erreicht' }, 400);
      const { error } = await db.from('ghosts').insert({ level: r.level, name: body.name, frames: v.game.frame, code: body.code, version: body.version, verified: true });
      return error ? out({ ok: false, why: error.message }, 400) : out({ ok: true });
    }
    return out({ ok: false, why: 'Unbekannte Art' }, 400);
  } catch (e) { return out({ ok: false, why: String(e) }, 500); }
});
