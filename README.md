# FRA — jurnal de pescuit (PWA)

Aplicație instalabilă pe telefon pentru notarea partidelor de pescuit la crap.
Offline-first: datele se salvează pe telefon (localStorage + IndexedDB pentru poze), merge fără semnal la baltă.

## Ce notezi
- **Baltă** (din Holerga: Hermes Periș, Doripesco, Sacoșu Turcesc, Brădeni, Iazul Bila 2)
- **Stand** — selecție vizuală pe harta oficială (hotspot-uri) sau grilă de numere
- **Perioadă** — interval de date; zilele (Ziua 1, 2, …) se generează automat
- **Lansete** (1–4), fiecare cu:
  - distanță, oră lansare
  - **montură**: bag / half / boilies / plastice / snowman (cu diametru, culoare, producător; bag are și tipul de la cârlig)
  - **cârlig**: mărime, tip, producător
  - **trăsături**: minute de la schimbarea lansetei + oră + rezultat (prins/scăpat/ratată)
  - **captură** (la „prins"): specie, greutate, poză, observații

Producătorii / tipurile / speciile se învață pe măsură ce le introduci (autocomplete).

## Rulare locală (test)
Trebuie servit prin HTTP (nu `file://`) ca să meargă service worker-ul:
```
cd D:\VIREO\AI\FRA
python -m http.server 8823
# apoi deschide http://localhost:8823
```

## Instalare pe telefon
Deschide site-ul în Chrome/Safari → meniu → „Adaugă la ecranul principal".
Trebuie servit pe **HTTPS** (sau localhost) pentru PWA.

## Structură
- `index.html`, `manifest.webmanifest`, `sw.js` — shell PWA
- `js/data.js` — bălți (din Holerga) + liste de opțiuni
- `js/store.js` — stocare (localStorage + IndexedDB poze)
- `js/app.js` — UI + logică (router pe hash)
- `css/styles.css` — temă apă + auriu de crap
- `assets/maps/` — hărțile oficiale ale standurilor
- `icons/` — logo crap + iconițe PWA

## Backup
Setări → Exportă backup (.json). Import cu opțiune adaugă / înlocuiește.
