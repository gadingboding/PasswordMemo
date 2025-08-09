// Content script for Password Manager Extension

console.log('Password Manager content script loaded');

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'fillPassword') {
    // Find password input fields
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const usernameInputs = document.querySelectorAll('input[type="text"], input[type="email"]');
    
    if (request.username && usernameInputs.length > 0) {
      (usernameInputs[0] as HTMLInputElement).value = request.username;
    }
    
    if (request.password && passwordInputs.length > 0) {
      (passwordInputs[0] as HTMLInputElement).value = request.password;
    }
    
    sendResponse({ success: true });
  }
});

// Auto-detect login forms
const detectLoginForms = () => {
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    const passwordInputs = form.querySelectorAll('input[type="password"]');
    const usernameInputs = form.querySelectorAll('input[type="text"], input[type="email"]');
    
    if (passwordInputs.length > 0 && usernameInputs.length > 0) {
      // This is likely a login form
      console.log('Login form detected', form);
    }
  });
};

// Run detection when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', detectLoginForms);
} else {
  detectLoginForms();
}