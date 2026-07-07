import { EditDocumentIcon, ListIcon, SettingsIcon } from './icons/icons'

const TABS = [
  { id: 'program', label: 'Program', Icon: EditDocumentIcon },
  { id: 'list', label: 'Lista', Icon: ListIcon },
  { id: 'settings', label: 'Ustawienia', Icon: SettingsIcon },
]

export function BottomNav({ active, onChange }) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav-item${active === id ? ' active' : ''}`}
          onClick={() => onChange(id)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
