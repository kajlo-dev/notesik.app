// Notatki żyją w dwóch miejscach na raz: zagnieżdżone w strukturze programu (days -> sections
// -> items/subitems, plus reviewQuestions) do wyświetlania, i jako płaska mapa {id: html} do
// wygodnej edycji w React state oraz do zapisywania "migawek" w historii wersji.

export function buildNotesMap(program) {
  const map = {}
  if (!program) return map
  for (const day of program.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        map[item.id] = item.note || ''
        for (const sub of item.subitems) map[sub.id] = sub.note || ''
      }
    }
  }
  for (const q of program.reviewQuestions || []) map[q.id] = q.note || ''
  return map
}

export function mergeNotesIntoProgram(program, notes) {
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      sections: day.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          note: notes[item.id] ?? item.note ?? '',
          subitems: item.subitems.map((sub) => ({ ...sub, note: notes[sub.id] ?? sub.note ?? '' })),
        })),
      })),
    })),
    reviewQuestions: (program.reviewQuestions || []).map((q) => ({ ...q, note: notes[q.id] ?? q.note ?? '' })),
    updatedAt: new Date().toISOString(),
  }
}
