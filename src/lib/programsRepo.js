import { parsePdfFile } from './pdfParser'
import { renderPdfThumbnailDataUrl } from './pdfThumbnail'
import { saveProgram, getSettings, saveSettings } from './db'

// public/programs/index.json jest generowany przez workflow .github/workflows/sync-programs.yml
// (kopiuje PDF-y programów z jw.org do repo, żeby ominąć brak CORS na plikach PDF).
export async function fetchAvailablePrograms() {
  const url = `${import.meta.env.BASE_URL}programs/index.json`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    const entries = await res.json()
    return entries.map((entry) => ({
      ...entry,
      thumbUrl: entry.thumb ? `${import.meta.env.BASE_URL}${entry.thumb}` : null,
    }))
  } catch {
    return []
  }
}

async function importParsedProgram(parsed, { pubCode, thumbUrl } = {}) {
  const now = new Date().toISOString()
  const program = {
    id: pubCode || crypto.randomUUID(),
    pubCode: pubCode || null,
    title: parsed.title,
    type: parsed.type,
    days: parsed.days,
    reviewQuestions: parsed.reviewQuestions || [],
    thumbUrl: thumbUrl || null,
    createdAt: now,
    updatedAt: now,
  }
  await saveProgram(program)
  const settings = await getSettings()
  await saveSettings({ ...settings, activeProgramId: program.id })
  return program
}

export async function downloadAndImportProgram(entry) {
  const url = `${import.meta.env.BASE_URL}${entry.file}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Nie udało się pobrać pliku: ${entry.file}`)
  const buffer = await res.arrayBuffer()
  const parsed = await parsePdfFile(buffer, { titleHint: entry.title })
  const thumbUrl = entry.thumb ? `${import.meta.env.BASE_URL}${entry.thumb}` : null
  return importParsedProgram(parsed, { pubCode: entry.pub, thumbUrl })
}

export async function importProgramFromFile(file) {
  const buffer = await file.arrayBuffer()
  // pdf.js może "skonsumować" (odłączyć) przekazany ArrayBuffer, więc na potrzeby renderowania
  // miniaturki bierzemy kopię zrobioną PRZED parsowaniem, nie po.
  const bufferForThumb = buffer.slice(0)
  const parsed = await parsePdfFile(buffer)
  let thumbUrl = null
  try {
    thumbUrl = await renderPdfThumbnailDataUrl(bufferForThumb)
  } catch {
    thumbUrl = null
  }
  return importParsedProgram(parsed, { thumbUrl })
}
