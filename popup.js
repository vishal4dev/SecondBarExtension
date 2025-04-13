// Functionality for the popup interface

document.addEventListener('DOMContentLoaded', function() {
    // Load bookmarks when popup opens
    loadBookmarks();
    
    // Setup event listeners
    document.getElementById('addBookmarkBtn').addEventListener('click', addBookmark);
    document.getElementById('addCurrentPageBtn').addEventListener('click', addCurrentPage);
    document.getElementById('toggleVisibility').addEventListener('change', toggleBarVisibility);
    
    // Check visibility state
    chrome.storage.local.get(['secondBarVisible'], function(result) {
      document.getElementById('toggleVisibility').checked = result.secondBarVisible !== false;
    });
  });
  
  // Load bookmarks from storage
  function loadBookmarks() {
    chrome.runtime.sendMessage({ action: 'getBookmarks' }, function(response) {
      const bookmarkList = document.getElementById('bookmarkList');
      bookmarkList.innerHTML = '';
      
      if (response && response.bookmarks && response.bookmarks.length > 0) {
        response.bookmarks.forEach(function(bookmark) {
          const bookmarkItem = document.createElement('div');
          bookmarkItem.className = 'bookmark-item';
          
          // Favicon or default icon
          if (bookmark.favicon) {
            const faviconImg = document.createElement('img');
            faviconImg.className = 'bookmark-favicon';
            faviconImg.src = bookmark.favicon;
            bookmarkItem.appendChild(faviconImg);
          } else {
            const defaultIcon = document.createElement('div');
            defaultIcon.className = 'default-favicon';
            defaultIcon.textContent = bookmark.title.charAt(0).toUpperCase();
            bookmarkItem.appendChild(defaultIcon);
          }
          
          // Bookmark title with link
          const titleLink = document.createElement('a');
          titleLink.className = 'bookmark-title';
          titleLink.href = bookmark.url;
          titleLink.textContent = bookmark.title;
          titleLink.target = '_blank';
          bookmarkItem.appendChild(titleLink);
          
          // Remove button
          const removeBtn = document.createElement('span');
          removeBtn.className = 'remove-button';
          removeBtn.textContent = '×';
          removeBtn.title = 'Remove Bookmark';
          removeBtn.addEventListener('click', function() {
            removeBookmark(bookmark.id);
          });
          bookmarkItem.appendChild(removeBtn);
          
          bookmarkList.appendChild(bookmarkItem);
        });
      } else {
        // Empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No bookmarks yet. Add your first bookmark!';
        bookmarkList.appendChild(emptyState);
      }
    });
  }
  
  // Add a new bookmark manually
  function addBookmark() {
    const titleInput = document.getElementById('bookmarkTitle');
    const urlInput = document.getElementById('bookmarkUrl');
    
    const title = titleInput.value.trim();
    let url = urlInput.value.trim();
    
    // Validate inputs
    if (!title) {
      alert('Please enter a bookmark title');
      return;
    }
    
    if (!url) {
      alert('Please enter a bookmark URL');
      return;
    }
    
    // Add http:// if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }
    
    // Send message to add bookmark
    chrome.runtime.sendMessage({
      action: 'addBookmark',
      title: title,
      url: url,
      favicon: '' // No favicon for manually added bookmarks
    }, function(response) {
      if (response && response.success) {
        // Clear form and reload bookmarks
        titleInput.value = '';
        urlInput.value = '';
        loadBookmarks();
      }
    });
  }
  
  // Add current page as bookmark
  function addCurrentPage() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs && tabs[0]) {
        const currentTab = tabs[0];
        
        chrome.runtime.sendMessage({
          action: 'addBookmark',
          title: currentTab.title,
          url: currentTab.url,
          favicon: currentTab.favIconUrl || ''
        }, function(response) {
          if (response && response.success) {
            loadBookmarks();
          }
        });
      }
    });
  }
  
  // Remove a bookmark
  function removeBookmark(id) {
    chrome.runtime.sendMessage({
      action: 'removeBookmark',
      id: id
    }, function(response) {
      if (response && response.success) {
        loadBookmarks();
      }
    });
  }
  
  // Toggle the visibility of the second bookmark bar
  function toggleBarVisibility() {
    const visible = document.getElementById('toggleVisibility').checked;
    
    chrome.storage.local.set({ secondBarVisible: visible }, function() {
      // Send message to update all open tabs
      chrome.tabs.query({}, function(tabs) {
        tabs.forEach(function(tab) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'updateVisibility', 
            visible: visible 
          }).catch(err => {
            // Ignore errors for tabs where content script isn't loaded
          });
        });
      });
    });
  }