import { parsePdfFile } from './pdfParser'
import { saveProgram, getSettings, saveSettings } from './db'

// public/programs/index.json jest generowany przez workflow .github/workflows/sync-programs.yml
// (kopiuje PDF-y programów z jw.org do repo, żeby ominąć brak CORS na plikach PDF).
export async function fetchAvailablePrograms() {
  const url = `${import.meta.env.BASE_URL}programs/index.json`
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}

async function importParsedProgram(parsed, { pubCode } = {}) {
  const now = new Date().toISOString()
  const program = {
    id: pubCode || crypto.randomUUID(),
    pubCode: pubCode || null,
    title: parsed.title,
    type: parsed.type,
    days: parsed.days,
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
  return importParsedProgram(parsed, { pubCode: entry.pub })
}

export async function importProgramFromFile(file) {
  const buffer = await file.arrayBuffer()
  const parsed = await parsePdfFile(buffer)
  return importParsedProgram(parsed)
}
