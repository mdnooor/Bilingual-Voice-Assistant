/**
 * Options Controller - Bilingual Voice Assistant
 */

import { Storage } from './modules/storage.js';
import { MicDiagnostic } from './modules/mic-diagnostic.js';

document.addEventListener('DOMContentLoaded', async () => {
  const providerSelect = document.getElementById('providerSelect');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const toggleKeyVisibility = document.getElementById('toggleKeyVisibility');
  const customEndpointGroup = document.getElementById('customEndpointGroup');
  const customEndpointInput = document.getElementById('customEndpointInput');
  const modelInput = document.getElementById('modelInput');
  const sttLangSelect = document.getElementById('sttLangSelect');
  const runDiagBtn = document.getElementById('runDiagBtn');
  const diagStatus = document.getElementById('diagStatus');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const saveStatus = document.getElementById('saveStatus');

  let currentSettings = await Storage.get();

  // Populate initial values
  if (providerSelect) providerSelect.value = currentSettings.selectedProvider || 'gemini';
  if (sttLangSelect) sttLangSelect.value = currentSettings.sttLanguage || 'auto';
  if (customEndpointInput) customEndpointInput.value = currentSettings.customEndpoint || '';
  if (modelInput) modelInput.value = currentSettings.selectedModel || 'gemini-1.5-flash';

  function updateKeyPlaceholder() {
    const p = providerSelect?.value || 'gemini';
    const key = currentSettings.apiKeys?.[p] || '';
    if (apiKeyInput) {
      apiKeyInput.value = key;
    }
    if (customEndpointGroup) {
      customEndpointGroup.style.display = p === 'custom' ? 'block' : 'none';
    }
    if (modelInput && !modelInput.value) {
      if (p === 'gemini') modelInput.value = 'gemini-1.5-flash';
      if (p === 'groq') modelInput.value = 'llama-3.1-8b-instant';
      if (p === 'openai') modelInput.value = 'gpt-4o-mini';
    }
  }

  updateKeyPlaceholder();

  providerSelect?.addEventListener('change', () => {
    updateKeyPlaceholder();
  });

  toggleKeyVisibility?.addEventListener('click', () => {
    if (apiKeyInput) {
      const isPass = apiKeyInput.type === 'password';
      apiKeyInput.type = isPass ? 'text' : 'password';
      if (toggleKeyVisibility) {
        toggleKeyVisibility.textContent = isPass ? 'Hide' : 'Show';
      }
    }
  });

  // Diagnostic Test
  runDiagBtn?.addEventListener('click', async () => {
    if (diagStatus) {
      diagStatus.className = 'diag-status';
      diagStatus.textContent = 'Testing microphone stream...';
    }
    const res = await MicDiagnostic.runDiagnostic();
    if (res.ok) {
      if (diagStatus) {
        diagStatus.className = 'diag-status success';
        diagStatus.textContent = `Active (${res.devices} device detected, level: ${res.level})`;
      }
    } else {
      if (diagStatus) {
        diagStatus.className = 'diag-status fail';
        diagStatus.textContent = `Error: ${res.error}`;
      }
    }
  });

  // Save Settings
  saveSettingsBtn?.addEventListener('click', async () => {
    const selectedProvider = providerSelect?.value || 'gemini';
    const enteredKey = apiKeyInput?.value?.trim() || '';

    const updatedApiKeys = {
      ...(currentSettings.apiKeys || {}),
      [selectedProvider]: enteredKey
    };

    const newSettings = {
      selectedProvider,
      apiKeys: updatedApiKeys,
      sttLanguage: sttLangSelect?.value || 'auto',
      customEndpoint: customEndpointInput?.value?.trim() || '',
      selectedModel: modelInput?.value?.trim() || 'gemini-1.5-flash'
    };

    await Storage.set(newSettings);
    currentSettings = { ...currentSettings, ...newSettings };

    if (saveStatus) {
      saveStatus.textContent = 'Settings saved successfully!';
      setTimeout(() => {
        saveStatus.textContent = '';
      }, 2500);
    }
  });
});
