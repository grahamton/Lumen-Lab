import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useStore } from './store/useStore'

// Dev-only handle for driving the store from devtools or Playwright,
// e.g. simulating MIDI with __lumen.useStore.getState().setMidi('lastMsg', ...).
if (import.meta.env.DEV) window.__lumen = { useStore }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
