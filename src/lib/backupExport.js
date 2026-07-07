import { saveProgram } from './db'

// Zapisuje kopię zapasową programu (cały obiekt, razem z notatkami) jako plik JSON.
// Na telefonie nie da się cicho zapisać pliku na dysk bez interakcji użytkownika (patrz
// README) - używamy więc systemowego okna "Udostępnij" (Web Share API), gdzie użytkownik sam
// wybiera Dysk Google, OneDrive, Pliki itd. Jeśli przeglądarka nie wspiera udostępniania
// plików, spada do zwykłego pobrania.
//
// Zwraca zaktualizowany obiekt programu (z nowym lastBackupAt) po udanym zapisie, albo `null`
// jeśli użytkownik anulował okno udostępniania (wtedy NIE aktualizujemy lastBackupAt).
export async function saveProgramBackup(program) {
  const json = JSON.stringify(program, null, 2)
  const fileName = `${program.title.replace(/[^\p{L}\p{N}]+/gu, '_')}.json`
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

  const updated = { ...program, lastBackupAt: new Date().toISOString() }
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
