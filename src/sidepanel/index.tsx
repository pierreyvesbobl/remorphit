import React from 'react'
import ReactDOM from 'react-dom/client'
import SidePanel from './SidePanel'
import '../index.css'

console.log('--- SIDEPANEL ENTRY POINT LOADED ---');

try {
    const rootElement = document.getElementById('root');
    console.log('Root element found:', !!rootElement);

    if (rootElement) {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <SidePanel />
            </React.StrictMode>,
        );
    }
} catch (e) {
    console.error('Render error:', e);
}
