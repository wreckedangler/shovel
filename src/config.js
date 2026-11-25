// Für Online-Geister hier die Supabase-Projekt-URL und den öffentlichen "anon"-Schlüssel eintragen.
// Der anon-Schlüssel ist dafür gedacht, im Browser zu stehen; die Rechte regeln die Policies (README).
export const CONFIG = {
  version: '0.16.0',
  supabaseUrl: '',
  supabaseKey: '',
  // Optional (Stufe 2): Adresse der Edge Function "verify", z. B. https://abcd1234.supabase.co/functions/v1/verify
  // Ist sie gesetzt, werden Läufe auf dem Server nachgespielt, bevor sie zählen.
  verifyUrl: '',
};
