-- Schaufelheld: komplettes Datenbank-Schema für Supabase (im SQL-Editor einmal ausführen).
-- Ohne Anmeldung: jeder darf lesen und eintragen, aber die Datenbank prüft selbst, was plausibel ist.

-- Namensfilter (grobe Liste, ergänzt den Filter im Spiel)
create or replace function sh_name_ok(n text) returns boolean language sql immutable set search_path = '' as $$
  select char_length(n) between 1 and 16
     and lower(translate(n, '0134578@$!', 'oieastbasi')) !~ '(arsch|fick|fuck|shit|schei|hure|nutte|fotze|wichs|schwuchtel|spast|nigg|neger|hitler|nazi|kanake|bitch|cunt|porn|rape|vergewalt|kike|faggot|retard|whore|slut|1488)'
$$;

-- Geister (Bestzeiten pro Level)
create table if not exists ghosts (
  id bigint generated always as identity primary key,
  level text not null,
  name text not null check (sh_name_ok(name)),
  frames int not null check (frames > 300),
  code text not null check (char_length(code) < 60000),
  version text,
  verified boolean default false,
  created_at timestamptz default now()
);
create index if not exists ghosts_level on ghosts (level, frames);
alter table ghosts enable row level security;
drop policy if exists "lesen" on ghosts; create policy "lesen" on ghosts for select using (true);
-- "verified" setzt nur die Edge Function (mit Dienstschlüssel), nie ein Spieler
drop policy if exists "eintragen" on ghosts; create policy "eintragen" on ghosts for insert with check (verified is not true);

-- Tagesschacht: ein Lauf pro Gerät und Tag
create table if not exists daily_runs (
  id bigint generated always as identity primary key,
  date text not null check (date ~ '^\d{4}-\d{2}-\d{2}$'),
  device text not null check (char_length(device) between 8 and 40),
  gv int not null default 1,
  name text not null check (sh_name_ok(name)),
  k int not null check (k between 1 and 300),
  -- mindestens 8 Sekunden pro geschaffte Stufe, sonst unglaubwürdig
  frames int check (frames >= (k - 1) * 480),
  x int, y int,
  tail text check (char_length(tail) < 4100),
  ma int default -1 check (ma between -1 and 13), mb int default -1 check (mb between -1 and 9),
  mx int default 0, my int default 0, mk int default 0,
  carried int default 0 check (carried between 0 and 500),
  replay text check (char_length(replay) < 300000),
  verified boolean default false,
  version text,
  created_at timestamptz default now(),
  unique (date, device)
);
create index if not exists daily_runs_date on daily_runs (date, k);
alter table daily_runs enable row level security;
drop policy if exists "lesen" on daily_runs; create policy "lesen" on daily_runs for select using (true);
-- nur für heute (± 1 Tag wegen Zeitzonen) eintragen
drop policy if exists "eintragen" on daily_runs; create policy "eintragen" on daily_runs for insert
  with check (verified is not true and to_date(date, 'YYYY-MM-DD') between current_date - 1 and current_date + 1);
-- Die Geräte-Kennung bleibt privat: Spieler dürfen alle Spalten lesen ausser "device"
revoke select on daily_runs from anon, authenticated;
grant select (id, date, gv, name, k, frames, x, y, tail, ma, mb, mx, my, mk, carried, replay, verified, version, created_at) on daily_runs to anon, authenticated;

-- Cloud-Sicherung des Spielstands. Zugriff nur mit dem geheimen Schlüssel im Kopf "x-save-token".
create table if not exists saves (
  token text primary key check (char_length(token) between 24 and 64),
  data text not null check (char_length(data) < 400000),
  updated_at timestamptz default now()
);
alter table saves enable row level security;
drop policy if exists "eigener" on saves;
create policy "eigener" on saves for all
  using (token = (current_setting('request.headers', true)::json ->> 'x-save-token'))
  with check (token = (current_setting('request.headers', true)::json ->> 'x-save-token'));

-- Anonyme Todesstellen (nur Level und Kachelspalte), um unfaire Stellen zu finden
create table if not exists deaths_anon (
  id bigint generated always as identity primary key,
  level text not null check (char_length(level) < 24),
  xs int[] not null check (array_length(xs, 1) <= 200),
  version text,
  created_at timestamptz default now()
);
alter table deaths_anon enable row level security;
drop policy if exists "eintragen" on deaths_anon; create policy "eintragen" on deaths_anon for insert with check (true);
-- (bewusst keine Lese-Policy: auswerten nur im Supabase-Dashboard)

-- Rechte für die öffentliche Rolle (neue Supabase-Projekte vergeben sie nicht mehr automatisch)
grant usage on schema public to anon, authenticated;
grant select, insert on ghosts to anon, authenticated;
grant insert on daily_runs to anon, authenticated;
grant select, insert, update, delete on saves to anon, authenticated;
grant insert on deaths_anon to anon, authenticated;

-- ===== Stufe 2 (optional, nach dem Bereitstellen der Edge Function "verify") =====
-- Danach dürfen nur noch nachgeprüfte Läufe eingetragen werden:
-- drop policy if exists "eintragen" on daily_runs;
-- drop policy if exists "eintragen" on ghosts;

-- ===== Schatten-Arena =====
create table if not exists arena_shades (
  id bigint generated always as identity primary key,
  token text not null unique check (char_length(token) between 24 and 64),
  name text not null check (public.sh_name_ok(name)),
  gear jsonb not null check (pg_column_size(gear) < 2000),
  style jsonb not null check (pg_column_size(style) < 400),
  rating int not null default 1000 check (rating between 0 and 4000),
  wins int not null default 0 check (wins between 0 and 1000000),
  losses int not null default 0 check (losses between 0 and 1000000),
  shade_wins int not null default 0,
  shade_losses int not null default 0,
  version text check (char_length(version) < 20),
  updated_at timestamptz not null default now()
);
create index if not exists arena_shades_rating on arena_shades (rating, updated_at desc);
alter table arena_shades enable row level security;
drop policy if exists "lesen" on arena_shades;
create policy "lesen" on arena_shades for select using (true);
revoke all on arena_shades from anon, authenticated;
grant select (id, name, gear, style, rating, wins, losses, shade_wins, shade_losses, version, updated_at) on arena_shades to anon, authenticated;

create table if not exists arena_results (
  id bigint generated always as identity primary key,
  reporter text not null,
  shade bigint not null references arena_shades (id) on delete cascade,
  shade_won boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists arena_results_rep on arena_results (reporter, shade, created_at desc);
alter table arena_results enable row level security;
revoke all on arena_results from anon, authenticated;

create or replace function arena_upsert(p_token text, p_name text, p_gear jsonb, p_style jsonb, p_rating int, p_wins int, p_losses int, p_version text)
returns bigint language plpgsql security definer set search_path = '' as $$
declare v_id bigint;
begin
  insert into public.arena_shades as s (token, name, gear, style, rating, wins, losses, version, updated_at)
  values (p_token, p_name, p_gear, p_style, p_rating, p_wins, p_losses, p_version, now())
  on conflict (token) do update set name = excluded.name, gear = excluded.gear, style = excluded.style,
    rating = excluded.rating, wins = excluded.wins, losses = excluded.losses, version = excluded.version, updated_at = now()
  returning s.id into v_id;
  return v_id;
end $$;

create or replace function arena_report(p_token text, p_shade bigint, p_shade_won boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_rep text;
begin
  if p_token is null or char_length(p_token) not between 24 and 64 then return; end if;
  v_rep := md5(p_token);
  if exists (select 1 from public.arena_results r where r.reporter = v_rep and r.shade = p_shade and r.created_at > now() - interval '10 minutes') then return; end if;
  if not exists (select 1 from public.arena_shades s where s.id = p_shade and s.token <> p_token) then return; end if;
  insert into public.arena_results (reporter, shade, shade_won) values (v_rep, p_shade, p_shade_won);
  update public.arena_shades set shade_wins = shade_wins + (case when p_shade_won then 1 else 0 end),
    shade_losses = shade_losses + (case when p_shade_won then 0 else 1 end) where id = p_shade;
end $$;

revoke all on function arena_upsert(text, text, jsonb, jsonb, int, int, int, text) from public;
revoke all on function arena_report(text, bigint, boolean) from public;
grant execute on function arena_upsert(text, text, jsonb, jsonb, int, int, int, text) to anon, authenticated;
grant execute on function arena_report(text, bigint, boolean) to anon, authenticated;
