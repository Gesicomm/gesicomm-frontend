import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Fuente de marca, auto-hospedada (sin request a Google): variable, así que
// un solo archivo cubre todos los pesos. Ver --font-sans en index.css.
import '@fontsource-variable/plus-jakarta-sans'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
