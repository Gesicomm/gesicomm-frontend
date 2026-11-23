import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Fuente de marca, auto-hospedada (sin request a Google): variable, así que
// un solo archivo cubre todos los pesos. Ver --font-sans en index.css.
import '@fontsource-variable/plus-jakarta-sans'
import '@fontsource-variable/inter'
import '@fontsource-variable/instrument-sans'
import './index.css'
import './styles/systemTypography.css'
import './styles/panelComponents.css'
import './styles/gesicomTheme.css'
import { registerChunkRecovery } from './lib/chunkRecovery'
import { prepararActivacion } from './lib/prepararActivacion'

prepararActivacion(window)
registerChunkRecovery(window, import.meta.url)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
