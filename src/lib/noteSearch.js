import { listPrograms } from './db'
import { htmlToPlainText } from './richText'

// Rozbija zapytanie na wymagane dokładne frazy (w cudzysłowie) i pojedyncze słowa (bez
// cudzysłowu) - słowa muszą wystąpić wszystkie (w dowolnej kolejności), frazy muszą wystąpić
// dokładnie tak, jak zostały wpisane.
export function parseQuery(query) {
  const phrases = []
  let rest = query
  rest = rest.replace(/"([^"]+)"/g, (_, phrase) => {
    const trimmed = phrase.trim()
    if (trimmed) phrases.push(trimmed.toLowerCase())
    return ' '
  })
  const words = rest
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean)
  return { phrases, words }
}

export function matchesQuery(text, parsed) {
  if (!text) return false
  const lower = text.toLowerCase()
  return parsed.phrases.every((p) => lower.includes(p)) && parsed.words.every((w) => lower.includes(w))
}

const SNIPPET_RADIUS = 50

// Wycinek tekstu wokół pierwszego dopasowania - żeby wynik dawał jaki taki kontekst, a nie
// tylko "znaleziono".
function buildSnippet(text, parsed) {
  const lower = text.toLowerCase()
  const needle = parsed.phrases[0] || parsed.words[0]
  if (!needle) return text.slice(0, 120)
  const idx = lower.indexOf(needle)
  if (idx === -1) return text.slice(0, 120)
  const start = Math.max(0, idx - SNIPPET_RADIUS)
  const end = Math.min(text.length, idx + needle.length + SNIPPET_RADIUS)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

function noteEntries(program) {
  const entries = []
  for (const day of program.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        entries.push({ id: item.id, time: item.time, label: item.label, title: item.title, note: item.note })
        for (const sub of item.subitems) {
          entries.push({ id: item.id, time: item.time, label: item.label, title: `${item.title} — ${sub.text}`, note: sub.note })
        }
      }
    }
  }
  for (const q of program.reviewQuestions || []) {
    entries.push({ id: q.id, time: null, label: 'Pytanie powtórkowe', title: `${q.number}. ${q.text}`, note: q.note })
  }
  return entries
}

// Przeszukuje notatki ze WSZYSTKICH zapisanych programów naraz. Zwraca listę wyników z
// kontekstem (który program, który punkt) i identyfikatorem do przejścia w Programie.
export async function searchNotes(query) {
  const parsed = parseQuery(query)
  if (parsed.phrases.length === 0 && parsed.words.length === 0) return []

  const programs = await listPrograms()
  const results = []
  for (const program of programs) {
    for (const entry of noteEntries(program)) {
      const plainText = htmlToPlainText(entry.note)
      if (!plainText || !matchesQuery(plainText, parsed)) continue
      results.push({
        programId: program.id,
        programTitle: program.title,
        itemId: entry.id,
        time: entry.time,
        label: entry.label,
        title: entry.title,
        snippet: buildSnippet(plainText, parsed),
      })
    }
  }
  return results
}
