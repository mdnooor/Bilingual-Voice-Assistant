/**
 * Background Service Worker - Bilingual Voice Assistant (Manifest V3)
 * Compliant with Chrome Web Store Policies:
 * - NO remote code execution
 * - Clean command listener for Ctrl+Shift+X
 * - Safe offscreen document and side panel coordination
 */

// Initialize default settings on installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const defaultSettings = {
      selectedProvider: 'gemini',
      sttLanguage: 'auto',
      customEndpoint: '',
      selectedModel: 'gemini-1.5-flash',
      autoCopy: false,
      dockPinned: false,
      theme: 'dark',
      apiKeys: {
        gemini: '',
        groq: '',
        openai: '',
        custom: ''
      }
    };
    await chrome.storage.local.set(defaultSettings);
  }
});

// Handle keyboard shortcut (Ctrl + Shift + X)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action' || command === 'toggle-voice-assistant') {
    // Action will trigger popup or open side panel if pinned
    const { dockPinned } = await chrome.storage.local.get(['dockPinned']);
    if (dockPinned && chrome.sidePanel && chrome.sidePanel.open) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
      }
    }
  }
});

// Message listener for background coordination
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'openOptions') {
    chrome.runtime.openOptionsPage();
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'toggleSidePanel') {
    (async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id && chrome.sidePanel && chrome.sidePanel.open) {
          await chrome.sidePanel.open({ tabId: tab.id });
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Side panel not supported' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'ensureOffscreen') {
    (async () => {
      try {
        const existing = await chrome.offscreen.hasDocument().catch(() => false);
        if (!existing) {
          await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Capture microphone audio stream'
          });
        }
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  return true;
});
