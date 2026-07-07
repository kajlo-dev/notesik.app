import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSettings, getProgram, saveProgram } from '../lib/db'
import { useAutosave } from '../lib/autosave'
import { isNonNoteItem, getItemCategory } from '../lib/itemCategory'
import { matchQuestionsToItems } from '../lib/reviewQuestions'

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
  if (!questionId) return <p className="mb-1">{title}</p>
  return (
    <p className="mb-1">
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
      <span>{item.title}</span>
    </div>
  )
}

function NoteField({ id, note, onChange, onBlur, placeholder = 'Twoja notatka…' }) {
  return (
    <textarea
      className="form-control form-control-sm mt-2"
      rows={2}
      placeholder={placeholder}
      value={note}
      onChange={(e) => onChange(id, e.target.value)}
      onBlur={onBlur}
    />
  )
}

function SymposiumCard({ item, questionId, notes, onChange, onBlur }) {
  return (
    <div className="card mb-3 program-item-card item-sympozjum">
      <div className="card-body">
        <ItemHeading item={item} />
        <TitleWithQuestionLink item={item} questionId={questionId} />
        <div className="ps-3 border-start border-2 mt-2">
          {item.subitems.map((sub, i) => (
            <div key={sub.id} className={i > 0 ? 'mt-3' : ''}>
              <p className="mb-1 fw-medium">
                {i + 1}. {sub.text}
                {sub.reference && <span className="text-secondary fw-normal"> ({sub.reference})</span>}
              </p>
              <NoteField id={sub.id} note={notes[sub.id] ?? ''} onChange={onChange} onBlur={onBlur} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgramItem({ item, questionId, note, onChange, onBlur }) {
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
        <NoteField id={item.id} note={note} onChange={onChange} onBlur={onBlur} />
      </div>
    </div>
  )
}

function ReviewQuestions({ questions, notes, onChange, onBlur }) {
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
            <NoteField id={q.id} note={notes[q.id] ?? ''} onChange={onChange} onBlur={onBlur} placeholder="Twoja odpowiedź…" />
          </div>
        </div>
      ))}
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

  const questionByItemId = useMemo(() => matchQuestionsToItems(program).itemIdToQuestionId, [program])

  const handleNoteChange = (id, value) => {
    setNotes((prev) => ({ ...prev, [id]: value }))
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
            {section.items.map((item) =>
              isNonNoteItem(item) ? (
                <SimpleRow key={item.id} item={item} />
              ) : item.label === 'SYMPOZJUM' ? (
                <SymposiumCard
                  key={item.id}
                  item={item}
                  questionId={questionByItemId[item.id]}
                  notes={notes}
                  onChange={handleNoteChange}
                  onBlur={handleBlur}
                />
              ) : (
                <ProgramItem
                  key={item.id}
                  item={item}
                  questionId={questionByItemId[item.id]}
                  note={notes[item.id] ?? ''}
                  onChange={handleNoteChange}
                  onBlur={handleBlur}
                />
              ),
            )}
          </div>
        ))}
        <ReviewQuestions
          questions={program.reviewQuestions}
          notes={notes}
          onChange={handleNoteChange}
          onBlur={handleBlur}
        />
      </div>
    </div>
  )
}
