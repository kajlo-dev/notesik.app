import { useEffect, useState } from 'react'
import { listPrograms, deleteProgram, getSettings, saveSettings } from '../lib/db'
import { exportProgramNotesToPdf } from '../lib/pdfExport'
import { hasNoteContent } from '../lib/richText'
import { DeleteIcon, DownloadIcon, ChevronRightIcon } from '../components/icons/icons'
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

export function ListPage({ onNavigate }) {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

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
            <li key={program.id} className="list-group-item program-row">
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
              </button>
              <div className="program-row-actions">
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
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
