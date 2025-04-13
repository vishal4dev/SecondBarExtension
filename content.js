// Create and manage the second bookmark bar in the page

// Initialize the second bookmark bar as soon as possible
window.addEventListener('load', initializeSecondBar);

// Backup method to ensure initialization happens
document.addEventListener('DOMContentLoaded', function() {
  // Small delay to ensure the DOM is fully loaded
  setTimeout(initializeSecondBar, 500);
});

// Keep track of whether we've already initialized
let barInitialized = false;

// Initialize the second bookmark bar
function initializeSecondBar() {
  // Prevent multiple initializations
  if (barInitialized) return;
  barInitialized = true;
  
  console.log('Initializing Second Bookmark Bar');
  
  // Create the main container for our bookmark bar
  const secondBar = document.createElement('div');
  secondBar.id = 'second-bookmark-bar';
  secondBar.className = 'second-bookmark-bar';
  
  // Create inner container for the bookmarks
  const bookmarkContainer = document.createElement('div');
  bookmarkContainer.className = 'bookmark-container';
  secondBar.appendChild(bookmarkContainer);
  
  // Add a button to toggle visibility
  const toggleButton = document.createElement('div');
  toggleButton.className = 'toggle-button';
  toggleButton.innerHTML = '≡';
  toggleButton.title = 'Toggle Second Bookmark Bar';
  toggleButton.addEventListener('click', toggleSecondBar);
  secondBar.appendChild(toggleButton);
  
  // Insert the second bar at the top of the page
  const body = document.body;
  if (body) {
    body.insertBefore(secondBar, body.firstChild);
    
    // Force a layout change to make room for our bar
    const bodyStyle = document.createElement('style');
    bodyStyle.textContent = 'body { margin-top: 30px !important; padding-top: 30px !important; }';
    document.head.appendChild(bodyStyle);
    
    console.log('Second Bookmark Bar added to page');
  } else {
    console.error('Could not find body element');
  }
  
  // Load bookmarks from storage
  loadBookmarks();
  
  // Listen for updates from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateBookmarks') {
      console.log('Received updateBookmarks message');
      loadBookmarks();
    } else if (request.action === 'updateVisibility') {
      if (request.visible === false) {
        document.getElementById('second-bookmark-bar')?.classList.add('hidden');
      } else {
        document.getElementById('second-bookmark-bar')?.classList.remove('hidden');
      }
    }
  });
  
  // Check storage for visibility preference
  chrome.storage.local.get(['secondBarVisible'], (result) => {
    if (result.secondBarVisible === false) {
      secondBar.classList.add('hidden');
    }
  });
}

// Toggle the visibility of the second bookmark bar
function toggleSecondBar() {
  const bar = document.getElementById('second-bookmark-bar');
  if (bar) {
    if (bar.classList.contains('hidden')) {
      bar.classList.remove('hidden');
      chrome.storage.local.set({ secondBarVisible: true });
    } else {
      bar.classList.add('hidden');
      chrome.storage.local.set({ secondBarVisible: false });
    }
  }
}

// Load bookmarks from storage and display them
function loadBookmarks() {
  console.log('Loading bookmarks');
  chrome.runtime.sendMessage({ action: 'getBookmarks' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading bookmarks:', chrome.runtime.lastError);
      return;
    }
    
    if (response && response.bookmarks) {
      console.log('Received bookmarks:', response.bookmarks.length);
      displayBookmarks(response.bookmarks);
    } else {
      console.log('No bookmarks received');
      displayBookmarks([]);
    }
  });
}

// Display bookmarks in the second bar
function displayBookmarks(bookmarks) {
  const container = document.querySelector('.bookmark-container');
  if (!container) {
    console.error('Bookmark container not found');
    return;
  }
  
  // Clear current bookmarks
  container.innerHTML = '';
  
  // Add each bookmark to the container
  bookmarks.forEach(bookmark => {
    const bookmarkElement = document.createElement('a');
    bookmarkElement.className = 'bookmark';
    bookmarkElement.href = bookmark.url;
    bookmarkElement.title = bookmark.title;
    
    // Create favicon if available
    if (bookmark.favicon) {
      const favicon = document.createElement('img');
      favicon.src = bookmark.favicon;
      favicon.className = 'favicon';
      bookmarkElement.appendChild(favicon);
    } else {
      // Default icon if no favicon
      const defaultIcon = document.createElement('div');
      defaultIcon.className = 'default-favicon';
      defaultIcon.textContent = bookmark.title.charAt(0).toUpperCase();
      bookmarkElement.appendChild(defaultIcon);
    }
    
    // Add bookmark title
    const titleSpan = document.createElement('span');
    titleSpan.textContent = bookmark.title;
    bookmarkElement.appendChild(titleSpan);
    
    // Add context menu (right-click) for bookmark management
    bookmarkElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      
      // Remove any existing context menu
      const existingMenu = document.querySelector('.bookmark-context-menu');
      if (existingMenu) existingMenu.remove();
      
      // Create context menu
      const menu = document.createElement('div');
      menu.className = 'bookmark-context-menu';
      
      // Add "Remove" option
      const removeOption = document.createElement('div');
      removeOption.className = 'menu-option';
      removeOption.textContent = 'Remove';
      removeOption.addEventListener('click', () => {
        chrome.runtime.sendMessage({ 
          action: 'removeBookmark', 
          id: bookmark.id 
        });
        menu.remove();
      });
      
      menu.appendChild(removeOption);
      
      // Position and show menu
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;
      document.body.appendChild(menu);
      
      // Close menu when clicking elsewhere
      document.addEventListener('click', () => {
        menu.remove();
      }, { once: true });
    });
    
    container.appendChild(bookmarkElement);
  });
  
  // Add "Add Bookmark" button
  const addButton = document.createElement('div');
  addButton.className = 'add-bookmark-button';
  addButton.innerHTML = '+';
  addButton.title = 'Add Current Page to Second Bookmark Bar';
  addButton.addEventListener('click', addCurrentPageBookmark);
  container.appendChild(addButton);
}

// Add current page as a bookmark
function addCurrentPageBookmark() {
  const title = document.title;
  const url = window.location.href;
  let favicon = '';
  
  // Try to get the favicon
  const faviconElement = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
  if (faviconElement) {
    favicon = faviconElement.href;
  }
  
  console.log('Adding bookmark:', title, url);
  chrome.runtime.sendMessage({
    action: 'addBookmark',
    title: title,
    url: url,
    favicon: favicon
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('Error adding bookmark:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('Bookmark added successfully');
    }
  });
}