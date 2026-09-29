import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { requestPersistentStorage } from './store/backup'
import { useCasino } from './store/casino'

requestPersistentStorage()

// Keep several open tabs in sync: another tab's wallet change reloads ours.
window.addEventListener('storage', (e) => {
  if (e.key === 'axedex:casino') void useCasino.persist.rehydrate()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
