import { useEffect, useState } from 'react'
import { useIsMobile } from './lib/useIsMobile'
import { getSettings, saveSettings } from './lib/db'
import { DesktopBlock } from './components/DesktopBlock'
import { BottomNav } from './components/BottomNav'
import { OnboardingModal } from './components/OnboardingModal'
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

function App() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('program')
  const [focusItemId, setFocusItemId] = useState(null)
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    getSettings().then((settings) => {
      if (!settings.hasSeenOnboarding) setShowHelp(true)
    })
  }, [])

  const closeHelp = async (dontShowAgain) => {
    setShowHelp(false)
    if (dontShowAgain) {
      const settings = await getSettings()
      await saveSettings({ ...settings, hasSeenOnboarding: true })
    }
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
        <Page onNavigate={navigate} onShowHelp={() => setShowHelp(true)} focusItemId={tab === 'program' ? focusItemId : null} />
      </div>
      <BottomNav active={tab} onChange={handleTabChange} />
      {showHelp && <OnboardingModal onClose={closeHelp} />}
    </div>
  )
}

export default App
