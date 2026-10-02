/**
 * Side Panel Controller - Bilingual Voice Assistant
 */

import { VoiceInputController } from './modules/voice-input.js';
import { Clipboard } from './modules/clipboard.js';

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('headerStatusDot');
  const settingsBtn = document.getElementById('settingsBtn');

  const transcriptInput = document.getElementById('transcriptInput');
  const copyInputBtn = document.getElementById('copyInputBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');

  const recordToggleBtn = document.getElementById('recordToggleBtn');
  const recordBtnLabel = document.getElementById('recordBtnLabel');
  const stopBtn = document.getElementById('stopBtn');
  const refineBtn = document.getElementById('refineBtn');
  const refineBtnText = document.getElementById('refineBtnText');

  const banglaOutput = document.getElementById('banglaOutput');
  const copyBanglaBtn = document.getElementById('copyBanglaBtn');
  const expandBanglaBtn = document.getElementById('expandBanglaBtn');

  const englishOutput = document.getElementById('englishOutput');
  const copyEnglishBtn = document.getElementById('copyEnglishBtn');
  const expandEnglishBtn = document.getElementById('expandEnglishBtn');

  const statusWrap = document.getElementById('statusMessage');
  const statusText = statusWrap?.querySelector('.status-text');
  const statusIndicator = statusWrap?.querySelector('.status-indicator');

  function setStatus(msg, type = 'ready') {
    if (statusText) statusText.textContent = msg;
    if (statusIndicator) {
      statusIndicator.className = 'status-indicator';
      if (type === 'error') statusIndicator.classList.add('error');
      if (type === 'working') statusIndicator.classList.add('working');
    }
  }

  function flashSuccess(btn) {
    if (!btn) return;
    const origHtml = btn.innerHTML;
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    setTimeout(() => {
      btn.innerHTML = origHtml;
    }, 1200);
  }

  const voice = new VoiceInputController({
    onRecordingChange: (isRecording) => {
      if (isRecording) {
        statusDot?.classList.add('recording');
        recordToggleBtn?.classList.add('active');
        if (recordBtnLabel) recordBtnLabel.textContent = 'Recording...';
        setStatus('Listening...', 'working');
      } else {
        statusDot?.classList.remove('recording');
        recordToggleBtn?.classList.remove('active');
        if (recordBtnLabel) recordBtnLabel.textContent = 'Record';
        setStatus('Ready', 'ready');
      }
    },
    onTranscriptUpdate: (fullText) => {
      if (transcriptInput) {
        transcriptInput.value = fullText;
        transcriptInput.scrollTop = transcriptInput.scrollHeight;
      }
    },
    onError: (err) => {
      setStatus(err.message || 'Recognition error', 'error');
    },
    onTranscriptFinalized: (finalText) => {
      if (transcriptInput && finalText) {
        transcriptInput.value = finalText;
      }
      setStatus('Speech recognition complete', 'ready');
    }
  });

  await voice.init();

  recordToggleBtn?.addEventListener('click', () => {
    const currentVal = transcriptInput ? transcriptInput.value : '';
    voice.toggle(currentVal);
  });

  stopBtn?.addEventListener('click', () => {
    voice.stop();
  });

  clearInputBtn?.addEventListener('click', () => {
    if (transcriptInput) {
      transcriptInput.value = '';
      transcriptInput.focus();
    }
    voice.abort();
    setStatus('Cleared', 'ready');
  });

  refineBtn?.addEventListener('click', async () => {
    const textToRefine = (transcriptInput?.value || '').trim();
    if (!textToRefine) {
      setStatus('Please enter or speak text first', 'error');
      transcriptInput?.focus();
      return;
    }

    if (voice.isRecording) {
      voice.stop();
    }

    try {
      refineBtn.classList.add('loading');
      if (refineBtnText) refineBtnText.textContent = 'Refining...';
      setStatus('Refining with AI...', 'working');

      const result = await voice.refineInput(textToRefine);

      if (banglaOutput) banglaOutput.value = result.bangla || '';
      if (englishOutput) englishOutput.value = result.english || '';

      if (result.warning) {
        setStatus(result.warning, 'working');
      } else {
        setStatus('Refinement complete', 'ready');
      }
    } catch (err) {
      setStatus(err.message || 'Refinement failed', 'error');
    } finally {
      refineBtn.classList.remove('loading');
      if (refineBtnText) refineBtnText.textContent = 'Refine';
    }
  });

  copyInputBtn?.addEventListener('click', async () => {
    const ok = await Clipboard.copy(transcriptInput?.value || '');
    if (ok) {
      flashSuccess(copyInputBtn);
      setStatus('Transcript copied', 'ready');
    }
  });

  copyBanglaBtn?.addEventListener('click', async () => {
    const ok = await Clipboard.copy(banglaOutput?.value || '');
    if (ok) {
      flashSuccess(copyBanglaBtn);
      setStatus('Bangla copied', 'ready');
    }
  });

  copyEnglishBtn?.addEventListener('click', async () => {
    const ok = await Clipboard.copy(englishOutput?.value || '');
    if (ok) {
      flashSuccess(copyEnglishBtn);
      setStatus('English copied', 'ready');
    }
  });

  expandBanglaBtn?.addEventListener('click', () => {
    banglaOutput?.classList.toggle('expanded');
  });

  expandEnglishBtn?.addEventListener('click', () => {
    englishOutput?.classList.toggle('expanded');
  });

  settingsBtn?.addEventListener('click', () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  });
});
