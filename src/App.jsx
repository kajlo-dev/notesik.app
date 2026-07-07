import { useEffect, useState } from 'react'
import { useIsMobile } from './lib/useIsMobile'
import { getSettings, saveSettings } from './lib/db'
import { DesktopBlock } from './components/DesktopBlock'
import { BottomNav } from './components/BottomNav'
import { OnboardingModal } from './components/OnboardingModal'
import { ProgramPage } from './pages/ProgramPage'
import { ListPage } from './pages/ListPage'
import { SettingsPage } from './pages/SettingsPage'

const PAGES = {
  program: ProgramPage,
  list: ListPage,
  settings: SettingsPage,
}

function App() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState('program')
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

  if (!isMobile) {
    return <DesktopBlock />
  }

  const Page = PAGES[tab]

  return (
    <div className="app-shell">
      <div className="app-content">
        <Page onNavigate={setTab} onShowHelp={() => setShowHelp(true)} />
      </div>
      <BottomNav active={tab} onChange={setTab} />
      {showHelp && <OnboardingModal onClose={closeHelp} />}
    </div>
  )
}

export default App
