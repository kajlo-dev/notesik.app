import { useEffect, useRef } from 'react'
import { SearchIcon, CloseIcon } from './icons/icons'
import { matchBibleReferenceAtEnd } from '../lib/bibleReference'

const COLORS = [
  { name: 'czarny', value: '#1a1a1a' },
  { name: 'czerwony', value: '#dc3545' },
  { name: 'niebieski', value: '#2f6fed' },
  { name: 'zielony', value: '#1b6b57' },
  { name: 'fioletowy', value: '#7c4fd1' },
]

const SIZES = [
  { label: 'A', execValue: '2', className: 'rt-size-sm' },
  { label: 'A', execValue: '4', className: 'rt-size-md' },
  { label: 'A', execValue: '6', className: 'rt-size-lg' },
]

function Toolbar({ onCommand }) {
  const stop = (e) => e.preventDefault()
  return (
    <div className="rich-toolbar">
      {SIZES.map((s) => (
        <button
          key={s.execValue}
          type="button"
          className={`rt-btn ${s.className}`}
          onMouseDown={stop}
          onClick={() => onCommand('fontSize', s.execValue)}
          aria-label="Rozmiar tekstu"
        >
          {s.label}
        </button>
      ))}
      <span className="rt-divider" />
      <button type="button" className="rt-btn fw-bold" onMouseDown={stop} onClick={() => onCommand('bold')} aria-label="Pogrubienie">
        B
      </button>
      <button type="button" className="rt-btn fst-italic" onMouseDown={stop} onClick={() => onCommand('italic')} aria-label="Kursywa">
        I
      </button>
      <button
        type="button"
        className="rt-btn text-decoration-underline"
        onMouseDown={stop}
        onClick={() => onCommand('underline')}
        aria-label="Podkreślenie"
      >
        U
      </button>
      <span className="rt-divider" />
      {COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          className="rt-color-dot"
          style={{ background: c.value }}
          onMouseDown={stop}
          onClick={() => onCommand('foreColor', c.value)}
          aria-label={`Kolor tekstu: ${c.name}`}
        />
      ))}
    </div>
  )
}

// Gdy użytkownik kończy linijkę Enterem, sprawdza czy to, co właśnie napisał, wygląda jak
// odnośnik biblijny (np. "Ps 16:11" albo "Obj. 17:2-5") i jeśli tak - zamienia go w link do
// jw.org. Działa w obrębie jednego węzła tekstowego (bez przeskakiwania przez formatowanie
// zmienione w połowie odnośnika) - przy zwykłym pisaniu notatki to jedyny realny przypadek.
function linkifyBibleReferenceBeforeCursor() {
  const selection = window.getSelection()
  if (!selection || !selection.isCollapsed) return
  const node = selection.anchorNode
  if (!node || node.nodeType !== Node.TEXT_NODE) return

  const offset = selection.anchorOffset
  const match = matchBibleReferenceAtEnd(node.textContent.slice(0, offset))
  if (!match) return

  const range = document.createRange()
  range.setStart(node, match.matchStart)
  range.setEnd(node, match.matchEnd)
  selection.removeAllRanges()
  selection.addRange(range)

  document.execCommand('createLink', false, match.url)

  const after = selection.anchorNode
  const linkEl = after?.nodeType === Node.TEXT_NODE ? after.parentElement?.closest('a') : after?.closest?.('a')
  if (!linkEl) return
  linkEl.target = '_blank'
  linkEl.rel = 'noopener noreferrer'
  linkEl.className = 'bible-ref-link'

  // Jeśli po odnośniku został jeszcze niedołączony do linku znak ")" (patrz matchBibleReferenceAtEnd),
  // kursor musi wylądować ZA nim, nie zaraz po linku - inaczej Enter wstawiłby złamanie linii
  // między link a jego własny nawias zamykający.
  const trailingSibling = linkEl.nextSibling
  const collapsedAfterLink = document.createRange()
  if (match.hadTrailingParen && trailingSibling?.nodeType === Node.TEXT_NODE) {
    collapsedAfterLink.setStart(trailingSibling, trailingSibling.textContent.length)
  } else {
    collapsedAfterLink.setStartAfter(linkEl)
  }
  collapsedAfterLink.collapse(true)
  selection.removeAllRanges()
  selection.addRange(collapsedAfterLink)
}

// Notatka z podstawowym formatowaniem (rozmiar, pogrubienie/kursywa/podkreślenie, kolor) -
// treść trzymana jako HTML. Wykorzystuje document.execCommand: przestarzałe API, ale wciąż
// jedyne proste, zero-zależnościowe rozwiązanie do formatowania tekstu w contentEditable,
// które działa niezawodnie na mobilnych przeglądarkach.
export function RichNoteEditor({ id, html, onChange, onBlur, placeholder, onExpand, expandable = true }) {
  const ref = useRef(null)
  const syncedIdRef = useRef(null)

  useEffect(() => {
    if (ref.current && syncedIdRef.current !== id) {
      ref.current.innerHTML = html || ''
      syncedIdRef.current = id
    }
  }, [id, html])

  // Natywny listener zamiast propa onBeforeInput - syntetyczne zdarzenie Reacta dla
  // beforeinput nie przekazuje poprawnie inputType, więc trzeba podpiąć się bezpośrednio
  // pod DOM. beforeinput (nie keydown) wybrany dlatego, że na klawiaturach mobilnych Enter
  // często nie daje wiarygodnego keydown/keyCode (obsługa IME), za to
  // insertParagraph/insertLineBreak z beforeinput działa spójnie na Androidzie i iOS.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const handleBeforeInput = (e) => {
      if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {
        linkifyBibleReferenceBeforeCursor()
      }
    }
    el.addEventListener('beforeinput', handleBeforeInput)
    return () => el.removeEventListener('beforeinput', handleBeforeInput)
  }, [])

  const exec = (command, value) => {
    ref.current?.focus()
    document.execCommand(command, false, value)
    onChange(id, ref.current.innerHTML)
  }

  return (
    <div className="rich-note">
      <Toolbar onCommand={exec} />
      <div className="position-relative">
        <div
          ref={ref}
          className="rich-note-content form-control form-control-sm"
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={() => onChange(id, ref.current.innerHTML)}
          onBlur={onBlur}
        />
        {expandable && (
          <button type="button" className="rich-note-expand-btn" onClick={onExpand} aria-label="Powiększ notatkę">
            <SearchIcon size={16} />
          </button>
        )}
      </div>
    </div>
  )
}

// Pełnoekranowy widok tej samej notatki - osobna, świeżo montowana instancja edytora
// (dzięki temu zawsze startuje z aktualną treścią, bez ręcznej synchronizacji DOM-u).
export function RichNoteFullscreen({ id, html, onChange, onBlur, placeholder, onClose }) {
  return (
    <div className="rich-note-fullscreen">
      <div className="rich-note-fullscreen-header">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="Zamknij">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="rich-note-fullscreen-body">
        <RichNoteEditor id={id} html={html} onChange={onChange} onBlur={onBlur} placeholder={placeholder} expandable={false} />
      </div>
    </div>
  )
}
