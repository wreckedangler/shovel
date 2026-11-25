# Supabase einrichten (ca. 10 Minuten)

1. Auf https://supabase.com ein kostenloses Konto anlegen und **New project** wählen. Name z. B. `schaufelheld`, Region **Central EU (Frankfurt)** oder **Zurich**, falls angeboten. Datenbank-Passwort sicher aufbewahren (wird im Spiel nicht gebraucht).
2. Warten, bis das Projekt bereit ist. Dann links **SQL Editor** → **New query**, den ganzen Inhalt von `supabase/schema.sql` einfügen und **Run** drücken. Es sollte „Success“ erscheinen.
3. Links **Project Settings** → **API**. Dort stehen:
   - **Project URL** (z. B. `https://abcd1234.supabase.co`)
   - **anon public** Schlüssel (langer Text, beginnt mit `eyJ…`)
4. Beide in `src/config.js` eintragen:
   ```js
   supabaseUrl: 'https://abcd1234.supabase.co',
   supabaseKey: 'eyJ…',
   ```
   Der anon-Schlüssel darf öffentlich im Spiel stehen. Was erlaubt ist, regelt die Datenbank selbst (Schema).
5. `node tools/bundle.mjs` ausführen (oder mir Bescheid geben), dann ist alles aktiv:
   - Blutflecken, Geister-Wiederholungen und Botschaften aller Spieler im Tagesschacht
   - „besser als X %“ im Ergebnis
   - Online-Bestzeiten
   - Cloud-Sicherung des Spielstands (Optionen)

**Nicht** den `service_role`-Schlüssel eintragen, der gehört nie ins Spiel.

Was die Datenbank selbst prüft: Namensfilter, ein Tagesschacht-Lauf pro Gerät und Tag, nur heutige Läufe, mindestens 8 Sekunden pro Stufe, Grössengrenzen. Ein entschlossener Betrüger kann trotzdem plausible Fantasiewerte eintragen; dagegen hilft später nur, Eingaben aufzuzeichnen und auf dem Server nachzuspielen.

## Stufe 2: Läufe auf dem Server nachprüfen (optional, später)

Jeder Lauf wird als Folge von Tastendrücken gespeichert. Die Edge Function `verify` spielt ihn mit der echten Spiel-Engine nach und trägt ihn nur ein, wenn er genau so ausgeht wie behauptet. Erfundene Ergebnisse fallen damit raus.

1. Supabase-Kommandozeile installieren: https://supabase.com/docs/guides/cli
2. Im Projektordner: `node tools/prep-edge.mjs` (kopiert die Engine), dann `supabase login`, `supabase link --project-ref <deine-ref>`, `supabase functions deploy verify --no-verify-jwt`
3. In `src/config.js` `verifyUrl` eintragen: `https://<deine-ref>.supabase.co/functions/v1/verify`
4. Im SQL-Editor die beiden Zeilen unter „Stufe 2“ am Ende von `supabase/schema.sql` ausführen.

Wichtig: Nach jeder Änderung an der Spiel-Engine `node tools/prep-edge.mjs` und erneut bereitstellen, sonst passen alte und neue Läufe nicht zusammen.
