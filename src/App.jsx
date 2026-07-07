import { useEffect, useState } from 'react'
import { useIsMobile } from './lib/useIsMobile'
import { getSettings, saveSettings } from './lib/db'
import { CHANGELOG_VERSION } from './lib/changelog'
import { DesktopBlock } from './components/DesktopBlock'
import { BottomNav } from './components/BottomNav'
import { OnboardingModal } from './components/OnboardingModal'
import { WhatsNewModal } from './components/WhatsNewModal'
import { ProgramPage } from './pages/ProgramPage'
import { ListPage } from './pages/ListPage'
import { SearchPage } from './pages/SearchPage'
import { SettingsPage } from './pages/SettingsPage'

const PAGES = {
  program: ProgramPage,
  list: ListPage,
  search: SearchPage,
  settings: SettingsPage,
}

const TEXT_SIZE_SCALE = { small: '93.75%', medium: '100%', large: '115%' }

function App() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('program')
  const [focusItemId, setFocusItemId] = useState(null)
  const [showHelp, setShowHelp] = useState(false)
  const [showWhatsNew, setShowWhatsNew] = useState(false)
  const [textSize, setTextSize] = useState('medium')

  useEffect(() => {
    getSettings().then((settings) => {
      setTextSize(settings.textSize || 'medium')
      if (!settings.hasSeenOnboarding) {
        setShowHelp(true)
      } else if ((settings.lastSeenChangelogVersion || 0) < CHANGELOG_VERSION) {
        setShowWhatsNew(true)
      }
    })
  }, [])

  // Rozmiar tekstu skaluje font-size na <html> - większość typografii Bootstrapa (i nasze
  // niestandardowe klasy tekstu) używa jednostek rem/em, więc przeskaluje się razem z tym
  // wszędzie w appce, nie tylko wewnątrz pojedynczej notatki.
  useEffect(() => {
    document.documentElement.style.fontSize = TEXT_SIZE_SCALE[textSize] || '100%'
  }, [textSize])

  const closeHelp = async (dontShowAgain) => {
    setShowHelp(false)
    if (dontShowAgain) {
      const settings = await getSettings()
      // Instruktaż już pokazuje aktualny stan appki - nie ma sensu zaraz potem dokładać
      // "co nowego" o zmianach sprzed pierwszego uruchomienia.
      await saveSettings({ ...settings, hasSeenOnboarding: true, lastSeenChangelogVersion: CHANGELOG_VERSION })
    }
  }

  const closeWhatsNew = async () => {
    setShowWhatsNew(false)
    const settings = await getSettings()
    await saveSettings({ ...settings, lastSeenChangelogVersion: CHANGELOG_VERSION })
  }

  const handleTextSizeChange = async (size) => {
    setTextSize(size)
    const settings = await getSettings()
    await saveSettings({ ...settings, textSize: size })
  }

  // Nawigacja z opcjonalnym payloadem - np. wyniki wyszukiwania przechodzą do Programu razem
  // z id punktu, do którego trzeba przewinąć.
  const navigate = (nextTab, opts = {}) => {
    setTab(nextTab)
    setFocusItemId(opts.focusItemId ?? null)
  }

  const handleTabChange = (nextTab) => navigate(nextTab)

  if (!isMobile) {
    return <DesktopBlock />
  }

  const Page = PAGES[tab]

  return (
    <div className="app-shell">
      <div className="app-content">
        <Page
          onNavigate={navigate}
          onShowHelp={() => setShowHelp(true)}
          onShowWhatsNew={() => setShowWhatsNew(true)}
          focusItemId={tab === 'program' ? focusItemId : null}
          textSize={textSize}
          onTextSizeChange={handleTextSizeChange}
        />
      </div>
      <BottomNav active={tab} onChange={handleTabChange} />
      {showHelp ? <OnboardingModal onClose={closeHelp} /> : showWhatsNew ? <WhatsNewModal onClose={closeWhatsNew} /> : null}
    </div>
  )
}

export default App
