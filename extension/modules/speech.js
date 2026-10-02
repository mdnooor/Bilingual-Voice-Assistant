/**
 * Speech Recognition Module - Bilingual Voice Assistant
 * Robust lifecycle management for Web Speech API (Chrome webkitSpeechRecognition)
 * Compliant with Chrome Web Store production standards:
 * - Clean state transitions (idle, starting, listening, stopping)
 * - Safe teardown avoiding 'Recognition was interrupted while starting'
 * - NO recursive or automatic retry loops (Manual Retry remains manual)
 */

export class SpeechEngine {
  constructor(options = {}) {
    this.recognition = null;
    this.state = 'idle'; // 'idle' | 'starting' | 'listening' | 'stopping'
    this.language = options.language || 'bn-BD'; // default bilingual primary
    this.interimResults = options.interimResults ?? true;
    this.continuous = options.continuous ?? true;

    // Callbacks
    this.onStart = options.onStart || null;
    this.onResult = options.onResult || null;
    this.onError = options.onError || null;
    this.onEnd = options.onEnd || null;

    this.accumulatedTranscript = '';
    this.isSupported = Boolean(
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition)
    );
  }

  setLanguage(lang) {
    this.language = lang === 'auto' ? 'bn-BD' : lang;
    if (this.recognition && this.state === 'listening') {
      this.recognition.lang = this.language;
    }
  }

  /**
   * Initializes or refreshes speech recognition instance
   */
  _initInstance() {
    this._cleanupInstance();

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      this.state = 'idle';
      return null;
    }

    const rec = new SpeechRec();
    rec.continuous = this.continuous;
    rec.interimResults = this.interimResults;
    rec.maxAlternatives = 1;
    rec.lang = this.language;

    rec.onstart = () => {
      this.state = 'listening';
      if (typeof this.onStart === 'function') {
        this.onStart();
      }
    };

    rec.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0] ? item[0].transcript : '';
        if (item.isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }

      if (final) {
        this.accumulatedTranscript = (this.accumulatedTranscript + ' ' + final).trim();
      }

      if (typeof this.onResult === 'function') {
        this.onResult({
          accumulated: this.accumulatedTranscript,
          finalChunk: final,
          interimChunk: interim,
          fullDisplay: (this.accumulatedTranscript + (interim ? ' ' + interim : '')).trim()
        });
      }
    };

    rec.onerror = (event) => {
      const errorType = event.error || 'unknown';
      
      // Update state if fatal error
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(errorType)) {
        this.state = 'idle';
      }

      // STRICT RULE: No automatic retry loops on error!
      // Forward error cleanly to UI callback so user can manually retry.
      if (typeof this.onError === 'function') {
        this.onError({
          type: errorType,
          message: this._getErrorMessage(errorType),
          fatal: ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(errorType)
        });
      }
    };

    rec.onend = () => {
      this.state = 'idle';
      
      // STRICT RULE: No automatic restart on onend!
      if (typeof this.onEnd === 'function') {
        this.onEnd({
          transcript: this.accumulatedTranscript
        });
      }
    };

    this.recognition = rec;
    return rec;
  }

  _cleanupInstance() {
    if (this.recognition) {
      try {
        this.recognition.onstart = null;
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {
        // Safe tear down
      }
      this.recognition = null;
    }
  }

  /**
   * Starts voice recognition safely without race conditions
   * @param {string} [initialText=''] Initial transcript to append to
   */
  start(initialText = '') {
    if (!this.isSupported) {
      if (typeof this.onError === 'function') {
        this.onError({
          type: 'not-supported',
          message: 'Speech Recognition is not supported in this browser.',
          fatal: true
        });
      }
      return false;
    }

    if (this.state === 'listening' || this.state === 'starting') {
      return false;
    }

    this.state = 'starting';
    this.accumulatedTranscript = initialText ? initialText.trim() : '';

    try {
      const rec = this._initInstance();
      if (!rec) {
        this.state = 'idle';
        return false;
      }
      rec.start();
      return true;
    } catch (err) {
      this.state = 'idle';
      if (typeof this.onError === 'function') {
        this.onError({
          type: 'start-failed',
          message: err?.message || 'Failed to start speech recognition.',
          fatal: false
        });
      }
      return false;
    }
  }

  /**
   * Graceful stop (awaits final results)
   */
  stop() {
    if (this.state === 'idle') return;
    this.state = 'stopping';
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        this.abort();
      }
    } else {
      this.state = 'idle';
    }
  }

  /**
   * Immediate cancellation
   */
  abort() {
    this.state = 'idle';
    this._cleanupInstance();
    if (typeof this.onEnd === 'function') {
      this.onEnd({ transcript: this.accumulatedTranscript });
    }
  }

  resetTranscript() {
    this.accumulatedTranscript = '';
  }

  setTranscript(text) {
    this.accumulatedTranscript = (text || '').trim();
  }

  _getErrorMessage(error) {
    switch (error) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'Microphone permission denied. Please allow microphone access.';
      case 'no-speech':
        return 'No speech detected. Please speak into your microphone.';
      case 'audio-capture':
        return 'No microphone found or audio capture device failed.';
      case 'network':
        return 'Network error connecting to speech recognition service.';
      case 'aborted':
        return 'Speech recognition was stopped.';
      default:
        return `Recognition error: ${error}`;
    }
  }
}
