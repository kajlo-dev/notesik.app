import { BIBLE_BOOKS } from './bibleBooks'

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalize(s) {
  return s.toLowerCase().replace(/\.$/, '')
}

const variantToBookNum = new Map()
const variantSet = new Set()
function addVariant(text, bookNum) {
  variantSet.add(text)
  variantToBookNum.set(normalize(text), bookNum)
}
for (const book of BIBLE_BOOKS) {
  for (const text of [book.full, book.long, book.abbr, ...(book.extra || [])]) {
    addVariant(text, book.num)
    // Oficjalne "długie" skróty jw.org kończą się kropką (np. "Rodz.", "Nehem.") - wielu
    // użytkowników i tak jej nie wpisze (zwłaszcza na klawiaturze mobilnej), więc dokładamy
    // wariant bez żadnych kropek jako osobną, dodatkową opcję.
    if (text.includes('.')) {
      addVariant(text.replace(/\./g, '').replace(/\s+/g, ' ').trim(), book.num)
    }
  }
}
// Księgi numerowane (np. "1 Sam.", "1 Jana") - wiele osób i tak wpisze numer bez spacji
// ("1Sam", "1Jana"), więc dla każdego dotychczasowego wariantu zaczynającego się od "N "
// dokładamy też wersję z numerem zlepionym ze słowem. Osobny przebieg PO zbudowaniu
// wszystkich wariantów - inaczej łatwo pomylić numer księgi przy iterowaniu w trakcie budowy.
for (const [text, bookNum] of [...variantSet].map((t) => [t, variantToBookNum.get(normalize(t))])) {
  const glued = text.match(/^([123])\s+(\S.*)$/)
  if (glued) addVariant(glued[1] + glued[2], bookNum)
}
// Najdłuższe warianty pierwsze - m.in. żeby "1 Jana" (numer 62) miało pierwszeństwo przed samym
// "Jana" (numer 43) tam, gdzie oba mogłyby pasować.
const variants = [...variantSet].sort((a, b) => b.length - a.length)

const BOOK_ALTERNATION = variants.map(escapeRegex).join('|')
// Odnośnik musi zaczynać się na początku tekstu, po spacji albo po "(" (tak jak w programach
// kongresu/zgromadzenia, gdzie odnośniki są w nawiasach) - i musi kończyć się dokładnie tam,
// gdzie jest kursor (koniec sprawdzanego tekstu).
const REFERENCE_RE = new RegExp(
  `(?:^|[\\s(])(${BOOK_ALTERNATION})\\.?\\s+(\\d{1,3}):(\\d{1,3})(?:[-–](\\d{1,3}))?$`,
  'i',
)

function pad(n, len) {
  return String(n).padStart(len, '0')
}

export function buildBibleFinderUrl(bookNum, chapter, verseStart, verseEnd) {
  const start = `${pad(bookNum, 2)}${pad(chapter, 3)}${pad(verseStart, 3)}`
  if (verseEnd && verseEnd !== verseStart) {
    const end = `${pad(bookNum, 2)}${pad(chapter, 3)}${pad(verseEnd, 3)}`
    return `https://www.jw.org/finder?bible=${start}-${end}`
  }
  return `https://www.jw.org/finder?bible=${start}`
}

// Szuka odnośnika biblijnego na SAMYM KOŃCU podanego tekstu (czyli tego, co użytkownik właśnie
// napisał tuż przed kursorem). Zwraca offset początku dopasowania w oryginalnym stringu (do
// zbudowania Range) albo null, jeśli nic nie pasuje. Toleruje nawias zamykający na końcu
// (") ", tak jak w oficjalnych programach) - link obejmuje wtedy tylko sam odnośnik, nie nawias.
export function matchBibleReferenceAtEnd(rawText) {
  const hadTrailingParen = rawText.endsWith(')')
  const text = hadTrailingParen ? rawText.slice(0, -1) : rawText

  const m = REFERENCE_RE.exec(text)
  if (!m) return null

  const bookNum = variantToBookNum.get(normalize(m[1]))
  if (!bookNum) return null

  const chapter = Number(m[2])
  const verseStart = Number(m[3])
  const verseEnd = m[4] ? Number(m[4]) : null
  if (chapter < 1 || chapter > 150 || verseStart < 1) return null

  // m.index wskazuje na dopasowanie łącznie z opcjonalnym poprzedzającym znakiem (spacja/nawias)
  // z grupy (?:^|[\s(]) - trzeba go pominąć, żeby link zaczynał się dokładnie od nazwy księgi.
  const matchStart = m.index + (m[0].startsWith(m[1]) ? 0 : 1)

  return {
    matchStart,
    matchEnd: text.length,
    hadTrailingParen,
    bookNum,
    chapter,
    verseStart,
    verseEnd,
    url: buildBibleFinderUrl(bookNum, chapter, verseStart, verseEnd),
  }
}
