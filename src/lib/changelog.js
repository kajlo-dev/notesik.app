// Lista nowości do wyświetlenia w oknie "Co nowego". Przy każdej nowej, widocznej dla
// użytkownika funkcji dopisz kolejny wpis na początku (najnowszy pierwszy) i podbij
// CHANGELOG_VERSION - okno samo pokaże się ponownie tym, którzy widzieli starszą wersję.
// "date" w formacie "RRRR-MM-DD GG:MM" (godzina opcjonalna - starsze wpisy jej nie mają).
export const CHANGELOG = [
  {
    version: 3,
    date: '2026-07-14 11:21',
    items: [
      'Aplikacja zmieniła nazwę na Notesik Lite - nowa ikona i kolor paska u góry ekranu',
      'Odnośniki biblijne w notatkach (np. „Ps 16:11”) same zamieniają się w linki do jw.org po Enterze',
      'Przycisk „Zainstaluj” w Ustawieniach -> Pomoc - instalacja na ekranie głównym jednym dotknięciem',
      'Okno „Co nowego” (to, które właśnie widzisz) pokazuje się automatycznie po każdej aktualizacji',
    ],
  },
  {
    version: 2,
    date: '2026-07-07',
    items: [
      'Podświetlenie na żywo aktualnego punktu programu + przycisk „Teraz” do szybkiego powrotu',
      'Rozmiar tekstu w Ustawieniach (mały / średni / duży)',
      'Ustawienia uporządkowane w zakładki: Program / Notatki / Pomoc',
    ],
  },
]

export const CHANGELOG_VERSION = CHANGELOG[0].version
