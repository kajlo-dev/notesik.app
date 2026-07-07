import { useEffect, useRef, useState } from 'react'
import { getSettings, saveSettings } from '../lib/db'
import { fetchAvailablePrograms, downloadAndImportProgram, importProgramFromFile } from '../lib/programsRepo'
import { CloudDownloadIcon, UploadFileIcon } from '../components/icons/icons'
import { ProgramThumb } from '../components/ProgramThumb'
import { CoffeeBanner } from '../components/CoffeeBanner'

const INTERVAL_OPTIONS = [1, 2, 5, 10]
const TEXT_SIZE_OPTIONS = [
  { id: 'small', label: 'Mały' },
  { id: 'medium', label: 'Średni' },
  { id: 'large', label: 'Duży' },
]
const TABS = [
  { id: 'program', label: 'Program' },
  { id: 'notatki', label: 'Notatki' },
  { id: 'pomoc', label: 'Pomoc' },
]

export function SettingsPage({ onNavigate, onShowHelp, onShowWhatsNew, textSize, onTextSizeChange }) {
  const [activeTab, setActiveTab] = useState('program')
  const [available, setAvailable] = useState([])
  const [loadingAvailable, setLoadingAvailable] = useState(true)
  const [downloadingPub, setDownloadingPub] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [autosaveMinutes, setAutosaveMinutes] = useState(2)
  const [message, setMessage] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchAvailablePrograms().then((list) => {
      setAvailable(list)
      setLoadingAvailable(false)
    })
    getSettings().then((s) => setAutosaveMinutes(s.autosaveIntervalMinutes))
  }, [])

  const handleIntervalChange = async (minutes) => {
    setAutosaveMinutes(minutes)
    const settings = await getSettings()
    await saveSettings({ ...settings, autosaveIntervalMinutes: minutes })
  }

  const handleDownload = async (entry) => {
    setDownloadingPub(entry.pub)
    setMessage(null)
    try {
      await downloadAndImportProgram(entry)
      setMessage({ type: 'success', text: `Pobrano „${entry.title}”.` })
      onNavigate('program')
    } catch {
      setMessage({ type: 'danger', text: 'Nie udało się pobrać lub przetworzyć programu.' })
    } finally {
      setDownloadingPub(null)
    }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setMessage(null)
    try {
      await importProgramFromFile(file)
      setMessage({ type: 'success', text: `Zaimportowano plik „${file.name}”.` })
      onNavigate('program')
    } catch {
      setMessage({ type: 'danger', text: 'Nie udało się wczytać tego pliku PDF.' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <CoffeeBanner />
      <div className="p-3">
        <h1 className="h6 text-secondary mb-3">Ustawienia</h1>

        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

        <ul className="nav nav-tabs mb-3">
          {TABS.map((tab) => (
            <li key={tab.id} className="nav-item">
              <button
                type="button"
                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        {activeTab === 'program' && (
          <div>
            <section className="mb-4">
              <h2 className="h6">Pobierz program</h2>
              {loadingAvailable ? (
                <p className="text-secondary small">Wczytywanie listy…</p>
              ) : available.length === 0 ? (
                <p className="text-secondary small">
                  Lista programów jest jeszcze pusta. Spróbuj wgrać plik PDF ręcznie poniżej.
                </p>
              ) : (
                <ul className="list-group mb-2">
                  {available.map((entry) => (
                    <li key={entry.pub} className="list-group-item program-row">
                      <ProgramThumb src={entry.thumbUrl} alt="" />
                      <div className="program-row-name">
                        <div className="fw-semibold">{entry.title}</div>
                        <div className="small text-secondary">{entry.type === 'kongres' ? 'Kongres' : 'Zgromadzenie'}</div>
                      </div>
                      <div className="program-row-actions">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          disabled={downloadingPub === entry.pub}
                          onClick={() => handleDownload(entry)}
                          aria-label="Pobierz"
                        >
                          {downloadingPub === entry.pub ? '…' : <CloudDownloadIcon size={18} />}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h2 className="h6">Wgraj plik PDF ręcznie</h2>
              <p className="small text-secondary">
                Jeśli programu nie ma na liście powyżej, możesz wgrać pobrany wcześniej plik PDF.
              </p>
              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadFileIcon size={18} className="me-2" />
                {uploading ? 'Wczytywanie…' : 'Wybierz plik PDF'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="d-none"
                onChange={handleFileUpload}
              />
            </section>
          </div>
        )}

        {activeTab === 'notatki' && (
          <div>
            <section className="mb-4">
              <h2 className="h6">Automatyczny zapis notatek</h2>
              <div className="btn-group" role="group">
                {INTERVAL_OPTIONS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`btn btn-sm ${autosaveMinutes === m ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => handleIntervalChange(m)}
                  >
                    co {m} min
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h2 className="h6">Rozmiar tekstu</h2>
              <div className="btn-group" role="group">
                {TEXT_SIZE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`btn btn-sm ${textSize === opt.id ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => onTextSizeChange(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'pomoc' && (
          <section className="d-flex flex-column gap-2 align-items-start">
            <h2 className="h6">Pomoc</h2>
            <button type="button" className="btn btn-outline-secondary" onClick={onShowHelp}>
              Pokaż jak używać
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onShowWhatsNew}>
              Co nowego
            </button>
          </section>
        )}
      </div>
    </div>
  )
}
