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

export function findTodayDayIndex(days) {
  const todayName = fold(WEEKDAY_NAMES_PL[new Date().getDay()])
  const idx = days.findIndex((d) => d.dayName && fold(d.dayName) === todayName)
  return idx >= 0 ? idx : 0
}

export function findCurrentSectionIndex(sections) {
  if (!sections || sections.length === 0) return 0
  const isAfternoon = new Date().getHours() >= AFTERNOON_HOUR
  const targetName = isAfternoon ? 'po poludniu' : 'przed poludniem'
  const idx = sections.findIndex((s) => fold(s.name) === targetName)
  return idx >= 0 ? idx : 0
}
