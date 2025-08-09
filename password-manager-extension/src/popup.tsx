import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// Initialize sodium for cryptographic operations
import _sodium from 'libsodium-wrappers'

async function initializeApp() {
  await _sodium.ready
  
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <div className="h-[600px] w-[400px]">
          <App />
        </div>
      </HashRouter>
    </StrictMode>
  );
}

initializeApp().catch(console.error)