import { useEffect, useState } from 'react'
import { getSettings, saveSettings } from '../lib/db'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import { DownloadIcon, CloseIcon } from './icons/icons'

export function InstallBanner() {
  const { installed, canInstall, showManualIOSInstructions, promptInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    getSettings().then((s) => setDismissed(!!s.installBannerDismissed))
  }, [])

  const dismiss = async () => {
    setDismissed(true)
    const settings = await getSettings()
    await saveSettings({ ...settings, installBannerDismissed: true })
  }

  if (installed || dismissed || !(canInstall || showManualIOSInstructions)) return null

  return (
    <div className="alert alert-primary d-flex align-items-center gap-2 mb-0 rounded-0 py-2 px-3">
      <DownloadIcon size={20} />
      <div className="flex-grow-1 small">
        {canInstall
          ? 'Zainstaluj Notesik Lite na ekranie głównym - będzie działać jak zwykła aplikacja, też offline.'
          : 'Dodaj Notesik Lite do ekranu głównego: stuknij ikonę udostępniania (□↑), a potem „Dodaj do ekranu początkowego".'}
      </div>
      {canInstall && (
        <button type="button" className="btn btn-sm btn-primary" onClick={promptInstall}>
          Zainstaluj
        </button>
      )}
      <button type="button" className="btn btn-sm btn-outline-secondary border-0" onClick={dismiss} aria-label="Zamknij">
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
