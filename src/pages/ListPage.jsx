import { useEffect, useState } from 'react'
import { listPrograms, deleteProgram, saveProgram, getSettings, saveSettings } from '../lib/db'
import { exportProgramNotesToPdf } from '../lib/pdfExport'
import { hasNoteContent } from '../lib/richText'
import { saveProgramBackup, hasUnsavedBackup, formatMinutesAgo, formatDateTime } from '../lib/backupExport'
import { buildNotesMap, mergeNotesIntoProgram } from '../lib/notesModel'
import { DeleteIcon, DownloadIcon, ChevronRightIcon, BackupIcon } from '../components/icons/icons'
import { ProgramThumb } from '../components/ProgramThumb'
import { CoffeeBanner } from '../components/CoffeeBanner'

function programHasNotes(program) {
  const inDays = program.days.some((day) =>
    day.sections.some((section) =>
      section.items.some((item) => hasNoteContent(item.note) || item.subitems.some((s) => hasNoteContent(s.note))),
    ),
  )
  if (inDays) return true
  return (program.reviewQuestions || []).some((q) => hasNoteContent(q.note))
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return ''
  }
}

function backupStatusText(program) {
  if (!program.lastBackupAt) return 'brak kopii'
  const stale = hasUnsavedBackup(program)
  return `kopia ${formatMinutesAgo(program.lastBackupAt)}${stale ? ' (nieaktualna)' : ''}`
}

export function ListPage({ onNavigate }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [backingUpId, setBackingUpId] = useState(null)

  const reload = async () => {
    setPrograms(await listPrograms())
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  const openProgram = async (program) => {
    const settings = await getSettings()
    await saveSettings({ ...settings, activeProgramId: program.id })
    onNavigate('program')
  }

  const removeProgram = async (program) => {
    if (!window.confirm(`Usunąć „${program.title}” razem z notatkami?`)) return
    await deleteProgram(program.id)
    reload()
  }

  const exportProgram = async (program) => {
    setBusyId(program.id)
    try {
      await exportProgramNotesToPdf(program)
    } finally {
      setBusyId(null)
    }
  }

  const backupProgram = async (program) => {
    setBackingUpId(program.id)
    try {
      await saveProgramBackup(program)
      reload()
    } finally {
      setBackingUpId(null)
    }
  }

  // Przywrócenie starszej wersji - jak "git checkout": obecny stan najpierw dokładany jest
  // jako własna migawka do historii, więc przywracanie nigdy nie gubi notatek na stałe.
  const restoreVersion = async (program, version) => {
    if (!window.confirm(`Przywrócić notatki z ${formatDateTime(version.savedAt)}? Obecny stan też zostanie zapisany w historii, więc będzie można do niego wrócić.`))
      return
    const currentSnapshot = buildNotesMap(program)
    const now = new Date().toISOString()
    const versions = [...(program.versions || []), { id: crypto.randomUUID(), savedAt: now, notes: currentSnapshot }].slice(-20)
    const restored = mergeNotesIntoProgram(program, version.notes)
    const updated = { ...restored, versions }
    await saveProgram(updated)
    reload()
  }

  if (loading) {
    return (
      <div>
        <CoffeeBanner />
        <div className="p-4 text-center text-secondary">Wczytywanie…</div>
      </div>
    )
  }

  if (programs.length === 0) {
    return (
      <div>
        <CoffeeBanner />
        <div className="p-4 text-center">
          <p className="text-secondary mb-3">Nie masz jeszcze żadnych zapisanych programów.</p>
          <button type="button" className="btn btn-primary" onClick={() => onNavigate('settings')}>
            Pobierz program
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <CoffeeBanner />
      <div className="p-3">
        <h1 className="h6 text-secondary mb-3">Zapisane programy</h1>
        <ul className="list-group">
          {programs.map((program) => (
            <li key={program.id} className="list-group-item">
              <div className="program-row">
                <ProgramThumb src={program.thumbUrl} alt="" />
                <button
                  type="button"
                  className="btn btn-link text-start text-decoration-none p-0 program-row-name"
                  onClick={() => openProgram(program)}
                >
                  <div className="fw-semibold">{program.title}</div>
                  <div className="small text-secondary">
                    {program.type === 'kongres' ? 'Kongres' : 'Zgromadzenie'} · aktualizacja{' '}
                    {formatDate(program.updatedAt)} · {programHasNotes(program) ? 'z notatkami' : 'bez notatek'}
                  </div>
                  <div className="small text-secondary">{backupStatusText(program)}</div>
                </button>
                <div className="program-row-actions">
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    title="Zapisz kopię (Dysk Google, OneDrive, Pliki…)"
                    disabled={backingUpId === program.id}
                    onClick={() => backupProgram(program)}
                  >
                    <BackupIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    title="Eksportuj notatki do PDF"
                    disabled={busyId === program.id}
                    onClick={() => exportProgram(program)}
                  >
                    <DownloadIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    title="Usuń program"
                    onClick={() => removeProgram(program)}
                  >
                    <DeleteIcon size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    title="Otwórz"
                    onClick={() => openProgram(program)}
                  >
                    <ChevronRightIcon size={18} />
                  </button>
                </div>
              </div>
              {program.versions?.length > 0 && (
                <details className="version-history">
                  <summary>Historia ({program.versions.length})</summary>
                  <ul className="list-unstyled small mb-0 mt-1">
                    {[...program.versions].reverse().map((v) => (
                      <li key={v.id}>
                        <button type="button" className="btn btn-link btn-sm p-0" onClick={() => restoreVersion(program, v)}>
                          {formatDateTime(v.savedAt)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
