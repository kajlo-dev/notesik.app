import { useEffect, useState } from 'react'
import { saveSettings, getSettings } from '../lib/db'
import { searchNotes } from '../lib/noteSearch'
import { SearchIcon } from '../components/icons/icons'

export function SearchPage({ onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setSearched(false)
      return undefined
    }
    const timer = setTimeout(async () => {
      const found = await searchNotes(trimmed)
      setResults(found)
      setSearched(true)
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  const openResult = async (result) => {
    const settings = await getSettings()
    if (settings.activeProgramId !== result.programId) {
      await saveSettings({ ...settings, activeProgramId: result.programId })
    }
    onNavigate('program', { focusItemId: result.itemId })
  }

  return (
    <div className="p-3">
      <h1 className="h6 text-secondary mb-3">Szukaj w notatkach</h1>

      <div className="input-group mb-2">
        <span className="input-group-text">
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          className="form-control"
          placeholder='Szukaj… np. "dobra nowina"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <p className="small text-secondary mb-3">
        Kilka słów = szuka wszystkich naraz. Fraza w cudzysłowie = szuka dokładnie takiego zwrotu.
      </p>

      {searched && results.length === 0 && (
        <p className="text-secondary">Brak notatek pasujących do „{query.trim()}”.</p>
      )}

      {results.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle search-results-table">
            <thead>
              <tr>
                <th scope="col">Program / punkt</th>
                <th scope="col">Fragment notatki</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={`${r.programId}-${r.itemId}-${i}`} role="button" onClick={() => openResult(r)}>
                  <td>
                    <div className="small text-secondary">{r.programTitle}</div>
                    <div className="fw-semibold">
                      {r.time && <span className="text-secondary">{r.time} </span>}
                      {r.label && <span className="text-uppercase">{r.label}: </span>}
                      {r.title}
                    </div>
                  </td>
                  <td className="small">{r.snippet}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
