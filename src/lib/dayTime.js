// Programy nie mają zapisanych konkretnych dat kalendarzowych (PDF podaje tylko nazwy dni
// tygodnia: piątek/sobota/niedziela), więc "dzisiaj" dopasowujemy po nazwie dnia tygodnia, a
// nie po dacie - to jedyna informacja, jaką mamy. Podobnie porę dnia ustalamy prostym progiem
// godzinowym (sesje popołudniowe zaczynają się zwykle ok. 13:20-13:35).
const WEEKDAY_NAMES_PL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota']
const AFTERNOON_HOUR = 13

function fold(str) {
  return (str || '')
    .toLowerCase()
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź|ż/g, 'z')
}

// -1 gdy dzisiejszy dzień tygodnia nie odpowiada żadnemu dniowi programu (np. otwierasz appkę
// we wtorek, a kongres jest piątek-niedziela) - ważne rozróżnienie od "dzień 0", bo "brak
// dopasowania" i "dopasowano pierwszy dzień" to nie to samo (patrz findTodayDayIndex niżej,
// które celowo zaciera tę różnicę tam, gdzie i tak trzeba coś wybrać na start).
// Jednodniowe zgromadzenia nie mają w PDF-ie nagłówka dnia (parser zostawia dayName: null -
// to właśnie po tym poznaje "zgromadzenie" od "kongresu"), więc nie ma z czym porównywać
// nazwy dnia tygodnia. Skoro dzień jest tylko jeden, nie ma też czego rozróżniać - zawsze
// liczy się jako "dzisiejszy", żeby podświetlenie na żywo w ogóle mogło zadziałać.
export function findRealTodayDayIndex(days) {
  if (days.length === 1) return 0
  const todayName = fold(WEEKDAY_NAMES_PL[new Date().getDay()])
  return days.findIndex((d) => d.dayName && fold(d.dayName) === todayName)
}

// Do wyboru zakładki przy starcie zawsze potrzeba jakiegoś dnia - gdy nie ma dopasowania,
// spada do pierwszego.
export function findTodayDayIndex(days) {
  const idx = findRealTodayDayIndex(days)
  return idx >= 0 ? idx : 0
}

export function findCurrentSectionIndex(sections) {
  if (!sections || sections.length === 0) return 0
  const isAfternoon = new Date().getHours() >= AFTERNOON_HOUR
  const targetName = isAfternoon ? 'po poludniu' : 'przed poludniem'
  const idx = sections.findIndex((s) => fold(s.name) === targetName)
  return idx >= 0 ? idx : 0
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = (timeStr || '').split('.').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

// Punkt programu, który właśnie trwa "na żywo" - ostatni, którego godzina rozpoczęcia już
// minęła (punkty są w kolejności chronologicznej, więc wystarczy iść od początku sekcji).
// Zwraca null, jeśli sekcja jeszcze się nie zaczęła.
export function findCurrentItemId(items) {
  if (!items || items.length === 0) return null
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
  let currentId = null
  for (const item of items) {
    const itemMinutes = parseTimeToMinutes(item.time)
    if (itemMinutes === null || itemMinutes > nowMinutes) break
    currentId = item.id
  }
  return currentId
}
