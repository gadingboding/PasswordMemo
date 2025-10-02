import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import { initializeI18n } from './i18n' // Import i18n initialization

// Initialize sodium for cryptographic operations
import _sodium from 'libsodium-wrappers'

async function initializeApp() {
  await _sodium.ready
  await initializeI18n // Wait for i18n to initialize
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

initializeApp().catch(console.error)