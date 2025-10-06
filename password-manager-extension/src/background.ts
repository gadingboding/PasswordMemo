// Background script for Password Manager Extension
import browser from 'webextension-polyfill';

// Handle messages from content script or popup
browser.runtime.onMessage.addListener((request: any, _sender: any, sendResponse: any): true => {
  if (request.action === 'getActiveTab') {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs: any) => {
      sendResponse({ tab: tabs[0] });
    });
    return true; // Will respond asynchronously
  }
  return true;
});

// Handle browser action click (optional fallback)
browser.action.onClicked.addListener((_tab: any) => {
  browser.tabs.create({ url: browser.runtime.getURL('options.html') });
});