# Notesik.app

Mobilna aplikacja (PWA) do robienia notatek podczas kongresów i zgromadzeń obwodowych
Świadków Jehowy. Działa lokalnie na telefonie/tablecie (bez logowania, bez backendu) —
program pobiera się jako PDF i zamienia na notatnik z polami do wpisywania notatek przy
każdym punkcie programu.

Dostępna pod: https://kajlo-dev.github.io/notesik.app/

## Funkcje

- **Program** — aktywny program z polami na notatki, z auto-zapisem co 1/2/5 min (do wyboru).
- **Lista** — wszystkie pobrane programy, możliwość powrotu do nich, usunięcia i eksportu
  notatek do jednego pliku PDF ("kartki notesika" do wpięcia w skoroszyt).
- **Ustawienia** — pobieranie programu z aktualnej listy (zsynchronizowanej z jw.org) albo
  ręczne wgranie własnego pliku PDF; wybór interwału auto-zapisu.
- Aplikacja celowo blokuje się na dużych ekranach (komputer) — jest zaprojektowana pod telefon
  i tablet.

## Jak to działa technicznie

- **React + Vite**, dane trzymane lokalnie w IndexedDB (`idb`), bez żadnego backendu.
- Parser `src/lib/pdfParser.js` (na bazie `pdfjs-dist`) zamienia PDF programu na strukturę
  dni/sekcji/pozycji, naprawiając po drodze połamane kodowanie polskich znaków diakrytycznych
  w PDF-ach generowanych przez jw.org (custom font z rozbitą tablicą ToUnicode).
- Eksport notatek do PDF (`src/lib/pdfExport.js`, `jspdf`) z osadzoną czcionką Roboto (domyślne
  fonty jsPDF nie obsługują ą/ć/ę/ł/ń/ó/ś/ź/ż).
- `scripts/sync-programs.mjs` (uruchamiany przez `.github/workflows/sync-programs.yml`) codziennie
  pobiera aktualną listę programów z jw.org i kopiuje PDF-y do `public/programs/` — omija to brak
  nagłówków CORS na plikach PDF (oficjalne API metadanych ma CORS, ale sam plik PDF już nie).
- `.github/workflows/deploy.yml` buduje i publikuje aplikację na GitHub Pages przy każdym pushu
  do `main`.

## Statystyki odwiedzin (GoatCounter)

W `index.html` jest wpięty [GoatCounter](https://www.goatcounter.com/) — liczy odwiedziny bez
cookies, więc nie wymaga bannera zgody. Żeby zacząć zbierać dane:

1. Załóż darmowe konto na https://www.goatcounter.com/ (podajesz tylko nazwę strony, np.
   `notesik-app` — to będzie Twój kod).
2. W `index.html` podmień `notesik-app` w `data-goatcounter="https://notesik-app.goatcounter.com/count"`
   na kod, który dostaniesz przy rejestracji.
3. Statystyki (liczba odwiedzin, urządzenia, kraje) są widoczne po zalogowaniu na
   `https://<twój-kod>.goatcounter.com`.

## Rozwój lokalny

```bash
npm install
npm run dev
```

Żeby ręcznie odświeżyć listę programów lokalnie:

```bash
node scripts/sync-programs.mjs
```
