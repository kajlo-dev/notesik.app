# Notesik.app

Notesik.app to prosta aplikacja mobilna do robienia notatek podczas kongresów i zgromadzeń
obwodowych Świadków Jehowy. Pobierasz program w PDF, aplikacja sama zamienia go w notatnik
z osobnym polem na notatkę przy każdym punkcie programu — nie trzeba niczego przepisywać ręcznie.

**Otwórz aplikację:** https://kajlo-dev.github.io/notesik.app/

> Działa tylko na telefonie i tablecie. Na komputerze pokaże się komunikat blokujący —
> to celowe, aplikacja jest zaprojektowana pod ekran dotykowy.

## Jak zacząć

1. Otwórz https://kajlo-dev.github.io/notesik.app/ w przeglądarce na telefonie lub tablecie.
2. Dodaj ją do ekranu głównego, żeby korzystać z niej jak z normalnej aplikacji:
   - **Android (Chrome):** menu (⋮) → *Dodaj do ekranu głównego*.
   - **iPhone/iPad (Safari):** przycisk udostępniania (□↑) → *Dodaj do ekranu początkowego*.
3. Przejdź do zakładki **Ustawienia** i pobierz program z listy (albo wgraj własny plik PDF).
4. Program pojawi się w zakładce **Program** — gotowe do robienia notatek.

Nie trzeba się logować ani zakładać konta. Wszystko działa offline i zostaje wyłącznie na
Twoim urządzeniu.

## Zakładki

### 📝 Program

Strona główna. Pokazuje aktualnie otwarty program podzielony na dni (dla kongresu: piątek,
sobota, niedziela) i sesje (przed południem / po południu). Przy każdym punkcie programu jest
pole tekstowe na notatkę.

Notatki zapisują się automatycznie — co 1, 2 lub 5 minut (do ustawienia w Ustawieniach), a
dodatkowo od razu po opuszczeniu pola tekstowego. Nie trzeba nic samemu zapisywać.

### 📋 Lista

Lista wszystkich pobranych dotąd programów — z notatkami albo bez. Stąd można:
- **otworzyć** dowolny program ponownie, żeby coś dopisać lub poprawić,
- **usunąć** program razem z notatkami,
- **wyeksportować** notatki do jednego pliku PDF — gotowego do wydrukowania i wpięcia jako
  kartki do skoroszytu.

### ⚙️ Ustawienia

- **Pobierz program** — lista aktualnych programów kongresów i zgromadzeń, zsynchronizowana
  na bieżąco z jw.org. Wystarczy kliknąć, żeby pobrać i od razu zacząć robić notatki.
- **Wgraj plik PDF ręcznie** — jeśli potrzebnego programu nie ma jeszcze na liście, można wgrać
  własny plik PDF pobrany skądinąd.
- **Automatyczny zapis notatek** — wybór co ile minut (1/2/5) aplikacja ma zapisywać notatki
  w tle.

## Prywatność

- Aplikacja nie wymaga konta ani logowania.
- Programy i notatki są zapisywane wyłącznie lokalnie na urządzeniu (w pamięci przeglądarki) —
  nigdzie nie są wysyłane.
- Liczba odwiedzin jest zliczana anonimowo przez [GoatCounter](https://www.goatcounter.com/),
  bez plików cookie i bez zbierania danych osobowych — dlatego nie ma bannera zgody.

## Dla deweloperów

<details>
<summary>Szczegóły techniczne i uruchomienie lokalne</summary>

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

### Uruchomienie lokalne

```bash
npm install
npm run dev
```

Ręczne odświeżenie listy programów:

```bash
node scripts/sync-programs.mjs
```

</details>
