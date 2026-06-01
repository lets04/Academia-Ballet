import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './contexts/auth'
import { ThemeProvider } from './contexts/theme'
import { BranchProvider } from './contexts/branch'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BranchProvider>
          <App />
        </BranchProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
