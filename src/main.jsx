import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useStore } from './store/useStore'
import { presets } from './presets'

// Dev-only handle for test drivers (Playwright scripts, the run-lumenlab skill):
// importing the store module from page.evaluate yields a second instance under HMR.
if (import.meta.env.DEV) {
  window.__lumen = { useStore, presets }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
