// Background script for Side Panel Extension
chrome.runtime.onInstalled.addListener(function(details) {
    console.log('Side Panel Extension installed/updated');
    
    // Set up initial storage
    chrome.storage.local.set({
        sidePanelEnabled: true,
        extensionVersion: chrome.runtime.getManifest().version
    });
});

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener(function(tab) {
    console.log('Extension icon clicked, opening side panel');
    
    // Open the side panel
    chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from side panel
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log('Message received:', request);
    
    if (request.action === 'getExtensionStatus') {
        chrome.storage.local.get(['sidePanelEnabled'], function(result) {
            sendResponse({ 
                enabled: result.sidePanelEnabled !== false,
                version: chrome.runtime.getManifest().version,
                type: 'sidePanel'
            });
        });
        return true; // Keep message channel open for async response
    }
    
    if (request.action === 'updateUrl') {
        console.log('URL updated:', request.url);
        // Could store URL history or perform other actions here
    }
    
    if (request.action === 'getPanelInfo') {
        sendResponse({
            type: 'sidePanel',
            status: 'active',
            version: chrome.runtime.getManifest().version
        });
    }
});

// Handle tab updates
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.url) {
        console.log('Tab updated:', tab.url);
        // Notify side panel of URL change
        chrome.runtime.sendMessage({
            action: 'updateUrl',
            url: tab.url
        }).catch(() => {
            // Ignore errors if side panel is not open
        });
    }
});

// Handle tab activation
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (tab) {
            console.log('Tab activated:', tab.url);
            // Notify side panel of URL change
            chrome.runtime.sendMessage({
                action: 'updateUrl',
                url: tab.url
            }).catch(() => {
                // Ignore errors if side panel is not open
            });
        }
    });
});

console.log('Side Panel Extension background script loaded');