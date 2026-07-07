import { useEffect, useRef } from 'react'
import { SearchIcon, CloseIcon } from './icons/icons'

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
