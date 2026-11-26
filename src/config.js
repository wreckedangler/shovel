// Für Online-Geister hier die Supabase-Projekt-URL und den öffentlichen "anon"-Schlüssel eintragen.
// Der anon-Schlüssel ist dafür gedacht, im Browser zu stehen; die Rechte regeln die Policies (README).
export const CONFIG = {
  version: '0.24.1',
  supabaseUrl: 'https://fdscunruneukpgdsqgmk.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkc2N1bnJ1bmV1a3BnZHNxZ21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2Nzk2NzcsImV4cCI6MjExMTI1NTY3N30.mcTJapOPA0ZI_3QvnMqR_3EblO1hcmfxbQAbxE1VblA',
  // Optional (Stufe 2): Adresse der Edge Function "verify", z. B. https://abcd1234.supabase.co/functions/v1/verify
  // Ist sie gesetzt, werden Läufe auf dem Server nachgespielt, bevor sie zählen.
  verifyUrl: '',
};
