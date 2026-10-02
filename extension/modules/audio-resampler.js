/**
 * Audio Resampler Module - Bilingual Voice Assistant
 * Resamples Web Audio buffer to 16kHz PCM mono for speech recognition
 */

export class AudioResampler {
  /**
   * Resamples Float32Array from sourceSampleRate to targetSampleRate
   */
  static resample(audioBuffer, sourceRate, targetRate = 16000) {
    if (sourceRate === targetRate) {
      return audioBuffer;
    }

    const ratio = sourceRate / targetRate;
    const newLength = Math.round(audioBuffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio;
      const index = Math.floor(srcIndex);
      const frac = srcIndex - index;

      const p0 = audioBuffer[index] || 0;
      const p1 = audioBuffer[index + 1] || p0;

      result[i] = p0 + (p1 - p0) * frac;
    }

    return result;
  }
}
