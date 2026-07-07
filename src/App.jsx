import { useState } from 'react'
import { useIsMobile } from './lib/useIsMobile'
import { DesktopBlock } from './components/DesktopBlock'
import { BottomNav } from './components/BottomNav'
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

  if (!isMobile) {
    return <DesktopBlock />
  }

  const Page = PAGES[tab]

  return (
    <div className="app-shell">
      <div className="app-content">
        <Page onNavigate={setTab} />
      </div>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  )
}

export default App
