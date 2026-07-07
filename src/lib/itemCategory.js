// Pieśni, muzyka i modlitwy to nie treść merytoryczna - nie ma przy nich sensu pole notatki.
const SKIP_TITLE_RE = /^(pie[śs]ń|muzyka|filmowy program muzyczny|modlitwa)/i

export function isNonNoteItem(item) {
  if (item.label) return false
  return SKIP_TITLE_RE.test(item.title.trim())
}

// Kategoria decyduje o kolorze karty punktu programu.
export function getItemCategory(item) {
  if (isNonNoteItem(item)) return 'brak-notatek'
  if (item.label === 'SYMPOZJUM') return 'sympozjum'
  if (item.label === 'PUBLICZNY WYKŁAD BIBLIJNY') return 'wyklad'
  return 'przemowienie'
}
