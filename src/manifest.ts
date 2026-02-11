import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
    manifest_version: 3,
    name: 'ReMixIt',
    version: '1.0.0',
    description: 'Transformez le web en contenu prêt à l\'emploi avec ReMixIt',
    permissions: ['sidePanel', 'storage', 'activeTab', 'scripting', 'contextMenus', 'tabs'],
    host_permissions: ['<all_urls>'],
    background: {
        service_worker: 'src/background/index.ts',
        type: 'module',
    },
    action: {
        default_title: 'Ouvrir ReMixIt',
        default_icon: {
            '16': 'public/icon16.png',
            '32': 'public/icon32.png',
            '48': 'public/icon48.png',
            '128': 'public/icon128.png',
        },
    },
    icons: {
        '16': 'public/icon16.png',
        '32': 'public/icon32.png',
        '48': 'public/icon48.png',
        '128': 'public/icon128.png',
    },
    side_panel: {
        default_path: 'src/sidepanel/index.html',
    },
    options_page: 'src/options/index.html',

    content_scripts: [
        {
            matches: ['<all_urls>'],
            js: ['src/content/index.ts'],
        },
    ],
    web_accessible_resources: [
        {
            resources: ['WhiteIcon512.png', 'public/WhiteIcon512.png'],
            matches: ['<all_urls>'],
        },
    ],
})
