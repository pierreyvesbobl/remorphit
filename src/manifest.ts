import { defineManifest } from '@crxjs/vite-plugin'

export default defineManifest({
    manifest_version: 3,
    name: 'ReMorphIt',
    version: '1.0.0',
    description: 'Turn any social media content into ready-to-publish posts written in your voice.',
    permissions: ['sidePanel', 'storage', 'activeTab', 'contextMenus', 'tabs', 'identity'],
    host_permissions: [
        '*://*.youtube.com/*',
        '*://*.youtu.be/*',
        '*://*.twitter.com/*',
        '*://*.x.com/*',
        '*://*.linkedin.com/*',
        '*://*.instagram.com/*',
        '*://*.facebook.com/*',
    ],
    background: {
        service_worker: 'src/background/index.ts',
        type: 'module',
    },
    action: {
        default_title: 'Ouvrir ReMorphIt',
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
            matches: [
                '*://*.youtube.com/*',
                '*://*.youtu.be/*',
                '*://*.twitter.com/*',
                '*://*.x.com/*',
                '*://*.linkedin.com/*',
                '*://*.instagram.com/*',
                '*://*.facebook.com/*',
            ],
            js: ['src/content/index.ts'],
        },
    ],
    web_accessible_resources: [
        {
            resources: ['WhiteIcon512.png', 'public/WhiteIcon512.png'],
            matches: [
                '*://*.youtube.com/*',
                '*://*.youtu.be/*',
                '*://*.twitter.com/*',
                '*://*.x.com/*',
                '*://*.linkedin.com/*',
                '*://*.instagram.com/*',
                '*://*.facebook.com/*',
            ],
        },
    ],
})
