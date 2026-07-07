// Lista nowości do wyświetlenia w oknie "Co nowego". Przy każdej nowej, widocznej dla
// użytkownika funkcji dopisz kolejny wpis na początku (najnowszy pierwszy) i podbij
// CHANGELOG_VERSION - okno samo pokaże się ponownie tym, którzy widzieli starszą wersję.
export const CHANGELOG = [
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
