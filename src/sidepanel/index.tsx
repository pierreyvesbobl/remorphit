import React from 'react'
import ReactDOM from 'react-dom/client'
import SidePanel from './SidePanel'
import '../index.css'

const rootElement = document.getElementById('root');

if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <SidePanel />
        </React.StrictMode>,
    );
}
