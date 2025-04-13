// Initialize and manage bookmarks and extension state
let secondBarBookmarks = [];

// Load saved bookmarks when extension starts
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['secondBarBookmarks'], (result) => {
    if (result.secondBarBookmarks) {
      secondBarBookmarks = result.secondBarBookmarks;
    } else {
      // Initialize with empty array if no bookmarks exist
      chrome.storage.local.set({ secondBarBookmarks: [] });
    }
  });
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getBookmarks') {
    // Send all bookmarks to requesting script
    chrome.storage.local.get(['secondBarBookmarks'], (result) => {
      sendResponse({ bookmarks: result.secondBarBookmarks || [] });
    });
    return true; // Required for async sendResponse
  } 
  else if (request.action === 'addBookmark') {
    // Add a new bookmark
    const newBookmark = {
      id: Date.now().toString(), // Simple unique ID
      title: request.title,
      url: request.url,
      favicon: request.favicon || ''
    };
    
    chrome.storage.local.get(['secondBarBookmarks'], (result) => {
      const bookmarks = result.secondBarBookmarks || [];
      bookmarks.push(newBookmark);
      chrome.storage.local.set({ secondBarBookmarks: bookmarks }, () => {
        // Notify all tabs to update the bookmark bar
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'updateBookmarks' })
              .catch(err => console.log('Tab not ready yet'));
          });
        });
        sendResponse({ success: true, bookmark: newBookmark });
      });
    });
    return true; // Required for async sendResponse
  }
  else if (request.action === 'removeBookmark') {
    // Remove a bookmark by ID
    chrome.storage.local.get(['secondBarBookmarks'], (result) => {
      const bookmarks = result.secondBarBookmarks || [];
      const filteredBookmarks = bookmarks.filter(b => b.id !== request.id);
      chrome.storage.local.set({ secondBarBookmarks: filteredBookmarks }, () => {
        // Notify all tabs to update the bookmark bar
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, { action: 'updateBookmarks' })
              .catch(err => console.log('Tab not ready yet'));
          });
        });
        sendResponse({ success: true });
      });
    });
    return true; // Required for async sendResponse
  }
});