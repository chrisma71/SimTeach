// Side Panel JavaScript
document.addEventListener('DOMContentLoaded', function() {
    console.log('Side panel loaded');
    
    const urlElement = document.getElementById('current-url');
    const refreshBtn = document.getElementById('refresh-btn');
    
    // Function to update the current URL
    function updateCurrentUrl() {
        chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
            if (tabs[0] && urlElement) {
                urlElement.textContent = tabs[0].url;
            }
        });
    }
    
    // Update URL on load
    updateCurrentUrl();
    
    // Refresh button functionality
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            updateCurrentUrl();
        });
    }
    
    // Listen for tab updates to refresh URL
    chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
        if (changeInfo.status === 'complete' && tab.active) {
            updateCurrentUrl();
        }
    });
    
    // Listen for tab activation
    chrome.tabs.onActivated.addListener(function(activeInfo) {
        updateCurrentUrl();
    });
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === 'updateUrl') {
            updateCurrentUrl();
        }
        
        if (request.action === 'getPanelInfo') {
            sendResponse({
                type: 'sidePanel',
                status: 'active',
                url: urlElement ? urlElement.textContent : 'unknown'
            });
        }
    });
    
    console.log('Side panel script initialized');
});
