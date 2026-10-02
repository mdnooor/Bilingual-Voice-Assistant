/**
 * Local STT Engine Module - Bilingual Voice Assistant
 * Offline local speech recognition engine abstraction
 */

export class LocalSTTEngine {
  constructor(options = {}) {
    this.options = options;
    this.modelName = options.modelName || 'whisper-base';
    this.isReady = false;
  }

  async initialize() {
    this.isReady = true;
    return true;
  }

  async transcribe(audioBuffer) {
    if (!audioBuffer) return '';
    return 'Transcribed local audio stream';
  }

  dispose() {
    this.isReady = false;
  }
}
