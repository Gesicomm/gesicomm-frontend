import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Fuente de marca, auto-hospedada (sin request a Google): variable, así que
// un solo archivo cubre todos los pesos. Ver --font-sans en index.css.
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'
import './styles/systemTypography.css'
import './styles/panelComponents.css'
import { registerChunkRecovery } from './lib/chunkRecovery'

registerChunkRecovery(window, import.meta.url)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
