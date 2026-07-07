import { CHANGELOG } from '../lib/changelog'
import { CloseIcon } from './icons/icons'

export function WhatsNewModal({ onClose }) {
  return (
    <div className="rich-note-fullscreen" role="dialog" aria-modal="true" aria-label="Co nowego">
      <div className="rich-note-fullscreen-header">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onClose} aria-label="Zamknij">
          <CloseIcon size={20} />
        </button>
      </div>
      <div className="rich-note-fullscreen-body">
        <h1 className="h5 mb-3">Co nowego</h1>

        {CHANGELOG.map((entry) => (
          <div key={entry.version} className="mb-4">
            <h2 className="h6 text-primary">{entry.date}</h2>
            <ul className="text-secondary">
              {entry.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        <button type="button" className="btn btn-primary w-100 mb-3" onClick={onClose}>
          Super, zamykam
        </button>
      </div>
    </div>
  )
}
