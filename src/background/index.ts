// Background script
console.log('ReMixIt Background Script Loaded');

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'remixit-main',
        title: 'ReMixIt : Transformer ce contenu',
        contexts: ['selection', 'page'],
    });
});

chrome.contextMenus.onClicked.addListener((info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (info.menuItemId === 'remixit-main') {
        // Open the side panel
        // Note: chrome.sidePanel.open is only available in user-gesture context.
        // Making sure we open the side panel on the current window.
        if (tab && tab.id && tab.windowId) {
            chrome.sidePanel.open({ windowId: tab.windowId });
            // We might want to send the selection to the sidepanel via messaging or storage
            // For now, let's just save it to storage so sidepanel can read it on load
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

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SEND_WEBHOOK') {
        (async () => {
            try {
                const response = await fetch(request.url, {
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
        // This requires a valid tab and window
        if (sender.tab && sender.tab.id && sender.tab.windowId) {
            // Side panel opening requires user gesture. 
            // IMPORTANT: chrome.sidePanel.open can ONLY be called inside a user action handler (like context menu click or extension icon click).
            // It CANNOT be called from a content script message unless that message was initiated by a user gesture AND the browser supports it (recent Chrome versions are stricter).
            // However, let's try. If it fails, we might need checking permission.
            chrome.sidePanel.open({ windowId: sender.tab.windowId, tabId: sender.tab.id })
                .catch(err => console.error("Could not open side panel:", err));
        }
    }
});

