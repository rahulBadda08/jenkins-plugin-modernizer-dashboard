import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './global.css'
import Dashboard from './Dashboard.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
)
