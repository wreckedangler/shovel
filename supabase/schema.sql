-- Schaufelheld: komplettes Datenbank-Schema für Supabase (im SQL-Editor einmal ausführen).
-- Ohne Anmeldung: jeder darf lesen und eintragen, aber die Datenbank prüft selbst, was plausibel ist.

-- Namensfilter (grobe Liste, ergänzt den Filter im Spiel)
create or replace function sh_name_ok(n text) returns boolean language sql immutable as $$
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
drop policy if exists "eintragen" on ghosts; create policy "eintragen" on ghosts for insert with check (true);

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
  with check (to_date(date, 'YYYY-MM-DD') between current_date - 1 and current_date + 1);

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

-- ===== Stufe 2 (optional, nach dem Bereitstellen der Edge Function "verify") =====
-- Danach dürfen nur noch nachgeprüfte Läufe eingetragen werden:
-- drop policy if exists "eintragen" on daily_runs;
-- drop policy if exists "eintragen" on ghosts;
