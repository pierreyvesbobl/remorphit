import React from 'react'
import ReactDOM from 'react-dom/client'
import Options from './Options'
import '../index.css' // Global styles (Tailwind)

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Options />
    </React.StrictMode>,
)
