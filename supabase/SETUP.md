# FRA — setup Supabase + GitHub Pages

Aplicația merge și **fără** pașii ăștia (mod local, offline, ca înainte). Îi faci când vrei conturi + sincronizare.

## 1. Creează proiectul Supabase
1. Intră pe https://supabase.com → **New project** (gratis). Alege o parolă de DB și regiunea (ex. Frankfurt).
2. După ce se creează, mergi la **Project Settings → API** și notează:
   - **Project URL** (ex. `https://abcd.supabase.co`)
   - **anon / publishable key** (cheia publică — e ok să stea în cod, accesul e protejat de RLS)

## 2. Rulează schema
1. În Supabase: **SQL Editor → New query**.
2. Copiază tot din `supabase/schema.sql` și apasă **Run**. (Se poate rula de mai multe ori.)

## 3. Pune cheile în aplicație
Editează `js/config.js`:
```js
window.FRA_CONFIG = {
  supabaseUrl: "https://abcd.supabase.co",
  supabaseAnonKey: "eyJhbGci...",
  allowLocalMode: true,
};
```
Din acest moment aplicația cere autentificare și sincronizează partidele.

## 4. Fă-te ADMIN
Înregistrează-te în aplicație (Cont nou), apoi în **SQL Editor**:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'cripetre@gmail.com');
```

## 5. Auth: setări utile (Supabase → Authentication)
- **Providers → Email**: pornit. Pentru testat rapid, poți dezactiva „Confirm email" (Authentication → Providers → Email → Confirm email = off) ca să te loghezi imediat.
- **URL Configuration → Site URL**: pune adresa de GitHub Pages (ex. `https://user.github.io/fra/`) ca link-urile de resetare parolă să ducă înapoi în aplicație.

## 6. Deploy pe GitHub Pages
```bash
# în folderul FRA:
git add -A && git commit -m "FRA"
gh repo create fra --public --source=. --push      # sau creezi repo manual pe github.com
```
Apoi în repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
Workflow-ul `.github/workflows/deploy.yml` publică automat la fiecare push. Site-ul va fi pe `https://<user>.github.io/fra/`.

> PWA (instalare pe telefon) merge doar pe HTTPS — GitHub Pages oferă HTTPS gratuit.

## Note
- **Pozele capturilor** se stochează local (IndexedDB) în această fază; sincronizarea lor în Supabase Storage vine în faza 2.
- **Clasamentul** e opțional: fiecare user îl activează din Setări („Apari în clasamentul public").
