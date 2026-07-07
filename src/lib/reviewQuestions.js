import { isNonNoteItem } from './itemCategory.js'

// Programy zgromadzeń nie mają jawnego powiązania "to pytanie dotyczy tego przemówienia" -
// trzeba je dopasować heurystycznie po podobieństwie treści. Dopasowanie jest best-effort:
// jeśli nic nie pasuje wystarczająco dobrze, dany punkt programu po prostu nie dostaje linku.
function foldDiacritics(str) {
  return (str || '')
    .toUpperCase()
    .replace(/Ą/g, 'A')
    .replace(/Ć/g, 'C')
    .replace(/Ę/g, 'E')
    .replace(/Ł/g, 'L')
    .replace(/Ń/g, 'N')
    .replace(/Ó/g, 'O')
    .replace(/Ś/g, 'S')
    .replace(/Ź|Ż/g, 'Z')
}

function wordStems(text, stemLen = 5) {
  return foldDiacritics(text)
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3)
    .map((w) => w.slice(0, stemLen))
}

function overlapScore(a, b) {
  const stemsA = wordStems(a)
  const stemsB = new Set(wordStems(b))
  let score = 0
  for (const s of stemsA) if (stemsB.has(s)) score++
  return score
}

const MIN_SCORE = 2
const SEARCH_WINDOW = 6

// Zwraca { itemIdToQuestionId, questionIdToItemId } - dwustronne mapowanie id<->id.
export function matchQuestionsToItems(program) {
  const itemIdToQuestionId = {}
  const questionIdToItemId = {}
  const questions = program?.reviewQuestions
  if (!questions || questions.length === 0) return { itemIdToQuestionId, questionIdToItemId }

  const candidates = []
  for (const day of program.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        if (isNonNoteItem(item)) continue
        const text = [item.title, item.label, ...(item.subitems || []).map((s) => s.text)].filter(Boolean).join(' ')
        candidates.push({ item, text })
      }
    }
  }

  let searchFrom = 0
  for (const question of questions) {
    let bestIdx = -1
    let bestScore = 0
    const windowEnd = Math.min(candidates.length, searchFrom + SEARCH_WINDOW)
    for (let ci = searchFrom; ci < windowEnd; ci++) {
      const score = overlapScore(question.text, candidates[ci].text)
      if (score > bestScore) {
        bestScore = score
        bestIdx = ci
      }
    }
    if (bestIdx !== -1 && bestScore >= MIN_SCORE) {
      const itemId = candidates[bestIdx].item.id
      itemIdToQuestionId[itemId] = question.id
      questionIdToItemId[question.id] = itemId
      searchFrom = bestIdx + 1
    }
  }

  return { itemIdToQuestionId, questionIdToItemId }
}
