import { useCallback, useEffect, useRef, useState } from 'react'
import { getSettings, getProgram, saveProgram } from '../lib/db'
import { useAutosave } from '../lib/autosave'

function buildNotesMap(program) {
  const map = {}
  if (!program) return map
  for (const day of program.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        map[item.id] = item.note || ''
      }
    }
  }
  return map
}

function mergeNotesIntoProgram(program, notes) {
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      sections: day.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({ ...item, note: notes[item.id] ?? item.note ?? '' })),
      })),
    })),
    updatedAt: new Date().toISOString(),
  }
}

function ProgramItem({ item, note, onChange, onBlur }) {
  return (
    <div className="card mb-3 program-item-card">
      <div className="card-body">
        <div className="d-flex align-items-center gap-2 mb-1">
          <span className="badge text-bg-light border">{item.time}</span>
          {item.label && <span className="fw-semibold text-uppercase small text-primary">{item.label}</span>}
        </div>
        <p className="mb-1">
          {item.title}
          {item.reference && <span className="text-secondary"> ({item.reference})</span>}
        </p>
        {item.subitems.length > 0 && (
          <ul className="mb-2 ps-3 small text-secondary">
            {item.subitems.map((s, i) => (
              <li key={i}>
                {s.text}
                {s.reference && ` (${s.reference})`}
              </li>
            ))}
          </ul>
        )}
        <textarea
          className="form-control form-control-sm mt-2"
          rows={2}
          placeholder="Twoja notatka…"
          value={note}
          onChange={(e) => onChange(item.id, e.target.value)}
          onBlur={onBlur}
        />
      </div>
    </div>
  )
}

export function ProgramPage({ onNavigate }) {
  const [program, setProgram] = useState(null)
  const [notes, setNotes] = useState({})
  const [autosaveMinutes, setAutosaveMinutes] = useState(2)
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const notesRef = useRef(notes)
  notesRef.current = notes

  useEffect(() => {
    let cancelled = false
    async function load() {
      const settings = await getSettings()
      if (!settings.activeProgramId) {
        if (!cancelled) setLoading(false)
        return
      }
      const p = await getProgram(settings.activeProgramId)
      if (cancelled) return
      setProgram(p || null)
      setNotes(buildNotesMap(p))
      setAutosaveMinutes(settings.autosaveIntervalMinutes)
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((notesSnapshot) => {
    setProgram((prev) => {
      if (!prev) return prev
      const merged = mergeNotesIntoProgram(prev, notesSnapshot)
      saveProgram(merged)
      return merged
    })
  }, [])

  useAutosave(() => notesRef.current, persist, autosaveMinutes)

  useEffect(
    () => () => {
      persist(notesRef.current)
    },
    [persist],
  )

  const handleNoteChange = (itemId, value) => {
    setNotes((prev) => ({ ...prev, [itemId]: value }))
  }
  const handleBlur = () => persist(notesRef.current)

  if (loading) {
    return <div className="p-4 text-center text-secondary">Wczytywanie…</div>
  }

  if (!program) {
    return (
      <div className="p-4 text-center">
        <p className="text-secondary mb-3">Nie masz jeszcze pobranego programu.</p>
        <button type="button" className="btn btn-primary" onClick={() => onNavigate('settings')}>
          Przejdź do ustawień
        </button>
      </div>
    )
  }

  const day = program.days[activeDayIndex] || program.days[0]

  return (
    <div>
      {program.days.length > 1 && (
        <div className="day-tabs d-flex gap-2 pb-2 overflow-auto">
          {program.days.map((d, i) => (
            <button
              key={i}
              type="button"
              className={`btn btn-sm ${i === activeDayIndex ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setActiveDayIndex(i)}
            >
              {d.dayName || `Dzień ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      <div className="p-3">
        <h1 className="h6 text-secondary mb-3">{program.title}</h1>
        {day.theme && <p className="fst-italic text-secondary mb-3">{day.theme}</p>}
        {day.sections.map((section, si) => (
          <div key={si} className="mb-4">
            <h2 className="h6 text-uppercase text-primary mb-2">{section.name}</h2>
            {section.items.map((item) => (
              <ProgramItem
                key={item.id}
                item={item}
                note={notes[item.id] ?? ''}
                onChange={handleNoteChange}
                onBlur={handleBlur}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
