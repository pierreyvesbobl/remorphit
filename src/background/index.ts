// Background script

// Open side panel when clicking the extension icon in toolbar
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'remorphit-main',
        title: 'ReMorphIt: Transform this content',
        contexts: ['selection', 'page'],
    });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === 'remorphit-main') {
        if (tab && tab.id && tab.windowId) {
            chrome.sidePanel.open({ windowId: tab.windowId });
            chrome.storage.local.set({
                pendingContent: {
                    selectionText: info.selectionText,
                    pageUrl: info.pageUrl,
                    timestamp: Date.now()
                }
            });
        }
    }
});

// Relay tab navigation events to side panel via chrome.storage.session
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tab.active && (changeInfo.status === 'complete' || changeInfo.url)) {
        chrome.storage.session.set({
            activeTabChange: { tabId, url: tab.url, ts: Date.now() }
        });
    }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab?.url) {
            chrome.storage.session.set({
                activeTabChange: { tabId: activeInfo.tabId, url: tab.url, ts: Date.now() }
            });
        }
    });
});

// Validate that a URL is safe for fetch (HTTPS only, no local/internal URLs)
function isValidWebhookUrl(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Validate sender is from our own extension
function isExtensionSender(sender: chrome.runtime.MessageSender): boolean {
    return sender.id === chrome.runtime.id;
}

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Only accept messages from our own extension
    if (!isExtensionSender(sender)) return;

    if (request.action === 'SEND_WEBHOOK') {
        const url = request.url;

        // Validate webhook URL
        if (!url || !isValidWebhookUrl(url)) {
            sendResponse({ success: false, error: 'Invalid webhook URL. Only HTTPS URLs are allowed.' });
            return true;
        }

        (async () => {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(request.payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    sendResponse({ success: true, data: data });
                } else {
                    sendResponse({ success: false, error: `Status: ${response.status} ${response.statusText}` });
                }
            } catch (error) {
                console.error("Webhook error", error);
                sendResponse({ success: false, error: (error as Error).message });
            }
        })();
        return true; // Keep channel open for async response
    }

    if (request.action === 'OPEN_SIDE_PANEL') {
        if (sender.tab && sender.tab.id && sender.tab.windowId) {
            chrome.sidePanel.open({ windowId: sender.tab.windowId, tabId: sender.tab.id })
                .catch(err => console.error("Could not open side panel:", err));
        }
    }
});
