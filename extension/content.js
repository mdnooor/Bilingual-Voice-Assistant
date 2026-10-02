/**
 * Content Script - Bilingual Voice Assistant
 * Clean, minimal page helper for injecting refined transcripts if requested
 */

(() => {
  // Listen for text insertion requests from popup or side panel
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'insertText') {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable)
      ) {
        if (activeEl.isContentEditable) {
          document.execCommand('insertText', false, request.text);
        } else {
          const start = activeEl.selectionStart || activeEl.value.length;
          const end = activeEl.selectionEnd || activeEl.value.length;
          const text = activeEl.value;
          activeEl.value = text.substring(0, start) + request.text + text.substring(end);
          activeEl.selectionStart = activeEl.selectionEnd = start + request.text.length;
          activeEl.dispatchEvent(new Event('input', { bubbles: true }));
        }
        sendResponse({ success: true });
        return true;
      }
      sendResponse({ success: false, reason: 'No active editable field' });
      return true;
    }
  });
})();
