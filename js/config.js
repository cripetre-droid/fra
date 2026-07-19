/* ============================================================
   FRA — configurare
   Completează URL-ul și cheia "anon/publishable" din proiectul tău Supabase.
   (Cheia anon e publică prin design — accesul e protejat de RLS în baza de date.)
   Cât timp sunt goale, aplicația rulează în MOD LOCAL (offline, ca înainte),
   fără conturi și fără sincronizare.
   ============================================================ */
window.FRA_CONFIG = {
  supabaseUrl: "",        // ex: https://xxxxxxxx.supabase.co
  supabaseAnonKey: "",    // ex: eyJhbGciOi... (publishable/anon)

  // dacă true, se poate folosi și fără cont (date doar locale). Recomandat true.
  allowLocalMode: true,
};
window.FRA_CLOUD = !!(window.FRA_CONFIG.supabaseUrl && window.FRA_CONFIG.supabaseAnonKey);
