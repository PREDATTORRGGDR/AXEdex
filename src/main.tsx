import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/manrope'
import '@fontsource-variable/exo-2'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App'
import { requestPersistentStorage } from './store/backup'
import { startFpsProbe } from './store/perf'
import { useCasino } from './store/casino'

requestPersistentStorage()
startFpsProbe()

// Keep several open tabs in sync: another tab's wallet change reloads ours.
window.addEventListener('storage', (e) => {
  if (e.key === 'axedex:casino') void useCasino.persist.rehydrate()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
