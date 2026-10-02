/**
 * Voice Input Controller Module - Bilingual Voice Assistant
 * Bridges Speech Recognition, User Editable Input Field, and AI Refine
 */

import { SpeechEngine } from './speech.js';
import { Normalizer } from './normalizer.js';
import { AIProviders } from './ai-providers.js';
import { Storage } from './storage.js';

export class VoiceInputController {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.isRecording = false;

    this.speech = new SpeechEngine({
      onStart: () => {
        this.isRecording = true;
        if (this.callbacks.onRecordingChange) {
          this.callbacks.onRecordingChange(true);
        }
      },
      onResult: (data) => {
        if (this.callbacks.onTranscriptUpdate) {
          this.callbacks.onTranscriptUpdate(data.fullDisplay);
        }
      },
      onError: (err) => {
        this.isRecording = false;
        if (this.callbacks.onRecordingChange) {
          this.callbacks.onRecordingChange(false);
        }
        if (this.callbacks.onError) {
          this.callbacks.onError(err);
        }
      },
      onEnd: (data) => {
        this.isRecording = false;
        if (this.callbacks.onRecordingChange) {
          this.callbacks.onRecordingChange(false);
        }
        if (this.callbacks.onTranscriptFinalized) {
          this.callbacks.onTranscriptFinalized(data.transcript);
        }
      }
    });
  }

  async init() {
    const settings = await Storage.get();
    this.speech.setLanguage(settings.sttLanguage || 'auto');
  }

  /**
   * Toggles recording state
   * @param {string} currentText - Currently edited text in the input box
   */
  toggle(currentText = '') {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start(currentText);
    }
  }

  start(currentText = '') {
    if (this.isRecording) return;
    this.speech.start(currentText);
  }

  stop() {
    if (!this.isRecording) return;
    this.speech.stop();
  }

  abort() {
    this.speech.abort();
    this.isRecording = false;
    if (this.callbacks.onRecordingChange) {
      this.callbacks.onRecordingChange(false);
    }
  }

  /**
   * Refines the CURRENT edited text in the input box
   * CRITICAL: Uses current input value, never a stale cached voice transcript
   * @param {string} text - current value of the editable input field
   */
  async refineInput(text) {
    const cleanedText = Normalizer.clean(text);
    if (!cleanedText) {
      throw new Error('Please speak or type some text before refining.');
    }

    const settings = await Storage.get();
    const config = {
      provider: settings.selectedProvider || 'gemini',
      apiKey: settings.apiKeys?.[settings.selectedProvider] || '',
      customEndpoint: settings.customEndpoint || '',
      model: settings.selectedModel || 'gemini-1.5-flash'
    };

    return await AIProviders.refine(cleanedText, config);
  }
}
