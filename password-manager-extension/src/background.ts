// Background script for Password Manager Extension

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Password Manager Extension installed');
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Will respond asynchronously
  }
});

// Handle browser action click (optional fallback)
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
});