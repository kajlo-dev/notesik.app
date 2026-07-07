import { saveProgram } from './db'
import { buildNotesMap } from './notesModel'

const MAX_VERSIONS = 20

function timestampForFileName(date) {
  const pad = (n) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  const s = pad(date.getSeconds())
  return `${y}-${m}-${d}_${h}${min}${s}`
}

// Zapisuje kopię zapasową programu (cały obiekt, razem z notatkami) jako plik JSON, z datą
// i godziną w nazwie - żeby kolejne zapisy nie nadpisywały się (i nie dostawały "(1)", "(2)"
// od aplikacji docelowej), tylko tworzyły osobne, nazwane migawki w czasie.
//
// Na telefonie nie da się cicho zapisać pliku na dysk bez interakcji użytkownika (patrz
// README) - używamy więc systemowego okna "Udostępnij" (Web Share API), gdzie użytkownik sam
// wybiera Dysk Google, OneDrive, Pliki itd. Jeśli przeglądarka nie wspiera udostępniania
// plików, spada do zwykłego pobrania.
//
// Appka nie dostaje żadnej informacji, GDZIE użytkownik ostatecznie zapisał plik (Web Share
// API tego nie zwraca) - nie da się więc zrobić do niego linku. Zamiast tego przy każdym
// udanym zapisie dokładana jest migawka aktualnych notatek do WŁASNEJ historii wersji
// programu (program.versions) - to ona pozwala wrócić w czasie z poziomu Listy, niezależnie
// od tego, co się stało z wyeksportowanym plikiem.
//
// Zwraca zaktualizowany obiekt programu po udanym zapisie, albo `null` jeśli użytkownik
// anulował okno udostępniania (wtedy NIE aktualizujemy lastBackupAt ani historii wersji).
export async function saveProgramBackup(program) {
  const now = new Date()
  const safeName = program.title.replace(/[^\p{L}\p{N}]+/gu, '_')
  const fileName = `${safeName}_${timestampForFileName(now)}.json`
  const json = JSON.stringify(program, null, 2)
  const file = new File([json], fileName, { type: 'application/json' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: program.title })
    } catch (err) {
      if (err?.name === 'AbortError') return null
      // Udostępnianie się nie powiodło z innego powodu - spróbuj zwykłego pobrania jako fallback.
      triggerDownload(file, fileName)
    }
  } else {
    triggerDownload(file, fileName)
  }

  const nowIso = now.toISOString()
  const versions = [...(program.versions || []), { id: crypto.randomUUID(), savedAt: nowIso, notes: buildNotesMap(program) }].slice(
    -MAX_VERSIONS,
  )
  const updated = { ...program, lastBackupAt: nowIso, versions }
  await saveProgram(updated)
  return updated
}

function triggerDownload(file, fileName) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function hasUnsavedBackup(program) {
  if (!program.lastBackupAt) return true
  return new Date(program.updatedAt) > new Date(program.lastBackupAt)
}

export function formatMinutesAgo(iso) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (minutes < 1) return 'przed chwilą'
  if (minutes === 1) return '1 minutę temu'
  if (minutes < 5) return `${minutes} minuty temu`
  if (minutes < 60) return `${minutes} minut temu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return hours === 1 ? '1 godzinę temu' : `${hours} godzin temu`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 dzień temu' : `${days} dni temu`
}

export function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return ''
  }
}
