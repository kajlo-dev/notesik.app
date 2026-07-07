import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSettings, getProgram, saveProgram } from '../lib/db'
import { useAutosave } from '../lib/autosave'
import { isNonNoteItem, getItemCategory } from '../lib/itemCategory'
import { matchQuestionsToItems } from '../lib/reviewQuestions'
import { saveProgramBackup, hasUnsavedBackup, formatMinutesAgo } from '../lib/backupExport'
import { RichNoteEditor, RichNoteFullscreen } from '../components/RichNoteEditor'
import { CloseIcon } from '../components/icons/icons'

function buildNotesMap(program) {
  const map = {}
  if (!program) return map
  for (const day of program.days) {
    for (const section of day.sections) {
      for (const item of section.items) {
        map[item.id] = item.note || ''
        for (const sub of item.subitems) map[sub.id] = sub.note || ''
      }
    }
  }
  for (const q of program.reviewQuestions || []) map[q.id] = q.note || ''
  return map
}

function mergeNotesIntoProgram(program, notes) {
  return {
    ...program,
    days: program.days.map((day) => ({
      ...day,
      sections: day.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          note: notes[item.id] ?? item.note ?? '',
          subitems: item.subitems.map((sub) => ({ ...sub, note: notes[sub.id] ?? sub.note ?? '' })),
        })),
      })),
    })),
    reviewQuestions: (program.reviewQuestions || []).map((q) => ({ ...q, note: notes[q.id] ?? q.note ?? '' })),
    updatedAt: new Date().toISOString(),
  }
}

const CATEGORY_CLASS = {
  przemowienie: 'item-przemowienie',
  sympozjum: 'item-sympozjum',
  wyklad: 'item-wyklad',
}

function ItemHeading({ item }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-1">
      <span className="badge text-bg-light border">{item.time}</span>
      {item.label && <span className="fw-semibold text-uppercase small">{item.label}</span>}
    </div>
  )
}

function TitleWithQuestionLink({ item, questionId }) {
  const title = (
    <>
      {item.title}
      {item.reference && <span className="text-secondary"> ({item.reference})</span>}
    </>
  )
  if (!questionId) return <p className="mb-1 item-title">{title}</p>
  return (
    <p className="mb-1 item-title">
      <a href={`#pytanie-${questionId}`} className="link-offset-2">
        {title}
      </a>{' '}
      <span className="text-secondary small">↓ pytanie</span>
    </p>
  )
}

function SimpleRow({ item }) {
  return (
    <div className="d-flex align-items-center gap-2 py-2 px-1 text-secondary small border-bottom">
      <span className="badge text-bg-light border">{item.time}</span>
      <span className="simple-row-text">{item.title}</span>
    </div>
  )
}

// Gdy notatka jest otwarta w trybie pełnoekranowym, karta w tym miejscu NIE renderuje
// własnej kopii edytora (dwie równoległe instancje contentEditable dla tego samego id
// rozjeżdżałyby się ze sobą) - pokazuje tylko przycisk powrotu.
function NoteSlot({ id, html, notesMode, onChange, onBlur, onExpand, placeholder }) {
  if (notesMode.expandedId === id) {
    return <div className="text-secondary small fst-italic mt-2">Notatka otwarta w pełnym ekranie…</div>
  }
  return <RichNoteEditor id={id} html={html} onChange={onChange} onBlur={onBlur} placeholder={placeholder} onExpand={() => onExpand(id)} />
}

function SymposiumCard({ item, questionId, notes, notesMode, onChange, onBlur, onExpand }) {
  return (
    <div className="card mb-3 program-item-card item-sympozjum">
      <div className="card-body">
        <ItemHeading item={item} />
        <TitleWithQuestionLink item={item} questionId={questionId} />
        <div className="ps-3 border-start border-2 mt-2">
          {item.subitems.map((sub, i) => (
            <div key={sub.id} className={i > 0 ? 'mt-3' : ''}>
              <p className="mb-1 fw-medium symposium-subitem-text">
                {i + 1}. {sub.text}
                {sub.reference && <span className="text-secondary fw-normal"> ({sub.reference})</span>}
              </p>
              <NoteSlot
                id={sub.id}
                html={notes[sub.id] ?? ''}
                notesMode={notesMode}
                onChange={onChange}
                onBlur={onBlur}
                onExpand={(id) => onExpand(id, `${item.title} — ${sub.text}`)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgramItem({ item, questionId, note, notesMode, onChange, onBlur, onExpand }) {
  const category = getItemCategory(item)
  return (
    <div className={`card mb-3 program-item-card ${CATEGORY_CLASS[category] || ''}`}>
      <div className="card-body">
        <ItemHeading item={item} />
        <TitleWithQuestionLink item={item} questionId={questionId} />
        {item.subitems.length > 0 && (
          <ul className="mb-2 ps-3 small text-secondary">
            {item.subitems.map((s) => (
              <li key={s.id}>
                {s.text}
                {s.reference && ` (${s.reference})`}
              </li>
            ))}
          </ul>
        )}
        <NoteSlot
          id={item.id}
          html={note}
          notesMode={notesMode}
          onChange={onChange}
          onBlur={onBlur}
          onExpand={(id) => onExpand(id, item.title)}
        />
      </div>
    </div>
  )
}

function ReviewQuestions({ questions, notes, notesMode, onChange, onBlur, onExpand }) {
  if (!questions || questions.length === 0) return null
  return (
    <div className="mb-4">
      <h2 className="h6 text-uppercase text-primary mb-2">Pytania powtórkowe</h2>
      {questions.map((q) => (
        <div key={q.id} id={`pytanie-${q.id}`} className="card mb-3 program-item-card">
          <div className="card-body">
            <p className="mb-1">
              <span className="fw-semibold">{q.number}.</span> {q.text}
              {q.reference && <span className="text-secondary"> ({q.reference})</span>}
            </p>
            <NoteSlot
              id={q.id}
              html={notes[q.id] ?? ''}
              notesMode={notesMode}
              onChange={onChange}
              onBlur={onBlur}
              placeholder="Twoja odpowiedź…"
              onExpand={(id) => onExpand(id, `Pytanie ${q.number}`)}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function BackupReminder({ program, onBackup }) {
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)

  if (dismissed || !hasUnsavedBackup(program)) return null

  const text = program.lastBackupAt
    ? `Notatki zmieniły się od ostatniej kopii (${formatMinutesAgo(program.lastBackupAt)}) — zapisz aktualną kopię.`
    : 'Ten program nie ma jeszcze zapisanej kopii — zapisz kopię.'

  const handleSave = async () => {
    setSaving(true)
    try {
      await onBackup()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="backup-reminder">
      <span className="backup-reminder-text">{text}</span>
      <button type="button" className="btn btn-sm btn-outline-primary" disabled={saving} onClick={handleSave}>
        {saving ? '…' : 'Zapisz kopię'}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-link text-secondary p-1"
        onClick={() => setDismissed(true)}
        aria-label="Zamknij przypomnienie"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}

export function ProgramPage({ onNavigate }) {
  const [program, setProgram] = useState(null)
  const [notes, setNotes] = useState({})
  const [autosaveMinutes, setAutosaveMinutes] = useState(2)
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedNote, setExpandedNote] = useState(null)
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

  const handleBackup = useCallback(async () => {
    // Zawsze wysyłamy do kopii najświeższe notatki, nawet jeśli autosave jeszcze nie zdążył
    // ich zapisać do IndexedDB.
    const merged = mergeNotesIntoProgram(program, notesRef.current)
    await saveProgram(merged)
    setProgram(merged)
    const updated = await saveProgramBackup(merged)
    if (updated) setProgram(updated)
  }, [program])

  useAutosave(() => notesRef.current, persist, autosaveMinutes)

  useEffect(
    () => () => {
      persist(notesRef.current)
    },
    [persist],
  )

  const questionByItemId = useMemo(() => matchQuestionsToItems(program).itemIdToQuestionId, [program])

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }))
  }
  const handleBlur = () => persist(notesRef.current)
  const handleExpand = (id, label) => setExpandedNote({ id, label })
  const handleCloseExpand = () => {
    persist(notesRef.current)
    setExpandedNote(null)
  }

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
  const notesMode = { expandedId: expandedNote?.id ?? null }

  return (
    <div>
      <BackupReminder program={program} onBackup={handleBackup} />
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
            {section.items.map((item) =>
              isNonNoteItem(item) ? (
                <SimpleRow key={item.id} item={item} />
              ) : item.label === 'SYMPOZJUM' ? (
                <SymposiumCard
                  key={item.id}
                  item={item}
                  questionId={questionByItemId[item.id]}
                  notes={notes}
                  notesMode={notesMode}
                  onChange={handleNoteChange}
                  onBlur={handleBlur}
                  onExpand={handleExpand}
                />
              ) : (
                <ProgramItem
                  key={item.id}
                  item={item}
                  questionId={questionByItemId[item.id]}
                  note={notes[item.id] ?? ''}
                  notesMode={notesMode}
                  onChange={handleNoteChange}
                  onBlur={handleBlur}
                  onExpand={handleExpand}
                />
              ),
            )}
          </div>
        ))}
        <ReviewQuestions
          questions={program.reviewQuestions}
          notes={notes}
          notesMode={notesMode}
          onChange={handleNoteChange}
          onBlur={handleBlur}
          onExpand={handleExpand}
        />
      </div>
      {expandedNote && (
        <RichNoteFullscreen
          id={expandedNote.id}
          html={notes[expandedNote.id] ?? ''}
          onChange={handleNoteChange}
          onBlur={handleBlur}
          placeholder={expandedNote.label}
          onClose={handleCloseExpand}
        />
      )}
    </div>
  )
}
