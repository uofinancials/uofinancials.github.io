import { QueryClient } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { App } from './app'
import { createAppRouter } from './router'

const root = document.getElementById('root')
if (!root) throw new Error('index.html is missing #root')

const queryClient = new QueryClient()
const router = createAppRouter({ queryClient })

createRoot(root).render(
  <StrictMode>
    <App queryClient={queryClient} router={router} />
  </StrictMode>,
)
