import { CHANGELOG } from '../lib/changelog'
import { CloseIcon } from './icons/icons'

// "RRRR-MM-DD" albo "RRRR-MM-DD GG:MM" -> "DD.MM.RRRR[, GG:MM]"
function formatEntryDate({ date }) {
  const [datePart, timePart] = date.split(' ')
  const [y, m, d] = datePart.split('-')
  return timePart ? `${d}.${m}.${y}, ${timePart}` : `${d}.${m}.${y}`
}

function ChangelogItems({ entry }) {
  return (
    <ul className="text-secondary mb-0">
      {entry.items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export function WhatsNewModal({ onClose }) {
  const [latest, ...older] = CHANGELOG

  return (
    <div className="rich-note-fullscreen" role="dialog" aria-modal="true" aria-label="Co nowego">
      <div className="rich-note-fullscreen-header">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="Zamknij">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="rich-note-fullscreen-body">
        <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
          <h1 className="h5 mb-0">Co nowego</h1>
          <span className="text-secondary small text-nowrap">{formatEntryDate(latest)}</span>
        </div>

        <ChangelogItems entry={latest} />

        {older.length > 0 && (
          <details className="changelog-history mt-4">
            <summary>Historia wszystkich nowości ({older.length})</summary>
            <div className="mt-2">
              {older.map((entry) => (
                <div key={entry.version} className="mb-3">
                  <h2 className="h6 text-primary">{formatEntryDate(entry)}</h2>
                  <ChangelogItems entry={entry} />
                </div>
              ))}
            </div>
          </details>
        )}

        <button type="button" className="btn btn-primary w-100 mb-3 mt-4" onClick={onClose}>
          Super, zamykam
        </button>
      </div>
    </div>
  )
}
