import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getSettings, getProgram, saveProgram } from '../lib/db'
import { useAutosave } from '../lib/autosave'
import { isNonNoteItem, getItemCategory } from '../lib/itemCategory'
import { matchQuestionsToItems } from '../lib/reviewQuestions'
import { saveProgramBackup, hasUnsavedBackup, formatMinutesAgo } from '../lib/backupExport'
import { buildNotesMap, mergeNotesIntoProgram } from '../lib/notesModel'
import { findTodayDayIndex, findRealTodayDayIndex, findCurrentSectionIndex, findCurrentItemId } from '../lib/dayTime'
import { RichNoteEditor, RichNoteFullscreen } from '../components/RichNoteEditor'
import { CloseIcon } from '../components/icons/icons'

const LIVE_CHECK_INTERVAL_MS = 30_000

const CATEGORY_CLASS = {
  przemowienie: 'item-przemowienie',
  sympozjum: 'item-sympozjum',
  wyklad: 'item-wyklad',
}

function ItemHeading({ item, isLive }) {
  return (
    <div className="d-flex align-items-center gap-2 mb-1">
      <span className="badge text-bg-light border">{item.time}</span>
      {item.label && <span className="fw-semibold text-uppercase small">{item.label}</span>}
      {isLive && <span className="badge live-now-badge">● teraz</span>}
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

function SimpleRow({ item, isLive }) {
  return (
    <div id={item.id} className={`simple-row d-flex align-items-center gap-2 py-2 px-1 text-secondary small border-bottom${isLive ? ' item-live' : ''}`}>
      <span className="badge text-bg-light border">{item.time}</span>
      <span className="simple-row-text">{item.title}</span>
      {isLive && <span className="badge live-now-badge">● teraz</span>}
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

function SymposiumCard({ item, questionId, notes, notesMode, onChange, onBlur, onExpand, isLive }) {
  return (
    <div id={item.id} className={`card mb-3 program-item-card item-sympozjum${isLive ? ' item-live' : ''}`}>
      <div className="card-body">
        <ItemHeading item={item} isLive={isLive} />
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

function ProgramItem({ item, questionId, note, notesMode, onChange, onBlur, onExpand, isLive }) {
  const category = getItemCategory(item)
  return (
    <div id={item.id} className={`card mb-3 program-item-card ${CATEGORY_CLASS[category] || ''}${isLive ? ' item-live' : ''}`}>
      <div className="card-body">
        <ItemHeading item={item} isLive={isLive} />
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

// Znajduje, w którym dniu/sekcji leży dany punkt programu (albo podpunkt sympozjum) - używane,
// żeby po przejściu z wyników wyszukiwania od razu ustawić właściwe zakładki dnia/pory.
function findItemLocation(program, itemId) {
  if (!program || !itemId) return null
  for (let di = 0; di < program.days.length; di++) {
    const day = program.days[di]
    for (let si = 0; si < day.sections.length; si++) {
      const section = day.sections[si]
      for (const item of section.items) {
        if (item.id === itemId) return { dayIndex: di, sectionIndex: si }
        if (item.subitems.some((s) => s.id === itemId)) return { dayIndex: di, sectionIndex: si }
      }
    }
  }
  return null
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

export function ProgramPage({ onNavigate, focusItemId }) {
  const [program, setProgram] = useState(null)
  const [notes, setNotes] = useState({})
  const [autosaveMinutes, setAutosaveMinutes] = useState(2)
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedNote, setExpandedNote] = useState(null)
  const [nowTick, setNowTick] = useState(0)
  const notesRef = useRef(notes)
  notesRef.current = notes
  const hasAutoScrolledToLiveRef = useRef(false)

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
      if (p) {
        const location = focusItemId ? findItemLocation(p, focusItemId) : null
        const dayIdx = location ? location.dayIndex : findTodayDayIndex(p.days)
        setActiveDayIndex(dayIdx)
        setActiveSectionIndex(location ? location.sectionIndex : findCurrentSectionIndex(p.days[dayIdx]?.sections))
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [focusItemId])

  useEffect(() => {
    if (!focusItemId || loading) return
    const el = document.getElementById(focusItemId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusItemId, loading, activeDayIndex, activeSectionIndex])

  // Co 30s odświeżamy "aktualny punkt" - żeby podświetlenie samo przeskoczyło dalej w miarę
  // upływu czasu, bez przeładowania strony.
  useEffect(() => {
    const timer = setInterval(() => setNowTick((t) => t + 1), LIVE_CHECK_INTERVAL_MS)
    return () => clearInterval(timer)
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

  // Podświetlenie "na żywo" ma sens tylko wtedy, gdy faktycznie patrzysz na dzisiejszy dzień
  // i aktualną porę (a nie np. przeglądasz jutrzejszy program) - inaczej wskazywałoby coś
  // mylącego.
  const isViewingLiveSection = useMemo(() => {
    if (!program) return false
    const todayIdx = findRealTodayDayIndex(program.days)
    if (todayIdx === -1 || todayIdx !== activeDayIndex) return false
    const liveSectionIdx = findCurrentSectionIndex(program.days[todayIdx]?.sections)
    return liveSectionIdx === activeSectionIndex
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, activeDayIndex, activeSectionIndex, nowTick])

  const liveItemId = useMemo(() => {
    if (!isViewingLiveSection) return null
    const section = program?.days[activeDayIndex]?.sections[activeSectionIndex]
    return findCurrentItemId(section?.items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isViewingLiveSection, program, activeDayIndex, activeSectionIndex, nowTick])

  useEffect(() => {
    if (!liveItemId || focusItemId || hasAutoScrolledToLiveRef.current || loading) return
    hasAutoScrolledToLiveRef.current = true
    const el = document.getElementById(liveItemId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [liveItemId, focusItemId, loading])

  const jumpToLive = () => {
    const el = liveItemId && document.getElementById(liveItemId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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
  const section = day.sections[activeSectionIndex] || day.sections[0]
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
              onClick={() => {
                setActiveDayIndex(i)
                setActiveSectionIndex(0)
              }}
            >
              {d.dayName || `Dzień ${i + 1}`}
            </button>
          ))}
        </div>
      )}
      {day.sections.length > 1 && (
        <div className="day-tabs section-tabs d-flex gap-2 pb-2 overflow-auto">
          {day.sections.map((s, si) => (
            <button
              key={si}
              type="button"
              className={`btn btn-sm ${si === activeSectionIndex ? 'btn-primary' : 'btn-outline-secondary'}`}
              onClick={() => setActiveSectionIndex(si)}
            >
              {s.name === 'PRZED POŁUDNIEM' ? 'Przed południem' : s.name === 'PO POŁUDNIU' ? 'Po południu' : s.name}
            </button>
          ))}
        </div>
      )}
      <div className="p-3">
        <h1 className="h6 text-secondary mb-3">{program.title}</h1>
        {day.theme && <p className="fst-italic text-secondary mb-3">{day.theme}</p>}
        {section && (
          <div className="mb-4">
            <h2 className="h6 text-uppercase text-primary mb-2">{section.name}</h2>
            {section.items.map((item) =>
              isNonNoteItem(item) ? (
                <SimpleRow key={item.id} item={item} isLive={item.id === liveItemId} />
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
                  isLive={item.id === liveItemId}
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
                  isLive={item.id === liveItemId}
                />
              ),
            )}
          </div>
        )}
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
      {liveItemId && !expandedNote && (
        <button type="button" className="jump-to-live-btn" onClick={jumpToLive}>
          ● Teraz
        </button>
      )}
    </div>
  )
}
